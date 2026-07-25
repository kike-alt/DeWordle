const assert = require("node:assert/strict");
const test = require("node:test");
const {
  isStale,
  hasSkipLabel,
  buildNotificationComment,
  alreadyNotified,
} = require("./stale-pr-behind-main-notifier.js");

// ---------------------------------------------------------------------------
// isStale
// ---------------------------------------------------------------------------

test("isStale returns true for PR updated long ago", () => {
  const pr = {
    updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
  assert.equal(isStale(pr, 14), true);
});

test("isStale returns false for recently updated PR", () => {
  const pr = {
    updated_at: new Date().toISOString(),
  };
  assert.equal(isStale(pr, 14), false);
});

test("isStale respects custom stale days", () => {
  const pr = {
    updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  };
  assert.equal(isStale(pr, 7), true);
  assert.equal(isStale(pr, 14), false);
});

// ---------------------------------------------------------------------------
// hasSkipLabel
// ---------------------------------------------------------------------------

test("hasSkipLabel returns true when skip label present", () => {
  const pr = { labels: [{ name: "wip" }] };
  assert.equal(hasSkipLabel(pr, "wip"), true);
});

test("hasSkipLabel is case-insensitive", () => {
  const pr = { labels: [{ name: "WIP" }] };
  assert.equal(hasSkipLabel(pr, "wip"), true);
});

test("hasSkipLabel returns false when label absent", () => {
  const pr = { labels: [{ name: "bug" }] };
  assert.equal(hasSkipLabel(pr, "wip"), false);
});

test("hasSkipLabel returns false when no labels", () => {
  assert.equal(hasSkipLabel({ labels: [] }, "wip"), false);
  assert.equal(hasSkipLabel({}, "wip"), false);
});

// ---------------------------------------------------------------------------
// buildNotificationComment
// ---------------------------------------------------------------------------

test("buildNotificationComment includes PR details", () => {
  const pr = {
    user: { login: "contributor1" },
    assignees: [{ login: "reviewer1" }, { login: "reviewer2" }],
  };
  const comment = buildNotificationComment(pr, 10, 14);
  assert.ok(comment.includes("@contributor1"));
  assert.ok(comment.includes("@reviewer1"));
  assert.ok(comment.includes("@reviewer2"));
  assert.ok(comment.includes("10 commit(s) behind main"));
  assert.ok(comment.includes("14+ days"));
  assert.ok(comment.includes("<!-- stale-pr-behind-main-notifier -->"));
});

test("buildNotificationComment handles unassigned PRs", () => {
  const pr = { user: { login: "contributor1" }, assignees: [] };
  const comment = buildNotificationComment(pr, 5, 7);
  assert.ok(comment.includes("_unassigned_"));
});

// ---------------------------------------------------------------------------
// alreadyNotified
// ---------------------------------------------------------------------------

test("alreadyNotified returns true when marker found", () => {
  const comments = [
    { body: "Some comment" },
    { body: `<!-- stale-pr-behind-main-notifier -->\nnotification body` },
  ];
  assert.equal(
    alreadyNotified(comments, "<!-- stale-pr-behind-main-notifier -->"),
    true,
  );
});

test("alreadyNotified returns false when marker absent", () => {
  const comments = [{ body: "Some comment" }, { body: "Another comment" }];
  assert.equal(
    alreadyNotified(comments, "<!-- stale-pr-behind-main-notifier -->"),
    false,
  );
});

test("alreadyNotified returns false for empty comments", () => {
  assert.equal(
    alreadyNotified([], "<!-- stale-pr-behind-main-notifier -->"),
    false,
  );
});
