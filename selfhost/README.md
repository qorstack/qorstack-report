# Qorstack Report Self-Host

Run Qorstack Report with Docker Compose. This setup is intended for OSS users
and customers who deploy the product themselves.

The default setup is free/OSS and does not require a license.

---

## 1. Requirements

| Requirement    | Minimum |
| -------------- | ------- |
| Docker         | 24+     |
| Docker Compose | v2      |
| RAM            | 2 GB    |
| Disk           | 5 GB    |

---

## 2. Quick Start

```bash
git clone https://github.com/qorstack/qorstack-report.git
cd qorstack-report/selfhost
cp .env.example .env
docker compose up -d
```

The bundled `.env.example` works out-of-the-box for localhost. Open:

| Service       | URL                                            |
| ------------- | ---------------------------------------------- |
| Web UI        | [http://localhost:3000](http://localhost:3000) |
| API           | [http://localhost:8080](http://localhost:8080) |
| MinIO console | [http://localhost:9001](http://localhost:9001) |

Sign in with the default admin account:

| Field             | Default value |
| ----------------- | ------------- |
| Username or Email | `admin`       |
| Password          | `admin`       |

The login field accepts either a username or an email — whatever value you put
in `ADMIN_EMAIL` is what you type at sign-in. **Change both before exposing
the instance outside localhost.**

---

## 3. Services

The compose file starts the following:

| Service       | Component   | Purpose                                                            |
| ------------- | ----------- | ------------------------------------------------------------------ |
| `frontend`    | Frontend    | Next.js web UI                                                     |
| `backend`     | Backend     | .NET API and report engine                                         |
| `postgres`    | PostgreSQL  | Application database                                               |
| `minio`       | MinIO       | S3-compatible storage for templates, reports, and fonts            |
| `font-syncer` | Font syncer | Copies uploaded fonts from MinIO into the shared render font cache |
| `gotenberg`   | Gotenberg   | LibreOffice-based DOCX/XLSX to PDF conversion                      |
| `nginx`       | Nginx       | Optional reverse proxy for domain/HTTPS deployments                |

---

## 4. Troubleshooting

Backend logs:

```bash
docker compose logs backend
```

Common issues:

| Symptom                  | Check                                                 |
| ------------------------ | ----------------------------------------------------- |
| Login fails on first run | `ADMIN_EMAIL`, `ADMIN_PASSWORD`, backend logs         |
| Frontend cannot call API | `API_URL`, `CORS_ORIGINS`                             |
| Previews/downloads fail  | `MINIO_PUBLIC_ENDPOINT` is reachable from the browser |
| PDF conversion fails     | `docker compose logs gotenberg`                       |
| Custom fonts missing     | `docker compose logs font-syncer`                     |

---

## 5. Updating and Stopping

Update:

```bash
docker compose pull
docker compose up -d
```

Stop (keep data):

```bash
docker compose down
```

Stop and wipe all data (PostgreSQL + MinIO volumes):

```bash
docker compose down -v
```

---

## 6. Production Setup

Before exposing the instance outside localhost, replace the default secrets in
`.env`:

| Variable           | Description                             |
| ------------------ | --------------------------------------- |
| `ADMIN_EMAIL`      | Initial admin login (username or email) |
| `ADMIN_PASSWORD`   | Initial admin password                  |
| `DB_PASSWORD`      | PostgreSQL password                     |
| `MINIO_ACCESS_KEY` | MinIO root/access key                   |
| `MINIO_SECRET_KEY` | MinIO root/secret key                   |
| `JWT_KEY`          | JWT signing key, at least 32 characters |
| `ENCRYPTION_KEY`   | AES key, exactly 32 characters          |
| `ENCRYPTION_IV`    | AES IV, exactly 16 characters           |

Generate secrets:

```bash
openssl rand -hex 32  # JWT_KEY
openssl rand -hex 16  # ENCRYPTION_KEY
openssl rand -hex 8   # ENCRYPTION_IV
```

### Access From Another Machine

When opening the UI from another device, `localhost` points to that device, not
the server. Set browser-facing URLs to your server IP or domain:

```env
API_URL=http://100.x.x.x:8080
CORS_ORIGINS=http://100.x.x.x:3000
MINIO_PUBLIC_ENDPOINT=http://100.x.x.x:9000
```

For HTTPS/domain deployments:

```env
API_URL=https://api.your-domain.com
CORS_ORIGINS=https://your-domain.com
MINIO_PUBLIC_ENDPOINT=https://minio.your-domain.com
```

Optional Nginx reverse proxy config is included as commented Compose service
lines for domain/HTTPS deployments.

---

## 7. Optional Values

For localhost usage, the defaults are enough. Set these only when needed:

| Variable                                | When to set it                                                |
| --------------------------------------- | ------------------------------------------------------------- |
| `API_URL`                               | Browser-facing API URL when not using `http://localhost:8080` |
| `CORS_ORIGINS`                          | Browser origins allowed to call the API                       |
| `MINIO_PUBLIC_ENDPOINT`                 | Browser-reachable MinIO URL for signed file links             |
| `FRONTEND_PORT`                         | Host port for the frontend when `3000` is already used        |
| `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER` | External PostgreSQL                                           |
| `MINIO_ENDPOINT`/`MINIO_USE_SSL`        | External MinIO or S3-compatible storage                       |

---

## 8. External PostgreSQL or MinIO

If you already run PostgreSQL, set:

```env
DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=qorstack_report
DB_USER=postgres
DB_PASSWORD=your-db-password
```

Then remove or disable the `postgres` service from `docker-compose.yml`.

If you already run MinIO/S3-compatible storage, set:

```env
MINIO_ENDPOINT=your-minio-host:9000
MINIO_PUBLIC_ENDPOINT=https://minio.your-domain.com
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
```

Then remove or disable the `minio` service from `docker-compose.yml`.

---

## 9. Free vs Pro

The default self-host setup is OSS/free.

| Feature                    | Free | Pro |
| -------------------------- | :--: | :-: |
| PDF password protection    |  ⛔  | ✅  |
| PDF watermarking           |  ⛔  | ✅  |
| Live Preview auto-render   |  ⛔  | ✅  |
| Custom template keys       |  ✅  | ✅  |
| Template versions retained |  10  | 10  |

Check active feature flags:

```bash
curl http://localhost:8080/features
```

For free, `livePreview` is `false`. For Pro, it is `true`.

---

## 10. Activate Pro

Steps:

1. Place `license.json` in this `selfhost/` directory.
1. In `docker-compose.yml`, uncomment the three lines marked
   `# --- Pro license (optional) ---` inside the `backend` service. After
   uncommenting they should read:

   ```yaml
       - Pro__LicenseFile=/app/license.json
     volumes:
       - ./license.json:/app/license.json:ro
   ```

1. Restart the backend:

```bash
docker compose restart backend
```

The license is validated offline. No call to Qorstack servers is required.
