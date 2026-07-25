#!/usr/bin/env bash
# check-workflow-timeouts.sh — Policy check: every CI job must declare timeout-minutes.
#
# Usage:
#   ./scripts/check-workflow-timeouts.sh [workflow-dir]
#
# Default workflow-dir: .github/workflows
#
# Exit codes:
#   0  All jobs have timeout-minutes set (or are in the allowlist)
#   1  One or more jobs are missing timeout-minutes

set -euo pipefail

WORKFLOW_DIR="${1:-$(cd "$(dirname "$0")/.." && pwd)/.github/workflows}"

if [[ ! -d "$WORKFLOW_DIR" ]]; then
  echo "Workflow directory not found: $WORKFLOW_DIR"
  exit 1
fi

# ---------------------------------------------------------------------------
# Allowlist: jobs that are explicitly exempted from the timeout requirement.
# Format: "workflow-filename:job-id"  (filename without path)
# Add entries here with a rationale comment.
# ---------------------------------------------------------------------------
ALLOWLIST=(
  # Example (remove when real exceptions are added):
  # "some-workflow.yml:long-running-job"  # Rationale: ...
)

is_allowed() {
  local file="$1" job="$2"
  local key="${file}:${job}"
  for entry in "${ALLOWLIST[@]:-}"; do
    [[ "$entry" == "$key" ]] && return 0
  done
  return 1
}

FAILED=0

for workflow_file in "$WORKFLOW_DIR"/*.yml "$WORKFLOW_DIR"/*.yaml; do
  [[ -f "$workflow_file" ]] || continue
  filename="$(basename "$workflow_file")"

  # Parse only the jobs: section.
  # State: 0=before jobs, 1=inside jobs section
  in_jobs=0
  current_job=""
  has_timeout=0

  while IFS= read -r line; do
    # Detect top-level "jobs:" key (no leading spaces)
    if [[ "$line" =~ ^jobs:[[:space:]]*$ ]]; then
      in_jobs=1
      continue
    fi

    # Any other top-level key (no leading spaces) ends the jobs section
    if [[ "$in_jobs" -eq 1 && "$line" =~ ^[a-zA-Z_][a-zA-Z0-9_-]*:[[:space:]]* && ! "$line" =~ ^[[:space:]] ]]; then
      # Flush last job before leaving jobs section
      if [[ -n "$current_job" && "$has_timeout" -eq 0 ]]; then
        if ! is_allowed "$filename" "$current_job"; then
          echo "::error file=$filename::Job '$current_job' is missing timeout-minutes"
          FAILED=1
        fi
      fi
      in_jobs=0
      current_job=""
      has_timeout=0
      continue
    fi

    [[ "$in_jobs" -eq 0 ]] && continue

    # Detect job ID: exactly 2-space indent, identifier followed by colon
    if [[ "$line" =~ ^[[:space:]]{2}([a-zA-Z0-9_-]+):[[:space:]]*$ ]]; then
      # Flush previous job
      if [[ -n "$current_job" && "$has_timeout" -eq 0 ]]; then
        if ! is_allowed "$filename" "$current_job"; then
          echo "::error file=$filename::Job '$current_job' is missing timeout-minutes"
          FAILED=1
        fi
      fi
      current_job="${BASH_REMATCH[1]}"
      has_timeout=0
      continue
    fi

    # Detect timeout-minutes anywhere inside the current job block
    if [[ "$line" =~ timeout-minutes ]]; then
      has_timeout=1
    fi
  done < "$workflow_file"

  # Flush last job
  if [[ "$in_jobs" -eq 1 && -n "$current_job" && "$has_timeout" -eq 0 ]]; then
    if ! is_allowed "$filename" "$current_job"; then
      echo "::error file=$filename::Job '$current_job' is missing timeout-minutes"
      FAILED=1
    fi
  fi
done

if [[ "$FAILED" -ne 0 ]]; then
  echo ""
  echo "Policy violation: one or more jobs are missing timeout-minutes."
  echo "Add 'timeout-minutes: <N>' to each job, or add an allowlist entry"
  echo "with rationale in scripts/check-workflow-timeouts.sh."
  exit 1
fi

echo "All workflow jobs have timeout-minutes set."
