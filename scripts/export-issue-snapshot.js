#!/usr/bin/env node
/**
 * export-issue-snapshot.js
 *
 * Exports an issue inventory snapshot to JSON and CSV filtered by track,
 * label, and/or status. Does NOT mutate any GitHub state.
 *
 * Usage:
 *   GITHUB_TOKEN=... node scripts/export-issue-snapshot.js [options]
 *
 * Options:
 *   --repo    owner/repo              (default: kike-alt/DeWordle)
 *   --state   open|closed|all         (default: open)
 *   --label   label name to filter    (repeatable: --label foo --label bar)
 *   --out     output directory        (default: ./snapshots)
 *   --format  json|csv|both           (default: both)
 *
 * Environment:
 *   GITHUB_TOKEN   Required — token with repo read scope
 *
 * How to regenerate without mutating state:
 *   This script is read-only. Re-run at any time with the same flags.
 *   Snapshot filenames include an ISO timestamp so runs never overwrite each other.
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// GitHub API
// ---------------------------------------------------------------------------

function apiGet(apiPath, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "api.github.com",
      path: apiPath,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "export-issue-snapshot-bot",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    };
    const req = https.request(opts, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

async function paginate(basePath, token) {
  const results = [];
  let page = 1;
  while (true) {
    const sep = basePath.includes("?") ? "&" : "?";
    const { status, body } = await apiGet(`${basePath}${sep}per_page=100&page=${page}`, token);
    if (status !== 200 || !Array.isArray(body) || body.length === 0) break;
    results.push(...body);
    if (body.length < 100) break;
    page++;
  }
  return results;
}

// ---------------------------------------------------------------------------
// Fetch & filter
// ---------------------------------------------------------------------------

async function fetchIssues(repo, state, labels, token) {
  const labelParam = labels.length ? `&labels=${labels.map(encodeURIComponent).join(",")}` : "";
  const raw = await paginate(
    `/repos/${repo}/issues?state=${state}&filter=all${labelParam}`,
    token
  );
  // Exclude pull requests
  return raw.filter((i) => !i.pull_request);
}

// ---------------------------------------------------------------------------
// Normalise to flat record
// ---------------------------------------------------------------------------

function normalise(issue) {
  return {
    number: issue.number,
    title: issue.title,
    state: issue.state,
    labels: (issue.labels || []).map((l) => l.name).join("|"),
    assignees: (issue.assignees || []).map((a) => a.login).join("|"),
    author: issue.user?.login || "",
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    closed_at: issue.closed_at || "",
    url: issue.html_url,
    milestone: issue.milestone?.title || "",
    comments: issue.comments,
    body_length: (issue.body || "").length,
  };
}

// ---------------------------------------------------------------------------
// Serialisers
// ---------------------------------------------------------------------------

function toJson(records) {
  return JSON.stringify(records, null, 2);
}

function toCsv(records) {
  if (records.length === 0) return "";
  const headers = Object.keys(records[0]);
  const escape = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const rows = records.map((r) => headers.map((h) => escape(r[h])).join(","));
  return [headers.join(","), ...rows].join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);

  const get = (flag, def) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : def;
  };

  const repo = get("--repo", process.env.GITHUB_REPO || "kike-alt/DeWordle");
  const state = get("--state", "open");
  const outDir = get("--out", "snapshots");
  const format = get("--format", "both");
  const token = process.env.GITHUB_TOKEN;

  // Collect all --label values
  const labels = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--label" && args[i + 1]) labels.push(args[i + 1]);
  }

  if (!token) {
    console.error("Error: GITHUB_TOKEN env var is required.");
    process.exit(1);
  }

  console.error(`Fetching ${state} issues from ${repo}${labels.length ? ` (labels: ${labels.join(", ")})` : ""}…`);
  const issues = await fetchIssues(repo, state, labels, token);
  console.error(`Fetched ${issues.length} issue(s).`);

  const records = issues.map(normalise);

  // Build output filename stem
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const labelSlug = labels.length ? `-${labels.join("-").replace(/[^a-z0-9]/gi, "_").slice(0, 30)}` : "";
  const stem = `issues-${state}${labelSlug}-${ts}`;

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  if (format === "json" || format === "both") {
    const file = path.join(outDir, `${stem}.json`);
    fs.writeFileSync(file, toJson(records));
    console.log(`JSON snapshot: ${file}  (${records.length} records)`);
  }

  if (format === "csv" || format === "both") {
    const file = path.join(outDir, `${stem}.csv`);
    fs.writeFileSync(file, toCsv(records));
    console.log(`CSV  snapshot: ${file}  (${records.length} records)`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
