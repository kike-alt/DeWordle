#!/usr/bin/env node
/**
 * Dependency-Link Validator
 *
 * Parses the body of a GitHub issue looking for "Dependencies" / "Blocked By"
 * sections, extracts every issue reference found there, then validates each one:
 *
 *   1. The referenced issue number must exist in the repo.
 *   2. The reference must not point back at the issue being validated (self-ref).
 *
 * On failure it prints clear correction instructions and exits with code 1,
 * making it suitable as a blocking CI check on issue events.
 *
 * Usage (called by GitHub Actions):
 *   node scripts/validate-dependency-links.js
 *
 * Required env vars:
 *   GITHUB_TOKEN   - token with repo read permissions
 *   GITHUB_REPO    - owner/repo  (e.g. "org/dewordle")
 *   ISSUE_NUMBER   - number of the issue to validate
 *   ISSUE_BODY     - raw body text of the issue
 */

const https = require("https");

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Section headings that introduce dependency references.
 * Matched case-insensitively; the section ends at the next heading or EOF.
 */
const DEPENDENCY_HEADINGS = [
  "dependencies",
  "dependency",
  "blocked by",
  "blocked-by",
  "blockers",
  "depends on",
  "depends-on",
];

/**
 * Extracts the text content of every dependency section found in `body`.
 * Handles both Markdown ATX headings (## Heading) and bold labels (**Heading:**).
 */
function extractDependencySections(body) {
  if (!body) return [];

  const lines = body.split("\n");
  const sections = [];
  let capturing = false;
  let current = [];

  for (const line of lines) {
    // Detect a heading line: ## Heading  or  **Heading:**  or  **Heading**
    const headingMatch =
      line.match(/^#{1,6}\s+(.+)$/) ||
      line.match(/^\*{1,2}([^*]+)\*{1,2}:?\s*$/);

    if (headingMatch) {
      const heading = headingMatch[1].trim().toLowerCase().replace(/:$/, "");

      if (
        DEPENDENCY_HEADINGS.some((h) => heading === h || heading.startsWith(h))
      ) {
        // Start a new dependency section
        if (capturing && current.length) sections.push(current.join("\n"));
        capturing = true;
        current = [];
        continue;
      } else if (capturing) {
        // Hit a different heading — close the current section
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

/**
 * Extracts all issue/PR number references from text.
 * Recognises:
 *   #123
 *   owner/repo#123
 *   https://github.com/owner/repo/issues/123
 *   https://github.com/owner/repo/pull/123
 *
 * Returns an array of { raw, number } objects where `number` is the integer
 * issue number and `raw` is the original matched string.
 */
function extractIssueRefs(text) {
  const refs = [];
  const seen = new Set();

  const patterns = [
    // Full GitHub URL  →  capture group 1 = number
    /https?:\/\/github\.com\/[^/\s]+\/[^/\s]+\/(?:issues|pull)\/(\d+)/gi,
    // owner/repo#NNN  →  capture group 1 = number
    /[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+#(\d+)/g,
    // bare #NNN  →  capture group 1 = number
    /(?<![a-zA-Z0-9_/-])#(\d+)/g,
  ];

  for (const pattern of patterns) {
    let m;
    while ((m = pattern.exec(text)) !== null) {
      const num = parseInt(m[1], 10);
      if (!seen.has(num)) {
        seen.add(num);
        refs.push({ raw: m[0], number: num });
      }
    }
  }

  return refs;
}

// ---------------------------------------------------------------------------
// GitHub API helpers
// ---------------------------------------------------------------------------

function apiRequest(method, path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.github.com",
      path,
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "dependency-link-validator-bot",
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

/** Returns true if the issue/PR number exists in the repo. */
async function issueExists(repo, number, token) {
  const { status } = await apiRequest(
    "GET",
    `/repos/${repo}/issues/${number}`,
    token,
  );
  return status === 200;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * @typedef {{ ref: string, number: number, error: string, fix: string }} ValidationError
 */

async function validateRefs(refs, issueNumber, repo, token) {
  /** @type {ValidationError[]} */
  const errors = [];

  for (const ref of refs) {
    // Self-referential check
    if (ref.number === issueNumber) {
      errors.push({
        ref: ref.raw,
        number: ref.number,
        error: "Self-referential dependency",
        fix: `Remove \`${ref.raw}\` — an issue cannot depend on itself.`,
      });
      continue;
    }

    // Existence check
    const exists = await issueExists(repo, ref.number, token);
    if (!exists) {
      errors.push({
        ref: ref.raw,
        number: ref.number,
        error: `Issue #${ref.number} does not exist`,
        fix: `Replace \`${ref.raw}\` with the correct issue number, or remove it if the dependency no longer applies.`,
      });
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

function formatReport({ issueNumber, refs, errors, sectionFound }) {
  const lines = [];

  lines.push("=== Dependency-Link Validation Report ===");
  lines.push(`Issue:          #${issueNumber}`);
  lines.push(
    `Section found:  ${sectionFound ? "yes" : "no — no Dependencies / Blocked By section detected"}`,
  );
  lines.push(`References:     ${refs.length}`);
  lines.push(`Errors:         ${errors.length}`);
  lines.push("");

  if (!sectionFound) {
    lines.push("INFO: No dependency section was found in this issue body.");
    lines.push("      If this issue has dependencies, add a section like:");
    lines.push("");
    lines.push("      ## Dependencies");
    lines.push("      - #123");
    lines.push("      - #456");
    lines.push("");
    lines.push(
      "      Recognised headings: Dependencies, Blocked By, Depends On, Blockers",
    );
    return { output: lines.join("\n"), passed: true };
  }

  if (refs.length === 0) {
    lines.push(
      "INFO: A dependency section was found but contained no issue references.",
    );
    lines.push(
      "      Either add references (e.g. `#123`) or remove the empty section.",
    );
    return { output: lines.join("\n"), passed: false };
  }

  lines.push("References found:");
  for (const ref of refs) {
    lines.push(`  ${ref.raw}  →  #${ref.number}`);
  }
  lines.push("");

  if (errors.length === 0) {
    lines.push("✓ All dependency references are valid.");
    return { output: lines.join("\n"), passed: true };
  }

  lines.push("✗ Validation failed. Correction instructions:");
  lines.push("");
  for (const err of errors) {
    lines.push(`  [${err.error}]`);
    lines.push(`    Reference : ${err.ref}`);
    lines.push(`    Fix       : ${err.fix}`);
    lines.push("");
  }

  lines.push("How to fix:");
  lines.push("  1. Edit the issue body.");
  lines.push("  2. Locate the Dependencies / Blocked By section.");
  lines.push("  3. Apply the corrections listed above.");
  lines.push("  4. Save — this check will re-run automatically.");

  return { output: lines.join("\n"), passed: false };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const issueNumber = parseInt(process.env.ISSUE_NUMBER || "0", 10);
  const issueBody = process.env.ISSUE_BODY || "";

  if (!token || !repo || !issueNumber) {
    console.error(
      "Missing required env vars: GITHUB_TOKEN, GITHUB_REPO, ISSUE_NUMBER",
    );
    process.exit(1);
  }

  console.log(
    `Validating dependency links for issue #${issueNumber} in ${repo}`,
  );

  // Parse
  const sections = extractDependencySections(issueBody);
  const sectionFound = sections.length > 0;
  const combinedText = sections.join("\n");
  const refs = extractIssueRefs(combinedText);

  console.log(`Dependency sections found: ${sections.length}`);
  console.log(`References extracted: ${refs.length}`);

  // Validate
  const errors = await validateRefs(refs, issueNumber, repo, token);

  // Report
  const { output, passed } = formatReport({
    issueNumber,
    refs,
    errors,
    sectionFound,
  });
  console.log("\n" + output);

  if (!passed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
