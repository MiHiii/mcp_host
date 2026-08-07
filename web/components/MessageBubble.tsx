import React from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { Bot, User } from "lucide-react";

export interface MessageBubbleProps {
  text: string;
  role?: "user" | "assistant";
  timestamp?: string;
}

export function MessageBubble({ text, role = "assistant", timestamp }: MessageBubbleProps) {
  if (role === "user") {
    return (
      <div className="flex justify-end gap-3 my-3 group">
        <div className="flex max-w-[85%] flex-col items-end">
          <div className="flex items-center gap-2 mb-1">
            {timestamp && <span className="text-[10px] text-neutral-400 font-mono">{timestamp}</span>}
            <span className="text-xs font-medium text-neutral-500">You</span>
          </div>
          <div className="rounded-2xl rounded-tr-xs bg-neutral-900 px-4 py-3 text-sm text-white shadow-sm font-sans leading-relaxed whitespace-pre-wrap">
            {text}
          </div>
        </div>
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-neutral-900 text-white shadow-sm text-xs font-bold">
          <User className="h-4 w-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-3 my-3 group">
      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-white border border-neutral-200 text-neutral-900 shadow-sm text-xs font-bold">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex max-w-[90%] flex-col items-start min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-neutral-500">MCP Agent</span>
          {timestamp && <span className="text-[10px] text-neutral-400 font-mono">{timestamp}</span>}
        </div>
        <div className="w-full rounded-2xl rounded-tl-xs bg-neutral-100 px-4 py-3.5 text-neutral-900 shadow-sm border border-neutral-200 overflow-hidden">
          <MarkdownRenderer content={text} />
        </div>
      </div>
    </div>
  );
}
