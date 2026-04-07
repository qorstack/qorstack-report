#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status

echo "--------------------------------------------------"
echo "Running Base Preparation (Generate & Build)..."
echo "--------------------------------------------------"

# Generate code
echo "Running yarn gen:all..."
yarn gen:all

# Build project
echo "Running yarn build..."
yarn build

echo "Base preparation completed."
