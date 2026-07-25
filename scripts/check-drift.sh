#!/usr/bin/env bash
set -euo pipefail

# check-drift.sh
# Detects drift between manifests and lockfiles or generated binaries
# where the repo expects them to stay aligned.

FAILED=0
DRIFT_REPORT=""

check_npm_drift() {
  local surface=$1
  local label=$2
  echo "Checking npm lockfile drift for '$label'..."

  if [ -d "$surface" ]; then
    (cd "$surface" && npm install --package-lock-only --ignore-scripts > /dev/null 2>&1)
  else
    npm install --package-lock-only --ignore-scripts > /dev/null 2>&1
  fi

  local target="$surface/package-lock.json"
  if [ "$surface" = "." ]; then
    target="package-lock.json"
  fi

  if ! git diff --exit-code "$target" > /dev/null 2>&1; then
    echo "::error file=$target::$target is out of date relative to $label."
    DRIFT_REPORT="${DRIFT_REPORT}\n  - $target: run 'npm install' in $surface and commit"
    return 1
  fi
  echo "  ✅ $target is in sync with $label."
}

check_cargo_drift() {
  local surface=$1
  echo "Checking Cargo.lock drift for '$surface'..."

  local manifest="$surface/Cargo.toml"
  local lockfile="$surface/Cargo.lock"

  if [ ! -f "$manifest" ]; then
    echo "  ⚠️  $manifest not found, skipping."
    return 0
  fi

  if [ ! -f "$lockfile" ]; then
    echo "::error file=$lockfile::$lockfile is missing. Run 'cargo generate-lockfile' in $surface."
    DRIFT_REPORT="${DRIFT_REPORT}\n  - $lockfile: missing, run 'cargo generate-lockfile' in $surface"
    return 1
  fi

  if command -v cargo >/dev/null 2>&1; then
    (cd "$surface" && cargo check --locked 2>/dev/null) || {
      echo "::error file=$lockfile::$lockfile is out of date relative to $manifest."
      DRIFT_REPORT="${DRIFT_REPORT}\n  - $lockfile: run 'cargo update' in $surface and commit"
      return 1
    }
    echo "  ✅ $lockfile is in sync with $manifest."
  else
    echo "  ⚠️  cargo not found, skipping $surface lockfile verification."
  fi
}

echo "🔍 Starting drift checks..."

check_npm_drift "." "root package.json" || FAILED=1
check_npm_drift "frontend" "frontend/package.json" || FAILED=1
check_npm_drift "backend" "backend/package.json" || FAILED=1

if [ -f "soroban/Cargo.toml" ]; then
  check_cargo_drift "soroban" || FAILED=1
fi

if [ -f "onchain/Scarb.toml" ]; then
  echo "Checking Scarb lockfile drift for 'onchain'..."
  if command -v scarb >/dev/null 2>&1; then
    (cd "onchain" && scarb fetch > /dev/null 2>&1)
    local target="onchain/Scarb.lock"
    if ! git diff --exit-code "$target" > /dev/null 2>&1; then
      echo "::error file=$target::$target is out of date. Run 'scarb fetch' in onchain."
      DRIFT_REPORT="${DRIFT_REPORT}\n  - $target: run 'scarb fetch' in onchain"
      FAILED=1
    else
      echo "  ✅ $target is in sync."
    fi
  else
    echo "  ⚠️  scarb not found, skipping onchain"
  fi
fi

if [ "$FAILED" -eq 1 ]; then
  echo ""
  echo "::error::Drift detected! Actionable guidance:"
  echo -e "$DRIFT_REPORT"
  echo ""
  echo "Run the suggested commands above and commit the updated lockfiles."
  exit 1
fi

echo ""
echo "✨ All lockfiles and manifests are in sync!"
exit 0
