# Debug Recipe Catalog

> Wave 5 · Track: DEVOPS/DX · Phase: 3B · ID: W5-3B-DX-007

A searchable, linkable catalog of repeatable debug recipes for the most common contributor issues. Jump to the section that matches your symptoms:

- [Wallet Connection Issues](#wallet-connection-issues)
- [RPC Interaction Failures](#rpc-interaction-failures)
- [Database Connection & Migration Errors](#database-connection--migration-errors)
- [CI/CD Pipeline Failures](#cicd-pipeline-failures)
- [All Recipes Index](#all-recipes-index) (searchable list)

---

## Wallet Connection Issues

### Recipe: Freighter Wallet Not Detected
**Symptoms**
- "No wallet detected" message persists even with Freighter installed
- `useStellarWallet` hook returns `isConnected: false`
- Network switch fails silently

**Prerequisites**
- Freighter browser extension installed
- Local frontend dev server running on `localhost:3000` (HTTPS not required for local dev)

**Step-by-Step Debug**
1. Verify extension is enabled and updated to latest version:
   ```bash
   # Check frontend wallet detection logs
   cd frontend && npm run dev | grep "wallet"
   ```
2. Confirm you're on a supported network (testnet only for local dev):
   ```typescript
   // In browser dev tools console
   console.log(window.stellar.getNetwork());
   ```
3. Reset wallet permissions for localhost:
   - Open Freighter settings → Connected sites → Remove `localhost:3000`
   - Refresh frontend and reconnect
4. Validate the wallet provider is initialized correctly:
   ```typescript
   // In browser dev tools console
   console.log(StellarWalletProvider.initialized); // Should return true
   ```

**Permanent Fix (if persistent)**
- Update `frontend/src/lib/stellar/network.ts` to include your local dev network
- Reinstall Freighter extension and re-add the development seed phrase

---

### Recipe: Wallet Transaction Signing Rejected
**Symptoms**
- User rejects transaction in Freighter, but app doesn't handle the error state
- "Transaction signing failed" error toast doesn't appear
- Game state stuck in "pending" after rejection

**Debug Steps**
1. Capture the full error object in browser console:
   ```typescript
   // Add temporary error logging in useStellarWallet.ts
   try {
     await signTransaction(tx);
   } catch (e) {
     console.error("Sign error details:", e);
     throw e;
   }
   ```
2. Verify error codes match expected rejection codes:
   - `UserRejected` (code: 4001) - standard user rejection
   - `Unauthorized` (code: 4100) - wallet not connected
3. Test error boundary handling:
   ```bash
   cd frontend && npm run test -- src/hooks/useStellarWallet.test.ts
   ```

**Validation**
- All transaction error states are handled in the wallet provider
- Error toasts appear for all failure scenarios
- App state resets correctly after any signing failure

---

## RPC Interaction Failures

### Recipe: Soroban RPC Connection Timeouts
**Symptoms**
- `ETIMEDOUT` when connecting to testnet RPC endpoint
- Soroban contract calls fail with "RPC node unavailable"
- Backend indexer logs show continuous retry attempts

**Prerequisites**
- Valid RPC endpoint configured in environment variables
- Network connectivity to Stellar testnet

**Debug Steps**
1. Test basic RPC connectivity with curl:
   ```bash
   curl -X POST https://soroban-testnet.stellar.org \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"getHealth","params":{}}'
   ```
2. Verify local environment variables match required RPC URL:
   ```bash
   # Check backend .env file
   cd backend && grep SOROBAN_RPC_URL .env
   # Check frontend env
   cd frontend && grep NEXT_PUBLIC_SOROBAN_RPC_URL .env.local
   ```
3. Validate RPC request format matches Soroban RPC spec:
   ```bash
   cd backend && npm run test -- src/services/soroban-rpc.service.test.ts
   ```

**Common Root Causes**
- Outdated RPC endpoint in .env files
- Firewall blocking outbound HTTPS connections to port 443
- Malformed JSON-RPC request payload

---

### Recipe: RPC Event Streaming Disconnects
**Symptoms**
- Backend event processor stops receiving Soroban events after 5 minutes
- Indexer falls behind chain state
- `EventProcessorService` logs show "stream closed unexpectedly"

**Debug Steps**
1. Enable verbose RPC logging in backend:
   ```bash
   # In backend .env
   DEBUG=soroban-client,event-processor npm run start:dev
   ```
2. Verify ping/pong heartbeats are configured correctly:
   ```typescript
   // In backend/src/services/event-processor.service.ts
   console.log(this.rpcClient.getHeartbeatInterval()); // Should be 30000ms
   ```
3. Test reconnection logic manually:
   ```bash
   # Simulate network disconnect
   iptables -A OUTPUT -d soroban-testnet.stellar.org -j DROP
   # Wait 1 minute, then re-enable
   iptables -D OUTPUT -d soroban-testnet.stellar.org -j DROP
   ```
4. Check that the indexer resumes processing from the last checkpoint:
   ```sql
   -- Verify cursor position in database
   SELECT * FROM indexer_cursors ORDER BY last_updated DESC LIMIT 1;
   ```

---

## Database Connection & Migration Errors

### Recipe: PostgreSQL Connection Refused
**Symptoms**
- Backend fails to start with "ECONNREFUSED" on port 5432
- `npm run test:backend` fails with database connection error
- Local Docker database container not running

**Debug Steps**
1. Verify Docker container status:
   ```powershell
   # Windows
   docker ps | grep postgres
   # If not running, start the local stack
   docker compose up -d postgres redis
   ```
2. Validate database credentials in .env:
   ```bash
   cd backend && grep -E "DB_HOST|DB_PORT|DB_USER|DB_PASS" .env
   ```
3. Test direct connection with psql:
   ```bash
   psql -h localhost -p 5432 -U dewordle_user -d dewordle_dev
   ```
4. Check for port conflicts:
   ```powershell
   netstat -ano | findstr :5432
   ```

**Automated Fix**
```bash
# Run the local database reset script
npm run db:reset:local
```

---

### Recipe: TypeORM Migration Failures
**Symptoms**
- `migration:run` fails with "relation already exists"
- Migrations out of order in the migration table
- Unique constraint violation during migration

**Debug Steps**
1. Check current migration status:
   ```bash
   cd backend && npm run typeorm migration:show
   ```
2. Revert and re-run failing migrations:
   ```bash
   npm run typeorm migration:revert -- --transaction=false
   npm run typeorm migration:run -- --transaction=false
   ```
3. Verify migration checksums match committed versions:
   ```bash
   cd backend && npm run typeorm migration:generate src/migrations/verify-fix
   ```
4. Fix corrupted migration tracking table:
   ```sql
   -- Manually update the migrations table if needed
   DELETE FROM migrations WHERE name = 'migration-name-fail.ts';
   ```

**Prevention**
- Always generate migrations from a clean database state
- Never edit a migration that's already been merged to main
- Test migrations in reverse order to ensure they're reversible

---

### Recipe: Redis Cache Connection Issues
**Symptoms**
- Session data not persisting across page reloads
- Backend logs show "Redis connection lost"
- Leaderboard API returns stale data

**Debug Steps**
1. Verify Redis server is running:
   ```powershell
   docker exec -it dewordle-redis redis-cli ping
   # Should return PONG
   ```
2. Test cache operations manually:
   ```bash
   # In backend, run the redis test script
   npm run test:redis
   ```
3. Check Redis memory usage:
   ```bash
   docker exec -it dewordle-redis redis-cli info memory
   ```

---

## CI/CD Pipeline Failures

For additional CI-specific debug recipes, see the [CI Troubleshooting Runbook](./wave/CI_TROUBLESHOOTING_RUNBOOK.md). Below are the most common cross-track CI issues:

### Recipe: Cross-Test Flakiness in CI
**Symptoms**
- Frontend tests pass locally but fail in CI
- Backend integration tests fail intermittently
- Soroban contract tests time out in CI

**Debug Steps**
1. Reproduce CI conditions locally:
   ```bash
   # Run frontend tests with same config as CI
   cd frontend && npm run test -- --watchAll=false --ci
   # Run backend tests in sequence (avoids race conditions)
   cd backend && npm run test -- --runInBand
   ```
2. Enable CI build debug logging:
   ```bash
   # In your PR branch, add this to enable debug logs
   git commit --allow-empty -m "Enable debug logging" -m "CI_DEBUG=true"
   ```
3. Check for shared state leakage between tests:
   ```bash
   # Run tests repeatedly to catch flakiness
   cd backend && for i in {1..10}; do npm run test; done
   ```

### Recipe: Workflow Permission Errors
**Symptoms**
- GitHub Actions workflow fails with "Resource not accessible by integration"
- Deployment job can't access repository secrets
- PR comment job fails to create a review

**Debug Steps**
1. Validate workflow permissions in the workflow file:
   ```yaml
   # Ensure .github/workflows/ci.yml has correct permissions
   permissions:
     contents: read
     pull-requests: write
   ```
2. Test workflow validity locally with act:
   ```bash
   act -l # List available workflows
   act -W .github/workflows/ci.yml # Test CI workflow locally
   ```

---

## All Recipes Index (Searchable)
| Recipe ID | Category | Keywords | Link |
|-----------|----------|----------|------|
| W001 | Wallet | freighter, detect, not found, connection | [Freighter Wallet Not Detected](#recipe-freighter-wallet-not-detected) |
| W002 | Wallet | signing, reject, transaction, error, toast | [Wallet Transaction Signing Rejected](#recipe-wallet-transaction-signing-rejected) |
| R001 | RPC | timeout, connect, soroban, endpoint, network | [Soroban RPC Connection Timeouts](#recipe-soroban-rpc-connection-timeouts) |
| R002 | RPC | stream, disconnect, event, indexer, cursor | [RPC Event Streaming Disconnects](#recipe-rpc-event-streaming-disconnects) |
| D001 | Database | postgres, connection, refused, docker, port | [PostgreSQL Connection Refused](#recipe-postgresql-connection-refused) |
| D002 | Database | migration, typeorm, out-of-order, unique, constraint | [TypeORM Migration Failures](#recipe-typeorm-migration-failures) |
| D003 | Database | redis, cache, session, ping, memory | [Redis Cache Connection Issues](#recipe-redis-cache-connection-issues) |
| C001 | CI | flaky, test, intermittent, pass-locally | [Cross-Test Flakiness in CI](#recipe-cross-test-flakiness-in-ci) |
| C002 | CI | permissions, github-actions, secret, workflow | [Workflow Permission Errors](#recipe-workflow-permission-errors) |

---

## Related Docs
- [Wave Contributor Quickstart](./WAVE_CONTRIBUTOR_QUICKSTART.md)
- [CI Troubleshooting Runbook](./wave/CI_TROUBLESHOOTING_RUNBOOK.md)
- [Frontend Wallet Foundation](./FRONTEND_WALLET_FOUNDATION.md)
- [Backend Indexer Foundation](./BACKEND_INDEXER_FOUNDATION.md)
- [Local Infrastructure Stack](./LOCAL_INFRA_STACK.md)
- [Soroban Local Dev Guide](./SOROBAN_LOCAL_DEV.md)