# Frontend Data Flow Walkthrough: Soroban Contract to UI State

## Overview
This document provides a comprehensive walkthrough of how on-chain Soroban contract data flows through the TypeScript SDK, backend indexer, and frontend to become usable UI state. We'll use the core gameplay path of **creating a game session and submitting guesses** as our primary example to illustrate the complete end-to-end flow.

## Architecture Layers Overview
```
Soroban Contract (on-chain) → TypeScript SDK → Backend Indexer → Frontend State → UI Rendering
```

---

## 1. Contract Layer (Authoritative Source)
The `core_game` Soroban contract serves as the single source of truth for all game state. It maintains:
- Day configurations (`get_day_config`)
- Active player sessions (`get_session`)
- Event emissions for state changes

### Key Contract Methods
```rust
// Read-only methods (query state)
fn get_day_config(env: Env, day_id: u32) -> DayConfig;
fn get_session(env: Env, session_id: Bytes) -> Session;

// State-changing methods (emit events)
fn create_session(env: Env, player: Address, day_id: u32, nonce: u64);
fn submit_guess(env: Env, player: Address, session_id: Bytes, ...);
```

### Contract Events (Authoritative Transitions)
When state changes, the contract emits events that serve as the canonical record of what happened:
- `session_created`: When a new game session is initialized
- `guess_submitted`: When a player submits a word guess
- `session_finalized`: When a game is completed (won/lost)

**State Authority**: The Soroban contract is the **only authoritative source** for all game state. All other layers are caches or projections of this source.

---

## 2. TypeScript SDK Layer (Contract Abstraction)
The `@dewordle/soroban-sdk` provides type-safe access to the Soroban contract, handling RPC communication, transaction building, and event decoding.

### SDK Core Components
- **`CoreGameClient`**: Main interface for contract interactions
- **`tx-builder`**: Builds, simulates, and assembles Soroban transactions
- **`events.ts`**: Decodes raw contract events into typed JavaScript objects
- **`network.ts`**: Manages network configurations and contract registry loading

### Reading Contract State (useDayConfig / useSession hooks)
When the frontend needs to read data from the contract:

1. **SDK Initialization**: `CoreGameClient.fromRegistry()` loads network and contract configuration
2. **RPC Call**: The client uses `server.getAccount()` and builds a read-only transaction
3. **Simulation**: Contract state is read via `simulateTransaction()` (no on-chain transaction needed)
4. **Parsing**: Raw ScVal responses are parsed into typed TypeScript objects (`DayConfig`, `Session`)

**Code Path**:
```typescript
// In frontend/src/hooks/useContractRead.ts
const { data } = useDayConfig(dayId); // Returns typed DayConfig from contract
```

**File References**:
- [core-game-client.ts](file:///c:/Users/u-adamu/Desktop/DevMuhdishaq/DeWordle/soroban/sdk/ts/core-game-client.ts)
- [useContractRead.ts](file:///c:/Users/u-adamu/Desktop/DevMuhdishaq/DeWordle/frontend/src/hooks/useContractRead.ts)

### Writing to Contract (Transaction Flow)
When the frontend needs to change contract state (submit a guess):

1. **Build Transaction**: SDK builds the transaction with proper arguments
2. **Simulation**: Transaction is simulated locally to catch errors before submission
3. **Assemble**: Simulated transaction is assembled into final XDR format
4. **Return to Frontend**: SDK returns the assembled transaction XDR for signing

---

## 3. Frontend Wallet Layer (Transaction Signing)
The frontend's wallet integration handles user authentication and transaction signing.

### Key Components
- **`StellarWalletProvider`**: Manages wallet connection state
- **`useStellarWallet`**: Hook for accessing wallet functionality
- **`useGameplayTx`**: Orchestrates transaction lifecycle with optimistic state

### Transaction Execution Flow
When a user submits a guess:

1. **Pre-submit Validation**: `useGameplayTx` checks wallet connection and network matching
2. **Signing**: Transaction enters "signing" state, user approves in their wallet (Freighter)
3. **Submission**: Signed transaction is submitted to Soroban RPC
4. **Status Tracking**: Transaction lifecycle is tracked with optimistic state updates

**Code Path**:
```typescript
// In frontend/src/hooks/useGameplayTx.ts
const { execute } = useGameplayTx();
await execute(transactionXdr, optimisticSessionId);
```

**File References**:
- [stellar-wallet-provider.tsx](file:///c:/Users/u-adamu/Desktop/DevMuhdishaq/DeWordle/frontend/src/providers/stellar-wallet-provider.tsx)
- [useGameplayTx.ts](file:///c:/Users/u-adamu/Desktop/DevMuhdishaq/DeWordle/frontend/src/hooks/useGameplayTx.ts)

---

## 4. Backend Indexer Layer (Event Processing & Projections)
The backend indexer ingests all contract events and maintains read-optimized projections for frontend consumption.

### Indexer Components
- **`IndexerModule`**: NestJS module orchestrating indexer services
- **`EventProcessorService`**: Idempotent event processing with deduplication
- **`ProjectionService`**: Updates read models based on contract events
- **`SessionProjectionEntity`**: Database entity for storing session projections

### Event Ingestion Flow
When a contract event is emitted:

1. **Polling**: Indexer worker polls Soroban RPC for new events
2. **Normalization**: Raw events are normalized into `IngestedEventDto` format
3. **Deduplication**: Events are checked against `IngestedEventEntity` to avoid replay
4. **Processing**: Unique events are processed and projections are updated

### Projection Updates
For `session_finalized` events:
1. Event is validated and sessionId extracted
2. `SessionProjectionEntity` is upserted in the database
3. Projection becomes available via backend API for frontend to query

**State Authority**: Backend projections are **transitional/cached state** - they're derived from contract events but not authoritative. The frontend can always fall back to direct contract reads if projections are stale.

**File References**:
- [event-processor.service.ts](file:///c:/Users/u-adamu/Desktop/DevMuhdishaq/DeWordle/backend/src/indexer/processors/event-processor.service.ts)
- [projection.service.ts](file:///c:/Users/u-adamu/Desktop/DevMuhdishaq/DeWordle/backend/src/indexer/projections/projection.service.ts)

---

## 5. Frontend State Layer (Reconciliation & UI State)
The frontend maintains two types of state that are reconciled to provide a smooth user experience:

### Optimistic State (Transitional UI State)
Created immediately when a transaction is submitted, before chain confirmation:
- Tracks pending transactions to provide immediate UI feedback
- Allows for smooth gameplay without waiting for block confirmations
- Can be rolled back if the transaction fails

**Implementation**:
```typescript
// In frontend/src/lib/stellar/gameplay-flow.ts
export interface OptimisticSessionState {
  sessionId: string;
  isPending: boolean;
  confirmedHash?: string;
  error?: string;
}
```

### Confirmed State (Authoritative UI State)
Updated only when the transaction is confirmed on-chain:
- Derived from contract reads or backend projections
- Reflects the actual state of the contract
- Serves as the source of truth for the UI

### State Reconciliation
The frontend reconciles optimistic and confirmed states to ensure UI consistency:

1. **Transaction Submitted**: Optimistic state is created, UI shows "processing"
2. **Transaction Confirmed**: Optimistic state is merged with confirmed state, UI updates to reflect completed action
3. **Transaction Failed**: Optimistic state is rolled back, error displayed to user

**Code Path**:
```typescript
// In frontend/src/lib/stellar/gameplay-flow.ts
export function reconcileGameplayState(input: {
  status: TxLifecycleStatus;
  optimisticSessionId?: string;
  txHash?: string;
}): GameplayTxSnapshot {
  // Implements state reconciliation logic
}
```

---

## 6. Complete Gameplay Path Example: Create & Play a Game

### Step 1: User loads the game page
- Frontend calls `useDayConfig(today's dayId)`
- SDK reads `core_game.get_day_config()` from Soroban
- Day configuration is available to UI, game board renders

### Step 2: User starts a new game
- Frontend calls `coreGameClient.buildCreateSessionTx()` via SDK
- Transaction is built and simulated, returns XDR
- `useGameplayTx.execute()` is called with the transaction XDR
- **Optimistic state**: UI immediately shows new session in "pending" state
- User signs transaction in wallet, transaction is submitted to RPC

### Step 3: Transaction is mined and confirmed
- Soroban contract emits `session_created` event
- Backend indexer polls, ingests, and processes the event
- `SessionProjectionEntity` is created in backend database

### Step 4: User submits a guess
- Same transaction flow repeats for `submit_guess`
- Optimistic state updates UI to show the guess being processed
- Contract emits `guess_submitted` event, indexer updates projection

### Step 5: User completes the game
- Final guess submission triggers `session_finalized` event
- Backend projection updates session status to "Finalized"
- Frontend reconciles confirmed state, UI shows game completion screen
- User can view their finalized session in the sessions list, which queries backend projections

---

## State Authority Matrix
| Layer                  | Type           | Source of Truth? | Purpose                                      |
|------------------------|----------------|------------------|----------------------------------------------|
| Soroban Contract       | On-chain state | ✅ Yes           | Single authoritative source of all game state |
| TypeScript SDK Cache   | In-memory      | ❌ No            | Type-safe contract interaction abstraction   |
| Backend Projections   | Database       | ❌ No            | Read-optimized views for efficient querying  |
| Frontend Optimistic    | React state    | ❌ No            | Immediate UI feedback during transactions    |
| Frontend Confirmed     | React state    | ❌ No            | Reconciled state for UI rendering            |

---

## Key Extension Points
Areas where contributors can extend the data flow:
- Add new event types to the SDK's event decoder
- Create new backend projections for leaderboards or statistics
- Implement caching strategies in the frontend to reduce RPC calls
- Add more sophisticated optimistic state rollback logic
- Extend the indexer to support real-time WebSocket updates

## Validation & Testing
The data flow is validated through:
- Contract tests verifying correct event emission
- SDK integration tests verifying transaction building
- Backend indexer tests verifying event processing and projection updates
- Frontend tests verifying state reconciliation and UI updates
- End-to-end tests validating the complete gameplay flow