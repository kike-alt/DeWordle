# Health Dashboard JSON Spec

**ID:** INFRA-209

## Purpose

Define a shared JSON contract for health and status dashboard consumers
across all maintained surfaces (backend, indexer, frontend, Soroban).
This contract enables observability tooling to be built in parallel by
different contributors.

## JSON Schema

Every health payload SHALL conform to the following shape:

```
{
  "generated_at":      string   // ISO 8601 timestamp
  "version":           string   // Spec version (semver, e.g. "1.0.0")
  "producers": {
    "backend": {
      "status":        string   // "healthy" | "degraded" | "down"
      "uptime_seconds": number  // Process uptime
      "version":       string   // Backend package version
      "database": {
        "status":      string   // "healthy" | "degraded" | "down"
        "connected":   boolean  // Connection pool status
        "pool_size":   number   // Configured pool size
        "active":      number   // Currently active connections
        "idle":        number   // Currently idle connections
        "migrations": {
          "applied":   number   // Successful migrations
          "pending":   number   // Unapplied migrations
        }
      }
    },
    "indexer": {
      "status":              string   // "healthy" | "degraded" | "down"
      "last_ingested_at":    string   // ISO 8601 of last successful ingest
      "lag_blocks":          number   // Ledger lag in blocks (0 = caught up)
      "total_events":        number   // Lifetime ingested event count
      "cursor_position":     string   // Current stream cursor
      "replay_skip_count":   number   // Events skipped during replay
      "replay_alert":        string | null   // Active replay alert, if any
    },
    "frontend": {
      "status":             string   // "healthy" | "degraded" | "down"
      "version":            string   // Frontend package version
      "build_sha":          string   // Deployed build commit SHA
      "network": {
        "expected":         string   // Expected Stellar network
        "connected":        boolean  // Wallet connection state
        "network_passphrase": string | null
      }
    },
    "soroban": {
      "status":             string   // "healthy" | "degraded" | "down"
      "network":            string   // "testnet" | "mainnet" | "local"
      "core_game_contract": string   // Deployed contract ID
      "rpc": {
        "reachable":        boolean  // RPC endpoint is reachable
        "latency_ms":       number   // RPC round-trip in milliseconds
        "last_ok_at":       string   // ISO 8601 of last successful RPC call
      }
    }
  },
  "summary": {
    "total_services":    number   // Number of expected producers
    "healthy":           number   // Count with status "healthy"
    "degraded":          number   // Count with status "degraded"
    "down":              number   // Count with status "down"
  }
}
```

## Field producers

| Field path | Producer | Expected population timeline |
|---|---|---|
| `producers.backend.*` | Backend NestJS service (`/health` endpoint) | Wave 5 |
| `producers.indexer.*` | Indexer service (`/indexer/lag` and new `/health`) | Wave 5 |
| `producers.frontend.*` | Frontend build-time or runtime health probe | Wave 6 |
| `producers.soroban.*` | Soroban SDK / contract health endpoint | Wave 6 |
| `summary.*` | Aggregator / dashboard backend | Wave 6 |

## Health status semantics

| Status | Meaning |
|---|---|
| `healthy` | Service is fully operational and responding within SLAs |
| `degraded` | Service is operational but with reduced capacity or elevated latency |
| `down` | Service is unreachable or returning errors |

## Validation

A JSON payload SHALL be considered valid if:

1. `generated_at` is a parseable ISO 8601 timestamp.
2. `version` is present.
3. Each producer object contains a `status` field with one of the three
   allowed values.
4. All numeric fields are non-negative integers.
5. The `summary` counts equal the number of producers with matching
   status values.

Use `scripts/validate-health-payload.js` to validate any payload file
or stream:

```bash
node scripts/validate-health-payload.js path/to/payload.json
```

## Example valid payload

```json
{
  "generated_at": "2026-06-25T12:00:00Z",
  "version": "1.0.0",
  "producers": {
    "backend": {
      "status": "healthy",
      "uptime_seconds": 86400,
      "version": "0.1.0",
      "database": {
        "status": "healthy",
        "connected": true,
        "pool_size": 10,
        "active": 2,
        "idle": 8,
        "migrations": {
          "applied": 15,
          "pending": 0
        }
      }
    },
    "indexer": {
      "status": "healthy",
      "last_ingested_at": "2026-06-25T11:59:30Z",
      "lag_blocks": 0,
      "total_events": 12000,
      "cursor_position": "0000000123456",
      "replay_skip_count": 3,
      "replay_alert": null
    },
    "frontend": {
      "status": "healthy",
      "version": "0.1.0",
      "build_sha": "abc123def456",
      "network": {
        "expected": "testnet",
        "connected": true,
        "network_passphrase": "Test SDF Network ; September 2025"
      }
    },
    "soroban": {
      "status": "healthy",
      "network": "testnet",
      "core_game_contract": "CCR3ZQ...",
      "rpc": {
        "reachable": true,
        "latency_ms": 42,
        "last_ok_at": "2026-06-25T11:59:31Z"
      }
    }
  },
  "summary": {
    "total_services": 4,
    "healthy": 4,
    "degraded": 0,
    "down": 0
  }
}
```

## Related

- [MIGRATION_DASHBOARD_SPEC.md](./MIGRATION_DASHBOARD_SPEC.md) — broader
  Wave 5 migration visibility dashboard
- `scripts/validate-health-payload.js` — payload validation script
