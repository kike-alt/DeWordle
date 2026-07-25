const assert = require("node:assert/strict");
const test = require("node:test");
const {
  tokenize,
  cosineSimilarity,
  titleOverlap,
  labelOverlap,
  matchByTrack,
  matchByDifficulty,
  computeDedupeScore,
  analyseProposedIssue,
} = require("./wave-issue-dedupe-checker.js");

// ---------------------------------------------------------------------------
// tokenize
// ---------------------------------------------------------------------------

test("tokenize returns lowercase tokens longer than 2 chars", () => {
  assert.deepEqual(tokenize("Fix login redirect bug"), [
    "fix",
    "login",
    "redirect",
    "bug",
  ]);
});

test("tokenize returns empty array for null/empty", () => {
  assert.deepEqual(tokenize(""), []);
  assert.deepEqual(tokenize(null), []);
});

// ---------------------------------------------------------------------------
// cosineSimilarity
// ---------------------------------------------------------------------------

test("cosineSimilarity returns 1 for identical texts", () => {
  assert.ok(
    cosineSimilarity("Implement user auth", "Implement user auth") > 0.99,
  );
});

test("cosineSimilarity returns 0 for disjoint texts", () => {
  assert.equal(
    cosineSimilarity("User authentication", "Database migration"),
    0,
  );
});

// ---------------------------------------------------------------------------
// titleOverlap
// ---------------------------------------------------------------------------

test("titleOverlap returns 1 for identical titles", () => {
  assert.equal(titleOverlap("Fix Login Bug", "Fix Login Bug"), 1);
});

test("titleOverlap returns 0 for completely different titles", () => {
  assert.equal(titleOverlap("Fix Login Bug", "Database Migration"), 0);
});

// ---------------------------------------------------------------------------
// labelOverlap
// ---------------------------------------------------------------------------

test("labelOverlap returns 1 for identical label sets", () => {
  const a = [{ name: "bug" }, { name: "track:FE" }];
  const b = [{ name: "bug" }, { name: "track:FE" }];
  assert.equal(labelOverlap(a, b), 1);
});

test("labelOverlap returns 0 for disjoint sets", () => {
  const a = [{ name: "bug" }];
  const b = [{ name: "enhancement" }];
  assert.equal(labelOverlap(a, b), 0);
});

// ---------------------------------------------------------------------------
// matchByTrack
// ---------------------------------------------------------------------------

test("matchByTrack returns true when tracks overlap", () => {
  const proposed = { labels: [{ name: "track:FE" }, { name: "track:BE" }] };
  const existing = { labels: [{ name: "track:FE" }] };
  assert.equal(matchByTrack(proposed, existing), true);
});

test("matchByTrack returns false when no track overlap", () => {
  const proposed = { labels: [{ name: "track:FE" }] };
  const existing = { labels: [{ name: "track:BE" }] };
  assert.equal(matchByTrack(proposed, existing), false);
});

test("matchByTrack returns false when either has no track labels", () => {
  assert.equal(
    matchByTrack({ labels: [{ name: "bug" }] }, { labels: [{ name: "track:FE" }] }),
    false,
  );
  assert.equal(
    matchByTrack({ labels: [{ name: "track:FE" }] }, { labels: [{ name: "bug" }] }),
    false,
  );
});

// ---------------------------------------------------------------------------
// matchByDifficulty
// ---------------------------------------------------------------------------

test("matchByDifficulty returns true when difficulty matches", () => {
  const proposed = { labels: [{ name: "difficulty:intermediate" }] };
  const existing = { labels: [{ name: "difficulty:intermediate" }] };
  assert.equal(matchByDifficulty(proposed, existing), true);
});

test("matchByDifficulty returns false when difficulty differs", () => {
  const proposed = { labels: [{ name: "difficulty:beginner" }] };
  const existing = { labels: [{ name: "difficulty:advanced" }] };
  assert.equal(matchByDifficulty(proposed, existing), false);
});

test("matchByDifficulty returns false when either has no difficulty label", () => {
  assert.equal(
    matchByDifficulty({ labels: [{ name: "bug" }] }, { labels: [{ name: "difficulty:beginner" }] }),
    false,
  );
});

// ---------------------------------------------------------------------------
// computeDedupeScore
// ---------------------------------------------------------------------------

test("computeDedupeScore returns higher score for similar issues", () => {
  const proposed = {
    title: "Implement user login",
    body: "Build JWT authentication for user login",
    labels: [{ name: "enhancement" }, { name: "track:FE" }, { name: "difficulty:intermediate" }],
  };
  const existing = {
    title: "Add user login system",
    body: "Implement JWT-based user authentication",
    labels: [{ name: "enhancement" }, { name: "track:FE" }, { name: "difficulty:intermediate" }],
  };
  const score = computeDedupeScore(proposed, existing);
  assert.ok(score.combined > 0.5);
});

test("computeDedupeScore returns lower score for unrelated issues", () => {
  const proposed = {
    title: "User login feature",
    body: "Login with email and password",
    labels: [{ name: "enhancement" }],
  };
  const existing = {
    title: "Database schema migration",
    body: "Migrate user table schema",
    labels: [{ name: "chore" }],
  };
  const score = computeDedupeScore(proposed, existing);
  assert.ok(score.combined < 0.3);
});

// ---------------------------------------------------------------------------
// analyseProposedIssue
// ---------------------------------------------------------------------------

test("analyseProposedIssue returns no matches for unique issue", () => {
  const proposed = {
    title: "Brand new feature",
    body: "Something completely new",
    labels: [],
  };
  const open = [
    {
      number: 1,
      title: "Fix login",
      html_url: "https://github.com/org/repo/issues/1",
      body: "Fix the login",
      labels: [{ name: "bug" }],
    },
  ];
  const result = analyseProposedIssue(proposed, open, []);
  assert.equal(result.totalMatches, 0);
  assert.equal(result.highConfidenceCount, 0);
  assert.equal(result.lowConfidenceCount, 0);
});

test("analyseProposedIssue categorises high vs low confidence", () => {
  const proposed = {
    title: "Implement user authentication",
    body: "Build JWT-based user authentication system with login and registration",
    labels: [
      { name: "enhancement" },
      { name: "track:FE" },
      { name: "difficulty:intermediate" },
    ],
  };
  const open = [
    {
      number: 10,
      title: "Add user authentication flow",
      html_url: "https://github.com/org/repo/issues/10",
      body: "Implement JWT authentication with login page",
      labels: [
        { name: "enhancement" },
        { name: "track:FE" },
        { name: "difficulty:intermediate" },
      ],
    },
  ];
  const result = analyseProposedIssue(proposed, open, []);
  assert.ok(result.highConfidenceCount >= 1 || result.lowConfidenceCount >= 1);
});
