import { loadProxyConfig, validatePrompt, isOversizedBody } from "@/lib/proxy";

const STREAM_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  "X-Accel-Buffering": "no",
} as const;

/**
 * BFF token proxy (ADR-0008). Server-only. Owns GATEWAY_TOKEN, forwards the prompt
 * to the gateway's POST /v1/chat, and relays the SSE stream verbatim to the browser.
 */
export async function POST(request: Request): Promise<Response> {
  // Content-Length byte cap before allocating/parsing (rules/security.md).
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 1024 * 1024) {
    return jsonError(400, "VALIDATION_FAILED", "Request body too large.");
  }

  const config = loadProxyConfig();
  if (!config) {
    return jsonError(500, "INTERNAL_ERROR", "Chat proxy is not configured.");
  }

  let rawBody: ArrayBuffer;
  try {
    rawBody = await request.arrayBuffer();
  } catch {
    return jsonError(400, "VALIDATION_FAILED", "Unable to read request body.");
  }
  if (isOversizedBody(rawBody.byteLength)) {
    return jsonError(400, "VALIDATION_FAILED", "Request body too large.");
  }

  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(rawBody).toString("utf8"));
  } catch {
    return jsonError(400, "VALIDATION_FAILED", "Body must be valid JSON.");
  }

  const validated = validatePrompt(json);
  if (!validated.ok) {
    return jsonError(validated.status, validated.code, validated.message);
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${config.gatewayUrl}/v1/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${config.token}`,
      },
      body: JSON.stringify({ prompt: validated.prompt }),
      signal: request.signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      return new Response(null, { status: 499, statusText: "Client Closed Request" });
    }
    return jsonError(502, "BAD_GATEWAY", "Chat proxy could not reach the gateway.");
  }

  if (upstream.status !== 200) {
    // Forward sanitized upstream error envelope without leaking upstream headers.
    let code = "BAD_GATEWAY";
    let message = "Chat gateway returned an error.";
    try {
      const body = (await upstream.json()) as { error?: { code?: string; message?: string } };
      if (body?.error?.code) code = body.error.code;
      if (body?.error?.message) message = body.error.message;
    } catch {
      // non-JSON upstream error — use defaults
    }
    return jsonError(upstream.status, code, message);
  }

  // Verbatim passthrough of the upstream ReadableStream (AC-6 / U-5): do NOT buffer.
  return new Response(upstream.body, { status: 200, headers: STREAM_HEADERS });
}

function jsonError(status: number, code: string, message: string): Response {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}