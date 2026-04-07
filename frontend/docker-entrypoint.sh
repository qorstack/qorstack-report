#!/bin/sh
# Inject runtime environment variables into the pre-built Next.js bundle.
#
# NEXT_PUBLIC_* variables are baked into JS at build time.
# This script replaces build-time placeholders with actual runtime values,
# allowing a single Docker Hub image to work across different deployments.
#
# Placeholders → Runtime env vars:
#   __NEXT_PUBLIC_SERVICE__  →  NEXT_PUBLIC_SERVICE

set -e

replace() {
  placeholder="$1"
  value="$2"
  if [ -n "$value" ]; then
    find /app/.next -type f -name '*.js' \
      -exec sed -i "s|${placeholder}|${value}|g" {} \;
  fi
}

replace "__NEXT_PUBLIC_SERVICE__" "${NEXT_PUBLIC_SERVICE}"

exec node server.js
