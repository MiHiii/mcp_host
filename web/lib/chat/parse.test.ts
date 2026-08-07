import { describe, it, expect } from "vitest";
import { parseSSEChunk, sseDecoder } from "./parse";
import type { ChatEvent } from "./types";

const frame = (event: string, data: string) => `event: ${event}\ndata: ${data}\n\n`;

function wrap(encoder: TextEncoder, chunks: string[]): ReadableStream<Uint8Array> {
  const bytes = chunks.map((c) => encoder.encode(c));
  return new ReadableStream<Uint8Array>({
    start(controller) {
      bytes.forEach((b) => controller.enqueue(b));
      controller.close();
    },
  });
}

describe("parseSSEChunk", () => {
  it("parses a full start/final sequence", () => {
    const input =
      frame("start", '{"request_id":"r1","model":"m"}') + frame("final", '{"text":"hi"}');
    const events = parseSSEChunk(input);
    expect(events).toEqual([
      { type: "start", request_id: "r1", model: "m" },
      { type: "final", text: "hi" },
    ]);
  });

  it("parses a tool stream event", () => {
    const input = frame("stream", '{"type":"tool","name":"read_dir","status":"start","bytes":0}');
    expect(parseSSEChunk(input)).toEqual([
      { type: "stream", data: { type: "tool", name: "read_dir", status: "start", bytes: 0 } },
    ]);
  });

  it("parses an error event", () => {
    const input = frame("error", '{"code":"MCP_ERROR","message":"tool failed"}');
    expect(parseSSEChunk(input)).toEqual([
      { type: "error", code: "MCP_ERROR", message: "tool failed" },
    ]);
  });

  it("maps an id frame to a keepalive event", () => {
    expect(parseSSEChunk('event: id\ndata: {"note":"keepalive"}\n\n')).toEqual([
      { type: "id", note: "keepalive" },
    ]);
  });

  it("handles CRLF line endings", () => {
    const input = 'event: start\r\ndata: {"request_id":"x","model":"m"}\r\n\r\n';
    expect(parseSSEChunk(input)[0]).toEqual({ type: "start", request_id: "x", model: "m" });
  });

  it("skips records with no data line and empty chunks", () => {
    expect(parseSSEChunk("")).toEqual([]);
    expect(parseSSEChunk("event: ping\n\n")).toEqual([]);
  });

  it("skips malformed JSON in a data frame", () => {
    const input = "event: final\ndata: {broken\n\n";
    expect(parseSSEChunk(input)).toEqual([]);
  });
});

describe("sseDecoder", () => {
  const encoder = new TextEncoder();

  it("reassembles a stream split mid-event across chunks", async () => {
    const stream = wrap(encoder, [
      'event: start\ndata: {"request_id":"r1","model":"m"}\n\n',
      'event: final\ndata: {"text":"hello',
      ' world"}\n\n',
    ]);
    const events: ChatEvent[] = [];
    for await (const batch of sseDecoder(stream)) events.push(...batch);
    expect(events).toEqual([
      { type: "start", request_id: "r1", model: "m" },
      { type: "final", text: "hello world" },
    ]);
  });

  it("handles multi-byte text split at a UTF-8 boundary", async () => {
    // "xin" is 3 bytes in UTF-8; split inside the final multibyte char.
    const raw = Buffer.from('event: final\ndata: {"text":"xin ch\u00e0o"}\n\n', "utf8");
    const mid = Math.floor(raw.length / 2);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(raw.subarray(0, mid)));
        controller.enqueue(new Uint8Array(raw.subarray(mid)));
        controller.close();
      },
    });
    const events: ChatEvent[] = [];
    for await (const batch of sseDecoder(stream)) events.push(...batch);
    expect(events).toEqual([{ type: "final", text: "xin chào" }]);
  });

  it("flushes trailing data after the last boundary", async () => {
    const stream = wrap(encoder, ["event: error\ndata: {\"code\":\"E\",\"message\":\"m\"}\n\n"]);
    const events: ChatEvent[] = [];
    for await (const batch of sseDecoder(stream)) events.push(...batch);
    expect(events).toEqual([{ type: "error", code: "E", message: "m" }]);
  });
});

const encoderInstance = new TextEncoder();
void encoderInstance;