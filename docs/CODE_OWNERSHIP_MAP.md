# Code Ownership & Reviewer Map
*Last updated: Wave 5*

This document defines the module ownership structure for DeWordle's maintained surfaces. It establishes clear primary ownership and fallback reviewer assignments to improve contributor routing and balance reviewer load.

## 🎯 Ownership Model
All surfaces follow a dual-ownership model:
- **Primary Maintainers**: Track-specific engineers responsible for day-to-day development, architecture decisions, and code review. They are the first reviewers for all PRs targeting their surface.
- **Fallback Reviewers**: Secondary maintainers who can review changes when the primary team is at capacity. They have deep context in the domain and can provide qualified reviews.

This model ensures:
- Clear accountability for each code surface
- Balanced reviewer load (tracked via `scripts/reviewer-load-heatmap.js`)
- No single point of failure for code reviews
- Smooth onboarding of new contributors

---

## 📋 Maintained Surface Ownership Matrix

### 1. Soroban Smart Contract Layer
**Status: ✅ Maintained (Canonical)** - Primary development target for all on-chain functionality.

| Surface | Path | Primary Track | Primary Maintainers | Fallback Track | Fallback Maintainers | Review SLA |
|---------|------|---------------|---------------------|----------------|----------------------|------------|
| Core Contracts | `/soroban/contracts/` | Soroban Core | @soroban-maintainers | Infrastructure | @infra-maintainers | 48 hours |
| Shared Crates | `/soroban/crates/` | Soroban Core | @soroban-maintainers | Infrastructure | @infra-maintainers | 48 hours |

**Domain Expertise**: Rust, Soroban SDK, Stellar network, smart contract security, cryptography.

### 2. SDK & Client Libraries
**Status: ✅ Maintained (Canonical)** - TypeScript SDK for interacting with all DeWordle Soroban contracts.

| Surface | Path | Primary Track | Primary Maintainers | Fallback Track | Fallback Maintainers | Review SLA |
|---------|------|---------------|---------------------|----------------|----------------------|------------|
| TypeScript SDK | `/soroban/sdk/ts/` | SDK | @sdk-maintainers | Soroban Core | @soroban-maintainers | 72 hours |
| Frontend SDK Integration | `/frontend/src/lib/soroban/` | Frontend | @frontend-maintainers | SDK | @sdk-maintainers | 72 hours |

**Domain Expertise**: TypeScript, async/await patterns, API design, contract event parsing, transaction building.

### 3. Backend Indexer
**Status: ✅ Maintained (Canonical)** - Service that ingests, normalizes, and persists Soroban contract events.

| Surface | Path | Primary Track | Primary Maintainers | Fallback Track | Fallback Maintainers | Review SLA |
|---------|------|---------------|---------------------|----------------|----------------------|------------|
| Indexer Core | `/backend/src/indexer/` | Indexer | @indexer-maintainers | Backend Platform | @platform-maintainers | 48 hours |
| Indexer Scripts | `/backend/scripts/reset-indexer.ts` | Indexer | @indexer-maintainers | Backend Platform | @platform-maintainers | 72 hours |
| Projections | `/backend/src/indexer/projections/` | Indexer | @indexer-maintainers | Data Engineering | @data-maintainers | 72 hours |

**Domain Expertise**: Node.js, NestJS, PostgreSQL, event streaming, data normalization, replay protection.

### 4. Frontend Wallet Integration
**Status: ✅ Maintained (Canonical)** - Stellar wallet integration for Freighter and other compatible wallets.

| Surface | Path | Primary Track | Primary Maintainers | Fallback Track | Fallback Maintainers | Review SLA |
|---------|------|---------------|---------------------|----------------|----------------------|------------|
| Stellar/Wallet Layer | `/frontend/src/lib/stellar/` | Frontend | @frontend-maintainers | SDK | @sdk-maintainers | 72 hours |
| Wallet UI Components | `/frontend/src/components/wallet/` | Frontend | @frontend-maintainers | Design Systems | @design-maintainers | 72 hours |

**Domain Expertise**: React, TypeScript, wallet connections, transaction signing, network management.

### 5. Documentation & Developer Experience
**Status: ✅ Maintained (Canonical)** - All project documentation and contributor experience tooling.

| Surface | Path | Primary Track | Primary Maintainers | Fallback Track | Fallback Maintainers | Review SLA |
|---------|------|---------------|---------------------|----------------|----------------------|------------|
| Technical Documentation | `/docs/` | DevEx | @docs-maintainers | All Track Leads | @track-leads | 72 hours |
| Contributor Scripts | `/scripts/*bootstrap*.js` | DevEx | @docs-maintainers | Infrastructure | @infra-maintainers | 72 hours |
| ADRs & Architecture Docs | `/docs/*.md` | DevEx | @docs-maintainers | Architecture WG | @arch-maintainers | 72 hours |

**Domain Expertise**: Technical writing, developer onboarding, documentation automation.

### 6. CI/CD & Infrastructure
**Status: ✅ Maintained (Canonical)** - GitHub Actions workflows and infrastructure automation.

| Surface | Path | Primary Track | Primary Maintainers | Fallback Track | Fallback Maintainers | Review SLA |
|---------|------|---------------|---------------------|----------------|----------------------|------------|
| GitHub Workflows | `/.github/workflows/` | Infrastructure | @infra-maintainers | DevOps Lead | @devops-lead | 72 hours |
| Utility Scripts | `/scripts/` | Infrastructure | @infra-maintainers | DevEx | @docs-maintainers | 72 hours |
| Docker & Compose | `/backend/docker-compose.yml` | Infrastructure | @infra-maintainers | Indexer | @indexer-maintainers | 72 hours |

**Domain Expertise**: GitHub Actions, Docker, shell scripting, cloud infrastructure, CI/CD best practices.

---

## 🔄 Transitional Surface Ownership
**Status: ⚠️ Transitional** - These surfaces are being migrated to Soroban-native implementations. Only critical bug fixes are accepted.

| Surface | Path | Primary Track | Primary Maintainers | Fallback Track | Notes |
|---------|------|---------------|---------------------|----------------|-------|
| Legacy Auth | `/backend/src/auth/` | Migration | @migration-maintainers | Frontend | Scheduled for deprecation Wave 6 |
| Core Game Engine | `/backend/src/dewordle/` | Migration | @migration-maintainers | Soroban Core | Scheduled for deprecation Wave 7 |
| Game Management | `/backend/src/games/` | Migration | @migration-maintainers | Indexer | Scheduled for deprecation Wave 6 |
| Legacy Frontend UI | `/frontend/src/components/game/` | Migration | @migration-maintainers | Frontend | Scheduled for deprecation Wave 8 |
| All Other Legacy Backend | `/backend/src/*` (excluding indexer) | Migration | @migration-maintainers | Corresponding new surface owner | See REPO_SURFACE_MAP.md for full timeline |

---

## 🚫 Legacy Surface Routing
**Status: ❌ Legacy** - These surfaces are no longer actively developed. PRs targeting these paths are automatically flagged.

| Surface | Path | Routing | Notes |
|---------|------|---------|-------|
| Legacy Starknet Contracts | `/onchain/` | @migration-maintainers | Retained for historical reference only |

All PRs targeting legacy surfaces will receive an automated comment directing contributors to the appropriate maintained canonical surface.

---

## 🛠️ Tooling for Maintainers
The repository includes automation to help maintain balanced reviewer load:

### Reviewer Load Monitoring
```bash
# Generate current reviewer load heatmap
node scripts/reviewer-load-heatmap.js

# Output machine-readable JSON for automation
OUTPUT_JSON=true node scripts/reviewer-load-heatmap.js
```

### Load Balancing
The `reviewer-load-balancer.js` script can automatically assign fallback reviewers when primary track maintainers are overloaded (defined as >5 pending reviews):
```bash
node scripts/reviewer-load-balancer.js
```

### Contributor Commands
Contributors can use these validated commands based on their surface:

**For maintained surfaces (always tested in CI):**
```bash
# Soroban contracts
cd soroban && cargo check --workspace && cargo test --workspace

# Backend indexer
cd backend && npm run lint:ci && npm run test:ci -- src/indexer/

# Frontend wallet integration
cd frontend && npm run lint:ci && npm run test:ci -- src/lib/stellar src/lib/soroban
```

---

## 🔄 Updating This Map
This ownership map is lightweight by design - maintainers should update it during each wave planning cycle:
1. Add new surfaces as they become maintained
2. Remove surfaces that have been fully deprecated and removed
3. Adjust primary/fallback assignments based on team capacity changes
4. Update review SLAs if turnaround times change

All changes to this map require approval from the project lead (@kike-alt) and all affected track maintainers.

---

## 📚 Related Documentation
- [Repository Surface Map](./REPO_SURFACE_MAP.md) - Canonical maintained vs. legacy codebases
- [Soroban Migration Plan](./SOROBAN_GITHUB_STRATEGY.md) - Full migration roadmap
- [Indexer Architecture](./BACKEND_INDEXER_FOUNDATION.md) - Indexer deep dive
- [Frontend Wallet Foundation](./FRONTEND_WALLET_FOUNDATION.md) - Wallet integration docs
- [Current Wave Plan](./GITHUB_PROJECT_PLAN.md) - Current development priorities