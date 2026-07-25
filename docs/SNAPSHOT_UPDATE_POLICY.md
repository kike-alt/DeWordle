# Soroban Contract Snapshot Update Policy

> QA-201 (#798) — Covers: `soroban/contracts/*/test_snapshots/`

## What are snapshots?

The Soroban SDK test harness records contract ledger state after each test into
`.json` files under `soroban/contracts/<contract>/test_snapshots/tests/`. Each
file captures the full environment state — storage entries, events, and ledger
metadata — at the point the test completes.

Snapshots serve two purposes:

1. **Regression detection** — a snapshot mismatch means the contract's on-chain
   behaviour changed. CI catches this automatically on every PR.
2. **Review audit trail** — committed snapshots make contract changes reviewable
   without running Rust locally.

---

## When snapshots must be updated

Update snapshots **only** when one of the following is true:

| Trigger | Example |
|---------|---------|
| Storage key or type changed | Renamed a `DataKey` variant |
| Event topic or payload changed | Added a field to `session_finalized` payload |
| New contract entrypoint added | New `#[contractimpl]` function that writes storage |
| Contract error code changed | Re-numbered a `#[contracterror]` variant |
| Ledger configuration changed in a test | Changed `closes_at` math or `max_attempts` |

**Do NOT update snapshots** to make a failing test green when you do not
understand why it changed. A surprise snapshot diff is a signal to investigate,
not to re-record.

---

## How to update snapshots

### All contracts at once

```bash
cd soroban
make update-snapshots
```

### A single contract

```bash
cd soroban
make update-snapshots CONTRACT=core_game
# other valid values: achievements, rewards, admin_registry
```

Both commands set the `SOROBAN_TEST_SNAPSHOT_UPDATE=1` environment variable,
which causes the Soroban SDK test runner to overwrite existing snapshot files
instead of asserting against them.

---

## Reviewer checklist

When a PR touches snapshot files, reviewers must check **each changed file**:

- [ ] The diff file name matches a test that was intentionally modified.
- [ ] The changed fields (storage keys, event topics, payloads) correspond
      exactly to the contract change described in the PR.
- [ ] No **unrelated** snapshot files changed (snapshot churn from an
      accidental `make update-snapshots` run is a red flag).
- [ ] The updated snapshot is included in the **same commit** as the contract
      source change — not in a follow-up "fix snapshots" commit.
- [ ] The PR description explains *why* the snapshot changed, not just *that*
      it changed.

### Spotting accidental snapshot churn

Accidental churn has these tell-tale signs:

- Many snapshot files changed but the contract source diff is small or absent.
- The `ledger_sequence` or `timestamp` fields changed but nothing else did —
  this usually means a test used a non-deterministic ledger seed.
- Snapshot files for contracts **not mentioned** in the PR description changed.

If you see these patterns, ask the contributor to revert the snapshots and
re-run only the affected contract with `make update-snapshots CONTRACT=<name>`.

---

## CI behaviour

The `cargo test --workspace` job in CI runs **without**
`SOROBAN_TEST_SNAPSHOT_UPDATE`. Any snapshot mismatch causes the job to fail
with a diff printed to the log. This is intentional: snapshot updates must be
explicit, not automatic.

---

## Snapshot file format

Each snapshot file is named `<test_function_name>.<snapshot_index>.json`.
The index starts at `1` and increments for each snapshot taken inside a single
test. Key fields:

```jsonc
{
  "env": {
    "ledger": { "sequence_number": ..., "timestamp": ... },
    "storage": { ... }       // all persistent + temporary storage entries
  },
  "events": [ ... ]          // contract events emitted during the test
}
```

Do not hand-edit snapshot files. Always regenerate them with
`make update-snapshots` to ensure consistency.
