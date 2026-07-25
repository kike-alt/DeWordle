const assert = require("node:assert/strict");
const test = require("node:test");
const { generateDbName } = require("./provision-ephemeral-db.js");

test("generateDbName produces a name with the default prefix", () => {
  const name = generateDbName();
  assert.ok(name.startsWith("test_"), `Expected name to start with "test_", got ${name}`);
  assert.equal(name.length, "test_".length + 8, "Expected prefix + 8 hex chars");
});

test("generateDbName produces unique names on successive calls", () => {
  const a = generateDbName();
  const b = generateDbName();
  assert.notEqual(a, b);
});

test("generateDbName respects EPHEMERAL_DB_PREFIX", () => {
  const orig = process.env.EPHEMERAL_DB_PREFIX;
  process.env.EPHEMERAL_DB_PREFIX = "ci_";
  const name = generateDbName();
  assert.ok(name.startsWith("ci_"));
  if (orig === undefined) {
    delete process.env.EPHEMERAL_DB_PREFIX;
  } else {
    process.env.EPHEMERAL_DB_PREFIX = orig;
  }
});
