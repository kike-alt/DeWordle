# Monorepo Test Command Reference

> Resolves #1296

Quick reference for all test commands in the DeWordle monorepo, grouped by surface.

## All Surfaces

| Command | Description |
|---------|-------------|
| `npm run install:all` | Install all dependencies (backend + frontend + shared) |
| `npm run lint` | Lint all surfaces |
| `npm run typecheck` | Typecheck all TypeScript |
| `./scripts/ci-local.sh` | Run local CI equivalent |

## Soroban Contracts

| Command | Description |
|---------|-------------|
| `cd soroban && cargo check --workspace` | Check all contracts compile |
| `cd soroban && cargo test --workspace` | Run all contract unit tests |
| `cd soroban && cargo fmt --all` | Format all Rust code |
| `cd soroban && cargo test -p core_game` | Core game contract tests |
| `cd soroban && cargo test -p rewards` | Rewards contract tests |
| `cd soroban && cargo test -p achievements` | Achievements contract tests |
| `cd soroban && cargo test -p admin_registry` | Admin registry tests |
| `cd soroban && cargo test -p dewordle-types` | Shared types crate tests |
| `cd soroban && cargo test -p dewordle-auth` | Auth crate tests |
| `cd soroban && cargo test -p dewordle-utils` | Utils crate tests |

## Backend (NestJS)

| Command | Description |
|---------|-------------|
| `cd backend && npm run build` | Build backend |
| `cd backend && npm run typecheck` | Typecheck backend |
| `cd backend && npm run lint` | Lint all backend code |
| `cd backend && npm run lint:ci` | Lint indexer only (CI mode) |
| `cd backend && npm run test` | Run all backend tests |
| `cd backend && npm run test:ci` | Run indexer tests (CI mode, no watchman) |
| `cd backend && npm run test:e2e` | Run end-to-end tests |

### Full Backend Verification

```bash
npm run verify:backend
```

## Frontend (Next.js)

| Command | Description |
|---------|-------------|
| `cd frontend && npm run build` | Build frontend |
| `cd frontend && npm run typecheck` | Typecheck frontend |
| `cd frontend && npm run lint` | Lint frontend |
| `cd frontend && npm run test` | Run all frontend tests |
| `cd frontend && npm run test:ci` | Run all tests (CI mode) |
| `cd frontend && npm run test:ci -- src/lib/stellar` | Wallet integration tests only |
| `cd frontend && npm run test:ci -- src/lib/soroban` | Soroban SDK tests only |
| `cd frontend && npx playwright test` | Run Playwright E2E tests |
| `cd frontend && npx playwright test accessibility.spec.ts` | Run accessibility tests |
| `cd frontend && npx playwright test visual-regression.spec.ts` | Run visual regression tests |
| `cd frontend && npx playwright show-report` | Open Playwright HTML report |

### Full Frontend Verification

```bash
npm run verify:frontend
```

## QA / DevOps

| Command | Description |
|---------|-------------|
| `./scripts/ci-local.sh` | Local CI simulation |
| `./scripts/validate-phase3.sh` | Phase 3 validation checks |
| `npm run docs:linkcheck` | Scan markdown for stale links |
| `npm run bootstrap` | Contributor environment bootstrap |

## npm Script Shortcuts (Root)

| Command | Description |
|---------|-------------|
| `npm run soroban:check` | `cargo check --workspace` |
| `npm run soroban:fmt` | `cargo fmt --all` |
| `npm run verify:backend` | Install + build + typecheck + lint + test (backend) |
| `npm run verify:frontend` | Install + lint + typecheck + build + test (frontend) |

## Selecting Test Scope

To run a subset of tests, use the `--` separator:

```bash
# Run tests matching a name pattern
cd backend && npm run test -- --testNamePattern="indexer"
cd frontend && npm run test -- --testNamePattern="wallet"

# Run a specific test file
cd backend && npx jest src/indexer/indexer.service.spec.ts
cd frontend && npx jest src/lib/stellar/wallet-flow.test.ts
```
