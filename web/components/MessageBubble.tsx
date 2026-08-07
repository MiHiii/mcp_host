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
            {timestamp && <span className="text-[10px] text-slate-400 font-mono">{timestamp}</span>}
            <span className="text-xs font-medium text-slate-300">You</span>
          </div>
          <div className="rounded-2xl rounded-tr-xs bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm text-white shadow-md shadow-indigo-950/30 font-sans leading-relaxed whitespace-pre-wrap border border-indigo-500/20">
            {text}
          </div>
        </div>
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-950/50 text-xs font-bold">
          <User className="h-4 w-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-3 my-3 group">
      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-950/50 text-xs font-bold">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex max-w-[90%] flex-col items-start min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-slate-300">MCP Agent</span>
          {timestamp && <span className="text-[10px] text-slate-400 font-mono">{timestamp}</span>}
        </div>
        <div className="w-full rounded-2xl rounded-tl-xs bg-slate-900/90 px-4 py-3.5 text-slate-200 shadow-xl shadow-slate-950/50 border border-slate-800/80 backdrop-blur-sm overflow-hidden">
          <MarkdownRenderer content={text} />
        </div>
      </div>
    </div>
  );
}