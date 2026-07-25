# Debugging Guide

This guide covers common issues encountered during DeWordle development and how to troubleshoot them.

## Enabling Debug Mode

Toggle debug logging in the browser console:

```ts
import { debug } from '@/lib/debug';

// Enable debug mode
debug.enable();

// Disable debug mode
debug.disable();

// Check if enabled
debug.isEnabled(); // → boolean
```

Debug mode persists across page reloads via `localStorage` under the `DEBUG_ENABLED` key.

---

## Wallet Connection Failures

### Symptoms
- Wallet modal opens but connection never resolves
- "User rejected the request" error in console
- Wallet address not updating in the UI

### Common Causes

1. **Browser extension not installed or blocked**
   - Ensure Freighter or Albedo extension is installed and enabled.
   - Check that the extension is not blocked by another extension (e.g., ad blocker).

2. **Network mismatch**
   - The wallet is connected to a different Stellar network than the app expects.
   - Switch to the correct network (testnet/mainnet) in the wallet extension.

3. **CSP blocking wallet requests**
   - Inspect the Content Security Policy headers in `next.config.ts`.
   - Ensure `connect-src` includes the Stellar Horizon and Soroban RPC endpoints.

4. **Stale session state**
   - Clear `localStorage` keys `accessToken` and `user`.
   - Reload the page and reconnect.

### Debug Steps

1. Open browser DevTools → Network tab.
2. Filter by `horizon` or `soroban` to inspect RPC calls.
3. Enable debug mode (`debug.enable()`) and check for `WALLET_*` log entries.
4. Check the wallet extension console for connection errors.

---

## Contract Errors

### Symptoms
- Transaction simulation fails
- "Contract execution failed" errors
- Soroban RPC returns error responses

### Common Causes

1. **Contract not deployed**
   - Verify the contract ID in `.env` matches the deployed contract on the target network.
   - Use `soroban contract invoke --help` to check contract status.

2. **Auth mismatch**
   - The contract requires an `invoke_auth` signer that doesn't match the connected wallet.
   - Ensure the wallet address matches the expected signer.

3. **Insufficient funds**
   - The wallet lacks XLM for the minimum balance or transaction fee.
   - Fund the account using a Stellar testnet faucet.

4. **Schema mismatch**
   - The on-chain contract ABI doesn't match the SDK call.
   - Regenerate the TypeScript types from the contract spec.

### Debug Steps

1. Enable debug mode and check `CONTRACT_*` log entries.
2. Check the Stellar Explorer for transaction details.
3. Use `soroban contract invoke` CLI to test the contract directly.

---

## Indexer Issues

### Symptoms
- Session history shows stale or missing data
- API returns empty results for known sessions
- Database connection errors in backend logs

### Common Causes

1. **Indexer not running**
   - Ensure the indexer service is started: `docker compose up indexer`.
   - Check that the indexer is consuming Stellar ledger events.

2. **Database connection lost**
   - Verify the `DATABASE_URL` in the backend `.env` points to a running database.
   - Check if the database container is healthy.

3. **Event replay needed**
   - If the indexer fell behind, replaying events from the last known ledger may resolve gaps.
   - Check the indexer's last processed ledger in its status endpoint.

### Debug Steps

1. Check backend logs for indexer-related errors.
2. Query the `/api/v1/sessions` endpoint with `skip=0&take=5` to verify data.
3. Check the indexer health endpoint at the configured URL.

---

## Database Issues

### Symptoms
- 500 errors on API calls that write data
- "Connection refused" in backend logs
- Slow query performance

### Common Causes

1. **Database not running**
   - Start the database: `docker compose up db`.
   - Verify it's listening on the expected port.

2. **Migration not applied**
   - Run pending migrations: `npm run migration:run` in the backend directory.
   - Check for schema drift between environments.

3. **Connection pool exhausted**
   - Increase `DB_POOL_SIZE` in the environment configuration.
   - Close idle connections or restart the database.

### Debug Steps

1. Connect to the database directly using a client (e.g., `psql`, TablePlus).
2. Check for active connections and long-running queries.
3. Enable query logging in the backend to trace slow queries.

---

## Stellar Network Issues

### Symptoms
- Transactions stuck in "pending" state
- "Transaction not found" errors
- Horizon server returning 503 or rate-limit responses

### Common Causes

1. **Network congestion**
   - Stellar testnet can experience congestion during maintenance windows.
   - Wait and retry the transaction.

2. **Rate limiting**
   - Horizon enforces rate limits (100 requests/second on testnet).
   - Implement exponential backoff in API calls.

3. **Incorrect network endpoint**
   - Verify `NEXT_PUBLIC_STELLAR_NETWORK` points to the correct Horizon URL.
   - Testnet: `https://horizon-testnet.stellar.org`
   - Mainnet: `https://horizon.stellar.org`

### Debug Steps

1. Check the Stellar network status page: https://stellar.org/status
2. Enable debug mode and monitor `NETWORK_*` log entries.
3. Use the Stellar CLI to submit a simple payment and verify connectivity.

---

## General Debugging Checklist

- [ ] Enable debug mode in the browser (`debug.enable()`)
- [ ] Check browser console for errors
- [ ] Check network tab for failed requests
- [ ] Verify environment variables match expected values
- [ ] Clear localStorage and hard-refresh if state seems stale
- [ ] Check backend logs for server-side errors
- [ ] Verify Docker services are running (`docker compose ps`)
