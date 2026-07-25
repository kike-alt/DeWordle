#!/usr/bin/env bash
# categorize-failure.sh — Classify CI failure output and emit a JSON summary artifact
# Usage: ./scripts/categorize-failure.sh <log-file> <output-json>
# Closes: #608

set -euo pipefail

LOG_FILE="${1:-}"
OUTPUT_JSON="${2:-ci-failure-summary.json}"

if [ -z "$LOG_FILE" ] || [ ! -f "$LOG_FILE" ]; then
  echo "Usage: $0 <log-file> <output-json>"
  exit 1
fi

LOG_CONTENT=$(cat "$LOG_FILE")

# --- Category detection ---
CATEGORY="unknown"
DETAILS=""

if echo "$LOG_CONTENT" | grep -qiE "(eslint|tslint|prettier|lint error|lint warning)"; then
  CATEGORY="lint"
  DETAILS=$(echo "$LOG_CONTENT" | grep -iE "(eslint|tslint|prettier|lint error|lint warning)" | head -5 | tr '\n' '|')

elif echo "$LOG_CONTENT" | grep -qiE "(TS[0-9]+|type error|typescript error|typecheck)"; then
  CATEGORY="type"
  DETAILS=$(echo "$LOG_CONTENT" | grep -iE "(TS[0-9]+|type error|typescript error)" | head -5 | tr '\n' '|')

elif echo "$LOG_CONTENT" | grep -qiE "(test failed|FAIL|● |jest|cargo test|assertion failed)"; then
  CATEGORY="test"
  DETAILS=$(echo "$LOG_CONTENT" | grep -iE "(test failed|FAIL|● |assertion failed)" | head -5 | tr '\n' '|')

elif echo "$LOG_CONTENT" | grep -qiE "(build failed|error\[E|compilation error|cargo build|npm run build)"; then
  CATEGORY="build"
  DETAILS=$(echo "$LOG_CONTENT" | grep -iE "(build failed|error\[E|compilation error)" | head -5 | tr '\n' '|')

elif echo "$LOG_CONTENT" | grep -qiE "(ECONNREFUSED|ETIMEDOUT|network error|fetch failed|dns lookup)"; then
  CATEGORY="network"
  DETAILS=$(echo "$LOG_CONTENT" | grep -iE "(ECONNREFUSED|ETIMEDOUT|network error|fetch failed)" | head -5 | tr '\n' '|')

elif echo "$LOG_CONTENT" | grep -qiE "(npm ERR!|peer dep|missing dependency|cannot find module|module not found)"; then
  CATEGORY="dependency"
  DETAILS=$(echo "$LOG_CONTENT" | grep -iE "(npm ERR!|peer dep|missing dependency|cannot find module|module not found)" | head -5 | tr '\n' '|')
fi

# --- Emit JSON ---
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
WORKFLOW="${GITHUB_WORKFLOW:-local}"
RUN_ID="${GITHUB_RUN_ID:-0}"
JOB="${GITHUB_JOB:-unknown}"
SHA="${GITHUB_SHA:-unknown}"

cat > "$OUTPUT_JSON" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "workflow": "$WORKFLOW",
  "run_id": "$RUN_ID",
  "job": "$JOB",
  "sha": "$SHA",
  "category": "$CATEGORY",
  "details": "$DETAILS",
  "log_file": "$LOG_FILE"
}
EOF

echo "Failure category: $CATEGORY"
echo "Summary written to: $OUTPUT_JSON"
cat "$OUTPUT_JSON"
