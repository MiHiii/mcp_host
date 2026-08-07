# Brainstorm — FEAT-00021: Multi-thread chat + history cache + input-token reduction

- Phase: Flow 1 — Clarify (/think)
- Date: 2026-08-07
- Task ID: FEAT-00021 (parent) + FEAT-00022..00025
- Status: Recorded; architecture design IS required (next: /architect design)

## Goal

Give the web UI persistent, multi-thread conversations so users can return to prior
chats, continue them, and stop re-paying the full input-token cost on every message.

- Per-thread conversation history cached client-side (single-device, no server DB).
- On continuation, the UI sends a compacted prompt (recent turns + summarized older
  context) to reduce input tokens while preserving continuity.
- Gateway `POST /v1/chat` contract UNCHANGED — no Go change. All work in `web/`.

## Constraints

- No server/Go changes — frozen `/v1/chat` contract (ADR-0003); single-device,
  client-side cache only.
- Cache in browser storage (IndexedDB/localStorage); rehydrate last thread on reload.
- Scope locked: thread CRUD + compaction + token-budget guard + hardening.
- Follow existing patterns from FEAT-00015 (Next.js App Router, TS strict,
  `lib/chat`, `useChatStream` hook, BFF proxy `app/api/chat/route.ts`).

## Known Context

- FEAT-00015 DONE: SSE parser, `useChatStream` hook, BFF proxy, thread-less single prompt.
- Registry DoR for FEAT-00021 is provisional (4/7 NOT READY) — BA spec/AC + TDD/ADR
  pending, so it stays BACKLOG until `/ba` + `/architect` outputs land and DoR re-runs.
- Sub-tasks already sized: FEAT-00022(5) store/lifecycle, FEAT-00023(8) cache+compaction,
  FEAT-00024(5) thread UI, FEAT-00025(3) hardening.

## Risks

- Input-token reduction is subtle: naive "send all history" makes the problem worse
  (token load grows per turn); compaction must be implemented and measured.
- Token-budget correctness: no public token count on the client; must use an estimator.
- Cache staleness/eviction: unbounded storage can leak storage or cache stale
  summaries; needs N-thread / M-event limits.
- Security: must not cache secrets/token material client-side.
- UX: thread switching during an in-flight stream (abort across switch).
- Summary seam (`/summarize`) is an interface only — needs a reference implementation
  that preserves the frozen gateway contract.

## Options

1. Client-only compaction; server still per-prompt. Full history lives client-side;
   client builds a compacted prompt (window + summary) and sends it as one `{prompt}`.
   Cheapest, no Go change; compaction quality is the lever. (Recommended.)
2. Server-side context window: requires gateway/Go change — violates frozen contract
   + ADR-0003. Rejected (out of scope).
3. User-managed compaction: flag/dropdown letting the user choose how much history to
   send. More control, but more UX complexity and risk of user error.

## Recommendation

Option 1, realized by the existing sub-task shape:

- FEAT-00022 store & lifecycle: `Thread` model, create/switch/archive/back, per-thread
  message list in local storage (IndexedDB/localStorage), rehydrate last thread.
- FEAT-00023 context cache + deterministic compaction: keep last N turns verbatim,
  summarize older turns via a `/summarize` seam, cap total allowed context length,
  map cached events to text.
- FEAT-00024 thread UI: thread list rail + active-thread switcher + per-thread
  clear/archive + view cached history vs live stream.
- FEAT-00025 hardening: eviction limits (N threads / M events), token-budget guard,
  persistence/compaction tests, abort-across-switch, docs, security check.

## Acceptance Criteria (high-level; `/ba` will detail)

- AC1: User can create multiple threads and switch between them without losing history.
- AC2: History persists across reload (last thread rehydrated).
- AC3: Continuing a thread re-sends a compacted prompt whose estimated input tokens are
  bounded and do not grow monotonically with every turn.
- AC4: Older turns are summarized via a seam; summary content is stored per-thread.
- AC5: Cache respects eviction limits; no secrets/tokens are cached.
- AC6: Thread switching aborts any in-flight stream cleanly.
