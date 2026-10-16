#!/usr/bin/env bash
# One-command demo: render this invoice with Qorstack and save the PDF.
#
# Prereqs:
#   - the stack is running (cd selfhost && docker compose up -d)
#   - you uploaded invoice.docx in the web UI and have its template key
#   - you created an API key (web UI -> Settings -> API Keys)
#
# Run:
#   QORSTACK_API_KEY=... TEMPLATE_KEY=... bash examples/invoice/run.sh
set -euo pipefail

API_URL="${QORSTACK_API_URL:-http://localhost:8080/api}"
API_URL="${API_URL%/}"; case "$API_URL" in */api) ;; *) API_URL="$API_URL/api" ;; esac
: "${QORSTACK_API_KEY:?Set QORSTACK_API_KEY (web UI -> Settings -> API Keys)}"
: "${TEMPLATE_KEY:?Set TEMPLATE_KEY (web UI -> after uploading invoice.docx)}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

payload=$(sed "s/REPLACE_WITH_YOUR_TEMPLATE_KEY/$TEMPLATE_KEY/" "$DIR/data.json")

echo "Rendering invoice -> PDF ..."
resp=$(curl -s -X POST "$API_URL/render/word/template" \
  -H "X-API-Key: $QORSTACK_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$payload")
echo "$resp"

url=$(printf '%s' "$resp" | python3 -c "import sys,json;print(json.load(sys.stdin).get('downloadUrl',''))" 2>/dev/null || true)
if [ -n "$url" ]; then
  curl -s -o "$DIR/invoice.pdf" "$url"
  echo "Saved: $DIR/invoice.pdf"
else
  echo "No downloadUrl in the response — check the error above." >&2
  exit 1
fi
