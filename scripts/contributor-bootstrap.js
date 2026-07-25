#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("node:child_process");

const REMEDIATION = {
  node: "Install Node.js >= 18 from https://nodejs.org or use nvm: `nvm install 20`",
  npm: "npm ships with Node.js. Reinstall Node.js from https://nodejs.org",
  rustc: "Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`",
  cargo: "Install Rust (includes cargo): `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`",
  docker: "Install Docker Desktop: https://www.docker.com/products/docker-desktop/",
  psql: "Install PostgreSQL: https://www.postgresql.org/download/",
};

// Local development profiles - define which dependencies and services each profile needs
const DEV_PROFILES = {
  "frontend-only": {
    description: "Develop only the frontend application",
    dependencies: ["node", "npm"],
    requiredEnvVars: ["NEXT_PUBLIC_API_URL"],
    services: [],
    installCommand: "npm ci --include=dev --prefix frontend",
    nextSteps: [
      "Copy frontend/.env.example to frontend/.env.local and configure your API URL",
      "Run `npm run dev --prefix frontend` to start the development server",
      "Run `npm run lint --prefix frontend` to check for lint issues",
      "Run `npm run typecheck --prefix frontend` to verify TypeScript types",
    ],
    envFile: "frontend/.env.example",
    targetEnvFile: "frontend/.env.local",
  },
  "indexer-only": {
    description: "Develop only the backend indexer services",
    dependencies: ["node", "npm", "psql"],
    requiredEnvVars: ["DB_HOST", "DB_PORT", "DB_USERNAME", "DB_PASSWORD", "DB_NAME", "SOROBAN_RPC_URL"],
    services: ["postgres"],
    installCommand: "npm ci --include=dev --prefix backend",
    nextSteps: [
      "Copy backend/.env.example to backend/.env and configure your database and RPC settings",
      "Start your PostgreSQL database",
      "Run `npm run start:dev --prefix backend` to start the backend in watch mode",
      "Run `npm run lint --prefix backend` to check for lint issues",
      "Run `npm run typecheck --prefix backend` to verify TypeScript types",
    ],
    envFile: "backend/.env.example",
    targetEnvFile: "backend/.env",
  },
  "soroban-only": {
    description: "Develop only Soroban smart contracts",
    dependencies: ["node", "npm", "rustc", "cargo"],
    requiredEnvVars: ["SOROBAN_RPC_URL", "SOROBAN_NETWORK", "SOROBAN_CORE_GAME_CONTRACT_ID"],
    services: [],
    installCommand: "npm ci --include=dev --prefix soroban/sdk/ts",
    nextSteps: [
      "Configure your Soroban environment variables",
      "Run `npm run typecheck --prefix soroban/sdk/ts` to verify TypeScript types",
      "Run `cargo check --manifest-path soroban/Cargo.toml --workspace` to validate contracts",
      "Run `cargo test --manifest-path soroban/Cargo.toml --workspace` to run contract tests",
    ],
    envFile: "backend/.env.example",
    targetEnvFile: "soroban/.env",
  },
  "full-stack": {
    description: "Develop the entire stack (frontend, backend, and Soroban)",
    dependencies: ["node", "npm", "rustc", "cargo", "docker", "psql"],
    requiredEnvVars: ["*"], // Requires all environment variables
    services: ["postgres", "redis", "all"],
    installCommand: "npm run install:all",
    nextSteps: [
      "Copy backend/.env.example to backend/.env and configure all variables",
      "Copy frontend/.env.example to frontend/.env.local and configure your API URL",
      "Start Docker and run `docker-compose up -d` in the backend directory",
      "Run `npm run start:dev --prefix backend` to start the backend",
      "Run `npm run dev --prefix frontend` to start the frontend development server",
    ],
    envFile: null, // Uses both env files
    targetEnvFile: null,
  },
};

function checkCommand(command, args = ["--version"]) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  const ok = !result.error && result.status === 0;
  return {
    command,
    ok,
    output: (result.stdout || result.stderr || "").trim(),
    ...(ok ? {} : { remediation: REMEDIATION[command] ?? `Install \`${command}\` and ensure it is on your PATH` }),
  };
}

function getProfileNextSteps(profile) {
  return DEV_PROFILES[profile].nextSteps;
}

function getProfileDependencies(profile) {
  return DEV_PROFILES[profile].dependencies.map(checkCommand);
}

function copyEnvExampleIfMissing(sourcePath, targetPath) {
  if (!fs.existsSync(targetPath) && fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath);
    return { copied: true, source: sourcePath, target: targetPath };
  }
  return { copied: false, exists: fs.existsSync(targetPath) };
}

function runBootstrap(profile = "full-stack") {
  if (!DEV_PROFILES[profile]) {
    return {
      ok: false,
      error: `Unknown profile: ${profile}. Available profiles: ${Object.keys(DEV_PROFILES).join(", ")}`,
      availableProfiles: Object.keys(DEV_PROFILES),
    };
  }

  const profileConfig = DEV_PROFILES[profile];
  const checks = getProfileDependencies(profile);
  const failures = checks.filter((check) => !check.ok);

  // Attempt to copy .env file if it doesn't exist
  let envCopyResult = null;
  if (profileConfig.envFile && profileConfig.targetEnvFile) {
    const fullSource = path.join(process.cwd(), profileConfig.envFile);
    const fullTarget = path.join(process.cwd(), profileConfig.targetEnvFile);
    envCopyResult = copyEnvExampleIfMissing(fullSource, fullTarget);
  }

  const result = {
    ok: failures.length === 0,
    profile,
    description: profileConfig.description,
    checks,
    nextSteps: getProfileNextSteps(profile),
    failures: failures.map((check) => check.command),
    envCopyResult,
    requiredEnvVars: profileConfig.requiredEnvVars,
  };

  return result;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const profile = args.find(arg => !arg.startsWith("--")) || "full-stack";
  const json = args.includes("--json");
  const help = args.includes("--help") || args.includes("-h");

  if (help) {
    console.log("Usage: node scripts/contributor-bootstrap.js [profile] [options]");
    console.log("");
    console.log("Available profiles:");
    for (const [key, config] of Object.entries(DEV_PROFILES)) {
      console.log(`  ${key.padEnd(15)} ${config.description}`);
    }
    console.log("");
    console.log("Options:");
    console.log("  --json, -j      Output results as JSON");
    console.log("  --help, -h      Show this help message");
    process.exit(0);
  }

  const result = runBootstrap(profile);

  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    console.log("Contributor bootstrap diagnostics");
    console.log("");
    
    if (result.error) {
      console.log(`❌ ${result.error}`);
      process.exit(1);
    }

    console.log(`📋 Profile: ${result.profile} - ${result.description}`);
    console.log("");
    console.log("Dependencies:");
    for (const check of result.checks) {
      console.log(`${check.ok ? "✓" : "✗"} ${check.command}${check.output ? ` (${check.output})` : ""}`);
      if (!check.ok) console.log(`  → ${check.remediation}`);
    }
    console.log("");
    
    if (result.envCopyResult && result.envCopyResult.copied) {
      console.log(`📄 Copied environment example: ${result.envCopyResult.source} → ${result.envCopyResult.target}`);
    } else if (result.envCopyResult && !result.envCopyResult.exists) {
      console.log(`⚠️ Environment file not found and could not copy example`);
    }
    console.log("");

    console.log("Next steps to get started:");
    for (const step of result.nextSteps) {
      console.log(`- ${step}`);
    }
  }

  process.exit(result.ok ? 0 : 1);
}

module.exports = { checkCommand, runBootstrap, DEV_PROFILES, copyEnvExampleIfMissing, getProfileDependencies };