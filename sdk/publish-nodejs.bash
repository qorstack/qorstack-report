#!/bin/bash

# Load .env file if it exists
if [ -f .env ]; then
  echo "Loading environment variables from .env..."
  set -a
  source .env
  set +a
fi

# Run base preparation if not skipped
if [ "$SKIP_BASE_PREPARATION" != "true" ]; then
  echo "Running base preparation..."
  ./publish-build.bash
else
  echo "Skipping base preparation (already run by parent script)..."
fi

# Check if NPM_ACCESS_TOKEN is set
if [ -z "$NPM_ACCESS_TOKEN" ]; then
  echo "Error: NPM_ACCESS_TOKEN environment variable is not set."
  echo "Please export NPM_ACCESS_TOKEN='your_npm_token' or set it in .env file"
  exit 1
fi

# Authenticate with NPM
echo "Configuring NPM authentication..."
npm config set //registry.npmjs.org/:_authToken "$NPM_ACCESS_TOKEN"

# Publish
echo "Publishing to NPM..."
npm publish --access public
