#!/usr/bin/env node
/**
 * generate-env-examples.js
 *
 * Generates or validates .env.example files across the monorepo from a central
 * source of truth (env-definitions.js). Ensures all example env files stay in
 * sync and don't drift out of date.
 *
 * Usage:
 *   node scripts/generate-env-examples.js [--validate] [--fix] [--json]
 *
 * Options:
 *   --validate  Only check if existing .env.example files are up to date, don't modify them
 *   --fix       Update any out-of-sync .env.example files automatically
 *   --json      Output raw JSON report of issues/fixes
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { ENV_DEFINITIONS } = require("./env-definitions");

// Map of service name to its .env.example file path
const SERVICE_PATHS = {
  backend: path.join(process.cwd(), "backend", ".env.example"),
  frontend: path.join(process.cwd(), "frontend", ".env.example"),
};

/**
 * Generate the content of a .env.example file from its environment definitions
 */
function generateEnvExampleContent(definitions) {
  const lines = [];
  
  let currentSection = null;
  for (const env of definitions) {
    // Extract section from description if it's a section header, or infer from key patterns
    const section = getSectionForEnvKey(env.key);
    if (section !== currentSection) {
      if (currentSection !== null) lines.push(""); // Add blank line between sections
      lines.push(`# ${section}`);
      currentSection = section;
    }
    
    // Add the environment variable with its description as a comment
    lines.push(`${env.key}=${env.example}`);
  }
  
  return lines.join("\n") + "\n";
}

/**
 * Get the section name for an environment variable based on its key
 */
function getSectionForEnvKey(key) {
  if (key.startsWith("DB_")) return "Database";
  if (key.startsWith("JWT_") || key === "FRONTEND_URL") return "Auth";
  if (key.startsWith("SMTP_")) return "Email (SMTP)";
  if (key.startsWith("DAILY_WORD_")) return "Scheduling";
  if (key === "MW_API_KEY" || key.startsWith("OXFORD_")) return "Third-party APIs";
  if (key.startsWith("SOROBAN_")) return "Soroban/Stellar";
  if (key.startsWith("INDEXER_")) return "Indexer";
  if (key.startsWith("NEXT_PUBLIC_FEATURE_")) return "Feature flags";
  if (key.startsWith("NEXT_PUBLIC_")) return "API Configuration";
  if (key === "NODE_ENV" || key === "PORT") return "Server";
  return "General";
}

/**
 * Parse an existing .env.example file to extract the current variables
 */
function parseExistingEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return { exists: false, variables: new Map() };
  
  const content = fs.readFileSync(filePath, "utf8");
  const variables = new Map();
  
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;
    
    const key = trimmed.substring(0, equalsIndex).trim();
    const value = trimmed.substring(equalsIndex + 1).trim();
    variables.set(key, value);
  }
  
  return { exists: true, variables };
}

/**
 * Compare existing variables against the canonical definitions to find issues
 */
function compareVariables(existingMap, canonicalDefs) {
  const issues = [];
  const canonicalKeys = new Set(canonicalDefs.map(d => d.key));
  const existingKeys = new Set(existingMap.keys());
  
  // Check for missing variables in the existing file
  for (const def of canonicalDefs) {
    if (!existingMap.has(def.key)) {
      issues.push({ type: "missing", key: def.key, expected: def.example });
    } else if (existingMap.get(def.key) !== def.example) {
      issues.push({ type: "mismatch", key: def.key, existing: existingMap.get(def.key), expected: def.example });
    }
  }
  
  // Check for variables that exist but aren't in the canonical definitions (deprecated?)
  for (const key of existingKeys) {
    if (!canonicalKeys.has(key)) {
      issues.push({ type: "extra", key });
    }
  }
  
  return issues;
}

/**
 * Main function to run the env generation/validation
 */
function runEnvGenerator({ validate = false, fix = false }) {
  const results = [];
  
  for (const [service, defs] of Object.entries(ENV_DEFINITIONS)) {
    const filePath = SERVICE_PATHS[service];
    if (!filePath) {
      results.push({ service, ok: false, error: `No file path configured for service ${service}` });
      continue;
    }
    
    const { exists, variables: existingVars } = parseExistingEnvFile(filePath);
    const issues = exists ? compareVariables(existingVars, defs) : [{ type: "missing-file" }];
    const generatedContent = generateEnvExampleContent(defs);
    const needsUpdate = issues.length > 0;
    
    let updated = false;
    if (needsUpdate && fix && !validate) {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, generatedContent);
      updated = true;
    }
    
    results.push({
      service,
      filePath: path.relative(process.cwd(), filePath),
      exists,
      needsUpdate,
      updated,
      issues,
    });
  }
  
  const allOk = results.every(r => !r.needsUpdate);
  return { ok: allOk, results };
}

if (require.main === module) {
  const validate = process.argv.includes("--validate");
  const fix = process.argv.includes("--fix");
  const json = process.argv.includes("--json");
  
  const result = runEnvGenerator({ validate, fix });
  
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    console.log("Environment example file generator");
    console.log("==================================");
    
    for (const r of result.results) {
      console.log(`\n${r.service} (${r.filePath}):`);
      if (!r.exists) {
        console.log("  ✗ File does not exist");
        if (fix) console.log("  ✓ Created file");
      } else if (r.needsUpdate) {
        console.log("  ✗ Out of sync with central definitions:");
        for (const issue of r.issues) {
          if (issue.type === "missing") console.log(`    - Missing: ${issue.key}`);
          else if (issue.type === "mismatch") console.log(`    - Mismatch: ${issue.key} (had "${issue.existing}", expected "${issue.expected}")`);
          else if (issue.type === "extra") console.log(`    - Extra/deprecated: ${issue.key}`);
          else if (issue.type === "missing-file") console.log("    - File missing");
        }
        if (r.updated) console.log("  ✓ Fixed automatically");
      } else {
        console.log("  ✓ Up to date");
      }
    }
    
    console.log("");
    if (result.ok) {
      console.log("All environment example files are in sync!");
      process.exit(0);
    } else if (validate) {
      console.log("Validation failed: some .env.example files are out of sync. Run with --fix to update them.");
      process.exit(1);
    } else {
      console.log("Run with --fix to automatically update all out-of-sync files.");
      process.exit(1);
    }
  }
}

module.exports = { runEnvGenerator, generateEnvExampleContent, parseExistingEnvFile, compareVariables };