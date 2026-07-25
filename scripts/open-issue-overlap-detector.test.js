const assert = require("node:assert/strict");
const test = require("node:test");
const {
  tokenize,
  cosineSimilarity,
  titleOverlap,
  labelOverlap,
  computeOverlapScore,
  analyseProposedIssue,
} = require("./open-issue-overlap-detector.js");

// ---------------------------------------------------------------------------
// tokenize
// ---------------------------------------------------------------------------

test("tokenize returns lowercase tokens longer than 2 chars", () => {
  assert.deepEqual(tokenize("Add user login API"), ["add", "user", "login", "api"]);
});

test("tokenize returns empty array for null/empty input", () => {
  assert.deepEqual(tokenize(""), []);
  assert.deepEqual(tokenize(null), []);
});

test("tokenize strips special characters", () => {
  assert.deepEqual(tokenize("feat(wallet): add $fund hook"), [
    "feat",
    "wallet",
    "add",
    "fund",
    "hook",
  ]);
});

// ---------------------------------------------------------------------------
// cosineSimilarity
// ---------------------------------------------------------------------------

test("cosineSimilarity returns 1 for identical texts", () => {
  const sim = cosineSimilarity("Implement user authentication", "Implement user authentication");
  assert.ok(sim > 0.99);
});

test("cosineSimilarity returns 0 for disjoint texts", () => {
  const sim = cosineSimilarity("User authentication module", "Database migration script");
  assert.equal(sim, 0);
});

test("cosineSimilarity returns partial for overlapping texts", () => {
  const sim = cosineSimilarity("Add user login API", "Add user registration API");
  assert.ok(sim > 0 && sim < 1);
});

// ---------------------------------------------------------------------------
// titleOverlap
// ---------------------------------------------------------------------------

test("titleOverlap returns 1 for identical titles", () => {
  assert.equal(titleOverlap("Add User Login", "Add User Login"), 1);
});

test("titleOverlap returns 0 for completely different titles", () => {
  assert.equal(titleOverlap("Add User Login", "Database Migration"), 0);
});

test("titleOverlap returns partial overlap", () => {
  const overlap = titleOverlap("Add user login", "Add admin login");
  assert.ok(overlap > 0.3 && overlap < 1);
});

// ---------------------------------------------------------------------------
// labelOverlap
// ---------------------------------------------------------------------------

test("labelOverlap returns 1 for identical label sets", () => {
  const a = [{ name: "bug" }, { name: "enhancement" }];
  const b = [{ name: "bug" }, { name: "enhancement" }];
  assert.equal(labelOverlap(a, b), 1);
});

test("labelOverlap returns 0 for disjoint sets", () => {
  const a = [{ name: "bug" }];
  const b = [{ name: "docs" }];
  assert.equal(labelOverlap(a, b), 0);
});

test("labelOverlap returns 0 when one set is empty", () => {
  const a = [{ name: "bug" }];
  assert.equal(labelOverlap(a, []), 0);
  assert.equal(labelOverlap([], [{ name: "bug" }]), 0);
});

// ---------------------------------------------------------------------------
// computeOverlapScore
// ---------------------------------------------------------------------------

test("computeOverlapScore returns high score for very similar issues", () => {
  const proposed = {
    title: "Add user authentication",
    body: "Implement user login with JWT tokens and session management",
    labels: [{ name: "enhancement" }, { name: "track:BE" }],
  };
  const existing = {
    title: "Add user authentication flow",
    body: "Build user login system using JWT authentication and sessions",
    labels: [{ name: "enhancement" }, { name: "track:BE" }],
  };
  const score = computeOverlapScore(proposed, existing);
  assert.ok(score.combined > 0.5);
});

test("computeOverlapScore returns low score for unrelated issues", () => {
  const proposed = {
    title: "Add user authentication",
    body: "Implement user login with JWT tokens",
    labels: [{ name: "enhancement" }],
  };
  const existing = {
    title: "Database migration script",
    body: "Create migration for user table schema changes",
    labels: [{ name: "chore" }],
  };
  const score = computeOverlapScore(proposed, existing);
  assert.ok(score.combined < 0.3);
});

// ---------------------------------------------------------------------------
// analyseProposedIssue
// ---------------------------------------------------------------------------

test("analyseProposedIssue returns no overlaps for unique issue", () => {
  const proposed = {
    title: "Unique new feature",
    body: "Brand new functionality not yet discussed",
    labels: [],
  };
  const existing = [
    {
      number: 1,
      title: "Fix login bug",
      html_url: "https://github.com/org/repo/issues/1",
      body: "Fix the login redirect issue",
      labels: [{ name: "bug" }],
    },
  ];
  const result = analyseProposedIssue(proposed, existing, 0.4);
  assert.equal(result.overlapCount, 0);
  assert.ok(result.recommendation.includes("No overlaps"));
});

test("analyseProposedIssue flags overlapping issues", () => {
  const proposed = {
    title: "Implement user login",
    body: "Build user authentication with JWT",
    labels: [{ name: "enhancement" }],
  };
  const existing = [
    {
      number: 42,
      title: "Add user login system",
      html_url: "https://github.com/org/repo/issues/42",
      body: "Implement JWT-based user authentication for the platform",
      labels: [{ name: "enhancement" }],
    },
  ];
  const result = analyseProposedIssue(proposed, existing, 0.3);
  assert.ok(result.overlapCount >= 1);
  assert.ok(result.overlaps[0].existingNumber === 42);
});
