export type ThreadMessage = {
  role: "user" | "assistant";
  kind: "text" | "tool";
  text: string;
  ts: number;
};

export type Thread = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ThreadMessage[];
  summary?: string;
};

export type ThreadStoreState = {
  threads: Thread[];
  activeId: string | null;
};

export const THREAD_STORAGE_KEY = "mcp.chat.threads:v1:v0";
export const DEFAULT_THREAD_WINDOW = 6;
export const MAX_THREADS = 50;
export const MAX_MESSAGES_PER_THREAD = 200;
