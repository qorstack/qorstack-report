# =============================================================================
# Qorstack Report — Makefile
# =============================================================================

.PHONY: help \
        backend frontend \
        infra-up infra-down infra-logs env-check prod-local prod-local-down \
        up down logs verify init \
        test build \
        docker-build docker-push docker-release \
        docker-buildx \
        migration

# Default target
IMAGE_APP  ?= myregistry/report
IMAGE_TAG  ?= latest

# Target platforms for multi-arch (buildx) publishing — amd64 (Intel) + arm64 (Apple Silicon)
PLATFORMS  ?= linux/amd64,linux/arm64

help:
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "  Development (one .env at the repo root: cp .env.dev.example .env)"
	@echo "    dev              Backend (:5000) + web (:3000) together - open http://localhost:3000"
	@echo "    backend          Run backend only (dotnet watch)"
	@echo "    frontend         Run web only (next dev, proxies /api)"
	@echo "    infra-up         Start postgres / RustFS / Gotenberg for dev (ports on localhost)"
	@echo "    infra-down       Stop them"
	@echo "    infra-logs       Tail their logs"
	@echo "    prod-local       Build the image and run the full stack on :8080 (production-like)"
	@echo "    prod-local-down  Stop it"
	@echo ""
	@echo "  Selfhost"
	@echo "    up               Start selfhost stack"
	@echo "    down             Stop selfhost stack"
	@echo "    logs             Tail selfhost logs"
	@echo ""
	@echo "  Build & push your own images (fork workflow)"
	@echo "    docker-build     Build the app image (web UI + API)"
	@echo "    docker-push      Push images to your registry"
	@echo "    docker-release   Build + push in one step (single-arch, host platform only)"
	@echo "    Override: make docker-build IMAGE_APP=myrepo/report IMAGE_TAG=v2"
	@echo ""
	@echo "  Multi-arch publish (amd64 + arm64 / Apple Silicon, requires buildx)"
	@echo "    docker-buildx    Build + push multi-arch images in one step"
	@echo "    Override: make docker-buildx IMAGE_APP=myrepo/report IMAGE_TAG=v2"
	@echo ""
	@echo "  Other"
	@echo "    init             Generate selfhost/.env with random secrets"
	@echo "    test             Run all backend tests"
	@echo "    build            Build backend + frontend"
	@echo "    verify           Smoke-test a running stack (API /health + web)"
	@echo "    migration name=<Name>  Add EF Core migration"
	@echo ""

# -----------------------------------------------------------------------------
# Development — one .env at the repo root (cp .env.dev.example .env)
# -----------------------------------------------------------------------------

# Infra for local dev: the selfhost compose + an override that publishes the ports to localhost.
DEV_COMPOSE    = docker compose -f selfhost/docker-compose.yml -f selfhost/docker-compose.dev.yml --env-file .env
INFRA_SERVICES = postgres rustfs font-syncer gotenberg
# Production-like local run: the real image on :8080 (containers reach each other by name).
PROD_LOCAL     = DB_HOST=qorstack-postgres DB_PORT=5432 STORAGE_ENDPOINT=qorstack-storage:9000 \
                 PUBLIC_URL=http://localhost:8080 REPORT_TAG=local \
                 docker compose -f selfhost/docker-compose.yml --env-file .env

env-check:
	@test -f .env || { echo "No .env at the repo root. Run: cp .env.dev.example .env"; exit 1; }

# Backend (:5000) + web dev server (:3000, proxies /api) in one terminal. Ctrl+C stops both.
dev: env-check
	@echo ""
	@echo "  backend  http://localhost:5000   (dotnet watch)"
	@echo "  web      http://localhost:3000   <- open this (next dev, /api proxied to the backend)"
	@echo ""
	@trap 'kill 0' INT TERM EXIT; \
	  "$(MAKE)" --no-print-directory backend & \
	  "$(MAKE)" --no-print-directory frontend & \
	  wait

backend:
	cd backend && dotnet watch --project src/Web/Web.csproj

frontend:
	cd frontend && pnpm dev

be api dotnet: backend
fe web: frontend

# -----------------------------------------------------------------------------
# Local infrastructure (postgres / RustFS / Gotenberg) for `make dev`
# Skip this if DB_* / STORAGE_* / GOTENBERG_URL in .env point at your own servers.
# -----------------------------------------------------------------------------

infra-up: env-check
	$(DEV_COMPOSE) up -d $(INFRA_SERVICES)
	@echo "postgres :5432 · RustFS :9000 (console :9001) · Gotenberg :3001"

infra-down:
	$(DEV_COMPOSE) stop $(INFRA_SERVICES)

infra-logs:
	$(DEV_COMPOSE) logs -f $(INFRA_SERVICES)

# Build the real image and run the full stack exactly like a deploy (web + API on :8080).
prod-local: env-check
	docker build -t qorstack/report:local .
	$(PROD_LOCAL) up -d
	@echo "→ http://localhost:8080"

prod-local-down:
	$(PROD_LOCAL) down

# -----------------------------------------------------------------------------
# Docker full stack
# -----------------------------------------------------------------------------

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

# -----------------------------------------------------------------------------
# Backend — test & build
# -----------------------------------------------------------------------------

test:
	cd backend && dotnet test

build:
	cd backend && dotnet build
	cd frontend && pnpm build

# -----------------------------------------------------------------------------
# Docker — ONE image: web UI + API (root Dockerfile)
# Override: make docker-build IMAGE_APP=myrepo/report IMAGE_TAG=v2
# -----------------------------------------------------------------------------

docker-build:
	docker build -t $(IMAGE_APP):$(IMAGE_TAG) -f Dockerfile .

docker-push:
	docker push $(IMAGE_APP):$(IMAGE_TAG)
ifneq ($(IMAGE_TAG),latest)
	docker tag $(IMAGE_APP):$(IMAGE_TAG) $(IMAGE_APP):latest
	docker push $(IMAGE_APP):latest
endif

docker-release: docker-build docker-push

# Multi-arch (amd64 + arm64). Requires a buildx builder:  docker buildx create --use
docker-buildx:
	docker buildx build --platform $(PLATFORMS) 		-t $(IMAGE_APP):$(IMAGE_TAG) $(if $(filter-out latest,$(IMAGE_TAG)),-t $(IMAGE_APP):latest) 		-f Dockerfile --push .

# -----------------------------------------------------------------------------
# Verify — smoke-test a running stack (API /health + web UI)
# Override host: make verify APP_URL=http://host:8080
# -----------------------------------------------------------------------------

verify:
	@bash selfhost/verify.sh

# -----------------------------------------------------------------------------
# Init — generate selfhost/.env with secure random secrets
# -----------------------------------------------------------------------------

init:
	@bash selfhost/init.sh

# -----------------------------------------------------------------------------
# EF Core migration
# Usage: make migration name=AddUserTable
# -----------------------------------------------------------------------------

migration:
	@if [ -z "$(name)" ]; then echo "Usage: make migration name=<MigrationName>"; exit 1; fi
	cd backend && dotnet ef migrations add $(name) \
		--project src/Infrastructure \
		--startup-project src/Web
