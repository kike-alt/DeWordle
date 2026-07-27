#!/usr/bin/env node
"use strict";

const fs = require("fs");
const https = require("https");

const TEMPLATE_SECTIONS = {
  bug_report: ["Summary", "Steps to reproduce", "Expected behavior", "Environment"],
  feature_request: ["Problem statement", "Proposed solution", "Alternatives considered", "Impact"],
  contributor_task: ["Context", "Acceptance criteria", "Implementation notes"],
  soroban_migration_task: ["Objective", "Size", "Difficulty", "Scope", "Acceptance Criteria", "References"],
};

const VALIDATION_MARKER = "<!-- issue-section-validator -->";

function apiRequest(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.github.com", path, method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "issue-section-validator-bot",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    };
    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : {} }));
    });
    req.on("error", reject);
    req.end();
  });
}

function apiPost(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: "api.github.com", path, method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "issue-section-validator-bot",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };
    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : {} }));
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function extractSections(body) {
  const sections = [];
  for (const line of body.split("\n")) {
    const match = line.match(/^#{1,3}\s+(.+)/);
    if (match) sections.push(match[1].trim());
  }
  return sections;
}

function detectTemplate(body, labels) {
  const override = process.env.TEMPLATE;
  if (override && TEMPLATE_SECTIONS[override]) return override;

  const names = labels.map((l) => (typeof l === "string" ? l : l.name));
  if (names.includes("type:bug")) return "bug_report";
  if (names.includes("type:feature")) return "feature_request";
  if (names.includes("type:task") || names.includes("good first issue")) return "contributor_task";
  if (names.includes("area:soroban-core")) return "soroban_migration_task";

  if (body.includes("## Steps to reproduce")) return "bug_report";
  if (body.includes("## Proposed solution")) return "feature_request";
  if (body.includes("## Acceptance criteria")) return "contributor_task";
  if (body.includes("## Acceptance Criteria") && body.includes("## Scope")) return "soroban_migration_task";

  return null;
}

function validateSectionOrder(body, labels) {
  const template = detectTemplate(body, labels);
  if (!template) {
    return { valid: true, template: null, message: "No matching template - skipping", violations: [] };
  }

  const expected = TEMPLATE_SECTIONS[template];
  const actual = extractSections(body);
  const violations = [];
  let lastFoundIndex = -1;

  for (const section of expected) {
    const idx = actual.findIndex((s) => s.toLowerCase() === section.toLowerCase());
    if (idx === -1) {
      violations.push({ type: "missing", section, message: `Required section "${section}" not found` });
    } else if (idx < lastFoundIndex) {
      violations.push({ type: "out_of_order", section, message: `"${section}" appears after a later expected section` });
    } else {
      lastFoundIndex = idx;
    }
  }

  return {
    valid: violations.length === 0,
    template,
    message: violations.length === 0 ? `All sections in order for ${template}` : `Found ${violations.length} violation(s) for ${template}`,
    violations,
  };
}

function buildComment(result) {
  const lines = [VALIDATION_MARKER, "", "**Issue Section-Order Validation**", "",
    `Template: \`${result.template || "unknown"}\``, `Result: ${result.valid ? "PASS" : "FAIL"}`, ""];
  if (result.violations.length > 0) {
    lines.push("| Violation | Section | Detail |");
    lines.push("|---|---|---|");
    for (const v of result.violations) lines.push(`| ${v.type} | ${v.section} | ${v.message} |`);
    lines.push("", "Please reorder sections to match the expected template structure.");
  }
  return lines.join("\n");
}

function outputResult(result) {
  if (process.env.OUTPUT_JSON === "true") {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(result.message);
    if (result.violations.length > 0) {
      for (const v of result.violations) console.error(`  - ${v.message}`);
    }
  }
}

async function main() {
  const DRY_RUN = process.env.DRY_RUN === "true";
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const issueNumber = process.env.ISSUE_NUMBER;

  let body;
  let labels = [];
  const fileArg = process.argv[2];

  if (fileArg) {
    body = fs.readFileSync(fileArg, "utf8");
  } else if (issueNumber && repo && token) {
    const { body: issue } = await apiRequest(`/repos/${repo}/issues/${issueNumber}`, token);
    body = issue.body || "";
    labels = issue.labels || [];
  } else {
    let raw = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (raw += chunk));
    process.stdin.on("end", () => { outputResult(validateSectionOrder(raw, [])); });
    return;
  }

  const result = validateSectionOrder(body, labels);
  outputResult(result);

  if (issueNumber && repo && token && !result.valid && !DRY_RUN) {
    const comment = buildComment(result);
    await apiPost(`/repos/${repo}/issues/${issueNumber}/comments`, { body: comment }, token);
    console.log(`Posted validation comment on #${issueNumber}`);
  }

  process.exit(result.valid ? 0 : 1);
}

main().catch((err) => { console.error("Fatal error:", err.message); process.exit(1); });

module.exports = { extractSections, detectTemplate, validateSectionOrder, TEMPLATE_SECTIONS };
