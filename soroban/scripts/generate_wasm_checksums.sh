#!/usr/bin/env bash
# Generates a deterministic SHA-256 checksum for the compiled contract WASM.
set -euo pipefail

WASM_DIR="target/wasm32-unknown-unknown/release"
WASM_FILE="$WASM_DIR/dewordle_game.wasm"
OUT_FILE="$WASM_FILE.sha256"

if [[ ! -f "$WASM_FILE" ]]; then
  echo "WASM artifact not found: $WASM_FILE" >&2
  exit 1
fi

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$WASM_FILE" > "$OUT_FILE"
elif command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "$WASM_FILE" > "$OUT_FILE"
else
  echo "Neither sha256sum nor shasum is available" >&2
  exit 1
fi

echo "Wrote checksum to $OUT_FILE"
