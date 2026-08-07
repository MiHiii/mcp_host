# ADR-00008: BFF Server-Side Token Proxy via fetch-Stream SSE Relay

- **Status:** Proposed
- **Date:** 2026-08-07
- **Decision makers:** Architect (Flow 1 Design — FEAT-00015)
- **Related feature:** FEAT-00015 (Next.js UI + token proxy)

## Context

The browser UI must chat with the gateway `POST /v1/chat` (SSE). The browser cannot
send `Authorization: Bearer <token>` (SSE `EventSource` only supports GET/query,
`ADR-00002`), and exposing the token to a client bundle violates
`rules/security.md` and `ADR-00004`. Some component must sit between the browser and
the gateway, hold the secret, add the header, and relay the stream.

## Decision

- Add a **server-side Backend-for-Frontend (BFF) proxy** as a Next.js Route Handler
  at `app/api/chat/route.ts`.
- It is the **only** network client to the gateway; it reads `GATEWAY_TOKEN`
  (`process.env`, **never** `NEXT_PUBLIC_*`) and adds `Authorization: Bearer`.
- It **pipes the upstream `Response.body` (ReadableStream) verbatim** back to the
  browser as `Content-Type: text/event-stream`, with `Cache-Control: no-cache` and
  `X-Accel-Buffering: no`. It never buffers via `resp.json()`/`resp.text()`.
- The browser UI calls same-origin `POST /api/chat` (no CORS) and parses the stream
  itself (`useChatStream` + `ReadableStream` parser, `fetch` — not `EventSource`).
- It forwards `req.signal` upstream so client abort cancels the gateway request.

## Rationale

Single place owns the secret + the gateway connection; passthrough preserves the
frozen SSE framing (`ADR-00003`) and flush semantics; same-origin removes CORS;
`AbortSignal` forwarding gives proper cancellation (`GW5`).

## Consequences

### Positive

- Token never in the browser bundle or network to the client.
- Frozen gateway contract untouched; the UI simply relays on the wire.
- No CORS configuration needed (same-origin `/api/chat`).

### Negative

- Next.js server process must reach the gateway (a new runtime dependency); if the
  Node tier is down, no UI. Mitigation: gateway/UI are co-deployed; the Go gateway
  stays independently reachable for API clients.

### Neutral

- The proxy is a thin relay; future client-side auth could be added at this seam
  without changing the gateway.

## Alternatives Considered

1. **`EventSource` straight to the gateway** — cannot send the header; token in URL
   is an insecure leak; CORS. Rejected.
2. **Bundle the token in the client** — the defining leak, violates `security.md`.
   Rejected.
3. **Separate Node proxy service** — more infra than a Next.js route handler; no
   gain given we already host Node. Rejected for MVP.

## References

- `docs/adr/ADR-0002-http-sse-transport.md`, `-0003-sse-event-contract.md`,
  `-0004-bearer-token-auth.md`, `-0007-nextjs-web-workspace.md`
- `rules/security.md`
- `docs/tdd/FEAT-00015_nextjs_ui_proxy_tdd.md`