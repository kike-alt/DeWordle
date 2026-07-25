const assert = require("node:assert/strict");
const test = require("node:test");
const {
  classifyConclusion,
  buildCheckSummary,
  buildWorkflowSummary,
  buildJobSummary,
  buildArtifactSummary,
  buildMarkdownSummary,
} = require("./ci-evidence-summarizer.js");

// ---------------------------------------------------------------------------
// classifyConclusion
// ---------------------------------------------------------------------------

test("classifyConclusion maps success", () => {
  const r = classifyConclusion("success");
  assert.equal(r.status, "pass");
  assert.equal(r.icon, "✓");
});

test("classifyConclusion maps failure", () => {
  const r = classifyConclusion("failure");
  assert.equal(r.status, "fail");
  assert.equal(r.icon, "✗");
});

test("classifyConclusion maps unknown", () => {
  const r = classifyConclusion(undefined);
  assert.equal(r.status, "unknown");
});

// ---------------------------------------------------------------------------
// buildCheckSummary
// ---------------------------------------------------------------------------

test("buildCheckSummary groups check runs by name", () => {
  const runs = [
    { name: "Lint", conclusion: "success", html_url: "https://example.com/1" },
    { name: "Test", conclusion: "failure", html_url: "https://example.com/2" },
    { name: "Lint", conclusion: "success", html_url: "https://example.com/3" },
  ];
  const summary = buildCheckSummary(runs);
  assert.equal(summary.length, 2);
  const lint = summary.find((c) => c.name === "Lint");
  assert.ok(lint);
  assert.equal(lint.status, "pass");
});

test("buildCheckSummary returns empty for no runs", () => {
  assert.deepEqual(buildCheckSummary([]), []);
});

// ---------------------------------------------------------------------------
// buildWorkflowSummary
// ---------------------------------------------------------------------------

test("buildWorkflowSummary filters by head SHA", () => {
  const runs = [
    { name: "CI", head_sha: "abc123", conclusion: "success", id: 1 },
    { name: "Deploy", head_sha: "def456", conclusion: "failure", id: 2 },
  ];
  const summary = buildWorkflowSummary(runs, "abc123");
  assert.equal(summary.length, 1);
  assert.equal(summary[0].name, "CI");
});

test("buildWorkflowSummary returns empty for no matching SHA", () => {
  assert.deepEqual(buildWorkflowSummary([], "abc123"), []);
});

// ---------------------------------------------------------------------------
// buildJobSummary
// ---------------------------------------------------------------------------

test("buildJobSummary calculates duration", () => {
  const jobs = [
    {
      name: "lint",
      conclusion: "success",
      started_at: "2026-06-01T10:00:00Z",
      completed_at: "2026-06-01T10:01:30Z",
      html_url: "https://example.com",
    },
  ];
  const summary = buildJobSummary(jobs);
  assert.equal(summary.length, 1);
  assert.ok(summary[0].duration);
  assert.equal(summary[0].status, "pass");
});

test("buildJobSummary handles running jobs", () => {
  const jobs = [
    {
      name: "test",
      conclusion: null,
      started_at: null,
      completed_at: null,
      html_url: "https://example.com",
    },
  ];
  const summary = buildJobSummary(jobs);
  assert.equal(summary.length, 1);
  assert.equal(summary[0].duration, null);
});

// ---------------------------------------------------------------------------
// buildArtifactSummary
// ---------------------------------------------------------------------------

test("buildArtifactSummary maps artifact fields", () => {
  const artifacts = [
    {
      name: "test-results",
      size_in_bytes: 2048,
      archive_download_url: "https://example.com/artifact",
      created_at: "2026-06-01T10:00:00Z",
      expired: false,
    },
  ];
  const summary = buildArtifactSummary(artifacts);
  assert.equal(summary.length, 1);
  assert.equal(summary[0].name, "test-results");
  assert.equal(summary[0].sizeBytes, 2048);
  assert.equal(summary[0].expired, false);
});

test("buildArtifactSummary returns empty for no artifacts", () => {
  assert.deepEqual(buildArtifactSummary([]), []);
});

// ---------------------------------------------------------------------------
// buildMarkdownSummary
// ---------------------------------------------------------------------------

test("buildMarkdownSummary includes PR details", () => {
  const pr = {
    number: 42,
    title: "Fix login bug",
    html_url: "https://github.com/org/repo/pull/42",
    head: { ref: "feature/fix", sha: "abc123def456" },
    base: { ref: "main" },
    user: { login: "contributor1" },
  };
  const checks = [];
  const markdown = buildMarkdownSummary(pr, checks, [], {}, {});
  assert.ok(markdown.includes("#42"));
  assert.ok(markdown.includes("Fix login bug"));
  assert.ok(markdown.includes("@contributor1"));
});

test("buildMarkdownSummary includes failed check icon", () => {
  const pr = {
    number: 1,
    title: "Test",
    html_url: "https://github.com/org/repo/pull/1",
    head: { ref: "test", sha: "abc" },
    base: { ref: "main" },
    user: { login: "user" },
  };
  const checks = [
    { name: "Lint", status: "fail", icon: "✗", conclusion: "failure" },
    { name: "Build", status: "pass", icon: "✓", conclusion: "success" },
  ];
  const markdown = buildMarkdownSummary(pr, checks, [], {}, {});
  assert.ok(markdown.includes("✗"));
  assert.ok(markdown.includes("1 failed"));
  assert.ok(markdown.includes("1 passed"));
});
