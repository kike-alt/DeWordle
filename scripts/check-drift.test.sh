const assert = require("node:assert/strict");
const test = require("node:test");
const { existsSync, statSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");

test("check-drift script exists and is executable", () => {
  const scriptPath = resolve(__dirname, "check-drift.sh");
  assert.ok(existsSync(scriptPath), "check-drift script must exist");
  const mode = statSync(scriptPath).mode;
  assert.ok(mode & 0o111, "check-drift script must be executable");
});

test("check-drift script contains npm drift check for root, frontend, backend", () => {
  const scriptPath = resolve(__dirname, "check-drift.sh");
  const content = readFileSync(scriptPath, "utf-8");
  assert.ok(content.includes('check_npm_drift "."'), "must check root package-lock.json");
  assert.ok(content.includes('check_npm_drift "frontend"'), "must check frontend/package-lock.json");
  assert.ok(content.includes('check_npm_drift "backend"'), "must check backend/package-lock.json");
});

test("check-drift script contains Cargo.lock drift detection for soroban", () => {
  const scriptPath = resolve(__dirname, "check-drift.sh");
  const content = readFileSync(scriptPath, "utf-8");
  assert.ok(content.includes("check_cargo_drift"), "must have cargo drift check function");
  assert.ok(content.includes("soroban/Cargo.toml"), "must check soroban workspace");
  assert.ok(content.includes("cargo check --locked"), "must use cargo check --locked");
});

test("check-drift script provides actionable guidance on failure", () => {
  const scriptPath = resolve(__dirname, "check-drift.sh");
  const content = readFileSync(scriptPath, "utf-8");
  assert.ok(content.includes("DRIFT_REPORT"), "must collect drift report");
  assert.ok(content.includes("Actionable guidance"), "must display actionable guidance");
});
