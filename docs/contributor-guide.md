# DeWordle Contributor Onboarding Guide

Welcome to **DeWordle** — a decentralised, blockchain-based Wordle game on Stellar.

## Repo Structure

```
backend/    NestJS API (NestJS + TypeORM + PostgreSQL)
frontend/   Next.js 14 app (React + Tailwind)
onchain/    Soroban smart contracts (Rust)
shared/     Shared types and utilities
scripts/    Dev tooling (generate.ts, load-tests/)
docs/       Architecture and contributor docs
```

## Prerequisites

| Tool | Min Version |
|---|---|
| Node.js | 20 LTS |
| pnpm | 9 |
| Docker + Compose | latest |
| Rust | stable |
| Stellar CLI | latest |

## Quick Start (with Docker)

```bash
git clone https://github.com/<fork>/DeWordle.git && cd DeWordle
npm install
cp .env.example .env.local
docker compose up -d
curl http://localhost:3001/health && open http://localhost:3000
```

## Quick Start (without Docker)

```bash
# Backend
cd backend && npm install && npm run migration:run && npm run start:dev

# Frontend
cd frontend && npm install && npm run dev

# Onchain (requires Rust + Stellar CLI)
cd onchain && stellar contract build
```

## Key Backend Modules

| Module | Responsibility |
|---|---|
| `auth/` | JWT + Stellar wallet sign-in |
| `game/` | Guess validation, session management |
| `words/` | Word-of-the-day selection |
| `leaderboard/` | Score aggregation |
| `common/cache/` | CDN cache middleware |
| `telemetry/` | OpenTelemetry distributed tracing |

## Development Workflow

1. Create branch: `feat/issue-<number>-short-description`
2. Code and run `npm run lint` + `npm run test`
3. Open PR to `main` with `Closes #<number>` in the body

## Code Generation Schematics

```bash
# Generate a new backend NestJS module
npx ts-node scripts/generate.ts module <name>

# Generate create/update DTOs for an entity
npx ts-node scripts/generate.ts dto <name>
```

## Commit Convention (Conventional Commits — enforced by Husky)

```
feat(game): add hint colour animation
fix(auth): handle expired JWT gracefully
perf(db): add connection pool config
test(qa): add Soroban integration tests
docs(dx): update onboarding guide
```