# MCP Host — Web UI (FEAT-00015)

A Next.js (App Router, TypeScript strict) chat UI that reaches the gateway through
a server-side BFF token proxy. The `GATEWAY_TOKEN` never reaches the browser.

## Prerequisites

- Node v24 / npm 11
- A running gateway (`go run ./cmd/gateway` at repo root, on `:8080`)

## Setup

```bash
cp .env.example .env   # fill GATEWAY_URL and GATEWAY_TOKEN (server-side only)
npm install
```

## Run

```bash
npm run dev       # http://localhost:3000
```

## Quality gates (blocking, ADR-0009)

```bash
npm run typecheck       # tsc --noEmit (strict)
npm run lint            # eslint .
npm run test            # vitest run
npm run build           # next build
npm run audit:token     # fail if a token-like value appears in .next/ output
```

`audit:token` walks `.next/` (source maps, SSR HTML) and fails the build if
`GATEWAY_TOKEN` or an `Authorization: Bearer` literal appears — the automated
half of the token-absence guarantee (U2 / AC-2).

## Live verification

With the gateway running (`go run ./cmd/gateway`, `:8080`) and `npm run dev` up:

```bash
curl.exe -N -X POST http://localhost:3000/api/chat ^
  -H "Content-Type: application/json" ^
  --data-binary '{"prompt":"hi"}'
```

Expect a streaming `event: start` → `event: final` SSE sequence. The proxy relays the
gateway's `ReadableStream` verbatim (never `.text()`/`.json()`), sets
`Cache-Control: no-cache` and `X-Accel-Buffering: no`, and forwards the client
`AbortSignal` so cancelling mid-stream also aborts the upstream request.

> Note: on Windows PowerShell, write the JSON body without a UTF-8 BOM
> (e.g. `[System.IO.File]::WriteAllText(file, body, (New-Object Text.UTF8Encoding($false)))`)
> or `JSON.parse` in both the proxy and the gateway will reject it as malformed.

## Security notes

- `GATEWAY_TOKEN` is read only inside `app/api/chat/route.ts` (server runtime).
- Never use a `NEXT_PUBLIC_*` prefix — that bakes the token into the client bundle.
- `.env` is git-ignored; only `.env.example` (placeholder) is committed.