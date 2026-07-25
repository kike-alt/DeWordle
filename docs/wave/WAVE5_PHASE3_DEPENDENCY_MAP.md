# Wave 5 Phase 3 — Dependency Map

> **Living document.** Maintainers update this map when issues are opened,
> closed, or re-scoped. Last updated: 2026-05-27.

This map lets contributors self-select unblocked tasks and avoid duplicate
effort. It covers active Wave 5 Phase 3 issues across all tracks.

---

## How to Read This Map

- **Unblocked** — ready to pick up now.
- **Blocked by #N** — cannot start until issue #N is merged/closed.
- **In progress** — already claimed; check the issue for the assignee.
- **Closed** — merged; listed for dependency-chain completeness.

---

## Dependency Graph

```
#577 (SC - core_game session finalization)
  └─► #583 (SDK - session event parsing)
        └─► #593 (BE - indexer projection for sessions)
              └─► #606 (DX - this dependency map) ✓ unblocked after #577,#583,#593

#605 (DX - phase3 validation script)          ← UNBLOCKED
#607 (DEVOPS - CI preflight diagnostics)      ← UNBLOCKED
#608 (DEVOPS - failure categorization)
  └─► blocked by #607
```

---

## Issue Table

| Issue | Track | Title | Status | Blocked By | Assignee |
|-------|-------|-------|--------|------------|----------|
| [#577](../../issues/577) | SC | Add session-finalization invariant tests | Open | — | — |
| [#583](../../issues/583) | SDK | Add session event parsing helpers | Open | #577 | — |
| [#593](../../issues/593) | BE | Add indexer projection for session events | Open | #583 | — |
| [#605](../../issues/605) | DX | Add phase3 one-command validation script | Open | — | NteinPrecious |
| [#606](../../issues/606) | DX | Add dependency map page (this file) | Open | #577, #583, #593 | NteinPrecious |
| [#607](../../issues/607) | DEVOPS | Add CI preflight environment diagnostics | Open | — | NteinPrecious |
| [#608](../../issues/608) | DEVOPS | Implement workflow failure categorization | Open | #607 | NteinPrecious |

---

## Unblocked Issues (pick up now)

- **#577** — SC track, no dependencies.
- **#605** — DX track, no dependencies. *(in progress)*
- **#607** — DEVOPS track, no dependencies. *(in progress)*

---

## Blocked Issues

| Issue | Waiting On | Notes |
|-------|-----------|-------|
| #583 | #577 | SDK event parsing needs finalized session contract interface |
| #593 | #583 | Indexer projection depends on stable SDK event types |
| #606 | #577, #583, #593 | Map accuracy requires upstream issues to be resolved |
| #608 | #607 | Failure categorization builds on preflight step output |

---

## Maintainer Update Workflow

1. When an issue is **opened**: add a row to the Issue Table and update the
   dependency graph if it has blockers.
2. When an issue is **closed/merged**: mark it `Closed` in the table and
   unblock any downstream issues.
3. When scope changes: update the `Blocked By` column and re-check the graph.
4. Commit the updated map in the same PR that closes the issue.

---

## Related Docs

- [Wave 5 Phases](./WAVE5_PHASES.md)
- [Wave 5 Issue Tracks](./WAVE5_ISSUE_TRACKS.md)
- [Wave 5 Execution Plan](./WAVE5_EXECUTION_PLAN.md)
- [Development Guide](../DEVELOPMENT.md)
