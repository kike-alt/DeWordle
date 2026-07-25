#!/usr/bin/env node
/**
 * Issue Dependency-Link Scanner (AI/AUTOMATION-207)
 *
 * Fetches all open issues in the repo and scans each one for broken
 * issue references, docs links, or malformed dependency sections.
 * Produces an actionable report maintainers can triage directly.
 *
 * Usage:
 *   node scripts/scan-issue-dependency-links.js
 *
 * Required env vars:
 *   GITHUB_TOKEN  - token with repo read permissions
 *   GITHUB_REPO   - owner/repo (e.g. "org/dewordle")
 *
 * Optional env vars:
 *   OUTPUT_JSON   - set to "true" to emit machine-readable JSON
 *   DRY_RUN       - set to "true" to print report without exiting 1 on errors
 */

"use strict";

const https = require("https");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OUTPUT_JSON = process.env.OUTPUT_JSON === "true";
const DRY_RUN = process.env.DRY_RUN === "true";

const DEPENDENCY_HEADINGS = [
  "dependencies",
  "dependency",
  "blocked by",
  "blocked-by",
  "blockers",
  "depends on",
  "depends-on",
];

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
        "User-Agent": "scan-issue-dependency-links-bot",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    };

    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () =>
        resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : {} }),
      );
    });

    req.on("error", reject);
    req.end();
  });
}

/** Fetch all open issues (no PRs), handles pagination. */
async function fetchOpenIssues(repo, token) {
  const issues = [];
  let page = 1;
  while (true) {
    const { body } = await apiRequest(
      `/repos/${repo}/issues?state=open&per_page=100&page=${page}`,
      token,
    );
    if (!Array.isArray(body) || body.length === 0) break;
    // GitHub returns PRs via the issues endpoint; filter them out
    issues.push(...body.filter((i) => !i.pull_request));
    if (body.length < 100) break;
    page++;
  }
  return issues;
}

/** Returns true if the issue/PR number exists in the repo. */
async function issueExists(repo, number, token) {
  const { status } = await apiRequest(
    `/repos/${repo}/issues/${number}`,
    token,
  );
  return status === 200;
}

// ---------------------------------------------------------------------------
// Parsing helpers (shared logic with validate-dependency-links.js)
// ---------------------------------------------------------------------------

function extractDependencySections(body) {
  if (!body) return [];

  const lines = body.split("\n");
  const sections = [];
  let capturing = false;
  let current = [];

  for (const line of lines) {
    const headingMatch =
      line.match(/^#{1,6}\s+(.+)$/) ||
      line.match(/^\*{1,2}([^*]+)\*{1,2}:?\s*$/);

    if (headingMatch) {
      const heading = headingMatch[1].trim().toLowerCase().replace(/:$/, "");

      if (
        DEPENDENCY_HEADINGS.some((h) => heading === h || heading.startsWith(h))
      ) {
        if (capturing && current.length) sections.push(current.join("\n"));
        capturing = true;
        current = [];
        continue;
      } else if (capturing) {
        if (current.length) sections.push(current.join("\n"));
        capturing = false;
        current = [];
      }
    }

    if (capturing) current.push(line);
  }

  if (capturing && current.length) sections.push(current.join("\n"));
  return sections;
}

function extractIssueRefs(text) {
  const refs = [];
  const seen = new Set();

  const patterns = [
    /https?:\/\/github\.com\/[^/\s]+\/[^/\s]+\/(?:issues|pull)\/(\d+)/gi,
    /[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+#(\d+)/g,
    /(?<![a-zA-Z0-9_/-])#(\d+)/g,
  ];

  for (const pat of patterns) {
    let m;
    while ((m = pat.exec(text)) !== null) {
      const num = parseInt(m[1], 10);
      if (!seen.has(num)) {
        seen.add(num);
        refs.push({ raw: m[0], number: num });
      }
    }
  }

  return refs;
}

/** Detect malformed dependency section: section found but empty. */
function isMalformedSection(sections, refs) {
  return sections.length > 0 && refs.length === 0;
}

// ---------------------------------------------------------------------------
// Per-issue scan
// ---------------------------------------------------------------------------

async function scanIssue(issue, repo, token) {
  const body = issue.body || "";
  const sections = extractDependencySections(body);
  const refs = extractIssueRefs(sections.join("\n"));

  const result = {
    number: issue.number,
    title: issue.title,
    url: issue.html_url,
    sectionFound: sections.length > 0,
    malformedSection: isMalformedSection(sections, refs),
    refs: [],
    broken: [],
    selfRefs: [],
  };

  for (const ref of refs) {
    result.refs.push(ref.raw);

    if (ref.number === issue.number) {
      result.selfRefs.push(ref.raw);
      continue;
    }

    const exists = await issueExists(repo, ref.number, token);
    if (!exists) {
      result.broken.push({ raw: ref.raw, number: ref.number });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Report formatting
// ---------------------------------------------------------------------------

function buildTextReport(results) {
  const flagged = results.filter(
    (r) => r.broken.length > 0 || r.selfRefs.length > 0 || r.malformedSection,
  );
  const lines = [
    "=== Issue Dependency-Link Scan Report ===",
    `Scanned:  ${results.length} open issues`,
    `Flagged:  ${flagged.length} issues need attention`,
    "",
  ];

  if (flagged.length === 0) {
    lines.push("✓ All dependency sections look healthy.");
    return { output: lines.join("\n"), hasErrors: false };
  }

  for (const r of flagged) {
    lines.push(`Issue #${r.number}: ${r.title}`);
    lines.push(`  URL: ${r.url}`);

    if (r.malformedSection) {
      lines.push(
        "  ⚠ Dependency section exists but contains no issue references.",
      );
      lines.push(
        "    Fix: add references like `#123` or remove the empty section.",
      );
    }

    for (const s of r.selfRefs) {
      lines.push(`  ✗ Self-reference: ${s}`);
      lines.push("    Fix: remove — an issue cannot depend on itself.");
    }

    for (const b of r.broken) {
      lines.push(`  ✗ Broken reference: ${b.raw} → #${b.number} not found`);
      lines.push(
        "    Fix: correct the issue number or remove the stale reference.",
      );
    }

    lines.push("");
  }

  return { output: lines.join("\n"), hasErrors: true };
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

  console.log(`Scanning open issues in ${repo} for broken dependency links…`);

  const issues = await fetchOpenIssues(repo, token);
  console.log(`Found ${issues.length} open issues`);

  const results = [];
  for (const issue of issues) {
    const r = await scanIssue(issue, repo, token);
    results.push(r);
  }

  if (OUTPUT_JSON) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  const { output, hasErrors } = buildTextReport(results);
  console.log("\n" + output);

  if (hasErrors && !DRY_RUN) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
