#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status

echo "--------------------------------------------------"
echo "Running Base Preparation (Generate & Build)..."
echo "--------------------------------------------------"

# Refresh the SDK swagger from the backend (NSwag writes specification.json on build)
echo "Building backend and refreshing swagger-sdk.json..."
dotnet build ../backend/src/Web -c Release
pnpm gen:swagger

# Generate code
echo "Running pnpm gen:all..."
pnpm gen:all

# Build project
echo "Running pnpm build..."
pnpm build

echo "Base preparation completed."
