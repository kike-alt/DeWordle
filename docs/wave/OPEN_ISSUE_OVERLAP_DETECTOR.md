# Open-Issue Overlap Detector

**ID:** AI/AUTOMATION-201  
**Track:** AI/AUTOMATION  
**Script:** `scripts/open-issue-overlap-detector.js`

## Purpose

Before publishing a new batch of issues, maintainers can use this tool to detect overlap with existing open issues. It parses proposed issue metadata and scores each one against all open issues using configurable similarity heuristics.

## How It Works

1. Accepts a JSON file (or stdin pipe) containing proposed issue definitions.
2. Fetches all open issues from the repository via the GitHub API.
3. For each proposed issue, computes similarity scores against every open issue:
   - **Title overlap** (40% weight) — Jaccard-like token overlap.
   - **Body similarity** (35% weight) — Cosine similarity of token frequency vectors.
   - **Label overlap** (25% weight) — Jaccard index on label names.
4. Issues with a combined score at or above the threshold are flagged.
5. Emits a report maintainers can review.

## Usage

```bash
# Pipe proposed issues as JSON
echo '[{"title": "Add user login", "body": "...", "labels": [{"name": "enhancement"}]}]' \
  | GITHUB_TOKEN=ghp_xxx GITHUB_REPO=org/repo node scripts/open-issue-overlap-detector.js

# Or pass a JSON file
GITHUB_TOKEN=ghp_xxx GITHUB_REPO=org/repo \
  node scripts/open-issue-overlap-detector.js proposed-issues.json
```

## Configuration

| Env Var | Default | Description |
|---|---|---|
| `GITHUB_TOKEN` | — | Token with repo read permissions |
| `GITHUB_REPO` | — | `owner/repo` format |
| `SIMILARITY_THRESHOLD` | `0.4` | Minimum combined score (0–1) to flag |
| `OUTPUT_JSON` | `false` | Emit machine-readable JSON |
| `DRY_RUN` | `false` | Print report without non-zero exit |

## Interpreting Output

- **combined ≥ 0.7**: HIGH — strong overlap, review before adding.
- **combined ≥ 0.5**: MEDIUM — significant overlap, consider merging or clarifying scope.
- **combined ≥ 0.4**: LOW — partial overlap, review suggested issues for edge cases.

## Example Output

```
=== Open-Issue Overlap Detection Report ===
Threshold: ≥ 0.4
Proposed issues analysed: 2

Proposed: "Add user authentication"
  Recommendation: HIGH: Strong overlap detected
  Overlapping issues (1):
    #42 "Implement user login system" — combined=0.73
      https://github.com/org/repo/issues/42
```
