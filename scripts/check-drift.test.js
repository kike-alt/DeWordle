const assert = require("node:assert/strict");
const test = require("node:test");
const { existsSync } = require("node:fs");
const { resolve } = require("node:path");

test("check-drift script exists and is executable", () => {
  const scriptPath = resolve(__dirname, "check-drift.sh");
  assert.ok(existsSync(scriptPath), "check-drift script must exist");
  const mode = require("node:fs").statSync(scriptPath).mode;
  assert.ok(mode & 0o111, "check-drift script must be executable");
});
