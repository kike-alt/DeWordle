#!/usr/bin/env node
/**
 * Reviewer Load Balancer
 *
 * Computes open review load per reviewer and suggests assignments
 * based on track expertise labels. Posts a non-blocking recommendation
 * comment on the PR. Respects the `no-auto-assign` opt-out label.
 *
 * Usage (called by GitHub Actions):
 *   node scripts/reviewer-load-balancer.js
 *
 * Required env vars:
 *   GITHUB_TOKEN   - token with repo read + PR write permissions
 *   GITHUB_REPO    - owner/repo  (e.g. "org/dewordle")
 *   PR_NUMBER      - pull request number to comment on
 *   PR_LABELS      - comma-separated labels on the PR (may be empty)
 */

const https = require("https");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OPT_OUT_LABEL = "no-auto-assign";

/**
 * Track → ordered list of preferred reviewers (primary first, backup second).
 * Mirrors the lane model in docs/wave/REVIEWER_PLAYBOOK.md.
 * Update handles to match real GitHub usernames.
 */
const TRACK_REVIEWERS = {
  FE: ["fe-maintainer", "dx-reviewer"],
  BE: ["be-maintainer", "qa-reviewer"],
  SC: ["sc-maintainer", "security-reviewer"],
  SDK: ["sdk-maintainer", "fe-maintainer"],
  DEVOPS: ["devops-maintainer", "be-maintainer"],
  QA: ["qa-maintainer"],
  SECURITY: ["security-maintainer", "sc-maintainer"],
  DX: ["dx-maintainer", "docs-reviewer"],
  DOCS: ["docs-maintainer", "dx-reviewer"],
  "AI/AUTOMATION": ["automation-maintainer", "docs-reviewer"],
};

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
        "User-Agent": "reviewer-load-balancer-bot",
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
          reject(new Error(`GitHub API ${res.statusCode}: ${raw}`));
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

/** Fetch all open PRs (handles pagination up to 500). */
async function fetchOpenPRs(repo, token) {
  const prs = [];
  let page = 1;
  while (true) {
    const batch = await apiRequest(
      "GET",
      `/repos/${repo}/pulls?state=open&per_page=100&page=${page}`,
      null,
      token,
    );
    if (!batch.length) break;
    prs.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  return prs;
}

// ---------------------------------------------------------------------------
// Load computation
// ---------------------------------------------------------------------------

/**
 * Returns a map of { login → openReviewCount } for all open PRs.
 * A reviewer is counted if they appear in requested_reviewers or
 * reviews (state = CHANGES_REQUESTED | COMMENTED | APPROVED but PR still open).
 */
function computeReviewerLoad(openPRs) {
  const load = {};

  for (const pr of openPRs) {
    const seen = new Set();

    for (const r of pr.requested_reviewers || []) {
      if (!seen.has(r.login)) {
        seen.add(r.login);
        load[r.login] = (load[r.login] || 0) + 1;
      }
    }
  }

  return load;
}

// ---------------------------------------------------------------------------
// Track detection
// ---------------------------------------------------------------------------

/**
 * Extracts the track from PR labels or title.
 * Title convention: [W5][TRACK][SIZE] description
 */
function detectTrack(prTitle, prLabels) {
  // Try labels first (e.g. label "track:BE")
  for (const label of prLabels) {
    const m = label.match(/^track[:/](.+)$/i);
    if (m) return m[1].toUpperCase();
  }

  // Fall back to title bracket
  const m = prTitle.match(/\[W\d+\]\[([^\]]+)\]/i);
  if (m) return m[1].toUpperCase();

  return null;
}

// ---------------------------------------------------------------------------
// Suggestion logic
// ---------------------------------------------------------------------------

/**
 * Given the load map and a track, return up to 2 suggested reviewers
 * sorted by ascending load (least busy first).
 */
function suggestReviewers(track, load) {
  const candidates = TRACK_REVIEWERS[track] || [];
  if (!candidates.length) return [];

  return [...candidates]
    .sort((a, b) => (load[a] || 0) - (load[b] || 0))
    .slice(0, 2);
}

// ---------------------------------------------------------------------------
// Comment formatting
// ---------------------------------------------------------------------------

function buildComment(track, suggestions, load, optedOut) {
  if (optedOut) {
    return [
      "## 🤖 Reviewer Load Balancer",
      "",
      "This PR has the `no-auto-assign` label — skipping automatic reviewer suggestion.",
      "Please assign reviewers manually.",
    ].join("\n");
  }

  const trackLine = track
    ? `Detected track: **${track}**`
    : "No track label detected — showing global load ranking.";

  const rows = suggestions
    .map((login) => `| @${login} | ${load[login] || 0} open reviews |`)
    .join("\n");

  const table = suggestions.length
    ? ["| Suggested Reviewer | Current Load |", "|---|---|", rows].join("\n")
    : "_No configured reviewers found for this track. Please assign manually._";

  return [
    "## 🤖 Reviewer Load Balancer",
    "",
    "> This is a **non-blocking suggestion**. Maintainers may override at any time.",
    "> Add the `no-auto-assign` label to opt out of future suggestions on this PR.",
    "",
    trackLine,
    "",
    table,
    "",
    "<details>",
    "<summary>Full reviewer load snapshot</summary>",
    "",
    Object.keys(load).length
      ? Object.entries(load)
          .sort((a, b) => a[1] - b[1])
          .map(([login, count]) => `- @${login}: ${count}`)
          .join("\n")
      : "_No reviewers with open review assignments found._",
    "",
    "</details>",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Existing bot comment detection (avoid duplicates)
// ---------------------------------------------------------------------------

const BOT_COMMENT_MARKER = "## 🤖 Reviewer Load Balancer";

async function findExistingBotComment(repo, prNumber, token) {
  const comments = await apiRequest(
    "GET",
    `/repos/${repo}/issues/${prNumber}/comments?per_page=100`,
    null,
    token,
  );
  return comments.find((c) => c.body && c.body.includes(BOT_COMMENT_MARKER));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const prNumber = process.env.PR_NUMBER;
  const prLabelsRaw = process.env.PR_LABELS || "";
  const prTitle = process.env.PR_TITLE || "";

  if (!token || !repo || !prNumber) {
    console.error(
      "Missing required env vars: GITHUB_TOKEN, GITHUB_REPO, PR_NUMBER",
    );
    process.exit(1);
  }

  const prLabels = prLabelsRaw
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);

  console.log(
    `PR #${prNumber} | labels: [${prLabels.join(", ")}] | title: "${prTitle}"`,
  );

  // Opt-out check
  const optedOut = prLabels.includes(OPT_OUT_LABEL);

  // Fetch open PRs and compute load
  console.log("Fetching open PRs to compute reviewer load...");
  const openPRs = await fetchOpenPRs(repo, token);
  console.log(`Found ${openPRs.length} open PRs`);

  const load = computeReviewerLoad(openPRs);
  console.log("Reviewer load:", load);

  // Detect track and suggest reviewers
  const track = detectTrack(prTitle, prLabels);
  console.log(`Detected track: ${track || "none"}`);

  const suggestions = optedOut ? [] : suggestReviewers(track, load);
  console.log(`Suggestions: ${suggestions.join(", ") || "none"}`);

  // Build comment
  const body = buildComment(track, suggestions, load, optedOut);

  // Post or update comment
  const existing = await findExistingBotComment(repo, prNumber, token);

  if (existing) {
    console.log(`Updating existing comment #${existing.id}`);
    await apiRequest(
      "PATCH",
      `/repos/${repo}/issues/comments/${existing.id}`,
      { body },
      token,
    );
  } else {
    console.log("Posting new comment");
    await apiRequest(
      "POST",
      `/repos/${repo}/issues/${prNumber}/comments`,
      { body },
      token,
    );
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
