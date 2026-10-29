# ADR-00009: Dedicated CI Gate for the `web/` Workspace

- **Status:** Proposed
- **Date:** 2026-08-07
- **Decision:** Architect (Flow 1 Design — FEAT-00015)
- **Related feature:** FEAT-00015 (Next.js UI + token proxy)

## Context

- The existing CI enforces Go-only gates (`go test ./...`, `go vet ./...`,
  coverage). Adding a TypeScript/Next.js workspace (`ADR-00007`) means new code that
  the existing gates ignore. Quality rules (`rules/testing.md`, `rules/git-workflow.md`
  §5) mandate blocking checks before merge; a silent-ignore zone would ship untyped
  or lint-broken frontend code.
- A token-absence guarantee in build output is a hard security requirement
  (`ADR-00008`, `rules/security.md`).

## Decision

- Add a **`web/` CI gate** that is **blocking** (merge is allowed only when green),
  mirroring the Go gates.
- The gate runs from the `web/` directory: `npm run lint`, `npm run typecheck`,
  `npm run test`, `npm run build`.
- Add a **token-absence audit step**: search the `web/` build output (`.next/`,
  source maps, SSR HTML) for a token-like/`GATEWAY_TOKEN` value and **fail** if
  found.
- The Go gates stay and remain green (`U7`): `web/` must not degrade them.

## Consequences

### Positive

- Frontend contributions are safe (type + lint + build) and the token-leak class is
  mechanically prevented before QC.
- Single place a frontend dev can see everything: gate + tests in one CI.

### Negative

- CI runtime grows (Node install + build). Trade-off accepted; the build is small.
- Requires a Node runner in CI (add to the pipeline tooling).

### Neutral

- The token-audit is a heuristics check; belt-and-braces with a manual/QC STRIDE
  review of the client bundle. This ADR is the automated layer.

## Alternatives Considered

1. **Fold TS checks into the Go CI step** — a hack (cross-tool mixes concerns,
   single signal on failure); rejected.
2. **Rely on pre-commit hooks only** — can be bypassed; not blocking; rejected.
3. **No token audit** — security tooling must be explicit; rejected.

## References

- `docs/adr/ADR-0007-nextjs-web-workspace.md`, `ADR-0008-bff-fetch-stream-sse-proxy.md`
- `rules/git-workflow.md` §5 (CI), `rules/testing.md`, `rules/security.md`