"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sseDecoder } from "@/lib/chat/parse";
import type { ChatEvent } from "@/lib/chat/types";

export type ChatStatus = "idle" | "streaming" | "done" | "error";

export interface ChatStreamState {
  events: ChatEvent[];
  status: ChatStatus;
  error: string | null;
  send: (prompt: string) => void;
  abort: () => void;
  reset: () => void;
}

/**
 * Streams a chat prompt through the same-origin BFF proxy POST /api/chat.
 * The browser never sends an Authorization header and never holds the token.
 */
export function useChatStream(): ChatStreamState {
  const [events, setEvents] = useState<ChatEvent[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setEvents([]);
    setStatus("idle");
    setError(null);
  }, []);

  const send = useCallback(
    async (prompt: string) => {
      const controller = new AbortController();
      abortRef.current = controller;

      setEvents([]);
      setError(null);
      setStatus("streaming");

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
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

        let terminalSeen: "final" | "error" | null = null;
        for await (const batch of sseDecoder(res.body)) {
          for (const evt of batch) {
            if (evt.type === "final") terminalSeen = "final";
            else if (evt.type === "error") terminalSeen = "error";
            setEvents((prev) => [...prev, evt]);
          }
        }

        if (terminalSeen === "error") setStatus("error");
        else setStatus("done");
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setError("Request cancelled.");
          setStatus("idle");
        } else {
          setError((err as Error).message || "Unexpected error.");
          setStatus("error");
        }
      }
    },
    []
  );

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return { events, status, error, send, abort, reset };
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