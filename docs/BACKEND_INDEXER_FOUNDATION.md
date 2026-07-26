# Backend Indexer Foundation

## Purpose
Shift backend responsibilities toward read models, analytics, and event projection from Soroban events.

## Added Foundation
- `IndexerModule`
- replay-safe `IngestedEventEntity` with unique `(network, txHash, eventIndex)`
- `SessionProjectionEntity` for read API projections
- `EventProcessorService` for idempotent processing
- `ProjectionService` for projection updates
- `IndexerController` ingestion endpoint scaffold

## Extending the Indexer
To add new projections and read endpoints, follow the comprehensive guide:
[Backend Read-Model Extension Guide](./contributors/backend-read-model-extension.md)

This guide provides a standardized pattern for:
1. Creating projection entities with proper indexing
2. Implementing idempotent event processing
3. Adding read APIs with proper DTOs
4. Writing comprehensive tests
5. Maintaining replay safety and schema versioning

## Next Steps
- Replace manual ingest endpoint with Soroban RPC poller worker
- Add durable cursor/checkpoint table
- Expand projections for leaderboard/day stats