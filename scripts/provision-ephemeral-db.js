#!/usr/bin/env node
"use strict";

const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = process.env.DB_PORT || "5432";
const DB_USER = process.env.DB_USER || process.env.DB_USERNAME || "dewordledb_owner";
const DB_PASSWORD = process.env.DB_PASSWORD || "password";
const DB_NAME = process.env.DB_NAME || "dewordledb";
function getPrefix() {
  return process.env.EPHEMERAL_DB_PREFIX || "test_";
}
const EPHEMERAL_DB_NAME = process.env.EPHEMERAL_DB_NAME || null;
const ACTION = process.env.ACTION || (process.argv[2] || "auto").toLowerCase();

function psql(db, sql) {
  const result = spawnSync("psql", [
    "-h", DB_HOST,
    "-p", DB_PORT,
    "-U", DB_USER,
    "-d", db,
    "-c", sql,
    "--no-psqlrc",
    "-q",
    "-X",
  ], {
    env: { ...process.env, PGPASSWORD: DB_PASSWORD },
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  return result;
}

function generateDbName() {
  const suffix = crypto.randomBytes(4).toString("hex");
  return `${getPrefix()}${suffix}`;
}

function provisionDb() {
  const dbName = EPHEMERAL_DB_NAME || generateDbName();
  console.log(`Provisioning ephemeral database: ${dbName}`);
  const result = psql(DB_NAME, `CREATE DATABASE "${dbName}"`);
  if (result.error || result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    if (stderr.includes("already exists")) {
      console.log(`Database "${dbName}" already exists, reusing`);
    } else {
      console.error(`Failed to create database "${dbName}": ${stderr}`);
      process.exit(1);
    }
  } else {
    console.log(`Created database "${dbName}"`);
  }
  console.log(`EPHEMERAL_DB_NAME=${dbName}`);
  return dbName;
}

function teardownDb(dbName) {
  if (!dbName) {
    console.error("No database name provided for teardown");
    process.exit(1);
  }
  console.log(`Tearing down ephemeral database: ${dbName}`);
  const result = psql(DB_NAME, `DROP DATABASE IF EXISTS "${dbName}"`);
  if (result.error || result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    if (stderr.includes("does not exist")) {
      console.log(`Database "${dbName}" does not exist, nothing to drop`);
      return;
    }
    console.error(`Failed to drop database "${dbName}": ${stderr}`);
    process.exit(1);
  }
  console.log(`Dropped database "${dbName}"`);
}

function main() {
  const dbName = EPHEMERAL_DB_NAME || generateDbName();

  if (ACTION === "provision") {
    provisionDb();
  } else if (ACTION === "teardown") {
    const target = process.argv[3] || EPHEMERAL_DB_NAME;
    if (!target) {
      console.error("teardown requires a database name as second argument or EPHEMERAL_DB_NAME env var");
      process.exit(1);
    }
    teardownDb(target);
  } else if (ACTION === "auto") {
    const created = provisionDb();
    const cmd = process.argv.slice(3).join(" ");
    if (cmd) {
      console.log(`Running command: ${cmd}`);
      const shell = spawnSync("sh", ["-c", cmd], {
        env: { ...process.env, EPHEMERAL_DB_NAME: created, DB_NAME: created },
        encoding: "utf8",
        stdio: "inherit",
      });
      if (shell.status !== 0) {
        teardownDb(created);
        process.exit(shell.status || 1);
      }
    }
    teardownDb(created);
  } else {
    console.error(`Unknown action: ${ACTION}. Use provision, teardown, or auto`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateDbName, provisionDb, teardownDb, psql };
