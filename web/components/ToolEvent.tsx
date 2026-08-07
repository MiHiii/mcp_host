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
    <div className="my-1.5 overflow-hidden rounded-lg border border-neutral-200 bg-white transition-all hover:border-neutral-300">
      {/* Interactive Header Row */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-mono text-left select-none hover:bg-neutral-50 transition-colors focus:outline-none"
      >
        <div className="flex items-center justify-center text-neutral-400">
          {isRunning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-500" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-neutral-700" />
          )}
        </div>

        <div className="flex items-center gap-1.5 font-medium text-neutral-700">
          <Terminal className="h-3 w-3 text-neutral-400" />
          <span>{tool.name}</span>
        </div>

        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            isRunning
              ? "bg-neutral-100 text-neutral-600 border border-neutral-300"
              : "bg-neutral-900 text-white border border-neutral-900"
          }`}
        >
          {STATUS_LABEL[tool.status]}
        </span>

        {tool.status === "result" && tool.bytes > 0 && (
          <span className="ml-auto rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500 border border-neutral-200">
            {tool.bytes} bytes
          </span>
        )}

        <div className="ml-auto flex items-center text-neutral-400 hover:text-neutral-700">
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </div>
      </button>

      {/* Expandable Accordion Details Content */}
      {isExpanded && (
        <div className="border-t border-neutral-200 bg-neutral-50 p-3 text-xs font-mono space-y-2 text-neutral-700">
          <div className="flex items-center gap-2 text-neutral-500 text-[11px]">
            <Info className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
            <span>Execution details for <code className="text-neutral-900">{tool.name}</code></span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded border border-neutral-200">
            <div>
              <span className="text-neutral-400 block text-[10px] uppercase">Status</span>
              <span className={isRunning ? "text-neutral-600 font-semibold" : "text-neutral-900 font-semibold"}>
                {isRunning ? "Running in progress..." : "Completed successfully"}
              </span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[10px] uppercase">Data Returned</span>
              <span className="text-neutral-700 flex items-center gap-1">
                <HardDrive className="h-3 w-3 text-neutral-400" />
                {formatBytes(tool.bytes)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
