# Changelog

All notable changes to Qorstack Report are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/),
and the project aims to follow [Semantic Versioning](https://semver.org/).

## [2.3.1] — 2026-10-20

### Fixed

- Project import preview (`POST /api/projects/{id}/import?dryRun=true`) returned `400` in 2.3.0: the new optional
  `stream` query flag was declared as required. A test now checks every endpoint for value-type query parameters
  that are required by accident.

## [2.3.0] — 2026-10-20

### Added

- **Live import progress** (Pro). Importing a project now shows every font and template as it is imported, with a
  progress bar and the reason for anything that failed, then a summary with **Go to Templates**.
  API: `POST /api/projects/{id}/import?dryRun=false&stream=true` streams `application/x-ndjson` progress lines.
- **Regenerate previews.** Re-render template previews with the fonts installed now — after uploading or importing
  fonts, previews made before the renderer had them show a substitute. Templates page: **Regenerate previews** (every
  template of the project, with progress); template editor: **⋯ → Regenerate preview**;
  API: `POST /api/templates/{key}/preview`. After an import that added fonts, the Templates page offers it.

### Changed

- Import commits each font and template on its own, fonts first. A template that fails no longer undoes the
  others; it is listed with its reason, and importing the same file again picks up only what is missing.

### Fixed

- Copy buttons (API key on Create project, API keys page, template keys, code blocks) did nothing on installs
  opened over plain HTTP (a NodePort, an intranet IP); they fall back to a method that works without HTTPS.

## [2.2.2] — 2026-10-19

### Added

- **`STORAGE_PUBLIC_ENDPOINT`** (optional). Set it to the address your storage already serves to browsers
  (e.g. `https://storage.example.com`) and download links become S3 presigned URLs for that address, as in
  v1: browsers download from storage directly and `PUBLIC_URL` is not needed for downloads. Unset (default),
  links stay `{PUBLIC_URL}/api/files/{token}` and storage needs no public address. `MINIO_PUBLIC_ENDPOINT` /
  `Minio__PublicEndpoint` from v1 are read as fallbacks.

### Changed

- Image URLs that point at this deployment's own storage (`STORAGE_ENDPOINT` / `STORAGE_PUBLIC_ENDPOINT`)
  are fetched even on a private network, so `IMAGE_FETCH_ALLOW_PRIVATE_NETWORKS` is only needed for images on
  other intranet servers.
- Enterprise source builds run Pro without `LICENSE=pro` (set `LICENSE=oss` to turn it off). A license file
  (`PRO_LICENSE_FILE`) is still validated as before; the published images are unchanged and still need one.

### Fixed

- The docs page had an empty band under the navbar.

## [2.2.1] — 2026-10-19

### Fixed

- **Sign-in over plain HTTP** (a Kubernetes NodePort, an intranet IP). Sign-in cookies were always Secure
  outside localhost, so browsers dropped them on `http://` and the web UI could not stay signed in. The
  cookies now follow the address in the browser (from the request's `Origin` / `Referer`): Secure on
  `https://`, plain + `SameSite=Lax` on `http://` — no setting needed, behind any number of proxies.
  `AUTH_COOKIE_SECURE=true|false` (new, optional) forces either way.
- The template editor's preview head squeezed the Template / Result tabs under the Auto-preview switch on
  1920px screens. Its labels now follow the panel's own width (CSS container queries), and a very narrow
  panel wraps the actions instead of overlapping.
- The docs navbar is as wide as the docs columns below it.

## [2.2.0] — 2026-10-19

### Added

- **Import shows what differs before you confirm** (Pro). The review lists every template as New, Changed,
  No changes or Skipped, with what changed: template file, fields added / removed, name, saved test data,
  and a note when only the name matches a template with another key. Identical templates are folded away.
  The API's dry run (`POST /api/projects/{id}/import?dryRun=true`) returns the same detail in
  `templates[].changes` and `templates[].unchanged`.
- **Export & import has its own page** in the project sidebar (`/project/{id}/transfer`), apart from
  Project settings.

### Changed

- **Import compares content, not version numbers.** Version numbers are counted per deployment, so:
  identical templates are skipped as "no changes" whatever their numbers; a changed template with the same
  number is imported as the next free version (it used to be skipped as "already up to date"). A newer
  version in the target is still never overwritten. The template name is updated on import.
- **Easier-to-read dashboard.** Brighter secondary text and placeholders, quieter dividers, fields without
  a border until hover / focus, sentence-case page titles, filled tabs and badges. Corners stay square.
- **Template editor.** Version and Replace file stay one click away; Rename, Download original and Delete
  moved into the ⋯ menu. The preview head is one row (Template / Result, Auto-preview, Download, Generate).

### Fixed

- Opening a template from the Templates list without reloading asked the API for the project id and showed
  "not found" until refresh.
- The editor header no longer overlaps the template name on laptop-width screens.
- The Fonts page had two scrollbars.

## [2.1.1-rc.1] — 2026-10-18

Pre-release that exercises the automated release pipeline (Docker Hub, NuGet, npm trusted publishing).
No product changes from 2.1.0 — stay on `2.1.0` / `latest`.

## [2.1.0] — 2026-10-17

### Changed

- **Live Preview is free.** Auto-render while you edit a template now works without a Pro license.
  `/features` still returns `livePreview` (now always `true`).

### Fixed

- `og:site_name` is the product name (was "Qorstack Report Engine").

### SDK

- **SDK 2.1.0** (NuGet `Qorstack.Report.Sdk`, npm `qorstack-report-sdk`) — SDK versions now match the
  server version. Regenerated from the API spec: async-limit `429` is a typed error, and the NuGet package
  ships its README. No breaking changes from SDK 1.0.

## [2.0.0] — 2026-10-14

Upgrade guide: README › [Upgrading to v2](README.md#upgrading-to-v2).
Staying on v1? Pin image tags to `1.1.0` (the last v1 release).

### ⚠ BREAKING

- **One image, one port; the API moved under `/api`.** Web UI and API ship as one image,
  `qorstack/report` (root `Dockerfile`), on port 8080: web UI at `/`, API at `/api`
  (e.g. `POST /api/render/word/template`, downloads at `/api/files/{token}`, health at `/api/health`,
  reference at `/api/docs`). `qorstack/report-api` / `qorstack/report-web` and port 3000 are gone.
  Compose has one `app` service; `API_URL`, `FRONTEND_PORT`, `REPORT_API_TAG`/`REPORT_WEB_TAG` and
  `NEXT_PUBLIC_SERVICE` were removed — set `PUBLIC_URL` (and `APP_PORT`). `CORS_ORIGINS` is now only
  for other origins. API clients add `/api` to the base URL; SDK 1.0 and the MCP server do it
  automatically. GitHub sign-in config moved to the backend (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`,
  `GOOGLE_CLIENT_ID`), and the code exchange now runs server-side.

- **Storage uses one bucket on any S3 server.** `STORAGE_BUCKET` (default `qorstack-report`)
  with folders `template/`, `generated-report/` (incl. `temp-download/`, deleted after 1 day)
  and `fonts/` replaces the `templates` / `reports` / `fonts` buckets. `MINIO_BUCKET_TEMPLATE`,
  `MINIO_BUCKET_REPORT`, `Minio:TemplateBucket` and `Minio:ReportBucket` were removed.
  Copy existing data once with `selfhost/migrate-storage.sh keep-minio` or `to-rustfs` (rclone);
  the backend logs a warning when old-bucket data was not migrated.
- **RustFS is the default storage.** The self-host compose starts RustFS (Apache-2.0) with no
  extra settings; MinIO stays available through the `docker-compose.minio.yml` override (image pinned
  from quay.io — MinIO left Docker Hub), and `docker-compose.external-s3.yml` points `STORAGE_*` at
  any external S3. Unreachable storage now gives a clear 503 and an unhealthy `storage` health check. Settings are `STORAGE_*` / `Storage:*`; v1 `MINIO_*` / `Minio:*` still work as fallbacks.
- **Downloads go through the API.** Every link (`downloadUrl`, previews, fonts, history) is now
  `{PUBLIC_API_URL}/files/{token}` — signed, time-limited, streamed by the backend with Range
  support — instead of a presigned storage URL. Storage no longer needs a public address:
  `MINIO_PUBLIC_ENDPOINT` is no longer needed and port 9000 is not published.
- **Postgres is no longer published on the host** (port 5432), so it can't clash with a local
  Postgres. Tools that connected from the host (DBeaver, psql) need the commented
  `127.0.0.1:${DB_HOST_PORT:-5432}:5432` line under `postgres` in `docker-compose.yml`, or `docker exec`.
- **font-syncer uses rclone** (`rclone/rclone`) instead of the MinIO client, so it works with
  any S3 server.
- **Render request shape.** Every v1 alternative form was removed and now returns `400`
  naming the field and the expected shape:
  ```text
  replace:              { "customer": "ACME" }            → [{ "key": "customer", "value": "ACME" }]
  image/qrcode/barcode: { "logo": { "src": "…" } }        → [{ "key": "logo", "src": "…" }]
  table rows:           [{ "item": "A", "qty": 2 }]       → "columns": ["item", "qty"], "rows": [["A", 2]]
  generateTotals / numberFormat: { "amount": "sum" }      → [{ "key": "amount", "value": "SUM" }]
  sort:                 "date desc"                       → [{ "field": "date", "direction": "desc" }]
  verticalMerge / collapse: "group"                       → ["group"]
  ```
  Row length must match `columns`; sort / merge / totals must name existing columns.
- **`POST /render/excel/template` is Excel in, Excel out** — `fileType` and the PDF
  options were removed (always `.xlsx`).
- **Image URLs** in requests may no longer point at private or internal addresses
  (localhost, 10.x, 172.16–31.x, 192.168.x, 100.64–127.x, cloud metadata). Set
  `IMAGE_FETCH_ALLOW_PRIVATE_NETWORKS=true` for intranet image servers. `minio:` paths are
  accepted only for the template's own builder assets.
- **`zipOutput` is a Pro feature** (it was documented as Pro but never enforced); without Pro it
  now returns `403`.
- **Website is dark only** (the light theme and theme toggle were removed).
- **SDK 1.0.0** (Node / .NET) uses the new types. Stay on API 1.1.0 / SDK 0.x if you still
  send the old forms.

### Added

- **Project export & import (Pro)**: Project settings → Export & import. Export downloads one ZIP
  (manifest + latest active version of every template, its test data and builder images, uploaded
  fonts); import shows a preview (create / update / skip) and then creates new templates with the same
  key and adds newer versions — equal or older versions are skipped. `GET /projects/{id}/export`,
  `POST /projects/{id}/import?dryRun=true|false`; size limit `PROJECT_IMPORT_MAX_MB` (200).
- **Request limits** (env, 0 = unlimited): `RENDER_MAX_BODY_MB` (30), `RENDER_MAX_TABLE_ROWS`
  (50,000 per table), `RENDER_MAX_ITEMS_PER_FIELD` (1,000 per replace / image / qrcode / barcode).
  Over a limit → `400` naming the field and the setting.
- **Validation**: all errors in one `400`, keyed by JSON path (`table[0].rows[12]`, `replace[3].key`).
- **`templateVersion`** (optional) renders a stored older version; unknown version → `404`.
- **Async renders (Pro)**: `"async": true` returns `202 { jobId, status: "pending", statusUrl }`;
  poll `GET /render/jobs/{id}` (fresh `downloadUrl` on success). Optional `webhookUrl` receives
  `POST { jobId, status, downloadUrl?, expiresIn?, error? }`, signed with
  `X-Qorstack-Signature: sha256=<HMAC>` when `WEBHOOK_SIGNING_SECRET` is set; delivery state is stored
  on the job (migration `006_webhook-delivery.sql`, 3 tries: now, +10 s, +60 s), so retries survive restarts.
  The queue lives in PostgreSQL (`report_jobs`, migration `005_render-queue.sql`): jobs survive restarts,
  several backend instances can share it (`FOR UPDATE SKIP LOCKED`, `LISTEN/NOTIFY`), a crashed worker's job
  is picked up again when its lease ends, and infrastructure errors are retried (10 s, 60 s; 3 tries).
  Settings: `RENDER_ASYNC_WORKERS` (2), `RENDER_JOB_LEASE_SECONDS` (300), `RENDER_POLL_SECONDS` (5),
  `RENDER_MAX_PENDING_JOBS_PER_USER` (100 → `429`).
- Website: new Press design, new logo/icons and a generated link-preview image.
- `selfhost/migrate-storage.sh`, fully commented `.env.example` files, `init.sh` / migration script
  downloadable from `/selfhost/`.

### Fixed

- Public Excel API calls no longer overwrite the template's saved builder payload.
- Server-side request forgery through image URLs and cross-template `minio:` paths.
- `System.Security.Cryptography.Pkcs` pinned to 10.0.13 (CVE-2026-84008, CVE-2026-70162; it comes in
  through Microsoft.Data.SqlClient). Image builds failed restore on these advisories.
- **Startup**: database migrations finish before anything else starts (render worker, storage, HTTP),
  so a fresh upgrade no longer logs `column ... does not exist`; a failed migration stops startup.
- **Project pages** follow the project in the URL: a stale or deleted project link shows
  "Project not found" instead of another project (Settings › Delete acted on the wrong one).
- **Account**: a failed password change no longer reports success; a failed GitHub sign-in shows an
  error instead of spinning; the system admin is told their login comes from `ADMIN_EMAIL` /
  `ADMIN_PASSWORD`; Google/GitHub buttons show only when configured.
- **Editor**: test values save automatically (with a leave-page warning while unsaved); Rename no
  longer sends inline images in the URL; "Make current" asks first; Generate opens the preview on
  mobile; Excel tables get the same summary and filter as PDF.
- **Excel editor** no longer runs a hidden render each time it opens (it added a History entry and
  its result was never used).
- **History and Templates** filter and search on the server, so rows beyond the first page are found;
  live polling no longer duplicates rows.
- **Template gallery** shows each template rendered with its sample data
  (`GET /templates/gallery/{id}/thumbnail`; regenerate with `python gallery/_thumbnails.py`). The gallery
  samples use the v2 request shape, so they can be sent to the API as-is, and the sales report's total comes from `generateTotals` instead of an unsupported `{{table_sum:...}}` marker.
- **Self-host**: `verify.sh` reads `APP_PORT`; docs and the agent prompt use the `app` service, `bash verify.sh` and
  `docker compose up -d`; one Free vs Pro list across the site; SDK examples include `/api`.

## [1.1.0] — 2026-06-16

### Added

- **Template Gallery** — new `/gallery` page listing ready-made templates (invoice,
  receipt, quotation, delivery note, certificate, price list, sales report) with
  live modal preview and one-click import into any project.
- `GET /templates/gallery` — list all gallery templates from the bundled
  `gallery/gallery.json` manifest; returns name, description, type, and thumbnail URL.
- `POST /templates/gallery/{id}/import` — clone a gallery template (DOCX or XLSX)
  into the caller's project as a new draft template ready for customisation.
- Seven sample templates shipped with the container under `gallery/`:
  `invoice`, `receipt`, `quotation`, `delivery-note`, `certificate`,
  `price-list`, `sales-report` — each with a `.docx`/`.xlsx` and a `sample.json`
  payload illustrating all supported fields.
- `gallery/_generate.py` — helper script for regenerating or extending the gallery
  manifest from a local template directory.
- **Log detail view** — `GET /render/jobs/{id}` now returns the full request
  payload (`requestData`) plus a presigned `downloadUrl` and `downloadUrlExpiresAt`
  so the generated document can be re-downloaded directly from the log entry.
- Generated files are now stored at `report-logs/{userId}/{jobId}.{ext}` (instead
  of `temp-download/`) so they persist beyond the MinIO temp-download lifecycle and
  remain accessible for the duration of the project's retention policy.
- **Per-project log settings** — two new project-level settings:
  - `logEnabled` (default `true`) — disable report job logging entirely for a project
    without affecting document generation.
  - `logRetentionDays` (default `90`, `0` = keep forever) — automatically purge logs
    older than this many days.
- `GET /projects/{id}/log-settings` — read the current log settings for a project.
- `PUT /projects/{id}/log-settings` — update log settings (validates 0–3650 days).
- `LogRetentionBackgroundService` — hosted service that runs every 24 hours, deletes
  expired `ReportJob` records per project policy, and removes the associated MinIO
  files to reclaim storage.
- Database migration `002_log-settings.sql` — adds `log_enabled` and
  `log_retention_days` columns to the `projects` table (applied automatically on
  startup; existing projects default to enabled / 90-day retention).

### Changed

- `ExportPdfCommandHandler` and `ExportExcelCommandHandler` now persist
  `OutputFilePath` on the `ReportJob` record so log detail views can generate a
  fresh presigned URL on demand.
- Both export handlers skip `ReportJob` creation entirely when `logEnabled = false`
  on the template's project, keeping the generation path unchanged.

## [1.0.0]

### Added

- `mcp/` — Model Context Protocol server exposing `qorstack_list_templates`,
  `qorstack_get_template`, `qorstack_generate_pdf`, `qorstack_generate_excel`, and
  `qorstack_get_job` tools, so MCP-capable agents can drive Qorstack natively.
- `AGENTS.md` and `llms.txt` — agent-facing quickstart and integration guide,
  including explicit guidance on when to use Qorstack vs. calling Gotenberg directly.
- `make init` / `selfhost/init.sh` — generate a `.env` with cryptographically random
  secrets (no `change-me` defaults), printing the generated admin password.
- `make verify` / `selfhost/verify.sh` — smoke-test that a running stack is serving
  (API `/health` + web UI), compose-agnostic.
- `make docker-buildx` — multi-arch image publishing (linux/amd64 + linux/arm64)
  so images run natively on Apple Silicon as well as Intel. Per-service targets
  (`docker-buildx-web`, `docker-buildx-api`) publish a single changed service.
- `versions.mk` — single source of truth for per-service image tags
  (`REPORT_API_TAG` / `REPORT_WEB_TAG` / `GOTENBERG_TAG`); the Makefile reads it
  so tags need not be typed on the command line, and publishing a tag also
  re-tags `:latest`.
- Image tags in the self-host compose are now overridable via `REPORT_API_TAG` /
  `REPORT_WEB_TAG` (default `latest`) for reproducible, pinned deploys.

### Changed (reliability)

- The web UI container now waits for the API to be healthy (`depends_on:
  condition: service_healthy`) instead of merely started.

### Changed

- Self-host docs/site now reflect the self-hosted-only model (there is no hosted
  cloud — `api.qorstack.dev` / `cdn.qorstack.dev` no longer exist): removed the
  dead "Managed Service / Cloud API" marketing section, relabelled the "Cloud API"
  roadmap item to "REST API", and switched docs/demo example URLs to the local
  `localhost` defaults.
- Landing-page "Open Dashboard" CTA now links to the docs in cloud/marketing mode.
- `font-syncer` polling interval relaxed from 5s to 30s to reduce idle CPU use.
- Removed the unused `LICENSE=free` variable from the self-host `.env.example`
  (the published image ignores it; Pro is activated via a signed license file).
- OSS sync (`make sync`) now commits incrementally on top of the public repo's
  history instead of force-pushing a fresh orphan commit each time.
