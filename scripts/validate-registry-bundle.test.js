const assert = require("node:assert/strict");
const test = require("node:test");
const { validate, VALID_NETWORKS } = require("./validate-registry-bundle.js");

const validBundle = {
  network: "testnet",
  rpcUrl: "https://soroban-testnet.stellar.org",
  passphrase: "Test SDF Network ; September 2015",
  contracts: {
    admin_registry: "CCJZ5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5",
    core_game: "CCJZ5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5",
    rewards: "CCJZ5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5",
    achievements: "CCJZ5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5",
  },
};

test("valid bundle passes validation", () => {
  const errors = validate(validBundle);
  assert.deepEqual(errors, []);
});

test("missing network yields error", () => {
  const { network, ...rest } = validBundle;
  const errors = validate(rest);
  assert.ok(errors.some((e) => e.path === "network"));
});

test("invalid network yields error", () => {
  const b = JSON.parse(JSON.stringify(validBundle));
  b.network = "invalidnet";
  const errors = validate(b);
  assert.ok(errors.some((e) => e.path === "network"));
});

test("missing contract yields error", () => {
  const b = JSON.parse(JSON.stringify(validBundle));
  delete b.contracts.core_game;
  const errors = validate(b);
  assert.ok(errors.some((e) => e.path === "contracts.core_game"));
});

test("unknown contract key yields error", () => {
  const b = JSON.parse(JSON.stringify(validBundle));
  b.contracts.extra_contract = "C...";
  const errors = validate(b);
  assert.ok(errors.some((e) => e.path === "contracts"));
});

test("null bundle yields error", () => {
  const errors = validate(null);
  assert.ok(errors.length > 0);
});

test("VALID_NETWORKS includes local", () => {
  assert.ok(VALID_NETWORKS.includes("local"));
});
