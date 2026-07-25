# DeWordle API Changelog

All notable API changes are documented here.

## [1.0.0] - 2026-07-25

### Added

- **Read API** (`/api/v1`): Projection-backed read endpoints for game data
  - `GET /achievements/:address` — Achievement unlock summary for a player
  - `GET /players/:address/summary` — Player streak and profile summary
  - `GET /sessions` — Paginated session history (filterable by player)
- **Deprecation Map** (`/api/v1/deprecation`): Endpoint lifecycle tracking
  - `GET /deprecation` — Full deprecation map
  - `GET /deprecation/active` — Active endpoints only
  - `GET /deprecation/transitional` — Transitional endpoints
  - `GET /deprecation/deprecated` — Deprecated endpoints
- **Swagger documentation** at `/api` with interactive testing
- **In-memory caching** with configurable TTL per endpoint (30s achievements, 15s player summary, 10s sessions)
- **Cache invalidation hooks** for player and session updates
- **Cache hit/miss logging** for observability

### Security

- Bearer token authentication via Stellar wallet signatures
- Rate limiting on all endpoints (configurable via environment variables)
- CORS restricted to configured frontend origin
