const assert = require("node:assert/strict");
const test = require("node:test");
const { existsSync } = require("node:fs");
const { resolve } = require("node:path");

test("backup script exists and is executable", () => {
  const scriptPath = resolve(__dirname, "backup-projection-data.sh");
  assert.ok(existsSync(scriptPath), "backup script must exist");
  const mode = require("node:fs").statSync(scriptPath).mode;
  assert.ok(mode & 0o111, "backup script must be executable");
});

test("restore script exists and is executable", () => {
  const scriptPath = resolve(__dirname, "restore-projection-data.sh");
  assert.ok(existsSync(scriptPath), "restore script must exist");
  const mode = require("node:fs").statSync(scriptPath).mode;
  assert.ok(mode & 0o111, "restore script must be executable");
});
