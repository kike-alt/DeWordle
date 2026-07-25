#!/usr/bin/env bash
# validate-phase3.sh — Phase 3 one-command validation for SC/SDK/FE/BE modules
# Usage: ./scripts/validate-phase3.sh [--module sc|sdk|fe|be|all]
# Closes: #605

set -euo pipefail

MODULE="${1:-all}"
PASS=0
FAIL=0
SKIP=0

log()  { echo "[validate] $*"; }
ok()   { echo "  ✓ $*"; PASS=$((PASS+1)); }
fail() { echo "  ✗ $*"; FAIL=$((FAIL+1)); }
skip() { echo "  - $* (skipped)"; SKIP=$((SKIP+1)); }

run_soroban() {
  log "=== SC: Soroban workspace check ==="
  if command -v cargo &>/dev/null; then
    if cargo check --workspace --manifest-path soroban/Cargo.toml 2>&1; then
      ok "cargo check passed"
    else
      fail "cargo check failed"
    fi
  else
    # Watchman-constrained / no Rust fallback
    log "  NOTE: cargo not found — skipping Soroban check (watchman-constrained env)"
    skip "Soroban cargo check"
  fi
}

run_sdk() {
  log "=== SDK: TypeScript SDK check ==="
  if [ -d "soroban/sdk/ts" ]; then
    if command -v npx &>/dev/null && [ -f "soroban/sdk/ts/package.json" ]; then
      (cd soroban/sdk/ts && npm install --silent && npx tsc --noEmit 2>&1) && ok "SDK tsc check passed" || fail "SDK tsc check failed"
    else
      skip "SDK tsc (no package.json or npx unavailable)"
    fi
  else
    skip "SDK directory not found"
  fi
}

run_frontend() {
  log "=== FE: Frontend checks ==="
  if [ -d "frontend" ]; then
    if [ -f "frontend/package-lock.json" ]; then
      (cd frontend && npm ci --silent 2>&1) && ok "frontend npm ci" || fail "frontend npm ci failed"
      (cd frontend && npm run lint 2>&1) && ok "frontend lint" || fail "frontend lint failed"
      (cd frontend && npm run typecheck 2>&1) && ok "frontend typecheck" || fail "frontend typecheck failed"
    else
      skip "frontend package-lock.json missing"
    fi
  else
    skip "frontend directory not found"
  fi
}

run_backend() {
  log "=== BE: Backend checks ==="
  if [ -d "backend" ]; then
    if [ -f "backend/package-lock.json" ]; then
      (cd backend && npm ci --silent 2>&1) && ok "backend npm ci" || fail "backend npm ci failed"
      (cd backend && npm run lint 2>&1) && ok "backend lint" || fail "backend lint failed"
      (cd backend && npm run typecheck 2>&1) && ok "backend typecheck" || fail "backend typecheck failed"
    else
      skip "backend package-lock.json missing"
    fi
  else
    skip "backend directory not found"
  fi
}

case "$MODULE" in
  sc)       run_soroban ;;
  sdk)      run_sdk ;;
  fe)       run_frontend ;;
  be)       run_backend ;;
  all|"")
    run_soroban
    run_sdk
    run_frontend
    run_backend
    ;;
  *)
    echo "Usage: $0 [--module sc|sdk|fe|be|all]"
    exit 1
    ;;
esac

echo ""
echo "=== Validation Summary ==="
echo "  Passed: $PASS  Failed: $FAIL  Skipped: $SKIP"

if [ "$FAIL" -gt 0 ]; then
  echo "RESULT: FAILED"
  exit 1
else
  echo "RESULT: PASSED"
fi
