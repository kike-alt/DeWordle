# DeWordle

[![Maintained Frontend](https://github.com/devOnyx-01/DeWordle/actions/workflows/maintained-frontend.yml/badge.svg)](https://github.com/devOnyx-01/DeWordle/actions/workflows/maintained-frontend.yml)
[![Maintained Backend](https://github.com/devOnyx-01/DeWordle/actions/workflows/maintained-backend.yml/badge.svg)](https://github.com/devOnyx-01/DeWordle/actions/workflows/maintained-backend.yml)
[![Maintained Soroban Validation](https://github.com/devOnyx-01/DeWordle/actions/workflows/maintained-soroban.yml/badge.svg)](https://github.com/devOnyx-01/DeWordle/actions/workflows/maintained-soroban.yml)

DeWordle is an open-source word game platform migrating to a Soroban-native architecture in the Stellar ecosystem.

## Maintained Surface Status
Maintainers and contributors can monitor the health of each maintained surface using the status badges above, which represent the following validation gates:
- **Frontend Status**: Tracks the [maintained-frontend.yml](.github/workflows/maintained-frontend.yml) workflow. This workflow installs dependencies, runs linters, compiles TypeScript types, builds the production Next.js bundle, and executes the unit/integration test suite.
- **Backend Status**: Tracks the [maintained-backend.yml](.github/workflows/maintained-backend.yml) workflow. This workflow runs NestJS builds, typechecking, lints, and the full backend unit test suite.
- **Soroban Validation Status**: Tracks the [maintained-soroban.yml](.github/workflows/maintained-soroban.yml) workflow. This workflow validates the Rust Soroban smart contract workspace using `cargo check`.

## Foundation Status
This repository now includes a **Soroban Migration Foundation** baseline:
- Soroban Rust workspace and modular contracts
- TypeScript Soroban SDK scaffolding
- Frontend wallet/provider architecture (Freighter + Wallet Kit)
- Backend indexer/projection scaffolding
- CI workflows and contributor documentation for Wave-scale contribution

## Repository Layout
- `frontend/` - Next.js app
- `backend/` - NestJS API and indexer foundation
- `onchain/` - legacy Cairo contracts (reference)
- `soroban/` - new Soroban workspace (migration target)
- `docs/` - migration architecture and contributor guides

## Quick Start
### Install JS dependencies
```bash
npm run install:all
```

### Validation Shortcuts
```bash
npm run verify:frontend
npm run verify:backend
```

### Frontend
```bash
npm run dev --prefix frontend
```

### Backend
```bash
npm run start:dev --prefix backend
```

### Soroban workspace
```bash
cd soroban
cargo check --workspace
```

## Key Docs
- **[Repository Surface Map](./docs/REPO_SURFACE_MAP.md)** - START HERE: Understand which code paths are maintained, transitional, or legacy
- [Soroban Foundation Architecture](./docs/SOROBAN_FOUNDATION_ARCHITECTURE.md)
- [Soroban Local Development](./docs/SOROBAN_LOCAL_DEV.md)
- [Frontend Wallet Foundation](./docs/FRONTEND_WALLET_FOUNDATION.md)
- [Backend Indexer Foundation](./docs/BACKEND_INDEXER_FOUNDATION.md)
- [Wave Issue Candidates](./docs/WAVE_MIGRATION_ISSUE_CANDIDATES.md)
- [Wave 5 Execution Plan](./docs/wave/WAVE5_EXECUTION_PLAN.md)
- [Wave 5 Phases](./docs/wave/WAVE5_PHASES.md)
- [Wave 5 Issue Tracks](./docs/wave/WAVE5_ISSUE_TRACKS.md)

## License
[MIT](./LICENSE)