import { ChatThread } from "@/components/ChatThread";

export default function Home() {
  return (
    <main className="flex h-screen flex-col">
      <header className="border-b border-gray-200 p-4">
        <h1 className="text-lg font-semibold">MCP Host Chat</h1>
      </header>
      <ChatThread />
    </main>
  );
}