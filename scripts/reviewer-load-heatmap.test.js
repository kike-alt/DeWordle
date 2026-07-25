const assert = require("node:assert/strict");
const test = require("node:test");
const {
  detectTrack,
  isRecent,
  buildLoadMap,
  totalLoad,
  heatSymbol,
} = require("./reviewer-load-heatmap.js");

// ---------------------------------------------------------------------------
// detectTrack
// ---------------------------------------------------------------------------

test("returns UNTRACKED when no track label", () => {
  assert.equal(detectTrack([{ name: "bug" }, { name: "size:S" }]), "UNTRACKED");
});

test("extracts track name from label", () => {
  assert.equal(
    detectTrack([{ name: "track:FE" }, { name: "bug" }]),
    "FE",
  );
});

test("track detection is case-insensitive", () => {
  assert.equal(detectTrack([{ name: "Track:AI/AUTOMATION" }]), "AI/AUTOMATION");
});

// ---------------------------------------------------------------------------
// isRecent
// ---------------------------------------------------------------------------

test("returns true for an update today", () => {
  assert.equal(isRecent(new Date().toISOString(), 30), true);
});

test("returns false for an update 60 days ago with 30-day window", () => {
  const old = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(isRecent(old, 30), false);
});

// ---------------------------------------------------------------------------
// buildLoadMap
// ---------------------------------------------------------------------------

const NOW = new Date().toISOString();

test("counts PR reviewer in correct track", () => {
  const prs = [
    {
      updated_at: NOW,
      labels: [{ name: "track:FE" }],
      requested_reviewers: [{ login: "alice" }],
    },
  ];
  const map = buildLoadMap(prs, [], 30);
  assert.equal(map["FE"]["alice"].prs, 1);
  assert.equal(map["FE"]["alice"].issues, 0);
});

test("counts issue assignee in correct track", () => {
  const issues = [
    {
      updated_at: NOW,
      labels: [{ name: "track:BE" }],
      assignees: [{ login: "bob" }],
    },
  ];
  const map = buildLoadMap([], issues, 30);
  assert.equal(map["BE"]["bob"].issues, 1);
  assert.equal(map["BE"]["bob"].prs, 0);
});

test("ignores items outside lookback window", () => {
  const old = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const prs = [
    {
      updated_at: old,
      labels: [{ name: "track:FE" }],
      requested_reviewers: [{ login: "carol" }],
    },
  ];
  const map = buildLoadMap(prs, [], 30);
  assert.equal(Object.keys(map).length, 0);
});

test("skips pull_request entries in issues list", () => {
  const issues = [
    {
      updated_at: NOW,
      labels: [{ name: "track:FE" }],
      assignees: [{ login: "dave" }],
      pull_request: {},
    },
  ];
  const map = buildLoadMap([], issues, 30);
  assert.equal(Object.keys(map).length, 0);
});

// ---------------------------------------------------------------------------
// totalLoad & heatSymbol
// ---------------------------------------------------------------------------

test("totalLoad sums prs and issues", () => {
  assert.equal(totalLoad({ prs: 3, issues: 2 }), 5);
});

test("heatSymbol returns correct tier", () => {
  assert.equal(heatSymbol(0), "░░");
  assert.equal(heatSymbol(2), "▒▒");
  assert.equal(heatSymbol(4), "▓▓");
  assert.equal(heatSymbol(7), "██");
});
