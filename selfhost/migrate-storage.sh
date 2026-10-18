#!/usr/bin/env bash
# =============================================================================
# migrate-storage.sh — upgrade file storage from v1 to v2
#
# v1 kept files in three MinIO buckets: templates / reports / fonts.
# v2 keeps everything in ONE bucket ($STORAGE_BUCKET, default qorstack-report):
#
#   templates  →  $STORAGE_BUCKET/template/
#   reports    →  $STORAGE_BUCKET/generated-report/
#   fonts      →  $STORAGE_BUCKET/fonts/
#
# Two ways to upgrade — pick one:
#
#   bash migrate-storage.sh keep-minio   keep running MinIO; copy the 3 buckets into the new
#                                        bucket on the same MinIO (sets COMPOSE_FILE to the minio override)
#   bash migrate-storage.sh to-rustfs    switch to RustFS (the default); copy the 3 MinIO buckets into
#                                        the new bucket on RustFS
#
# Copy only: the old buckets and the MinIO volume are left untouched. Safe to run again.
# Uses rclone (rclone/rclone image) — no MinIO client needed.
# Run it from this folder, with the v2 docker-compose.yml and your existing .env, then:
#   docker compose up -d
#
# Custom v1 bucket names? OLD_TEMPLATE_BUCKET=… OLD_REPORT_BUCKET=… OLD_FONT_BUCKET=… bash migrate-storage.sh <mode>
# v1 MinIO volume has another name? OLD_MINIO_VOLUME=<volume> bash migrate-storage.sh to-rustfs
# =============================================================================
set -euo pipefail

MODE="${1:-}"
if [ "$MODE" != "keep-minio" ] && [ "$MODE" != "to-rustfs" ]; then
  sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
fi

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"
[ -f .env ] || { echo "Error: .env not found in $DIR." >&2; exit 1; }

# Read values from .env without `source` (so odd characters can't run as shell).
env_value() { grep -E "^$1=" .env | tail -n1 | cut -d= -f2- | tr -d '\r' || true; }
first() { for v in "$@"; do [ -n "$v" ] && { echo "$v"; return; }; done; }

BUCKET="$(first "$(env_value STORAGE_BUCKET)" "$(env_value MINIO_BUCKET)" qorstack-report)"
# v1 MinIO credentials (the MinIO data volume keeps its original root user).
SRC_KEY="$(first "${OLD_STORAGE_ACCESS_KEY:-}" "$(env_value MINIO_ACCESS_KEY)" "$(env_value STORAGE_ACCESS_KEY)" minioadmin)"
SRC_SECRET="$(first "${OLD_STORAGE_SECRET_KEY:-}" "$(env_value MINIO_SECRET_KEY)" "$(env_value STORAGE_SECRET_KEY)")"
DST_KEY="$(first "$(env_value STORAGE_ACCESS_KEY)" "$(env_value MINIO_ACCESS_KEY)" qorstack)"
DST_SECRET="$(first "$(env_value STORAGE_SECRET_KEY)" "$(env_value MINIO_SECRET_KEY)")"
OLD_TEMPLATE_BUCKET="${OLD_TEMPLATE_BUCKET:-templates}"
OLD_REPORT_BUCKET="${OLD_REPORT_BUCKET:-reports}"
OLD_FONT_BUCKET="${OLD_FONT_BUCKET:-fonts}"

[ -n "$SRC_SECRET" ] || { echo "Error: MINIO_SECRET_KEY (v1) not found in .env — set OLD_STORAGE_SECRET_KEY." >&2; exit 1; }

export COMPOSE_PATH_SEPARATOR=:
MINIO_IMAGE="quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z"

echo "→ Stopping app + font-syncer so nothing writes while copying..."
# v1 stacks named the API service "backend"; stop either.
for svc in app backend frontend font-syncer; do docker compose stop "$svc" >/dev/null 2>&1 || true; done

if [ "$MODE" = "keep-minio" ]; then
  DST_HOST="qorstack-minio:9000"; DST_KEY="$SRC_KEY"; DST_SECRET="$SRC_SECRET"
  echo "→ Starting MinIO..."
  COMPOSE_FILE="docker-compose.yml:docker-compose.minio.yml" docker compose up -d --wait minio
  NETWORK="$(docker inspect qorstack-minio -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' | awk '{print $1}')"
else
  [ -n "$DST_SECRET" ] || { echo "Error: set STORAGE_SECRET_KEY in .env (the RustFS root password) first." >&2; exit 1; }
  DST_HOST="qorstack-rustfs:9000"
  # Never run two MinIO servers on one volume: stop the v1 container if it is still up.
  docker stop qorstack-minio >/dev/null 2>&1 || true
  echo "→ Starting RustFS..."
  COMPOSE_FILE="docker-compose.yml" docker compose up -d --wait rustfs
  NETWORK="$(docker inspect qorstack-rustfs -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' | awk '{print $1}')"
  # The v1 MinIO data volume: <project>_minio_data (project = this folder's name unless COMPOSE_PROJECT_NAME is set).
  PROJECT="$(first "${COMPOSE_PROJECT_NAME:-}" "$(env_value COMPOSE_PROJECT_NAME)" "$(basename "$DIR" | tr '[:upper:]' '[:lower:]')")"
  VOLUME="${OLD_MINIO_VOLUME:-${PROJECT}_minio_data}"
  docker volume inspect "$VOLUME" >/dev/null 2>&1 || { echo "Error: MinIO volume '$VOLUME' not found — set OLD_MINIO_VOLUME." >&2; exit 1; }
  echo "→ Starting a temporary MinIO on volume $VOLUME (read source)..."
  docker rm -f qorstack-minio-migrate >/dev/null 2>&1 || true
  docker run -d --name qorstack-minio-migrate --network "$NETWORK" --network-alias qorstack-minio     -v "$VOLUME":/data -e MINIO_ROOT_USER="$SRC_KEY" -e MINIO_ROOT_PASSWORD="$SRC_SECRET"     "$MINIO_IMAGE" server /data >/dev/null
  trap 'docker rm -f qorstack-minio-migrate >/dev/null 2>&1 || true' EXIT
  for _ in $(seq 1 30); do
    docker exec qorstack-minio-migrate curl -fs http://localhost:9000/minio/health/live >/dev/null 2>&1 && break
    sleep 2
  done
fi

echo "→ Copying into $DST_HOST / $BUCKET ..."
for pair in "$OLD_TEMPLATE_BUCKET:template" "$OLD_REPORT_BUCKET:generated-report" "$OLD_FONT_BUCKET:fonts"; do
  old="${pair%%:*}"; folder="${pair#*:}"
  docker run --rm --network "$NETWORK" \
    -e RCLONE_CONFIG_SRC_TYPE=s3 -e RCLONE_CONFIG_SRC_PROVIDER=Minio \
    -e RCLONE_CONFIG_SRC_ENDPOINT=http://qorstack-minio:9000 \
    -e RCLONE_CONFIG_SRC_ACCESS_KEY_ID="$SRC_KEY" -e RCLONE_CONFIG_SRC_SECRET_ACCESS_KEY="$SRC_SECRET" \
    -e RCLONE_CONFIG_DST_TYPE=s3 -e RCLONE_CONFIG_DST_PROVIDER=Other \
    -e RCLONE_CONFIG_DST_ENDPOINT="http://$DST_HOST" -e RCLONE_CONFIG_DST_FORCE_PATH_STYLE=true \
    -e RCLONE_CONFIG_DST_ACCESS_KEY_ID="$DST_KEY" -e RCLONE_CONFIG_DST_SECRET_ACCESS_KEY="$DST_SECRET" \
    -e OLD="$old" -e BUCKET="$BUCKET" -e FOLDER="$folder" \
    --entrypoint sh rclone/rclone:1.74 -c '
      if ! rclone lsf "src:$OLD" --max-depth 1 >/dev/null 2>&1; then echo "  - $OLD: not found, skipped"; exit 0; fi
      rclone mkdir "dst:$BUCKET"
      rclone copy "src:$OLD" "dst:$BUCKET/$FOLDER" --s3-no-check-bucket -q
      src=$(rclone size "src:$OLD" --json | sed -n "s/.*\"count\":\([0-9]*\).*/\1/p")
      dst=$(rclone size "dst:$BUCKET/$FOLDER" --json | sed -n "s/.*\"count\":\([0-9]*\).*/\1/p")
      echo "  ✓ $OLD → $BUCKET/$FOLDER/  ($src objects in old bucket, $dst in new folder)"'
done

# Make `docker compose up -d` use the right storage from now on.
if [ "$MODE" = "keep-minio" ]; then
  if grep -qE '^COMPOSE_FILE=' .env; then
    echo "! .env already sets COMPOSE_FILE — make sure it is docker-compose.yml:docker-compose.minio.yml"
  else
    printf '
# Bundled MinIO instead of RustFS (added by migrate-storage.sh)
COMPOSE_FILE=docker-compose.yml:docker-compose.minio.yml
COMPOSE_PATH_SEPARATOR=:
' >> .env
    echo "→ Added COMPOSE_FILE=docker-compose.yml:docker-compose.minio.yml to .env"
  fi
elif grep -qE '^COMPOSE_FILE=.*minio' .env; then
  echo "! .env sets COMPOSE_FILE with the minio override — remove that line to run RustFS."
fi

cat <<EOF

Done. Start the stack:   docker compose up -d

Nothing was deleted. After checking templates, history and fonts in the web app you can
remove the old buckets (keep-minio) or the old MinIO volume (to-rustfs, docker volume rm) yourself.
EOF
