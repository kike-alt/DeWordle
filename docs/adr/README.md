# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the DeWordle project.

## Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [0001](./0001-soroban-foundation-boundaries.md) | Soroban Foundation Boundaries | Accepted | 2024-01 |
| [0002](./0002-backend-caching-strategy.md) | Backend Caching Strategy | Accepted | 2024-07 |
| [0003](./0003-frontend-accessibility-standards.md) | Frontend Accessibility Standards | Accepted | 2024-07 |

## Status Tags

- **Accepted** - The proposal is in effect and actively guiding development
- **Deprecated** - The proposal is no longer recommended but may still be in use
- **Superseded** - The proposal has been replaced by a newer ADR

## Changelog

| Date | ADR | Change | Migration Docs |
|------|-----|--------|----------------|
| 2024-01 | 0001 | Accepted | [Stellar Migration](../STELLAR_MIGRATION.md) |
| 2024-07 | 0002 | Accepted | [Backend Foundation](../BACKEND_INDEXER_FOUNDATION.md) |
| 2024-07 | 0003 | Accepted | [Frontend Wallet Foundation](../FRONTEND_WALLET_FOUNDATION.md) |

## Writing ADRs

To create a new ADR:

1. Copy `0001-soroban-foundation-boundaries.md` as a template
2. Increment the number prefix
3. Set status to `Proposed` initially
4. Add a summary row to this index
5. Submit a PR for team review
6. Update status to `Accepted` after approval
