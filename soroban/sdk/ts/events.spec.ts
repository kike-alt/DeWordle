/**
 * Unit tests for SDK event decode trace toggles.
 *
 * Run:
 *   npx tsx soroban/sdk/ts/events.spec.ts
 */
import {
  decodeEvent,
  decodeEventWithTrace,
  createEventDecodeTrace,
  normalizeTopic,
  resolveEventFamily,
  type DecodedEvent,
  type EventDecodeTrace,
} from "./events.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  const ok =
    JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${message}\n    expected: ${JSON.stringify(expected)}\n    actual:   ${JSON.stringify(actual)}`);
  }
}

// ---------------------------------------------------------------------------
// decodeEventWithTrace — produces correct decoded event
// ---------------------------------------------------------------------------

console.log("decodeEventWithTrace returns identical result to decodeEvent");

const rawCore = {
  contractId: "C1",
  topic: "Session_Started",
  value: { player: "addr1" },
  ledger: 100,
  txHash: "tx-abc",
};

const coreViaDecode = decodeEvent(rawCore);
const coreViaTrace = decodeEventWithTrace(rawCore);

assertEqual(coreViaDecode.contractId, coreViaTrace.contractId, "contractId matches");
assertEqual(coreViaDecode.topic, coreViaTrace.topic, "topic matches");
assertEqual(coreViaDecode.payload, coreViaTrace.payload, "payload matches");
assertEqual(coreViaDecode.ledger, coreViaTrace.ledger, "ledger matches");
assertEqual(coreViaDecode.txHash, coreViaTrace.txHash, "txHash matches");

// ---------------------------------------------------------------------------
// decodeEventWithTrace — unknown topic falls through to fallback
// ---------------------------------------------------------------------------

console.log("decodeEventWithTrace handles unknown topic via fallback");

const rawUnknown = {
  contractId: "C2",
  topic: "some_unknown_topic",
  value: { data: 42 },
};

const unknownResult = decodeEventWithTrace(rawUnknown);
assertEqual(unknownResult.topic, "some_unknown_topic", "topic preserved");
assertEqual(unknownResult.payload, { data: 42 }, "payload passed through");

// ---------------------------------------------------------------------------
// Trace collection — known event produces classify entry
// ---------------------------------------------------------------------------

console.log("trace collects entries for known core_game event");

const trace1 = createEventDecodeTrace();
decodeEventWithTrace(rawCore, { trace: trace1 });

assert(trace1.entries.length >= 2, "at least 2 trace entries (normalize + classify)");
assertEqual(trace1.entries[0].phase, "normalize", "first entry phase is normalize");
assertEqual(trace1.entries[1].phase, "classify", "second entry phase is classify");
assert(
  trace1.entries[1].detail.includes("core_game"),
  "classify detail mentions core_game",
);

// ---------------------------------------------------------------------------
// Trace collection — unknown topic produces fallback entry
// ---------------------------------------------------------------------------

console.log("trace collects fallback entry for unknown topic");

const trace2 = createEventDecodeTrace();
decodeEventWithTrace(rawUnknown, { trace: trace2 });

const fallbackEntries = trace2.entries.filter((e) => e.phase === "fallback");
assert(fallbackEntries.length === 1, "exactly one fallback entry");
assert(
  fallbackEntries[0].detail.includes("passed through"),
  "fallback detail mentions payload passthrough",
);

// ---------------------------------------------------------------------------
// No trace — zero overhead (no entries allocated)
// ---------------------------------------------------------------------------

console.log("no trace option means no entries are created");

const noTraceResult = decodeEventWithTrace(rawCore);
assertEqual(noTraceResult.topic, "session_started", "event decoded correctly without trace");

// ---------------------------------------------------------------------------
// createEventDecodeTrace produces empty entries array
// ---------------------------------------------------------------------------

console.log("createEventDecodeTrace returns empty entries");

const freshTrace = createEventDecodeTrace();
assertEqual(freshTrace.entries.length, 0, "entries array is empty");

// ---------------------------------------------------------------------------
// Trace entries for each event family
// ---------------------------------------------------------------------------

console.log("trace entries for rewards event");

const rawRewards = { contractId: "C3", topic: "Accrued", value: { amount: 10 } };
const traceR = createEventDecodeTrace();
decodeEventWithTrace(rawRewards, { trace: traceR });
assert(
  traceR.entries.some((e) => e.detail.includes("rewards")),
  "rewards routing detected in trace",
);

console.log("trace entries for achievements event");

const rawAch = { contractId: "C4", topic: "achievement_unlocked", value: { id: 1 } };
const traceA = createEventDecodeTrace();
decodeEventWithTrace(rawAch, { trace: traceA });
assert(
  traceA.entries.some((e) => e.detail.includes("achievements")),
  "achievements routing detected in trace",
);

console.log("trace entries for admin_registry event");

const rawAdmin = { contractId: "C5", topic: "role_set", value: { role: "admin" } };
const traceAd = createEventDecodeTrace();
decodeEventWithTrace(rawAdmin, { trace: traceAd });
assert(
  traceAd.entries.some((e) => e.detail.includes("admin_registry")),
  "admin_registry routing detected in trace",
);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
