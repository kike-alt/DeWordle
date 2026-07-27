#!/usr/bin/env node
/**
 * Tests for milestone-drift-detector.js
 */

"use strict";

const assert = require("assert");

// ---------------------------------------------------------------------------
// Inline the pure logic from the detector for unit testing
// ---------------------------------------------------------------------------

const PRIORITY_LABELS = ["priority:P0", "priority:P1"];

function hasPriorityLabel(labels) {
  return PRIORITY_LABELS.some((pl) => labels.includes(pl));
}

function hasActivitySince(updatedAt, cutoffDate) {
  const updated = new Date(updatedAt);
  return updated > cutoffDate;
}

function hasDriftMarker(body) {
  return (body || "").includes("<!-- milestone-drift-detector -->");
}

function buildDriftComment(issue, daysOpen, daysSinceUpdate) {
  const labelNames = issue.labels.join(", ");
  return [
    "<!-- milestone-drift-detector -->",
    "",
    "**Milestone Drift Alert**",
    "",
    `This issue has been open for **${daysOpen} days** with no activity for **${daysSinceUpdate} days**.`,
    "",
    "| Field | Value |",
    "|---|---|",
    `| Opened | ${issue.openedAt} |`,
    `| Last updated | ${issue.updatedAt} |`,
    `| Labels | ${labelNames} |`,
    `| Assignees | ${issue.assignees} |`,
    "",
    "Please update the issue status or unassign if no longer relevant.",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

console.log("hasPriorityLabel");

test("detects P0 label", () => {
  assert.ok(hasPriorityLabel(["priority:P0", "track:BE"]));
});

test("detects P1 label", () => {
  assert.ok(hasPriorityLabel(["priority:P1"]));
});

test("rejects P2 label", () => {
  assert.ok(!hasPriorityLabel(["priority:P2", "track:BE"]));
});

test("rejects empty labels", () => {
  assert.ok(!hasPriorityLabel([]));
});

console.log("hasActivitySince");

test("recent update is within window", () => {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 7 * 86400000);
  assert.ok(hasActivitySince(now.toISOString(), cutoff));
});

test("old update is outside window", () => {
  const old = "2026-01-01T00:00:00Z";
  const cutoff = new Date("2026-07-01T00:00:00Z");
  assert.ok(!hasActivitySince(old, cutoff));
});

console.log("hasDriftMarker");

test("detects drift marker in body", () => {
  assert.ok(hasDriftMarker("<!-- milestone-drift-detector -->"));
});

test("rejects empty body", () => {
  assert.ok(!hasDriftMarker(""));
});

test("rejects null body", () => {
  assert.ok(!hasDriftMarker(null));
});

console.log("buildDriftComment");

test("comment contains marker", () => {
  const comment = buildDriftComment(
    { labels: ["priority:P0"], openedAt: "2026-07-01", updatedAt: "2026-07-20", assignees: "user1" },
    14,
    7,
  );
  assert.ok(comment.includes("<!-- milestone-drift-detector -->"));
});

test("comment contains day counts", () => {
  const comment = buildDriftComment(
    { labels: ["priority:P1"], openedAt: "2026-07-01", updatedAt: "2026-07-20", assignees: "none" },
    21,
    10,
  );
  assert.ok(comment.includes("**21 days**"));
  assert.ok(comment.includes("**10 days**"));
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
