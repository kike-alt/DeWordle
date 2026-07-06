#!/usr/bin/env bash
set -euo pipefail

# check-drift.sh
# Detects drift between manifests and lockfiles or generated binaries
# where the repo expects them to stay aligned.

check_npm_drift() {
  local surface=$1
  echo "Checking npm lockfile drift for '$surface'..."
  
  if [ -d "$surface" ]; then
    (cd "$surface" && npm install --package-lock-only --ignore-scripts > /dev/null 2>&1)
  else
    npm install --package-lock-only --ignore-scripts > /dev/null 2>&1
  fi

  local target="$surface/package-lock.json"
  if [ "$surface" = "." ]; then
    target="package-lock.json"
  fi

  if ! git diff --exit-code "$target" > /dev/null; then
    echo "::error file=$target::$target is out of date. Please run 'npm install' in $surface and commit the changes."
    return 1
  fi
  echo "✅ $target is up to date."
}

check_scarb_drift() {
  local surface=$1
  echo "Checking Scarb lockfile drift for '$surface'..."
  
  if command -v scarb >/dev/null 2>&1; then
    (cd "$surface" && scarb fetch > /dev/null 2>&1)
    local target="$surface/Scarb.lock"
    if ! git diff --exit-code "$target" > /dev/null; then
      echo "::error file=$target::$target is out of date. Please run 'scarb fetch' in $surface and commit the changes."
      return 1
    fi
    echo "✅ $target is up to date."
  else
    echo "⚠️ scarb not found, skipping $surface"
  fi
}

FAILED=0

echo "🔍 Starting drift checks..."

# Check the root, frontend, and backend npm workspaces
check_npm_drift "." || FAILED=1
check_npm_drift "frontend" || FAILED=1
check_npm_drift "backend" || FAILED=1

# Check the onchain scarb workspace if it exists
if [ -f "onchain/Scarb.toml" ]; then
  check_scarb_drift "onchain" || FAILED=1
fi

if [ "$FAILED" -eq 1 ]; then
  echo "::error::Drift detected! See logs above for actionable guidance."
  exit 1
fi

echo "✨ All lockfiles are in sync!"
exit 0
