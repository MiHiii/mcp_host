import { DEFAULT_THREAD_WINDOW } from "../threads/types";
import type { Thread } from "../threads/types";
import type { ChatEvent } from "./types";

export interface Compaction {
  /** The prompt actually sent to the proxy (compacted when messages > window). */
  prompt: string;
  /** The naive full-history rendering (for the byte-invariant assertion). */
  fullHistoryPrompt: string;
  summary: string | null;
  compacted: boolean;
  windowUsed: number;
}

function messageText(m: Thread["messages"][number]): string {
  return `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`;
}

export function fullHistoryPrompt(thread: Thread): string {
  return thread.messages.map(messageText).join("\n");
}

/**
 * Collects the assistant reply text from a stream's SSE events (BUG-xxxxx /
 * /fix regression). The authoritative answer may arrive either as incremental
 * `stream`/`text` chunks OR entirely inside the terminal `final` event (which
 * is the common case when tool calls precede the answer). If a `final` event
 * carries real text, it overwrites any partial streaming text.
 */
export function collectAssistantText(events: ChatEvent[]): { text: string; terminal: "final" | "error" | null } {
  let text = "";
  let terminal: "final" | "error" | null = null;
  for (const evt of events) {
    if (evt.type === "final") {
      terminal = "final";
      if (evt.text.trim()) text = evt.text;
    } else if (evt.type === "error") {
      terminal = "error";
    } else if (evt.type === "stream" && evt.data.type === "text") {
      text += evt.data.text;
    }
  }
  return { text, terminal };
}

export function buildContinuedPrompt(
  thread: Thread,
  window: number = DEFAULT_THREAD_WINDOW
): Compaction {
  const total = thread.messages.length;
  const full = fullHistoryPrompt(thread);

  if (total <= window) {
    return {
      prompt: full,
      fullHistoryPrompt: full,
      summary: null,
      compacted: false,
      windowUsed: window,
    };
  }

  const keep = thread.messages.slice(-window);
  const summary = thread.summary ?? "a prior conversation";
  const prefix = `[Earlier context omitted] ${summary}`;
  const windowText = keep.map(messageText).join("\n");
  const prompt = `${prefix}\n-----\n${windowText}`;

  // Never make the payload larger than the naive full-history render: when the
  // dropped prefix is small (just above the window), compression is not a win,
  // so fall back to sending the whole conversation. This keeps the invariant
  // "compacted <= full" and bounds growth to O(window + summary) once the
  // conversation exceeds the window meaningfully.
  if (Buffer.byteLength(prompt, "utf8") >= Buffer.byteLength(full, "utf8")) {
    return {
      prompt: full,
      fullHistoryPrompt: full,
      summary,
      compacted: false,
      windowUsed: window,
    };
  }

  return {
    prompt,
    fullHistoryPrompt: full,
    summary,
    compacted: true,
    windowUsed: window,
  };
}