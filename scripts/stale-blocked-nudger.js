#!/usr/bin/env node
/**
 * Stale Blocked Issue Nudger
 *
 * Finds open issues with the `blocked` label that have had no activity
 * for a configurable window, then posts a templated reminder comment
 * prompting contributors to surface dependency status.
 *
 * Usage (called by GitHub Actions or locally):
 *   node scripts/stale-blocked-nudger.js
 *
 * Required env vars:
 *   GITHUB_TOKEN        - token with issues read + write permissions
 *   GITHUB_REPO         - owner/repo  (e.g. "org/dewordle")
 *
 * Optional env vars:
 *   STALE_DAYS          - inactivity threshold in days (default: 7)
 *   BLOCKED_LABEL       - label to target (default: "blocked")
 *   DRY_RUN             - set to "true" to log without posting (default: false)
 */

const https = require("https");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const STALE_DAYS = parseInt(process.env.STALE_DAYS || "7", 10);
const BLOCKED_LABEL = process.env.BLOCKED_LABEL || "blocked";
const DRY_RUN = process.env.DRY_RUN === "true";

/** Marker embedded in comments so we can detect and skip already-nudged issues
 *  within the same staleness window. */
const NUDGE_MARKER = "<!-- stale-blocked-nudger -->";

// ---------------------------------------------------------------------------
// GitHub API helpers
// ---------------------------------------------------------------------------

function apiRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "api.github.com",
      path,
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "stale-blocked-nudger-bot",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(data
          ? {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(data),
            }
          : {}),
      },
    };

    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        if (res.statusCode >= 400) {
          reject(
            new Error(`GitHub API ${res.statusCode} ${method} ${path}: ${raw}`),
          );
        } else {
          resolve(raw ? JSON.parse(raw) : {});
        }
      });
    });

    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

/** Fetch all open issues with a given label (handles pagination). */
async function fetchBlockedIssues(repo, label, token) {
  const issues = [];
  let page = 1;
  while (true) {
    const batch = await apiRequest(
      "GET",
      `/repos/${repo}/issues?state=open&labels=${encodeURIComponent(label)}&per_page=100&page=${page}`,
      null,
      token,
    );
    if (!batch.length) break;
    // GitHub issues API also returns PRs — filter them out
    issues.push(...batch.filter((i) => !i.pull_request));
    if (batch.length < 100) break;
    page++;
  }
  return issues;
}

/** Fetch the most recent comments on an issue (up to 100). */
async function fetchIssueComments(repo, issueNumber, token) {
  return apiRequest(
    "GET",
    `/repos/${repo}/issues/${issueNumber}/comments?per_page=100&direction=desc`,
    null,
    token,
  );
}

// ---------------------------------------------------------------------------
// Staleness check
// ---------------------------------------------------------------------------

/**
 * Returns true if the issue has had no activity (updated_at) for >= STALE_DAYS.
 * `updated_at` covers edits, label changes, and new comments — a good proxy
 * for "no dependency activity".
 */
function isStale(issue) {
  const updatedAt = new Date(issue.updated_at);
  const now = new Date();
  const diffMs = now - updatedAt;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= STALE_DAYS;
}

/**
 * Returns true if we already posted a nudge comment since the last update,
 * preventing duplicate nudges within the same staleness window.
 */
function alreadyNudged(comments, issueUpdatedAt) {
  const updatedAt = new Date(issueUpdatedAt);
  return comments.some(
    (c) =>
      c.body &&
      c.body.includes(NUDGE_MARKER) &&
      new Date(c.created_at) >= updatedAt,
  );
}

// ---------------------------------------------------------------------------
// Comment template
// ---------------------------------------------------------------------------

function buildNudgeComment(issue) {
  const assignees =
    issue.assignees && issue.assignees.length
      ? issue.assignees.map((a) => `@${a.login}`).join(", ")
      : "_unassigned_";

  const labels = issue.labels.map((l) => `\`${l.name}\``).join(", ");

  return [
    NUDGE_MARKER,
    "## 🔔 Stale Blocked Issue — Dependency Check",
    "",
    `This issue has been marked **\`${BLOCKED_LABEL}\`** and has had no activity for **${STALE_DAYS}+ days**.`,
    "",
    `**Assignee(s):** ${assignees}`,
    `**Labels:** ${labels}`,
    "",
    "### Dependency Status Prompts",
    "",
    "Please provide an update on the blocking dependency:",
    "",
    "- [ ] What is the current status of the blocking issue/PR?",
    "- [ ] Is there a workaround available that would unblock this?",
    "- [ ] Does the blocking dependency need to be escalated to a maintainer?",
    "- [ ] Should this issue be re-scoped or closed as no longer relevant?",
    "",
    "> If the blocker has been resolved, remove the `blocked` label and leave a brief status comment.",
    "> If this issue is no longer actionable, close it with a note.",
    "",
    "---",
    "_This is an automated reminder. No action is required if the dependency is actively being tracked._",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    console.error("Missing required env vars: GITHUB_TOKEN, GITHUB_REPO");
    process.exit(1);
  }

  console.log(
    `Config: repo=${repo} label="${BLOCKED_LABEL}" stale_days=${STALE_DAYS} dry_run=${DRY_RUN}`,
  );

  console.log(`Fetching open issues with label "${BLOCKED_LABEL}"...`);
  const blockedIssues = await fetchBlockedIssues(repo, BLOCKED_LABEL, token);
  console.log(`Found ${blockedIssues.length} blocked issue(s)`);

  let nudged = 0;
  let skippedRecent = 0;
  let skippedAlreadyNudged = 0;

  for (const issue of blockedIssues) {
    const { number, title, updated_at } = issue;

    // Skip recently updated issues
    if (!isStale(issue)) {
      console.log(`  #${number} — skipped (updated recently): ${title}`);
      skippedRecent++;
      continue;
    }

    // Check for existing nudge comment since last update
    const comments = await fetchIssueComments(repo, number, token);
    if (alreadyNudged(comments, updated_at)) {
      console.log(`  #${number} — skipped (already nudged): ${title}`);
      skippedAlreadyNudged++;
      continue;
    }

    const body = buildNudgeComment(issue);

    if (DRY_RUN) {
      console.log(`  #${number} — [DRY RUN] would post nudge: ${title}`);
      console.log("--- comment preview ---");
      console.log(body);
      console.log("---");
    } else {
      console.log(`  #${number} — posting nudge: ${title}`);
      await apiRequest(
        "POST",
        `/repos/${repo}/issues/${number}/comments`,
        { body },
        token,
      );
    }

    nudged++;
  }

  console.log(
    `\nDone. nudged=${nudged} skipped_recent=${skippedRecent} skipped_already_nudged=${skippedAlreadyNudged}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
