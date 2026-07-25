/**
 * QA-206: Contributor bootstrap tests — clean checkout validation + failure paths.
 *
 * Covers:
 *  - trackNextSteps for all valid track identifiers (be, fe, sc, sdk, default)
 *  - checkCommand success and failure paths with remediation messages
 *  - runBootstrap structured result shape and failures propagation
 *  - Clean-checkout assertions: required lockfiles and config files exist
 *  - Root package.json exposes the bootstrap and bootstrap:json scripts
 *  - JSON serialisability of bootstrap output (for --json CI mode)
 *
 * Run: node --test scripts/contributor-bootstrap.test.js
 */

"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const { checkCommand, runBootstrap, trackNextSteps } = require("./contributor-bootstrap.js");

const REPO_ROOT = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// trackNextSteps — all track variants
// ---------------------------------------------------------------------------

test("trackNextSteps: 'be' returns backend-specific guidance", () => {
  assert.deepEqual(trackNextSteps("be"), [
    "Run `npm run lint --prefix backend`",
    "Run `npm run typecheck --prefix backend`",
    "Run `npm run test --prefix backend -- --runInBand`",
  ]);
});

test("trackNextSteps: 'fe' returns frontend-specific guidance", () => {
  assert.deepEqual(trackNextSteps("fe"), [
    "Run `npm run lint --prefix frontend`",
    "Run `npm run typecheck --prefix frontend`",
  ]);
});

test("trackNextSteps: 'sc' returns soroban/cargo guidance", () => {
  assert.deepEqual(trackNextSteps("sc"), [
    "Run `cargo check --workspace`",
    "Run `cargo test --workspace`",
  ]);
});

test("trackNextSteps: 'sdk' returns TS SDK typecheck guidance", () => {
  assert.deepEqual(trackNextSteps("sdk"), [
    "Run `npm run typecheck --prefix soroban/sdk/ts`",
  ]);
});

test("trackNextSteps: unknown track falls back to full CI guidance", () => {
  const steps = trackNextSteps("unknown-track");
  assert.equal(Array.isArray(steps), true);
  assert.ok(steps.length > 0, "default track must return at least one step");
  assert.ok(
    steps[0].includes("ci-local.sh"),
    `default guidance should reference ci-local.sh, got: ${steps[0]}`,
  );
});

test("trackNextSteps: 'all' falls back to full CI guidance", () => {
  const steps = trackNextSteps("all");
  assert.equal(Array.isArray(steps), true);
  assert.ok(steps.length > 0, "all track must return at least one step");
});

// ---------------------------------------------------------------------------
// checkCommand — success path
// ---------------------------------------------------------------------------

test("checkCommand: 'node' succeeds and returns ok:true with version output", () => {
  const result = checkCommand("node");
  assert.equal(result.command, "node");
  assert.equal(result.ok, true);
  assert.ok(
    result.output.startsWith("v"),
    `expected version string starting with 'v', got: ${result.output}`,
  );
  assert.equal(result.remediation, undefined, "no remediation expected on success");
});

test("checkCommand: 'npm' succeeds and returns ok:true", () => {
  const result = checkCommand("npm");
  assert.equal(result.ok, true);
  assert.equal(result.command, "npm");
  assert.equal(result.remediation, undefined);
});

// ---------------------------------------------------------------------------
// checkCommand — failure path (non-existent binary)
// ---------------------------------------------------------------------------

test("checkCommand: non-existent binary returns ok:false with remediation", () => {
  const result = checkCommand("__nonexistent_tool_xyz__");
  assert.equal(result.ok, false);
  assert.equal(typeof result.remediation, "string");
  assert.ok(result.remediation.length > 0, "remediation message must not be empty");
  assert.ok(
    result.remediation.includes("__nonexistent_tool_xyz__"),
    `remediation should mention the missing tool, got: ${result.remediation}`,
  );
});

test("checkCommand: failure result includes command name", () => {
  const result = checkCommand("__no_such_binary__");
  assert.equal(result.command, "__no_such_binary__");
  assert.equal(result.ok, false);
});

// ---------------------------------------------------------------------------
// runBootstrap — structured result shape
// ---------------------------------------------------------------------------

test("runBootstrap returns a structured result with all required fields", () => {
  const result = runBootstrap("all");
  assert.equal(typeof result.ok, "boolean");
  assert.equal(result.track, "all");
  assert.equal(Array.isArray(result.checks), true);
  assert.equal(Array.isArray(result.nextSteps), true);
  assert.equal(Array.isArray(result.failures), true);
});

test("runBootstrap: checks array contains entries for node, npm, rustc, cargo", () => {
  const result = runBootstrap("all");
  const commandNames = result.checks.map((c) => c.command);
  assert.ok(commandNames.includes("node"), "checks must include 'node'");
  assert.ok(commandNames.includes("npm"), "checks must include 'npm'");
  assert.ok(commandNames.includes("rustc"), "checks must include 'rustc'");
  assert.ok(commandNames.includes("cargo"), "checks must include 'cargo'");
});

test("runBootstrap: node and npm are always available in the test environment", () => {
  const result = runBootstrap("all");
  const nodeCheck = result.checks.find((c) => c.command === "node");
  const npmCheck = result.checks.find((c) => c.command === "npm");
  assert.equal(nodeCheck?.ok, true, "node must be available");
  assert.equal(npmCheck?.ok, true, "npm must be available");
});

test("runBootstrap: ok is false when failures is non-empty, true otherwise", () => {
  const result = runBootstrap("all");
  if (result.failures.length > 0) {
    assert.equal(result.ok, false);
  } else {
    assert.equal(result.ok, true);
  }
});

test("runBootstrap: every entry in failures corresponds to a failed check", () => {
  const result = runBootstrap("all");
  for (const failedCmd of result.failures) {
    const check = result.checks.find((c) => c.command === failedCmd);
    assert.ok(check, `failures references '${failedCmd}' but it is not in checks`);
    assert.equal(
      check.ok,
      false,
      `'${failedCmd}' is in failures but its check.ok is true`,
    );
  }
});

test("runBootstrap: 'be' track returns backend-oriented next steps", () => {
  const result = runBootstrap("be");
  assert.equal(result.track, "be");
  assert.ok(
    result.nextSteps.some((s) => s.includes("backend")),
    "be track next steps must mention backend",
  );
});

test("runBootstrap: 'fe' track returns frontend-oriented next steps", () => {
  const result = runBootstrap("fe");
  assert.equal(result.track, "fe");
  assert.ok(
    result.nextSteps.some((s) => s.includes("frontend")),
    "fe track next steps must mention frontend",
  );
});

test("runBootstrap: result is JSON-serialisable (for --json CI output mode)", () => {
  const result = runBootstrap("all");
  assert.doesNotThrow(() => {
    const serialised = JSON.stringify(result, null, 2);
    assert.ok(serialised.length > 0);
  });
});

// ---------------------------------------------------------------------------
// Clean-checkout assertions — required files must exist
// ---------------------------------------------------------------------------

test("clean checkout: backend/package-lock.json exists", () => {
  const lockfile = path.join(REPO_ROOT, "backend", "package-lock.json");
  assert.ok(
    fs.existsSync(lockfile),
    "backend/package-lock.json is missing — `npm ci` will fail on a clean checkout",
  );
});

test("clean checkout: frontend/package-lock.json exists", () => {
  const lockfile = path.join(REPO_ROOT, "frontend", "package-lock.json");
  assert.ok(
    fs.existsSync(lockfile),
    "frontend/package-lock.json is missing — `npm ci` will fail on a clean checkout",
  );
});

test("clean checkout: soroban/Cargo.toml exists", () => {
  const cargoToml = path.join(REPO_ROOT, "soroban", "Cargo.toml");
  assert.ok(
    fs.existsSync(cargoToml),
    "soroban/Cargo.toml is missing — `cargo check --workspace` will fail on a clean checkout",
  );
});

test("clean checkout: backend/.env.example exists", () => {
  assert.ok(
    fs.existsSync(path.join(REPO_ROOT, "backend", ".env.example")),
    "backend/.env.example is missing — contributors have no env var reference",
  );
});

test("clean checkout: frontend/.env.example exists", () => {
  assert.ok(
    fs.existsSync(path.join(REPO_ROOT, "frontend", ".env.example")),
    "frontend/.env.example is missing — contributors have no env var reference",
  );
});

test("clean checkout: scripts/contributor-bootstrap.js exists", () => {
  assert.ok(
    fs.existsSync(path.join(REPO_ROOT, "scripts", "contributor-bootstrap.js")),
    "scripts/contributor-bootstrap.js is missing",
  );
});

test("clean checkout: scripts/ci-local.sh exists", () => {
  assert.ok(
    fs.existsSync(path.join(REPO_ROOT, "scripts", "ci-local.sh")),
    "scripts/ci-local.sh is missing — contributors cannot reproduce CI locally",
  );
});

// ---------------------------------------------------------------------------
// Root package.json exposes bootstrap scripts
// ---------------------------------------------------------------------------

test("root package.json: 'bootstrap' script is defined and invokes contributor-bootstrap.js", () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"),
  );
  assert.ok(
    pkg.scripts && pkg.scripts.bootstrap,
    "root package.json must define a 'bootstrap' script",
  );
  assert.ok(
    pkg.scripts.bootstrap.includes("contributor-bootstrap"),
    `bootstrap script must invoke contributor-bootstrap.js, got: ${pkg.scripts.bootstrap}`,
  );
});

test("root package.json: 'bootstrap:json' script is defined", () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"),
  );
  assert.ok(
    pkg.scripts && pkg.scripts["bootstrap:json"],
    "root package.json must define a 'bootstrap:json' script",
  );
});
