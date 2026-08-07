"use client";

import { useState } from "react";
import { useChatStream } from "@/hooks/useChatStream";
import type { ChatEvent, ToolEventData } from "@/lib/chat/types";
import { ERROR_COPY } from "@/lib/chat/types";
import { MessageBubble } from "./MessageBubble";
import { ToolEvent } from "./ToolEvent";
import { ErrorBanner } from "./ErrorBanner";

export function ChatThread() {
  const { events, status, error, send, reset } = useChatStream();
  const [input, setInput] = useState("");

  const streamText = events.reduce((acc, e) => {
    if (e.type === "stream" && e.data.type === "text") return acc + e.data.text;
    return acc;
  }, "");

  const finalText = events
    .filter((e): e is Extract<ChatEvent, { type: "final" }> => e.type === "final")
    .map((e) => e.text)
    .join("");

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <ErrorBanner message={error ?? ""} />
        {status === "streaming" && streamText ? <MessageBubble text={streamText} /> : null}
        {finalText ? <MessageBubble text={finalText} /> : null}
        <EventTiles events={events} />
      </div>
      <form
        className="flex gap-2 border-t border-gray-200 p-3"
        onSubmit={(ev) => {
          ev.preventDefault();
          if (input.trim()) {
            send(input);
            setInput("");
          }
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the agent…"
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
          disabled={status === "streaming"}
        />
        <button
          type="submit"
          disabled={status === "streaming" || !input.trim()}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Send
        </button>
        {status !== "idle" && (
          <button
            type="button"
            onClick={reset}
            className="rounded bg-gray-200 px-3 py-2 text-sm text-gray-700"
          >
            Reset
          </button>
        )}
      </form>
    </div>
  );
}

function EventTiles({ events }: { events: ChatEvent[] }) {
  const hasAny = events.some(
    (e) => e.type === "start" || e.type === "stream" || e.type === "error"
  );
  if (!hasAny) return null;
  return (
    <div className="space-y-2">
      {events.map((e, i) => {
        if (e.type === "start") {
          return <p key={i} className="text-xs text-gray-400">Starting…</p>;
        }
        if (e.type === "stream" && e.data.type === "tool") {
          return <ToolEvent key={i} tool={e.data as ToolEventData} />;
        }
        if (e.type === "error") {
          return <ErrorBanner key={i} message={ERROR_COPY[e.code] ?? e.message} />;
        }
        return null;
      })}
    </div>
  );
}