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

# Check if NUGET_API_KEY is set
if [ -z "$NUGET_API_KEY" ]; then
  echo "Error: NUGET_API_KEY environment variable is not set."
  echo "Please export NUGET_API_KEY='your_api_key_here' or set it in .env file"
  exit 1
fi

# Clean previous builds to avoid pushing old versions
echo "Cleaning previous builds..."
rm -rf src/dotnet/bin/Release

echo "Building and Packing project..."
dotnet build src/dotnet/Qorstack.Report.Sdk.csproj -c Release

# Push the package
echo "Pushing to NuGet..."
# Find the generated nupkg file (should be only one after clean)
NUPKG_FILE=$(find src/dotnet/bin/Release -name "*.nupkg" | head -n 1)

if [ -z "$NUPKG_FILE" ]; then
  echo "Error: No .nupkg file found."
  exit 1
fi

dotnet nuget push "$NUPKG_FILE" --api-key "$NUGET_API_KEY" --source https://api.nuget.org/v3/index.json
