#!/usr/bin/env bash
# =============================================================================
# init.sh — generate a .env with secure random secrets for a Qorstack deploy
#
# Copies .env.example -> .env and replaces the change-me-* placeholders (and the
# default admin password) with cryptographically random values, so a production
# deploy never ships with the localhost defaults.
#
# Usage:   bash selfhost/init.sh        (or: make init)
#
# Safe by default: refuses to overwrite an existing .env. Requires openssl.
# =============================================================================
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXAMPLE="$DIR/.env.example"
ENV="$DIR/.env"

if ! command -v openssl >/dev/null 2>&1; then
  echo "Error: openssl is required to generate secrets but was not found." >&2
  exit 1
fi
if [ ! -f "$EXAMPLE" ]; then
  echo "Error: $EXAMPLE not found." >&2
  exit 1
fi
if [ -f "$ENV" ]; then
  echo "Refusing to overwrite existing $ENV (it may hold live secrets)." >&2
  echo "Delete it first if you really want to regenerate." >&2
  exit 1
fi

# hex avoids characters that need escaping in .env / connection strings.
# ENCRYPTION_KEY must be exactly 32 chars (16 bytes hex); ENCRYPTION_IV exactly 16 (8 bytes hex).
DB_PASS=$(openssl rand -hex 16)
STORAGE_SECRET=$(openssl rand -hex 16)
JWT=$(openssl rand -hex 24)        # 48 chars (>= 32 required)
ENC_KEY=$(openssl rand -hex 16)    # 32 chars
ENC_IV=$(openssl rand -hex 8)      # 16 chars
ADMIN_PASS=$(openssl rand -hex 12)
WEBHOOK_SECRET=$(openssl rand -hex 32)

sed \
  -e "s|^DB_PASSWORD=.*|DB_PASSWORD=${DB_PASS}|" \
  -e "s|^STORAGE_SECRET_KEY=.*|STORAGE_SECRET_KEY=${STORAGE_SECRET}|" \
  -e "s|^JWT_KEY=.*|JWT_KEY=${JWT}|" \
  -e "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=${ENC_KEY}|" \
  -e "s|^ENCRYPTION_IV=.*|ENCRYPTION_IV=${ENC_IV}|" \
  -e "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=${ADMIN_PASS}|" \
  -e "s|^WEBHOOK_SIGNING_SECRET=.*|WEBHOOK_SIGNING_SECRET=${WEBHOOK_SECRET}|" \
  "$EXAMPLE" > "$ENV"

echo "Generated $ENV with random secrets."
echo ""
echo "  Admin login : admin / ${ADMIN_PASS}"
echo ""
echo "Save the admin password now — then start the stack: docker compose up -d"
echo "Then open http://localhost:8080 (web UI; the API is http://localhost:8080/api)."
