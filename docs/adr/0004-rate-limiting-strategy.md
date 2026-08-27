# ADR 0004: Rate Limiting Strategy

## Status

Proposed

## Context

DeWordle's backend exposes REST APIs for game sessions, rewards, achievements, and admin operations. As the player base grows, unbounded request rates could degrade service availability. The backend already has a `RateLimitHeadersInterceptor` in `backend/src/common/rate-limit-headers.interceptor.ts` that adds `Retry-After` headers on 429 responses, but no actual rate limiting logic is enforced.

## Decision

### 1. Per-IP Rate Limiting at the Middleware Layer

- Implement rate limiting as a NestJS middleware applied globally.
- Use a sliding-window counter per IP address (in-memory, no external dependency).
- Default limits via environment variables for easy tuning.

### 2. Tiered Rate Limits

| Tier | Limit | Scope | Default |
|------|-------|-------|---------|
| Authenticated | 100 req/min | Per IP + JWT sub | `RATE_LIMIT_AUTH=100` |
| Unauthenticated | 30 req/min | Per IP | `RATE_LIMIT_ANON=30` |
| Game actions | 20 req/min | Per IP + session | `RATE_LIMIT_GAME=20` |
| Admin | exempt | — | — |
| Indexer | exempt | — | — |

### 3. Game-Specific Limits

- Guess submission (`POST /sessions/:id/guess`): stricter 20 req/min per session to prevent spam.
- Session creation (`POST /sessions`): 20 req/min per IP.
- Read endpoints (GET requests): use the standard tier limits.

### 4. Response Behavior

- On rate limit exceeded: return HTTP 429 with `Retry-After` header (existing interceptor pattern).
- Response body: `{ "statusCode": 429, "message": "Rate limit exceeded. Retry after N seconds." }`.
- The `RateLimitHeadersInterceptor` already handles the `Retry-After` header fallback.

### 5. Exemptions

- Admin endpoints (require admin JWT role): exempt from rate limiting.
- Indexer internal endpoints: exempt.
- Healthcheck endpoints (`/health`, `/indexer/health`): exempt.

### 6. Configuration

All limits configurable via environment variables:

```
RATE_LIMIT_AUTH=100
RATE_LIMIT_ANON=30
RATE_LIMIT_GAME=20
RATE_LIMIT_WINDOW_MS=60000
```

## Consequences

- Protects backend from abuse and traffic spikes without external dependencies (Redis).
- Per-IP + per-session limits prevent both IP-level and session-level abuse.
- In-memory counters are lost on restart — acceptable for a game backend with graceful degradation.
- Environment variable configuration allows tuning without code changes.
- The existing `RateLimitHeadersInterceptor` integrates seamlessly.

## Migration Notes

- No existing API contracts change.
- New environment variables are optional with sensible defaults.
- The `RateLimitHeadersInterceptor` remains for backward compatibility during rollout.
