#!/usr/bin/env node
/**
 * sync-env-docs.js
 *
 * Scans documentation files for environment variable references and ensures
 * they are in sync with the central source of truth. Can also generate/update
 * an environment variables reference document in the docs folder.
 *
 * Usage:
 *   node scripts/sync-env-docs.js [--validate] [--fix] [--generate-reference] [--json]
 *
 * Options:
 *   --validate             Only check if docs are in sync, don't modify
 *   --fix                  Update any out-of-sync env docs automatically
 *   --generate-reference   Generate/refresh the ENVIRONMENT.md reference doc
 *   --json                 Output raw JSON report
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { ENV_DEFINITIONS } = require("./env-definitions");

const DOCS_DIR = path.join(process.cwd(), "docs");
const REFERENCE_FILE = path.join(DOCS_DIR, "ENVIRONMENT.md");

/**
 * Collect all markdown files in the docs directory
 */
function collectMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Extract all environment variable mentions from a markdown file
 * Looks for patterns like `ENV_VAR_NAME` or `process.env.ENV_VAR_NAME`
 */
function extractEnvMentions(content) {
  const mentions = new Set();
  // Match common env var patterns in docs
  const envVarRegex = /`(?:process\.env\.)?([A-Z_][A-Z0-9_]*)`/g;
  let match;
  while ((match = envVarRegex.exec(content)) !== null) {
    mentions.add(match[1]);
  }
  return mentions;
}

/**
 * Generate the environment reference documentation
 */
function generateEnvironmentReference() {
  let content = `# Environment Variables Reference\n\n`;
  content += `This document is auto-generated from the central environment definitions. `;
  content += `To update any environment variable, edit \`scripts/env-definitions.js\` and run:\n`;
  content += `\`\`\`bash\nnode scripts/sync-env-docs.js --generate-reference\n\`\`\`\n\n`;

  for (const [service, defs] of Object.entries(ENV_DEFINITIONS)) {
    content += `## ${service.charAt(0).toUpperCase() + service.slice(1)}\n\n`;
    content += `| Variable | Example Value | Description |\n`;
    content += `|----------|---------------|-------------|\n`;
    
    for (const def of defs) {
      const example = def.example ? `\`${def.example}\`` : "-";
      content += `| \`${def.key}\` | ${example} | ${def.description} |\n`;
    }
    content += "\n";
  }

  content += `## Updating Environment Variables\n\n`;
  content += `When adding new environment variables to the project:\n`;
  content += `1. Add them to the appropriate service array in \`scripts/env-definitions.js\`\n`;
  content += `2. Update any validation logic (e.g., backend's \`src/config/env.validation.ts\`)\n`;
  content += `3. Regenerate example files: \`node scripts/generate-env-examples.js --fix\`\n`;
  content += `4. Refresh this reference doc: \`node scripts/sync-env-docs.js --generate-reference\`\n`;

  return content;
}

/**
 * Check all markdown files for mentions of unknown environment variables
 */
function analyzeDocs() {
  const allCanonicalVars = new Set();
  for (const defs of Object.values(ENV_DEFINITIONS)) {
    for (const def of defs) {
      allCanonicalVars.add(def.key);
    }
  }

  const issues = [];
  const files = collectMarkdownFiles(DOCS_DIR);

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const mentions = extractEnvMentions(content);
    
    for (const mentioned of mentions) {
      if (!allCanonicalVars.has(mentioned)) {
        issues.push({
          file: path.relative(process.cwd(), file),
          variable: mentioned,
          type: "unknown-var-in-docs"
        });
      }
    }
  }

  // Check if reference file is up to date
  let referenceNeedsUpdate = false;
  if (fs.existsSync(REFERENCE_FILE)) {
    const currentContent = fs.readFileSync(REFERENCE_FILE, "utf8");
    const generatedContent = generateEnvironmentReference();
    // Simple check: if they don't match, it needs update
    if (currentContent.trim() !== generatedContent.trim()) {
      referenceNeedsUpdate = true;
      issues.push({
        file: path.relative(process.cwd(), REFERENCE_FILE),
        type: "reference-out-of-date"
      });
    }
  } else {
    referenceNeedsUpdate = true;
    issues.push({
      file: path.relative(process.cwd(), REFERENCE_FILE),
      type: "reference-missing"
    });
  }

  return { issues, allCanonicalVars, referenceNeedsUpdate, referenceFile: path.relative(process.cwd(), REFERENCE_FILE) };
}

/**
 * Main function to run the docs sync
 */
function runDocsSync({ validate = false, fix = false, generateReference = false }) {
  const analysis = analyzeDocs();
  const referenceUpdated = generateReference && !validate;
  
  if (referenceUpdated) {
    const newContent = generateEnvironmentReference();
    const dir = path.dirname(REFERENCE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(REFERENCE_FILE, newContent);
  }

  return {
    ok: analysis.issues.length === 0 || (!validate && referenceUpdated),
    issues: analysis.issues,
    referenceUpdated,
    referenceFile: analysis.referenceFile
  };
}

if (require.main === module) {
  const validate = process.argv.includes("--validate");
  const fix = process.argv.includes("--fix");
  const generateReference = process.argv.includes("--generate-reference");
  const json = process.argv.includes("--json");

  const result = runDocsSync({ validate, fix, generateReference });

  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    console.log("Environment documentation sync");
    console.log("===============================");

    if (result.issues.length === 0) {
      console.log("✓ All documentation is in sync with environment definitions!");
      if (result.referenceUpdated) {
        console.log(`✓ Updated environment reference file: ${result.referenceFile}`);
      }
      process.exit(0);
    }

    console.log("\nIssues found:");
    for (const issue of result.issues) {
      if (issue.type === "unknown-var-in-docs") {
        console.log(`  ✗ ${issue.file}: mentions unknown variable \`${issue.variable}\``);
      } else if (issue.type === "reference-out-of-date") {
        console.log(`  ✗ ${issue.file}: Environment reference is out of date`);
      } else if (issue.type === "reference-missing") {
        console.log(`  ✗ ${issue.file}: Environment reference file is missing`);
      }
    }

    console.log("");
    if (!validate && generateReference) {
      console.log("✓ Reference file has been updated.");
      process.exit(0);
    } else if (validate) {
      console.log("Validation failed. Run without --validate and with --generate-reference to fix.");
      process.exit(1);
    } else {
      console.log("Run with --generate-reference to update the environment reference document.");
      process.exit(1);
    }
  }
}

module.exports = { runDocsSync, generateEnvironmentReference, extractEnvMentions };