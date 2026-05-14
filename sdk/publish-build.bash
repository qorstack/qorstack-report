#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status

echo "--------------------------------------------------"
echo "Running Base Preparation (Generate & Build)..."
echo "--------------------------------------------------"

# Generate code
echo "Running pnpm gen:all..."
pnpm gen:all

# Build project
echo "Running pnpm build..."
pnpm build

echo "Base preparation completed."
