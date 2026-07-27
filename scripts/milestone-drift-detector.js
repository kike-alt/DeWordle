#!/usr/bin/env node
/**
 * Milestone Drift Detector (AI/AUTOMATION-002)
 *
 * Detects P0/P1 issues that have drifted without progress and notifies
 * maintainers. An issue is considered "drifting" when it has been open
 * for longer than a configurable threshold with no activity.
 *
 * Usage (called by GitHub Actions or locally):
 *   node scripts/milestone-drift-detector.js
 *
 * Required env vars:
 *   GITHUB_TOKEN        - token with issues read + write permissions
 *   GITHUB_REPO         - owner/repo  (e.g. "kike-alt/DeWordle")
 *
 * Optional env vars:
 *   DRIFT_DAYS          - inactivity threshold in days (default: 7)
 *   PRIORITY_LABELS     - comma-separated priority labels (default: "priority:P0,priority:P1")
 *   DRY_RUN             - set to "true" to log without posting (default: false)
 *   OUTPUT_JSON         - set to "true" for machine-readable JSON output
 */

"use strict";

const https = require("https");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DRIFT_DAYS = parseInt(process.env.DRIFT_DAYS || "7", 10);
const PRIORITY_LABELS = (
  process.env.PRIORITY_LABELS || "priority:P0,priority:P1"
)
  .split(",")
  .map((l) => l.trim());
const DRY_RUN = process.env.DRY_RUN === "true";
const OUTPUT_JSON = process.env.OUTPUT_JSON === "true";

const DRIFT_MARKER = "<!-- milestone-drift-detector -->";

// ---------------------------------------------------------------------------
// GitHub API helpers
// ---------------------------------------------------------------------------

function apiRequest(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.github.com",
      path,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "milestone-drift-detector-bot",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    };
    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () =>
        resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : {} }),
      );
    });
    req.on("error", reject);
    req.end();
  });
}

function apiPost(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: "api.github.com",
      path,
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "milestone-drift-detector-bot",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };
    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () =>
        resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : {} }),
      );
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Issue fetching
// ---------------------------------------------------------------------------

async function fetchOpenIssues(repo, token) {
  const issues = [];
  let page = 1;
  while (true) {
    const { body } = await apiRequest(
      `/repos/${repo}/issues?state=open&per_page=100&page=${page}`,
      token,
    );
    if (!Array.isArray(body) || body.length === 0) break;
    issues.push(...body.filter((i) => !i.pull_request));
    if (body.length < 100) break;
    page++;
  }
  return issues;
}

function hasPriorityLabel(issue) {
  const labels = issue.labels.map((l) => l.name);
  return PRIORITY_LABELS.some((pl) => labels.includes(pl));
}

function hasActivitySince(issue, cutoffDate) {
  if (issue.updated_at) {
    const updated = new Date(issue.updated_at);
    if (updated > cutoffDate) return true;
  }
  return false;
}

function hasDriftMarker(issue) {
  const body = issue.body || "";
  return body.includes(DRIFT_MARKER);
}

// ---------------------------------------------------------------------------
// Comment posting
// ---------------------------------------------------------------------------

function buildDriftComment(issue, daysOpen, daysSinceUpdate) {
  const labelNames = issue.labels.map((l) => l.name).join(", ");
  return [
    DRIFT_MARKER,
    "",
    "**Milestone Drift Alert**",
    "",
    `This issue has been open for **${daysOpen} days** with no activity for **${daysSinceUpdate} days**.`,
    "",
    "| Field | Value |",
    "|---|---|",
    `| Opened | ${new Date(issue.created_at).toISOString().slice(0, 10)} |`,
    `| Last updated | ${new Date(issue.updated_at).toISOString().slice(0, 10)} |`,
    `| Labels | ${labelNames} |`,
    `| Assignees | ${(issue.assignees || []).map((a) => a.login).join(", ") || "none"} |`,
    "",
    "Please update the issue status or unassign if no longer relevant.",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token) {
    console.error("ERROR: GITHUB_TOKEN is required");
    process.exit(1);
  }
  if (!repo) {
    console.error("ERROR: GITHUB_REPO is required (owner/repo)");
    process.exit(1);
  }

  const now = new Date();
  const driftCutoff = new Date(now.getTime() - DRIFT_DAYS * 24 * 60 * 60 * 1000);

  console.log(`Scanning open issues in ${repo}...`);
  console.log(`Priority labels: ${PRIORITY_LABELS.join(", ")}`);
  console.log(`Drift threshold: ${DRIFT_DAYS} days`);

  const issues = await fetchOpenIssues(repo, token);
  console.log(`Fetched ${issues.length} open issues`);

  const drifting = issues
    .filter(hasPriorityLabel)
    .filter((issue) => !hasActivitySince(issue, driftCutoff))
    .map((issue) => {
      const daysOpen = Math.floor(
        (now.getTime() - new Date(issue.created_at).getTime()) /
          (24 * 60 * 60 * 1000),
      );
      const daysSinceUpdate = Math.floor(
        (now.getTime() - new Date(issue.updated_at).getTime()) /
          (24 * 60 * 60 * 1000),
      );
      return { ...issue, daysOpen, daysSinceUpdate };
    });

  console.log(`Found ${drifting.length} drifting high-priority issues`);

  let posted = 0;
  let skipped = 0;

  for (const issue of drifting) {
    if (hasDriftMarker(issue)) {
      skipped++;
      continue;
    }

    if (!DRY_RUN) {
      const comment = buildDriftComment(
        issue,
        issue.daysOpen,
        issue.daysSinceUpdate,
      );
      await apiPost(
        `/repos/${repo}/issues/${issue.number}/comments`,
        { body: comment },
        token,
      );
    }
    posted++;
  }

  if (OUTPUT_JSON) {
    console.log(
      JSON.stringify(
        {
          scanned: issues.length,
          drifting: drifting.length,
          posted,
          skipped,
          issues: drifting.map((i) => ({
            number: i.number,
            title: i.title,
            daysOpen: i.daysOpen,
            daysSinceUpdate: i.daysSinceUpdate,
            labels: i.labels.map((l) => l.name),
            url: i.html_url,
          })),
        },
        null,
        2,
      ),
    );
  } else {
    if (drifting.length > 0) {
      console.log("\nDrifting issues:");
      for (const issue of drifting) {
        console.log(
          `  #${issue.number} — ${issue.title} (open ${issue.daysOpen}d, inactive ${issue.daysSinceUpdate}d)`,
        );
      }
    }
    console.log(`\nPosted: ${posted} | Skipped (already marked): ${skipped}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
