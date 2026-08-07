"use client";

import { useCallback } from "react";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import type { Thread } from "@/lib/threads/types";

interface ThreadRailProps {
  threads: Thread[];
  activeId: string | null;
  onCreate: () => void;
  onSelect: (id: string) => void;
  onArchive: (id: string) => void;
}

export function ThreadRail({ threads, activeId, onCreate, onSelect, onArchive }: ThreadRailProps) {
  const handleArchive = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
      e.stopPropagation();
      onArchive(id);
    },
    [onArchive]
  );

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50">
      <div className="flex items-center justify-between px-3 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          Threads
        </span>
        <button
          type="button"
          onClick={onCreate}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-white border border-neutral-900 hover:bg-neutral-700 transition-colors"
          title="New thread"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
        {threads.length === 0 && (
          <p className="px-2 py-3 text-[11px] text-neutral-400">No conversations yet.</p>
        )}
        {threads.map((t) => (
          <div
            key={t.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(t.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSelect(t.id);
            }}
            className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors ${
              t.id === activeId
                ? "bg-neutral-900 text-white border border-neutral-900"
                : "text-neutral-700 hover:bg-neutral-100 border border-transparent"
            }`}
            title={t.title}
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            <span className="flex-1 truncate text-[12px]">{t.title}</span>
            <span className="text-[9px] text-neutral-400 font-mono shrink-0">
              {t.messages.length}
            </span>
            <button
              type="button"
              onClick={(e) => handleArchive(e, t.id)}
              className="hidden group-hover:flex h-5 w-5 shrink-0 items-center justify-center rounded text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Archive thread"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
