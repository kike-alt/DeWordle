# RPC Proxy / Cache Service

**ID:** INFRA-206

## Purpose

Provide a local proxy and caching layer for Soroban RPC requests so
contributors working heavily against testnet can reduce latency and
avoid hitting rate limits during development and testing.

## When to use the proxy

| Scenario | Use proxy? | Reason |
|---|---|---|
| Running a test suite that calls `getLedgerEntry` repeatedly | ✅ | Cache eliminates redundant network calls |
| Making a one-off `sendTransaction` call | ❌ | Direct RPC is simpler; nonce-based methods are never cached |
| Iterating on indexer replay logic | ✅ | Repeated `getTransaction` calls benefit from cache |
| Debugging a live testnet issue | ❌ | Direct RPC gives you the freshest state |
| CI pipeline that runs integration tests | ✅ | Reduces test flakiness from RPC timeouts |

## Running

```bash
# Start the proxy with defaults (port 7545, upstream testnet)
node scripts/rpc-proxy.js
```

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `RPC_PROXY_PORT` | `7545` | Local listen port |
| `SOROBAN_RPC_URL` | testnet RPC | Upstream Soroban RPC endpoint |
| `RPC_CACHE_TTL_MS` | `30000` | Cache TTL in milliseconds |

### Using the proxy

Point your application or SDK at the proxy instead of the upstream RPC:

```bash
# Instead of:
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org

# Use:
SOROBAN_RPC_URL=http://localhost:7545
```

The proxy accepts standard JSON-RPC POST requests at the root path
(`/`) and exposes a `/health` endpoint for monitoring.

## Cache behavior

### Cached methods (read-only)

| Method | Cached? | Notes |
|---|---|---|
| `getLedgerEntry` | ✅ | Keyed by ledger key bytes |
| `getTransaction` | ✅ | Keyed by transaction hash |
| `getLedgerEntries` | ✅ | Keyed by request body |
| `getNetwork` | ✅ | Rarely changes — long-lived cache |
| `getLatestLedger` | ✅ | TTL-based refresh (default 30s) |
| `simulateTransaction` | ✅ | Keyed by entire request — use with care |

### Never cached (always forwarded)

| Method | Reason |
|---|---|
| `sendTransaction` | Nonce-based; must go to network |
| `sendTransactionSubmission` | Nonce-based; must go to network |

### Cache invalidation

- Entries expire after `RPC_CACHE_TTL_MS` (default 30 seconds).
- The cache holds at most 500 entries; oldest entries are evicted first.
- There is no proactive invalidation — stale entries self-expire.

## Health endpoint

```
GET http://localhost:7545/health
```

Returns:

```json
{
  "status": "ok",
  "upstream": "https://soroban-testnet.stellar.org",
  "cacheSize": 42,
  "cacheHits": 150,
  "cacheMisses": 30,
  "uptimeSeconds": 3600
}
```

## Architecture context

```
Your code  ──►  RPC Proxy (localhost:7545)  ──►  Soroban RPC (testnet)
                    │
                    ▼
              In-memory cache
              (read-only methods)
```

The proxy sits between your application and the upstream Soroban RPC,
intercepting read-only calls and returning cached responses when
available.

## Related

- [Health Dashboard JSON Spec](./HEALTH_DASHBOARD_SPEC.md) — the proxy
  exposes a `/health` endpoint conforming to the dashboard spec
- [Soroban Deploy Topology](../DEPLOY_TOPOLOGY.md) — how RPC fits into
  the deployment architecture
- `soroban/sdk/ts/network.ts` — SDK network configuration
