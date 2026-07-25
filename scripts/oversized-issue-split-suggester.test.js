const assert = require("node:assert/strict");
const test = require("node:test");
const {
  countAcceptanceCriteria,
  countBlockers,
  countTracks,
  analyseIssue,
} = require("./oversized-issue-split-suggester.js");

// ---------------------------------------------------------------------------
// countAcceptanceCriteria
// ---------------------------------------------------------------------------

test("returns 0 when no AC section", () => {
  assert.equal(countAcceptanceCriteria("## Description\nsome text"), 0);
});

test("counts AC checkbox items", () => {
  const body = `## Acceptance Criteria\n- [ ] do A\n- [ ] do B\n- [x] do C\n## Notes\nend`;
  assert.equal(countAcceptanceCriteria(body), 3);
});

test("returns 0 for null/empty body", () => {
  assert.equal(countAcceptanceCriteria(""), 0);
  assert.equal(countAcceptanceCriteria(null), 0);
});

// ---------------------------------------------------------------------------
// countBlockers
// ---------------------------------------------------------------------------

test("returns 0 when no blocked-by section", () => {
  assert.equal(countBlockers("## Description\nno blockers"), 0);
});

test("counts issue refs in Blocked By section", () => {
  const body = `## Blocked By\n- #10\n- #20\n- #30\n## Next\nend`;
  assert.equal(countBlockers(body), 3);
});

// ---------------------------------------------------------------------------
// countTracks
// ---------------------------------------------------------------------------

test("returns 0 when no track labels", () => {
  const labels = [{ name: "bug" }, { name: "enhancement" }];
  assert.equal(countTracks(labels), 0);
});

test("counts track labels correctly", () => {
  const labels = [
    { name: "track:FE" },
    { name: "track:BE" },
    { name: "bug" },
  ];
  assert.equal(countTracks(labels), 2);
});

// ---------------------------------------------------------------------------
// analyseIssue
// ---------------------------------------------------------------------------

test("returns null for a normal small issue", () => {
  const issue = {
    number: 1,
    title: "Fix typo",
    html_url: "https://github.com/org/repo/issues/1",
    body: "Just a small fix.",
    labels: [{ name: "bug" }],
  };
  assert.equal(analyseIssue(issue), null);
});

test("flags issue with oversized size label", () => {
  const issue = {
    number: 2,
    title: "Big feature",
    html_url: "https://github.com/org/repo/issues/2",
    body: "Some body text.",
    labels: [{ name: "size:L" }],
  };
  const result = analyseIssue(issue);
  assert.ok(result);
  assert.ok(result.triggers.some((t) => t.heuristic === "size_label"));
});

test("flags issue with too many AC items", () => {
  const acs = Array.from({ length: 7 }, (_, i) => `- [ ] item ${i}`).join("\n");
  const body = `## Acceptance Criteria\n${acs}\n## Notes\ndone`;
  const issue = {
    number: 3,
    title: "Big task",
    html_url: "https://github.com/org/repo/issues/3",
    body,
    labels: [],
  };
  const result = analyseIssue(issue);
  assert.ok(result);
  assert.ok(result.triggers.some((t) => t.heuristic === "ac_count"));
});

test("flags issue spanning multiple tracks", () => {
  const issue = {
    number: 4,
    title: "Cross-track work",
    html_url: "https://github.com/org/repo/issues/4",
    body: "some text",
    labels: [{ name: "track:FE" }, { name: "track:BE" }],
  };
  const result = analyseIssue(issue);
  assert.ok(result);
  assert.ok(result.triggers.some((t) => t.heuristic === "multi_track"));
});

test("includes suggestions for all triggered heuristics", () => {
  const issue = {
    number: 5,
    title: "Very large",
    html_url: "https://github.com/org/repo/issues/5",
    body: "x".repeat(2000),
    labels: [{ name: "size:XL" }],
  };
  const result = analyseIssue(issue);
  assert.ok(result);
  assert.ok(result.suggestions.length > 0);
});
