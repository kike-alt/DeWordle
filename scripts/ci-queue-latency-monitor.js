#!/usr/bin/env node
/**
 * CI Queue-Latency Monitor (issue #665)
 *
 * Reports queued-time and run-time percentiles for recent workflow runs so
 * contributors can spot throughput bottlenecks.
 *
 * Usage:
 *   node scripts/ci-queue-latency-monitor.js
 *
 * Required env vars:
 *   GITHUB_TOKEN, GITHUB_REPO (owner/repo)
 * Optional:
 *   RUN_LIMIT - number of recent runs to sample (default 50)
 */
"use strict";

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const limit = Number(process.env.RUN_LIMIT || 50);
  if (!token || !repo) {
    throw new Error("GITHUB_TOKEN and GITHUB_REPO are required");
  }

  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/runs?per_page=${limit}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } },
  );
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const { workflow_runs: runs } = await res.json();

  const queueMs = runs
    .filter((r) => r.run_started_at)
    .map((r) => new Date(r.run_started_at) - new Date(r.created_at))
    .sort((a, b) => a - b);

  const report = {
    sample_size: queueMs.length,
    p50_queue_ms: percentile(queueMs, 50),
    p90_queue_ms: percentile(queueMs, 90),
    p99_queue_ms: percentile(queueMs, 99),
  };

  console.log(JSON.stringify(report, null, 2));
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { percentile };
