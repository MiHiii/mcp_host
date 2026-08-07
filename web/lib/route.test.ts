import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { POST } from "../app/api/chat/route";

const originalEnv: NodeJS.ProcessEnv = { ...process.env };

function streamBody(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array> | null): Promise<string> {
  if (!stream) return "";
  const reader = stream.getReader();
  let out = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    out += new TextDecoder().decode(value);
  }
  return out;
}

describe("POST /api/chat (BFF proxy)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env = { ...originalEnv, GATEWAY_URL: "http://upstream.test", GATEWAY_TOKEN: "secret-token" };
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
  });

  it("returns 500 INTERNAL_ERROR when env is unconfigured", async () => {
    delete process.env.GATEWAY_URL;
    delete process.env.GATEWAY_TOKEN;
    const res = await POST(
      new Request("http://local/api/chat", { method: "POST", body: JSON.stringify({ prompt: "hi" }) })
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects whitespace-only prompt with 422 before calling upstream", async () => {
    const res = await POST(
      new Request("http://local/api/chat", { method: "POST", body: JSON.stringify({ prompt: "   " }) })
    );
    expect(res.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("validates non-JSON body with 400", async () => {
    const res = await POST(new Request("http://local/api/chat", { method: "POST", body: "not-json" }));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards a non-200 upstream envelope with its status", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: "TOO_MANY_REQUESTS", message: "busy" } }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      )
    );
    const res = await POST(
      new Request("http://local/api/chat", { method: "POST", body: JSON.stringify({ prompt: "hi" }) })
    );
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error.code).toBe("TOO_MANY_REQUESTS");
  });

  it("relays the upstream SSE stream as a verbatim ReadableStream passthrough (AC-6/U-5)", async () => {
    const pts =
      'event: start\ndata: {"request_id":"r1","model":"m"}\n\nevent: final\ndata: {"text":"ok"}\n\n';
    fetchMock.mockResolvedValue(
      new Response(streamBody(pts), { status: 200, headers: { "Content-Type": "text/event-stream" } })
    );
    const res = await POST(
      new Request("http://local/api/chat", { method: "POST", body: JSON.stringify({ prompt: "hi" }) })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.headers.get("Cache-Control")).toBe("no-cache");
    expect(res.headers.get("X-Accel-Buffering")).toBe("no");
    const text = await collect(res.body);
    expect(text).toBe(pts);
  });

  it("forwards req.signal to the upstream fetch and attaches the token (AC-5/U-6)", async () => {
    fetchMock.mockResolvedValue(
      new Response(streamBody("event: final\ndata: {}\n\n"), { status: 200 })
    );
    const controller = new AbortController();
    const req = new Request("http://local/api/chat", {
      method: "POST",
      body: JSON.stringify({ prompt: "hi" }),
      signal: controller.signal,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://upstream.test/v1/chat");
    expect(init.headers.Authorization).toBe("Bearer secret-token");
    expect(init.signal).toBe(req.signal);
  });

  it("treats an upstream AbortError as client-closed (499)", async () => {
    const abortErr = new Error("aborted");
    abortErr.name = "AbortError";
    fetchMock.mockRejectedValue(abortErr);
    const controller = new AbortController();
    const res = await POST(
      new Request("http://local/api/chat", {
        method: "POST",
        body: JSON.stringify({ prompt: "hi" }),
        signal: controller.signal,
      })
    );
    expect(res.status).toBe(499);
  });

  it("propagates client abort to the upstream request (AC-5/U-6 abort propagation)", async () => {
    // Resolve fetch only after the client signal aborts, so we can assert the
    // abort actually travelled upstream. Capture into a holder object so TS
    // cannot narrow the closure-assigned value to `never`.
    const captured: { signal: AbortSignal | null } = { signal: null };
    fetchMock.mockImplementation(
      (_url: string, init: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          captured.signal = init.signal ?? null;
          if (captured.signal?.aborted) {
            const err = new Error("aborted");
            err.name = "AbortError";
            reject(err);
          } else {
            captured.signal?.addEventListener(
              "abort",
              () => {
                const err = new Error("aborted");
                err.name = "AbortError";
                reject(err);
              },
              { once: true }
            );
          }
        })
    );

    const controller = new AbortController();
    const req = new Request("http://local/api/chat", {
      method: "POST",
      body: JSON.stringify({ prompt: "hi" }),
      signal: controller.signal,
    });
    const pending = POST(req);
    controller.abort();

    const res = await pending;
    expect(res.status).toBe(499);
    expect(captured.signal?.aborted).toBe(true);
  });
});