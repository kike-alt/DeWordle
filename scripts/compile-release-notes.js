#!/usr/bin/env node
/**
 * Release-Note Draft Compiler (AI/AUTOMATION-211)
 *
 * Fetches merged pull requests since a base ref (tag or SHA), groups them by
 * label (feature, fix, docs, chore, breaking, etc.), and emits a structured
 * draft release-note document that maintainers can edit into a human-facing
 * release summary.
 *
 * Changed-path buckets are derived from PR file paths:
 *   frontend/  → Frontend
 *   backend/   → Backend
 *   soroban/   → Onchain / Soroban
 *   scripts/   → Tooling / Automation
 *   docs/      → Documentation
 *   .github/   → CI / Workflows
 *   other      → General
 *
 * Usage:
 *   node scripts/compile-release-notes.js
 *
 * Required env vars:
 *   GITHUB_TOKEN   - token with repo read permissions
 *   GITHUB_REPO    - owner/repo
 *
 * Optional env vars:
 *   SINCE_TAG      - tag or ISO date; defaults to last 30 days
 *   OUTPUT_JSON    - "true" for machine-readable JSON
 *   TARGET_BRANCH  - branch to filter merged PRs (default: main)
 */

"use strict";

const https = require("https");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OUTPUT_JSON = process.env.OUTPUT_JSON === "true";
const TARGET_BRANCH = process.env.TARGET_BRANCH || "main";
const SINCE_TAG = process.env.SINCE_TAG || null;

// ---------------------------------------------------------------------------
// Label → release-note category mapping (exported for tests)
// ---------------------------------------------------------------------------

const LABEL_CATEGORIES = [
  { category: "⚠️ Breaking Changes", patterns: [/breaking/i] },
  { category: "✨ New Features", patterns: [/feat|feature|enhancement/i] },
  { category: "🐛 Bug Fixes", patterns: [/fix|bug/i] },
  { category: "📖 Documentation", patterns: [/doc|docs/i] },
  { category: "🔧 Tooling & Automation", patterns: [/tool|automation|ci|workflow|script/i] },
  { category: "🧹 Chores & Refactors", patterns: [/chore|refactor|style|cleanup/i] },
];

const DEFAULT_CATEGORY = "🔀 Other";

// ---------------------------------------------------------------------------
// Path → area mapping
// ---------------------------------------------------------------------------

const PATH_AREAS = [
  { area: "Frontend", prefix: "frontend/" },
  { area: "Backend", prefix: "backend/" },
  { area: "Onchain / Soroban", prefix: "soroban/" },
  { area: "Tooling / Automation", prefix: "scripts/" },
  { area: "Documentation", prefix: "docs/" },
  { area: "CI / Workflows", prefix: ".github/" },
  { area: "Onchain (legacy)", prefix: "onchain/" },
];

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
        "User-Agent": "compile-release-notes-bot",
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

/** Fetch changed file paths for a single PR. */
async function fetchPRFiles(repo, prNumber, token) {
  const files = await paginate(`/repos/${repo}/pulls/${prNumber}/files`, token);
  return files.map((f) => f.filename);
}

// ---------------------------------------------------------------------------
// Classification helpers (exported for unit tests)
// ---------------------------------------------------------------------------

/**
 * Returns the release-note category for the first matching label, or DEFAULT_CATEGORY.
 * @param {string[]} labelNames
 */
function classifyByLabels(labelNames) {
  for (const { category, patterns } of LABEL_CATEGORIES) {
    if (labelNames.some((l) => patterns.some((p) => p.test(l)))) {
      return category;
    }
  }
  return DEFAULT_CATEGORY;
}

/**
 * Returns the set of affected areas derived from file paths.
 * @param {string[]} paths
 * @returns {string[]}
 */
function classifyPaths(paths) {
  const areas = new Set();
  for (const p of paths) {
    const match = PATH_AREAS.find(({ prefix }) => p.startsWith(prefix));
    areas.add(match ? match.area : "General");
  }
  return [...areas].sort();
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * Build the draft release-note markdown.
 * @param {{ category: string, prs: Array }[]} sections
 * @param {string} since
 * @param {string} repo
 */
function buildMarkdown(sections, since, repo) {
  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    `# Release Notes Draft`,
    ``,
    `> **Auto-generated** on ${today} from merged PRs since \`${since}\`.`,
    `> Edit this document before publishing. Add context, remove noise, merge related items.`,
    ``,
  ];

  let totalPRs = 0;
  for (const { category, prs } of sections) {
    if (prs.length === 0) continue;
    lines.push(`## ${category}`, "");
    for (const pr of prs) {
      totalPRs++;
      const areas = pr.areas.length ? ` _(${pr.areas.join(", ")})_` : "";
      lines.push(
        `- **[#${pr.number}](https://github.com/${repo}/pull/${pr.number})** ${pr.title}${areas}`,
      );
    }
    lines.push("");
  }

  if (totalPRs === 0) {
    lines.push("_No merged PRs found in this window._", "");
  }

  lines.push(
    "---",
    `_Generated by \`scripts/compile-release-notes.js\` · ${totalPRs} PR(s) included_`,
  );

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

  // Determine since date
  let sinceISO;
  if (SINCE_TAG) {
    // Try to resolve tag to a commit date
    const { status, body } = await apiRequest(
      `/repos/${repo}/git/ref/tags/${SINCE_TAG}`,
      token,
    );
    if (status === 200) {
      const commitSha = body.object.sha;
      const { body: commitBody } = await apiRequest(
        `/repos/${repo}/commits/${commitSha}`,
        token,
      );
      sinceISO =
        commitBody.commit?.committer?.date ||
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    } else {
      // Treat as ISO date string directly
      sinceISO = SINCE_TAG;
    }
  } else {
    sinceISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  const sinceLabel = SINCE_TAG || `last 30 days (since ${sinceISO.slice(0, 10)})`;
  console.log(`Compiling release notes for ${repo} — ${sinceLabel}…`);

  // Fetch merged PRs
  const allPRs = await paginate(
    `/repos/${repo}/pulls?state=closed&base=${TARGET_BRANCH}`,
    token,
  );

  const mergedPRs = allPRs.filter(
    (pr) => pr.merged_at && new Date(pr.merged_at) >= new Date(sinceISO),
  );

  console.log(`Found ${mergedPRs.length} merged PRs`);

  // Enrich with file paths
  const enriched = [];
  for (const pr of mergedPRs) {
    const labelNames = (pr.labels || []).map((l) => l.name);
    const category = classifyByLabels(labelNames);
    const files = await fetchPRFiles(repo, pr.number, token);
    const areas = classifyPaths(files);

    enriched.push({
      number: pr.number,
      title: pr.title,
      mergedAt: pr.merged_at,
      labels: labelNames,
      category,
      areas,
    });
  }

  // Build category sections in defined order
  const categoryOrder = [
    ...LABEL_CATEGORIES.map((c) => c.category),
    DEFAULT_CATEGORY,
  ];

  const sections = categoryOrder.map((cat) => ({
    category: cat,
    prs: enriched.filter((p) => p.category === cat),
  }));

  if (OUTPUT_JSON) {
    console.log(
      JSON.stringify({ since: sinceISO, total: mergedPRs.length, sections }, null, 2),
    );
    return;
  }

  const markdown = buildMarkdown(sections, sinceLabel, repo);
  console.log("\n" + markdown);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { classifyByLabels, classifyPaths, buildMarkdown, LABEL_CATEGORIES };
