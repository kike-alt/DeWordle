# API Versioning Strategy

## Overview

DeWordle uses URI-based API versioning with the prefix `/api/v1/` to ensure backward compatibility during the transition from REST-based backend services to Soroban smart contract interactions.

## Version Format

All API endpoints are prefixed with the version:

```
/api/v1/{resource}
/api/v2/{resource}  # Future
```

## Current Version: v1

All existing endpoints are served under `/api/v1/`:

- **Auth**: `/api/v1/auth/*`
- **Games**: `/api/v1/games/*`
- **Words**: `/api/v1/words/*`
- **Leaderboard**: `/api/v1/leaderboard/*`
- **Sessions**: `/api/v1/sessions`
- **Achievements**: `/api/v1/achievements/:address`
- **Player Profile**: `/api/v1/players/:address/summary`
- **Metrics**: `/api/v1/metrics`

## Deprecation Policy

When an endpoint is deprecated, the following HTTP headers are added:

- `Deprecation: true`
- `Sunset: <date>` - The date when the endpoint will be removed (default: 180 days)
- `Link: </api/v2>; rel="successor-version"` - Points to the successor version

## Deprecation Levels

| Status | Description |
|--------|-------------|
| `active` | Stable, production-ready endpoint |
| `transitional` | Will be replaced in a future wave |
| `deprecated` | Scheduled for removal, use successor |

## Migration Strategy

1. **Announce** deprecation in release notes and API docs
2. **Mark** deprecated endpoints with `Deprecation` header
3. **Implement** successor in new version
4. **Monitor** usage of deprecated endpoints
5. **Remove** after sunset date

## Example Response Headers

```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Wed, 31 Dec 2026 00:00:00 GMT
Link: </api/v2>; rel="successor-version"
Content-Type: application/json
```

## Version Control

- Backend controllers use the `@Deprecated(version, sunsetDate)` decorator
- The `DeprecationInterceptor` automatically adds headers to marked endpoints
- The deprecation map at `/api/v1/deprecation` provides a machine-readable catalog
