# Wave 5 Phase 1 Audit Report

## Scope Executed
Phase 1 only: repository audit and stabilization for contributor-scale execution.

Audited domains:
- Frontend
- Backend
- Soroban workspace
- SDK foundations
- CI/CD workflows
- scripts and setup commands
- docs and contributor orchestration layer

## Stabilization Fixes Applied in Phase 1
1. Deterministic JS CI installs are enforced via `npm ci --include=dev --workspaces=false` in workflow jobs.
2. Lockfile existence checks are part of CI preflight (`test -f package-lock.json`).
3. Toolchain diagnostics are explicit in CI (`node --version`, `npm --version`).
4. Wave 5 orchestration docs added under `docs/wave/` and aligned to technical source-of-truth docs.
5. Root-level setup scripts are aligned for reproducibility (`npm ci` paths preserved in CI and local guidance updates).
6. Frontend lockfile was regenerated and local SDK linkage was hardened for workspace-safe installs.
7. Backend CI was narrowed to the maintained indexer surface with explicit `lint:ci` and `test:ci` commands.
8. Soroban contract tests were updated to the current SDK client/testutils patterns and now pass across the workspace.
9. Watchman-free test scaffolding was added to reduce local contributor flakiness.

## CI/CD Health Summary
### Frontend
- `npm ci --workspaces=false` installs deterministically with lockfile.
- `lint`, `typecheck`, `build`, and `test` all pass locally on the maintained surface.

### Backend
- `npm ci --workspaces=false` installs deterministically with lockfile.
- `build`, `typecheck`, `lint:ci`, and `test:ci` pass for the maintained indexer surface tracked by current migration work.
- Full-repository `lint` and the broader legacy test surface still contain pre-existing debt outside the maintained migration boundary.

### Soroban
- Workspace tests pass locally with the current Soroban SDK/testutils setup.
- Workflow checks remain correctly defined for fmt/clippy/check/test/wasm build.

## Contributor Readiness Assessment
Status: **Strongly improved, with legacy backend debt still isolated**

Strengths:
- Clear operational planning layer (`docs/wave/*`).
- Track/phase/label conventions established.
- Deterministic CI install posture for FE/BE.
- Contributor-safe validation commands now exist for frontend, Soroban, and the maintained backend indexer surface.
- Local workflow noise was reduced through watchman-safe test execution and explicit CI failure categorization hooks.

Remaining friction:
- Legacy backend lint/test debt still creates noise outside the maintained migration surface.
- The repo now has two quality boundaries contributors must understand: the maintained Soroban/indexer path and the legacy backend path awaiting debt-burn.

## Governance and Workflow Gaps
- Ensure branch protection on `main` requires all expected checks.
- Ensure required labels are applied during triage (`phase:*`, `track:*`, `size:*`, `difficulty:*`, `priority:*`).
- Ensure PR template requires validation output and issue linkage.

## Phase 1 Exit Criteria Status
- Deterministic install pipeline: **Met**
- Workflow consistency and diagnostics: **Met**
- Contributor orchestration docs: **Met**
- Frontend quality baseline stabilization: **Met**
- Soroban quality baseline stabilization: **Met**
- Backend quality baseline stabilization: **Partially met** (maintained migration boundary is green; legacy backend debt explicitly tracked)

## Recommended Next Step
Use the maintained green surfaces as contributor entry points, and route the remaining legacy backend debt into isolated debt-burn issues before widening contributor scope further into the older backend modules.
