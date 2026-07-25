const assert = require("node:assert/strict");
const test = require("node:test");
const { normalizeFixture } = require("./fixture-sandbox.js");

test("normalizeFixture sorts event previews deterministically", () => {
  const result = normalizeFixture({
    events: [
      { topic: "b", ledger: 3, txHash: "tx-b", eventIndex: 1 },
      { topic: "a", ledger: 2, txHash: "tx-a", eventIndex: 0 },
      { topic: "c", ledger: 3, txHash: "tx-a", eventIndex: 0 },
    ],
  });

  assert.equal(result.total, 3);
  assert.deepEqual(
    result.normalized.map((event) => `${event.ledger}:${event.txHash}:${event.eventIndex}`),
    ["2:tx-a:0", "3:tx-a:0", "3:tx-b:1"],
  );
});
