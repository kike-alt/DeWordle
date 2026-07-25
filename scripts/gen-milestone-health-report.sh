#!/usr/bin/env bash
# gen-milestone-health-report.sh
# Generate milestone health summaries for Wave 5 maintainer triage.
#
# Usage:
#   ./scripts/gen-milestone-health-report.sh <milestone> [repo] [label]
#
# Arguments:
#   milestone  M3 | M4 | M5 | M6
#   repo       owner/repo   (default: kike-alt/DeWordle)
#   label      label name   (default: wave:5)
#
# Outputs:
#   docs/wave/MILESTONE_HEALTH_<milestone>.md
#   docs/wave/MILESTONE_HEALTH_<milestone>.json
#
# Requires:
#   gh CLI authenticated
#   jq

set -euo pipefail

MILESTONE="${1:-M5}"
REPO="${2:-kike-alt/DeWordle}"
LABEL_FILTER="${3:-wave:5}"
OUTPUT_MD="docs/wave/MILESTONE_HEALTH_${MILESTONE}.md"
OUTPUT_JSON="docs/wave/MILESTONE_HEALTH_${MILESTONE}.json"
GENERATED_AT="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

case "$MILESTONE" in
  M3|M4|M5|M6) ;;
  *)
    echo "ERROR: milestone must be one of M3, M4, M5, M6 (got '$MILESTONE')" >&2
    exit 1
    ;;
esac

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: gh CLI is required but was not found in PATH" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required but was not found in PATH" >&2
  exit 1
fi

echo "Fetching issues for milestone $MILESTONE from $REPO..."

RAW_ISSUES="$(gh issue list \
  --repo "$REPO" \
  --milestone "$MILESTONE" \
  --state all \
  --json number,title,state,labels,assignees,milestone,createdAt,closedAt,url \
  --limit 200)"

FILTERED_ISSUES="$(printf '%s\n' "$RAW_ISSUES" | jq --arg label "$LABEL_FILTER" '
  if $label == "" then
    .
  else
    map(select(([.labels[].name] | index($label)) != null))
  end
')"

REPORT_JSON="$(printf '%s\n' "$FILTERED_ISSUES" | jq --arg generatedAt "$GENERATED_AT" --arg repo "$REPO" --arg milestone "$MILESTONE" --arg label "$LABEL_FILTER" '
  def normalize_state: (.state | ascii_downcase);
  def label_names: [.labels[].name];
  def first_label($prefix): ([label_names[] | select(startswith($prefix))][0] // null);
  def is_blocked: ((label_names | index("blocked")) != null or (label_names | index("status:blocked")) != null);
  def is_cross_track: ((label_names | index("cross-track")) != null);
  def assignee_logins: [.assignees[].login];
  def normalized_issues:
    map({
      number,
      title,
      url,
      state: normalize_state,
      createdAt,
      closedAt,
      labels: label_names,
      assignees: assignee_logins,
      track: ((first_label("track:") // "track:unlabeled") | sub("^track:"; "")),
      blocked: is_blocked,
      crossTrack: is_cross_track
    });

  normalized_issues as $issues |
  {
    generated_at: $generatedAt,
    repo: $repo,
    milestone: $milestone,
    label_filter: ($label | if . == "" then null else . end),
    summary: {
      total: ($issues | length),
      open: ($issues | map(select(.state == "open")) | length),
      closed: ($issues | map(select(.state == "closed")) | length),
      blocked_open: ($issues | map(select(.state == "open" and .blocked)) | length),
      cross_track_total: ($issues | map(select(.crossTrack)) | length),
      cross_track_open: ($issues | map(select(.state == "open" and .crossTrack)) | length)
    },
    track_summary: (
      $issues
      | group_by(.track)
      | map({
          track: .[0].track,
          total: length,
          open: (map(select(.state == "open")) | length),
          closed: (map(select(.state == "closed")) | length),
          blocked_open: (map(select(.state == "open" and .blocked)) | length),
          cross_track_total: (map(select(.crossTrack)) | length)
        })
      | sort_by(.track)
    ),
    blocked_issues: (
      $issues
      | map(select(.state == "open" and .blocked))
      | sort_by(.track, .number)
    ),
    cross_track_issues: (
      $issues
      | map(select(.crossTrack))
      | sort_by(.state, .track, .number)
    ),
    issues: ($issues | sort_by(.state, .track, .number))
  }
')"

printf '%s\n' "$REPORT_JSON" > "$OUTPUT_JSON"

echo "Writing markdown summary to $OUTPUT_MD..."

{
  echo "# Milestone Health Report — $MILESTONE"
  echo ""
  echo "> Generated: $GENERATED_AT"
  echo "> Repo: $REPO"
  echo "> Milestone: $MILESTONE"
  if [[ -n "$LABEL_FILTER" ]]; then
    echo "> Label filter: \`$LABEL_FILTER\`"
  else
    echo "> Label filter: _none_"
  fi
  echo ""
  echo "## Summary"
  echo ""
  printf '%s\n' "$REPORT_JSON" | jq -r '
    .summary |
    "- Total issues: \(.total)\n" +
    "- Open: \(.open)\n" +
    "- Closed: \(.closed)\n" +
    "- Blocked (open): \(.blocked_open)\n" +
    "- Cross-track (total): \(.cross_track_total)\n" +
    "- Cross-track (open): \(.cross_track_open)"
  '
  echo ""
  echo "## Track Breakdown"
  echo ""
  echo "| Track | Total | Open | Closed | Blocked (open) | Cross-track |"
  echo "|---|---:|---:|---:|---:|---:|"
  printf '%s\n' "$REPORT_JSON" | jq -r '
    .track_summary[] |
    "| \(.track) | \(.total) | \(.open) | \(.closed) | \(.blocked_open) | \(.cross_track_total) |"
  '
  echo ""
  echo "## Blocked Issues"
  echo ""
  BLOCKED_COUNT="$(printf '%s\n' "$REPORT_JSON" | jq '.blocked_issues | length')"
  if [[ "$BLOCKED_COUNT" -eq 0 ]]; then
    echo "_No open blocked issues for this milestone/filter._"
  else
    printf '%s\n' "$REPORT_JSON" | jq -r '
      .blocked_issues[] |
      "- #\(.number) \(.title) — track: \(.track)" +
      (if (.assignees | length) > 0 then " — assignees: " + (.assignees | join(", ")) else "" end)
    '
  fi
  echo ""
  echo "## Cross-Track Issues"
  echo ""
  CROSS_TRACK_COUNT="$(printf '%s\n' "$REPORT_JSON" | jq '.cross_track_issues | length')"
  if [[ "$CROSS_TRACK_COUNT" -eq 0 ]]; then
    echo "_No cross-track issues for this milestone/filter._"
  else
    printf '%s\n' "$REPORT_JSON" | jq -r '
      .cross_track_issues[] |
      "- #\(.number) \(.title) — state: \(.state) — track: \(.track)"
    '
  fi
  echo ""
  echo "## Issue Snapshot"
  echo ""
  echo "| Issue | State | Track | Blocked | Cross-track | Assignees | Title |"
  echo "|---|---|---|---|---|---|---|"
  printf '%s\n' "$REPORT_JSON" | jq -r '
    .issues[] |
    "| #\(.number) | \(.state) | \(.track) | " +
    (if .blocked then "yes" else "no" end) +
    " | " +
    (if .crossTrack then "yes" else "no" end) +
    " | " +
    (if (.assignees | length) > 0 then (.assignees | join(", ")) else "—" end) +
    " | " +
    (.title | gsub("\\|"; "\\\\|")) +
    " |"
  '
} > "$OUTPUT_MD"

echo "JSON summary written to $OUTPUT_JSON"
echo "Markdown summary written to $OUTPUT_MD"
