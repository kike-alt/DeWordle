#!/usr/bin/env node
/**
 * Reviewer Load Heatmap (AI/AUTOMATION-210)
 *
 * Generates a text/JSON heatmap of reviewer and maintainer load grouped by
 * track label and recent update activity.  Gives maintainers an at-a-glance
 * view of who is overloaded so they can rebalance assignments.
 *
 * Data sources:
 *   - Open pull requests (requested_reviewers + review_requests)
 *   - Open issues (assignees) labelled with a track:* label
 *   - Both filtered to the configurable LOOKBACK_DAYS activity window
 *
 * Usage:
 *   node scripts/reviewer-load-heatmap.js
 *
 * Required env vars:
 *   GITHUB_TOKEN  - token with repo read permissions
 *   GITHUB_REPO   - owner/repo
 *
 * Optional env vars:
 *   LOOKBACK_DAYS  - activity window in days (default: 30)
 *   OUTPUT_JSON    - "true" for machine-readable JSON
 */

"use strict";

const https = require("https");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const LOOKBACK_DAYS = parseInt(process.env.LOOKBACK_DAYS || "30", 10);
const OUTPUT_JSON = process.env.OUTPUT_JSON === "true";
const TRACK_PREFIX = "track:";

// ---------------------------------------------------------------------------
// GitHub API helpers
// ---------------------------------------------------------------------------

function apiRequest(path, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "api.github.com",
      path,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "reviewer-load-heatmap-bot",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    };
    const req = https.request(opts, (res) => {
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

async function paginate(path, token) {
  const items = [];
  let page = 1;
  while (true) {
    const sep = path.includes("?") ? "&" : "?";
    const { body } = await apiRequest(
      `${path}${sep}per_page=100&page=${page}`,
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
// Data collection helpers (exported for unit tests)
// ---------------------------------------------------------------------------

/** Extract the first track label from a labels array, or "untracked". */
function detectTrack(labels) {
  const found = labels.find((l) =>
    l.name.toLowerCase().startsWith(TRACK_PREFIX),
  );
  return found ? found.name.slice(TRACK_PREFIX.length).toUpperCase() : "UNTRACKED";
}

/**
 * Returns true if the item was updated within the lookback window.
 * @param {string} updatedAt  - ISO 8601 date string
 * @param {number} days
 */
function isRecent(updatedAt, days) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return new Date(updatedAt).getTime() >= cutoff;
}

/**
 * Build a load map from open PRs.
 * Shape: { [track]: { [login]: { prs: number, issues: number } } }
 */
function buildLoadMap(prs, issues, lookbackDays) {
  // map[track][login] = { prs, issues }
  const map = {};

  const ensure = (track, login) => {
    if (!map[track]) map[track] = {};
    if (!map[track][login]) map[track][login] = { prs: 0, issues: 0 };
  };

  for (const pr of prs) {
    if (!isRecent(pr.updated_at, lookbackDays)) continue;
    const track = detectTrack(pr.labels || []);
    for (const r of pr.requested_reviewers || []) {
      ensure(track, r.login);
      map[track][r.login].prs += 1;
    }
  }

  for (const issue of issues) {
    if (!isRecent(issue.updated_at, lookbackDays)) continue;
    if (issue.pull_request) continue; // skip PRs returned by issues endpoint
    const track = detectTrack(issue.labels || []);
    for (const a of issue.assignees || []) {
      ensure(track, a.login);
      map[track][a.login].issues += 1;
    }
  }

  return map;
}

/** Sum total load (prs + issues) for a contributor entry. */
function totalLoad(entry) {
  return entry.prs + entry.issues;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/** Map a total load number to a heat symbol for quick scanning. */
function heatSymbol(total) {
  if (total === 0) return "░░"; // none
  if (total <= 2) return "▒▒"; // light
  if (total <= 5) return "▓▓"; // medium
  return "██"; // heavy
}

function buildTextReport(map, lookbackDays) {
  const tracks = Object.keys(map).sort();
  const lines = [
    "=== Reviewer Load Heatmap ===",
    `Window: last ${lookbackDays} days`,
    `Tracks: ${tracks.length || 0}`,
    "",
    "Legend:  ░░ none   ▒▒ light (1-2)   ▓▓ medium (3-5)   ██ heavy (6+)",
    "",
  ];

  if (tracks.length === 0) {
    lines.push("No open PR review assignments or issue assignments found.");
    return lines.join("\n");
  }

  for (const track of tracks) {
    lines.push(`── ${track} ──────────────────────────────`);
    const contributors = Object.entries(map[track]).sort(
      (a, b) => totalLoad(b[1]) - totalLoad(a[1]),
    );

    if (contributors.length === 0) {
      lines.push("  (no active contributors)");
    } else {
      lines.push(
        `  ${"Contributor".padEnd(25)} ${"Heat".padEnd(6)} PRs   Issues  Total`,
      );
      for (const [login, counts] of contributors) {
        const tot = totalLoad(counts);
        lines.push(
          `  ${("@" + login).padEnd(25)} ${heatSymbol(tot).padEnd(6)} ${String(counts.prs).padEnd(6)} ${String(counts.issues).padEnd(8)} ${tot}`,
        );
      }
    }
    lines.push("");
  }

  return lines.join("\n");
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
    `Building reviewer load heatmap for ${repo} (last ${LOOKBACK_DAYS} days)…`,
  );

  const [prs, issues] = await Promise.all([
    paginate(`/repos/${repo}/pulls?state=open`, token),
    paginate(`/repos/${repo}/issues?state=open`, token),
  ]);

  console.log(`Open PRs: ${prs.length}  Open issues: ${issues.length}`);

  const map = buildLoadMap(prs, issues, LOOKBACK_DAYS);

  if (OUTPUT_JSON) {
    console.log(JSON.stringify({ window_days: LOOKBACK_DAYS, tracks: map }, null, 2));
    return;
  }

  console.log("\n" + buildTextReport(map, LOOKBACK_DAYS));
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { detectTrack, isRecent, buildLoadMap, totalLoad, heatSymbol };
