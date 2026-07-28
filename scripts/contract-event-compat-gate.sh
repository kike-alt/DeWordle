#!/usr/bin/env bash
# Issue #659: fail CI when contract event surface changes without an
# accompanying schema/SDK update, so breaking event changes can't slip in
# silently.
set -euo pipefail

BASE_REF="${1:-origin/main}"

contracts_changed=$(git diff --name-only "$BASE_REF"...HEAD -- soroban/contracts | wc -l | tr -d ' ')
schema_changed=$(git diff --name-only "$BASE_REF"...HEAD -- soroban/sdk/ts/events.ts shared/events/schemas | wc -l | tr -d ' ')

if [[ "$contracts_changed" -gt 0 && "$schema_changed" -eq 0 ]]; then
  echo "ERROR: soroban/contracts changed ($contracts_changed file(s)) but no matching" >&2
  echo "       update was made to soroban/sdk/ts/events.ts or shared/events/schemas." >&2
  echo "       Update the event schema/SDK or confirm this change doesn't affect" >&2
  echo "       declared event topics/payloads." >&2
  exit 1
fi

echo "Contract event compatibility gate passed ($contracts_changed contract file(s), $schema_changed schema file(s) changed)."
