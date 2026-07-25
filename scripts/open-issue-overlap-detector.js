#!/usr/bin/env node
/**
 * Open-Issue Overlap Detector (AI/AUTOMATION-201)
 *
 * Parses existing open issue metadata and flags likely overlaps against a
 * proposed issue set. Emits output that maintainers can review without
 * editing the repo manually.
 *
 * Usage:
 *   node scripts/open-issue-overlap-detector.js [proposed-issues.json]
 *
 * Required env vars:
 *   GITHUB_TOKEN  - token with repo read permissions
 *   GITHUB_REPO   - owner/repo (e.g. "org/dewordle")
 *
 * Optional env vars:
 *   SIMILARITY_THRESHOLD - minimum score (0-1) to flag overlap (default: 0.4)
 *   OUTPUT_JSON          - "true" for machine-readable JSON
 *   DRY_RUN              - "true" to print report without non-zero exit
 */

"use strict";

const https = require("https");
const fs = require("fs");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SIMILARITY_THRESHOLD = parseFloat(
  process.env.SIMILARITY_THRESHOLD || "0.4",
);
const OUTPUT_JSON = process.env.OUTPUT_JSON === "true";
const DRY_RUN = process.env.DRY_RUN === "true";

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
        "User-Agent": "open-issue-overlap-detector-bot",
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
// Similarity helpers (exported for testing)
// ---------------------------------------------------------------------------

function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function buildFrequencyVector(tokens) {
  const vec = {};
  for (const t of tokens) {
    vec[t] = (vec[t] || 0) + 1;
  }
  return vec;
}

function cosineSimilarity(textA, textB) {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const vecA = buildFrequencyVector(tokensA);
  const vecB = buildFrequencyVector(tokensB);

  const allTokens = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);

  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (const token of allTokens) {
    const a = vecA[token] || 0;
    const b = vecB[token] || 0;
    dotProduct += a * b;
    magA += a * a;
    magB += b * b;
  }

  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

function titleOverlap(titleA, titleB) {
  const tokensA = new Set(tokenize(titleA));
  const tokensB = new Set(tokenize(titleB));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }

  return (2 * intersection) / (tokensA.size + tokensB.size);
}

function labelOverlap(labelsA, labelsB) {
  if (!labelsA.length || !labelsB.length) return 0;
  const setA = new Set(labelsA.map((l) => l.name.toLowerCase()));
  const setB = new Set(labelsB.map((l) => l.name.toLowerCase()));
  let intersection = 0;
  for (const l of setA) {
    if (setB.has(l)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function computeOverlapScore(proposed, existing) {
  const titleSim = titleOverlap(proposed.title, existing.title);
  const bodySim = cosineSimilarity(proposed.body || "", existing.body || "");
  const labelSim = labelOverlap(proposed.labels || [], existing.labels || []);

  return {
    titleSimilarity: Math.round(titleSim * 100) / 100,
    bodySimilarity: Math.round(bodySim * 100) / 100,
    labelOverlap: Math.round(labelSim * 100) / 100,
    combined: Math.round(
      (titleSim * 0.4 + bodySim * 0.35 + labelSim * 0.25) * 100,
    ) / 100,
  };
}

// ---------------------------------------------------------------------------
// Overlap analysis
// ---------------------------------------------------------------------------

function analyseProposedIssue(proposed, existingIssues, threshold) {
  const overlaps = [];

  for (const existing of existingIssues) {
    const score = computeOverlapScore(proposed, existing);
    if (score.combined >= threshold) {
      overlaps.push({
        existingNumber: existing.number,
        existingTitle: existing.title,
        existingUrl: existing.html_url,
        ...score,
      });
    }
  }

  overlaps.sort((a, b) => b.combined - a.combined);

  return {
    proposed: {
      title: proposed.title,
      body: proposed.body ? proposed.body.slice(0, 200) + "..." : "",
      labels: (proposed.labels || []).map((l) => l.name),
    },
    overlapCount: overlaps.length,
    overlaps,
    recommendation:
      overlaps.length === 0
        ? "No overlaps detected — safe to add."
        : overlaps.some((o) => o.combined >= 0.7)
          ? "HIGH: Strong overlap detected — review before adding."
          : overlaps.some((o) => o.combined >= 0.5)
            ? "MEDIUM: Significant overlap — consider merging or clarifying scope."
            : "LOW: Partial overlap — review suggested issues for edge cases.",
  };
}

// ---------------------------------------------------------------------------
// Report formatting
// ---------------------------------------------------------------------------

function buildTextReport(results) {
  const lines = [
    "=== Open-Issue Overlap Detection Report ===",
    `Threshold: ≥ ${SIMILARITY_THRESHOLD}`,
    `Proposed issues analysed: ${results.length}`,
    "",
  ];

  const flagged = results.filter((r) => r.overlapCount > 0);
  if (flagged.length === 0) {
    lines.push("No overlaps detected across any proposed issue.");
    return { output: lines.join("\n"), hasFindings: false };
  }

  for (const r of flagged) {
    lines.push(`Proposed: "${r.proposed.title}"`);
    lines.push(`  Labels: ${r.proposed.labels.join(", ") || "(none)"}`);
    lines.push(`  Recommendation: ${r.recommendation}`);
    lines.push(`  Overlapping issues (${r.overlapCount}):`);

    for (const o of r.overlaps.slice(0, 5)) {
      lines.push(
        `    #${o.existingNumber} "${o.existingTitle}" — ` +
          `combined=${o.combined} ` +
          `(title=${o.titleSimilarity}, body=${o.bodySimilarity}, ` +
          `labels=${o.labelOverlap})`,
      );
      lines.push(`      ${o.existingUrl}`);
    }

    if (r.overlaps.length > 5) {
      lines.push(
        `    ... and ${r.overlaps.length - 5} more (use --json for full list)`,
      );
    }

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
  const proposedPath = process.argv[2];

  if (!token || !repo) {
    console.error("Missing required env vars: GITHUB_TOKEN, GITHUB_REPO");
    process.exit(1);
  }

  // Read proposed issues from file or stdin
  let proposedIssues;
  if (proposedPath) {
    proposedIssues = JSON.parse(fs.readFileSync(proposedPath, "utf-8"));
  } else {
    const stdin = fs.readFileSync("/dev/stdin", "utf-8").trim();
    if (stdin) {
      proposedIssues = JSON.parse(stdin);
    } else {
      console.error(
        "Usage: node scripts/open-issue-overlap-detector.js [proposed-issues.json]",
      );
      console.error("       or pipe JSON via stdin");
      process.exit(1);
    }
  }

  if (!Array.isArray(proposedIssues)) {
    proposedIssues = [proposedIssues];
  }

  console.log(
    `Fetching open issues from ${repo} to check against ${proposedIssues.length} proposed…`,
  );

  const existingIssues = await fetchOpenIssues(repo, token);
  console.log(`Found ${existingIssues.length} open issues\n`);

  const results = proposedIssues.map((p) =>
    analyseProposedIssue(p, existingIssues, SIMILARITY_THRESHOLD),
  );

  if (OUTPUT_JSON) {
    console.log(JSON.stringify({ threshold: SIMILARITY_THRESHOLD, results }, null, 2));
    return;
  }

  const { output, hasFindings } = buildTextReport(results);
  console.log(output);

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
  tokenize,
  buildFrequencyVector,
  cosineSimilarity,
  titleOverlap,
  labelOverlap,
  computeOverlapScore,
  analyseProposedIssue,
};
