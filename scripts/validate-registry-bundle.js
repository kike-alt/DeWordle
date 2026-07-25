#!/usr/bin/env node
"use strict";

const fs = require("node:fs");

const VALID_NETWORKS = ["testnet", "mainnet", "local"];
const REQUIRED_CONTRACTS = ["admin_registry", "core_game", "rewards", "achievements"];

function validate(bundle) {
  const errors = [];

  if (!bundle || typeof bundle !== "object") {
    return [{ path: "$", message: "Bundle must be a non-null object" }];
  }

  if (!bundle.network || typeof bundle.network !== "string") {
    errors.push({ path: "network", message: "Must be a non-empty string" });
  } else if (!VALID_NETWORKS.includes(bundle.network)) {
    errors.push({
      path: "network",
      message: `Must be one of: ${VALID_NETWORKS.join(", ")}`,
    });
  }

  if (bundle.rpcUrl !== undefined && typeof bundle.rpcUrl !== "string") {
    errors.push({ path: "rpcUrl", message: "Must be a string" });
  }

  if (bundle.passphrase !== undefined && typeof bundle.passphrase !== "string") {
    errors.push({ path: "passphrase", message: "Must be a string" });
  }

  if (!bundle.contracts || typeof bundle.contracts !== "object") {
    errors.push({ path: "contracts", message: "Must be an object" });
    return errors;
  }

  for (const key of REQUIRED_CONTRACTS) {
    if (!bundle.contracts[key] || typeof bundle.contracts[key] !== "string") {
      errors.push({
        path: `contracts.${key}`,
        message: "Must be a non-empty string (contract ID)",
      });
    }
  }

  const unknownKeys = Object.keys(bundle.contracts).filter(
    (k) => !REQUIRED_CONTRACTS.includes(k),
  );
  if (unknownKeys.length > 0) {
    errors.push({
      path: "contracts",
      message: `Unexpected contract keys: ${unknownKeys.join(", ")}`,
    });
  }

  return errors;
}

function main() {
  const filePath = process.argv[2];
  let bundle;

  if (filePath) {
    try {
      bundle = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (err) {
      console.error(`Error reading "${filePath}": ${err.message}`);
      process.exit(1);
    }
  } else {
    let raw = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (raw += chunk));
    process.stdin.on("end", () => {
      try {
        bundle = JSON.parse(raw);
      } catch (err) {
        console.error(`Error parsing stdin: ${err.message}`);
        process.exit(1);
      }
      run(bundle);
    });
    return;
  }

  run(bundle);

  function run(bndl) {
    const errors = validate(bndl);
    if (errors.length === 0) {
      if (!process.env.OUTPUT_JSON) {
        console.log("Bundle is valid");
      } else {
        console.log(JSON.stringify({ valid: true, errors: [] }));
      }
      process.exit(0);
    } else {
      if (!process.env.OUTPUT_JSON) {
        console.error("Bundle validation errors:");
        for (const err of errors) {
          console.error(`  - ${err.path}: ${err.message}`);
        }
      } else {
        console.log(JSON.stringify({ valid: false, errors }, null, 2));
      }
      process.exit(1);
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { validate, VALID_NETWORKS, REQUIRED_CONTRACTS };
