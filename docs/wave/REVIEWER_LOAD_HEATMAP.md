# Reviewer Load Heatmap

**Script:** `scripts/reviewer-load-heatmap.js`
**Workflow:** `.github/workflows/reviewer-load-heatmap.yml`

## Purpose

Generates a visual heatmap of reviewer and maintainer workload grouped by
track label, based on open PR review requests and open issue assignments.
Helps maintainers spot overloaded contributors at a glance and rebalance
assignments proactively.

## How it works

1. Fetches all open pull requests and open issues from the repo.
2. Filters to items updated within the `LOOKBACK_DAYS` activity window (default: 30 days).
3. Groups contributors by track label (`track:*`). Items with no track label land in `UNTRACKED`.
4. For each track, shows each contributor's PR review count, issue assignment count, and a heat symbol.

## Heat legend

| Symbol | Meaning |
|--------|---------|
| `░░`   | No load |
| `▒▒`   | Light (1–2) |
| `▓▓`   | Medium (3–5) |
| `██`   | Heavy (6+) — consider rebalancing |

## Running locally

```bash
GITHUB_TOKEN=<pat> GITHUB_REPO=owner/repo node scripts/reviewer-load-heatmap.js
```

Set `LOOKBACK_DAYS=7` for a tighter window, or `OUTPUT_JSON=true` for
machine-readable output suitable for dashboards or further tooling.

## Example output

```
=== Reviewer Load Heatmap ===
Window: last 30 days
Tracks: 3

Legend:  ░░ none   ▒▒ light (1-2)   ▓▓ medium (3-5)   ██ heavy (6+)

── AI/AUTOMATION ──────────────────────────────
  Contributor               Heat   PRs    Issues   Total
  @automation-lead          ██     5      3        8
  @docs-reviewer            ▒▒     1      1        2

── FE ──────────────────────────────
  Contributor               Heat   PRs    Issues   Total
  @fe-maintainer            ▓▓     3      2        5
```

## Schedule

Runs every Monday at **08:00 UTC** and on-demand via `workflow_dispatch`.
The `lookback_days` input allows ad-hoc narrower windows for sprint reviews.

## Interpreting and acting on the report

- **██ heavy** reviewers: check whether PRs can be redistributed or whether
  the contributor needs bandwidth relief.
- **UNTRACKED** items: issues or PRs missing a `track:*` label — add labels
  for accurate routing.
- Compare week-over-week runs to identify sustained overload patterns.
