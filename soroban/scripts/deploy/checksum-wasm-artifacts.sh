#!/usr/bin/env bash
# Issue #664: retain and checksum wasm artifacts for reproducible deploys.
set -euo pipefail

ARTIFACT_DIR="${1:-soroban/target/wasm32-unknown-unknown/release}"
CHECKSUM_FILE="${2:-soroban/scripts/deploy/wasm-checksums.txt}"

if [[ ! -d "$ARTIFACT_DIR" ]]; then
  echo "Artifact directory not found: $ARTIFACT_DIR" >&2
  exit 1
fi

tmp_checksums="$(mktemp)"
trap 'rm -f "$tmp_checksums"' EXIT

find "$ARTIFACT_DIR" -maxdepth 1 -name '*.wasm' -print0 \
  | sort -z \
  | xargs -0 sha256sum > "$tmp_checksums" 2>/dev/null || true

if [[ ! -s "$tmp_checksums" ]]; then
  echo "No .wasm artifacts found in $ARTIFACT_DIR" >&2
  exit 1
fi

if [[ -f "$CHECKSUM_FILE" ]]; then
  if ! diff -u "$CHECKSUM_FILE" "$tmp_checksums"; then
    echo "ERROR: wasm artifact checksums changed unexpectedly" >&2
    exit 1
  fi
  echo "Checksums match retained baseline."
else
  mkdir -p "$(dirname "$CHECKSUM_FILE")"
  cp "$tmp_checksums" "$CHECKSUM_FILE"
  echo "Baseline checksums written to $CHECKSUM_FILE"
fi
