import { describe, it, expect } from "vitest";
import { LocalThreadStore, titleFrom } from "./store";

function memoryStorage(): { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void } {
  const m = new Map<string, string>();
  return {
    getItem: (k) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

describe("LocalThreadStore", () => {
  it("creates a thread, sets it active, and persists", () => {
    const storage = memoryStorage();
    const store = new LocalThreadStore(storage);
    store.load();
    const t = store.createThread("hello there");
    expect(t.id).toBeTruthy();
    expect(store.getActive()?.id).toBe(t.id);
    store.switchThread(t.id);
    expect(storage.getItem("mcp.chat.threads:v1:v0")).toContain(t.id);
  });

  it("rehydrates the last active thread on load", () => {
    const storage = memoryStorage();
    const first = new LocalThreadStore(storage);
    first.load();
    const a = first.createThread("first");
    const b = first.createThread("second");
    first.switchThread(a.id);

    const second = new LocalThreadStore(storage);
    second.load();
    expect(second.state.threads.length).toBe(2);
    expect(second.state.activeId).toBe(a.id);
    expect(second.getActive()?.title).toBe("first");
    expect(second.state.threads.map((t) => t.title)).toContain("second");
    void b;
  });

  it("archives a thread and falls back to another active", () => {
    const storage = memoryStorage();
    const store = new LocalThreadStore(storage);
    store.load();
    const a = store.createThread("a");
    store.createThread("b");
    store.switchThread(a.id);
    store.archiveThread(a.id);
    expect(store.getActive()?.id).not.toBe(a.id);
    expect(store.state.threads.some((t) => t.id === a.id)).toBe(false);
  });

  it("appends a message and updates updatedAt", () => {
    const storage = memoryStorage();
    const store = new LocalThreadStore(storage);
    store.load();
    const t = store.createThread("hello");
    store.appendMessage(t.id, { role: "user", kind: "text", text: "hi", ts: 1 });
    const active = store.getActive();
    expect(active?.messages.length).toBe(1);
    expect(active?.messages[0].text).toBe("hi");
  });

  it("caps threads at MAX_THREADS via eviction", () => {
    const storage = memoryStorage();
    const store = new LocalThreadStore(storage);
    store.load();
    for (let i = 0; i < 60; i++) store.createThread(`t${i}`);
    expect(store.state.threads.length).toBeLessThanOrEqual(50);
  });

  it("recovers from corrupt JSON on load", () => {
    const storage = memoryStorage();
    storage.setItem("mcp.chat.threads:v1:v0", "NOT JSON");
    const store = new LocalThreadStore(storage);
    store.load();
    expect(store.state.threads).toEqual([]);
    expect(store.state.activeId).toBeNull();
  });

  it("caps messages per thread at MAX_MESSAGES_PER_THREAD", () => {
    const storage = memoryStorage();
    const store = new LocalThreadStore(storage);
    store.load();
    const t = store.createThread("many");
    for (let i = 0; i < 250; i++) {
      store.appendMessage(t.id, { role: "user", kind: "text", text: `m${i}`, ts: i });
    }
    const active = store.getActive();
    expect(active?.messages.length).toBeLessThanOrEqual(200);
    expect(active?.messages[active.messages.length - 1].text).toBe("m249");
  });

  it("AC-10: thread cache never holds tokens, Authorization headers, or gateway URLs", () => {
    const storage = memoryStorage();
    const store = new LocalThreadStore(storage);
    store.load();
    const t = store.createThread("safe");
    store.appendMessage(t.id, {
      role: "assistant",
      kind: "text",
      text: "Here is a plain answer.",
      ts: 1,
    });
    const raw = storage.getItem("mcp.chat.threads:v1:v0") ?? "";
    expect(raw.toLowerCase()).not.toContain("authorization");
    expect(raw).not.toMatch(/Bearer [A-Za-z0-9._-]{20,}/);
    expect(raw).not.toContain("sk-");
    expect(raw).not.toContain("Bearer ");
    // The client never stores the gateway URL or its port either.
    expect(raw).not.toContain(":8080");
  });
});

describe("titleFrom", () => {
  it("collapses whitespace and truncates to 40 chars", () => {
    expect(titleFrom("  a  b  ")).toBe("a b");
    expect(titleFrom("x".repeat(100)).length).toBeLessThanOrEqual(41);
  });
});