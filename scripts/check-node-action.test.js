"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, "..");
const ACTION_PATH = path.join(
  REPO_ROOT,
  ".github",
  "actions",
  "setup-node",
  "action.yml",
);

/** Very small hand-rolled YAML key reader — avoids a runtime dependency. */
function hasKey(content, key) {
  return content.includes(key);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("composite action file exists at .github/actions/setup-node/action.yml", () => {
  assert.ok(
    fs.existsSync(ACTION_PATH),
    `Expected action file at ${path.relative(REPO_ROOT, ACTION_PATH)}`,
  );
});

test("composite action file is non-empty", () => {
  const stat = fs.statSync(ACTION_PATH);
  assert.ok(stat.size > 0, "action.yml must not be empty");
});

test("composite action declares 'using: composite'", () => {
  const content = fs.readFileSync(ACTION_PATH, "utf8");
  assert.ok(
    content.includes("using: composite"),
    "action.yml must declare `using: composite`",
  );
});

test("composite action declares 'node-version' input", () => {
  const content = fs.readFileSync(ACTION_PATH, "utf8");
  assert.ok(
    hasKey(content, "node-version:"),
    "action.yml must declare a node-version input",
  );
});

test("composite action declares 'check-latest' input", () => {
  const content = fs.readFileSync(ACTION_PATH, "utf8");
  assert.ok(
    hasKey(content, "check-latest:"),
    "action.yml must declare a check-latest input",
  );
});

test("composite action uses actions/setup-node@v4", () => {
  const content = fs.readFileSync(ACTION_PATH, "utf8");
  assert.ok(
    content.includes("actions/setup-node@v4"),
    "action.yml must use actions/setup-node@v4",
  );
});

test("composite action includes a version-report step", () => {
  const content = fs.readFileSync(ACTION_PATH, "utf8");
  assert.ok(
    content.includes("node --version"),
    "action.yml must contain a `node --version` report step",
  );
});

test("composite action step uses shell: bash for the report step", () => {
  const content = fs.readFileSync(ACTION_PATH, "utf8");
  assert.ok(
    content.includes("shell: bash"),
    "action.yml report step must declare shell: bash (required for composite actions)",
  );
});

test("drift-check.yml references the composite action", () => {
  const wfPath = path.join(REPO_ROOT, ".github", "workflows", "drift-check.yml");
  const content = fs.readFileSync(wfPath, "utf8");
  assert.ok(
    content.includes("./.github/actions/setup-node"),
    "drift-check.yml must call ./.github/actions/setup-node",
  );
  assert.ok(
    !content.includes("actions/setup-node@v4"),
    "drift-check.yml must not contain an inline actions/setup-node@v4 step",
  );
});

test("link-check.yml references the composite action", () => {
  const wfPath = path.join(REPO_ROOT, ".github", "workflows", "link-check.yml");
  const content = fs.readFileSync(wfPath, "utf8");
  assert.ok(
    content.includes("./.github/actions/setup-node"),
    "link-check.yml must call ./.github/actions/setup-node",
  );
  assert.ok(
    !content.includes("actions/setup-node@v4"),
    "link-check.yml must not contain an inline actions/setup-node@v4 step",
  );
});

test("toolchain-check.yml (check-node job) references the composite action", () => {
  const wfPath = path.join(
    REPO_ROOT,
    ".github",
    "workflows",
    "toolchain-check.yml",
  );
  const content = fs.readFileSync(wfPath, "utf8");
  assert.ok(
    content.includes("./.github/actions/setup-node"),
    "toolchain-check.yml must call ./.github/actions/setup-node",
  );
});

test("toolchain-matrix.yml is unchanged (still uses inline setup-node@v4)", () => {
  const wfPath = path.join(
    REPO_ROOT,
    ".github",
    "workflows",
    "toolchain-matrix.yml",
  );
  const content = fs.readFileSync(wfPath, "utf8");
  assert.ok(
    content.includes("actions/setup-node@v4"),
    "toolchain-matrix.yml must keep its inline setup-node@v4 (matrix semantics)",
  );
});

test("advisory-triage.yml is unchanged (still uses inline setup-node@v4)", () => {
  const wfPath = path.join(
    REPO_ROOT,
    ".github",
    "workflows",
    "advisory-triage.yml",
  );
  const content = fs.readFileSync(wfPath, "utf8");
  assert.ok(
    content.includes("actions/setup-node@v4"),
    "advisory-triage.yml must keep its inline setup-node@v4 (audit pinning semantics)",
  );
});
