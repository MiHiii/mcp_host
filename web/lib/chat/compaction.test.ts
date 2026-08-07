import { describe, it, expect } from "vitest";
import { buildContinuedPrompt, fullHistoryPrompt, collectAssistantText } from "./compaction";
import type { ChatEvent } from "./types";
import type { Thread } from "../threads/types";

function threadWith(n: number): Thread {
  const messages = Array.from({ length: n }, (_, i) => ({
    role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
    kind: "text" as const,
    text: "a fixed-length message body",
    ts: i,
  }));
  return {
    id: "t1",
    title: "t",
    createdAt: 0,
    updatedAt: 0,
    messages,
  };
}

describe("buildContinuedPrompt", () => {
  it("sends all messages verbatim when count equals the window", () => {
    const c = buildContinuedPrompt(threadWith(6), 6);
    expect(c.compacted).toBe(false);
    expect(c.prompt).toBe(fullHistoryPrompt(threadWith(6)));
  });

  it("at window+1: never larger than full (guard may fall back to full)", () => {
    const c = buildContinuedPrompt(threadWith(7), 6);
    // One dropped message is not worth the summary prefix, so the guard sends
    // the whole conversation rather than growing the payload.
    expect(Buffer.byteLength(c.prompt, "utf8")).toBeLessThanOrEqual(
      Buffer.byteLength(c.fullHistoryPrompt, "utf8")
    );
    if (c.compacted) {
      expect(c.prompt).not.toContain("Assistant: a fixed-length message body");
    }
  });

  it("uses the thread summary when present", () => {
    const t = threadWith(8);
    t.summary = "user asked about files";
    const c = buildContinuedPrompt(t, 6);
    expect(c.prompt).toContain("user asked about files");
  });

  it("falls back to a placeholder summary when absent", () => {
    const c = buildContinuedPrompt(threadWith(8), 6);
    expect(c.prompt).toContain("a prior conversation");
  });

  it("sends everything for a short thread (no loss)", () => {
    const t = threadWith(3);
    const c = buildContinuedPrompt(t, 6);
    expect(c.compacted).toBe(false);
    expect(c.prompt).toBe(fullHistoryPrompt(t));
  });
});

describe("AC-3 token-reduction invariant", () => {
  it("compacted prompt is never larger than the full-history prompt", () => {
    for (const n of [7, 8, 20, 100]) {
      const c = buildContinuedPrompt(threadWith(n), 6);
      expect(Buffer.byteLength(c.prompt, "utf8")).toBeLessThanOrEqual(
        Buffer.byteLength(c.fullHistoryPrompt, "utf8")
      );
    }
  });

  it("compresses strictly once the conversation meaningfully exceeds the window", () => {
    for (const n of [8, 20, 100]) {
      const c = buildContinuedPrompt(threadWith(n), 6);
      expect(c.compacted).toBe(true);
      expect(Buffer.byteLength(c.prompt, "utf8")).toBeLessThan(
        Buffer.byteLength(c.fullHistoryPrompt, "utf8")
      );
    }
  });

  it("growth is bounded: compacted size does not scale with history length", () => {
    const msgLen = "Assistant: a fixed-length message body".length;
    const prefixLen = "[Earlier context omitted] a prior conversation\n-----\n".length;
    const bound = prefixLen + 6 * (msgLen + 1) + 64;
    const long = buildContinuedPrompt(threadWith(1000), 6);
    const veryLong = buildContinuedPrompt(threadWith(100000), 6);
    expect(Buffer.byteLength(long.prompt, "utf8")).toBeLessThan(bound);
    expect(Buffer.byteLength(veryLong.prompt, "utf8")).toBeLessThan(bound);
    // and both stay far under their own full-history size
    expect(Buffer.byteLength(long.prompt, "utf8")).toBeLessThan(
      Buffer.byteLength(long.fullHistoryPrompt, "utf8")
    );
    expect(Buffer.byteLength(veryLong.prompt, "utf8")).toBeLessThan(
      Buffer.byteLength(veryLong.fullHistoryPrompt, "utf8")
    );
  });
});

describe("collectAssistantText (regression: final-event answer not rendered)", () => {
  it("returns the answer carried only by a final event (tool-only stream)", () => {
    const events: ChatEvent[] = [
      { type: "stream", data: { type: "tool", name: "list", status: "start", bytes: 0 } },
      { type: "stream", data: { type: "tool", name: "list", status: "result", bytes: 44 } },
      { type: "final", text: "Danh sách thư mục..." },
    ];
    const out = collectAssistantText(events);
    expect(out.terminal).toBe("final");
    expect(out.text).toBe("Danh sách thư mục...");
  });

  it("accumulates incremental stream text chunks", () => {
    const events: ChatEvent[] = [
      { type: "stream", data: { type: "text", text: "Hello, " } },
      { type: "stream", data: { type: "text", text: "world" } },
    ];
    expect(collectAssistantText(events).text).toBe("Hello, world");
  });

  it("a final event overwrites any partial stream text as the authoritative answer", () => {
    const events: ChatEvent[] = [
      { type: "stream", data: { type: "text", text: "partial" } },
      { type: "final", text: "complete answer" },
    ];
    expect(collectAssistantText(events).text).toBe("complete answer");
  });

  it("marks terminal error and returns empty text", () => {
    const events: ChatEvent[] = [{ type: "error", code: "E_UNAUTHORIZED", message: "no" }];
    const out = collectAssistantText(events);
    expect(out.terminal).toBe("error");
    expect(out.text).toBe("");
  });
});