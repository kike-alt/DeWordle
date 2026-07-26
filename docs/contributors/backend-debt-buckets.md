# Contributor Guide: Legacy Backend Technical Debt Buckets

To accelerate our system refinement tracks, legacy backend tech debt is divided into three isolated refactoring modules. Use this guide to pick a cleanup target without needing to re-map module boundaries from scratch.

---

## 🪣 1. Persistence Layer & Index Alignment Optimization
* **Scope Boundary:** Redundant queries, missing composite indices, and unoptimized TypeORM entity relations.
* **Target Directory:** `backend/src/entities/`
* **Issue Label Filter:** `area:backend`, `type:performance`
* **Validation Path:** 
  1. Boot up local tracking via `npm run db:sync`.
  2. Inspect execution query paths via `EXPLAIN` matching patterns before and after entity changes.
  3. Generate and run reversible TypeORM migrations using:
     ```bash
     npx typeorm-ts-node-commonjs migration:generate -d src/data-source.ts src/migrations/PerfOptimization
     ```

## 🪣 2. Real-Time Infrastructure Decoupling
* **Scope Boundary:** Moving direct inline event emissions out of REST controllers and extracting them cleanly into background event streams and gateways.
* **Target Directory:** `backend/src/realtime/`, `backend/src/modules/`
* **Issue Label Filter:** `area:realtime`, `type:refactor`
* **Validation Path:**
  1. Assert WebSocket handler handshake security protocols using a local test client socket frame.
  2. Run dedicated gateway unit specs to verify decoupled event isolation:
     ```bash
     npm run test -- src/realtime/realtime.spec.ts
     ```

## 🪣 3. State Machine Escrow Guarding
* **Scope Boundary:** Hardcoded validation rules, complex switch statements, and untracked status transitions in the core escrow contract settlement state machine.
* **Target Directory:** `backend/src/modules/escrow/`
* **Issue Label Filter:** `area:escrow`, `type:debt`
* **Validation Path:**
  1. Verify data state changes against test scenarios using your standard testing sandbox layer.
  2. Trigger the isolated state verification suite to confirm compatibility with current Soroban network smart contract rules:
     ```bash
     npm run test:escrow-states
     ```

---

## 🚨 General Cleanup Safety Guidelines
* **Zero Functional Regressions:** Refactoring updates must focus strictly on performance and clean architecture. Do not alter functional API response contract fields or database column models unless explicitly outlined in a tracked issue ticket.
* **Test Isolation:** Ensure all mock fixtures are completely cleared between individual test runners to prevent test state leakage.