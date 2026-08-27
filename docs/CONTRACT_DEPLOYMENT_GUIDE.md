# Contract Deployment and WASM Artifact Verification

> Resolves #1295

## Overview

DeWordle deploys four Soroban smart contracts to the Stellar network. This guide covers building, verifying, and deploying WASM artifacts.

## Building Contracts

### Prerequisites

```bash
rustup target add wasm32-unknown-unknown
cargo install --locked soroban-cli
```

### Build All Contracts

```bash
cd soroban
cargo build --target wasm32-unknown-unknown --release
```

### Build a Single Contract

```bash
cd soroban
cargo build --target wasm32-unknown-unknown --release -p core_game
```

### WASM Artifact Locations

After building, artifacts are at:

```
soroban/target/wasm32-unknown-unknown/release/
├── core_game.wasm
├── rewards.wasm
├── achievements.wasm
└── admin_registry.wasm
```

## Verifying WASM Artifacts

### Inspect a WASM file

```bash
soroban contract inspect --wasm soroban/target/wasm32-unknown-unknown/release/core_game.wasm
```

This shows the contract's exported functions, storage types, and metadata.

### Verify checksum

```bash
sha256sum soroban/target/wasm32-unknown-unknown/release/core_game.wasm
```

Record the hash for deployment reproducibility.

## Deployment Order

Deploy in dependency order (admin_registry first, as other contracts may reference it):

```bash
# 1. Admin Registry
soroban contract deploy \
  --wasm soroban/target/wasm32-unknown-unknown/release/admin_registry.wasm \
  --network $SOROBAN_NETWORK

# 2. Core Game
soroban contract deploy \
  --wasm soroban/target/wasm32-unknown-unknown/release/core_game.wasm \
  --network $SOROBAN_NETWORK

# 3. Rewards
soroban contract deploy \
  --wasm soroban/target/wasm32-unknown-unknown/release/rewards.wasm \
  --network $SOROBAN_NETWORK

# 4. Achievements
soroban contract deploy \
  --wasm soroban/target/wasm32-unknown-unknown/release/achievements.wasm \
  --network $SOROBAN_NETWORK
```

## Post-Deployment Setup

### Initialize Each Contract

```bash
# Admin Registry
soroban contract invoke \
  --id <ADMIN_REGISTRY_CONTRACT_ID> \
  --fn init \
  --arg admin <ADMIN_ADDRESS>

# Core Game
soroban contract invoke \
  --id <CORE_GAME_CONTRACT_ID> \
  --fn init \
  --arg admin <ADMIN_ADDRESS>

# Rewards
soroban contract invoke \
  --id <REWARDS_CONTRACT_ID> \
  --fn init \
  --arg admin <ADMIN_ADDRESS>

# Achievements
soroban contract invoke \
  --id <ACHIEVEMENTS_CONTRACT_ID> \
  --fn init \
  --arg admin <ADMIN_ADDRESS>
```

### Register Contracts in Admin Registry

```bash
soroban contract invoke \
  --id <ADMIN_REGISTRY_CONTRACT_ID> \
  --fn set_contract \
  --arg key core_game \
  --arg contract_address <CORE_GAME_CONTRACT_ID>
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SOROBAN_RPC_URL` | Soroban RPC endpoint | `https://soroban-testnet.stellar.org` |
| `SOROBAN_NETWORK` | Network passphrase | `testnet` or `mainnet` |
| `SOROBAN_CORE_GAME_CONTRACT_ID` | Deployed core game contract | `CAXXX...` |

## Verification Checklist

- [ ] All four WASM files built successfully
- [ ] `soroban contract inspect` shows expected functions
- [ ] SHA256 checksums recorded
- [ ] Contracts deployed in correct order
- [ ] Each contract initialized with admin address
- [ ] Contracts registered in admin registry
- [ ] Test invoke calls succeed
- [ ] Frontend `NEXT_PUBLIC_FEATURE_REWARDS` and `NEXT_PUBLIC_FEATURE_ACHIEVEMENTS` enabled
