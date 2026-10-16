#!/usr/bin/env bash
# =============================================================================
# verify.sh — smoke-test a running Qorstack Report stack
#
# Confirms the stack is actually serving: the web UI and the API share one port
# (web UI at /, API under /api). Compose-agnostic — it only needs that port.
#
# Usage (in the selfhost/ folder, after `docker compose up -d`):
#   bash verify.sh
#   APP_URL=http://host:8081 bash verify.sh     # check another address
#
# Default address: http://localhost:$APP_PORT, with APP_PORT read from the .env next to
# this script (8080 if unset) — so a remapped port is checked without extra flags.
#
# Note: this checks that the services are up and serving. It does NOT generate a
# document — a full generation test additionally needs an API key (X-API-Key)
# and an uploaded template key.
# =============================================================================
set -euo pipefail

# Last KEY=value in the .env next to this script (read, not sourced: values may hold shell characters).
env_value() {
  local file
  file="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.env"
  [ -f "$file" ] || return 0
  { grep -E "^[[:space:]]*$1=" "$file" || true; } | tail -n 1 | cut -d= -f2- | sed -e 's/[[:space:]]#.*//' | tr -d "\r\"' \t"
}

APP_PORT="${APP_PORT:-$(env_value APP_PORT)}"
APP_URL="${APP_URL:-${API_URL:-http://localhost:${APP_PORT:-8080}}}"
APP_URL="${APP_URL%/}"

fail=0

check() {
  local name="$1" url="$2" expect="$3" code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$url" 2>/dev/null || echo 000)
  if echo " $expect " | grep -q " $code "; then
    echo "  OK   $name ($url) -> $code"
  else
    echo "  FAIL $name ($url) -> $code (expected: $expect)"
    fail=1
  fi
}

echo "Verifying Qorstack Report stack..."
check "API health" "$APP_URL/api/health" "200"
check "Web UI"     "$APP_URL/login"      "200 301 302 307 308"

if [ "$fail" -eq 0 ]; then
  echo "All checks passed — the stack is serving."
else
  echo "Some checks failed. Is the stack up? Try: docker compose up -d && docker compose ps"
  exit 1
fi
