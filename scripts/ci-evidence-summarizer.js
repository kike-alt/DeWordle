#!/usr/bin/env node
/**
 * CI Evidence Summarizer (AI/AUTOMATION-204)
 *
 * Summarizes relevant CI results, failure artifacts, or validation evidence
 * for a PR in a structured format that maintainers can use during review prep.
 *
 * Usage:
 *   node scripts/ci-evidence-summarizer.js <pr-number>
 *
 * Required env vars:
 *   GITHUB_TOKEN   - token with repo read + checks read permissions
 *   GITHUB_REPO    - owner/repo (e.g. "org/dewordle")
 *
 * Optional env vars:
 *   OUTPUT_JSON    - "true" for machine-readable JSON only
 */

"use strict";

const https = require("https");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OUTPUT_JSON = process.env.OUTPUT_JSON === "true";

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
        "User-Agent": "ci-evidence-summarizer-bot",
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
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        if (res.statusCode >= 400) {
          reject(
            new Error(`GitHub API ${res.statusCode} ${method} ${path}: ${raw}`),
          );
        } else {
          try {
            resolve(raw ? JSON.parse(raw) : {});
          } catch {
            resolve(raw);
          }
        }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function paginate(path, token) {
  const items = [];
  let page = 1;
  while (true) {
    const sep = path.includes("?") ? "&" : "?";
    const body = await apiRequest(
      "GET",
      `${path}${sep}per_page=100&page=${page}`,
      null,
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
// CI data fetching (exported for testing)
// ---------------------------------------------------------------------------

async function fetchCheckRuns(repo, ref, token) {
  try {
    const { check_runs } = await apiRequest(
      "GET",
      `/repos/${repo}/commits/${ref}/check-runs`,
      null,
      token,
    );
    return check_runs || [];
  } catch {
    return [];
  }
}

async function fetchWorkflowRuns(repo, branch, token) {
  try {
    const { workflow_runs } = await apiRequest(
      "GET",
      `/repos/${repo}/actions/runs?branch=${encodeURIComponent(branch)}&per_page=30`,
      null,
      token,
    );
    return workflow_runs || [];
  } catch {
    return [];
  }
}

async function fetchPR(repo, prNumber, token) {
  return apiRequest(
    "GET",
    `/repos/${repo}/pulls/${prNumber}`,
    null,
    token,
  );
}

async function fetchPRCommits(repo, prNumber, token) {
  return paginate(`/repos/${repo}/pulls/${prNumber}/commits`, token);
}

async function fetchWorkflowJobs(repo, runId, token) {
  try {
    const { jobs } = await apiRequest(
      "GET",
      `/repos/${repo}/actions/runs/${runId}/jobs`,
      null,
      token,
    );
    return jobs || [];
  } catch {
    return [];
  }
}

async function fetchArtifacts(repo, runId, token) {
  try {
    const { artifacts } = await apiRequest(
      "GET",
      `/repos/${repo}/actions/runs/${runId}/artifacts`,
      null,
      token,
    );
    return artifacts || [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Summary building (exported for testing)
// ---------------------------------------------------------------------------

function classifyConclusion(conclusion) {
  switch (conclusion) {
    case "success":
      return { status: "pass", icon: "✓" };
    case "failure":
      return { status: "fail", icon: "✗" };
    case "neutral":
      return { status: "neutral", icon: "○" };
    case "cancelled":
      return { status: "cancelled", icon: "⏹" };
    case "timed_out":
      return { status: "timeout", icon: "⏰" };
    case "action_required":
      return { status: "action_required", icon: "⚠" };
    default:
      return { status: conclusion || "unknown", icon: "?" };
  }
}

function buildCheckSummary(checkRuns) {
  const grouped = {};
  for (const run of checkRuns) {
    const { status, icon } = classifyConclusion(run.conclusion);
    const name = run.name;
    if (!grouped[name]) {
      grouped[name] = { name, status, icon, conclusion: run.conclusion, url: run.html_url };
    }
  }
  return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
}

function buildWorkflowSummary(workflowRuns, headSha) {
  const relevant = workflowRuns.filter(
    (r) => r.head_sha === headSha,
  );
  return relevant.map((r) => {
    const { status, icon } = classifyConclusion(r.conclusion);
    return {
      name: r.name,
      workflowId: r.id,
      status,
      icon,
      conclusion: r.conclusion,
      url: r.html_url,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      headBranch: r.head_branch,
      event: r.event,
    };
  });
}

function buildJobSummary(jobs) {
  return jobs.map((j) => {
    const { status, icon } = classifyConclusion(j.conclusion);
    return {
      name: j.name,
      status,
      icon,
      conclusion: j.conclusion,
      url: j.html_url,
      startedAt: j.started_at,
      completedAt: j.completed_at,
      duration:
        j.started_at && j.completed_at
          ? Math.round(
              (new Date(j.completed_at) - new Date(j.started_at)) / 1000,
            ) + "s"
          : null,
    };
  });
}

function buildArtifactSummary(artifacts) {
  return artifacts.map((a) => ({
    name: a.name,
    sizeBytes: a.size_in_bytes,
    url: a.archive_download_url,
    createdAt: a.created_at,
    expired: a.expired,
  }));
}

// ---------------------------------------------------------------------------
// Markdown renderer
// ---------------------------------------------------------------------------

function buildMarkdownSummary(pr, checks, workflows, jobsByRun, artifactsByRun) {
  const lines = [
    "## CI Evidence Summary",
    "",
    `**PR:** [#${pr.number}](${pr.html_url}) ${pr.title}`,
    `**Branch:** \`${pr.head.ref}\` → \`${pr.base.ref}\``,
    `**Head SHA:** \`${pr.head.sha.slice(0, 7)}\``,
    `**Author:** @${pr.user.login}`,
    "",
  ];

  // Check runs
  const passChecks = checks.filter((c) => c.status === "pass");
  const failChecks = checks.filter((c) => c.status === "fail");
  const otherChecks = checks.filter(
    (c) => c.status !== "pass" && c.status !== "fail",
  );

  if (checks.length === 0) {
    lines.push("### Check Runs");
    lines.push("_No check runs found for the latest commit._");
    lines.push("");
  } else {
    lines.push(
      `### Check Runs (${passChecks.length} passed, ${failChecks.length} failed, ${otherChecks.length} other)`,
    );
    lines.push("");
    for (const c of checks) {
      lines.push(`- ${c.icon} **${c.name}** — ${c.conclusion || "pending"}`);
    }
    lines.push("");
  }

  // Workflow runs
  if (workflows.length > 0) {
    lines.push(`### Workflow Runs (${workflows.length})`);
    lines.push("");
    for (const w of workflows) {
      const jobList = jobsByRun[w.workflowId] || [];
      const artifactList = artifactsByRun[w.workflowId] || [];
      lines.push(`- ${w.icon} **${w.name}** — ${w.conclusion || "in_progress"}`);
      if (jobList.length > 0) {
        for (const j of jobList) {
          lines.push(`  - ${j.icon} ${j.name} (${j.duration || "running"})`);
        }
      }
      if (artifactList.length > 0) {
        for (const a of artifactList) {
          const size =
            a.sizeBytes > 1024
              ? `${(a.sizeBytes / 1024).toFixed(1)} KB`
              : `${a.sizeBytes} B`;
          lines.push(`  - 📦 Artifact: \`${a.name}\` (${size})`);
        }
      }
    }
    lines.push("");
  }

  const hasFailures =
    failChecks.length > 0 ||
    workflows.some((w) => w.status === "fail" || w.status === "timeout");

  if (hasFailures) {
    lines.push("### ⚠ Action Items");
    lines.push("");
    if (failChecks.length > 0) {
      lines.push(
        `- ${failChecks.length} check run(s) failed — review logs linked above.`,
      );
    }
    if (workflows.some((w) => w.status === "timeout")) {
      lines.push("- Some workflow(s) timed out — consider increasing timeout or optimizing.");
    }
    lines.push("");
  }

  lines.push("---");
  lines.push(
    "_Generated by `scripts/ci-evidence-summarizer.js` — review the full CI details before merging._",
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const prNumber = parseInt(process.argv[2], 10);

  if (!token || !repo) {
    console.error("Missing required env vars: GITHUB_TOKEN, GITHUB_REPO");
    process.exit(1);
  }

  if (!prNumber || isNaN(prNumber)) {
    console.error("Usage: node scripts/ci-evidence-summarizer.js <pr-number>");
    process.exit(1);
  }

  console.log(`Fetching CI evidence for PR #${prNumber} in ${repo}…`);

  const pr = await fetchPR(repo, prNumber, token);
  if (!pr || !pr.head) {
    console.error(`PR #${prNumber} not found`);
    process.exit(1);
  }

  const headSha = pr.head.sha;
  const headBranch = pr.head.ref;

  const [checkRuns, workflowRuns, commits] = await Promise.all([
    fetchCheckRuns(repo, headSha, token),
    fetchWorkflowRuns(repo, headBranch, token),
    fetchPRCommits(repo, prNumber, token),
  ]);

  const workflows = buildWorkflowSummary(workflowRuns, headSha);

  // Fetch jobs and artifacts per workflow run
  const jobsByRun = {};
  const artifactsByRun = {};

  for (const w of workflows) {
    const [jobs, artifacts] = await Promise.all([
      fetchWorkflowJobs(repo, w.workflowId, token),
      fetchArtifacts(repo, w.workflowId, token),
    ]);
    jobsByRun[w.workflowId] = buildJobSummary(jobs);
    artifactsByRun[w.workflowId] = buildArtifactSummary(artifacts);
  }

  const checks = buildCheckSummary(checkRuns);

  if (OUTPUT_JSON) {
    console.log(
      JSON.stringify(
        {
          pr: { number: pr.number, title: pr.title, headSha, headBranch },
          checks,
          workflows,
          jobs: jobsByRun,
          artifacts: artifactsByRun,
          commits: commits.length,
        },
        null,
        2,
      ),
    );
    return;
  }

  const markdown = buildMarkdownSummary(pr, checks, workflows, jobsByRun, artifactsByRun);
  console.log("\n" + markdown);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  classifyConclusion,
  buildCheckSummary,
  buildWorkflowSummary,
  buildJobSummary,
  buildArtifactSummary,
  buildMarkdownSummary,
};
