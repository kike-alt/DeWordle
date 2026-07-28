#!/usr/bin/env node
/**
 * Wave Docs Stale-Issue Lint (issue #660)
 *
 * Scans docs/wave/*.md for `#<number>` issue references and flags any that
 * no longer exist (deleted/renumbered), catching stale planning references.
 *
 * Usage:
 *   node scripts/docs-stale-issue-lint.js
 * Required env vars:
 *   GITHUB_TOKEN, GITHUB_REPO (owner/repo)
 */
"use strict";
const fs = require("fs");
const path = require("path");

function extractIssueRefs(text) {
  const matches = text.matchAll(/#(\d+)/g);
  return [...new Set([...matches].map((m) => Number(m[1])))];
}

async function issueExists(repo, token, number) {
  const res = await fetch(`https://api.github.com/repos/${repo}/issues/${number}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  return res.status !== 404;
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) throw new Error("GITHUB_TOKEN and GITHUB_REPO are required");

  const dir = path.join("docs", "wave");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));

  const stale = [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(dir, file), "utf8");
    for (const num of extractIssueRefs(text)) {
      if (!(await issueExists(repo, token, num))) stale.push({ file, number: num });
    }
  }

  if (stale.length > 0) {
    console.error("Stale issue references found:");
    for (const s of stale) console.error(`  - ${s.file}: #${s.number}`);
    process.exit(1);
  }
  console.log(`No stale issue references across ${files.length} wave doc(s).`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { extractIssueRefs };
