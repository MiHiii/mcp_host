# Plan — FEAT-00015: Next.js UI + server-side token proxy (web/)

**Workflow:** `/plan` (Flow 1 New Feature — Plan phase)
**Date:** 2026-08-07
**Inputs:** TDD `docs/tdd/FEAT-00015_nextjs_ui_proxy_tdd.md` (U1–U9), BA spec `docs/specs/api/web-ui.md`, AC `docs/specs/api/ac/FEAT-00015.md` (AC-1..AC-10), business rules W1–W9, ADRs 0007/0008/0009, DoR PASS (8/8), sub-tasks FEAT-00016..00020.

## Goal

Create a `web/` Next.js (App Router, TypeScript strict) workspace with a server-side
BFF token proxy (`app/api/chat/route.ts`) that relays the frozen `POST /v1/chat` SSE
stream to a same-origin chat UI, so a user can prompt the agent from a browser with
streaming render of `start → stream* → final|error`, tool events, and streamed errors —
**without the `GATEWAY_API_TOKEN` ever reaching the client bundle** (U1–U9, AC-1..AC-10).

## Assumptions (resolves TDD §9 open questions)

1. `GATEWAY_TOKEN` = the gateway `GATEWAY_API_TOKEN` value, stored in `web/.env` (server-side only, never `NEXT_PUBLIC_*`).
2. Next.js dev server port `:3000` does not conflict with gateway `:8080` (no change to gateway).
3. Next.js major pinned to the **latest stable** at `npm install` time (Node v24 / npm 11 present); exact version recorded in `package.json` + `package-lock.json` during Step 2. Confirmed via `npm view next version` before install.
4. No existing CI pipeline files in repo (`DEVOPS-00001` in backlog). ADR-0009's blocking gate is delivered as runnable, blocking `npm run` scripts (`lint`/`typecheck`/`test`/`build`) + a token-absence audit script committed in `web/`; wiring into a specific CI provider is tracked separately (DEVOPS-00001) and noted as a risk.
5. Gateway error `error.code` → human copy base set taken from `docs/specs/api/gateway.md` (`TOO_MANY_REQUESTS`, `CANCELLED`, `LLM_FAILURE`, `MCP_ERROR`, `ITERATION_LIMIT`, `BAD_GATEWAY`).
6. Go tree (`cmd/`, `internal/`) is **untouched** (U7 / AC-9); no DB migration; `web/` is additive-only.

## Plan

### Step 1 — `/think`/`/plan` context lock (done above)
- **Files**: (none — context only)
- **Agent**: /pm /architect
- **Change**: Confirm DoR PASS, sub-task graph, spec/TDD/AC alignment.
- **Verify**: `docs/REGISTRY.md` FEAT-00015 status = SPRINT BACKLOG, DoR 8/8 ✅.
- **Duration**: (context gathering complete)

---

### Step 2 — Scaffold `web/` workspace + toolchain + token-audit script (FEAT-00016)
- **Files** (all new under `web/`): `package.json`, `package-lock.json`, `tsconfig.json` (`"strict": true`), `next.config.mjs`, `eslint.config.mjs`, `.prettierrc`, `.gitignore`, `.env.example`, `next-env.d.ts`, `scripts/audit-token.mjs`, `README.md` (web run/verify instructions).
- **Agent**: /dev
- **Change**: `npm init`-style scaffold with Next.js (App Router) + TS strict; add npm scripts `dev`, `build`, `start`, `lint`, `typecheck`(`tsc --noEmit`), `test`(vitest), `audit:token`; ESLint + Prettier + TS config to `code-style.md` PART B bar (no `any`); add `web/.env.example` with `GATEWAY_URL` + `GATEWAY_TOKEN` placeholders only (never real value); add `scripts/audit-token.mjs` that fails if a token-like value / `GATEWAY_TOKEN` literal appears in `web/.next`, source maps, or SSR HTML (ADR-0009).
- **Verify**:
  - `go test ./...` and `go vet ./...` still green in repo root (U7 / Go untouched).
  - `web/.env.example` contains **no** real token value.
  - After `npm install`: `npm run typecheck` && `npm run lint` && `npm run build` pass (empty app shell).
- **Duration**: ~10 min

### Step 3 — Tailwind + `app/layout.tsx` + `app/page.tsx` + `app/globals.css` shell (FEAT-00016)
- **Files**: `web/app/layout.tsx`, `web/app/page.tsx`, `web/app/globals.css`, `web/tailwind.config.ts`, `web/tailwind.config.ts`.
- **Agent**: /dev
- **Change**: App Router server layout, root CSS (Tailwind), placeholder page that will later mount the chat client component.
- **Verify**: `npm run build` green; `npm run dev` serves `http://localhost:3000` placeholder.
- **Duration**: ~6 min

---

### Step 4 — BFF proxy route + config + unit tests (FEAT-00017) ⚡ parallel with Step 5
- **Files**: `web/app/api/chat/route.ts` (server-only), `web/lib/proxy.ts` (pure helpers: prompt validation + upstream fetch), `web/lib/proxy.test.ts` (vitest), `web/.env.example` (already in Step 2), `web/.env` (local, git-ignored).
- **Agent**: /test (author) + /dev
- **Change**: Implement `POST /api/chat`:
  - Read `GATEWAY_TOKEN`/`GATEWAY_URL` from `process.env` (server-only; missing → `500` JSON envelope `INTERNAL_ERROR`, no secrets).
  - Validate `prompt`: non-empty string else `400 VALIDATION_FAILED`; whitespace-only → `422 INVALID_CONTENT`; oversized body rejected (AC-8).
  - `fetch(GATEWAY_URL + "/v1/chat", { method: POST, headers: { Content-Type: application/json, Authorization: Bearer <token>, Accept: text/event-stream }, body: JSON.stringify({ prompt }), signal: req.signal })`.
  - Non-`200` upstream → forward status + sanitized JSON envelope (W4 / AC-4).
  - `200` → `new Response(upstream.body, { status:200, headers: { "Content-Type": text/event-stream", "Cache-Control":"no-cache", "X-Accel-Buffering":"no" } })` — **verbatim `ReadableStream` relay**, never `resp.json()`/`resp.text()` (AC-6).
  - Forward `req.signal` so client abort cancels upstream gateway request (W-5 / AC-5).
- **Verify**:
  - Unit tests: prompt validation boundary (AC-8), env-missing → 500, non-200 forward (AC-4), passthrough (assert `resp.body` relay, AC-6/U-5), abort propagation (AC-5/U-6).
  - `npm test` green; `no EventSource` static guard (U-4).
  - Manual: run real gateway `go run ./cmd/gateway` + `npm run dev`, `curl.exe -N -X POST http://localhost:3000/api/chat -d '{"prompt":"hi"}'` → streaming SSE frames.
- **Duration**: ~9 min

### Step 5 — Client SSE parser + types + hook + unit tests (FEAT-00018) ⚡ parallel with Step 4
- **Files** (all new): `web/lib/chat/types.ts`, `web/lib/chat/parse.ts`, `web/lib/chat/parse.test.ts`, `web/hooks/useChatStream.ts` (`"use client"`).
- **Agent**: /dev + /test
- **Change**: 
  - `types.ts`: `ChatEvent` union (`start`/`stream`{text|tool}/`final`/`error`/`id`), `ToolEvent` (ADR-0003 / web-ui spec).
  - `parse.ts`: byte-buffer `ReadableStream` decoder splitting on `\n\n`, parsing `event:`/`data:`/`id:` lines, map to typed events; no `EventSource` (U-4).
  - `useChatStream.ts`: React hook — `fetch("/api/chat", POST)`, pipe `resp.body.getReader()` through parser, expose `{ events, send, abort, status }`, `AbortController.abort()` on unmount.
  - `proseStyle`: no `any`, strict TS (code-style PART B).
- **Verify:**
  - Unit tests: partial `\n\n` splits, multi-byte boundary, mixed `event:`/`data:`/`id:`, event mapping → `ChatEvent[]` (W-6/W-7). `npm test` green.
- **Duration**: ~9 min

---

### Step 6 — UI page + display components + streaming render (FEAT-00019)
- **Files**: `web/components/ChatThread.tsx`, `web/components/MessageBubble.tsx`, `web/components/ToolEvent.tsx`, `web/components/ErrorBanner.tsx`, edits to `web/app/page.tsx` (mount).
- **Agent**: /dev
- **Change**: Presentational components (props, no API calls — dumb components): `ChatThread` composes `useChatState` output; `MessageBubble` renders `final` text; `ToolEvent` renders tool `name` + `start/result`; `ErrorBanner` renders sanitized in-stream/pre-stream `error` messages (U-3, AC-3). Map `error.code → copy` using the base set (U-3/W-8). Token never rendered.
- **Verify:** component unit/render tests; `npm run dev` against real gateway → live render `start→tool→final` (U-1); error path shows banner (U-3); grep client bundle for token value → absent (U-2).
- **Duration**: ~8 min

### Step 7 — Hardening (FEAT-00020): abort tests, token-absence CI audit, docs

> Note: the numbering above maps to the FEAT-00016..00020 sub-tasks. The "Full-gate verification" below is the blocking gate, not a step that adds files.
- **Files**: `.gemini` docs + `web/README.md` (run/verify), any remaining CI gate wiring (workflow — if/when CI provider added), `docs/REGISTRY.md` status update reference, `tests/REPORTS.md` stub entries.
- **Agent**: /dev + (later) /test /qc
- **Verify** (TDD § Workflow artifacts):
  - **Deferred to /build verification step as a whole**: `go test ./...` + `go vet ./...` green (U-7/AC-10).
  - **Step 7 — Green-bar verification + regression** (per execution to the gate): full `go test ./... && go vet ./...` + `web/` all green (U-8/AC-10).

---

### Step 8 — Full-gate verification (final, blocking)

> ⛔ Every prior step must verify green before proceeding; any failure → `/fix` before continuing.

- **Agent**: /test
- **Verify**: 
  - Go gates unchanged + green (U-7/AC-9): `go test ./... && go vet ./...` at repo root.
  - `web/` gates green (U-8/AC-10): `cd web; npm run lint && npm run typecheck && npm run test && npm run build`.
  - Token-absence audit: `npm run audit:token` → PASS, and manual grep of `.next/` + SSR HTML for `GATEWAY_TOKEN`/token-like value (U-2/AC-2).
  - Static no-`EventSource`, passthrough assertions pass (U-4/U-5).
  - Manual: chat via `npm run dev` against real gateway → live stream (U-1/AC-1); abort mid-stream → upstream cancels (U-6/AC-5); same-origin `/api/chat` no CORS (U-9/AC-7).
- **Duration**: ~10 min (incl. running Go + web gates)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Token seeps into bundle (misuse `NEXT_PUBLIC_`, stray env) | server-only `route.ts`; token only referenced in server files; committed `.env.example` holds placeholder; `audit:token` CI gate + QC STRIDE (ADR-0008/0009). |
| Node/fetch buffers stream → no live render | pipe `upstream.body` passthrough (never `.text()`/`.json()`); `Cache-Control: no-cache`, `X-Accel-Buffering: no` (U-5/AC-6); verified under real gateway. |
| SSE parser splits mid-event/multibyte | byte-buffer decoder + targeted unit tests (partial `\n\n`, multibyte boundary). |
| No existing CI pipeline to host the `web/` gate yet | gate delivered as committed, runnable `npm run` scripts + audit script; wiring into a provider (GitHub Actions/etc.) tracked as DEVOPS-00001 follow-up (risk captured in assumption 4). |
| Next.js version drift / install issues on Node v24 | pin latest stable via `npm view next version` at install; record in `package-lock.json`. |
| UI scope creep beyond MVP | scope locked to single thread + tool + error (W-6/brainstorm Decision 2); history/auth split to follow-ups. |
| Port collision :3000 / :8080 | both co-deployed; different ports documented; gateway stays standalone. |

## Rollback Plan

`web/` is a fully additive workspace: no Go source (`cmd/`, `internal/`) and no
`go.mod` are changed (U-7/AC-10). To revert, `git checkout` the `web/` untracked
branch/commit and delete `web/`; the gateway (FEAT-00008) continues serving
`POST /v1/chat` unchanged. No DB migration; no schema change; no breaking API change.
`.env` never committed.

## Parallel Opportunities

- ⚡ **Step 4 (proxy) and Step 5 (client SSE parser/hook) run in parallel** — they are independent (different files/directories) given the Step 2 scaffold exists.
- Remaining steps are strictly ordered (Step 6 depends on Step 5; Step 7 final gate after all).