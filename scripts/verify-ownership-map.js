#!/usr/bin/env node
/**
 * Verify Code Ownership Map - Validation script for the new ownership documentation
 *
 * Usage:
 *   node scripts/verify-ownership-map.js
 *
 * Verifies:
 *   - All documentation files exist and are properly linked
 *   - CODEOWNERS file is properly formatted
 *   - Contributor commands in documentation are valid
 */

"use strict";

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

let errors = 0;
let warnings = 0;

function logPass(message) {
  console.log(`✅ ${message}`);
}

function logWarn(message) {
  console.log(`⚠️  ${message}`);
  warnings++;
}

function logFail(message) {
  console.log(`❌ ${message}`);
  errors++;
}

function fileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main validation
// ---------------------------------------------------------------------------

console.log("🔍 Verifying Code Ownership Map implementation...\n");

const rootDir = path.join(__dirname, "..");

// 1. Verify CODE_OWNERSHIP_MAP.md exists and contains critical sections
const ownershipMapPath = path.join(rootDir, "docs", "CODE_OWNERSHIP_MAP.md");
if (fileExists(ownershipMapPath)) {
  logPass("docs/CODE_OWNERSHIP_MAP.md exists");
  const content = readFile(ownershipMapPath);
  
  // Verify critical sections exist
  const requiredSections = [
    "Maintained Surface Ownership Matrix",
    "Transitional Surface Ownership",
    "Legacy Surface Routing",
    "Tooling for Maintainers",
    "Updating This Map"
  ];
  
  requiredSections.forEach(section => {
    if (content.includes(section)) {
      logPass(`  - Contains '${section}' section`);
    } else {
      logFail(`  - Missing '${section}' section`);
    }
  });
  
  // Verify all maintained surfaces are documented
  const maintainedPaths = [
    "/soroban/contracts/",
    "/soroban/crates/",
    "/backend/src/indexer/",
    "/frontend/src/lib/stellar/",
    "/docs/",
    "/.github/workflows/",
    "/scripts/"
  ];
  
  maintainedPaths.forEach(surface => {
    if (content.includes(surface)) {
      logPass(`  - Documents ${surface} ownership`);
    } else {
      logWarn(`  - Missing documentation for ${surface}`);
    }
  });
} else {
  logFail("docs/CODE_OWNERSHIP_MAP.md missing");
}

// 2. Verify CODEOWNERS file was updated
const codeownersPath = path.join(rootDir, ".github", "CODEOWNERS");
if (fileExists(codeownersPath)) {
  logPass(".github/CODEOWNERS exists");
  const content = readFile(codeownersPath);
  
  // Verify it links to the ownership map
  if (content.includes("docs/CODE_OWNERSHIP_MAP.md")) {
    logPass("  - Links to detailed ownership documentation");
  } else {
    logFail("  - Missing link to CODE_OWNERSHIP_MAP.md");
  }
  
  // Verify it has the new section structure
  if (content.includes("MAINTAINED CANONICAL SURFACES") &&
      content.includes("TRANSITIONAL SURFACES") &&
      content.includes("LEGACY SURFACES")) {
    logPass("  - Has correct section classification");
  } else {
    logFail("  - Missing proper section classifications");
  }
  
  // Verify all maintained surfaces have explicit ownership
  const codeownerPaths = [
    "/soroban/contracts/",
    "/soroban/crates/",
    "/backend/src/indexer/",
    "/frontend/src/lib/stellar/",
    "/frontend/src/lib/soroban/",
    "/docs/",
    "/.github/workflows/",
    "/scripts/"
  ];
  
  codeownerPaths.forEach(surface => {
    if (content.includes(surface)) {
      logPass(`  - CODEOWNERS explicitly lists ${surface}`);
    } else {
      logFail(`  - CODEOWNERS missing ${surface}`);
    }
  });
} else {
  logFail(".github/CODEOWNERS missing");
}

// 3. Verify CONTRIBUTING.md was updated
const contributingPath = path.join(rootDir, "CONTRIBUTING.md");
if (fileExists(contributingPath)) {
  logPass("CONTRIBUTING.md exists");
  const content = readFile(contributingPath);
  
  if (content.includes("Code Ownership & Reviewer Map")) {
    logPass("  - References the new ownership map");
  } else {
    logFail("  - Missing reference to CODE_OWNERSHIP_MAP.md");
  }
  
  if (content.includes("reviewer-load-heatmap.js")) {
    logPass("  - Includes reviewer load monitoring command");
  } else {
    logWarn("  - Missing reviewer load monitoring instructions");
  }
  
  // Verify contributor commands are present
  const commands = [
    "npm run install:all",
    "cargo check --workspace",
    "npm run lint:ci"
  ];
  
  commands.forEach(cmd => {
    if (content.includes(cmd)) {
      logPass(`  - Documents command: ${cmd}`);
    } else {
      logWarn(`  - Missing command documentation: ${cmd}`);
    }
  });
} else {
  logFail("CONTRIBUTING.md missing");
}

// 4. Verify REPO_SURFACE_MAP.md exists and is properly linked
const surfaceMapPath = path.join(rootDir, "docs", "REPO_SURFACE_MAP.md");
if (fileExists(surfaceMapPath)) {
  logPass("docs/REPO_SURFACE_MAP.md exists (foundational map)");
} else {
  logFail("docs/REPO_SURFACE_MAP.md missing - required foundational document");
}

// 5. Verify reviewer tooling scripts exist
const reviewerScripts = [
  "reviewer-load-heatmap.js",
  "reviewer-load-balancer.js"
];

reviewerScripts.forEach(script => {
  const scriptPath = path.join(rootDir, "scripts", script);
  if (fileExists(scriptPath)) {
    logPass(`scripts/${script} exists (reviewer load tooling)`);
  } else {
    logFail(`scripts/${script} missing`);
  }
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log("\n" + "=".repeat(60));
console.log(`📊 Validation Summary: ${errors} errors, ${warnings} warnings`);

if (errors === 0) {
  console.log("\n🎉 All critical validation checks passed!");
  console.log("   Module ownership and reviewer map has been successfully published.");
  console.log("   - CODEOWNERS updated with granular surface ownership");
  console.log("   - Comprehensive documentation created in docs/CODE_OWNERSHIP_MAP.md");
  console.log("   - CONTRIBUTING.md updated with new contributor workflows");
  console.log("   - Reviewer load tooling is available to maintain balanced workloads");
  process.exit(0);
} else {
  console.log(`\n❌ ${errors} critical errors found. Please address them before merging.`);
  process.exit(1);
}