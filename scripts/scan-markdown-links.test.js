const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const {
  slugify,
  extractLinksFromLine,
  validateLocalLink,
  validateRemoteLink,
} = require("./scan-markdown-links.js");

// ---------------------------------------------------------------------------
// Unit Tests: slugify
// ---------------------------------------------------------------------------
test("slugify normalizes headers to GitHub anchor slugs", () => {
  assert.equal(slugify("Hello World"), "hello-world");
  assert.equal(slugify("Heading with <a> HTML tags"), "heading-with-html-tags");
  assert.equal(slugify("Some Special Char!?* & Symbols"), "some-special-char-symbols");
  assert.equal(slugify("  Multiple   Spaces  - and - dashes "), "multiple-spaces-and-dashes");
  assert.equal(slugify(""), "");
});

// ---------------------------------------------------------------------------
// Unit Tests: extractLinksFromLine
// ---------------------------------------------------------------------------
test("extractLinksFromLine parses standard inline markdown links", () => {
  const line = "Please check out [development guide](docs/DEVELOPMENT.md) or [contributing](../CONTRIBUTING.md).";
  const links = extractLinksFromLine(line, 1);
  assert.equal(links.length, 2);
  assert.equal(links[0].url, "docs/DEVELOPMENT.md");
  assert.equal(links[0].type, "inline");
  assert.equal(links[1].url, "../CONTRIBUTING.md");
  assert.equal(links[1].type, "inline");
});

test("extractLinksFromLine parses reference style links", () => {
  const line = "[guide]: docs/DEVELOPMENT.md";
  const links = extractLinksFromLine(line, 5);
  assert.equal(links.length, 1);
  assert.equal(links[0].url, "docs/DEVELOPMENT.md");
  assert.equal(links[0].type, "reference");
});

test("extractLinksFromLine parses HTML anchor links", () => {
  const line = '<p>Go to <a href="docs/wave/REVIEWER_PLAYBOOK.md">Playbook</a></p>';
  const links = extractLinksFromLine(line, 10);
  assert.equal(links.length, 1);
  assert.equal(links[0].url, "docs/wave/REVIEWER_PLAYBOOK.md");
  assert.equal(links[0].type, "html");
});

test("extractLinksFromLine parses raw remote URLs", () => {
  const line = "Visit https://developers.stellar.org/docs for details.";
  const links = extractLinksFromLine(line, 3);
  assert.equal(links.length, 1);
  assert.equal(links[0].url, "https://developers.stellar.org/docs");
  assert.equal(links[0].type, "raw_url");
});

test("extractLinksFromLine parses raw file paths in comments", () => {
  const line = "<!-- see docs/wave/REVIEWER_PLAYBOOK.md for details -->";
  const links = extractLinksFromLine(line, 2);
  assert.equal(links.length, 1);
  assert.equal(links[0].url, "docs/wave/REVIEWER_PLAYBOOK.md");
  assert.equal(links[0].type, "raw_path");
});

test("extractLinksFromLine filters out raw path when it is part of a URL", () => {
  const line = "See https://github.com/org/repo/blob/main/docs/DEVELOPMENT.md for details.";
  const links = extractLinksFromLine(line, 1);
  // Should only extract the raw URL, not the subsegment 'docs/DEVELOPMENT.md'
  assert.equal(links.length, 1);
  assert.equal(links[0].type, "raw_url");
  assert.equal(links[0].url, "https://github.com/org/repo/blob/main/docs/DEVELOPMENT.md");
});

// ---------------------------------------------------------------------------
// Integration Tests: Local Link Validation
// ---------------------------------------------------------------------------
test("validateLocalLink reports correct results on temp file fixture", () => {
  const tempDir = path.resolve(__dirname, `temp_test_fixtures_${Date.now()}`);
  fs.mkdirSync(tempDir);
  fs.mkdirSync(path.join(tempDir, "docs"));

  const readmePath = path.join(tempDir, "README.md");
  const setupPath = path.join(tempDir, "docs", "SETUP.md");

  // Create target files
  fs.writeFileSync(readmePath, "# Readme content\n", "utf8");
  fs.writeFileSync(
    setupPath,
    `# Project Setup

## Installation
Instructions go here.

## Configuration
Detailed configuration steps.
<a name="custom-html-anchor"></a>
`,
    "utf8"
  );

  try {
    // 1. Valid absolute-like paths (resolved relative to repoRoot tempDir)
    assert.deepEqual(validateLocalLink(readmePath, "/docs/SETUP.md", tempDir), { ok: true });

    // 2. Valid relative paths
    assert.deepEqual(validateLocalLink(readmePath, "docs/SETUP.md", tempDir), { ok: true });
    assert.deepEqual(validateLocalLink(setupPath, "../README.md", tempDir), { ok: true });

    // 3. Broken path existence
    const resBrokenFile = validateLocalLink(readmePath, "docs/NONEXISTENT.md", tempDir);
    assert.equal(resBrokenFile.ok, false);
    assert.match(resBrokenFile.error, /Target path does not exist/);

    // 4. Valid anchors
    assert.deepEqual(validateLocalLink(readmePath, "docs/SETUP.md#installation", tempDir), { ok: true });
    assert.deepEqual(validateLocalLink(readmePath, "docs/SETUP.md#configuration", tempDir), { ok: true });
    assert.deepEqual(validateLocalLink(readmePath, "docs/SETUP.md#custom-html-anchor", tempDir), { ok: true });

    // 5. Broken anchors
    const resBrokenAnchor = validateLocalLink(readmePath, "docs/SETUP.md#missing-anchor", tempDir);
    assert.equal(resBrokenAnchor.ok, false);
    assert.match(resBrokenAnchor.error, /Anchor "#missing-anchor" not found/);

    // 6. Anchor on directory (invalid)
    const resDirAnchor = validateLocalLink(readmePath, "docs#anchor", tempDir);
    assert.equal(resDirAnchor.ok, false);
    assert.match(resDirAnchor.error, /Cannot reference anchor "#anchor" on directory target/);

    // 7. Directory target (valid)
    assert.deepEqual(validateLocalLink(readmePath, "docs", tempDir), { ok: true });

  } finally {
    // Cleanup
    try {
      fs.unlinkSync(readmePath);
    } catch {}
    try {
      fs.unlinkSync(setupPath);
    } catch {}
    try {
      fs.rmdirSync(path.join(tempDir, "docs"));
    } catch {}
    try {
      fs.rmdirSync(tempDir);
    } catch {}
  }
});

// ---------------------------------------------------------------------------
// Unit Tests: validateRemoteLink (Skips / Placeholders / Local servers)
// ---------------------------------------------------------------------------
test("validateRemoteLink skips local servers and placeholders instantly", async () => {
  // Local servers should return skipped/ok immediately
  const localUrlRes = await validateRemoteLink("http://localhost:3000/api");
  assert.equal(localUrlRes.ok, true);
  assert.equal(localUrlRes.skipped, true);

  const localIpRes = await validateRemoteLink("http://127.0.0.1/status");
  assert.equal(localIpRes.ok, true);
  assert.equal(localIpRes.skipped, true);

  // Placeholders should be skipped
  const placeholderRes = await validateRemoteLink("https://...");
  assert.equal(placeholderRes.ok, true);
  assert.equal(placeholderRes.skipped, true);
  
  const githubPlaceholderRes = await validateRemoteLink("https://github.com/...");
  assert.equal(githubPlaceholderRes.ok, true);
  assert.equal(githubPlaceholderRes.skipped, true);

  // Non http/https links should be skipped
  const mailtoRes = await validateRemoteLink("mailto:user@example.com");
  assert.equal(mailtoRes.ok, true);
  assert.equal(mailtoRes.skipped, true);
});
