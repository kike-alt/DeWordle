#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const VALID_STATUSES = ["healthy", "degraded", "down"];

function validate(payload) {
  const errors = [];

  if (!payload || typeof payload !== "object") {
    return [{ path: "$", message: "Payload must be a non-null object" }];
  }

  if (!payload.generated_at || isNaN(Date.parse(payload.generated_at))) {
    errors.push({ path: "generated_at", message: "Must be a valid ISO 8601 timestamp" });
  }

  if (typeof payload.version !== "string" || !payload.version) {
    errors.push({ path: "version", message: "Must be a non-empty string" });
  }

  if (!payload.producers || typeof payload.producers !== "object") {
    errors.push({ path: "producers", message: "Must be an object" });
    return errors;
  }

  const expectedProducers = ["backend", "indexer", "frontend", "soroban"];
  for (const name of expectedProducers) {
    const producer = payload.producers[name];
    if (!producer || typeof producer !== "object") {
      errors.push({ path: `producers.${name}`, message: "Must be an object" });
      continue;
    }
    if (!VALID_STATUSES.includes(producer.status)) {
      errors.push({
        path: `producers.${name}.status`,
        message: `Must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }
    if (typeof producer.version === "string") {
      const v = producer.version;
      if (!/^\d+\.\d+\.\d+/.test(v)) {
        errors.push({
          path: `producers.${name}.version`,
          message: `"${v}" does not look like semver`,
        });
      }
    }
  }

  const summary = payload.summary || {};
  if (typeof summary.total_services !== "number" || summary.total_services < 0) {
    errors.push({ path: "summary.total_services", message: "Must be a non-negative number" });
  }
  if (typeof summary.healthy !== "number" || summary.healthy < 0) {
    errors.push({ path: "summary.healthy", message: "Must be a non-negative number" });
  }
  if (typeof summary.degraded !== "number" || summary.degraded < 0) {
    errors.push({ path: "summary.degraded", message: "Must be a non-negative number" });
  }
  if (typeof summary.down !== "number" || summary.down < 0) {
    errors.push({ path: "summary.down", message: "Must be a non-negative number" });
  }

  const computedTotal = summary.healthy + summary.degraded + summary.down;
  if (summary.total_services !== undefined && computedTotal !== summary.total_services) {
    errors.push({
      path: "summary",
      message: `healthy + degraded + down (${computedTotal}) != total_services (${summary.total_services})`,
    });
  }

  return errors;
}

function main() {
  const filePath = process.argv[2];
  let payload;

  if (filePath) {
    try {
      payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
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
        payload = JSON.parse(raw);
      } catch (err) {
        console.error(`Error parsing stdin: ${err.message}`);
        process.exit(1);
      }
      run(payload);
    });
    return;
  }

  run(payload);

  function run(pld) {
    const errors = validate(pld);
    if (errors.length === 0) {
      if (!process.env.OUTPUT_JSON) {
        console.log("Payload is valid");
      } else {
        console.log(JSON.stringify({ valid: true, errors: [] }));
      }
      process.exit(0);
    } else {
      if (!process.env.OUTPUT_JSON) {
        console.error("Payload validation errors:");
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

module.exports = { validate };
