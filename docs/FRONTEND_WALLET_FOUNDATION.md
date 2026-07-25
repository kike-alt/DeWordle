# Frontend Wallet Foundation

> This document covers the canonical frontend wallet integration for DeWordle.
> The wallet layer lives in `frontend/src/lib/stellar/` and is a **maintained** surface.
> See [REPO_SURFACE_MAP.md](./REPO_SURFACE_MAP.md) for the full surface status table.

## Architecture

```
frontend/src/
├── lib/stellar/
│   ├── network.ts          — Network configs (testnet / mainnet passphrase, RPC URLs)
│   ├── soroban.ts          — Soroban server config factory + TxLifecycleStatus type
│   └── wallet-flow.ts      — signWithFreighter + submitSignedTransaction helpers
├── providers/
│   └── stellar-wallet-provider.tsx  — React context: connect, disconnect, sign, submit
├── hooks/
│   ├── useStellarWallet.ts — Convenience hook wrapping WalletContext
│   └── useGameplayTx.ts    — Tx lifecycle hook for game session interactions
└── components/
    └── WalletErrorBoundary.tsx — Error boundary for wallet operation failures
```

## Supported Wallets

| Wallet | Mechanism |
|--------|-----------|
| Freighter | `window.freighterApi` — browser extension |
| Stellar Wallets Kit | `window.stellarWalletsKit` — multi-wallet modal |

## Key Concepts

### Network Management

`STELLAR_NETWORKS` in `network.ts` maps `StellarNetwork` values to RPC URL and
network passphrase pairs. `getDefaultNetwork()` reads `NEXT_PUBLIC_STELLAR_NETWORK`
(defaults to `testnet`).

### Transaction Lifecycle

`TxLifecycleStatus` models the full signing lifecycle:
`idle → simulating → signing → submitting → success | error`

All state transitions flow through `StellarWalletProvider` via `setTxStatus`.

### Account Switch Detection

The provider polls Freighter on tab focus and `visibilitychange` events to detect
account switches (the Freighter extension does not emit DOM events for this).

## Adding a New Wallet Provider

1. Implement the connect/sign/disconnect interface in `wallet-flow.ts`
2. Extend the `WalletKitLike` type in `stellar-wallet-provider.tsx` if needed
3. Add a test in `frontend/src/test/wallet-reconnect.spec.tsx`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_STELLAR_NETWORK` | `testnet` or `mainnet` (default: `testnet`) |
| `NEXT_PUBLIC_API_URL` | Backend API base URL |

## Further Reading

- [Soroban Foundation Architecture](./SOROBAN_FOUNDATION_ARCHITECTURE.md)
- [Soroban Local Dev](./SOROBAN_LOCAL_DEV.md)
- [Backend Indexer Foundation](./BACKEND_INDEXER_FOUNDATION.md)
