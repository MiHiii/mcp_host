# Code Review — FEAT-00015 (Next.js UI + server-side token proxy)

**Workflow:** `/dev review` (Flow 1 — Review phase, pre-QC self-review)
**Date:** 2026-08-07
**Branch:** `feature/FEAT-00015-nextjs-ui-token-proxy`
**Scope:** `web/` workspace (additive) + docs/ADRs. Go tree untouched (verified: `git diff --stat HEAD -- go.mod cmd internal` empty).

## Review Checklist (SKILL_DEV §6 + SKILL_QC §2 + rules/)

### Correctness
- [x] Logic matches BA spec `docs/specs/api/web-ui.md` + AC-1..AC-10 + TDD U1–U9 (cross-referenced during audit).
- [x] Edge cases handled: whitespace-only prompt → 422 (AC-8), empty → 400, oversized body → 400 (byte-cap before parse, route.ts:15-18), non-JSON → 400, non-string prompt → 400.
- [x] Error handling: structured `{ error: { code, message } }` envelopes; upstream non-200 forwarded with status + sanitized body (route.ts:66-78); upstream AbortError → 499 (route.ts:60-62); network failure → 502 BAD_GATEWAY; `Cache-Control: no-store` on errors (jsonError).
- [x] Streaming: verbatim `ReadableStream` relay, never `.json()`/`.text()` on 200 (route.ts:81, AC-6/U-5); `Cache-Control: no-cache`, `X-Accel-Buffering: no`, `text/event-stream` (STREAM_HEADERS).
- [x] Abort: `signal: request.signal` forwarded upstream (route.ts:57, AC-5/U-6); client abort propagates (tested).
- [x] SSE parser: byte-buffer decode via `TextDecoder(stream:true)`, split on `\n\n`, trailing flush (parse.ts); handles CRLF, multi-byte boundaries, partial frames, keepalive `id` frames (tests).

### Security (STRIDE)
- [x] **Spoofing/Info Disclosure**: token never in client bundle — server-only route.ts; `audit:token` PASS; manual Select-String over `.next/static` clean; only server chunks hold the env reference (U-2/AC-2). `loadProxyConfig` rejects placeholder token (proxy.ts:13).
- [x] **Tampering/Validation**: prompt validated server-side before upstream call; 1MB body cap both by Content-Length header and byteLength after read (defense in depth).
- [x] **Repudiation/Elevation**: no auth added to UI (out of scope per AC "Out of Scope"); gateway Bearer auth added only server-side.
- [x] **DoS**: body-size cap; gateway-side MAX_CONCURRENT governs concurrency (unchanged); no unbounded client-side buffering (SSE incremental).
- [x] **CORS**: same-origin only (UI + `/api/chat` same Next.js app) — no CORS config needed (AC-7/U-9). No `Access-Control-Allow-Origin: *` anywhere.
- [x] Secrets: `.env` git-ignored; `.env.example` placeholders only; no hardcoded tokens.

### Testing
- [x] 37 tests / 4 files, all PASS: proxy 14 (config/validation boundaries), parse 10 (SSE framing edge cases), route 8 (envelope/status/passthrough/headers/abort ×2), components 5 (render).
- [x] New API route has integration test (route.test.ts) — passthrough asserts exact body equality + headers.
- [x] Assertions meaningful (exact equality, status codes, signal identity), not just not-null.
- [x] Boundary cases: 1MB limit exactly, 1MB+1, whitespace, empty, CRLF, multi-byte split.
- [ ] Coverage % not measured locally: `@vitest/coverage-v8` not installed (not in plan gate list; gate = typecheck/lint/test/build/audit:token). **Minor** — recommend adding coverage to the CI gate when DEVOPS-00001 is wired.

### Performance
- [x] No N+1 / DB (no DB).
- [x] Streaming passthrough — no buffering, no `.text()` on stream (U-5).
- [x] External call has timeout via client AbortController + gateway-side timeouts (unchanged); fetch has `req.signal` (no orphaned calls on abort).
- [x] Server Components used where possible; only ChatThread (client) + hook carry client JS; small bundle (single chat page).

### Style & Maintainability
- [x] `npm run lint` clean (Next core-web-vitals + TS), `tsc --noEmit` clean, `prettier` formatting.
- [x] No `any` types (strict TS; `unknown` + narrowing used); explicit return types on async fns.
- [x] Naming: PascalCase components, camelCase hooks/lib, SCREAMING_SNAKE consts; files ≤ 300 lines, fns ≤ 50 lines.
- [x] No `console.log`/dead code; `ERROR_COPY` constants extracted (types.ts:29); `STREAM_HEADERS` const; magic numbers (1MB) named.
- [x] Docs: web/README.md (run/verify/security), ADRs 0007–0009, TDD, AC spec.

## Findings by Severity

### 🔴 Blockers
- None.

### 🟠 Majors
- None.

### 🟡 Minors
1. **[Minor] Coverage tooling not wired**: `@vitest/coverage-v8` absent, so coverage % is not part of the committed gate. Not a plan deviation (gate = typecheck/lint/test/build/audit:token per plan Step 2 + ADR-0009), but QC §2.B targets (≥80% service logic) can't be demonstrated mechanically yet. Track as DEVOPS-00001 follow-up (CI quality gates) + add `--coverage` once provider installed.
2. **[Minor] Error copy for upstream `CANCELLED` on abort**: client maps `AbortError` → "Request cancelled." (useChatStream.ts:82) and sets status `idle`; a user-initiated reset also triggers this path — consistent and acceptable, but note that `ERROR_COPY.CANCELLED` ("The request was cancelled.") is only used for in-stream error events, not the client abort path. Cosmetic duplication of copy; no behavioral issue.

### ⚪ Nits
1. **[Nit] `EventTiles` keyed by index** (ChatThread.tsx:80-88): fine for append-only list; React key stability is acceptable here (no reorder). Could use event counter, not required.
2. **[Nit] `streamText` recomputed per render** via `events.reduce` (ChatThread.tsx:15-18): O(n) per render; n is small (stream events). Could memoize with `useMemo`; not required at this scale.
3. **[Nit] `jsonError` lacks `trace_id`** (route.ts:84-88): envelope is `{ error: { code, message } }` per web-ui spec (no trace_id in UI contract); consistent with spec, so acceptable.

## ✅ Summary

- **Blockers:** 0 | **Majors:** 0 | **Minors:** 2 (non-blocking) | **Nits:** 3
- **Overall: APPROVED** — implementation matches BA spec (AC-1..AC-10) and TDD (U1–U9); gates green (Go + web + audit:token); Go tree untouched.
- **Next actions:**
  1. `/qc audit FEAT-00015` → formal audit.
  2. `/qc sign-off FEAT-00015` → QC column ✅, status → DONE.
  3. `/finish FEAT-00015` → finish.md + Registry update.
  4. Follow-up: DEVOPS-00001 (CI wiring incl. coverage) + TEST ID registration in Registry for manual E2E scenarios.

---

# QC Audit — FEAT-00015

**Workflow:** `/qc audit FEAT-00015` (Flow 1 — Audit phase) | **Date:** 2026-08-07
**Method:** SKILL_QC §1 audit layers + §2 quality gate + §3 STRIDE + §5 spec/TDD compliance.

## Audit Layers

### 1. Spec Compliance — ✅
- BA AC-1..AC-10 all satisfied (evidence in `tests/REPORTS.md` FEAT-00015 entry + this review):
  - AC-1 happy path: live E2E `curl -N POST /api/chat` → `event: start` → `event: final` ✅
  - AC-2 token never in browser: `audit:token` PASS + manual Select-String over `.next/static` clean ✅
  - AC-3/AC-4 error paths: in-stream `error` → banner via `ERROR_COPY`; pre-stream non-200 forwarded with status + sanitized envelope (route.test.ts:67-80) ✅
  - AC-5 abort: `req.signal` forwarded + 2 abort tests (499 + propagation) ✅
  - AC-6 passthrough: verbatim `ReadableStream`, headers asserted (route.test.ts:82-97) ✅
  - AC-7 same-origin: no CORS config anywhere (verified grep) ✅
  - AC-8 validation boundaries: 400/422/1MB caps all tested ✅
  - AC-9 Go tree untouched: `git diff --stat HEAD -- go.mod cmd internal` empty; Go gates green ✅
  - AC-10 web gate: typecheck/lint/test/build/audit:token all green ✅
- Architect TDD U1–U9: all map 1:1 to the checks above (cross-ref in REPORTS.md).

### 2. Code Quality — ✅
- Layers: server route (`app/api/chat/route.ts`) → pure lib (`lib/proxy.ts`, `lib/chat/parse.ts`) → client hook (`hooks/useChatStream.ts`) → dumb components (`components/*`). No cross-layer imports; strict TS, no `any`.
- Functions ≤ 50 lines, files ≤ 300 lines; constants extracted (`STREAM_HEADERS`, `MAX_PROMPT_BYTES`, `ERROR_COPY`).
- `npm run lint` + `tsc --noEmit` clean (verified).

### 3. Testing Audit — ✅
- 37 tests / 4 files all PASS: proxy 14, parse 10, route 8, components 5.
- Positive/negative/boundary ≥ 3 per function for validation; SSE framing edge cases (CRLF, multi-byte split, partial frames, keepalive).
- New API route has integration test asserting exact passthrough bytes + headers + signal identity.
- Coverage % not mechanically measured (Minor — `@vitest/coverage-v8` not in gate; DEVOPS-00001 follow-up).

### 4. Security Audit (STRIDE) — ✅
- **Spoofing**: no identity surface in UI (out of scope); gateway Bearer auth server-side only.
- **Tampering**: prompt validated + 1MB body cap (Content-Length pre-check + byteLength post-check); upstream envelope sanitized (only `code`/`message` forwarded, route.ts:66-78).
- **Repudiation**: no audit-trail requirement in scope; gateway unchanged.
- **Info Disclosure**: token absent from client bundle (audit:token + manual grep); `loadProxyConfig` rejects placeholder token; `.env` git-ignored; no `NEXT_PUBLIC_*`.
- **DoS**: body caps; no unbounded buffering (SSE incremental); gateway MAX_CONCURRENT governs (unchanged).
- **Elevation**: no RBAC in scope (open-access UI per AC Out-of-Scope).
- CORS: none configured (same-origin only, AC-7) — no wildcard. Dependencies: `npm install` baseline recorded; no CVEs flagged in plan risk review.

### 5. Performance — ✅
- Passthrough streaming (no buffering, U-5); Server Components where possible; small single-page bundle; no DB/N+1; external call tied to client AbortController + gateway timeouts.

### 6. Cross-Reference — ✅
- Code = Spec (AC-1..10) = TDD (U1–9) = Test (37) = Registry (FEAT-00015 + sub-tasks FEAT-00016..00020) consistent.

## QC Decision

## ✅ QC APPROVED — FEAT-00015

### Audit Summary
- Spec Match:    ✅ 100% aligned with BA spec (AC-1..AC-10) + Architect TDD (U1–U9)
- Code Quality:  ✅ Clean, layered, strict TS, meets style rules (lint + tsc clean)
- Testing:       ✅ 37/37 unit + live E2E (start→final), error/abort/validation boundaries covered (coverage % = follow-up DEVOPS-00001)
- Security:      ✅ STRIDE checked; no token leak (audit:token PASS), no CORS, input caps enforced
- Performance:   ✅ Verbatim stream relay, no buffering, small bundle
- Cross-Ref:     ✅ Code = Spec = Test = Registry consistent

### Non-blocking findings (tracked, not merge-blocking)
- [Minor] Coverage % not wired into gate (DEVOPS-00001).
- [Minor] Client-abort copy duplicates `ERROR_COPY.CANCELLED` (cosmetic).
- [Nits] Key-by-index, O(n) reduce, no `trace_id` in error envelope (spec-conformant).

### Registry Update
- DEV: ✅ (was ⬜ — verified: build + tests + branch)
- TEST: ✅ (was ⬜ — verified: 37/37 + live E2E + REPORTS.md entry)
- QC: ✅
- Status: → **DONE**
