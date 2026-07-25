# Stale PR Behind-Main Notifier

**ID:** AI/AUTOMATION-203  
**Track:** AI/AUTOMATION  
**Script:** `scripts/stale-pr-behind-main-notifier.js`

## Purpose

Wave 6 is explicitly stricter about stale PRs. This automation detects PR branches that have fallen materially behind `main` and have had no activity for a configurable window, then notifies maintainers and contributors in a predictable format.

## How It Works

1. Fetches all open PRs via the GitHub API.
2. Skips PRs with the exemption label (default: `wip`).
3. For each remaining PR, checks:
   - **Staleness**: Has the PR had no activity for ≥ `STALE_DAYS`?
   - **Behind count**: Is the PR ≥ `BEHIND_THRESHOLD` commits behind `main`?
4. Posts a structured comment with a checklist of required actions.
5. Skips PRs that have already been notified (checks for marker in comments).

## Usage

```bash
GITHUB_TOKEN=ghp_xxx GITHUB_REPO=org/repo \
  node scripts/stale-pr-behind-main-notifier.js
```

## Configuration

| Env Var | Default | Description |
|---|---|---|
| `GITHUB_TOKEN` | — | Token with repo and pull request permissions |
| `GITHUB_REPO` | — | `owner/repo` format |
| `STALE_DAYS` | `14` | Days without activity before flagging |
| `BEHIND_THRESHOLD` | `5` | Commits behind main to flag |
| `LABEL_TO_SKIP` | `wip` | Label exempting PR from staleness checks |
| `DRY_RUN` | `false` | Log without posting comments |
| `OUTPUT_JSON` | `false` | Emit machine-readable JSON |

## Notified Comment Format

The posted comment includes:

- Author and assignee(s)
- Number of commits behind main
- Checklist: rebase, resolve conflicts, re-run CI, update description
- Warning about Wave 6 closure policy
- Suppression note for `wip`-labelled PRs

## Debugging False Positives

If a PR is flagged incorrectly:

1. Check `updated_at` — the PR may have had activity not reflected in GitHub's timestamp.
2. Check the behind count — `BEHIND_THRESHOLD` may need adjustment.
3. If the PR is intentionally long-running, add the `wip` label to suppress notifications.
