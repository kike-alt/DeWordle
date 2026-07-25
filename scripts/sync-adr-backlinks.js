#!/usr/bin/env node
/**
 * sync-adr-backlinks.js
 *
 * Scans configured docs and ADR paths for missing reciprocal backlink
 * relationships, then generates a maintainer-facing report of missing links.
 *
 * A "backlink" means:
 *   - Every ADR referenced by a doc should reference that doc back (or vice versa).
 *   - Every ADR should appear in at least one architecture/docs page.
 *
 * Usage:
 *   node scripts/sync-adr-backlinks.js [--docs <dir>] [--adr <dir>] [--fix]
 *
 * Options:
 *   --docs  Path to docs directory (default: docs)
 *   --adr   Path to ADR directory  (default: docs/adr)
 *   --fix   Append missing backlinks to ADR files automatically
 *   --json  Output raw JSON report
 */

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively collect all .md files under a directory. */
function collectMarkdown(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...collectMarkdown(full));
    else if (entry.isFile() && entry.name.endsWith(".md")) results.push(full);
  }
  return results;
}

/** Extract all markdown link targets from a file's content. */
function extractLinks(content) {
  const links = [];
  // [text](target)
  const mdLink = /\[([^\]]*)\]\(([^)]+)\)/g;
  let m;
  while ((m = mdLink.exec(content)) !== null) {
    links.push(m[2].split("#")[0]); // strip anchor
  }
  // bare filenames mentioned like `0001-something.md`
  const bareRef = /`([^`]+\.md)`/g;
  while ((m = bareRef.exec(content)) !== null) {
    links.push(m[1]);
  }
  return links;
}

/** Resolve a link target relative to a source file to an absolute path. */
function resolveLink(sourceFile, target) {
  if (path.isAbsolute(target)) return target;
  return path.resolve(path.dirname(sourceFile), target);
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

function analyse(docsDir, adrDir) {
  const adrFiles = collectMarkdown(adrDir);
  const docFiles = collectMarkdown(docsDir).filter(
    (f) => !f.startsWith(path.resolve(adrDir))
  );

  // Map absolute path → set of resolved link targets
  const linkMap = new Map();
  for (const file of [...adrFiles, ...docFiles]) {
    const content = fs.readFileSync(file, "utf8");
    const targets = extractLinks(content).map((t) => resolveLink(file, t));
    linkMap.set(path.resolve(file), new Set(targets));
  }

  const missing = []; // { adr, doc, direction }
  const orphanAdrs = []; // ADRs not referenced by any doc

  const adrAbsPaths = new Set(adrFiles.map((f) => path.resolve(f)));
  const docAbsPaths = new Set(docFiles.map((f) => path.resolve(f)));

  // 1. Find ADRs not referenced by any doc
  for (const adr of adrAbsPaths) {
    const referencedByAnyDoc = [...docAbsPaths].some((doc) =>
      linkMap.get(doc)?.has(adr)
    );
    if (!referencedByAnyDoc) {
      orphanAdrs.push(adr);
    }
  }

  // 2. For each doc→ADR reference, check ADR→doc backlink
  for (const [doc, targets] of linkMap.entries()) {
    if (!docAbsPaths.has(doc)) continue;
    for (const target of targets) {
      if (!adrAbsPaths.has(target)) continue;
      // doc references this ADR — does the ADR reference back?
      const adrLinks = linkMap.get(target);
      if (!adrLinks || !adrLinks.has(doc)) {
        missing.push({
          adr: path.relative(process.cwd(), target),
          doc: path.relative(process.cwd(), doc),
          direction: "adr-missing-backlink-to-doc",
        });
      }
    }
  }

  return { missing, orphanAdrs: orphanAdrs.map((f) => path.relative(process.cwd(), f)) };
}

// ---------------------------------------------------------------------------
// Fix mode — append backlink stubs to ADR files
// ---------------------------------------------------------------------------

function applyFixes(missing) {
  const grouped = new Map();
  for (const item of missing) {
    if (!grouped.has(item.adr)) grouped.set(item.adr, []);
    grouped.get(item.adr).push(item.doc);
  }

  for (const [adr, docs] of grouped.entries()) {
    let content = fs.readFileSync(adr, "utf8");
    if (!content.includes("## Referenced by")) {
      content += "\n\n## Referenced by\n";
    }
    for (const doc of docs) {
      const rel = path.relative(path.dirname(adr), doc);
      if (!content.includes(rel)) {
        content += `- [${path.basename(doc, ".md")}](${rel})\n`;
      }
    }
    fs.writeFileSync(adr, content);
    console.log(`  Fixed: ${adr}`);
  }
}

// ---------------------------------------------------------------------------
// Report rendering
// ---------------------------------------------------------------------------

function renderReport({ missing, orphanAdrs }) {
  const lines = [
    "# ADR Backlink Sync Report",
    `Generated: ${new Date().toISOString()}`,
    "",
  ];

  lines.push(`## Summary`);
  lines.push(`- Missing backlinks: **${missing.length}**`);
  lines.push(`- Orphan ADRs (not referenced by any doc): **${orphanAdrs.length}**`);
  lines.push("");

  if (missing.length > 0) {
    lines.push("## Missing Backlinks");
    lines.push("");
    lines.push("| ADR | References this doc | Fix |");
    lines.push("|-----|---------------------|-----|");
    for (const item of missing) {
      lines.push(`| \`${item.adr}\` | \`${item.doc}\` | Add link to \`${item.doc}\` in the ADR |`);
    }
    lines.push("");
  }

  if (orphanAdrs.length > 0) {
    lines.push("## Orphan ADRs");
    lines.push("_These ADRs are not linked from any doc page:_");
    lines.push("");
    for (const adr of orphanAdrs) {
      lines.push(`- \`${adr}\``);
    }
    lines.push("");
  }

  if (missing.length === 0 && orphanAdrs.length === 0) {
    lines.push("✓ All ADR backlinks are in sync.");
  } else {
    lines.push("## How to Fix");
    lines.push("Run with `--fix` to auto-append missing backlinks to ADR files:");
    lines.push("```");
    lines.push("node scripts/sync-adr-backlinks.js --fix");
    lines.push("```");
    lines.push("Then review and commit the changes.");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);

  const docsDir = path.resolve(
    args[args.indexOf("--docs") + 1] || "docs"
  );
  const adrDir = path.resolve(
    args[args.indexOf("--adr") + 1] || "docs/adr"
  );
  const fixMode = args.includes("--fix");
  const jsonMode = args.includes("--json");

  const result = analyse(docsDir, adrDir);

  if (fixMode && result.missing.length > 0) {
    console.log("Applying fixes...");
    applyFixes(result.missing);
    console.log("Done. Re-running analysis...\n");
    const after = analyse(docsDir, adrDir);
    Object.assign(result, after);
  }

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderReport(result));
  }

  // Exit 1 if issues remain (useful in CI)
  if (result.missing.length > 0 || result.orphanAdrs.length > 0) {
    process.exit(1);
  }
}

main();
