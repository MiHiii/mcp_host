# Brainstorm — FEAT-00015: Next.js UI + token proxy

**Phase:** `/think` (Clarify) — Flow 1 "New Feature"
**Task ID:** FEAT-00015
**Date:** 2026-08-07
**Status:** Clarified → Design done (TDD + ADRs 0007–0009) → next: `/ba spec`

## Goal

Deliver a browser UI that lets a user chat with the MCP-powered agent through the
authenticated `POST /v1/chat` SSE endpoint, plus a server-side token proxy so the
`GATEWAY_API_TOKEN` never reaches the browser bundle (ADR-00004).

## Constraints

- Gemini token / `Authorization` header must **never** appear in the browser bundle.
- Must consume the **frozen** FEAT-00008 contract (`start → stream* → final|error`, `id:`);
  no contract changes.
- `cmd/server`, `internal/agent`, `internal/server` remain unchanged; UI is **additive**.
- No user model / auth on the UI itself in MVP.

## Decisions (user-locked 2026-08-07)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Repo layout | **`web/` subdir inside this monorepo** (Next.js) |
| 2 | UI scope MVP | **Chat thread + tool-interaction + error display** |
| 3 | SSE consumption | **Proxy via Next.js route handler (fetch-stream)**; browser `EventSource` NOT used (cannot POST body) |
| 4 | UI auth | **Open access** (anyone reaching the app can chat; token lives only on the Go gateway + Next.js server) |

## Risks

- **Token leakage** into client bundle → STRIDE review at QC.
- **SSE buffering** by dev server / proxies → use `ReadableStream` passthrough, `Cache-Control: no-cache`.
- **Toolchain burden** — new Node deps, `package.json`/lockfile, TS build; existing `go build`/`go vet` gates don't cover it (add a JS/TS gate in CI).
- **Scope creep** — MVP must stay: single chat thread + tool/error visibility only.

## Acceptance criteria (draft, to be finalized by BA)

- UI: user enters prompt, sees live SSE stream, final answer, tool events, and streamed errors.
- Token never in bundle (STRIDE-verified).
- Gateway contract unchanged; works against existing `POST /v1/chat`.

## Architecture design required?

**Yes.** Per GEMINI.md Core Commandment 6 ("≥3 tables **hoặc ≥2 layers**"), this feature
spans ≥2 layers (`web/` Next.js UI → server-side proxy route → Go gateway). Durable
decisions (BFF proxy pattern, SSE relay, TS toolchain in a Go repo, CI gate) warrant a
TDD + ADR from `/architect` before any `/plan`.

## Recommendation

**Approved.** Design delivered 2026-08-07:
- TDD: `docs/tdd/FEAT-00015_nextjs_ui_proxy_tdd.md` (U1–U9)
- ADR-0007 Next.js web workspace, ADR-0008 BFF fetch-stream SSE proxy,
  ADR-0009 `web/` CI gate.

Next per Flow 1: `/ba spec` + `/ba ac FEAT-00015` (Specify phase). No code until `/plan` APPROVED.