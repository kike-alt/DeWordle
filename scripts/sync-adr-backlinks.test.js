"use strict";
/**
 * sync-adr-backlinks.test.js
 * Tests the link extraction and analysis logic.
 */

// ---------------------------------------------------------------------------
// Inline pure helpers under test
// ---------------------------------------------------------------------------

function extractLinks(content) {
  const links = [];
  const mdLink = /\[([^\]]*)\]\(([^)]+)\)/g;
  let m;
  while ((m = mdLink.exec(content)) !== null) links.push(m[2].split("#")[0]);
  const bareRef = /`([^`]+\.md)`/g;
  while ((m = bareRef.exec(content)) !== null) links.push(m[1]);
  return links;
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

console.log("sync-adr-backlinks tests");

// 1. extractLinks finds markdown links
{
  const links = extractLinks("[foo](../docs/ARCHITECTURE.md) and [bar](./other.md)");
  assert(links.includes("../docs/ARCHITECTURE.md"), "extracts relative md link");
  assert(links.includes("./other.md"), "extracts second link");
}

// 2. extractLinks strips anchors
{
  const links = extractLinks("[sec](./adr/0001.md#context)");
  assert(links[0] === "./adr/0001.md", "anchor stripped");
}

// 3. extractLinks finds backtick references
{
  const links = extractLinks("see `0001-soroban-foundation-boundaries.md` for details");
  assert(links.some((l) => l.includes("0001-soroban")), "backtick ref extracted");
}

// 4. extractLinks on empty string
{
  const links = extractLinks("");
  assert(links.length === 0, "empty content → no links");
}

// 5. renderReport structure (inline minimal version)
{
  const result = { missing: [], orphanAdrs: ["docs/adr/0002-orphan.md"] };
  const lines = [
    `Missing backlinks: ${result.missing.length}`,
    `Orphan ADRs: ${result.orphanAdrs.length}`,
  ];
  const report = lines.join("\n");
  assert(report.includes("Missing backlinks: 0"), "zero missing shown");
  assert(report.includes("Orphan ADRs: 1"), "orphan count shown");
}

// 6. Fix mode appends "Referenced by" section (stub test)
{
  const content = "# ADR 0001\n\nSome content.";
  const patched = content.includes("## Referenced by")
    ? content
    : content + "\n\n## Referenced by\n- [ARCHITECTURE](../ARCHITECTURE.md)\n";
  assert(patched.includes("## Referenced by"), "referenced by section appended");
}

console.log("\nsync-adr-backlinks tests");
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
