#!/usr/bin/env node
/**
 * Reproducibility Badge Generator (issue #661)
 *
 * Computes a recent CI success rate and writes a shields.io "endpoint"
 * badge JSON file for contributor confidence at a glance.
 *
 * Usage:
 *   node scripts/generate-repro-badge.js
 * Required env vars:
 *   GITHUB_TOKEN, GITHUB_REPO
 * Optional:
 *   RUN_LIMIT (default 30), OUT_FILE (default docs/badge-repro.json)
 */
"use strict";
const fs = require("fs");

function badgeColor(rate) {
  if (rate >= 90) return "brightgreen";
  if (rate >= 75) return "yellow";
  return "red";
}

function buildBadge(runs) {
  const completed = runs.filter((r) => r.conclusion);
  const successes = completed.filter((r) => r.conclusion === "success").length;
  const rate = completed.length === 0 ? 0 : Math.round((successes / completed.length) * 100);

  return {
    schemaVersion: 1,
    label: "reproducibility",
    message: `${rate}%`,
    color: badgeColor(rate),
  };
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const limit = Number(process.env.RUN_LIMIT || 30);
  const outFile = process.env.OUT_FILE || "docs/badge-repro.json";
  if (!token || !repo) throw new Error("GITHUB_TOKEN and GITHUB_REPO are required");

  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/runs?per_page=${limit}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } },
  );
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const { workflow_runs: runs } = await res.json();

  const badge = buildBadge(runs);
  fs.writeFileSync(outFile, JSON.stringify(badge, null, 2) + "\n");
  console.log(`Wrote ${outFile}: ${badge.message}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { buildBadge, badgeColor };
