# Contributor guides: local dev with mock Soroban RPC, E2E tests, and word-commitment threat model

## 1. Local development with a mock Soroban RPC (#1712)
1. Start a mock JSON-RPC server (for example a small Express app) that answers `getHealth`, `getLatestLedger`, `simulateTransaction`, `sendTransaction` and `getTransaction` with canned fixtures.
2. Point the app at it via the RPC URL environment variable (for example `SOROBAN_RPC_URL=http://localhost:8001`) in `backend/.env` and `frontend/.env.local`.
3. Run backend and frontend normally; every chain call now hits the mock, so no network or funded account is needed.
4. Keep fixtures deterministic (fixed ledger numbers, hashes) so tests are repeatable.

## 2. Writing and running Playwright E2E tests (#1714)
- Place specs in `frontend/e2e/*.spec.ts`; name them after the user flow (`winning-game.spec.ts`).
- Prefer role/text locators (`getByRole`, `getByTestId`) over CSS selectors.
- Mock network and RPC with `page.route()` so tests never depend on live services.
- Run: `npx playwright test` (add `--ui` to debug, `--headed` to watch). Traces are kept on first retry.
- Each test must be independent: no shared state, fresh browser context per test.

## 3. Threat model: on-chain word commitments (#1713)
| Threat | Impact | Mitigation |
|---|---|---|
| Answer leaked before reveal | Players cheat | Publish only a salted hash commitment; keep word and salt off-chain until reveal |
| Rainbow-table of dictionary words | Commitment reversed | Per-day random salt of at least 128 bits |
| Admin swaps the word after commitment | Unfair puzzle | Reveal must hash to the stored commitment; mismatch rejects |
| Early or replayed reveal | Spoilers, stale results | Reveal only after the day window; day id bound into the hash |
| Compromised admin key | Malicious commitments | Multisig / admin registry auth, key rotation, event emission on every change |
| Front-running guesses | Unfair rewards | Bind session nonce and player address to each guess |
