# Soroban SDK Guide

The SDK scaffold lives in `soroban/sdk/ts`.

## Core modules
- `network.ts`: network and contract registry types/loaders
- `core-game-client.ts`: typed contract client scaffolding
- `tx-builder.ts`: build + simulate + assemble transaction helpers
- `events.ts`: event shape decoding utilities
- `types.ts`: shared domain types

## Usage pattern
1. Load network config.
2. Load contract registry.
3. Instantiate `CoreGameClient.fromRegistry(...)`.
4. Build and simulate transaction.
5. Sign in frontend wallet layer.
6. Submit signed transaction via Soroban RPC.

---

## Integration Examples

### FE: Wallet-driven transaction flow

```typescript
import {
  NETWORKS,
  loadContractRegistry,
  CoreGameClient,
  pollTransaction,
} from "@dewordle/soroban-sdk";

// 1. Load registry (from env or injected provider)
const registry = await loadContractRegistry("testnet");
const network = NETWORKS["testnet"];

// 2. Instantiate client
const client = CoreGameClient.fromRegistry(network, registry);

// 3. Build tx (no wallet assumptions in SDK layer)
const { assembled } = await client.buildCreateSessionTx(playerPublicKey, dayId, nonce);

// 4. Sign in wallet (FE responsibility)
const signedXdr = await wallet.signTransaction(assembled.toXDR());

// 5. Submit and poll
const { hash } = await submitSignedTx(network, signedXdr);
const result = await pollTransaction({ server, txHash: hash });
console.log("Session created, status:", result.status);
```

### BE: Indexer-driven event processing

```typescript
import {
  decodeEvent,
  isCoreGameEvent,
  isRewardsEvent,
  loadRegistryFromEnv,
} from "@dewordle/soroban-sdk";

// Load registry from environment variables
const registry = loadRegistryFromEnv();

// Process raw events from Soroban RPC poller
function processEvent(raw: { contractId: string; topic: string; value: unknown }) {
  const decoded = decodeEvent(raw);

  if (isCoreGameEvent(decoded.topic)) {
    console.log("Core game event:", decoded.topic, decoded.payload);
    // e.g. persist to read model
  } else if (isRewardsEvent(decoded.topic)) {
    console.log("Rewards event:", decoded.topic, decoded.payload);
  } else {
    console.warn("Unknown event topic:", decoded.topic);
  }
}
```

### Loading registry from a JSON file (Node.js / BE)

```typescript
import { loadRegistryFromJson } from "@dewordle/soroban-sdk";
import contractsJson from "../soroban/config/contracts.testnet.json";

const registry = loadRegistryFromJson(contractsJson);
```

### Loading registry from a runtime provider (FE)

```typescript
import { loadContractRegistry } from "@dewordle/soroban-sdk";

const registry = await loadContractRegistry("testnet", async () => {
  const res = await fetch("/api/contracts");
  return res.json();
});
```

