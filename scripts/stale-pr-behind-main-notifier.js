#!/usr/bin/env node
/**
 * Stale PR Behind-Main Notifier (AI/AUTOMATION-203)
 *
 * Detects materially stale PR branches that have fallen behind the main
 * branch and notifies maintainers or contributors in a predictable format.
 * Aligned with Wave 6 safeguards for stricter stale PR management.
 *
 * Usage:
 *   node scripts/stale-pr-behind-main-notifier.js
 *
 * Required env vars:
 *   GITHUB_TOKEN   - token with repo read permissions
 *   GITHUB_REPO    - owner/repo (e.g. "org/dewordle")
 *
 * Optional env vars:
 *   STALE_DAYS        - PRs with no activity for this many days (default: 14)
 *   BEHIND_THRESHOLD  - commits behind main to flag (default: 5)
 *   LABEL_TO_SKIP     - label that exempts a PR from staleness checks (default: "wip")
 *   DRY_RUN           - "true" to log without posting comments (default: false)
 *   OUTPUT_JSON       - "true" for machine-readable JSON
 */

"use strict";

const https = require("https");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const STALE_DAYS = parseInt(process.env.STALE_DAYS || "14", 10);
const BEHIND_THRESHOLD = parseInt(process.env.BEHIND_THRESHOLD || "5", 10);
const LABEL_TO_SKIP = process.env.LABEL_TO_SKIP || "wip";
const DRY_RUN = process.env.DRY_RUN === "true";
const OUTPUT_JSON = process.env.OUTPUT_JSON === "true";

const NUDGE_MARKER = "<!-- stale-pr-behind-main-notifier -->";

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
        "User-Agent": "stale-pr-behind-main-notifier-bot",
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
      res.on("data", (c) => (raw += c));
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

async function paginate(path, token) {
  const items = [];
  let page = 1;
  while (true) {
    const sep = path.includes("?") ? "&" : "?";
    const body = await apiRequest(
      "GET",
      `${path}${sep}per_page=100&page=${page}`,
      null,
      token,
    );
    if (!Array.isArray(body) || body.length === 0) break;
    items.push(...body);
    if (body.length < 100) break;
    page++;
  }
  return items;
}

// ---------------------------------------------------------------------------
// PR analysis (exported for testing)
// ---------------------------------------------------------------------------

function isStale(pr, staleDays) {
  const updatedAt = new Date(pr.updated_at);
  const now = new Date();
  const diffDays = (now - updatedAt) / (1000 * 60 * 60 * 24);
  return diffDays >= staleDays;
}

function hasSkipLabel(pr, skipLabel) {
  return (pr.labels || []).some(
    (l) => l.name.toLowerCase() === skipLabel.toLowerCase(),
  );
}

function buildNotificationComment(pr, behindCount, staleDays) {
  const assignees =
    pr.assignees && pr.assignees.length
      ? pr.assignees.map((a) => `@${a.login}`).join(", ")
      : "_unassigned_";

  return [
    NUDGE_MARKER,
    "## ⏰ Stale PR — Behind Main",
    "",
    `This pull request has had no activity for **${staleDays}+ days** and is **${behindCount} commit(s) behind main**.`,
    "",
    `**Author:** @${pr.user.login}`,
    `**Assignee(s):** ${assignees}`,
    "",
    "### Required Actions",
    "",
    "- [ ] Rebase or merge main into this branch to resolve behind state",
    "- [ ] Resolve any merge conflicts",
    "- [ ] Re-run CI to verify the rebase",
    "- [ ] Update the PR description if scope has changed",
    "",
    "> PRs that remain behind main for an extended period may be closed as part of Wave 6 safeguards.",
    "> If this PR is intentionally long-running, add the `wip` label to suppress this warning.",
    "",
    "---",
    "_This is an automated notification from the Stale PR Behind-Main Notifier._",
  ].join("\n");
}

async function fetchPRComments(repo, prNumber, token) {
  return paginate(
    `/repos/${repo}/issues/${prNumber}/comments`,
    token,
  );
}

function alreadyNotified(comments, marker) {
  return comments.some((c) => c.body && c.body.includes(marker));
}

async function getBehindCount(repo, prNumber, token) {
  try {
    const pr = await apiRequest(
      "GET",
      `/repos/${repo}/pulls/${prNumber}`,
      null,
      token,
    );
    return pr.commits_behind || 0;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Report formatting
// ---------------------------------------------------------------------------

function buildTextReport(flaggedPRs) {
  const lines = [
    "=== Stale PR Behind-Main Notifier Report ===",
    `Thresholds: stale ≥ ${STALE_DAYS}d, behind ≥ ${BEHIND_THRESHOLD} commits`,
    `Flags this run: ${flaggedPRs.length} PR(s)`,
    "",
  ];

  if (flaggedPRs.length === 0) {
    lines.push("No stale PRs behind main detected.");
    return { output: lines.join("\n"), hasFindings: false };
  }

  for (const pr of flaggedPRs) {
    lines.push(`PR #${pr.number}: "${pr.title}"`);
    lines.push(`  Author: @${pr.author}`);
    lines.push(`  URL: ${pr.url}`);
    lines.push(`  Behind main by: ${pr.behindCount} commit(s)`);
    lines.push(`  Last updated: ${pr.lastUpdated}`);
    lines.push(`  Notified: ${pr.notified ? "Already notified" : "New this run"}`);
    lines.push("");
  }

  return { output: lines.join("\n"), hasFindings: true };
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
    `Scanning open PRs in ${repo} for stale/behind-main states…\n` +
      `  stale_days=${STALE_DAYS} behind_threshold=${BEHIND_THRESHOLD} ` +
      `skip_label=${LABEL_TO_SKIP} dry_run=${DRY_RUN}`,
  );

  const openPRs = await paginate(`/repos/${repo}/pulls?state=open`, token);
  console.log(`Found ${openPRs.length} open PR(s)`);

  const flaggedPRs = [];

  for (const pr of openPRs) {
    const { number, title, user, updated_at, labels, html_url } = pr;

    if (hasSkipLabel(pr, LABEL_TO_SKIP)) {
      console.log(`  #${number} — skipped (has ${LABEL_TO_SKIP} label): ${title}`);
      continue;
    }

    if (!isStale(pr, STALE_DAYS)) {
      console.log(`  #${number} — skipped (updated recently): ${title}`);
      continue;
    }

    const behindCount = await getBehindCount(repo, number, token);
    if (behindCount < BEHIND_THRESHOLD) {
      console.log(
        `  #${number} — skipped (only ${behindCount} behind threshold ${BEHIND_THRESHOLD}): ${title}`,
      );
      continue;
    }

    const comments = await fetchPRComments(repo, number, token);
    const notified = alreadyNotified(comments, NUDGE_MARKER);

    if (notified) {
      console.log(`  #${number} — already notified, skipping: ${title}`);
      flaggedPRs.push({
        number,
        title,
        author: user.login,
        url: html_url,
        behindCount,
        lastUpdated: updated_at,
        notified: true,
      });
      continue;
    }

    const commentBody = buildNotificationComment(pr, behindCount, STALE_DAYS);

    if (DRY_RUN) {
      console.log(`  #${number} — [DRY RUN] would post notification: ${title}`);
      console.log("--- comment preview (first 300 chars) ---");
      console.log(commentBody.slice(0, 300) + "...");
      console.log("---");
    } else {
      console.log(`  #${number} — posting notification: ${title}`);
      await apiRequest(
        "POST",
        `/repos/${repo}/issues/${number}/comments`,
        { body: commentBody },
        token,
      );
    }

    flaggedPRs.push({
      number,
      title,
      author: user.login,
      url: html_url,
      behindCount,
      lastUpdated: updated_at,
      notified: false,
    });
  }

  if (OUTPUT_JSON) {
    console.log(JSON.stringify({ flaggedPRs }, null, 2));
    return;
  }

  const { output, hasFindings } = buildTextReport(flaggedPRs);
  console.log("\n" + output);

  if (hasFindings && !DRY_RUN) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  isStale,
  hasSkipLabel,
  getBehindCount,
  buildNotificationComment,
  alreadyNotified,
};
