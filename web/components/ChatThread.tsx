"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useChatStream } from "@/hooks/useChatStream";
import type { ChatEvent, ToolEventData } from "@/lib/chat/types";
import { ERROR_COPY } from "@/lib/chat/types";
import { MessageBubble } from "./MessageBubble";
import { ToolEvent } from "./ToolEvent";
import { ErrorBanner } from "./ErrorBanner";
import { Send, Square, Trash2, ArrowUp, ArrowDown, Sparkles } from "lucide-react";

interface TurnMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  events?: ChatEvent[];
  timestamp: string;
}

const STORAGE_KEY = "mcp_chat_prompt_history";

export function ChatThread() {
  const { events, status, error, send, reset } = useChatStream();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<TurnMessage[]>([]);
  
  // Prompt history states for Up/Down arrow navigation
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const draftRef = useRef<string>("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load prompt history from localStorage on initial render
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setPromptHistory(parsed);
        }
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  // Save prompt history to localStorage when changed
  const savePromptToHistory = useCallback((prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setPromptHistory((prev) => {
      // avoid consecutive duplicates
      if (prev.length > 0 && prev[prev.length - 1] === trimmed) {
        return prev;
      }
      const updated = [...prev, trimmed];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(-50))); // keep last 50
      } catch {
        // ignore
      }
      return updated;
    });
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
  }, [messages, events, currentAssistantText, status]);

  // When a stream finishes, append assistant message to completed history if needed
  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (prevStatusRef.current === "streaming" && (status === "done" || status === "idle")) {
      if (currentAssistantText.trim()) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            text: currentAssistantText,
            events: [...events],
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    }
    prevStatusRef.current = status;
  }, [status, currentAssistantText, events]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const prompt = input.trim();
    if (!prompt || status === "streaming") return;

    // Add user message to thread
    const userMsg: TurnMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    savePromptToHistory(prompt);

    // Reset history index navigation pointer
    setHistoryIndex(-1);
    draftRef.current = "";
    setInput("");

    // Trigger SSE stream
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
    setMessages([]);
  };

  const isStreaming = status === "streaming";

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      {/* Thread Container */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex h-full flex-col items-center justify-center text-center p-8">
            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-lg shadow-indigo-950/50">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-base font-semibold text-slate-200 mb-1">MCP Host Chat Assistant</h2>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              Ask questions or issue commands to the MCP server. Use <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-300 font-mono">↑</kbd> and <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-300 font-mono">↓</kbd> to cycle through message history.
            </p>
          </div>
        )}

        {/* Top level global error if any */}
        {error && status === "error" && !isStreaming && <ErrorBanner message={error} />}

        {/* Completed turn messages */}
        {messages.map((msg) => (
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
              <div className="flex items-center gap-3 pl-11 text-xs text-slate-400 py-2">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce"></div>
                  <div className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]"></div>
                  <div className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]"></div>
                </div>
                <span>Agent thinking...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Form Bar */}
      <div className="border-t border-slate-800/90 bg-slate-900/80 p-4 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-2">
          {/* History navigation pill hint */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                <ArrowUp className="h-2.5 w-2.5" />
                <ArrowDown className="h-2.5 w-2.5" />
                History ({promptHistory.length})
              </span>
              {historyIndex !== -1 && (
                <span className="text-indigo-400 font-medium font-mono text-[10px]">
                  [{historyIndex + 1}/{promptHistory.length}]
                </span>
              )}
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors text-[11px]"
                title="Clear thread"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear chat</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/80 p-1.5 shadow-lg shadow-slate-950/80 focus-within:border-indigo-500/80 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the agent... (Use ↑ ↓ for history)"
              className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none"
              disabled={isStreaming}
            />

            {isStreaming ? (
              <button
                type="button"
                onClick={reset}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 transition-colors"
                title="Stop streaming"
              >
                <Square className="h-4 w-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-950/50 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <span>Send</span>
                <Send className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </form>
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
        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
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