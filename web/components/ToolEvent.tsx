"use client";

import React, { useState } from "react";
import type { ToolEventData } from "@/lib/chat/types";
import { Terminal, Loader2, CheckCircle2, ChevronRight, ChevronDown, HardDrive, Info } from "lucide-react";

const STATUS_LABEL: Record<ToolEventData["status"], string> = {
  start: "running",
  result: "done",
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 bytes";
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB (${bytes} bytes)`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB (${bytes.toLocaleString()} bytes)`;
}

export function ToolEvent({ tool }: { tool: ToolEventData }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isRunning = tool.status === "start";

  return (
    <div className="my-1.5 overflow-hidden rounded-lg border border-slate-800/90 bg-slate-900/60 backdrop-blur-xs transition-all hover:border-slate-700/80">
      {/* Interactive Header Row */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-mono text-left select-none hover:bg-slate-800/40 transition-colors focus:outline-none"
      >
        <div className="flex items-center justify-center text-slate-400">
          {isRunning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          )}
        </div>

        <div className="flex items-center gap-1.5 font-medium text-slate-300">
          <Terminal className="h-3 w-3 text-slate-500" />
          <span>{tool.name}</span>
        </div>

        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            isRunning
              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          }`}
        >
          {STATUS_LABEL[tool.status]}
        </span>

        {tool.status === "result" && tool.bytes > 0 && (
          <span className="ml-auto rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] text-slate-400 border border-slate-700/50">
            {tool.bytes} bytes
          </span>
        )}

        <div className="ml-auto flex items-center text-slate-500 hover:text-slate-300">
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </div>
      </button>

      {/* Expandable Accordion Details Content */}
      {isExpanded && (
        <div className="border-t border-slate-800/80 bg-slate-950/60 p-3 text-xs font-mono space-y-2 text-slate-300">
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <Info className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <span>Execution details for <code className="text-indigo-300">{tool.name}</code></span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Status</span>
              <span className={isRunning ? "text-amber-400 font-semibold" : "text-emerald-400 font-semibold"}>
                {isRunning ? "Running in progress..." : "Completed successfully"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Data Returned</span>
              <span className="text-slate-200 flex items-center gap-1">
                <HardDrive className="h-3 w-3 text-slate-400" />
                {formatBytes(tool.bytes)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}