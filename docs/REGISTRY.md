# Task Registry - MCP Host Project

| ID | Description | Priority | Sprint | DEV | TEST | QC | Status |
|----|-------------|----------|--------|-----|------|-----|--------|
| FEAT-00001 | Bootstrap Go module, dependency baseline, and CLI composition root | P0 | S1 | ✅ | ✅ | ✅ | DONE |
| FEAT-00002 | Configuration validation and safe Filesystem MCP process policy | P0 | S1 | ✅ | ✅ | ✅ | DONE |
| FEAT-00003 | Stdio MCP client lifecycle: initialize, discovery, call, timeout, cleanup | P0 | S1 | ✅ | ✅ | ✅ | DONE |
| FEAT-00004 | MCP JSON Schema to Gemini function-declaration mapper | P0 | S1 | ✅ | ✅ | ✅ | DONE |
| FEAT-00005 | Gemini provider adapter and conversation request/response mapping | P0 | S1 | ✅ | ✅ | ✅ | DONE |
| FEAT-00006 | Bounded agentic loop, tool-result context, cancellation, and error handling | P0 | S1 | ✅ | ✅ | ✅ | DONE |
| FEAT-00007 | Headless CLI prompt input and final-response output | P1 | S1 | ✅ | ✅ | ✅ | DONE |
| QA-00001 | Unit tests for config, policy, mapper, and agent loop | P0 | S1 | ⬜ | ⬜ | ⬜ | SPRINT BACKLOG |
| QA-00002 | Fake MCP stdio integration tests for discovery, timeout, and crash | P0 | S1 | ⬜ | ⬜ | ⬜ | SPRINT BACKLOG |
| QA-00003 | Opt-in E2E test with sandboxed Filesystem MCP Server | P0 | S1 | ⬜ | ⬜ | ⬜ | SPRINT BACKLOG |
| DEVOPS-00001 | CI quality gates: go test, go vet, and coverage report | P1 | S1 | ⬜ | ⬜ | ⬜ | SPRINT BACKLOG |
| DOC-00001 | Document Gemini and Filesystem MCP local setup and security constraints | P1 | S1 | ⬜ | ⬜ | ⬜ | SPRINT BACKLOG |
| FEAT-00008 | HTTP/SSE API Gateway: authenticated POST /v1/chat streaming agent progress over SSE + GET /healthz | P2 | S2 | ✅ | ✅ | ✅ | DONE |
| FEAT-00010 | Agent OnEvent observer seam in internal/agent (additive: start/text/tool/final events) | P2 | S2 | ✅ | ✅ | ✅ | DONE |
| FEAT-00011 | GATEWAY_* config keys: ADDR, API_TOKEN, API_TOKENS, MAX_CONCURRENT | P2 | S2 | ✅ | ✅ | ✅ | DONE |
| FEAT-00012 | internal/server HTTP layer: router, Bearer auth, SSE encoder, Handler seam, healthz | P2 | S2 | ✅ | ✅ | ✅ | DONE |
| FEAT-00013 | internal/runner per-request runner: MCP lifecycle, agent loop, event mapping, cancel | P2 | S2 | ✅ | ✅ | ✅ | DONE |
| FEAT-00014 | cmd/gateway entrypoint: config wiring, :8080 listen, health, docs | P2 | S2 | ✅ | ✅ | ✅ | DONE |
| FEAT-00015 | Next.js UI + server-side token proxy (BFF fetch-stream SSE relay, web/ workspace) | P2 | S2 | ✅ | ✅ | ✅ | DONE |
| FEAT-00021 | Multi-thread chat sessions + history cache + input-token reduction | P1 | S3 | ⬜ | ⬜ | ⬜ | BACKLOG |
| FEAT-00009 | Additional LLM providers and MCP server profiles | P2 | S2 | ⬜ | ⬜ | ⬜ | DEFERRED |

---

## FEAT-00008 Sub-Task Breakdown (per TDD build sequence, `docs/tdd/FEAT-00008_gateway_tdd.md` §9)

| ID | Title | Owner | Dependencies | Priority |
|----|-------|-------|--------------|----------|
| FEAT-00008 | HTTP/SSE Gateway (parent) | PM | — | P2 |
| FEAT-00010 | Agent OnEvent observer seam (internal/agent) | DEV | — | P2 |
| FEAT-00011 | GATEWAY_* config keys | DEV | — (additive to existing internal/config) | P2 |
| FEAT-00012 | internal/server HTTP layer (auth + SSE + healthz + Handler seam) | DEV | FEAT-00010, FEAT-00011 | P2 |
| FEAT-00013 | internal/runner per-request runner (real composition; SDK-free HTTP kept in internal/server) | DEV | FEAT-00010, FEAT-00011, FEAT-00012 | P2 |
| FEAT-00014 | cmd/gateway entrypoint | DEV | FEAT-00011, FEAT-00012, FEAT-00013 | P2 |
| FEAT-00015 | Next.js UI + token proxy (follow-up) | DEV | FEAT-00008 (frozen SSE contract) | P2 |

## FEAT-00015 Sub-Task Breakdown (per TDD build sequence, `docs/tdd/FEAT-00015_nextjs_ui_proxy_tdd.md` §8)

> Estimates (story points, Fibonacci) confirmed via `/pm plan` 2026-08-07.

| ID | Title | Owner | Dependencies | Priority | Points | Status |
|----|-------|-------|--------------|----------|:------:|--------|
| FEAT-00015 | Next.js UI + token proxy (parent) | PM | FEAT-00008 (frozen SSE contract) | P2 | (Σ below) | ✅ |
| FEAT-00016 | web/ scaffold: Next.js App Router, TS strict, ESLint/Prettier, CI gate | DEV | ADR-0007, ADR-0009 | P2 | 3 | ✅ |
| FEAT-00017 | BFF proxy route app/api/chat/route.ts + GATEWAY_URL/GATEWAY_TOKEN config + .env.example | DEV | FEAT-00016, ADR-0008 | P2 | 3 | ✅ |
| FEAT-00018 | Client SSE parser lib/chat/parse.ts + types + useChatStream hook | DEV | FEAT-00016 | P2 | 5 | ✅ |
| FEAT-00019 | UI page + components: ChatThread, MessageBubble, ToolEvent, ErrorBanner | DEV | FEAT-00018 | P2 | 5 | ✅ |
| FEAT-00020 | Hardening: abort propagation tests, token-absence CI audit, docs | DEV | FEAT-00017, FEAT-00019 | P2 | 3 | ✅ |

**Total: 19 story points** (parent = 3+3+5+5+3). Broken down; each sub-task ≤ 8 (DoR
compliant).

## FEAT-00021 Sub-Task Breakdown (multi-thread chat + history cache + token reduction)

> Registered 2026-08-07 by PM per `/pm registry` (user request: conversations are
> "rời rạc" / fragmented and token-heavy today). Follow-up to FEAT-00015 ("Chat
> history persistence / multi-thread management" was Out of Scope MVP).
>
> Problem today: `POST /v1/chat` accepts only `{prompt}` (frozen contract, ADR-00003),
> so every message is an independent, context-free call. The client drops all prior
> turns — nothing is cached and every prompt re-pays the full input-token cost of the
> surrounding context the gateway would need.
>
> Goal (P1, S3): per-thread conversation history, cached client-side; on a continued
> thread the UI sends a compacted context (recent turns + summarized older context)
> to reduce input tokens while preserving continuity. Scope locked to single-device,
> client-side cache (no server DB); gateway contract UNCHANGED (no Go change).

| ID | Title | Owner | Dependencies | Priority | Points |
|----|-------|-------|--------------|----------|:------:|
| FEAT-00021 | Multi-thread chat sessions + history cache + input-token reduction (parent) | PM | FEAT-00015 (DONE) | P1 | (Σ below) |
| FEAT-00022 | **Thread store & lifecycle**: `Thread` model, create/switch/archive/back, per-thread message list in local storage (IndexedDB/localStorage), rehydrate last thread on reload | DEV | FEAT-00015 | P1 | 5 |
| FEAT-00023 | **Context cache & compaction**: store per-thread message history; on continuation build a compacted prompt (conversation window + `/summarize` seam) so re-sent input-token load drops, not grows; map cached events → text | DEV | FEAT-00022 | P1 | 8 |
| FEAT-00024 | **Thread UI**: thread list rail + active-thread switcher + per-thread "clear/archive" + view cached history vs live stream | DEV | FEAT-00022, FEAT-00023 | P1 | 5 |
| FEAT-00025 | **Hardening**: cache eviction/limit (e.g. N threads / M events), token-budget guard, tests (persistence, compaction, abort across switch), docs, security check (no secrets cached) | DEV | FEAT-00022, FEAT-00023, FEAT-00024 | P1 | 3 |

**Total: 21 story points** (parent = 5+8+5+3). Each sub-task ≤ 8 (DoR compliant;
FEAT-00023 at 8 is the max-legal single unit).

## Global Status

**DONE — FEAT-00008** completed the full Flow 1 lifecycle on 2026-08-07: Design (TDD + ADRs 00002–00006) → BA spec → DoR PASS → `/plan` APPROVED → Implement (FEAT-00010..00014) → Test (TEST-00009, GW1–GW9 9/9 PASS) → QC sign-off (no blockers). `go build`/`go vet`/`go test ./...` all green. CLI (`cmd/server`) unchanged. Follow-ups: FEAT-00015 (Next.js UI, **activated → SPRINT BACKLOG 2026-08-07**), token rotation, rate limiting, pooled MCP transport.

**DONE — FEAT-00015** completed the full Flow 1 lifecycle on 2026-08-07: Architect TDD (U1–U9) + ADRs 0007–0009 → BA spec `docs/specs/api/web-ui.md` + AC-1..AC-10 → DoR PASS (8/8) → `/plan` APPROVED → Implement (FEAT-00016..00020) → Test (37/37 web unit + live E2E) → /dev review + /qc audit + /qc sign-off (no blockers). All gates green: Go (`go test ./...`, `go vet ./...`), web (`typecheck`/`lint`/`test`/`build`/`audit:token`), client-bundle token-absence verified. Go tree untouched. Follow-ups: DEVOPS-00001 (CI wiring incl. coverage), TEST-xxxxx registration for manual E2E, UI polish backlog.

## DoR — FEAT-00008 (2026-08-07, PM)

- [x] 5-digit ID present: `FEAT-00008`
- [x] Linked to FEAT/REQ reference: TDD §6 + spec `docs/specs/api/gateway.md`
- [x] BA spec + AC completed: `docs/specs/api/gateway.md` (endpoints, errors, security)
- [x] Acceptance criteria listed: GW1–GW9 in TDD §6
- [x] Design/TDD + ADR present: `FEAT-00008_gateway_tdd.md` + ADR-0002..0006
- [x] Dependencies identified: sub-task graph above
- [x] Priority confirmed: P2 (S2)
- [ ] Estimate ≤ 8 story points: not estimated (superseded — FEAT-00008 delivered via FEAT-00010..00014)

## DoR — FEAT-00015 (2026-08-07, PM)

- [x] 5-digit ID present: `FEAT-00015`
- [x] Linked to FEAT/REQ reference: TDD §6 (U1–U9) + spec `docs/specs/api/web-ui.md`
- [x] BA spec + AC completed: `docs/specs/api/web-ui.md` + Gherkin AC-1..AC-10 (`docs/specs/api/ac/FEAT-00015.md`)
- [x] Acceptance criteria listed: U1–U9 (TDD §6) + AC-1..AC-10 (BA)
- [x] Design/TDD + ADR present: `FEAT-00015_nextjs_ui_proxy_tdd.md` + ADR-0007..0009
- [x] Dependencies identified: FEAT-00008 (frozen SSE contract, DONE); sub-task graph above
- [x] Priority confirmed: P2 (S2)
- [x] Estimate ≤ 8 story points: **confirmed** — sub-tasks 3/3/5/5/3 (≤ 8 each); parent 19 (groomed to sub-task granularity)

**DoR verdict: PASS (8/8 ✅)** — FEAT-00015 is Ready to enter the Sprint. Sub-tasks
are all ≤ 8 points apiece; parent (19) is intentionally a tracking group, not a
single work unit. Dependencies satisfied (FEAT-00008 DONE).

## DoR — FEAT-00021 (2026-08-07, PM) — provisional, NOT yet PASS

- [x] 5-digit ID present: `FEAT-00021` (parent) + FEAT-00022..00025
- [ ] Linked to REQ/FEAT reference: **pending** — tied to FEAT-00015 Out-of-Scope note + user request; needs TDD U-IDs + BA AC mapped
- [ ] BA spec + Acceptance Criteria completed: **pending** — expected `docs/specs/api/web-ui-threads.md` + AC (thread CRUD, compaction, token-budget)
- [ ] Priority confirmed: ✅ P1 (S3)
- [ ] Estimate ≤ 8: ✅ parent 21 groomed to 5/8/5/3 (each ≤ 8)
- [ ] No unresolved dependencies: ✅ depends on FEAT-00015 (DONE) + frozen `/v1/chat` (unchanged)
- [ ] Design approval obtained: **pending** — MC U-IDs + ADR (e.g. ADR-0010 client-side thread cache & compaction strategy) required before Sprint entry

**DoR verdict: ❌ (4/7 → NOT READY)** — IDs, priority, estimate, and dependency are set;
missing spec/AC, TDD/ADR design, and REQ link. Shall remain **BACKLOG** until `/ba`
writes the thread spec/AC and `/architect` produces a TDD + ADR, then **re-run DoR**
before moving to SPRINT BACKLOG.

## Registered via /pm registry

Parent **FEAT-00021** + sub-tasks **FEAT-00022..00025** added to the Registry
(2026-08-07). Next steps per Flow 1: `/think` + `/ba spec` (thread CRUD + compaction
AC) → `/architect design` (compaction strategy + ADR-0010) → DoR re-check → `/plan`.
