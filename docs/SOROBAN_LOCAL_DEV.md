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

## Troubleshooting & FAQ

### 1. CLI Version Compatibility Matrix

| stellar-cli version | Rust toolchain | Supported contracts | Notes |
|---|---|---|---|
| `0.40.x` | `stable` (≥1.76) | core_game, achievements, admin_registry, rewards | Recommended for local dev |
| `0.36.x – 0.39.x` | `stable` (≥1.72) | core_game, achievements | Requires minor SDK patches |
| `< 0.36` | `nightly-2024-02-01` | Limited | Not recommended |

Install the recommended version:
```bash
cargo install stellar-cli@0.40.1 --features opt
```

### 2. RPC Connection Timeout

If `stellar contract invoke` hangs or times out:

```bash
# Verify the container is running
docker ps --filter name=stellar

# Check the RPC endpoint is reachable
curl -s http://localhost:8000/soroban/rpc -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' | jq .

# Increase timeout in your .env
STELLAR_RPC_TIMEOUT=30000
```

### 3. Network Passphrase Mismatch

Error: `"passphrase does not match"` or `"network mismatch"`.

Verify the passphrase matches your target network:

| Network | Passphrase |
|---|---|
| Standalone (local) | `Standalone Network ; February 2017` |
| Testnet | `Test SDF Network ; September 2015` |
| Mainnet | `Public Global Stellar Network ; September 2015` |

Set it correctly in your environment:
```bash
export STELLAR_NETWORK_PASSPHRASE="Standalone Network ; February 2017"
```

### 4. Secret Key Generation

Generate a new Stellar secret key for local development:
```bash
# Install if needed: cargo install stellar-cli --features opt
stellar keys generate dev-key --network local
echo "STELLAR_SECRET_KEY=$(stellar keys show dev-key)"
```

Or using node:
```bash
node -e "const sdk = require('@stellar/stellar-sdk'); const kp = sdk.Keypair.random(); console.log('Secret:', kp.secret()); console.log('Public:', kp.publicKey())"
```

### 5. Wasm Build Failures

If `cargo build --target wasm32-unknown-unknown` fails:

```bash
# Ensure the target is installed
rustup target add wasm32-unknown-unknown

# Update soroban-sdk dependency version in Cargo.toml to match your CLI
cargo update -p soroban-sdk

# Clean and rebuild
cargo clean
cargo build --target wasm32-unknown-unknown --release
```
