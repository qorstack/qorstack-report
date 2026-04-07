# =============================================================================
# Qorstack Report — Makefile
# =============================================================================

.PHONY: help \
        backend frontend \
        infra-up infra-down infra-logs \
        up down logs \
        test build \
        migration

# Default target
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
	@echo "  Docker (full stack)"
	@echo "    up               Start all services (docker compose)"
	@echo "    down             Stop all services"
	@echo "    logs             Tail all logs"
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
	cd frontend && yarn dev

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
	cd frontend && yarn build

# -----------------------------------------------------------------------------
# EF Core migration
# Usage: make migration name=AddUserTable
# -----------------------------------------------------------------------------

migration:
	@if [ -z "$(name)" ]; then echo "Usage: make migration name=<MigrationName>"; exit 1; fi
	cd backend && dotnet ef migrations add $(name) \
		--project src/Infrastructure \
		--startup-project src/Web
