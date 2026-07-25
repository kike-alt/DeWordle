# Soroban Local Development

## Prerequisites
- Rust stable
- `wasm32-unknown-unknown` target
- Soroban CLI

## Build Workspace
```bash
cd soroban
cargo check --workspace
```

## Build Wasm Artifacts
```bash
cd soroban
cargo build --workspace --target wasm32-unknown-unknown --release
```

## Scripts
- Deploy scaffold: `soroban/scripts/deploy/deploy-testnet.sh`
- Invoke scaffold: `soroban/scripts/invoke/invoke-core-game.sh`

## Network Registry
Update contract IDs in:
- `soroban/config/contracts.testnet.json`
- `soroban/config/contracts.mainnet.json`

## Testnet Environment Variables

When running scripts against testnet, set the following variables.

| Variable | Required | Notes |
|---|---|---|
| `STELLAR_NETWORK` | ✅ | Set to `testnet` |
| `STELLAR_RPC_URL` | ✅ | Soroban RPC endpoint |
| `STELLAR_SECRET_KEY` | ✅ | Deployer account key |
| `STELLAR_NETWORK_PASSPHRASE` | ✅ | Network passphrase |
| `CONTRACT_*_ID` | ⬜ | Falls back to `contracts.testnet.json` |

**Quick check** — verify your env before running scripts:
```bash
echo "Network: $STELLAR_NETWORK"
echo "RPC: $STELLAR_RPC_URL"
[[ -z "$STELLAR_SECRET_KEY" ]] && echo "WARNING: STELLAR_SECRET_KEY not set"
```
