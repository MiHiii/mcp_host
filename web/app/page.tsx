import { ChatThread } from "@/components/ChatThread";
import { Cpu, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <main className="flex h-screen flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Header Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-900/60 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm">
            <Cpu className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-slate-100 flex items-center gap-2">
              MCP Host Chat
              <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400 border border-indigo-500/20">
                v1.0
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Model Context Protocol Agent Interface</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-slate-900 px-2.5 py-1 text-xs text-slate-300 border border-slate-800">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[11px] text-slate-400">BFF Proxy</span>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
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