# Architecture

## Monorepo Structure
- `frontend/`: Next.js application
- `backend/`: NestJS API, auth, game sessions, words pipeline, metrics
- `onchain/`: Cairo/Starknet contracts and tests (current onchain implementation)

## Runtime Flow
1. Frontend renders game and calls backend APIs.
2. Backend handles auth/session logic and word lifecycle.
3. Onchain contracts currently model decentralized game primitives.
4. Metrics and leaderboard modules expose observability and ranking views.

## Backend Modules
- `auth`: signup/login/JWT/password reset
- `game-sessions`: game loop and guess validation
- `dewordle/words`: daily word scheduling/validation/scoring
- `leaderboard`: score aggregation
- `metrics`: operational metrics endpoints

## Data Layer
- PostgreSQL via TypeORM
- Migrations in `backend/src/migrations`
- Seed scripts in `backend/scripts`

## Open Architecture Risks (Current)
- Current contract layer is Starknet/Cairo, not Soroban.
- Backend includes a legacy `TestEntity` and migration duplication that should be cleaned.
- Env configuration is split and still needs stricter schema validation.

See [Stellar migration plan](./STELLAR_MIGRATION.md).

## Deploy Topology

Visual diagrams of how the frontend, backend, indexer, and Soroban
services connect in local, testnet, and production-like environments
are documented in [DEPLOY_TOPOLOGY.md](./DEPLOY_TOPOLOGY.md).
