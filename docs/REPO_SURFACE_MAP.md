# Repository Surface Map: Maintained vs. Legacy Codebases

This is the single source of truth for identifying which code paths are canonical, transitional, or legacy in DeWordle. As we complete our Soroban migration, this document will be updated to reflect the current state of all major code surfaces.

## Surface Status Definitions
| Status | Description |
|--------|-------------|
| **Maintained (Canonical)** | Primary development target, actively receiving feature updates, security patches, and full test coverage. All new development should target these surfaces. |
| **Transitional** | Still in active use during migration, but scheduled to be replaced by maintained Soroban-native surfaces. Only critical bug fixes are accepted here. |
| **Legacy** | No longer actively developed. Retained for reference only. No new code should be added to these surfaces. |

---

## Complete Surface Map

### 1. Smart Contract Layer
| Surface | Path | Status | Description | Migration Target |
|---------|------|--------|-------------|------------------|
| Soroban Contracts | `/soroban/contracts/` | ✅ **Maintained** | Canonical Rust smart contracts for all core game logic, admin controls, and on-chain state management. This is the primary development target for all on-chain functionality. | - |
| Soroban Shared Crates | `/soroban/crates/` | ✅ **Maintained** | Reusable Rust libraries for contract utilities, testing helpers, and common data structures used across all Soroban contracts. | - |
| Legacy Cairo/Starknet Contracts | `/onchain/` | ❌ **Legacy** | Original Starknet contracts, retained only for historical reference. No longer maintained or deployed. | Soroban contract suite |

### 2. SDK & Client Libraries
| Surface | Path | Status | Description | Migration Target |
|---------|------|--------|-------------|------------------|
| Soroban TypeScript SDK | `/soroban/sdk/ts/` | ✅ **Maintained** | Canonical TypeScript SDK for interacting with all DeWordle Soroban contracts. Includes type definitions, transaction builders, and event parsers. | - |
| Legacy Starknet SDK | `/src/lib/starknet/` (if present) | ❌ **Legacy** | Original SDK for interacting with the deprecated Cairo contracts. | Soroban TypeScript SDK |

### 3. Backend Layer
| Surface | Path | Status | Description | Migration Target |
|---------|------|--------|-------------|------------------|
| Indexer & Projections | `/backend/src/indexer/` | ✅ **Maintained** | Canonical backend service that ingests, normalizes, and persists Soroban contract events. Handles event ordering, replay protection, and maintains real-time projections for frontend consumption. This is the primary active backend development target. | - |
| Core Game Engine | `/backend/src/dewordle/wordle.engine.ts` | ⚠️ **Transitional** | Original word validation and game logic implementation. Will be replaced by on-chain Soroban game logic as migration completes. Only critical bug fixes are accepted. | Soroban core game contract |
| Legacy Game Management | `/backend/src/games/` | ⚠️ **Transitional** | Traditional backend game session and lifecycle management. Gradually being replaced by Soroban's on-chain session tracking. | Soroban CoreGameClient + indexer projections |
| Legacy Auth System | `/backend/src/auth/` | ⚠️ **Transitional** | Traditional email/password authentication system. Will be phased out in favor of Soroban-native wallet-based authentication. | Freighter wallet integration + Soroban identity primitives |
| All Other Backend Modules | `/backend/src/*` (excluding indexer) | ⚠️ **Transitional** | All remaining backend services (user management, leaderboards, etc.) are in transition. They will be gradually replaced by Soroban-native implementations and indexer projections. | Soroban contracts + indexer projections |

### 4. Frontend Layer
| Surface | Path | Status | Description | Migration Target |
|---------|------|--------|-------------|------------------|
| Stellar Wallet Integration | `/frontend/src/lib/stellar/` | ✅ **Maintained** | Canonical wallet integration for Freighter and other Stellar-compatible wallets. Handles transaction signing, contract interactions, and network management. | - |
| Soroban Frontend SDK Integration | `/frontend/src/lib/soroban/` | ✅ **Maintained** | Frontend wrapper for the Soroban TypeScript SDK, providing typed access to all contract methods and event subscriptions. | - |
| Legacy Game UI Components | `/frontend/src/components/game/` | ⚠️ **Transitional** | Traditional game UI components that interact with the legacy backend APIs. Gradually being updated to use the Soroban SDK and indexer data. | Soroban-native UI components |
| Legacy Authentication UI | `/frontend/src/components/auth/` | ⚠️ **Transitional** | Email/password login and registration UI. Will be replaced by wallet connection UI. | Wallet connect UI |
| All Other Legacy Frontend Code | `/frontend/src/*` (excluding stellar, soroban directories) | ⚠️ **Transitional** | All remaining frontend code is in transition as we move to a fully Soroban-native application. | Modern, Soroban-integrated implementation |

---

## Deprecation Timeline & Roadmap
| Surface | Current Status | Target Completion |
|---------|----------------|-------------------|
| Legacy backend APIs (games, words, auth) | Transitional | Wave 6 |
| Indexer feature completeness | Maintained (in development) | Wave 6 |
| All Soroban core contracts deployed | In progress | Wave 7 |
| Full frontend migration to Soroban | In progress | Wave 8 |
| Legacy code removal (onchain, old backend modules) | Scheduled | Post Wave 8 |

## Contributor Validation Commands
To ensure you're working within the maintained surfaces and running only current validation scripts, use these commands:

### Maintained Surfaces (Always Passing)
```bash
# Soroban contracts and crates
cd soroban && cargo check --workspace && cargo test --workspace

# Backend indexer (only run validation on maintained indexer surface)
cd backend && npm run lint:ci && npm run test:ci -- src/indexer/

# Frontend wallet and Soroban integration
cd frontend && npm run lint:ci && npm run test:ci -- src/lib/stellar src/lib/soroban
```

### Transitional Surfaces (May Have Technical Debt)
These surfaces still work but are not actively developed beyond critical fixes:
```bash
# Traditional backend development (only if working on transitional code)
cd backend && npm run start:dev

# Traditional frontend development (only if working on transitional code)
cd frontend && npm run dev
```

### Legacy Surfaces (No Longer Supported)
The legacy `/onchain/` directory contains outdated code and is no longer built or tested in our CI pipeline. Do not use these commands for active development:
```bash
# LEGACY - DO NOT USE
cd onchain && starknet-compile ...  # This will fail in modern environments
```

## Endpoint Deprecation Status
For a detailed list of individual API endpoints and their status, see the [backend deprecation map](../backend/src/common/deprecation-map.ts).

## Related Documentation
- [Soroban Migration Plan](./STELLAR_MIGRATION.md) - Complete migration roadmap
- [Indexer Architecture](./BACKEND_INDEXER_FOUNDATION.md) - Architecture documentation for the maintained backend indexer
- [Frontend Wallet Foundation](./FRONTEND_WALLET_FOUNDATION.md) - Documentation for the maintained wallet integration
- [Soroban SDK Guide](./SOROBAN_SDK_GUIDE.md) - Complete guide to using the maintained Soroban SDK
- [Wave 5 Execution Plan](./wave/WAVE5_EXECUTION_PLAN.md) - Current development wave details