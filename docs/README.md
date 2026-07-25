# Developer Documentation Hub

Welcome to the central documentation index. Use the structured paths below to navigate our development, contract architecture, and testing ecosystems.

---

## 🗺️ Critical First Reference: Repository Surface Map
* **[Repository Surface Map: Maintained vs. Legacy](./REPO_SURFACE_MAP.md):** **START HERE FOR ALL CONTRIBUTORS** - The single source of truth for which code paths are canonical, transitional, or legacy. Understand which surfaces are actively maintained, which are in transition, and which are legacy before starting any development.

---

## 🗺️ Core Architecture & Framework Tracks

### 🏗️ Blockchain & Smart Contracts
* **[Soroban Smart Contracts](../soroban/README.md):** Architectural patterns, state structures, and runtime configuration parameters.
* **[Snapshot Approval Guide](./wave/REVIEWER_PLAYBOOK.md):** Reusable templates and reviewer lanes playbook.
* **[Contract Testing Matrix](./contributors/contract-testing.md):** Local execution guides, test coverage requirements, and fixture specifications.

### 💻 Frontend & Application Layer
* **[Wallet Interception Hooks](./FRONTEND_WALLET_FOUNDATION.md):** Deep dives into context mappings, multi-wallet providers, and connection failure handling rules.
* **[Real-time Events Subscriptions](./BACKEND_INDEXER_FOUNDATION.md):** WebSocket tracking routes, connection rooms, and JWT gateway authentication.

---

## 🚀 Contributor Lifecycle Shortcuts
* **[Onboarding Path](./DEVELOPMENT.md):** Quickstart development setup instructions for new engineers.
* **[CI/CD Assurance Gates](../.github/workflows/):** Specifications on unit testing passes and the headless Lighthouse automated performance audit pipelines.