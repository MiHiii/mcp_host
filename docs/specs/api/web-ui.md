# v1 Web UI + Token Proxy (FEAT-00015)

> Owner: BA | Last Updated: 2026-08-07
> Related Tasks: FEAT-00015 (Next.js UI), ADR-0007, ADR-0008, ADR-0009
> Depends on: frozen `POST /v1/chat` SSE contract (`docs/specs/api/gateway.md`)

## Overview

A browser chat UI (Next.js, in `web/`) lets a user send a prompt and watch the
agent stream live events (`start → stream* → final|error`), including tool
progress and streamed errors. The browser **never** talks to the gateway directly
and **never** holds the `GATEWAY_API_TOKEN`. A server-side Next.js route handler
(`app/api/chat/route.ts`) is a Backend-for-Frontend (BFF) proxy that owns the
secret, adds the `Authorization` header, and relays the upstream SSE stream
verbatim (ADR-0008).

This module documents the **internal** proxy contract. It is **not** a public API:
it is same-origin, consumed only by the Next.js UI, and adds no new capability
beyond the frozen gateway contract.

## Internal Proxy Endpoint

### `POST /api/chat` (internal, same-origin)

- **Description:** Accept one chat prompt from the UI, forward it to the gateway
  `POST /v1/chat` with the server-side token, and relay the SSE stream back.
- **Auth:** none from the browser (open UI in MVP; the proxy adds the header).
- **Content-Type:** `application/json` (request).
- **Request Body:**
  ```json
  { "prompt": "<string, non-empty>" }
  ```
- **Responses:**
  - `200` + `Content-Type: text/event-stream` — the verbatim gateway SSE stream
    (`Cache-Control: no-cache`, `X-Accel-Buffering: no`). Event payloads are
    exactly the gateway contract (ADR-0003):
    | Event | `data:` payload |
    |-------|-----------------|
    | `start` | `{"request_id":"<id>","model":"<name>"}` |
    | `stream` | `{"type":"text","text":"..."}` OR `{"type":"tool","name":"<tool>","status":"start"\|"result","bytes":<n>}` |
    | `final` | `{"text":"<final answer>"}` |
    | `error` | `{"code":"<CODE>","message":"<safe>"}` |
    | `id` | `{"note":"keep-alive"}` (heartbeat) |
  - **Proxy/gateway errors before the proxy commits a `200`:** forwarded as the
    gateway JSON error envelope with the gateway HTTP status (`401`/`400`/`422`/`429`):
    ```json
    { "error": { "code": "CODE", "message": "human-readable" } }
    ```
  - **Proxy misconfiguration** (missing `GATEWAY_URL`/`GATEWAY_TOKEN`): `500`
    JSON envelope `INTERNAL_ERROR` (no secrets).

- **Terminal-state rule:** relays exactly one of `final`/`error` then closes,
  matching ADR-0003.

## Configuration (server-side only)

| Variable | Scope | Required | Purpose |
|----------|-------|----------|---------|
| `GATEWAY_URL` | `web/.env` (server) | Yes | Gateway base, e.g. `http://localhost:8080` |
| `GATEWAY_TOKEN` | `web/.env` (server) | Yes | Value of the gateway `GATEWAY_API_TOKEN` |

**Security rule:** neither variable may use a `NEXT_PUBLIC_*` prefix; the token
must never appear in client bundles, source maps, or SSR HTML (CI-audited,
ADR-0009).

## UI Surface (MVP scope)

- Single chat thread: user prompt + streamed assistant answer.
- Live tool events rendered inline (`tool name … start/result`).
- Streamed errors rendered in an `ErrorBanner`.
- No history persistence, no user auth, no multi-thread in MVP (out of scope).

## Response Security

- Browser never sees the `Authorization` header or token value (BFF, ADR-0008).
- In-stream `error` messages are the sanitized gateway messages; no stack traces,
  no raw tool/config output (ADR-0003).
- Streaming is passthrough — no buffering (`resp.body` relay), so flush semantics
  survive; heartbeat passthrough defeats proxy buffering.

## Spec Writing Checklist

- [x] Consistent request/response format (JSON envelope for errors)
- [x] Error codes follow `rules/api-convention.md` / `rules/error-handling.md`
- [x] Security boundary defined (token only server-side)
- [x] Depends on frozen, versioned gateway contract (`/v1/chat`) — no contract change
- [x] Internal (same-origin) — no public endpoint added
