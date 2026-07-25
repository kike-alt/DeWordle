#!/usr/bin/env node
"use strict";

const fs = require("node:fs");

function normalizeFixture(input) {
  const events = Array.isArray(input?.events) ? input.events : [];
  const normalized = events
    .map((event, index) => ({
      index,
      topic: String(event.topic ?? ""),
      ledger: Number(event.ledger ?? 0),
      txHash: String(event.txHash ?? ""),
      eventIndex: Number(event.eventIndex ?? index),
    }))
    .sort((a, b) =>
      a.ledger - b.ledger ||
      a.txHash.localeCompare(b.txHash) ||
      a.eventIndex - b.eventIndex,
    );

  return {
    total: normalized.length,
    normalized,
  };
}

function runFixtureSandbox(path) {
  const raw = JSON.parse(fs.readFileSync(path, "utf8"));
  return normalizeFixture(raw);
}

if (require.main === module) {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: fixture-sandbox <fixture.json>");
    process.exit(1);
  }

  const result = runFixtureSandbox(path);
  console.log(JSON.stringify(result, null, 2));
}

module.exports = { normalizeFixture, runFixtureSandbox };
