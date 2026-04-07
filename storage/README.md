# Storage (MinIO)

MinIO is used as object storage for templates and generated reports.

## Buckets

| Bucket | Purpose |
|--------|---------|
| `templates` | Uploaded Word/Excel template files |
| `reports` | Generated PDF/Excel output files |
| `system-fonts` | System-level fonts synced to Gotenberg |
| `fonts` | User-uploaded custom fonts |

## Local Development

MinIO starts automatically with `docker-compose.infra.yml`.

Access the console at: http://localhost:9001

Default credentials (development only):
- Username: `minioadmin`
- Password: `minioadmin`

## Bucket Policies

Bucket policies can be applied using MinIO Client (mc):

```bash
# Set templates bucket to private
mc anonymous set none minio/templates

# Set reports bucket to private
mc anonymous set none minio/reports
```

## Font Sync

The `font-syncer` service in `docker-compose.infra.yml` automatically mirrors
fonts from the MinIO buckets to the shared `fonts_cache` volume used by Gotenberg.

To seed Google Fonts into MinIO, run from the `backend/` directory:
```bash
python seed-fonts.py
```
