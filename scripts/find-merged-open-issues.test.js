"use strict";
/**
 * find-merged-open-issues.test.js
 * Tests for extractClosingRefs, extractBareRefs, normalise, toCsv.
 */

// ---------------------------------------------------------------------------
// Inline pure helpers
// ---------------------------------------------------------------------------

function extractClosingRefs(text) {
  if (!text) return new Set();
  const pattern = /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*:?\s*#(\d+)/gi;
  const nums = new Set();
  let m;
  while ((m = pattern.exec(text)) !== null) nums.add(parseInt(m[1], 10));
  return nums;
}

function extractBareRefs(text) {
  if (!text) return new Set();
  const nums = new Set();
  const matches = text.match(/#(\d+)/g) || [];
  for (const ref of matches) nums.add(parseInt(ref.slice(1), 10));
  return nums;
}

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
// Tests
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) { console.log(`  ✓ ${msg}`); passed++; }
  else { console.error(`  ✗ ${msg}`); failed++; }
}

console.log("find-merged-open-issues + export-issue-snapshot tests");

// extractClosingRefs
{
  const refs = extractClosingRefs("Closes #123 and fixes #456");
  assert(refs.has(123), "extracts Closes #123");
  assert(refs.has(456), "extracts fixes #456");
}
{
  const refs = extractClosingRefs("Resolves: #789");
  assert(refs.has(789), "extracts Resolves: #789");
}
{
  const refs = extractClosingRefs("Fixed #10 and closed #20");
  assert(refs.has(10), "Fixed variant");
  assert(refs.has(20), "closed variant");
}
{
  const refs = extractClosingRefs("");
  assert(refs.size === 0, "empty string → empty set");
}
{
  const refs = extractClosingRefs("Just a normal PR description");
  assert(refs.size === 0, "no closing keywords → empty");
}

// extractBareRefs
{
  const refs = extractBareRefs("feat/issues-#123-fix");
  assert(refs.has(123), "extracts bare #N from branch");
}
{
  const refs = extractBareRefs("no numbers here");
  assert(refs.size === 0, "no numbers → empty");
}

// normalise
{
  const issue = {
    number: 42,
    title: "Test issue",
    state: "open",
    labels: [{ name: "bug" }, { name: "P1" }],
    assignees: [{ login: "alice" }],
    user: { login: "bob" },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
    closed_at: null,
    html_url: "https://github.com/org/repo/issues/42",
    milestone: null,
    comments: 3,
    body: "hello world",
  };
  const rec = normalise(issue);
  assert(rec.number === 42, "number preserved");
  assert(rec.labels === "bug|P1", "labels joined with |");
  assert(rec.assignees === "alice", "assignees joined");
  assert(rec.body_length === 11, "body_length computed");
  assert(rec.closed_at === "", "null closed_at → empty string");
}

// toCsv
{
  const csv = toCsv([{ a: 1, b: "hello", c: "with,comma" }]);
  const lines = csv.split("\n");
  assert(lines[0] === "a,b,c", "headers correct");
  assert(lines[1].includes('"with,comma"'), "comma in value quoted");
}
{
  const csv = toCsv([]);
  assert(csv === "", "empty records → empty string");
}
{
  const csv = toCsv([{ title: 'say "hi"' }]);
  assert(csv.includes('""hi""'), "double-quotes escaped");
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
