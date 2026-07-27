#!/usr/bin/env node
"use strict";

const assert = require("assert");
const { extractSections, detectTemplate, validateSectionOrder, TEMPLATE_SECTIONS } = require("./validate-issue-section-order.js");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (err) { failed++; console.error(`  ✗ ${name}`); console.error(`    ${err.message}`); }
}

console.log("extractSections");

test("extracts H2 sections", () => {
  const sections = extractSections("## Summary\ncontent\n## Steps to reproduce\ncontent");
  assert.deepEqual(sections, ["Summary", "Steps to reproduce"]);
});

test("extracts H3 sections", () => {
  const sections = extractSections("### Sub heading\ncontent");
  assert.deepEqual(sections, ["Sub heading"]);
});

test("ignores non-header lines", () => {
  const sections = extractSections("plain text\n## Section\nmore text");
  assert.deepEqual(sections, ["Section"]);
});

console.log("detectTemplate");

test("detects bug_report from label", () => {
  assert.equal(detectTemplate("body", [{ name: "type:bug" }]), "bug_report");
});

test("detects feature_request from label", () => {
  assert.equal(detectTemplate("body", [{ name: "type:feature" }]), "feature_request");
});

test("detects contributor_task from label", () => {
  assert.equal(detectTemplate("body", [{ name: "type:task" }]), "contributor_task");
});

test("detects soroban_migration_task from label", () => {
  assert.equal(detectTemplate("body", [{ name: "area:soroban-core" }]), "soroban_migration_task");
});

test("detects bug_report from body content", () => {
  assert.equal(detectTemplate("## Steps to reproduce\nsteps", []), "bug_report");
});

test("detects feature_request from body content", () => {
  assert.equal(detectTemplate("## Proposed solution\nsol", []), "feature_request");
});

test("detects contributor_task from body content", () => {
  assert.equal(detectTemplate("## Acceptance criteria\ncriteria", []), "contributor_task");
});

test("returns null for unrecognized content", () => {
  assert.equal(detectTemplate("## Random heading\ncontent", []), null);
});

console.log("validateSectionOrder - valid cases");

test("valid bug_report passes", () => {
  const body = "## Summary\nBug\n## Steps to reproduce\n1.\n## Expected behavior\nIt works\n## Environment\nNode 20";
  const result = validateSectionOrder(body, [{ name: "type:bug" }]);
  assert.equal(result.valid, true);
  assert.equal(result.template, "bug_report");
  assert.equal(result.violations.length, 0);
});

test("valid contributor_task passes", () => {
  const body = "## Context\nWhy\n## Acceptance criteria\n- done\n## Implementation notes\nfiles";
  const result = validateSectionOrder(body, [{ name: "type:task" }]);
  assert.equal(result.valid, true);
  assert.equal(result.template, "contributor_task");
});

console.log("validateSectionOrder - out of order");

test("out-of-order sections detected", () => {
  const body = "## Expected behavior\n## Steps to reproduce\n## Summary\n## Environment";
  const result = validateSectionOrder(body, [{ name: "type:bug" }]);
  assert.equal(result.valid, false);
  const outOfOrder = result.violations.filter((v) => v.type === "out_of_order");
  assert.ok(outOfOrder.length > 0, "should detect out-of-order violations");
});

console.log("validateSectionOrder - missing sections");

test("missing sections detected", () => {
  const body = "## Summary\nBug report";
  const result = validateSectionOrder(body, [{ name: "type:bug" }]);
  assert.equal(result.valid, false);
  const missing = result.violations.filter((v) => v.type === "missing");
  assert.ok(missing.length > 0, "should detect missing sections");
});

console.log("validateSectionOrder - no template");

test("no template returns valid", () => {
  const result = validateSectionOrder("## Random\ncontent", []);
  assert.equal(result.valid, true);
  assert.equal(result.template, null);
});

console.log("\nResults: " + passed + " passed, " + failed + " failed");
process.exit(failed > 0 ? 1 : 0);
