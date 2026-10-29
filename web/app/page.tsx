import { ChatThread } from "@/components/ChatThread";
import { Cpu, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <main className="flex h-screen flex-col bg-white text-neutral-900 overflow-hidden">
      {/* Header Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white border border-neutral-900 shadow-sm">
            <Cpu className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-neutral-900 flex items-center gap-2">
              MCP Host Chat
              <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 border border-neutral-300">
                v1.0
              </span>
            </h1>
            <p className="text-[11px] text-neutral-500">Model Context Protocol Agent Interface</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700 border border-neutral-300">
            <ShieldCheck className="h-3.5 w-3.5 text-neutral-700" />
            <span className="text-[11px] text-neutral-500">BFF Proxy</span>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neutral-500 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-neutral-700"></span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Chat Work Area */}
      <div className="flex-1 overflow-hidden">
        <ChatThread />
      </div>
    </main>
  );
}