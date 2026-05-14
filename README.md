# Qorstack Report

Generate PDF and Excel reports from DOCX and XLSX templates through a REST API.
Qorstack Report is self-hostable with Docker Compose and runs with PostgreSQL,
MinIO, and Gotenberg.

---

## Quick Start

The self-host setup lives in `selfhost/`. It includes PostgreSQL, MinIO,
font-syncer, Gotenberg, backend, and frontend in one Docker Compose file.

### Requirements

| Requirement    | Minimum |
| -------------- | ------- |
| Docker         | 24+     |
| Docker Compose | v2      |
| RAM            | 2 GB    |
| Disk           | 5 GB    |

### Run it

```bash
git clone https://github.com/qorstack/qorstack-report.git
cd qorstack-report/selfhost
cp .env.example .env
docker compose up -d
```

Open:

| Service       | URL                                            |
| ------------- | ---------------------------------------------- |
| Web UI        | [http://localhost:3000](http://localhost:3000) |
| API           | [http://localhost:8080](http://localhost:8080) |
| MinIO console | [http://localhost:9001](http://localhost:9001) |

Sign in with the default admin account: `admin` / `admin`.

See [selfhost/README.md](selfhost/README.md) for the full guide: production
secrets, access from another machine, external PostgreSQL/MinIO, Pro license
activation, updating, stopping, and troubleshooting.

---

## Features

| Feature                                 | Open Source | Pro |
| --------------------------------------- | :---------: | :-: |
| DOCX templates to PDF / DOCX generation |     ✅      | ✅  |
| XLSX templates to XLSX / PDF generation |     ✅      | ✅  |
| Template management                     |     ✅      | ✅  |
| Font management and sync                |     ✅      | ✅  |
| Projects with RBAC                      |     ✅      | ✅  |
| Authentication                          |     ✅      | ✅  |
| API keys per project                    |     ✅      | ✅  |
| Analytics and generation history        |     ✅      | ✅  |
| PDF password protection                 |     ⛔      | ✅  |
| PDF watermarking                        |     ⛔      | ✅  |
| Live Preview auto-render                |     ⛔      | ✅  |
| Project members and invitations         |     ⛔      | ✅  |

---

## Template Syntax

DOCX and XLSX templates use the same `{{variable}}` syntax.
See the full reference at [report.qorstack.com/docs](http://report.qorstack.com/docs).

---

## Documentation

| Document              | Link                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| API Reference         | [backend/API_SPECIFICATION.md](backend/API_SPECIFICATION.md)                                   |
| DOCX Template Guide   | [backend/documents/03_TEMPLATE-GUIDE.md](backend/documents/03_TEMPLATE-GUIDE.md)               |
| Excel Template Engine | [backend/documents/09_EXCEL-TEMPLATE-ENGINE.md](backend/documents/09_EXCEL-TEMPLATE-ENGINE.md) |
| SDK Usage             | [sdk/README.md](sdk/README.md)                                                                 |

---

## Tech Stack

| Layer       | Technology                                             |
| ----------- | ------------------------------------------------------ |
| Frontend    | Next.js 16, React 19, TypeScript, Tailwind CSS, HeroUI |
| Backend     | C# .NET 10, ASP.NET Core, Entity Framework Core        |
| Database    | PostgreSQL 16                                          |
| Storage     | MinIO                                                  |
| DOCX engine | Open XML SDK and custom template processor             |
| XLSX engine | ClosedXML                                              |
| PDF engine  | Gotenberg 8                                            |
| Auth        | JWT and OAuth                                          |

---

## Development

For contributors who want to modify the application:

```bash
git clone https://github.com/qorstack/qorstack-report.git
cd qorstack-report
```

Start infrastructure:

```bash
docker compose -f docker-compose.infra.yml up -d
```

Run backend and frontend locally:

```bash
cd backend
dotnet restore
dotnet run --project src/Web
```

```bash
cd frontend
pnpm install
pnpm dev
```
