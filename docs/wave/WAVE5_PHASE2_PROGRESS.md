# Wave 5 Phase 2 Progress (Soroban Migration Expansion)

This document tracks implementation completed during Phase 2 and points contributors to the existing technical source documents.

## Scope Alignment

Phase 2 execution follows:
- `docs/wave/WAVE5_EXECUTION_PLAN.md`
- `docs/wave/WAVE5_PHASES.md`
- `docs/wave/WAVE5_ISSUE_TRACKS.md`

Technical boundaries remain aligned with:
- `docs/SOROBAN_FOUNDATION_ARCHITECTURE.md`
- `docs/adr/0001-soroban-foundation-boundaries.md`
- `docs/SECURITY_FOUNDATION.md`

## Completed Expansion Areas

1. Contracts
- Expanded `core_game` with pause guard and replay helper (`is_nonce_used`) as stable extension points.
- Expanded `rewards`, `achievements`, `admin_registry` with typed error surfaces, event schemas, nonce/replay primitives, and role/registry scaffolding.

2. SDK
- Added `rewards-client`, `achievements-client`, `admin-registry-client`.
- Added registry resolution helpers and stronger event normalization utilities.
- Added typed transaction build result contract (`TxBuildResult`) for reusable client integrations.

3. Frontend Wallet + Gameplay Foundations
- Added reusable gameplay transaction orchestration primitives:
  - `useGameplayTx`
  - lifecycle reconciliation (`gameplay-flow.ts`)
- Added architecture for optimistic vs confirmed transaction state handling and network mismatch checks.

4. Backend Indexer Expansion
- Added event normalization service and deterministic event ordering utility.
- Expanded cursor schema with event index checkpointing.
- Expanded indexer service flow to checkpoint after replay-safe ingestion.
- Added bounded queue rejection guards and replay alert snapshots for burst visibility.

5. Testing Foundations
- Added contract-level smoke test scaffolding in `core_game`.
- Added backend indexer unit tests for normalization and cursor ordering invariants.
- Added queue rejection and replay alert coverage for indexer hardening.

6. DevOps and Security Policy
- Added workflow secret-scope policy checks for CI workflow maintenance.
- Documented the pre-testnet hardening checklist in `docs/SECURITY_FOUNDATION.md`.

## Out of Scope (Intentionally Deferred)

- Full tokenomics implementation
- Tournament mechanics
- Production analytics dashboards
- Full indexer ingestion from Soroban RPC

These remain planned for later phases and issue tracks.
