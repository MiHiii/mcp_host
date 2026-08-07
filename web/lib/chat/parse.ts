import type { ChatEvent } from "./types";

interface SSERecord {
  event: string;
  data?: string;
  id?: string;
}

/**
 * Splits raw SSE text (lines of `event:`, `data:`, `id:`) into records on blank
 * lines (`\n\n`), then maps each record to a typed ChatEvent.
 *
 * Handles fragmented chunks that split mid-event (callers accumulate a buffer
 * across reads) and multi-byte UTF-8 boundaries (callers must decode via
 * TextDecoder, not slice raw bytes).
 */
export function parseSSEChunk(text: string): ChatEvent[] {
  const events: ChatEvent[] = [];
  for (const record of text.split(/\n\n/)) {
    const trimmed = record.trim();
    if (!trimmed) continue;
    const evt = parseRecord(trimmed);
    if (evt) events.push(evt);
  }
  return events;
}

function parseRecord(record: string): ChatEvent | null {
  const frame: SSERecord = { event: "" };
  for (const line of record.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(":");
    const field = colon === -1 ? trimmed : trimmed.slice(0, colon);
    const value = colon === -1 ? "" : trimmed.slice(colon + 1).trimStart();
    switch (field) {
      case "event":
        frame.event = value;
        break;
      case "data":
        frame.data = value;
        break;
      case "id":
        frame.id = value;
        break;
      default:
        break;
    }
  }

  if (!frame.data) return null;
  return mapFrameToEvent(frame);
}

function mapFrameToEvent(frame: SSERecord): ChatEvent | null {
  if (frame.event === "id") {
    return { type: "id", note: "keepalive" };
  }

  let payload: unknown;
  const data = frame.data ?? "";
  try {
    payload = JSON.parse(data);
  } catch {
    return null;
  }

  switch (frame.event) {
    case "start": {
      const p = payload as Partial<{ request_id: string; model: string }>;
      return { type: "start", request_id: p.request_id ?? "", model: p.model ?? "" };
    }
    case "stream": {
      const p = payload as { type?: string; name?: string; status?: string; bytes?: number; text?: string };
      if (p.type === "tool") {
        return {
          type: "stream",
          data: {
            type: "tool",
            name: p.name ?? "",
            status: p.status === "result" ? "result" : "start",
            bytes: p.bytes ?? 0,
          },
        };
      }
      return { type: "stream", data: { type: "text", text: p.text ?? "" } };
    }
    case "final": {
      const p = payload as { text?: string };
      return { type: "final", text: p.text ?? "" };
    }
    case "error": {
      const p = payload as { code?: string; message?: string };
      return { type: "error", code: p.code ?? "", message: p.message ?? "" };
    }
    default:
      return null;
  }
}

/** Decodes a byte stream (ReadableStream<Uint8Array>) into a stream of ChatEvent[]. */
export async function* sseDecoder(
  stream: ReadableStream<Uint8Array>,
  decoder = new TextDecoder()
): AsyncGenerator<ChatEvent[]> {
  const reader = stream.getReader();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const boundary = buffer.lastIndexOf("\n\n");
      if (boundary === -1) continue;
      const complete = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const events = parseSSEChunk(complete);
      if (events.length > 0) yield events;
    }
    if (buffer.trim()) {
      const events = parseSSEChunk(buffer);
      if (events.length > 0) yield events;
    }
  } finally {
    reader.releaseLock();
  }
}