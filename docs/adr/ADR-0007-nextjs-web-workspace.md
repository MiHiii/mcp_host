# ADR-00007: Next.js TypeScript Workspace in the Go Monorepo

- **Status:** Proposed
- **Date:** 2026-08-07
- **Decision makers:** Architect (Flow 1 Design — FEAT-00015)
- **Related feature:** FEAT-00015 (Next.js UI + token proxy)

## Context

The project is a Go monorepo (`cmd/`, `internal/`) with `go build`/`go vet`/`go test`
quality gates. The gateway (`FEAT-00008`) streams `POST /v1/chat` as SSE but a
browser cannot consume it directly (no `Authorization` header in `EventSource`,
`ADR-00002/0004`). We need a browser UI. This introduces a TypeScript/React
frontend — a second language + toolchain into a Go repository, which the existing
CI gates do not cover. The decision of *where* the UI lives and how its build is
gated is durable.

## Decision

Adopt a **`web/` subdirectory** inside this monorepo as a self-contained Next.js
(App Router) TypeScript workspace, isolated from the Go tree:

- `web/` owns its own `package.json`, `package-lock.json`, `tsconfig.json`
  (`strict: true`), `next.config.mjs`, ESLint, and Prettier. It does **not** modify
  any Go `go.mod`/`internal/`/`cmd/` code.
- `tsconfig` uses `strict: true`; no `any` (per `rules/code-style.md` Part B).
- Runs on Node v24 / npm 11 (present in the repo environment).

## Consequences

### Positive

- No coupling to the Go build; `go build/vet/test` and the TS build avoid each other.
- App Router gives us a server runtime for the token proxy and route handlers for
  free (a BFF pattern) — the browser never sees the token.
- Single lockfile makes dependencies reproducible; ESLint/Prettier/TS strict match
  the project's quality bar from day one.

### Negative

- A second toolchain and dependency set to secure/maintain; the Go CI gates do not
  cover it, so a dedicated `web/` gate is required (ADR-00009).
- Slightly larger checkout and slower local `npm install`.

### Neutral

- Framework may be swapped later (Vite/SPA) without touching Go; the proxy is the
  contract boundary. `ADR-00008`.

## Alternatives Considered

1. **Separate sibling repo for the UI** — cleaner isolation but loses monorepo
   cohesion, cross-repo CI, and atomic PRs with the gateway contract. Rejected.
2. **Vite + React SPA pointing straight at the gateway** — needs CORS + token in
   client (leak) or a separate proxy; both add infra. Rejected for MVP.
3. **No UI / CLI only** — the browser requirement explicitly wants a UI. Rejected.

## References

- `docs/tdd/FEAT-00008_gateway_tdd.md`, `docs/specs/api/gateway.md`
- `docs/adr/ADR-0008-bff-fetch-stream-sse-proxy` (companion BFF decision)
- `rules/code-style.md` Part B, `rules/security.md`