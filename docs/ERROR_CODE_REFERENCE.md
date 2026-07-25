# Error Code Reference

This document maps common error codes and messages to their causes and troubleshooting steps.

## Wallet Errors

| Code | Error Message | Cause | Resolution |
|------|--------------|-------|------------|
| `WALLET_NOT_FOUND` | No wallet extension detected | Freighter or Albedo extension not installed | Install the Freighter browser extension |
| `WALLET_REJECTED` | User rejected the request | User clicked "Reject" in the wallet popup | Retry the connection and approve in the wallet |
| `WALLET_NETWORK_MISMATCH` | Connected to wrong network | Wallet is on a different Stellar network | Switch network in the wallet extension settings |
| `WALLET_LOCKED` | Wallet is locked | The wallet extension is locked | Unlock the wallet in the extension |
| `WALLET_TIMEOUT` | Connection timed out | Wallet popup was ignored or slow to respond | Retry the connection |

## Contract Errors

| Code | Error Message | Cause | Resolution |
|------|--------------|-------|------------|
| `CONTRACT_NOT_FOUND` | Contract does not exist | Contract ID is incorrect or not deployed | Verify contract ID and redeploy if necessary |
| `CONTRACT_AUTH_FAILED` | Authorization required | Signer mismatch with contract requirements | Connect the correct wallet/account |
| `CONTRACT_INSUFFICIENT_FUNDS` | Insufficient XLM balance | Account lacks funds for transaction | Fund the account via testnet faucet |
| `CONTRACT_SIM_FAILED` | Simulation failed | Contract logic error or invalid arguments | Check contract args and state |
| `CONTRACT_TX_EXPIRED` | Transaction expired | Ledger close time exceeded | Resubmit the transaction promptly |
| `CONTRACT_INSUFFICIENT_FEE` | Insufficient transaction fee | Fee too low for current network conditions | Increase the transaction fee |

## Network Errors

| Code | Error Message | Cause | Resolution |
|------|--------------|-------|------------|
| `NETWORK_HORIZON_DOWN` | Horizon server unavailable | Stellar Horizon endpoint is down | Wait and retry; check status page |
| `NETWORK_RATE_LIMITED` | Rate limit exceeded | Too many requests in short period | Implement backoff; reduce request frequency |
| `NETWORK_TIMEOUT` | Request timed out | Network latency or server overload | Retry with exponential backoff |
| `NETWORK_CORS_ERROR` | CORS policy blocked request | Origin not allowed by server CSP | Check CSP headers and allowed origins |

## API Errors

| Code | Error Message | Cause | Resolution |
|------|--------------|-------|------------|
| `API_401` | Unauthorized | Missing or invalid auth token | Re-authenticate or refresh the token |
| `API_403` | Forbidden | Insufficient permissions | Check account role and permissions |
| `API_404` | Not Found | Resource does not exist | Verify the resource ID or endpoint |
| `API_429` | Too Many Requests | Rate limit on API | Wait and retry with backoff |
| `API_500` | Internal Server Error | Server-side failure | Check backend logs for details |
| `API_503` | Service Unavailable | Backend service is down | Wait and retry; check service health |

## Database Errors

| Code | Error Message | Cause | Resolution |
|------|--------------|-------|------------|
| `DB_CONNECTION_REFUSED` | Connection refused | Database not running or wrong host/port | Start the database; verify connection string |
| `DB_TIMEOUT` | Query timeout | Long-running query or lock contention | Optimize query; check for deadlocks |
| `DB_POOL_EXHAUSTED` | Connection pool exhausted | Too many concurrent connections | Increase pool size; close idle connections |

## Authentication Errors

| Code | Error Message | Cause | Resolution |
|------|--------------|-------|------------|
| `AUTH_INVALID_CREDENTIALS` | Invalid email or password | Wrong login credentials | Double-check email and password |
| `AUTH_USER_NOT_FOUND` | User not found | Account doesn't exist | Sign up for a new account |
| `AUTH_TOKEN_EXPIRED` | Session expired | Auth token has expired | Re-login to get a new token |
| `AUTH_RATE_LIMITED` | Too many login attempts | Too many failed attempts | Wait before retrying |

## General Error Handling

### Enabling Debug Logging

Set `localStorage.DEBUG_ENABLED = "true"` in the browser console to see detailed error traces:

```ts
debug.enable();
```

Debug logs include category prefixes like `[WALLET]`, `[CONTRACT]`, `[NETWORK]`, `[API]` for easy filtering.

### Reporting Issues

When filing a bug report, include:
1. The exact error code from the console
2. The debug log output (if debug mode was enabled)
3. Browser name and version
4. Steps to reproduce
