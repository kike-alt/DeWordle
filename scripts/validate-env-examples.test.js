/**
 * QA-207: Example env validation tests.
 *
 * Validates that .env.example files do not drift from what the code
 * actually expects. Tests cover:
 *  - All required backend env keys are present in backend/.env.example
 *  - All optional backend keys are present (contributor guidance)
 *  - No unknown keys exist in .env.example (drift detection)
 *  - Optional vs required keys are explicitly documented
 *  - Frontend .env.example keys match expected surface
 *  - Soroban config keys are present in soroban/config/contracts.local.json
 *
 * Run: node --test scripts/validate-env-examples.test.js
 */

"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a .env.example file into a Set of key names.
 * Skips blank lines and comment-only lines (starting with #).
 */
function parseEnvExampleKeys(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const keys = new Set();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    keys.add(trimmed.slice(0, eqIdx).trim());
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Key classifications — derived from env.validation.ts EnvironmentVariables
// ---------------------------------------------------------------------------

// @IsNotEmpty() fields — must be provided; MUST appear in .env.example
const BACKEND_REQUIRED_KEYS = [
  "DB_HOST",
  "DB_USERNAME",
  "DB_PASSWORD",
  "DB_NAME",
  "JWT_SECRET",
  "SOROBAN_RPC_URL",
  "SOROBAN_CORE_GAME_CONTRACT_ID",
];

// @IsOptional() fields with defaults — SHOULD appear in .env.example as guidance
const BACKEND_OPTIONAL_KEYS = [
  "NODE_ENV",
  "PORT",
  "DB_PORT",
  "FRONTEND_URL",
  "SOROBAN_NETWORK",
];

// Keys in .env.example consumed outside EnvironmentVariables (nodemailer,
// scheduler, external dictionary APIs). Documented here to make drift explicit.
const BACKEND_EXTRA_KNOWN_KEYS = [
  "DB_SSL",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "DAILY_WORD_TIMEZONE",
  "DAILY_WORD_SCHEDULE",
  "MW_API_KEY",
  "OXFORD_APP_ID",
  "OXFORD_APP_KEY",
];

// Frontend .env.example keys
const FRONTEND_REQUIRED_KEYS = ["NEXT_PUBLIC_API_URL"];
const FRONTEND_OPTIONAL_KEYS = [
  "NEXT_PUBLIC_FEATURE_REWARDS",
  "NEXT_PUBLIC_FEATURE_ACHIEVEMENTS",
];

// Soroban contracts config expected structure
const SOROBAN_CONFIG_REQUIRED_KEYS = ["network", "rpcUrl", "contracts"];
const SOROBAN_CONTRACT_NAMES = [
  "admin_registry",
  "core_game",
  "rewards",
  "achievements",
];

// ---------------------------------------------------------------------------
// Backend .env.example tests
// ---------------------------------------------------------------------------

test("backend .env.example: file exists", () => {
  const envPath = path.join(REPO_ROOT, "backend", ".env.example");
  assert.ok(fs.existsSync(envPath), `backend/.env.example not found at ${envPath}`);
});

test("backend .env.example: all required keys are present", () => {
  const envPath = path.join(REPO_ROOT, "backend", ".env.example");
  const keys = parseEnvExampleKeys(envPath);
  const missing = BACKEND_REQUIRED_KEYS.filter((k) => !keys.has(k));
  assert.deepEqual(
    missing,
    [],
    `backend/.env.example is missing required keys: ${missing.join(", ")}`,
  );
});

test("backend .env.example: all optional validator keys are present", () => {
  const envPath = path.join(REPO_ROOT, "backend", ".env.example");
  const keys = parseEnvExampleKeys(envPath);
  const missing = BACKEND_OPTIONAL_KEYS.filter((k) => !keys.has(k));
  assert.deepEqual(
    missing,
    [],
    `backend/.env.example is missing optional keys: ${missing.join(", ")}`,
  );
});

test("backend .env.example: no unknown keys (drift detection)", () => {
  const envPath = path.join(REPO_ROOT, "backend", ".env.example");
  const keys = parseEnvExampleKeys(envPath);
  const knownKeys = new Set([
    ...BACKEND_REQUIRED_KEYS,
    ...BACKEND_OPTIONAL_KEYS,
    ...BACKEND_EXTRA_KNOWN_KEYS,
  ]);
  const unknown = [...keys].filter((k) => !knownKeys.has(k));
  assert.deepEqual(
    unknown,
    [],
    `backend/.env.example has unrecognised keys (possible drift): ${unknown.join(", ")}. ` +
      "Add them to BACKEND_REQUIRED_KEYS, BACKEND_OPTIONAL_KEYS, or BACKEND_EXTRA_KNOWN_KEYS.",
  );
});

test("backend .env.example: required and optional key lists are disjoint", () => {
  const requiredSet = new Set(BACKEND_REQUIRED_KEYS);
  const overlap = BACKEND_OPTIONAL_KEYS.filter((k) => requiredSet.has(k));
  assert.deepEqual(
    overlap,
    [],
    `Keys appear in both required and optional lists: ${overlap.join(", ")}`,
  );
});

test("backend .env.example: SOROBAN_RPC_URL has a non-empty example value", () => {
  const content = fs.readFileSync(
    path.join(REPO_ROOT, "backend", ".env.example"),
    "utf8",
  );
  const match = content.match(/^SOROBAN_RPC_URL=(.+)$/m);
  assert.ok(match, "SOROBAN_RPC_URL not found in backend/.env.example");
  assert.ok(
    match[1].trim().length > 0,
    "SOROBAN_RPC_URL must have a non-empty example value",
  );
});

test("backend .env.example: DB_HOST has a non-empty example value", () => {
  const content = fs.readFileSync(
    path.join(REPO_ROOT, "backend", ".env.example"),
    "utf8",
  );
  const match = content.match(/^DB_HOST=(.+)$/m);
  assert.ok(match, "DB_HOST not found in backend/.env.example");
  assert.ok(match[1].trim().length > 0, "DB_HOST must have a non-empty example value");
});

// ---------------------------------------------------------------------------
// Frontend .env.example tests
// ---------------------------------------------------------------------------

test("frontend .env.example: file exists", () => {
  const envPath = path.join(REPO_ROOT, "frontend", ".env.example");
  assert.ok(fs.existsSync(envPath), `frontend/.env.example not found at ${envPath}`);
});

test("frontend .env.example: all required keys are present", () => {
  const envPath = path.join(REPO_ROOT, "frontend", ".env.example");
  const keys = parseEnvExampleKeys(envPath);
  const missing = FRONTEND_REQUIRED_KEYS.filter((k) => !keys.has(k));
  assert.deepEqual(
    missing,
    [],
    `frontend/.env.example is missing required keys: ${missing.join(", ")}`,
  );
});

test("frontend .env.example: all optional keys are present", () => {
  const envPath = path.join(REPO_ROOT, "frontend", ".env.example");
  const keys = parseEnvExampleKeys(envPath);
  const missing = FRONTEND_OPTIONAL_KEYS.filter((k) => !keys.has(k));
  assert.deepEqual(
    missing,
    [],
    `frontend/.env.example is missing optional keys: ${missing.join(", ")}`,
  );
});

test("frontend .env.example: no unknown keys (drift detection)", () => {
  const envPath = path.join(REPO_ROOT, "frontend", ".env.example");
  const keys = parseEnvExampleKeys(envPath);
  const knownKeys = new Set([...FRONTEND_REQUIRED_KEYS, ...FRONTEND_OPTIONAL_KEYS]);
  const unknown = [...keys].filter((k) => !knownKeys.has(k));
  assert.deepEqual(
    unknown,
    [],
    `frontend/.env.example has unrecognised keys: ${unknown.join(", ")}. ` +
      "Add them to FRONTEND_REQUIRED_KEYS or FRONTEND_OPTIONAL_KEYS.",
  );
});

// ---------------------------------------------------------------------------
// Soroban config tests
// ---------------------------------------------------------------------------

test("soroban contracts.local.json: file exists", () => {
  const configPath = path.join(
    REPO_ROOT,
    "soroban",
    "config",
    "contracts.local.json",
  );
  assert.ok(
    fs.existsSync(configPath),
    `soroban/config/contracts.local.json not found at ${configPath}`,
  );
});

test("soroban contracts.local.json: required top-level keys are present", () => {
  const configPath = path.join(
    REPO_ROOT,
    "soroban",
    "config",
    "contracts.local.json",
  );
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const missing = SOROBAN_CONFIG_REQUIRED_KEYS.filter((k) => !(k in config));
  assert.deepEqual(
    missing,
    [],
    `soroban/config/contracts.local.json is missing keys: ${missing.join(", ")}`,
  );
});

test("soroban contracts.local.json: all expected contract names are present", () => {
  const configPath = path.join(
    REPO_ROOT,
    "soroban",
    "config",
    "contracts.local.json",
  );
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  assert.ok(
    config.contracts && typeof config.contracts === "object",
    "contracts key must be an object",
  );
  const missing = SOROBAN_CONTRACT_NAMES.filter(
    (name) => !(name in config.contracts),
  );
  assert.deepEqual(
    missing,
    [],
    `soroban/config/contracts.local.json is missing contract entries: ${missing.join(", ")}`,
  );
});

test("soroban contracts.local.json: rpcUrl is a valid URL", () => {
  const configPath = path.join(
    REPO_ROOT,
    "soroban",
    "config",
    "contracts.local.json",
  );
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  assert.equal(typeof config.rpcUrl, "string", "rpcUrl must be a string");
  assert.ok(config.rpcUrl.length > 0, "rpcUrl must not be empty");
  assert.doesNotThrow(
    () => new URL(config.rpcUrl),
    `rpcUrl '${config.rpcUrl}' is not a valid URL`,
  );
});
