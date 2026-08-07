# ADR-00010: Client-Side Thread Cache & Context Compaction

- **Status:** Proposed
- **Date:** 2026-08-07
- **Decision makers:** Architect (Flow 1 Design — FEAT-00021)
- **Related feature:** FEAT-00021 (Multi-thread chat sessions + history cache + input-token reduction)

## Context

`POST /v1/chat` (frozen, `ADR-00003`) accepts only `{ prompt }`. The FEAT-00015 web
UI (`web/`) sends a single prompt and discards all prior turns on each request. Today
every message is an independent, context-free call — the conversation is fragmented
("rời rạc") and the gateway/agent has no continuity. To carry context the client would
have to re-send the whole history every turn, which grows input-token cost linearly
with conversation length.

We need per-thread conversation continuity with **bounded** input-token growth, without
changing the frozen gateway contract or touching the Go tree (`AC-9`/`U-7` pattern from
FEAT-00015).

## Decision

Keep context management **client-side only** in `web/`:

1. **Thread store (FEAT-00022):** a `Thread` model (id, title, createdAt, updatedAt,
   messages[]) persisted in the browser's `localStorage` (JSON, simple; MVP scale)
   — not IndexedDB (adds async complexity; no large blobs needed at MVP).
2. **Context cache + compaction (FEAT-00023):** each thread persists its message
   history. On a continued turn the client sends a **compacted prompt** built from the
   conversation window: the most recent `K` messages verbatim + a short `summary` of
   the older prefix. Input-token load therefore stays bounded (~O(K + summary)) instead
   of O(full history). A summary seam (`/summarize` on the gateway) is the LLM-based
   compaction path; until it ships, use a deterministic cut-off (keep last K messages,
   prefix flag "earlier context omitted").
3. **Threads UI (FEAT-00024):** thread list rail, create/switch/archive, view cached
   history (read-only) above the live stream.
4. **Gateway contract UNCHANGED:** compaction happens purely in the `web/` client
   before the `{prompt}` is passed to `POST /api/chat`. No Go change, no new endpoint,
   no `EventSource` (keeps `ADR-00002`), token still server-side only.

## Rationale

Client-side compaction is the only option that keeps the frozen gateway contract and
the Go tree untouched while achieving the stated goals. It bounds input tokens per call
to O(recent-window + summary) instead of O(entire history). Local storage is the
simplest persistence with zero infra; IndexedDB adds no benefit at MVP volume. A shared
summary seam is deferred so the deterministic window can ship first.

## Consequences

### Positive

- Fragmentation solved: threads + continuity restored; user sees prior turns.
- Input-token cost per message is bounded and drops vs naive full-history resends.
- No Go change, no gateway contract break, no new server persistence / secrets risk.
- No network cache server; offline-cacheable history.

### Negative
- Token-reduction is heuristic until the `/summarize` seam ships (older context may be
  lossy / dropped).
- `localStorage` has a ~5MB quota — long threads or many threads must be evicted
  (FEAT-00025 cap).
- Per-device only; no cross-device sync (accepted for MVP; follow-up noted).

## Alternatives Considered
1. **Server-side session/context store (e.g. Redis/DB) + gateway change** — the
   strongest continuity/token outcome but breaks the frozen gateway contract and
   touches the Go tree; heavy for MVP. Rejected now (tracked as a possible follow-up
   FEAT).
2. **Add conversation history to the BFF proxy request** — proxy would have to hold
   state or pass a growing history; does not reduce input tokens and adds a server-side
   store. Rejected.
3. **Compaction on the Go gateway** — Go change; rejected.
4. **IndexedDB instead of localStorage** — more robust for large data but async
   complexity with no MVP benefit. Deferred.

## References
- `docs/adr/ADR-0003-sse-event-contract.md` (frozen `{prompt}` contract),
  `-0008-bff-fetch-stream-sse-proxy.md`, `-0007-nextjs-web-workspace.md`
- `docs/tdd/FEAT-00015_nextjs_ui_proxy_tdd.md` (U-4: no EventSource; U-2 token; AC-9 Go untouched)
- `rules/security.md`