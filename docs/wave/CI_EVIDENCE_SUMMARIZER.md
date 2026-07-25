# CI Evidence Summarizer

**ID:** AI/AUTOMATION-204  
**Track:** AI/AUTOMATION  
**Script:** `scripts/ci-evidence-summarizer.js`

## Purpose

Maintainers reviewing high-volume contributions benefit from a tool that summarizes the relevant CI evidence into one reusable block. This script fetches check runs, workflow runs, job details, and artifacts for a given PR and renders a structured markdown summary.

## How It Works

1. Given a PR number, fetches PR metadata from the GitHub API.
2. Gathers CI evidence:
   - **Check runs** — status checks (lint, test, build, etc.)
   - **Workflow runs** — GitHub Actions workflow executions for the head branch
   - **Job details** — individual job status and duration
   - **Artifacts** — build outputs, test reports, logs
3. Renders a structured markdown summary that can be posted as a PR comment.

## Usage

```bash
GITHUB_TOKEN=ghp_xxx GITHUB_REPO=org/repo \
  node scripts/ci-evidence-summarizer.js <pr-number>
```

## Configuration

| Env Var | Default | Description |
|---|---|---|
| `GITHUB_TOKEN` | — | Token with checks and actions read permissions |
| `GITHUB_REPO` | — | `owner/repo` format |
| `OUTPUT_JSON` | `false` | Emit machine-readable JSON |

## GitHub Actions Integration

The CI Evidence Summarizer runs automatically on every PR push (`opened`, `synchronize`, `reopened`). It posts (or updates) a comment on the PR with the summary.

### How Maintainers Should Use the Summary

1. **Review the summary before diving into CI logs** — the overview gives you pass/fail at a glance.
2. **Do not skip full review** — the summary is a convenience layer, not a replacement for checking failure details.
3. **Use JSON output for automation** — set `OUTPUT_JSON=true` to pipe into other tools or dashboards.
4. **Artifacts are linked** — downloadable test results and build outputs are included when available.

## Example Output

```
## CI Evidence Summary

**PR:** [#42](https://github.com/org/repo/pull/42) Fix login bug
**Branch:** `feature/fix` → `main`
**Head SHA:** `abc1234`
**Author:** @contributor1

### Check Runs (2 passed, 1 failed, 0 other)

- ✗ **Lint** — failure
- ✓ **Test** — success
- ✓ **Build** — success

### Workflow Runs (1)

- ✗ **CI Pipeline** — failure
  - ✗ lint (45s)
  - ✓ test (120s)
  - ✓ build (90s)
  - 📦 Artifact: `test-results` (2.0 KB)
```
