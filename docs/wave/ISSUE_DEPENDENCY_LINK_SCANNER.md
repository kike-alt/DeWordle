# Issue Dependency-Link Scanner

**Script:** `scripts/scan-issue-dependency-links.js`
**Workflow:** `.github/workflows/issue-dependency-link-scanner.yml`

## Purpose

Extends the single-issue `validate-dependency-links.js` to scan **all open
issues** in the repository. It finds broken issue references, self-referential
links, and empty dependency sections so maintainers can fix stale backlog items
proactively.

## How it works

1. Fetches every open, non-PR issue via the GitHub REST API.
2. For each issue it:
   - Locates `## Dependencies`, `## Blocked By`, `## Depends On`, or `## Blockers` sections.
   - Extracts bare `#NNN`, `owner/repo#NNN`, and full GitHub URL references.
   - Checks that each referenced issue exists and is not a self-reference.
3. Prints an actionable text report (or JSON with `OUTPUT_JSON=true`).
4. Exits `1` if any issues are flagged (unless `DRY_RUN=true`).

## Running locally

```bash
GITHUB_TOKEN=<pat> GITHUB_REPO=owner/repo node scripts/scan-issue-dependency-links.js
```

Add `DRY_RUN=true` to see the report without a non-zero exit code, or
`OUTPUT_JSON=true` for machine-readable output suitable for further tooling.

## Schedule

The workflow runs every day at **06:00 UTC** and can also be triggered manually
via `workflow_dispatch` (supports `dry_run` and `output_json` inputs).

## Interpreting the report

| Flag | Meaning | Suggested fix |
|---|---|---|
| ✗ Broken reference | The referenced issue number was not found | Correct the number or remove the stale link |
| ✗ Self-reference | Issue references itself | Remove the reference |
| ⚠ Malformed section | Dependency heading exists but has no references | Add references or remove the empty section |
