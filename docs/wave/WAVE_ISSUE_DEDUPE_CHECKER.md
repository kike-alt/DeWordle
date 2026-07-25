# Wave Issue Dedupe Checker

**ID:** AI/AUTOMATION-202  
**Track:** AI/AUTOMATION  
**Script:** `scripts/wave-issue-dedupe-checker.js`

## Purpose

Maintainers need an explicit dedupe tool that checks both open issues and recently completed work before issuing new backlog batches. This tool compares proposed issue definitions against open and recently closed issues using configurable matching rules.

## How It Works

1. Accepts a JSON file (or stdin) of proposed issue definitions.
2. Fetches all open issues and recently closed issues (default: 90 days) via the GitHub API.
3. For each proposed issue, computes a dedupe score against every candidate using:
   - **Title similarity** (35% weight) — token overlap.
   - **Body similarity** (25% weight) — cosine similarity.
   - **Label overlap** (15% weight) — Jaccard index.
   - **Track match** (+0.15) — if same `track:` label.
   - **Difficulty match** (+0.10) — if same `difficulty:` label.
4. Reports high-confidence duplicates (≥ 0.7) separately from low-confidence suggestions (≥ 0.35).

## Usage

```bash
GITHUB_TOKEN=ghp_xxx GITHUB_REPO=org/repo \
  node scripts/wave-issue-dedupe-checker.js proposed-issues.json
```

## Configuration

| Env Var | Default | Description |
|---|---|---|
| `GITHUB_TOKEN` | — | Token with repo read permissions |
| `GITHUB_REPO` | — | `owner/repo` format |
| `CLOSED_WINDOW_DAYS` | `90` | Days back to scan closed issues |
| `HIGH_CONFIDENCE` | `0.7` | Threshold for high-confidence duplicate |
| `LOW_CONFIDENCE` | `0.35` | Threshold for low-confidence suggestion |
| `OUTPUT_JSON` | `false` | Emit machine-readable JSON |
| `DRY_RUN` | `false` | Print report without non-zero exit |

## Interpreting Output

- **High-confidence**: Strong match — likely a duplicate. Address before adding.
- **Low-confidence**: Partial similarity — edge case to review manually.
- **No matches**: Safe to add as a new issue.

## Example Output

```
=== Wave Issue Dedupe Check Report ===
High-confidence threshold: ≥ 0.7
Low-confidence threshold: ≥ 0.35
Proposed issues analysed: 1

Total high-confidence duplicates: 1
Total low-confidence suggestions: 0

Proposed: "Add user authentication"
  ⚠ HIGH-CONFIDENCE DUPLICATES:
    #42 [open] "Implement user login system" — score=0.78
      https://github.com/org/repo/issues/42
```
