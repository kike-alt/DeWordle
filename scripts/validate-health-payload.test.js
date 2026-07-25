const assert = require("node:assert/strict");
const test = require("node:test");
const { validate } = require("./validate-health-payload.js");

const validPayload = {
  generated_at: "2026-06-25T12:00:00Z",
  version: "1.0.0",
  producers: {
    backend: {
      status: "healthy",
      uptime_seconds: 86400,
      version: "0.1.0",
      database: {
        status: "healthy",
        connected: true,
        pool_size: 10,
        active: 2,
        idle: 8,
        migrations: { applied: 15, pending: 0 },
      },
    },
    indexer: {
      status: "healthy",
      last_ingested_at: "2026-06-25T11:59:30Z",
      lag_blocks: 0,
      total_events: 12000,
      cursor_position: "0000000123456",
      replay_skip_count: 3,
      replay_alert: null,
    },
    frontend: {
      status: "healthy",
      version: "0.1.0",
      build_sha: "abc123",
      network: { expected: "testnet", connected: true, network_passphrase: null },
    },
    soroban: {
      status: "healthy",
      network: "testnet",
      core_game_contract: "CCR3ZQ...",
      rpc: { reachable: true, latency_ms: 42, last_ok_at: "2026-06-25T11:59:31Z" },
    },
  },
  summary: { total_services: 4, healthy: 4, degraded: 0, down: 0 },
};

test("valid payload passes validation", () => {
  const errors = validate(validPayload);
  assert.deepEqual(errors, []);
});

test("missing generated_at yields error", () => {
  const { generated_at, ...rest } = validPayload;
  const errors = validate(rest);
  assert.ok(errors.some((e) => e.path === "generated_at"));
});

test("invalid status yields error", () => {
  const p = JSON.parse(JSON.stringify(validPayload));
  p.producers.backend.status = "unknown";
  const errors = validate(p);
  assert.ok(errors.some((e) => e.path === "producers.backend.status"));
});

test("null payload yields error", () => {
  const errors = validate(null);
  assert.ok(errors.length > 0);
});

test("summary mismatch yields error", () => {
  const p = JSON.parse(JSON.stringify(validPayload));
  p.summary.healthy = 5;
  const errors = validate(p);
  assert.ok(errors.some((e) => e.path === "summary"));
});

test("missing producer object yields error", () => {
  const p = JSON.parse(JSON.stringify(validPayload));
  delete p.producers.soroban;
  const errors = validate(p);
  assert.ok(errors.some((e) => e.path === "producers.soroban"));
});
