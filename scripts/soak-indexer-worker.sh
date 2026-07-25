#!/usr/bin/env bash
# soak-indexer-worker.sh
# Runs the indexer worker soak profile and emits a structured report.
# Usage: bash scripts/soak-indexer-worker.sh [--ci]
set -euo pipefail

REPORT_FILE="${REPORT_FILE:-/tmp/soak-report-$(date +%s).log}"
CI_MODE="${1:-}"

echo "=== Indexer Worker Soak Run ===" | tee "$REPORT_FILE"
echo "started: $(date -u +%Y-%m-%dT%H:%M:%SZ)" | tee -a "$REPORT_FILE"

cd "$(git rev-parse --show-toplevel)/backend"

npx jest --testPathPattern="indexer-worker.soak" --verbose --forceExit 2>&1 | tee -a "$REPORT_FILE"

EXIT=${PIPESTATUS[0]}

echo "" | tee -a "$REPORT_FILE"
echo "finished: $(date -u +%Y-%m-%dT%H:%M:%SZ)" | tee -a "$REPORT_FILE"
echo "report:   $REPORT_FILE" | tee -a "$REPORT_FILE"

if [[ "$CI_MODE" == "--ci" && $EXIT -ne 0 ]]; then
  echo "SOAK FAILED – see $REPORT_FILE" >&2
fi

exit $EXIT
