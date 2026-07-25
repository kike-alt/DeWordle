#!/usr/bin/env bash
set -euo pipefail

WORKFLOW_DIR="${1:-.github/workflows}"

if [[ ! -d "$WORKFLOW_DIR" ]]; then
  echo "Workflow directory not found: $WORKFLOW_DIR" >&2
  exit 1
fi

failures=0

while IFS= read -r -d '' file; do
  if grep -nE 'secrets:\s*inherit|secrets\.[A-Z0-9_]+|secrets\[[^]]+\]' "$file" >/dev/null; then
    echo "ERROR: overly broad secret usage detected in $file" >&2
    grep -nE 'secrets:\s*inherit|secrets\.[A-Z0-9_]+|secrets\[[^]]+\]' "$file" >&2 || true
    failures=1
  fi
done < <(find "$WORKFLOW_DIR" -maxdepth 1 \( -name '*.yml' -o -name '*.yaml' \) -print0)

if [[ "$failures" -ne 0 ]]; then
  exit 1
fi

echo "Workflow secret scope policy passed."
