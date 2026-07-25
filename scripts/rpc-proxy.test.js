const assert = require("node:assert/strict");
const test = require("node:test");
const { cacheKey, CACHEABLE_METHODS, NONCE_METHODS } = require("./rpc-proxy.js");

test("cacheKey produces a deterministic key", () => {
  const a = cacheKey("getLedgerEntry", [{ key: "abc" }]);
  const b = cacheKey("getLedgerEntry", [{ key: "abc" }]);
  assert.equal(a, b);
});

test("cacheKey differs for different params", () => {
  const a = cacheKey("getLedgerEntry", [{ key: "abc" }]);
  const b = cacheKey("getLedgerEntry", [{ key: "def" }]);
  assert.notEqual(a, b);
});

test("sendTransaction is in NONCE_METHODS", () => {
  assert.ok(NONCE_METHODS.has("sendTransaction"));
});

test("getLedgerEntry is in CACHEABLE_METHODS", () => {
  assert.ok(CACHEABLE_METHODS.has("getLedgerEntry"));
});

test("cacheable and nonce sets are disjoint", () => {
  for (const method of NONCE_METHODS) {
    assert.ok(!CACHEABLE_METHODS.has(method), `${method} should not be cacheable`);
  }
});
