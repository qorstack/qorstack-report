# =============================================================================
# Qorstack Report — Makefile
# =============================================================================

.PHONY: help \
        backend frontend \
        infra-up infra-down infra-logs \
        up down logs \
        test build \
        docker-build docker-push docker-release \
        migration

# Default target
IMAGE_API  ?= myregistry/report-api
IMAGE_WEB  ?= myregistry/report-web
IMAGE_TAG  ?= latest

help:
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "  Development"
	@echo "    backend          Run backend (dotnet watch)"
	@echo "    frontend         Run frontend (next dev)"
	@echo ""
	@echo "  Infrastructure (postgres / minio / gotenberg)"
	@echo "    infra-up         Start infra services"
	@echo "    infra-down       Stop infra services"
	@echo "    infra-logs       Tail infra logs"
	@echo ""
	@echo "  Selfhost"
	@echo "    up               Start selfhost stack"
	@echo "    down             Stop selfhost stack"
	@echo "    logs             Tail selfhost logs"
	@echo ""
	@echo "  Build & push your own images (fork workflow)"
	@echo "    docker-build     Build backend + frontend images"
	@echo "    docker-push      Push images to your registry"
	@echo "    docker-release   Build + push in one step"
	@echo "    Override: make docker-build IMAGE_API=myrepo/api IMAGE_WEB=myrepo/web IMAGE_TAG=v1"
	@echo ""
	@echo "  Other"
	@echo "    test             Run all backend tests"
	@echo "    build            Build backend + frontend"
	@echo "    migration name=<Name>  Add EF Core migration"
	@echo ""

# -----------------------------------------------------------------------------
# Development
# -----------------------------------------------------------------------------

backend:
	cd backend && dotnet watch --project src/Web/Web.csproj

frontend:
	cd frontend && pnpm dev

# -----------------------------------------------------------------------------
# Infrastructure
# -----------------------------------------------------------------------------

infra-up:
	docker compose -f docker-compose.infra.yml up -d

infra-down:
	docker compose -f docker-compose.infra.yml down

infra-logs:
	docker compose -f docker-compose.infra.yml logs -f

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
# Docker — build, push, release (fork workflow)
# Override: make docker-build IMAGE_API=myrepo/api IMAGE_WEB=myrepo/web IMAGE_TAG=v1
# -----------------------------------------------------------------------------

docker-build: docker-build-api docker-build-web

docker-build-api:
	docker build -t $(IMAGE_API):$(IMAGE_TAG) -f backend/Dockerfile .

docker-build-web:
	docker build -t $(IMAGE_WEB):$(IMAGE_TAG) frontend/

docker-push: docker-push-api docker-push-web

docker-push-api:
	docker push $(IMAGE_API):$(IMAGE_TAG)
ifneq ($(IMAGE_TAG),latest)
	docker tag $(IMAGE_API):$(IMAGE_TAG) $(IMAGE_API):latest
	docker push $(IMAGE_API):latest
endif

docker-push-web:
	docker push $(IMAGE_WEB):$(IMAGE_TAG)
ifneq ($(IMAGE_TAG),latest)
	docker tag $(IMAGE_WEB):$(IMAGE_TAG) $(IMAGE_WEB):latest
	docker push $(IMAGE_WEB):latest
endif

docker-release: docker-build docker-push

# -----------------------------------------------------------------------------
# EF Core migration
# Usage: make migration name=AddUserTable
# -----------------------------------------------------------------------------

migration:
	@if [ -z "$(name)" ]; then echo "Usage: make migration name=<MigrationName>"; exit 1; fi
	cd backend && dotnet ef migrations add $(name) \
		--project src/Infrastructure \
		--startup-project src/Web
