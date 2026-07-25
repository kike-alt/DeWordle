const assert = require("node:assert/strict");
const test = require("node:test");
const {
  classifyByLabels,
  classifyPaths,
  buildMarkdown,
} = require("./compile-release-notes.js");

// ---------------------------------------------------------------------------
// classifyByLabels
// ---------------------------------------------------------------------------

test("classifies 'feat' label as New Features", () => {
  assert.match(classifyByLabels(["feat"]), /New Features/);
});

test("classifies 'Enhancement' label as New Features", () => {
  assert.match(classifyByLabels(["Enhancement"]), /New Features/);
});

test("classifies 'bug' label as Bug Fixes", () => {
  assert.match(classifyByLabels(["bug"]), /Bug Fixes/);
});

test("classifies 'fix' label as Bug Fixes", () => {
  assert.match(classifyByLabels(["fix"]), /Bug Fixes/);
});

test("classifies 'docs' label as Documentation", () => {
  assert.match(classifyByLabels(["docs"]), /Documentation/);
});

test("classifies 'breaking' label as Breaking Changes", () => {
  assert.match(classifyByLabels(["breaking"]), /Breaking Changes/);
});

test("classifies 'chore' label as Chores", () => {
  assert.match(classifyByLabels(["chore"]), /Chores/);
});

test("returns default category for unknown label", () => {
  assert.equal(classifyByLabels(["random-label"]), "🔀 Other");
});

test("returns default category for empty labels", () => {
  assert.equal(classifyByLabels([]), "🔀 Other");
});

// ---------------------------------------------------------------------------
// classifyPaths
// ---------------------------------------------------------------------------

test("maps frontend/ path to Frontend area", () => {
  assert.ok(classifyPaths(["frontend/src/App.tsx"]).includes("Frontend"));
});

test("maps backend/ path to Backend area", () => {
  assert.ok(classifyPaths(["backend/src/main.ts"]).includes("Backend"));
});

test("maps soroban/ path to Onchain/Soroban area", () => {
  assert.ok(
    classifyPaths(["soroban/contracts/game.rs"]).some((a) =>
      a.includes("Soroban"),
    ),
  );
});

test("maps scripts/ path to Tooling area", () => {
  assert.ok(
    classifyPaths(["scripts/foo.js"]).some((a) => a.includes("Tooling")),
  );
});

test("maps .github/ path to CI/Workflows area", () => {
  assert.ok(
    classifyPaths([".github/workflows/ci.yml"]).some((a) => a.includes("CI")),
  );
});

test("maps unknown path to General", () => {
  assert.ok(classifyPaths(["random/file.txt"]).includes("General"));
});

test("returns multiple distinct areas for multi-path PR", () => {
  const areas = classifyPaths(["frontend/App.tsx", "backend/main.ts"]);
  assert.ok(areas.includes("Frontend"));
  assert.ok(areas.includes("Backend"));
});

// ---------------------------------------------------------------------------
// buildMarkdown
// ---------------------------------------------------------------------------

test("includes PR title and number in output", () => {
  const sections = [
    {
      category: "✨ New Features",
      prs: [
        { number: 42, title: "Add dark mode", areas: ["Frontend"] },
      ],
    },
  ];
  const md = buildMarkdown(sections, "v1.0.0", "org/repo");
  assert.match(md, /#42/);
  assert.match(md, /Add dark mode/);
});

test("skips empty category sections", () => {
  const sections = [
    { category: "✨ New Features", prs: [] },
    { category: "🐛 Bug Fixes", prs: [{ number: 1, title: "Fix crash", areas: [] }] },
  ];
  const md = buildMarkdown(sections, "v1.0.0", "org/repo");
  assert.doesNotMatch(md, /## ✨ New Features/);
  assert.match(md, /## 🐛 Bug Fixes/);
});

test("shows no-PRs message when all sections empty", () => {
  const sections = [{ category: "✨ New Features", prs: [] }];
  const md = buildMarkdown(sections, "v1.0.0", "org/repo");
  assert.match(md, /No merged PRs found/);
});
