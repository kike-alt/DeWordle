# Backend Indexer Queue Processing Architecture

> Resolves #1293

## Overview

The DeWordle backend indexer ingests Soroban contract events, processes them through a queue, and materializes projections for the REST API. This document describes the data flow and component responsibilities.

## Architecture Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Soroban    │────▶│  Event Stream │────▶│    Queue     │
│   RPC Node   │     │  (Ingestion)  │     │  (Buffering) │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                                  ▼
                                         ┌──────────────┐
                                         │  Processors   │
                                         │ (Per Family)  │
                                         └──────┬───────┘
                                                │
                        ┌───────────────────────┼───────────────────────┐
                        │                       │                       │
                        ▼                       ▼                       ▼
               ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
               │  Projections  │       │  Projections  │       │  Projections  │
               │ (Sessions)   │       │  (Rewards)   │       │ (Achievements)│
               └──────┬───────┘       └──────┬───────┘       └──────┬───────┘
                      │                      │                      │
                      ▼                      ▼                      ▼
               ┌──────────────────────────────────────────────────────────────┐
               │                      PostgreSQL                              │
               └──────────────────────────┬───────────────────────────────────┘
                                          │
                                          ▼
                               ┌─────────────────────┐
                               │   REST API Layer     │
                               │  (NestJS Controllers)│
                               └──────────┬──────────┘
                                          │
                                          ▼
                               ┌─────────────────────┐
                               │     Frontend         │
                               │   (Next.js App)      │
                               └─────────────────────┘
```

## Component Details

### Event Ingestion (`backend/src/indexer/indexer.service.ts`)

- Connects to Soroban RPC and subscribes to contract events
- Filters events by known topic families
- Enforces payload size limits (`INDEXER_MAX_PAYLOAD_BYTES`, default 8192)
- Generates replay-safe identifiers: `(network, txHash, eventIndex)`

### Queue (`backend/src/indexer/queue/`)

- Buffers ingested events before processing
- Provides at-least-once delivery guarantees
- Tracks queue depth for health monitoring (`GET /api/v1/indexer/health`)

### Processors (`backend/src/indexer/processors/`)

Each processor handles events for one contract family:

| Processor | Handles | Events |
|-----------|---------|--------|
| `core_game` | Sessions, guesses, streaks | `session_started`, `guess_submitted`, `session_finalized`, `streak_updated` |
| `rewards` | Points accrual, claims | `accrued`, `claimed`, `emission_set` |
| `achievements` | Achievement unlocks | `achievement_defined`, `achievement_unlocked` |
| `admin_registry` | Contract/role changes | `contract_set`, `role_set` |

### Projections (`backend/src/indexer/projections/`)

- Materialize event data into queryable PostgreSQL tables
- Used by REST controllers for read APIs
- Support pagination via `PaginationQueryDto`

### Registry (`backend/src/indexer/registry/`)

- Maps event topic strings to the correct processor
- Provides type-safe event routing
- Used for registry drift detection (`registry-drift-snapshot.spec.ts`)

## Health Monitoring

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/indexer/health` | Queue depth, worker liveness, error counters |
| `GET /api/v1/indexer/lag` | Stream cursor, network ledger, lag metrics |
| `GET /api/v1/indexer/events` | Recent ingested events |

## Audit Trail

The indexer maintains an audit trail (`backend/src/indexer/audit/`) for compliance and debugging:

- `audit-trail.service.ts` — records all processed events
- `audit-trail.controller.ts` — exposes audit history via API
