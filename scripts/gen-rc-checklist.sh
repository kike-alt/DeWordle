#!/usr/bin/env bash
# gen-rc-checklist.sh
# Generates a markdown release-candidate checklist from open GitHub issues
# for a given milestone (M5 or M6).
#
# Usage: ./scripts/gen-rc-checklist.sh <milestone> [repo]
#   milestone  M5 or M6
#   repo       owner/repo  (default: kike-alt/DeWordle)
#
# Requires: gh CLI authenticated

set -euo pipefail

MILESTONE="${1:-M5}"
REPO="${2:-kike-alt/DeWordle}"
OUTPUT="docs/wave/RC_CHECKLIST_${MILESTONE}.md"

# Validate milestone
if [[ "$MILESTONE" != "M5" && "$MILESTONE" != "M6" ]]; then
  echo "ERROR: milestone must be M5 or M6, got '$MILESTONE'" >&2
  exit 1
fi

echo "Fetching open issues for milestone $MILESTONE from $REPO..."

# Fetch open issues for the milestone
ISSUES=$(gh issue list \
  --repo "$REPO" \
  --milestone "$MILESTONE" \
  --state open \
  --json number,title,labels,assignees \
  --limit 200)

ISSUE_COUNT=$(echo "$ISSUES" | jq 'length')

# Build markdown
{
  echo "# Release Candidate Checklist — $MILESTONE"
  echo ""
  echo "> Generated: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "> Repo: $REPO | Milestone: $MILESTONE | Open issues: $ISSUE_COUNT"
  echo ""
  echo "## Open Issues"
  echo ""

  if [[ "$ISSUE_COUNT" -eq 0 ]]; then
    echo "_No open issues — milestone is complete._"
  else
    echo "$ISSUES" | jq -r '.[] |
      "- [ ] #\(.number) \(.title)" +
      (if (.labels | length) > 0 then " `" + ([.labels[].name] | join("` `")) + "`" else "" end)'
  fi

  echo ""
  echo "## Critical Labels Summary"
  echo ""
  echo "$ISSUES" | jq -r '
    [.[].labels[].name] | group_by(.) | map({label: .[0], count: length}) |
    sort_by(-.count) | .[] |
    "- **\(.label)**: \(.count) open issue(s)"
  '

  echo ""
  echo "## Validation Commands"
  echo ""
  echo '```bash'
  echo "# Verify frontend build"
  echo "npm run verify:frontend"
  echo ""
  echo "# Verify backend build"
  echo "npm run verify:backend"
  echo ""
  echo "# Check Soroban workspace"
  echo "cd soroban && cargo check --workspace"
  echo '```'
} > "$OUTPUT"

echo "Checklist written to $OUTPUT"
