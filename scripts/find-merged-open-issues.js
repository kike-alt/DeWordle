#!/usr/bin/env node
/**
 * find-merged-open-issues.js
 *
 * Compares merged PRs against open issues to find likely closure candidates.
 * Output separates high-confidence candidates from items needing manual review.
 *
 * A PR is considered a closure candidate for an issue when:
 *   HIGH confidence: PR body contains "Closes #N", "Fixes #N", or "Resolves #N"
 *   LOW  confidence: PR title or branch name contains the issue number
 *
 * Usage:
 *   GITHUB_TOKEN=... node scripts/find-merged-open-issues.js --repo owner/repo
 *
 * Options:
 *   --repo    owner/repo  (default: kike-alt/DeWordle)
 *   --limit   Max merged PRs to inspect (default: 100)
 *   --json    Output raw JSON
 *
 * Environment:
 *   GITHUB_TOKEN   Required — token with repo read scope
 */

const https = require("https");

// ---------------------------------------------------------------------------
// GitHub API
// ---------------------------------------------------------------------------

function apiGet(path, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "api.github.com",
      path,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "find-merged-open-issues-bot",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    };
    const req = https.request(opts, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : {} });
        } catch {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

/** Paginate through all pages of a GitHub list endpoint (up to maxItems). */
async function paginate(basePath, token, maxItems = 200) {
  const results = [];
  let page = 1;
  while (results.length < maxItems) {
    const perPage = Math.min(100, maxItems - results.length);
    const { status, body } = await apiGet(
      `${basePath}${basePath.includes("?") ? "&" : "?"}per_page=${perPage}&page=${page}`,
      token
    );
    if (status !== 200 || !Array.isArray(body) || body.length === 0) break;
    results.push(...body);
    if (body.length < perPage) break;
    page++;
  }
  return results;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/** Extract issue numbers from closing keywords in PR body/title. */
function extractClosingRefs(text) {
  if (!text) return new Set();
  const pattern =
    /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*:?\s*#(\d+)/gi;
  const nums = new Set();
  let m;
  while ((m = pattern.exec(text)) !== null) nums.add(parseInt(m[1], 10));
  return nums;
}

/** Extract any bare issue numbers from text (lower confidence). */
function extractBareRefs(text) {
  if (!text) return new Set();
  const nums = new Set();
  const m = text.match(/#(\d+)/g) || [];
  for (const ref of m) nums.add(parseInt(ref.slice(1), 10));
  return nums;
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

async function analyse(repo, token, limit) {
  console.error(`Fetching open issues for ${repo}…`);
  const openIssues = await paginate(
    `/repos/${repo}/issues?state=open&filter=all`,
    token,
    500
  );
  // Filter out pull requests (GitHub returns PRs in issues endpoint)
  const issues = openIssues.filter((i) => !i.pull_request);
  const openSet = new Set(issues.map((i) => i.number));

  console.error(`Found ${issues.length} open issues. Fetching merged PRs…`);
  const mergedPRs = await paginate(
    `/repos/${repo}/pulls?state=closed&sort=updated&direction=desc`,
    token,
    limit
  );
  const merged = mergedPRs.filter((pr) => pr.merged_at);
  console.error(`Inspecting ${merged.length} merged PRs…`);

  const highConfidence = []; // { issue, pr, reason }
  const lowConfidence = [];
  const seen = new Set(); // issue numbers already matched high-confidence

  for (const pr of merged) {
    const bodyRefs = extractClosingRefs(pr.body);
    const titleRefs = extractClosingRefs(pr.title);
    const allHigh = new Set([...bodyRefs, ...titleRefs]);

    for (const num of allHigh) {
      if (!openSet.has(num)) continue;
      if (seen.has(num)) continue;
      seen.add(num);
      const issue = issues.find((i) => i.number === num);
      highConfidence.push({
        issue: { number: num, title: issue?.title, url: issue?.html_url },
        pr: { number: pr.number, title: pr.title, url: pr.html_url, merged_at: pr.merged_at },
        reason: "Closing keyword in PR title/body",
      });
    }

    // Low confidence: bare #N in title or branch name
    const bareTitle = extractBareRefs(pr.title);
    const bareBranch = extractBareRefs(pr.head?.ref || "");
    for (const num of new Set([...bareTitle, ...bareBranch])) {
      if (!openSet.has(num)) continue;
      if (seen.has(num)) continue;
      const issue = issues.find((i) => i.number === num);
      lowConfidence.push({
        issue: { number: num, title: issue?.title, url: issue?.html_url },
        pr: { number: pr.number, title: pr.title, url: pr.html_url, merged_at: pr.merged_at },
        reason: `Issue number in PR ${bareTitle.has(num) ? "title" : "branch name"}`,
      });
    }
  }

  return { repo, scannedPRs: merged.length, openIssues: issues.length, highConfidence, lowConfidence };
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function renderReport(result) {
  const lines = [
    "# Merged-but-Open Issue Closure Candidates",
    `Repo: ${result.repo}  |  Merged PRs scanned: ${result.scannedPRs}  |  Open issues: ${result.openIssues}`,
    `Generated: ${new Date().toISOString()}`,
    "",
  ];

  lines.push(`## High-Confidence Candidates (${result.highConfidence.length})`);
  lines.push("_PR contains a closing keyword (`Closes #N`, `Fixes #N`, `Resolves #N`)._");
  lines.push("");
  if (result.highConfidence.length === 0) {
    lines.push("None found.");
  } else {
    lines.push("| Issue | PR | Merged At | Reason |");
    lines.push("|-------|----|-----------|--------|");
    for (const c of result.highConfidence) {
      lines.push(
        `| [#${c.issue.number}](${c.issue.url}) ${esc(c.issue.title)} | [#${c.pr.number}](${c.pr.url}) ${esc(c.pr.title)} | ${c.pr.merged_at?.slice(0, 10)} | ${c.reason} |`
      );
    }
  }
  lines.push("");

  lines.push(`## Low-Confidence Candidates (${result.lowConfidence.length})`);
  lines.push("_Issue number appears in PR title or branch — needs manual review._");
  lines.push("");
  if (result.lowConfidence.length === 0) {
    lines.push("None found.");
  } else {
    lines.push("| Issue | PR | Merged At | Reason |");
    lines.push("|-------|----|-----------|--------|");
    for (const c of result.lowConfidence) {
      lines.push(
        `| [#${c.issue.number}](${c.issue.url}) ${esc(c.issue.title)} | [#${c.pr.number}](${c.pr.url}) ${esc(c.pr.title)} | ${c.pr.merged_at?.slice(0, 10)} | ${c.reason} |`
      );
    }
  }
  lines.push("");

  lines.push("## Next Steps");
  lines.push("- Review high-confidence candidates and close them if work is complete.");
  lines.push("- Investigate low-confidence candidates manually before closing.");
  lines.push("- If an issue was intentionally left open, add a comment explaining why.");

  return lines.join("\n");
}

function esc(s) {
  return (s || "").replace(/\|/g, "\\|").slice(0, 60);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const repoFlag = args.indexOf("--repo");
  const limitFlag = args.indexOf("--limit");
  const jsonMode = args.includes("--json");

  const repo = repoFlag !== -1 ? args[repoFlag + 1] : (process.env.GITHUB_REPO || "kike-alt/DeWordle");
  const limit = limitFlag !== -1 ? parseInt(args[limitFlag + 1], 10) : 100;
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.error("Error: GITHUB_TOKEN env var is required.");
    process.exit(1);
  }

  const result = await analyse(repo, token, limit);

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderReport(result));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
