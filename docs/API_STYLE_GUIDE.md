# DeWordle API Style Guide

## Base URL

All endpoints are prefixed with `/api/v1`.

## Authentication

- Bearer token authentication via Stellar wallet signatures
- Include `Authorization: Bearer <token>` header on all authenticated requests

## Naming Conventions

- **URLs**: kebab-case for multi-word paths (e.g., `/game-sessions`)
- **Query parameters**: camelCase (e.g., `playerAddress`, `skip`, `take`)
- **Response fields**: camelCase (e.g., `sessionId`, `dayId`, `attemptsUsed`)

## Pagination

All list endpoints support pagination via query parameters:

| Parameter | Type    | Default | Range  | Description         |
|-----------|---------|---------|--------|---------------------|
| `skip`    | number  | 0       | ≥0     | Page offset         |
| `take`    | number  | 20      | 1-100  | Page size           |

Response includes `total` count for client-side pagination.

## Error Responses

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

## Rate Limiting

Rate limits are applied per-endpoint category:

| Category       | Default Limit | TTL   |
|----------------|---------------|-------|
| Auth           | 5 requests    | 60s   |
| Game Sessions  | 30 requests   | 60s   |
| Read API       | 100 requests  | 60s   |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

## Caching

Read API endpoints use in-memory caching with the following TTLs:

| Endpoint                        | TTL    |
|---------------------------------|--------|
| Achievement summary             | 30s    |
| Player summary                  | 15s    |
| Session history                 | 10s    |

Cache keys follow the pattern `{endpoint}:{identifier}:{params}`.

## Response Format

All responses return JSON with consistent structure:

- **Success**: Direct object or `{ data: [...], total, skip, take }` for paginated results
- **Error**: `{ statusCode, message, error }` per NestJS conventions

## Versioning

API version is included in the URL path (`/api/v1`). Breaking changes will increment the version number.
