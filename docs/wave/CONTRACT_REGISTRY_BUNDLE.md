# Contract Registry Config Bundle

**ID:** INFRA-204

## Purpose

Define a durable bundle format for contract registry configuration so
backend, SDK, and frontend consumers can agree on environment
configuration for Soroban contract interactions.

## Bundle format

A registry bundle is a JSON file with the following shape:

```json
{
  "network":     "testnet | mainnet | local",
  "rpcUrl":      "https://...",
  "passphrase":  "Network passphrase for signing",
  "contracts": {
    "admin_registry": "C...",
    "core_game":      "C...",
    "rewards":        "C...",
    "achievements":   "C..."
  }
}
```

### Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `network` | string | ✅ | Target network identifier |
| `rpcUrl` | string | ⬜ | Soroban RPC endpoint URL |
| `passphrase` | string | ⬜ | Stellar network passphrase |
| `contracts` | object | ✅ | Map of contract key → contract ID |

### Contract keys

The `contracts` object SHALL contain exactly these four keys:

| Key | Contract |
|---|---|
| `admin_registry` | Admin registry contract |
| `core_game` | Core game contract |
| `rewards` | Rewards contract |
| `achievements` | Achievements contract |

Consumers MUST NOT add unknown keys; producers MUST NOT remove required
keys.

## Sample manifests

| File | Environment |
|---|---|
| `soroban/config/contracts.local.json` | Local / standalone Soroban |
| `soroban/config/contracts.testnet.json` | Stellar testnet |
| `soroban/config/contracts.mainnet.json` | Stellar mainnet |

## How consumers load the bundle

### TypeScript / SDK

```typescript
import { loadRegistryFromJson } from "@soroban/sdk/ts/network";

const registry = loadRegistryFromJson(bundleJson);
const contractId = resolveContractId(registry, "core_game");
```

### Node.js script

```javascript
const registry = loadRegistryFromJson(require("../soroban/config/contracts.testnet.json"));
```

### Validation

```bash
node scripts/validate-registry-bundle.js soroban/config/contracts.testnet.json
```

## Validation rules

1. `network` must be `"testnet"`, `"mainnet"`, or `"local"`.
2. All four required contract keys must be present with non-empty values.
3. No unknown contract keys are allowed.
4. Contract IDs should be valid Stellar contract identifiers (C-prefixed
   base-32 strings), though the validator only checks that they are
   non-empty strings.

## Related

- [Soroban Deploy Topology](../DEPLOY_TOPOLOGY.md) — how registries fit
  into deployment architecture
- `scripts/validate-registry-bundle.js` — validation script
- `soroban/sdk/ts/network.ts` — registry loader implementations
