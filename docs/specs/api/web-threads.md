# v1 Web Threads + History Cache + Token Reduction (FEAT-00021)

> Owner: BA | Last Updated: 2026-08-07
> Related Tasks: FEAT-00021 (multi-thread + cache), FEAT-00022..00025; ADR-0010
> Depends on: frozen `POST /v1/chat` SSE contract (`gateway.md`), FEAT-00015 web UI
> (`web-ui.md`). This adds **client-only** thread management — **no new public/gateway
> endpoint**, **no Go change**.

## Overview

FEAT-00015 delivered a single-streaming chat UI where every prompt is an independent,
context-free call to the frozen `POST /v1/chat` (`{prompt}` only, ADR-0003). A user
cannot carry a conversation or reduce the token cost of resending surrounding context.

This module adds, entirely in the `web/` client:

- **Threads**: multiple named conversations you can create, switch between, and archive.
- **History cache**: each thread's message history is persisted in the browser
  (`localStorage`) and rehydrated on reload.
- **Context compaction**: continuing a thread sends a compacted prompt (a recent window
  + optional summary of older context) so input-token load is bounded, not O(entire
  history).

Scope locked to **single-device, client-side** persistence. There is **no server
database** and **no Go change**. The gateway contract is unchanged; the proxy
(`app/api/chat/route.ts`) still receives one `{prompt}` and still owns the token.

## Client-Side Data Model (`localStorage`)

Storage key: `mcp.chat.threads:v1:v0`.

```ts
type ThreadMessage = {
  role: "user" | "assistant";
  kind: "text" | "tool";
  text: string;      // tool: "name — start|result (bytes)"  ; text: rendered text
  ts: number;        // epoch ms
};

type Thread = {
  id: string;          // crypto.randomUUID()
  title: string;       // derived from first user prompt (first ~40 chars)
  createdAt: number;
  updatedAt: number;
  messages: ThreadMessage[];
  summary?: string;    // set when messages exceed the window (compaction)
};

type ThreadStoreState = {
  threads: Thread[];
  activeId: string | null;   // thread loaded on next reload
};
```

Versioned storage key (`v1`) allows a future schema migration with a dev-only helper.
No thread may ever contain the `GATEWAY_TOKEN` or an `Authorization` value.

## Compaction Rule (business logic — deterministic for MVP)

**CONNECTED** — continuing a thread:

```
INPUT:  thread.messages[] (persisted), window = NEXT_PUBLIC_THREAD_WINDOW (default 6)
RULE:   take the last `window` messages verbatim as the "recent window".
        If messages.length > window:
          prompt = "[Earlier context omitted] " + (thread.summary ?? "earlier conversation")
                    + "\n-----\n" + concat(last `window` messages' role+text)
        else:
          prompt = concat(all messages)   # nothing dropped
        (A `summary` is recorded when compaction first drops older messages.)
OUTPUT: a single compacted `{prompt}` sent to POST /api/chat.
EDGE:
  - messages.length == window          -> no compaction, full prompt.
  - messages.length == window + 1     -> exactly 1 older message compacted away.
  - summary absent but dropping occurs -> use "earlier conversation" placeholder
                                          and record summary.
  - messages empty                     -> covered by FEAT-00015 validation (400).
```

**Token-reduction invariant (AC-3):** for any thread with `messages.length > window`,
`len(compactedPrompt) < len(fullHistoryPrompt)`. Growth is O(window + summary), not
O(entire history). The `NEXT_PUBLIC_THREAD_WINDOW` (default `6`) is the only exposed
tuning knob; it is a UI surface, never a secret.

## UI Surface (MVP scope)

- **Thread list rail**: list of threads (title + updated time); create-new, select
  (switch), archive.
- **Active thread view**: renders the cached history (read-only) and the live stream.
- **Continuity banner**: when older context is compacted, show "Earlier context
  omitted/compacted".
- **Abort-on-switch**: switching/archiving cancels any in-flight request for the old
  thread (cleanup, no orphaned call).

## Out of Scope (MVP)

- Server-side persistence / sync / accounts / multi-device.
- Per-user auth on the UI.
- Editing/deleting individual messages (only whole-thread archive/clear).
- Cross-thread context sharing.
- `/summarize` gateway LLM compaction (a reserved seam; MVP uses the deterministic
  window).
- Any change to `POST /v1/chat`, `POST /api/chat`, or the Go tree.

## Spec Writing Checklist

- [x] Consistent model/serialization (localStorage versioned key)
- [x] Compaction business rule with INPUT/RULE/OUTPUT/EDGE and a number invariant
- [x] Security boundary defined (no secrets/PII in threads; sanitize on render)
- [x] Depends on frozen gateway + existing proxy — no contract change
- [x] Out-of-scope explicitly bounded
- [x] Boundary values stated (window, window+1, window default 6, localStorage ~5MB cap)