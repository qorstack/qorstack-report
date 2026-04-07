#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status

# Load .env file if it exists (for global environment check if needed)
if [ -f .env ]; then
  echo "Loading environment variables from .env..."
  set -a
  source .env
  set +a
fi

echo "=================================================="
echo "STARTING FULL PUBLISH PROCESS"
echo "=================================================="

# 1. Run Base Preparation (Generate & Build)
./publish-build.bash

# Set flag to skip base preparation in sub-scripts
export SKIP_BASE_PREPARATION=true

# 2. Publish Node.js Package
echo ""
echo "--------------------------------------------------"
echo "Step 2: Publishing Node.js Package..."
echo "--------------------------------------------------"
./publish-nodejs.bash

# 3. Publish .NET Package
echo ""
echo "--------------------------------------------------"
echo "Step 3: Publishing .NET Package..."
echo "--------------------------------------------------"
./publish-dotnet.bash

echo ""
echo "=================================================="
echo "ALL TASKS COMPLETED SUCCESSFULLY!"
echo "=================================================="
