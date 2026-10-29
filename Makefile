# MCP Host — build/run tasks for Backend (Go) and Frontend (Next.js).
# Works under MSYS2/git-bash make (Windows) or GNU make (Linux/macOS).
# `make` itself is not bundled with Windows; install e.g. `winget install Gnu.Make`.

.PHONY: help install build server gateway run gateway-run dev build-web web-lint web-test test vet ci-build clean

help:
	@echo "MCP Host targets:"
	@echo "  make install       install FE deps (cd web && npm install)"
	@echo "  make build         compile Go binaries -> bin/ (server + gateway)"
	@echo "  make server        build ./cmd/server -> bin/server.exe"
	@echo "  make gateway       build ./cmd/gateway -> bin/gateway.exe"
	@echo "  make run           run CLI agent (go run ./cmd/server)"
	@echo "  make gateway-run   run HTTP/SSE gateway on :8080 (BE)"
	@echo "  make dev           run Next.js web UI on :3000 (FE)"
	@echo "  make build-web     Next.js production build (FE)"
	@echo "  make web-lint      eslint + typecheck (FE)"
	@echo "  make web-test      vitest run (FE)"
	@echo "  make test          Go vet + go test ./... (BE)"
	@echo "  make ci-build      run all quality gates"
	@echo "  make clean         remove build output and web/.next"

# ---- Backend (Go) ----
build: server gateway

server:
	go build -o bin/server.exe ./cmd/server

gateway:
	go build -o bin/gateway.exe ./cmd/gateway

run:
	go run ./cmd/server

gateway-run: gateway
	bin/gateway.exe

test: vet
	go test ./...

vet:
	go vet ./...

# ---- Frontend (Next.js) ----
install:
	cd web && npm install

dev:
	cd web && npm run dev

build-web:
	cd web && npm run build

web-lint:
	cd web && npm run lint && npm run typecheck

web-test:
	cd web && npm run test

# ---- CI (all gates) ----
ci-build: vet test web-lint web-test build-web

# ---- Cleanup ----
clean:
	rm -rf bin
	rm -rf web/.next
	rm -rf web/node_modules
