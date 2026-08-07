# Plan — FEAT-00021: Web Threads + History Cache + Input-Token Reduction (web/)

**Workflow:** `/plan` (Flow 1 New Feature — Plan phase)
**Date:** 2026-08-07
**Inputs:** TDD `docs/tdd/FEAT-00021_thread_cache_compaction_tdd.md` (U1–U10), BA spec
`docs/specs/api/web-threads.md`, AC `docs/specs/api/ac/FEAT-00021.md` (AC-1..AC-10),
ADR `docs/adr/ADR-0010-client-thread-cache-compaction.md`, business rule (compaction),
DoR **PASS (7/7)**, sub-tasks FEAT-00022..00025.

## Goal

Add, entirely in the `web/` client, multi-thread chat with a local `localStorage`
history cache and **bounded input-token** continued turns (recent-window + summary),
so conversations are continuous ("not rời rạc") and token cost per continued turn
drops instead of growing O(full history). **No Go change; frozen `POST /v1/chat` and
`POST /api/chat {prompt}` contract unchanged** (U7/U9, AC-7/AC-9).

## Assumptions (resolves TDD §9 open questions)

1. Persistence = `localStorage` (MVP; no IndexedDB). Key `mcp.chat.threads:v1:v0`.
2. Compaction window default `6`, tunable via `NEXT_PUBLIC_THREAD_WINDOW` (client,
   never a secret). Deterministic window (no `/summarize` gateway call in this build).
3. Thread id = `crypto.randomUUID()`; title = first prompt prefix (~40 chars).
4. Continuing-only; no per-message edit/delete, no server store, no multi-device sync.
5. `web/` gates (ADR-0009) remain blocking: typecheck/lint/test/build/audit:token.
6. Go tree untouched (U-7/AC-7) — additive `web/` changes only.

## Plan

### Step 1 — Thread store + model + persistence (FEAT-00022)
- **Files** (new, under `web/lib/threads/`): `types.ts` (`Thread`, `ThreadMessage`,
  `ThreadStoreState`), `store.ts` (load/save localStorage versioned, CRUD: create,
  switch/active, archive, rehydrate-last, append message), `store.test.ts`.
- **Agent**: /dev
- **Change**: TypeScript strict model + a `useThreadStore` hook (client) wrapping
  localStorage with create/switch/archive/append + `activeId` rehydrate on mount.
- **Verify**: `npm test` (store unit: CRUD, persistence round-trip, rehydrate, version);
  `npm run typecheck && npm run lint`.
- **Duration**: ~10 min

### Step 2 — Compaction + context builder (FEAT-00023)
- **Files** (new in `web/lib/chat/`): `compaction.ts` (+ `compaction.test.ts`) exposing
  `buildContinuedPrompt(thread, window)` and `fullHistoryPrompt(thread)`.
- **Agent**: /dev
- **Change**: deterministic compaction — keep last `window` messages verbatim; if
  `messages.length > window`, prefix `"[Earlier context omitted] " + (summary ?? "earlier
  conversation")` and record `summary`. Expose `NEXT_PUBLIC_THREAD_WINDOW` default 6.
- **Verify**: unit tests for boundary (window, window+1, empty, summary presence) +
  **AC-3 byte invariant** (`compacted < full-history` above the window);
  `npm run typecheck && npm run lint`.
- **Duration**: ~5 min

### T3 — Wire compaction into useChatStream + append history (FEAT-00023)
- **Files** (edit `web/hooks/useChatStream.ts`, `web/components/ChatThread.tsx`)
- **Agent**: /dev
- **Change**: `send` takes `(prompt, threadId)`; route through compaction; on
  `final`/`stream`, append assistant text to the active thread (via store). Keep
  `fetch`+ReadableStream (U-4), abort-on-call (U-6), token still server-side.
- **Verify**: `npm test` green (existing 37 + new); live E2E later; `typecheck && lint`.
- **Duration**: ~5 min

### T4 — Thread UI: rail + switcher + continuity view (FEAT-00024)
- **Files** (new): `web/components/ThreadRail.tsx`; (edit) `page.tsx`, `ChatThread.tsx`,
  `layout.tsx`
- **Agent**: /dev
- **Change**: thread list rail (title, updated), create/switch/archive, read-only cached
  history in active view, "earlier context omitted" banner when compacted, abort-on-switch.
- **Verify**: component render tests + `npm run typecheck && lint && test && build`.
- **Duration**: ~5 min

### T5 — Hardening (FEAT-00025): caps, token guard, abort tests, docs, security
- **Files**: `web/lib/threads/store.ts` (eviction caps N threads / M messages),
  `web/lib/chat/compaction.ts` (token-budget guard), `web/lib/chat/parse.test.ts`
  (abort-on-switch), `web/README.md`, `tests/REPORTS.md`, `.gemini` docs.
- **Agent**: /dev (+ later /test /qc)
- **Change**: localStorage cap + oldest-fit eviction; assert no token/PII in thread
  cache (fresh client-artifact audit); aborts across thread switch; docs.
- **Verify**: unit tests for eviction + no-secret cache; `npm test && audit:token`;
  no Go change (`go test ./... && go vet ./...`).

### Step 6 — Full-gate verification (final, blocking)
- **Agent**: /test
- **Verify**: Go unchanged green (`go test ./... task) + web all green
  (`lint`/`typecheck`/`test`/`build`/`audit:token`); token-absence audit PASS; AC-3
  byte-invariant verified; chain thread create→chat→switch→return E2E live.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| localStorage 5MB quota on many/long threads | FEAT-00025 caps (N threads, M msg) + eviction |
| Compaction drops older context (lossy) | window + summary placeholder + "earlier omitted" banner; `/summarize` reserved |
| Thread cache XSS/PII | render text as text (no dangerouslySetInnerHTML); no secrets ever in thread (token server-only) |
| Abort/switch race | per-thread AbortController on switch (U-6); tests |
| Contract/Go drift | none — no new endpoint, no Go change (AC-9/U-7) |

## Rollback Plan

`web/` additive only; Go + gateway untouched. Revert by removing the thread store/UI
files; the UI falls back to the single-stream FEAT-00015 chat. No DB, no migration,
no breaking change; `.env` unchanged.

## Parallel Analysis

- Step 1 (store) and initial part of Step 2 (pure compaction fn) are independent
  (different files) — can run in parallel once scaffold exists.
- Steps 3–5 are ordered (depend on store + compaction).