# API Specification — MCP Host Gateway

> Owner: BA | Last Updated: 2026-08-07
> Related Tasks: FEAT-00008 (HTTP/SSE Gateway)

## Modules

| Module | Endpoints | File |
|--------|-----------|------|
| Chat Gateway (v1) | `POST /v1/chat`, `GET /healthz` | [gateway.md](specs/api/gateway.md) |
| Web UI + Token Proxy (internal) | `POST /api/chat` (internal BFF proxy) | [web-ui.md](specs/api/web-ui.md) |

## Changelog

| Version | Date | Change |
|---------|------|--------|
| v1 | 2026-08-07 | Initial gateway contract (FEAT-00008) |
| v1.1 | 2026-08-07 | Add internal `POST /api/chat` BFF proxy module (FEAT-00015) |

## Related Documents

- `docs/business-logic.md` — gateway user stories + FEAT-00015 web UI rules (§12–14)
- `docs/tdd/FEAT-00008_gateway_tdd.md` — technical design and GW1..GW9
- `docs/tdd/FEAT-00015_nextjs_ui_proxy_tdd.md` — Next.js UI + BFF proxy design (U1..U9)
- `docs/specs/api/ac/FEAT-00015.md` — Gherkin acceptance criteria (AC-1..AC-10)
- `docs/adr/ADR-0002-http-sse-transport.md` … `ADR-0006-agent-observation-seam.md`, `ADR-0007..0009` (web)