# ADR 0002: Backend Caching Strategy

## Status
Accepted

## Context
DeWordle's backend serves projection-backed read APIs (achievements, player summaries, session history) that query PostgreSQL on every request. As the player base grows, repeated identical queries for the same wallet address create unnecessary database load. The backend already uses `@nestjs/schedule` for periodic tasks, making an in-process cache viable for non-critical read paths.

## Decision
1. Use an in-memory LRU cache (via `Map` with TTL eviction) as the primary cache layer for read API endpoints.
2. Cache key = request path + query parameters (normalized).
3. Default TTL of 60 seconds for projection-backed reads, configurable via `CACHE_TTL_SECONDS` environment variable.
4. Invalidate cache entries on write operations that affect the same player (session creation, guess submission).
5. Expose cache metrics (hit rate, miss count) via the existing metrics endpoint for operational visibility.
6. Do not cache auth endpoints, admin operations, or indexer ingest paths.

## Consequences
- Read API latency reduces significantly for repeated queries within the TTL window.
- Slightly stale data is acceptable for player summaries and achievements (eventual consistency model).
- Cache is per-process; horizontal scaling means each instance maintains its own cache.
- Write-through invalidation ensures cache consistency for the specific player affected by a mutation.
- No external dependency (Redis/Memcached) required for the initial implementation, reducing operational complexity.

## Migration Notes
- See [Backend Foundation](../BACKEND_INDEXER_FOUNDATION.md) for indexer architecture context.
- Cache configuration is additive; no existing API contracts change.
- New environment variable `CACHE_TTL_SECONDS` (default: 60) is optional.
