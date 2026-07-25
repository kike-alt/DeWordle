#!/usr/bin/env node
/**
 * Wave Issue Dedupe Checker (AI/AUTOMATION-202)
 *
 * Compares proposed issue definitions against open and recently closed issues
 * using configurable matching rules. Reports high-confidence duplicates
 * separately from low-confidence similarity suggestions.
 *
 * Usage:
 *   node scripts/wave-issue-dedupe-checker.js [proposed-issues.json]
 *
 * Required env vars:
 *   GITHUB_TOKEN   - token with repo read permissions
 *   GITHUB_REPO    - owner/repo (e.g. "org/dewordle")
 *
 * Optional env vars:
 *   CLOSED_WINDOW_DAYS - days back to scan closed issues (default: 90)
 *   HIGH_CONFIDENCE    - score ≥ this is high-confidence duplicate (default: 0.7)
 *   LOW_CONFIDENCE     - score ≥ this is low-confidence suggestion (default: 0.35)
 *   OUTPUT_JSON        - "true" for machine-readable JSON
 *   DRY_RUN            - "true" to skip non-zero exit on findings
 */

"use strict";

const https = require("https");
const fs = require("fs");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CLOSED_WINDOW_DAYS = parseInt(
  process.env.CLOSED_WINDOW_DAYS || "90",
  10,
);
const HIGH_CONFIDENCE = parseFloat(process.env.HIGH_CONFIDENCE || "0.7");
const LOW_CONFIDENCE = parseFloat(process.env.LOW_CONFIDENCE || "0.35");
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
        "User-Agent": "wave-issue-dedupe-checker-bot",
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

async function fetchOpenIssues(repo, token) {
  const issues = await paginate(
    `/repos/${repo}/issues?state=open`,
    token,
  );
  return issues.filter((i) => !i.pull_request);
}

async function fetchRecentlyClosedIssues(repo, token) {
  const since = new Date(
    Date.now() - CLOSED_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const issues = await paginate(
    `/repos/${repo}/issues?state=closed&since=${since}`,
    token,
  );
  return issues.filter((i) => !i.pull_request);
}

// ---------------------------------------------------------------------------
// Matching helpers (exported for testing)
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

function matchByTrack(proposed, existing) {
  const proposedTracks = (proposed.labels || [])
    .filter((l) => l.name.startsWith("track:"))
    .map((l) => l.name);
  const existingTracks = (existing.labels || [])
    .filter((l) => l.name.startsWith("track:"))
    .map((l) => l.name);

  if (proposedTracks.length === 0 || existingTracks.length === 0) return false;
  return proposedTracks.some((t) => existingTracks.includes(t));
}

function matchByDifficulty(proposed, existing) {
  const proposedDiff = (proposed.labels || []).find((l) =>
    l.name.startsWith("difficulty:"),
  );
  const existingDiff = (existing.labels || []).find((l) =>
    l.name.startsWith("difficulty:"),
  );
  if (!proposedDiff || !existingDiff) return false;
  return proposedDiff.name === existingDiff.name;
}

function computeDedupeScore(proposed, existing) {
  const titleSim = titleOverlap(proposed.title, existing.title);
  const bodySim = cosineSimilarity(proposed.body || "", existing.body || "");
  const labelSim = labelOverlap(proposed.labels || [], existing.labels || []);
  const trackMatch = matchByTrack(proposed, existing) ? 0.15 : 0;
  const diffMatch = matchByDifficulty(proposed, existing) ? 0.1 : 0;

  const combined = Math.min(
    1,
    titleSim * 0.35 + bodySim * 0.25 + labelSim * 0.15 + trackMatch + diffMatch,
  );

  return {
    titleSimilarity: Math.round(titleSim * 100) / 100,
    bodySimilarity: Math.round(bodySim * 100) / 100,
    labelOverlap: Math.round(labelSim * 100) / 100,
    trackMatch,
    difficultyMatch: diffMatch,
    combined: Math.round(combined * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// Dedupe analysis
// ---------------------------------------------------------------------------

function analyseProposedIssue(proposed, openIssues, closedIssues) {
  const matches = [];

  const allExisting = [
    ...openIssues.map((i) => ({ ...i, _state: "open" })),
    ...closedIssues.map((i) => ({ ...i, _state: "closed" })),
  ];

  for (const existing of allExisting) {
    const score = computeDedupeScore(proposed, existing);
    if (score.combined >= LOW_CONFIDENCE) {
      matches.push({
        existingNumber: existing.number,
        existingTitle: existing.title,
        existingUrl: existing.html_url,
        state: existing._state,
        stateReason: existing.state_reason || null,
        closedAt: existing.closed_at || null,
        ...score,
        confidence:
          score.combined >= HIGH_CONFIDENCE ? "high" : "low",
      });
    }
  }

  matches.sort((a, b) => b.combined - a.combined);

  const highConfidence = matches.filter((m) => m.confidence === "high");
  const lowConfidence = matches.filter((m) => m.confidence === "low");

  return {
    proposed: {
      title: proposed.title,
      body: proposed.body ? proposed.body.slice(0, 200) + "..." : "",
      labels: (proposed.labels || []).map((l) => l.name),
    },
    totalMatches: matches.length,
    highConfidenceCount: highConfidence.length,
    lowConfidenceCount: lowConfidence.length,
    highConfidence,
    lowConfidence,
  };
}

// ---------------------------------------------------------------------------
// Report formatting
// ---------------------------------------------------------------------------

function buildTextReport(results) {
  const lines = [
    "=== Wave Issue Dedupe Check Report ===",
    `High-confidence threshold: ≥ ${HIGH_CONFIDENCE}`,
    `Low-confidence threshold: ≥ ${LOW_CONFIDENCE}`,
    `Proposed issues analysed: ${results.length}`,
    "",
  ];

  const totalHigh = results.reduce((s, r) => s + r.highConfidenceCount, 0);
  const totalLow = results.reduce((s, r) => s + r.lowConfidenceCount, 0);
  lines.push(`Total high-confidence duplicates: ${totalHigh}`);
  lines.push(`Total low-confidence suggestions: ${totalLow}`);
  lines.push("");

  if (totalHigh === 0 && totalLow === 0) {
    lines.push("No duplicates or similarities detected across any proposed issue.");
    return { output: lines.join("\n"), hasFindings: false };
  }

  for (const r of results) {
    if (r.totalMatches === 0) continue;

    lines.push(`Proposed: "${r.proposed.title}"`);
    lines.push(`  Labels: ${r.proposed.labels.join(", ") || "(none)"}`);
    lines.push("");

    if (r.highConfidence.length > 0) {
      lines.push("  ⚠ HIGH-CONFIDENCE DUPLICATES:");
      for (const m of r.highConfidence) {
        lines.push(
          `    #${m.existingNumber} [${m.state}] "${m.existingTitle}" — ` +
            `score=${m.combined} ${m.closedAt ? `(closed ${m.closedAt.slice(0, 10)})` : ""}`,
        );
        lines.push(`      ${m.existingUrl}`);
      }
      lines.push("");
    }

    if (r.lowConfidence.length > 0) {
      lines.push("  🔍 LOW-CONFIDENCE SIMILARITY SUGGESTIONS:");
      for (const m of r.lowConfidence.slice(0, 5)) {
        lines.push(
          `    #${m.existingNumber} [${m.state}] "${m.existingTitle}" — score=${m.combined}`,
        );
        lines.push(`      ${m.existingUrl}`);
      }
      if (r.lowConfidence.length > 5) {
        lines.push(
          `    ... and ${r.lowConfidence.length - 5} more (use --json for full list)`,
        );
      }
      lines.push("");
    }
  }

  return { output: lines.join("\n"), hasFindings: totalHigh > 0 || totalLow > 0 };
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

  let proposedIssues;
  if (proposedPath) {
    proposedIssues = JSON.parse(fs.readFileSync(proposedPath, "utf-8"));
  } else {
    const stdin = fs.readFileSync("/dev/stdin", "utf-8").trim();
    if (stdin) {
      proposedIssues = JSON.parse(stdin);
    } else {
      console.error(
        "Usage: node scripts/wave-issue-dedupe-checker.js [proposed-issues.json]",
      );
      console.error("       or pipe JSON via stdin");
      process.exit(1);
    }
  }

  if (!Array.isArray(proposedIssues)) {
    proposedIssues = [proposedIssues];
  }

  console.log(
    `Fetching open and recently closed issues from ${repo}…`,
  );

  const [openIssues, closedIssues] = await Promise.all([
    fetchOpenIssues(repo, token),
    fetchRecentlyClosedIssues(repo, token),
  ]);

  console.log(
    `Found ${openIssues.length} open + ${closedIssues.length} recently closed issues\n`,
  );

  const results = proposedIssues.map((p) =>
    analyseProposedIssue(p, openIssues, closedIssues),
  );

  if (OUTPUT_JSON) {
    console.log(
      JSON.stringify(
        {
          highConfidenceThreshold: HIGH_CONFIDENCE,
          lowConfidenceThreshold: LOW_CONFIDENCE,
          closedWindowDays: CLOSED_WINDOW_DAYS,
          results,
        },
        null,
        2,
      ),
    );
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
  cosineSimilarity,
  titleOverlap,
  labelOverlap,
  matchByTrack,
  matchByDifficulty,
  computeDedupeScore,
  analyseProposedIssue,
};
