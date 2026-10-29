import type { Thread, ThreadMessage, ThreadStoreState } from "./types";
import { THREAD_STORAGE_KEY, MAX_THREADS, MAX_MESSAGES_PER_THREAD } from "./types";

export interface ThreadStore {
  state: ThreadStoreState;
  subscribe: (listener: () => void) => () => void;
  load: () => void;
  persist: () => void;
  createThread: (firstPrompt: string) => Thread;
  switchThread: (id: string) => void;
  archiveThread: (id: string) => void;
  appendMessage: (threadId: string, message: ThreadMessage) => void;
  setSummary: (threadId: string, summary: string) => void;
  getActive: () => Thread | null;
}

export class LocalThreadStore implements ThreadStore {
  state: ThreadStoreState = { threads: [], activeId: null };
  private listeners = new Set<() => void>();

  constructor(private storage: Pick<Storage, "getItem" | "setItem" | "removeItem">) {}

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private commit(next: ThreadStoreState): void {
    this.state = next;
    for (const listener of this.listeners) listener();
  }

  load(): void {
    try {
      const raw = this.storage.getItem(THREAD_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ThreadStoreState;
      if (parsed && Array.isArray(parsed.threads)) {
        this.commit(
          this.applyCaps({
            threads: parsed.threads,
            activeId: typeof parsed.activeId === "string" ? parsed.activeId : null,
          })
        );
        this.persist();
      }
    } catch {
      this.state = { threads: [], activeId: null };
    }
  }

  persist(): void {
    try {
      this.storage.setItem(THREAD_STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // localStorage full/unavailable — silently degrade to in-memory
    }
  }

  createThread(firstPrompt: string): Thread {
    const now = Date.now();
    const thread: Thread = {
      id: crypto.randomUUID(),
      title: titleFrom(firstPrompt),
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    this.commit(
      this.applyCaps({
        threads: [thread, ...this.state.threads],
        activeId: thread.id,
      })
    );
    this.persist();
    return thread;
  }

  switchThread(id: string): void {
    if (!this.state.threads.some((t) => t.id === id)) return;
    this.commit({ threads: this.state.threads, activeId: id });
    this.persist();
  }

  archiveThread(id: string): void {
    const threads = this.state.threads.filter((t) => t.id !== id);
    const activeId =
      this.state.activeId === id ? (threads[0]?.id ?? null) : this.state.activeId;
    this.commit({ threads, activeId });
    this.persist();
  }

  appendMessage(threadId: string, message: ThreadMessage): void {
    const thread = this.state.threads.find((t) => t.id === threadId);
    if (!thread) return;
    const messages = [...thread.messages, message].slice(-MAX_MESSAGES_PER_THREAD);
    this.commit({
      threads: this.state.threads.map((t) =>
        t.id === threadId ? { ...t, messages, updatedAt: Date.now() } : t
      ),
      activeId: this.state.activeId,
    });
    this.persist();
  }

  setSummary(threadId: string, summary: string): void {
    this.commit({
      threads: this.state.threads.map((t) =>
        t.id === threadId ? { ...t, summary } : t
      ),
      activeId: this.state.activeId,
    });
    this.persist();
  }

  getActive(): Thread | null {
    return this.state.threads.find((t) => t.id === this.state.activeId) ?? null;
  }

  private applyCaps(next: ThreadStoreState): ThreadStoreState {
    let threads = next.threads;
    if (threads.length > MAX_THREADS) {
      threads = threads
        .slice()
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, MAX_THREADS);
    }
    const activeId =
      next.activeId && threads.some((t) => t.id === next.activeId)
        ? next.activeId
        : threads[0]?.id ?? null;
    return { threads, activeId };
  }
}

export function titleFrom(prompt: string): string {
  const cleaned = prompt.trim().replace(/\s+/g, " ");
  return cleaned.length > 40 ? `${cleaned.slice(0, 40)}…` : cleaned;
}
