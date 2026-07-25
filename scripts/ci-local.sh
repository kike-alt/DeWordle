#!/usr/bin/env bash
# ci-local.sh — Reproduce CI checks locally in the same order as GitHub Actions.
#
# Usage:
#   ./scripts/ci-local.sh [subset...]
#
# Subsets (default: all):
#   frontend   Run frontend lint + typecheck + build
#   backend    Run backend lint + typecheck + test
#   soroban    Run Rust fmt + clippy + check + test + wasm build
#
# Examples:
#   ./scripts/ci-local.sh                  # run all
#   ./scripts/ci-local.sh frontend         # frontend only
#   ./scripts/ci-local.sh backend soroban  # backend + soroban

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SUBSETS=("$@")
[[ ${#SUBSETS[@]} -eq 0 ]] && SUBSETS=(frontend backend soroban)

FAILED_STEPS=()

run_step() {
  local label="$1"; shift
  echo ""
  echo "▶ $label"
  if "$@"; then
    echo "✔ $label"
  else
    local code=$?
    echo "✘ $label (exit $code)"
    FAILED_STEPS+=("$label")
    # Preserve non-zero exit so callers can detect failure
    return $code
  fi
}

# ── frontend ──────────────────────────────────────────────────────────────────
run_frontend() {
  local dir="$REPO_ROOT/frontend"
  run_step "frontend: lockfile present"   test -f "$dir/package-lock.json"
  run_step "frontend: npm ci"             npm ci --include=dev --prefix "$dir"
  run_step "frontend: lint"               npm run lint --prefix "$dir"
  run_step "frontend: typecheck"          npm run typecheck --prefix "$dir"
  run_step "frontend: build"              npm run build --prefix "$dir"
}

# ── backend ───────────────────────────────────────────────────────────────────
run_backend() {
  local dir="$REPO_ROOT/backend"
  run_step "backend: lockfile present"    test -f "$dir/package-lock.json"
  run_step "backend: npm ci"              npm ci --include=dev --prefix "$dir"
  run_step "backend: lint"                npm run lint --prefix "$dir"
  run_step "backend: typecheck"           npm run typecheck --prefix "$dir"
  run_step "backend: test"                npm run test --prefix "$dir" -- --runInBand
}

# ── soroban ───────────────────────────────────────────────────────────────────
run_soroban() {
  local dir="$REPO_ROOT/soroban"
  run_step "soroban: fmt check"           cargo fmt --all --manifest-path "$dir/Cargo.toml" -- --check
  run_step "soroban: clippy"              cargo clippy --manifest-path "$dir/Cargo.toml" --workspace --all-targets -- -D warnings
  run_step "soroban: check"               cargo check --manifest-path "$dir/Cargo.toml" --workspace
  run_step "soroban: test"                cargo test --manifest-path "$dir/Cargo.toml" --workspace
  run_step "soroban: wasm build"          cargo build --manifest-path "$dir/Cargo.toml" --workspace --target wasm32-unknown-unknown --release
}

# ── dispatch ──────────────────────────────────────────────────────────────────
for subset in "${SUBSETS[@]}"; do
  case "$subset" in
    frontend) run_frontend ;;
    backend)  run_backend  ;;
    soroban)  run_soroban  ;;
    *)
      echo "Unknown subset: $subset  (valid: frontend backend soroban)"
      exit 1
      ;;
  esac
done

# ── summary ───────────────────────────────────────────────────────────────────
echo ""
if [[ ${#FAILED_STEPS[@]} -gt 0 ]]; then
  echo "FAILED steps:"
  for s in "${FAILED_STEPS[@]}"; do
    echo "  ✘ $s"
  done
  exit 1
fi
echo "All CI steps passed locally."
