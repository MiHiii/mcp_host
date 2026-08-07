"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useSyncExternalStore } from "react";
import { useChatThreads } from "@/hooks/useChatThreads";
import type { ChatEvent, ToolEventData } from "@/lib/chat/types";
import { ERROR_COPY } from "@/lib/chat/types";
import type { ThreadMessage } from "@/lib/threads/types";
import { MessageBubble } from "./MessageBubble";
import { ToolEvent } from "./ToolEvent";
import { ErrorBanner } from "./ErrorBanner";
import { ThreadRail } from "./ThreadRail";
import { Send, Square, Trash2, ArrowUp, ArrowDown, Sparkles, FileText } from "lucide-react";

// LocalStorage-backed prompt history exposed through a small local store so it can
// be read with useSyncExternalStore (hydration-safe and no setState-in-effect).

function loadHistory(): string[] {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore localStorage errors
  }
  return [];
}

let historySnapshot: string[] = loadHistory();
const historyListeners = new Set<() => void>();

function subscribeHistory(listener: () => void): () => void {
  historyListeners.add(listener);
  return () => {
    historyListeners.delete(listener);
  };
}

function updateHistory(next: string[]): void {
  historySnapshot = next;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(next.slice(-50))); // keep last 50
  } catch {
    // ignore
  }
  for (const listener of historyListeners) listener();
}

interface TurnMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  events?: ChatEvent[];
  timestamp: string;
}

const STORAGE_KEY = "mcp_chat_prompt_history";

export function ChatThread() {
  const {
    threads,
    activeId,
    events,
    status,
    error,
    send,
    reset,
    active,
    compacted,
    create,
    switchTo,
    archive,
  } = useChatThreads();

  const [input, setInput] = useState("");
  const [draftByThread, setDraftByThread] = useState<Record<string, string>>({});

  // Per-thread input persistence (AC-1: "active input persists per thread").
  const switchWithDraft = useCallback(
    (id: string) => {
      if (activeId) setDraftByThread((prev) => ({ ...prev, [activeId]: input }));
      const nextDraft = draftByThread[id] ?? "";
      setInput(nextDraft);

      switchTo(id);
    },
    [activeId, input, draftByThread, switchTo]
  );

  const handleNewThread = useCallback(() => {
    if (activeId) setDraftByThread((prev) => ({ ...prev, [activeId]: input }));
    create();
    setInput("");

  }, [activeId, input, create]);

  const handleArchive = useCallback(
    (id: string) => {
      if (id === activeId) {
        setDraftByThread((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setInput("");

      }
      archive(id);
    },
    [activeId, archive]
  );

  // Completed thread history mapped to display turns.
  const threadMessages: TurnMessage[] = (active?.messages ?? []).map((m: ThreadMessage) => ({
    id: `${active?.id}-${m.ts}-${m.role}`,
    role: m.role,
    text: m.text,
    timestamp: new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  }));

  // Prompt history for Up/Down arrow navigation, loaded from localStorage via a
  // small external store (hydration-safe: server snapshot is empty, client fills
  // in from the persisted history after mount).
  const promptHistory = useSyncExternalStore(
    subscribeHistory,
    () => historySnapshot,
    () => []
  );
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const draftRef = useRef<string>("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Save prompt history to localStorage when changed
  const savePromptToHistory = useCallback((prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    const prev = historySnapshot;
    // avoid consecutive duplicates
    if (prev.length > 0 && prev[prev.length - 1] === trimmed) return;
    updateHistory([...prev, trimmed]);
  }, []);

  // Extract real-time text from current streaming events
  const activeStreamText = events.reduce((acc, e) => {
    if (e.type === "stream" && e.data.type === "text") return acc + e.data.text;
    return acc;
  }, "");

  const activeFinalText = events
    .filter((e): e is Extract<ChatEvent, { type: "final" }> => e.type === "final")
    .map((e) => e.text)
    .join("");

  const currentAssistantText = activeFinalText || activeStreamText;

  // Auto-scroll to bottom when content changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [threadMessages, events, currentAssistantText, status]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const prompt = input.trim();
    if (!prompt || status === "streaming") return;

    savePromptToHistory(prompt);

    // Reset history index navigation pointer
    setHistoryIndex(-1);
    draftRef.current = "";
    setInput("");

    // The hook creates/appends to the active thread and streams (AC-1, AC-5).
    send(prompt);
  };

  // Keyboard navigation for ArrowUp and ArrowDown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      if (promptHistory.length === 0) return;

      e.preventDefault();
      let nextIndex: number;
      if (historyIndex === -1) {
        // Save current input as draft before navigating up
        draftRef.current = input;
        nextIndex = promptHistory.length - 1;
      } else {
        nextIndex = Math.max(0, historyIndex - 1);
      }

      setHistoryIndex(nextIndex);
      const historicText = promptHistory[nextIndex];
      setInput(historicText);

      // Move cursor to end of text
      setTimeout(() => {
        if (inputRef.current) {
          const len = historicText.length;
          inputRef.current.setSelectionRange(len, len);
        }
      }, 0);
    } else if (e.key === "ArrowDown") {
      if (historyIndex === -1) return;

      e.preventDefault();
      const nextIndex = historyIndex + 1;
      if (nextIndex >= promptHistory.length) {
        setHistoryIndex(-1);
        setInput(draftRef.current);
      } else {
        setHistoryIndex(nextIndex);
        const historicText = promptHistory[nextIndex];
        setInput(historicText);

        setTimeout(() => {
          if (inputRef.current) {
            const len = historicText.length;
            inputRef.current.setSelectionRange(len, len);
          }
        }, 0);
      }
    }
  };

  const handleClear = () => {
    reset();
    if (activeId) archive(activeId);
    setInput("");

  };

  const isStreaming = status === "streaming";

  return (
    <div className="flex h-full flex-col bg-white text-neutral-900">
      <div className="flex flex-1 overflow-hidden">
        <ThreadRail
          threads={threads}
          activeId={activeId}
          onCreate={handleNewThread}
          onSelect={switchWithDraft}
          onArchive={handleArchive}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Thread Container */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {threadMessages.length === 0 && !isStreaming && (
              <div className="flex h-full flex-col items-center justify-center text-center p-8">
                <div className="h-12 w-12 rounded-2xl bg-neutral-900 border border-neutral-900 flex items-center justify-center text-white mb-4 shadow-sm">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h2 className="text-base font-semibold text-neutral-900 mb-1">MCP Host Chat Assistant</h2>
                <p className="text-xs text-neutral-500 max-w-sm mb-4">
                  Ask questions or issue commands to the MCP server. Use{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-300 text-[10px] text-neutral-700 font-mono">&#8593;</kbd>{" "}
                  and{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-300 text-[10px] text-neutral-700 font-mono">&#8595;</kbd>{" "}
                  to cycle through message history.
                </p>
              </div>
            )}

            {/* Top level global error if any */}
            {error && status === "error" && !isStreaming && <ErrorBanner message={error} />}

            {/* Earlier-context compaction banner (AC-3 / plan T4) */}
            {compacted && !isStreaming && (
              <div className="flex items-center gap-2 rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-[11px] text-neutral-600">
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Earlier context omitted to keep this turn&apos;s input size bounded. The last messages are shown below.
                </span>
              </div>
            )}

            {/* Completed turn messages */}
            {threadMessages.map((msg) => (
              <div key={msg.id} className="space-y-2">
                <MessageBubble text={msg.text} role={msg.role} timestamp={msg.timestamp} />
                {msg.events && msg.events.length > 0 && (
                  <div className="pl-11 pr-4">
                    <EventTiles events={msg.events} />
                  </div>
                )}
              </div>
            ))}

            {/* Active streaming assistant response */}
            {isStreaming && (
              <div className="space-y-2">
                {events.length > 0 && (
                  <div className="pl-11 pr-4">
                    <EventTiles events={events} />
                  </div>
                )}
                {currentAssistantText ? (
                  <MessageBubble text={currentAssistantText} role="assistant" />
                ) : (
                  <div className="flex items-center gap-3 pl-11 text-xs text-neutral-500 py-2">
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 rounded-full bg-neutral-900 animate-bounce"></div>
                      <div className="h-2 w-2 rounded-full bg-neutral-900 animate-bounce [animation-delay:0.2s]"></div>
                      <div className="h-2 w-2 rounded-full bg-neutral-900 animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                    <span>Agent thinking...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input Form Bar */}
          <div className="border-t border-neutral-200 bg-white p-4">
            <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-2">
              {/* History navigation pill hint */}
              <div className="flex items-center justify-between text-[11px] text-neutral-500 px-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-neutral-100 px-2 py-0.5 rounded border border-neutral-300">
                    <ArrowUp className="h-2.5 w-2.5" />
                    <ArrowDown className="h-2.5 w-2.5" />
                    History ({promptHistory.length})
                  </span>
                  {historyIndex !== -1 && (
                    <span className="text-neutral-700 font-medium font-mono text-[10px]">
                      [{historyIndex + 1}/{promptHistory.length}]
                    </span>
                  )}
                </div>
                {threadMessages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="flex items-center gap-1 text-neutral-400 hover:text-neutral-800 transition-colors text-[11px]"
                    title="Archive thread"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Archive</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-neutral-300 bg-white p-1.5 shadow-sm focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-400 transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask the agent... (Use &#8593; &#8595; for history)"
                  className="flex-1 bg-transparent px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 outline-none"
                  disabled={isStreaming}
                />

                {isStreaming ? (
                  <button
                    type="button"
                    onClick={reset}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-300 transition-colors"
                    title="Stop streaming"
                  >
                    <Square className="h-4 w-4 fill-current" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="flex h-9 items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <span>Send</span>
                    <Send className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventTiles({ events }: { events: ChatEvent[] }) {
  const hasAny = events.some(
    (e) => e.type === "start" || e.type === "stream" || e.type === "error"
  );
  if (!hasAny) return null;

  // Consolidate tool events so start + result for the same tool call merge into 1 row!
  const consolidatedTools: ToolEventData[] = [];
  const errors: { code: string; message: string }[] = [];
  let isProcessStarted = false;

  for (const e of events) {
    if (e.type === "start") {
      isProcessStarted = true;
    } else if (e.type === "error") {
      errors.push({ code: e.code, message: e.message });
    } else if (e.type === "stream" && e.data.type === "tool") {
      const tool = e.data as ToolEventData;
      if (tool.status === "start") {
        consolidatedTools.push({ ...tool });
      } else if (tool.status === "result") {
        // Find last matching running tool
        let existingIndex = -1;
        for (let i = consolidatedTools.length - 1; i >= 0; i--) {
          if (consolidatedTools[i].name === tool.name && consolidatedTools[i].status === "start") {
            existingIndex = i;
            break;
          }
        }
        if (existingIndex !== -1) {
          consolidatedTools[existingIndex] = {
            ...consolidatedTools[existingIndex],
            status: "result",
            bytes: tool.bytes,
          };
        } else {
          consolidatedTools.push({ ...tool });
        }
      }
    }
  }

  return (
    <div className="space-y-1.5 my-2">
      {isProcessStarted && consolidatedTools.length === 0 && (
        <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-mono">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-neutral-700"></span>
          </span>
          <span>Starting process...</span>
        </div>
      )}

      {consolidatedTools.map((tool, i) => (
        <ToolEvent key={`${tool.name}-${i}`} tool={tool} />
      ))}

      {errors.map((err, i) => (
        <ErrorBanner key={i} message={ERROR_COPY[err.code] ?? err.message} />
      ))}
    </div>
  );
}