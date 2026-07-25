#!/usr/bin/env node
/**
 * Oversized Issue Split Suggester (AI/AUTOMATION-209)
 *
 * Scans open issues for patterns that indicate the issue is too broad for a
 * single contributor cycle, then outputs suggested split seams without
 * mutating any GitHub issue directly.
 *
 * Heuristics applied (all thresholds tunable via env vars):
 *   1. Body length     — bodies over BODY_CHARS_THRESHOLD chars are candidates.
 *   2. Acceptance-criteria count — more than AC_COUNT_THRESHOLD AC items.
 *   3. Multi-track labels — issue carries labels for more than one track.
 *   4. Multiple "Blocked By" targets — depends on ≥ BLOCKERS_THRESHOLD issues.
 *   5. Size label      — explicit `size:L` or `size:XL` label.
 *
 * Usage:
 *   node scripts/oversized-issue-split-suggester.js
 *
 * Required env vars:
 *   GITHUB_TOKEN  - token with repo read permissions
 *   GITHUB_REPO   - owner/repo (e.g. "org/dewordle")
 *
 * Optional env vars:
 *   BODY_CHARS_THRESHOLD  - default 1500
 *   AC_COUNT_THRESHOLD    - default 5
 *   BLOCKERS_THRESHOLD    - default 3
 *   OUTPUT_JSON           - "true" for machine-readable JSON
 *   DRY_RUN               - "true" to skip non-zero exit on findings
 */

"use strict";

const https = require("https");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BODY_CHARS_THRESHOLD = parseInt(
  process.env.BODY_CHARS_THRESHOLD || "1500",
  10,
);
const AC_COUNT_THRESHOLD = parseInt(process.env.AC_COUNT_THRESHOLD || "5", 10);
const BLOCKERS_THRESHOLD = parseInt(process.env.BLOCKERS_THRESHOLD || "3", 10);
const OUTPUT_JSON = process.env.OUTPUT_JSON === "true";
const DRY_RUN = process.env.DRY_RUN === "true";

const OVERSIZED_SIZE_LABELS = new Set(["size:l", "size:xl"]);
const TRACK_LABEL_PREFIX = "track:";

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
        "User-Agent": "oversized-issue-split-suggester-bot",
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

// ---------------------------------------------------------------------------
// Heuristic helpers (exported via module.exports for testing)
// ---------------------------------------------------------------------------

/** Count acceptance-criteria bullet items in the body. */
function countAcceptanceCriteria(body) {
  if (!body) return 0;
  // Match lines inside an "Acceptance Criteria" section
  const acMatch = body.match(
    /##\s*acceptance criteria[\s\S]*?(?=\n##|\s*$)/i,
  );
  if (!acMatch) return 0;
  return (acMatch[0].match(/^\s*[-*]\s+\[[ x]\]/gim) || []).length;
}

/** Extract issue numbers from Blocked By / Dependencies sections. */
function countBlockers(body) {
  if (!body) return 0;
  const blockMatch = body.match(
    /##\s*(blocked by|dependencies|depends on|blockers)[\s\S]*?(?=\n##|\s*$)/i,
  );
  if (!blockMatch) return 0;
  return (blockMatch[0].match(/(?<![a-zA-Z0-9_/-])#(\d+)/g) || []).length;
}

/** Count distinct track labels on the issue. */
function countTracks(labels) {
  return labels.filter((l) =>
    l.name.toLowerCase().startsWith(TRACK_LABEL_PREFIX),
  ).length;
}

/**
 * Analyse a single issue and return a split suggestion record or null.
 * @returns {{ number, title, url, triggers, suggestions } | null}
 */
function analyseIssue(issue) {
  const body = issue.body || "";
  const labels = issue.labels || [];
  const labelNames = labels.map((l) => l.name);

  const triggers = [];

  // Heuristic 1 — body length
  if (body.length > BODY_CHARS_THRESHOLD) {
    triggers.push({
      heuristic: "body_length",
      detail: `Body is ${body.length} chars (threshold: ${BODY_CHARS_THRESHOLD})`,
    });
  }

  // Heuristic 2 — acceptance-criteria count
  const acCount = countAcceptanceCriteria(body);
  if (acCount > AC_COUNT_THRESHOLD) {
    triggers.push({
      heuristic: "ac_count",
      detail: `${acCount} acceptance criteria items (threshold: ${AC_COUNT_THRESHOLD})`,
    });
  }

  // Heuristic 3 — multi-track labels
  const trackCount = countTracks(labels);
  if (trackCount > 1) {
    const trackLabels = labelNames.filter((n) =>
      n.toLowerCase().startsWith(TRACK_LABEL_PREFIX),
    );
    triggers.push({
      heuristic: "multi_track",
      detail: `Spans ${trackCount} tracks: ${trackLabels.join(", ")}`,
    });
  }

  // Heuristic 4 — many blockers
  const blockerCount = countBlockers(body);
  if (blockerCount >= BLOCKERS_THRESHOLD) {
    triggers.push({
      heuristic: "blocker_count",
      detail: `References ${blockerCount} blockers (threshold: ${BLOCKERS_THRESHOLD})`,
    });
  }

  // Heuristic 5 — explicit oversized label
  if (labelNames.some((n) => OVERSIZED_SIZE_LABELS.has(n.toLowerCase()))) {
    const sizeLabel = labelNames.find((n) =>
      OVERSIZED_SIZE_LABELS.has(n.toLowerCase()),
    );
    triggers.push({
      heuristic: "size_label",
      detail: `Carries label \`${sizeLabel}\``,
    });
  }

  if (triggers.length === 0) return null;

  const suggestions = buildSuggestions(triggers, body, acCount);

  return {
    number: issue.number,
    title: issue.title,
    url: issue.html_url,
    triggers,
    suggestions,
  };
}

/**
 * Produce human-readable split seam suggestions based on which heuristics fired.
 */
function buildSuggestions(triggers, body, acCount) {
  const hints = [];
  const heuristicNames = new Set(triggers.map((t) => t.heuristic));

  if (heuristicNames.has("ac_count")) {
    // Suggest splitting after the halfway point in the AC list
    const half = Math.ceil(acCount / 2);
    hints.push(
      `Split acceptance criteria into two issues: first ${half} items in one issue, remaining in another.`,
    );
  }

  if (heuristicNames.has("multi_track")) {
    hints.push(
      "Create one child issue per track label so each can be claimed independently.",
    );
  }

  if (heuristicNames.has("blocker_count")) {
    hints.push(
      "Each blocker dependency may represent a natural seam — consider one issue per dependency chain.",
    );
  }

  if (heuristicNames.has("body_length") && hints.length === 0) {
    hints.push(
      "Body is unusually long — identify the primary user-facing outcome and move secondary concerns to follow-up issues.",
    );
  }

  if (heuristicNames.has("size_label") && hints.length === 0) {
    hints.push(
      "Labelled as large — break into a spike/research issue and one or more implementation issues.",
    );
  }

  return hints;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function buildTextReport(candidates, total) {
  const lines = [
    "=== Oversized Issue Split Suggester ===",
    `Scanned:    ${total} open issues`,
    `Candidates: ${candidates.length} issues flagged for potential split`,
    "",
  ];

  if (candidates.length === 0) {
    lines.push("✓ No oversized issues detected.");
    return { output: lines.join("\n"), hasFindings: false };
  }

  for (const c of candidates) {
    lines.push(`Issue #${c.number}: ${c.title}`);
    lines.push(`  URL: ${c.url}`);
    lines.push("  Triggers:");
    for (const t of c.triggers) {
      lines.push(`    • [${t.heuristic}] ${t.detail}`);
    }
    lines.push("  Suggested split seams:");
    for (const s of c.suggestions) {
      lines.push(`    → ${s}`);
    }
    lines.push("");
  }

  lines.push(
    "NOTE: These are suggestions only. No issues have been modified.",
  );
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

  console.log(`Scanning open issues in ${repo} for split candidates…`);

  const issues = await fetchOpenIssues(repo, token);
  console.log(`Found ${issues.length} open issues`);

  const candidates = issues
    .map((i) => analyseIssue(i))
    .filter(Boolean);

  if (OUTPUT_JSON) {
    console.log(JSON.stringify({ scanned: issues.length, candidates }, null, 2));
    return;
  }

  const { output, hasFindings } = buildTextReport(candidates, issues.length);
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
  countAcceptanceCriteria,
  countBlockers,
  countTracks,
  analyseIssue,
  buildSuggestions,
};
