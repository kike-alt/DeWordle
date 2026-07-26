o# Wave Contributor Quickstart

Welcome to the DeWordle Wave 5 contributor program. This page maps you to the right setup, commands, and first tasks based on your track.

## Prerequisites (all tracks)

```bash
# Clone the repo
git clone https://github.com/kike-alt/DeWordle.git
cd DeWordle

# Install all JS dependencies
npm run install:all
```

---

## Track Quickstart Matrix

| Track | Setup | First Validation | First Task |
|-------|-------|-----------------|------------|
| **DEVOPS** | See below | `npm run verify:backend` | Add/improve a CI job in `.github/workflows/ci.yml` |
| **DOCS** | No extra setup | Read `docs/ARCHITECTURE.md` | Improve or add a doc in `docs/` |
| **DX** | See below | `npm run verify:frontend` | Improve contributor ergonomics in `README.md` or `docs/` |
| **QA** | See below | `npm run verify:backend && npm run verify:frontend` | Add a test in `backend/` or `frontend/` |
| **AI/AUTOMATION** | See below | Run `scripts/gen-rc-checklist.sh M5` | Improve or add a script in `scripts/` |

---

## Track Setup Commands

### DEVOPS / DX / QA

```bash
# Frontend
cd frontend && npm ci
npm run lint
npm run typecheck
npm run build

# Backend
cd backend && npm ci
npm run lint
npm run typecheck
npm run test -- --runInBand
```

### AI/AUTOMATION

```bash
# Requires gh CLI authenticated
gh auth status

# Generate a release-candidate checklist
./scripts/gen-rc-checklist.sh M5
```

### Soroban (all tracks touching onchain code)

```bash
cd soroban
cargo check --workspace
```

---

## Validation Shortcuts

```bash
npm run verify:frontend   # lint + typecheck + build
npm run verify:backend    # lint + typecheck + test
```

---

## First: Local Environment Setup
Before running any track-specific commands, follow the complete local sandbox walkthrough to get your environment running:
- **[Local Sandbox Walkthrough: Wallet, Indexer, and Soroban Tests](./LOCAL_SANDBOX_WALKTHROUGH.md)** - End-to-end guide to spin up the full local stack, including wallet sandbox, indexer, and Soroban tests with troubleshooting for common issues.

## Key Architecture Docs

- [Debug Recipe Catalog](./DEBUG_RECIPE_CATALOG.md) - Common issue fixes for wallet, RPC, database, and CI failures
- [Soroban Foundation Architecture](./SOROBAN_FOUNDATION_ARCHITECTURE.md)
- [Backend Indexer Foundation](./BACKEND_INDEXER_FOUNDATION.md)
- [Frontend Wallet Foundation](./FRONTEND_WALLET_FOUNDATION.md)
- [Wave 5 Execution Plan](./wave/WAVE5_EXECUTION_PLAN.md)
- [Wave 5 Issue Tracks](./wave/WAVE5_ISSUE_TRACKS.md)

---

## Finding Your First Issue

1. Go to [Issues](https://github.com/kike-alt/DeWordle/issues)
2. Filter by your track label (e.g. `track:DEVOPS`, `track:DOCS`, `track:DX`, `track:QA`, `track:AI/AUTOMATION`)
3. Pick a `difficulty:beginner` issue
4. Comment to claim it, then open a PR referencing the issue number (`Closes #NNN`)