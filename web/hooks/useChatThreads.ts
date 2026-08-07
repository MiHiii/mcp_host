"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { sseDecoder } from "@/lib/chat/parse";
import type { ChatEvent } from "@/lib/chat/types";
import { LocalThreadStore } from "@/lib/threads/store";
import type { Thread, ThreadMessage, ThreadStoreState } from "@/lib/threads/types";
import { DEFAULT_THREAD_WINDOW } from "@/lib/threads/types";
import { buildContinuedPrompt, collectAssistantText } from "@/lib/chat/compaction";

export type ChatStatus = "idle" | "streaming" | "done" | "error";

const WINDOW = Number(process.env.NEXT_PUBLIC_THREAD_WINDOW ?? DEFAULT_THREAD_WINDOW);

export interface UseChatThreads {
  threads: Thread[];
  activeId: string | null;
  active: Thread | null;
  status: ChatStatus;
  error: string | null;
  events: ChatEvent[];
  compacted: boolean;
  create: () => void;
  switchTo: (id: string) => void;
  archive: (id: string) => void;
  send: (prompt: string) => void;
  abort: () => void;
  reset: () => void;
}

// Snapshot used during SSR and the client's initial hydration render. localStorage
// is empty/undefined on the server, so this keeps the server HTML and the first
// client render identical (avoids hydration mismatch on persisted threads).
const EMPTY_SNAPSHOT: ThreadStoreState = { threads: [], activeId: null };

export function useChatThreads(): UseChatThreads {
  const [store] = useState(() => {
    const s = new LocalThreadStore(globalThis.localStorage);
    s.load();
    return s;
  });

  const subscribe = useCallback(
    (listener: () => void) => store.subscribe(listener),
    [store]
  );

  const { threads, activeId } = useSyncExternalStore(
    subscribe,
    () => store.state,
    () => EMPTY_SNAPSHOT
  );

  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<ChatEvent[]>([]);
  const [compacted, setCompacted] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const eventsRef = useRef<ChatEvent[]>([]);

  const create = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    store.createThread("New conversation");
    eventsRef.current = [];
    setEvents([]);
    setCompacted(false);
  }, [store]);

  const switchTo = useCallback(
    (id: string) => {
      abortRef.current?.abort();
      abortRef.current = null;
      store.switchThread(id);
      eventsRef.current = [];
    setEvents([]);
      setCompacted(false);
    },
    [store]
  );

  const archive = useCallback(
    (id: string) => {
      abortRef.current?.abort();
      abortRef.current = null;
      store.archiveThread(id);
      eventsRef.current = [];
    setEvents([]);
      setCompacted(false);
    },
    [store]
  );

  const abort = useCallback(() => abortRef.current?.abort(), []);

  const send = useCallback(
    (promptRaw: string) => {
      const prompt = promptRaw.trim();
      if (!prompt || status === "streaming") return;

      // Create a thread on first message if none is active.
      const active = store.getActive();
      const threadId = active?.id ?? store.createThread(prompt).id;

      const userMsg: ThreadMessage = { role: "user", kind: "text", text: prompt, ts: Date.now() };
      store.appendMessage(threadId, userMsg);
      const thread = store.state.threads.find((t) => t.id === threadId);

      // Compaction: bounded continued-turn context. The gateway contract keeps
      // POST /api/chat as a single {prompt} field (AC-9/U-9), so the compacted
      // context is folded into the prompt for continued turns only.
      const ctx = thread ? buildContinuedPrompt(thread, WINDOW) : null;
      setCompacted(Boolean(ctx?.compacted));
      const full = ctx && ctx.compacted ? ctx.prompt : "";
      const contextPrompt = full ? `${full}\n\n[Continue the conversation above. User's new message:\n${prompt}]` : prompt;

      const controller = new AbortController();
      abortRef.current = controller;
      eventsRef.current = [];
      setEvents([]);
      setError(null);
      setStatus("streaming");

      void (async () => {
        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: contextPrompt }),
            signal: controller.signal,
          });

          if (!res.ok) {
            setError(await readErrorMessage(res));
            setStatus("error");
            return;
          }
          if (!res.body) {
            setError("Empty response from server.");
            setStatus("error");
            return;
          }

          for await (const batch of sseDecoder(res.body)) {
            for (const evt of batch) {
              eventsRef.current = [...eventsRef.current, evt];
              setEvents((prev) => [...prev, evt]);
            }
          }

          // Authoritative text + terminal status come from the final/error event
          // (which carries the full answer even when only tool events streamed).
          const outcome = collectAssistantText(eventsRef.current);

          // Commit the assistant reply into the active thread's history cache.
          if (outcome.text.trim()) {
            store.appendMessage(threadId, {
              role: "assistant",
              kind: "text",
              text: outcome.text,
              ts: Date.now(),
            });
          }

          setStatus(outcome.terminal === "error" ? "error" : "done");
        } catch (err) {
          if ((err as Error).name === "AbortError") {
            setError("Request cancelled.");
            setStatus("idle");
          } else {
            setError((err as Error).message || "Unexpected error.");
            setStatus("error");
          }
        }
      })();
    },
    [store, status]
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    eventsRef.current = [];
    setEvents([]);
    setError(null);
    setStatus("idle");
  }, []);

  return {
    threads,
    activeId,
    active: threads.find((t) => t.id === activeId) ?? null,
    status,
    error,
    events,
    compacted,
    create,
    switchTo,
    archive,
    send,
    abort,
    reset,
  };
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    if (body?.error?.message) return body.error.message;
  } catch {
    // fall through to default
  }
  return `Request failed (${res.status}).`;
}