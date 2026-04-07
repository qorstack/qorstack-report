# Qorstack Report

Generate PDF and Excel reports dynamically from Word (DOCX) and Excel (XLSX) templates via REST API.  
Fully self-hostable — up and running in minutes with Docker Compose.

---

## Features

| Feature                                                    | Open Source | Enterprise |
| ---------------------------------------------------------- | :---------: | :--------: |
| DOCX templates → PDF / DOCX generation                     |     ✅      |     ✅     |
| XLSX templates → PDF / XLSX generation                     |    Soon     |    Soon    |
| Template management (CRUD, versioning, download)           |     ✅      |     ✅     |
| Font management (upload, sync)                             |     ✅      |     ✅     |
| Projects with RBAC (owner / admin / editor)                |     ✅      |     ✅     |
| Authentication (JWT, OAuth: Google / GitHub / GitLab, OTP) |     ✅      |     ✅     |
| API keys per project                                       |     ✅      |     ✅     |
| Analytics & generation history                             |     ✅      |     ✅     |
| PDF password protection                                    |      —      |     ✅     |
| PDF watermarking                                           |      —      |     ✅     |
| Project members and invitations                            |      —      |     ✅     |

---

## Template syntax

Both DOCX and XLSX templates use the same `{{variable}}` syntax.  
See the full reference at **[report.qorstack.com/docs](http://report.qorstack.com/docs)**.

---

## Self-Hosting

### Requirements

| Requirement    | Minimum |
| -------------- | ------- |
| Docker         | 24+     |
| Docker Compose | v2      |
| RAM            | 2 GB    |
| Disk           | 5 GB    |

---

### Quick Start

```bash
git clone https://github.com/qorstack/qorstack-report-opensource.git
cd qorstack-report-opensource
cp .env.example .env
```

Edit `.env` with your values, then:

```bash
docker compose up -d
```

> All images are pulled from Docker Hub automatically — no cloning or build step required.
>
> Self-host repository: [qorstack/qorstack-report-opensource](https://github.com/qorstack/qorstack-report-opensource)

---

### Using your own PostgreSQL or MinIO _(optional)_

If you already have a running PostgreSQL or MinIO, uncomment and set these variables in `.env`:

```env
DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=qorstack_report
DB_USER=postgres

MINIO_ENDPOINT=your-minio-host:9000
MINIO_USE_SSL=false
```

Then remove the corresponding service (`postgres` / `minio`) from `docker-compose.yml` so it is not started alongside.

---

### Custom fonts _(optional)_

Create a `fonts/` folder next to `docker-compose.yml` and place your `.ttf` or `.otf` files inside:

```bash
mkdir fonts
# copy your font files into fonts/
```

The following fonts are pre-installed and always available:  
TH Sarabun New, Angsana New, Cordia New, Browallia New.

---

### Access

Database migrations run automatically on first startup.

| Service       | URL                                            |
| ------------- | ---------------------------------------------- |
| Web app       | [http://localhost:3000](http://localhost:3000) |
| API           | [http://localhost:8080](http://localhost:8080) |
| MinIO console | [http://localhost:9001](http://localhost:9001) |

**First steps after setup:**

1. Open [http://localhost:3000](http://localhost:3000) and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env`
2. Create a project
3. Upload a DOCX template
4. Use the sandbox or API to generate a report

---

### Updating

```bash
docker compose pull
docker compose up -d
```

---

### Stopping

```bash
docker compose down        # keep data
docker compose down -v     # wipe all data
```

---

## Pro License _(optional)_

A Pro license unlocks **PDF password protection**, **PDF watermarking**, and **project member management**.

**1. Purchase** — contact [qorstack.com](https://qorstack.com) to get your `license.json` file.

**2. Place** `license.json` next to `docker-compose.yml`.

**3. Uncomment** the Pro lines in the `backend` service of your `docker-compose.yml`:

```yaml
environment:
  - Pro__LicenseFile=/app/license.json
volumes:
  - ./license.json:/app/license.json:ro
```

_(These lines are already in the file — just remove the `#` prefix.)_

**4. Restart** the backend:

```bash
docker compose restart backend
```

> The license is validated **fully offline** — no network call is ever made. Your instance keeps working even if qorstack.com is unreachable.

---

## Troubleshooting

### Container exits immediately

```bash
docker compose logs backend
```

Common causes: missing or incorrect `.env` values, database not ready yet.

### Fonts not showing in PDF output

```bash
docker compose restart backend
docker compose logs backend | grep -i font
```

### Migration errors

```bash
docker compose logs backend | grep "\[Database\]"
```

---

## Architecture

```text
Browser / SDK  ──▶  Nginx (:80/:443)
                        │
             ┌──────────┴──────────┐
             ▼                     ▼
        Frontend              Backend API
        Next.js 16            .NET 10
        :3000                 :8080
                                   │
              ┌────────────────────┼─────────────┐
              ▼                    ▼             ▼
         PostgreSQL            MinIO         Gotenberg
          :5432              :9000/9001        :3000
```

---

## Production deployment

For a production setup with a custom domain and HTTPS, place Nginx in front and update these values:

```yaml
# backend
- Cors__AllowedOriginsString=https://app.yourdomain.com

# frontend
- NEXT_PUBLIC_SERVICE=https://api.yourdomain.com
```

---

## Development (build from source)

> For contributors who want to modify or extend the application.

```bash
git clone https://github.com/qorstack/qorstack-report.git
cd qorstack-report
```

Start infrastructure (PostgreSQL, MinIO, Gotenberg):

```bash
docker compose -f docker-compose.infra.yml up -d
```

Run backend and frontend locally:

```bash
# Backend (.NET 10 SDK required)
cd backend && dotnet restore && dotnet run --project src/Web

# Frontend (Node 20+ and Yarn required) — new terminal
cd frontend && yarn install && yarn dev
```

---

## Tech stack

| Layer       | Technology                                             |
| ----------- | ------------------------------------------------------ |
| Frontend    | Next.js 16, React 19, TypeScript, Tailwind CSS, HeroUI |
| Backend     | C# .NET 10, ASP.NET Core, Entity Framework Core        |
| Database    | PostgreSQL 16                                          |
| Storage     | MinIO (S3-compatible)                                  |
| DOCX engine | Open XML SDK + custom template processor               |
| XLSX engine | ClosedXML                                              |
| PDF engine  | Gotenberg 8 (LibreOffice)                              |
| Auth        | JWT + OAuth (Google, GitHub, GitLab)                   |

---

## Documentation

| Document              | Link                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| API Reference         | [backend/API_SPECIFICATION.md](backend/API_SPECIFICATION.md)                                   |
| DOCX Template Guide   | [backend/documents/03_TEMPLATE-GUIDE.md](backend/documents/03_TEMPLATE-GUIDE.md)               |
| Excel Template Engine | [backend/documents/09_EXCEL-TEMPLATE-ENGINE.md](backend/documents/09_EXCEL-TEMPLATE-ENGINE.md) |
| SDK Usage             | [sdk/README.md](sdk/README.md)                                                                 |
