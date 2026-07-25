#!/usr/bin/env node
"use strict";

function buildChecklistComment(prBody) {
  const body = String(prBody ?? "");
  const hasIssueLink = /(?:close[sd]?|fixe[sd]?|resolve[sd]?)\s+#\d+/i.test(body);
  const hasValidation = /(?:npm|pnpm|yarn|cargo|jest|vitest|tsc|pytest|go test|make)\b/i.test(body);
  const missing = [];
  if (!hasIssueLink) missing.push("an issue link");
  if (!hasValidation) missing.push("a validation command");

  if (missing.length === 0) {
    return null;
  }

  return [
    "Please add:",
    ...missing.map((item) => `- ${item}`),
    "",
    "This PR checklist helper expects a closing reference and at least one validation command/output.",
  ].join("\n");
}

if (require.main === module) {
  const body = process.argv.slice(2).join(" ");
  const comment = buildChecklistComment(body);
  if (comment) {
    console.log(comment);
    process.exit(1);
  }
  console.log("PR body has the required linkage and validation hints.");
}

module.exports = { buildChecklistComment };
