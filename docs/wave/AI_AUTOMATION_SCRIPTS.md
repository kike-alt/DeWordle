# AI/AUTOMATION Scripts — Wave Maintainer Tooling

This document covers the four automation scripts added in the AI/AUTOMATION track (issues #859, #860, #862, #866).

---

## gen-acceptance-checklist.js — #859

Generates acceptance-checklist suggestions from changed files or tracked module metadata.

**Usage**
```bash
# From changed files vs main
node scripts/gen-acceptance-checklist.js

# From a specific base branch
node scripts/gen-acceptance-checklist.js --base develop

# From explicit file list
node scripts/gen-acceptance-checklist.js --files scripts/foo.js,backend/src/bar.ts

# JSON output
node scripts/gen-acceptance-checklist.js --json
```

**Output** — Markdown checklist clearly marked as a suggestion (`<!-- SUGGESTION -->`). Edit freely before use.

**Run tests**
```bash
node scripts/gen-acceptance-checklist.test.js
```

---

## sync-adr-backlinks.js — #860

Scans `docs/` and `docs/adr/` for missing reciprocal backlink relationships and generates a maintainer-facing report.

**Usage**
```bash
# Report only (read-only)
node scripts/sync-adr-backlinks.js

# Custom paths
node scripts/sync-adr-backlinks.js --docs docs --adr docs/adr

# Auto-fix: append missing backlinks to ADR files
node scripts/sync-adr-backlinks.js --fix

# JSON output
node scripts/sync-adr-backlinks.js --json
```

**What it checks**
- Every ADR referenced by a doc should link back to that doc.
- Every ADR should be referenced by at least one doc page (orphan detection).

**Run tests**
```bash
node scripts/sync-adr-backlinks.test.js
```

---

## find-merged-open-issues.js — #862

Compares merged PRs against open issues to surface likely closure candidates.

**Usage**
```bash
GITHUB_TOKEN=<token> node scripts/find-merged-open-issues.js --repo kike-alt/DeWordle

# Limit PRs inspected
GITHUB_TOKEN=<token> node scripts/find-merged-open-issues.js --limit 50

# JSON output
GITHUB_TOKEN=<token> node scripts/find-merged-open-issues.js --json
```

**Output separation**
- **High confidence** — PR body/title contains `Closes #N`, `Fixes #N`, or `Resolves #N`.
- **Low confidence** — Issue number appears in PR title or branch name; needs manual review.

**Run tests** (no token required)
```bash
node scripts/find-merged-open-issues.test.js
```

---

## export-issue-snapshot.js — #866

Exports issue inventory snapshots to JSON and/or CSV. **Read-only — does not mutate GitHub state.**

**Usage**
```bash
# Export all open issues (JSON + CSV)
GITHUB_TOKEN=<token> node scripts/export-issue-snapshot.js

# Filter by label
GITHUB_TOKEN=<token> node scripts/export-issue-snapshot.js --label "track:AI/AUTOMATION"

# Closed issues, CSV only
GITHUB_TOKEN=<token> node scripts/export-issue-snapshot.js --state closed --format csv

# Custom output directory
GITHUB_TOKEN=<token> node scripts/export-issue-snapshot.js --out reports/snapshots
```

**Output files** are written to `./snapshots/` (or `--out` dir) with timestamped names so runs never overwrite each other:
```
snapshots/issues-open-2026-06-25T12-00-00.json
snapshots/issues-open-2026-06-25T12-00-00.csv
```

**Regenerating without mutating state** — re-run at any time with the same flags. The script is purely read-only.

**Run tests** (no token required)
```bash
node scripts/find-merged-open-issues.test.js
```

---

## Environment Variables

| Variable | Required by | Purpose |
|----------|-------------|---------|
| `GITHUB_TOKEN` | `find-merged-open-issues.js`, `export-issue-snapshot.js` | GitHub API read access |
| `GITHUB_REPO` | Both above | Fallback repo (e.g. `kike-alt/DeWordle`) |
| `GITHUB_BASE_REF` | `gen-acceptance-checklist.js` | Base branch for diff (set automatically in CI) |
