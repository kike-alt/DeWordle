# Oversized Issue Split Suggester

**Script:** `scripts/oversized-issue-split-suggester.js`
**Workflow:** `.github/workflows/oversized-issue-split-suggester.yml`

## Purpose

Some backlog items are too broad for a single contributor cycle. This tool
scans all open issues and surfaces split candidates using five heuristics,
then proposes concrete seam suggestions — without modifying any GitHub issue.

## Heuristics

| Heuristic | Condition | Default threshold |
|---|---|---|
| `body_length` | Issue body exceeds character limit | 1500 chars |
| `ac_count` | More than N acceptance-criteria checkbox items | 5 items |
| `multi_track` | Issue carries more than one `track:*` label | 2 tracks |
| `blocker_count` | Depends on ≥ N blocking issues | 3 blockers |
| `size_label` | Carries `size:L` or `size:XL` label | — |

All thresholds are tunable via env vars: `BODY_CHARS_THRESHOLD`, `AC_COUNT_THRESHOLD`, `BLOCKERS_THRESHOLD`.

## Running locally

```bash
GITHUB_TOKEN=<pat> GITHUB_REPO=owner/repo node scripts/oversized-issue-split-suggester.js
```

Use `DRY_RUN=true` (default) to print the report without failing CI, or
`OUTPUT_JSON=true` for machine-readable output.

## Output example

```
=== Oversized Issue Split Suggester ===
Scanned:    42 open issues
Candidates: 2 issues flagged for potential split

Issue #17: Implement full Soroban migration
  URL: https://github.com/...
  Triggers:
    • [multi_track] Spans 3 tracks: track:FE, track:BE, track:SC
    • [ac_count] 8 acceptance criteria items (threshold: 5)
  Suggested split seams:
    → Split acceptance criteria into two issues: first 4 items in one issue, remaining in another.
    → Create one child issue per track label so each can be claimed independently.
```

## Schedule

Runs every Monday at **07:00 UTC** and on-demand via `workflow_dispatch`.
The workflow defaults `DRY_RUN=true` so it never fails CI, serving as an
informational report only.
