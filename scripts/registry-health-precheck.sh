#!/usr/bin/env bash
# Issue #666: optional precheck for npm/cargo registry reachability so CI
# fails fast on external outages instead of timing out mid-install.
set -euo pipefail

PRECHECK_REGISTRY="${PRECHECK_REGISTRY:-false}"

if [[ "$PRECHECK_REGISTRY" != "true" ]]; then
  echo "Registry precheck disabled (PRECHECK_REGISTRY=$PRECHECK_REGISTRY); skipping."
  exit 0
fi

check_url() {
  local name="$1" url="$2"
  if curl --silent --fail --max-time 5 --output /dev/null "$url"; then
    echo "OK: $name reachable"
  else
    echo "ERROR: $name unreachable at $url" >&2
    return 1
  fi
}

failures=0
check_url "npm registry" "https://registry.npmjs.org/-/ping" || failures=1
check_url "crates.io" "https://crates.io/api/v1/summary" || failures=1

if [[ "$failures" -ne 0 ]]; then
  echo "One or more package registries are unreachable; failing fast." >&2
  exit 1
fi

echo "All registries reachable."
