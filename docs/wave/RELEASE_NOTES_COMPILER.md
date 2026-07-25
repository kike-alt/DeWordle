# Release-Note Draft Compiler

**Script:** `scripts/compile-release-notes.js`
**Workflow:** `.github/workflows/compile-release-notes.yml`

## Purpose

Automates the first draft of a release note by fetching merged pull requests,
classifying them by label and changed file path, and producing a structured
Markdown document that maintainers can edit into a final human-facing summary.

## How it works

1. Fetches all closed PRs merged into `TARGET_BRANCH` since `SINCE_TAG` (or last 30 days).
2. Classifies each PR into a release-note category based on its labels.
3. Enriches each entry with the affected areas derived from changed file paths.
4. Emits a structured Markdown draft (or JSON with `OUTPUT_JSON=true`).

## Label → Category mapping

| Label pattern | Category |
|---|---|
| `breaking` | ⚠️ Breaking Changes |
| `feat`, `feature`, `enhancement` | ✨ New Features |
| `fix`, `bug` | 🐛 Bug Fixes |
| `doc`, `docs` | 📖 Documentation |
| `tool`, `automation`, `ci`, `workflow`, `script` | 🔧 Tooling & Automation |
| `chore`, `refactor`, `style`, `cleanup` | 🧹 Chores & Refactors |
| anything else | 🔀 Other |

## Path → Area mapping

| Path prefix | Area |
|---|---|
| `frontend/` | Frontend |
| `backend/` | Backend |
| `soroban/` | Onchain / Soroban |
| `scripts/` | Tooling / Automation |
| `docs/` | Documentation |
| `.github/` | CI / Workflows |
| `onchain/` | Onchain (legacy) |
| other | General |

## Running locally

```bash
# Last 30 days
GITHUB_TOKEN=<pat> GITHUB_REPO=owner/repo node scripts/compile-release-notes.js

# Since a specific tag
GITHUB_TOKEN=<pat> GITHUB_REPO=owner/repo SINCE_TAG=v1.2.0 node scripts/compile-release-notes.js

# JSON output for tooling
OUTPUT_JSON=true GITHUB_TOKEN=<pat> GITHUB_REPO=owner/repo node scripts/compile-release-notes.js
```

## Triggering the workflow

The workflow runs automatically on `v*` tag pushes and can be triggered manually
via `workflow_dispatch` with optional `since_tag`, `target_branch`, and
`output_json` inputs.

## Example output

```markdown
# Release Notes Draft

> **Auto-generated** on 2026-06-23 from merged PRs since `v1.2.0`.
> Edit this document before publishing.

## ✨ New Features

- **[#102](https://github.com/org/repo/pull/102)** Add Soroban wallet integration _(Frontend, Onchain / Soroban)_

## 🐛 Bug Fixes

- **[#99](https://github.com/org/repo/pull/99)** Fix score persistence on refresh _(Backend)_

## 🔧 Tooling & Automation

- **[#101](https://github.com/org/repo/pull/101)** Add reviewer load heatmap script _(Tooling / Automation, CI / Workflows)_
```

## Editing the draft

1. Copy the output to `CHANGELOG.md` or a new release notes file.
2. Remove low-signal entries (pure chores, trivial refactors).
3. Rewrite PR titles into user-facing language where needed.
4. Add a summary paragraph at the top.
5. Publish to GitHub Releases or the project changelog.
