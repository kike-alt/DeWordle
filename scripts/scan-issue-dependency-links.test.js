const assert = require("node:assert/strict");
const test = require("node:test");

// ---------------------------------------------------------------------------
// Re-export internals for unit testing by temporarily shimming the module.
// We duplicate the pure functions here to keep the test self-contained and
// avoid coupling to the script's env-var bootstrap.
// ---------------------------------------------------------------------------

const DEPENDENCY_HEADINGS = [
  "dependencies",
  "dependency",
  "blocked by",
  "blocked-by",
  "blockers",
  "depends on",
  "depends-on",
];

function extractDependencySections(body) {
  if (!body) return [];
  const lines = body.split("\n");
  const sections = [];
  let capturing = false;
  let current = [];
  for (const line of lines) {
    const headingMatch =
      line.match(/^#{1,6}\s+(.+)$/) ||
      line.match(/^\*{1,2}([^*]+)\*{1,2}:?\s*$/);
    if (headingMatch) {
      const heading = headingMatch[1].trim().toLowerCase().replace(/:$/, "");
      if (
        DEPENDENCY_HEADINGS.some((h) => heading === h || heading.startsWith(h))
      ) {
        if (capturing && current.length) sections.push(current.join("\n"));
        capturing = true;
        current = [];
        continue;
      } else if (capturing) {
        if (current.length) sections.push(current.join("\n"));
        capturing = false;
        current = [];
      }
    }
    if (capturing) current.push(line);
  }
  if (capturing && current.length) sections.push(current.join("\n"));
  return sections;
}

function extractIssueRefs(text) {
  const refs = [];
  const seen = new Set();
  const patterns = [
    /https?:\/\/github\.com\/[^/\s]+\/[^/\s]+\/(?:issues|pull)\/(\d+)/gi,
    /[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+#(\d+)/g,
    /(?<![a-zA-Z0-9_/-])#(\d+)/g,
  ];
  for (const pat of patterns) {
    let m;
    while ((m = pat.exec(text)) !== null) {
      const num = parseInt(m[1], 10);
      if (!seen.has(num)) {
        seen.add(num);
        refs.push({ raw: m[0], number: num });
      }
    }
  }
  return refs;
}

// ---------------------------------------------------------------------------
// Tests: extractDependencySections
// ---------------------------------------------------------------------------

test("returns empty array when body is falsy", () => {
  assert.deepEqual(extractDependencySections(""), []);
  assert.deepEqual(extractDependencySections(null), []);
});

test("extracts content under ## Dependencies heading", () => {
  const body = "## Description\nsome text\n\n## Dependencies\n- #10\n- #20\n";
  const sections = extractDependencySections(body);
  assert.equal(sections.length, 1);
  assert.match(sections[0], /#10/);
});

test("extracts content under ## Blocked By heading", () => {
  const body = "## Blocked By\n- #99\n## Notes\nother";
  const sections = extractDependencySections(body);
  assert.equal(sections.length, 1);
  assert.match(sections[0], /#99/);
});

test("returns empty when no dependency heading present", () => {
  const body = "## Description\nno deps here\n";
  assert.deepEqual(extractDependencySections(body), []);
});

// ---------------------------------------------------------------------------
// Tests: extractIssueRefs
// ---------------------------------------------------------------------------

test("extracts bare #NNN references", () => {
  const refs = extractIssueRefs("depends on #42 and #100");
  assert.equal(refs.length, 2);
  assert.equal(refs[0].number, 42);
  assert.equal(refs[1].number, 100);
});

test("extracts GitHub URL references", () => {
  const refs = extractIssueRefs(
    "see https://github.com/org/repo/issues/55 for context",
  );
  assert.equal(refs.length, 1);
  assert.equal(refs[0].number, 55);
});

test("extracts owner/repo#NNN references", () => {
  const refs = extractIssueRefs("blocked by org/repo#77");
  assert.equal(refs.length, 1);
  assert.equal(refs[0].number, 77);
});

test("deduplicates identical references", () => {
  const refs = extractIssueRefs("#5 and #5 again");
  assert.equal(refs.length, 1);
});

test("returns empty array for text with no refs", () => {
  assert.deepEqual(extractIssueRefs("no references here"), []);
});

// ---------------------------------------------------------------------------
// Tests: malformed section detection (section found but empty)
// ---------------------------------------------------------------------------

test("flags malformed section when heading present but no refs", () => {
  const body = "## Dependencies\nNone\n";
  const sections = extractDependencySections(body);
  const refs = extractIssueRefs(sections.join("\n"));
  assert.equal(sections.length > 0 && refs.length === 0, true);
});
