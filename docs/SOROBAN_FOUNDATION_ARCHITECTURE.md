# Soroban Foundation Architecture

> This document describes the high-level architecture of the DeWordle Soroban migration foundation.
> For the surface ownership map see [REPO_SURFACE_MAP.md](./REPO_SURFACE_MAP.md).

## Overview

DeWordle is migrating from a traditional backend-driven architecture to a
**Soroban-native** design where core game logic, rewards, and identity are
managed on-chain via Soroban smart contracts on the Stellar network.

## Contract Suite (`soroban/contracts/`)

| Contract | Path | Responsibility |
|----------|------|----------------|
| `core_game` | `soroban/contracts/core_game/` | Session creation, guess submission, nonce replay protection, pause/unpause |
| `rewards` | `soroban/contracts/rewards/` | Point accrual, emission config, and reward claims |
| `achievements` | `soroban/contracts/achievements/` | Achievement definitions and unlock tracking |
| `admin_registry` | `soroban/contracts/admin_registry/` | Role management and cross-contract address registry |

## Shared Crates (`soroban/crates/`)

| Crate | Responsibility |
|-------|----------------|
| `dewordle-types` | Shared data types used across all contracts |
| `dewordle-auth` | Authorization helpers and admin guard primitives |
| `dewordle-utils` | General utility functions |

## TypeScript SDK (`soroban/sdk/ts/`)

Provides typed, ergonomic wrappers around each contract's invoke interface.
Consumed by the frontend (`@dewordle/soroban-sdk`).

## Backend Indexer (`backend/src/indexer/`)

Listens to Soroban contract events via RPC, normalises them, stores
projections in PostgreSQL, and exposes read models to the frontend via REST.

See [BACKEND_INDEXER_FOUNDATION.md](./BACKEND_INDEXER_FOUNDATION.md) for full details.

## Frontend Wallet Integration (`frontend/src/lib/stellar/`)

Handles Freighter / Stellar Wallets Kit connection, transaction signing,
and network switching.

See [FRONTEND_WALLET_FOUNDATION.md](./FRONTEND_WALLET_FOUNDATION.md) for full details.

## Further Reading

- [Repository Surface Map](./REPO_SURFACE_MAP.md) — canonical vs. legacy surfaces
- [Backend Indexer Foundation](./BACKEND_INDEXER_FOUNDATION.md)
- [Frontend Wallet Foundation](./FRONTEND_WALLET_FOUNDATION.md)
- [Soroban Local Dev](./SOROBAN_LOCAL_DEV.md)
- [Wave 5 Execution Plan](./wave/WAVE5_EXECUTION_PLAN.md)
