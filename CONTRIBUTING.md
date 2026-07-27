# Contributing to DeWordle

Thanks for contributing to the Soroban migration.

## 📋 Critical First Step: Review the Repository Surface Map
Before starting any work, **all contributors must review the [Repository Surface Map](./docs/REPO_SURFACE_MAP.md)** which defines our canonical maintained surfaces, transitional codebases, and legacy code. This single source of truth will guide you to the correct code paths for your contributions.

## Workstream Model
Contributors are encouraged to work in parallel across our **maintained canonical surfaces**:
- Soroban contracts (`soroban/contracts`)
- Shared crates (`soroban/crates`)
- SDK (`soroban/sdk/ts`)
- Frontend wallet integration (`frontend/src/lib/stellar`)
- Backend indexer (`backend/src/indexer`)
- Documentation and testing (`docs/`, `soroban/tests`)
- CI/CD & infrastructure (`/.github/workflows/`, `/scripts/`)

## Setup & Validation Commands
Use the appropriate validation commands for your surface to ensure you're running the correct tests:

### Maintained Surfaces (Always Passing in CI)
```bash
# Install all dependencies
npm run install:all

# Soroban contracts and crates
cd soroban && cargo check --workspace && cargo test --workspace

# Backend indexer (maintained backend surface)
cd backend && npm run lint:ci && npm run test:ci -- src/indexer/

# Frontend wallet and Soroban integration
cd frontend && npm run lint:ci && npm run test:ci -- src/lib/stellar src/lib/soroban

# Documentation and script validation
node scripts/contributor-bootstrap.test.js
```

### Transitional Surfaces (Critical Fixes Only)
```bash
# Only use if you're working on critical bug fixes for transitional code
cd backend && npm run start:dev  # Legacy backend development
cd frontend && npm run dev       # Legacy frontend development
```

### Legacy Surfaces (DO NOT USE)
The `/onchain/` directory contains outdated legacy code and is no longer maintained. PRs targeting these surfaces will be automatically redirected.

## PR Requirements
- Keep scope narrow and issue-linked.
- Identify the correct track in your PR description using the ownership map
- Assign yourself as the PR author and request review from the primary track maintainers
- Add docs for new architecture or APIs in the `/docs/` directory
- Include tests where behavior changes - all PRs must pass CI
- Follow the PR template and complete the checklist

## Wave Readiness
Use `docs/WAVE_MIGRATION_ISSUE_CANDIDATES.md` and `docs/SOROBAN_GITHUB_STRATEGY.md` for issue slicing and labels.

## Issue Handoff
If you need to hand off partially completed work, use the [Issue Handoff Checklist](./.github/ISSUE_TEMPLATE/handoff_checklist.yml) template and follow the [Handoff Process](./docs/wave/HANDOFF_CHECKLIST.md).