const assert = require("node:assert/strict");
const test = require("node:test");
const { buildChecklistComment } = require("./pr-checklist-commenter.js");

// Positive: complete body → no comment
test("returns null when body has issue link and validation command", () => {
  assert.equal(buildChecklistComment("Closes #42\nnpm test passed"), null);
});

// Missing issue link only
test("flags missing issue link when validation command is present", () => {
  const comment = buildChecklistComment("ran jest --coverage");
  assert.match(comment, /an issue link/);
  assert.doesNotMatch(comment, /a validation command/);
});

// Missing validation only
test("flags missing validation command when issue link is present", () => {
  const comment = buildChecklistComment("Resolves #10");
  assert.match(comment, /a validation command/);
  assert.doesNotMatch(comment, /an issue link/);
});

// Both missing (empty / null / partial body)
test("flags both items when body is empty", () => {
  const comment = buildChecklistComment("");
  assert.match(comment, /an issue link/);
  assert.match(comment, /a validation command/);
});

test("flags both items when body is null/undefined", () => {
  const comment = buildChecklistComment(null);
  assert.match(comment, /an issue link/);
  assert.match(comment, /a validation command/);
});

// Variant keyword coverage
test("accepts 'fixed' as a valid issue-link keyword", () => {
  assert.equal(buildChecklistComment("Fixed #5\ncargo test"), null);
});

test("accepts 'vitest' as a valid validation keyword", () => {
  assert.equal(buildChecklistComment("closes #1\nvitest run"), null);
});
