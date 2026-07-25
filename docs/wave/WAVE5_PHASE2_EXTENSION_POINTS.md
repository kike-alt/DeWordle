# Wave 5 Phase 2 Extension Points

This map defines contributor-safe extension points created in Phase 2.

## Contracts

1. `core_game`
- Extend session lifecycle rules without breaking replay-safe nonce boundaries.
- Add richer guess validation variants while preserving existing event topics.

2. `rewards`
- Add reward policy engines behind current emission/accrual storage model.
- Keep nonce-based replay protection unchanged.

3. `achievements`
- Extend definition criteria and unlock evaluators while keeping unlock event schema stable.

4. `admin_registry`
- Extend role scopes and registry keys without changing admin authorization gate semantics.

## SDK

1. Transaction Builders
- Add specialized builders for new methods while returning `TxBuildResult`.

2. Event Parsing
- Add schema-specific decoders on top of normalized topic routing.

3. Registry
- Add environment/manifest loaders (file/env/http) behind current registry resolver APIs.

## Frontend

1. Wallet + Tx Lifecycle
- Extend `useGameplayTx` with retries, pending queue visualization, and tx polling.

2. Network Safety
- Add explicit network remediation UX from current mismatch signal.

## Backend

1. Ingestion
- Implement Soroban RPC event fetcher feeding `EventNormalizerService`.

2. Projection
- Add additional projections (leaderboard, streak analytics, reward claims) via `ProjectionService`.
- Follow the standardized pattern in [Backend Read-Model Extension Guide](../contributors/backend-read-model-extension.md)

3. Observability
- Add metrics and structured logs around cursor lag, replay skips, and projection latency.

## Contributor Guardrails

- Preserve ADR boundaries in `docs/adr/0001-soroban-foundation-boundaries.md`.
- Keep replay-safe ordering invariant: `ledger -> txHash -> eventIndex`.
- Maintain deterministic transaction assembly and typed interfaces.