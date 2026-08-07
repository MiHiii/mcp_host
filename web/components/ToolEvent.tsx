import type { ToolEventData } from "@/lib/chat/types";

const STATUS_LABEL: Record<ToolEventData["status"], string> = {
  start: "running",
  result: "done",
};

export function ToolEvent({ tool }: { tool: ToolEventData }) {
  return (
    <div className="flex items-center gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
      <span className="font-mono text-gray-700">{tool.name}</span>
      <span
        className={`rounded px-1.5 py-0.5 text-xs font-medium ${
          tool.status === "start"
            ? "bg-blue-100 text-blue-700"
            : "bg-green-100 text-green-700"
        }`}
      >
        {STATUS_LABEL[tool.status]}
      </span>
      {tool.status === "result" && tool.bytes > 0 && (
        <span className="ml-auto text-xs text-gray-400">{tool.bytes} bytes</span>
      )}
    </div>
  );
}