# Local Sandbox Walkthrough: Wallet, Indexer, and Soroban Tests

This is the single-source walkthrough for running the complete local development environment, including the wallet sandbox, backend indexer, and Soroban contract validation. Follow this guide to spin up and validate your local development stack end-to-end.

## Overview
This walkthrough covers three core maintained surfaces working together:
1. **Frontend Wallet Sandbox** - Test wallet connection states and transaction lifecycle UI
2. **Backend Indexer** - Validate event ingestion, projections, and database persistence
3. **Soroban Contracts** - Run unit, integration, and local network tests for all on-chain logic

---

## Prerequisites First
Before starting, ensure you have all dependencies installed:

### System Dependencies
```bash
# Required for all surfaces
node -v          # >= 20.0.0
npm -v           # >= 9.0.0
rustc --version  # >= 1.75.0
cargo --version
docker --version # >= 25.0.0
docker compose version
soroban --version # >= 22.0.0 (Soroban CLI)
```

### Install Project Dependencies
```bash
# From repository root
npm run install:all  # Installs dependencies for frontend, backend, and sets up Rust toolchain
```

---

## Step 1: Start Local Infrastructure Stack
The local Docker Compose stack runs Postgres and (optionally) the RPC proxy needed for the indexer.

### Start Postgres (Required for Indexer)
```bash
# From repository root
./scripts/infra-up.sh postgres
```

This starts:
- PostgreSQL 15 on `localhost:5432`
- Database: `dewordledb`, User: `dewordledb_owner`, Password: `password`

### Verify Postgres is Running
```bash
docker compose -f backend/docker-compose.yml ps
# You should see postgres with "Up" status
```

### Run Database Migrations
First-time setup (or after resetting the database volume):
```bash
cd backend
npm run typeorm:migration:run
npm run seed:words  # Seeds the word list database
```

---

## Step 2: Run Soroban Tests & Validation
Validate all smart contracts and shared crates before starting other services.

### Unit Tests (Fast, Local Rust Tests)
```bash
cd soroban
cargo check --workspace          # Validate compilation across all crates
cargo test --workspace           # Run all unit tests
```

### Local Sandbox Network Tests
To run tests against a local Soroban sandbox node (requires Soroban CLI):
```bash
# Start local sandbox node in background
soroban network start local

# Deploy all contracts to local sandbox
./scripts/deploy/deploy-local.sh

# Run integration tests against local sandbox
cargo test --package integration-tests -- --nocapture
```

### Common Soroban Pitfalls & Recovery
| Issue | Symptom | Fix |
|-------|---------|-----|
| Wasm compilation failure | `unknown target 'wasm32-unknown-unknown'` | Run `rustup target add wasm32-unknown-unknown` |
| Sandbox port conflict | `address already in use` | Run `soroban network stop local && soroban network start local` |
| Outdated Soroban CLI | `unrecognized command` | Run `cargo install --locked stellar-cli@soroban/latest` |
| Contract deployment failures | `insufficient funds` | Fund your local account with `soroban account fund --network local <YOUR_ADDRESS>` |

---

## Step 3: Run Backend Indexer & Tests
The indexer ingests Soroban events and maintains real-time projections.

### Validate Indexer Code
```bash
cd backend
# Lint only the maintained indexer surface (faster than full backend lint)
npm run lint:ci

# Run all indexer tests in sequence (required for database-dependent tests)
npm run test:ci

# Expected output: All indexer tests passing, 0 failures
```

### Start Indexer in Development Mode
To run the indexer against testnet or local sandbox:
```bash
# Copy example environment file
cp .env.example .env

# Configure Soroban RPC (for local sandbox use)
# Set SOROBAN_RPC_URL=http://localhost:8000 in .env

# Start backend with indexer worker
npm run start:dev
```

The indexer will automatically:
- Connect to the Soroban RPC endpoint
- Start ingesting contract events
- Update database projections in real-time
- Log health status every 30 seconds

### Indexer Health Check
```bash
# Verify indexer is running and processing events
curl http://localhost:3000/api/v1/indexer/health
# Should return: {"status":"healthy","lastProcessedLedger":<number>,"queueSize":0}
```

### Common Indexer Pitfalls & Recovery
| Issue | Symptom | Fix |
|-------|---------|-----|
| Database connection refused | `ECONNREFUSED 5432` | Run `./scripts/infra-up.sh postgres` to restart Postgres |
| Pending migrations | `relation does not exist` | Run `npm run typeorm:migration:run` to apply pending migrations |
| RPC rate limiting | `429 Too Many Requests` | Start the RPC proxy: `./scripts/infra-up.sh proxy` and update `.env` to use `http://localhost:7545` |
| Indexer stuck processing | Ledger number stops updating | Restart the backend: `npm run start:dev` - indexer resumes from last processed ledger |
| Cursor service failures | `cursor not found` in logs | Run the cursor repair script: `ts-node scripts/repair-cursor.ts` |

---

## Step 4: Run Frontend Wallet Sandbox
The wallet sandbox page lets you test all wallet connection states and transaction UI flows.

### Start Frontend Development Server
```bash
cd frontend
npm run dev
```

### Access the Wallet Sandbox
Navigate to: `http://localhost:3001/sandbox/wallet-status`

### What You Can Test in the Sandbox
The sandbox provides interactive controls to simulate:
- Wallet connection/disconnection
- All transaction status states:
  - `idle` - Default disconnected state
  - `connecting` - Establishing wallet connection
  - `connected` - Successfully connected
  - `signing` - Waiting for user to sign transaction
  - `submitting` - Transaction submitted to network
  - `confirmed` - Transaction confirmed on-chain
  - `failed` - Transaction failed
  - `rejected` - User rejected the transaction

### Test All Wallet States
1. Click any status button in the "Actions" panel to apply that state
2. Observe how the UI updates in real-time
3. Click "Reset (disconnect)" to return to the idle state
4. Connect your actual Freighter wallet to test real-world flows

### Frontend Wallet & Soroban Validation
```bash
# Validate all maintained frontend wallet and Soroban code
cd frontend
npm run lint:ci && npm run test:ci -- src/lib/stellar src/lib/soroban
```

### Common Sandbox Pitfalls & Recovery
| Issue | Symptom | Fix |
|-------|---------|-----|
| Port 3001 already in use | `EADDRINUSE` | Kill the existing process or run `npm run dev -- --port 3002` |
| Wallet not detected | Freighter installed but not detected | Ensure you're on HTTPS (localhost exempt) or update your wallet's site permissions |
| Sandbox page 404 | Can't reach /sandbox/wallet-status | Verify you're on the latest commit and Next.js has rebuilt the routes |
| Stale environment variables | .env changes not reflected | Restart the dev server to pick up new environment variables |

---

## Full End-to-End Validation Command Sequence
For a fresh checkout, run this sequence to validate everything works:
```bash
# 1. Clone and install
git clone <repo-url>
cd DeWordle
npm run install:all

# 2. Start infrastructure
./scripts/infra-up.sh postgres
sleep 10  # Wait for Postgres to initialize

# 3. Setup database
cd backend
npm run typeorm:migration:run
npm run seed:words

# 4. Validate Soroban
cd ../soroban
cargo check --workspace
cargo test --workspace

# 5. Validate Indexer
cd ../backend
npm run lint:ci
npm run test:ci

# 6. Validate Frontend
cd ../frontend
npm run lint:ci
npm run test:ci -- src/lib/stellar src/lib/soroban

# 7. Start all services (run in separate terminals)
cd ../backend && npm run start:dev
cd ../frontend && npm run dev
```

---

## Troubleshooting Full Stack Issues
When all services are running but something isn't working, follow this debug sequence:

1. **Check individual service logs** first - errors are logged to each service's console
2. **Verify network connectivity** between services:
   - Can frontend reach backend API? `curl http://localhost:3000/api/v1/health`
   - Can backend reach Soroban RPC? `curl $SOROBAN_RPC_URL/health`
   - Is Postgres accepting connections? `psql postgresql://dewordledb_owner:password@localhost:5432/dewordledb -c "SELECT 1"`
3. **Reset everything** if state is corrupted:
   ```bash
   # Stop all services
   ./scripts/infra-up.sh down
   cd soroban && soroban network stop local
   
   # Clean slate restart
   ./scripts/infra-up.sh postgres
   cd ../backend && npm run typeorm:migration:run
   ```

---

## Related Documentation
- [Repository Surface Map](./REPO_SURFACE_MAP.md) - Understand maintained vs legacy code surfaces
- [Backend Indexer Foundation](./BACKEND_INDEXER_FOUNDATION.md) - Deep dive into indexer architecture
- [Frontend Wallet Foundation](./FRONTEND_WALLET_FOUNDATION.md) - Wallet integration details
- [Soroban Local Development](./SOROBAN_LOCAL_DEV.md) - Advanced Soroban local development
- [Local Infrastructure Stack](./LOCAL_INFRA_STACK.md) - Complete Docker Compose documentation
- [Debug Recipe Catalog](./DEBUG_RECIPE_CATALOG.md) - More troubleshooting recipes