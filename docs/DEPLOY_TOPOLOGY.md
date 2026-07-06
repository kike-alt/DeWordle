# Deploy Topology Diagrams

**ID:** INFRA-210

## Purpose

Provide a shared mental model of how the frontend, backend, indexer, and
Soroban pieces fit together in local, testnet, and production-like
deployments.

---

## 1. Local Development Topology

```mermaid
graph LR
    subgraph Browser["Browser"]
        FE["Next.js Dev Server<br/>localhost:3000"]
    end

    subgraph Docker["Docker Compose (backend/)"]
        PG[("PostgreSQL 15<br/>:5432")]
    end

    subgraph Host["Host Machine"]
        BE["NestJS API<br/>localhost:4000"]
        IDX["Indexer<br/>(in-process or sidecar)"]
        SDK["Soroban SDK<br/>(TypeScript client)"]
    end

    FE -- "HTTP REST" --> BE
    BE -- "TypeORM" --> PG
    BE -- "event ingest" --> IDX
    BE -- "RPC calls" --> SDK
    IDX -- "read" --> PG
    SDK -- "Soroban RPC" --> LocalRPC["Soroban RPC<br/>(local or testnet)"]

    style FE fill:#e6f3ff,stroke:#333
    style BE fill:#e6ffe6,stroke:#333
    style PG fill:#fff3e6,stroke:#333
    style IDX fill:#ffe6ff,stroke:#333
    style SDK fill:#ffffe6,stroke:#333
```

### Startup order

1. `docker compose -f backend/docker-compose.yml up -d` — starts PostgreSQL
2. `npm run start:dev --prefix backend` — starts NestJS + indexer
3. `npm run dev --prefix frontend` — starts Next.js dev server

---

## 2. Testnet Topology

```mermaid
graph LR
    subgraph CI_Env["CI / Ephemeral (GitHub Actions)"]
        CI_FE["Frontend build & test"]
        CI_BE["Backend build & test"]
        CI_SC["Soroban contract tests"]
    end

    subgraph Testnet["Stellar Testnet"]
        SORPC["Soroban RPC<br/>https://soroban-testnet.stellar.org"]
        SC["Deployed Contracts<br/>core_game, rewards,<br/>admin_registry, achievements"]
    end

    subgraph External["External Services"]
        MW["Merriam-Webster API"]
        OX["Oxford Dictionary API"]
        SMTP["Ethereal Email"]
    end

    CI_BE -- "RPC" --> SORPC
    CI_SC -- "deploy & invoke" --> SORPC
    CI_BE -- "word validation" --> MW
    CI_BE -- "word validation" --> OX
    CI_BE -- "email" --> SMTP
    SORPC --> SC
```

### Testnet contract deployment order

```
admin_registry  →  core_game  →  rewards  →  achievements
      1               2             3              4
```

Contract IDs are persisted in `soroban/config/contracts.testnet.json`.

---

## 3. Production-like Topology

```mermaid
graph TB
    subgraph Users["End Users"]
        WEB["Web Browser"]
    end

    subgraph CDN["CDN / Edge"]
        STATIC["Static Assets<br/>(Next.js SSG)"]
    end

    subgraph Compute["Compute (VPS / Container Host)"]
        FRONTEND["Next.js Server<br/>(SSR / API routes)"]
        BACKEND["NestJS API<br/>:4000"]
        INDEXER["Indexer Worker<br/>(sidecar / cron)"]
        SCHEDULER["Daily Word Scheduler"]
    end

    subgraph Storage["Data Layer"]
        PG_PROD[("PostgreSQL<br/>(managed / RDS)")]
        REDIS[("Redis<br/>(sessions / cache)")]
    end

    subgraph Blockchain["Stellar Network"]
        SORPC_PROD["Soroban RPC"]
        SC_PROD["Production Contracts"]
    end

    subgraph ExternalAPI["External APIs"]
        MW_PROD["Merriam-Webster"]
        OX_PROD["Oxford Dictionary"]
        SMTP_PROD["Transactional Email"]
    end

    WEB --> STATIC
    WEB --> FRONTEND
    FRONTEND --> BACKEND
    BACKEND --> PG_PROD
    BACKEND --> REDIS
    BACKEND --> SORPC_PROD
    BACKEND --> MW_PROD
    BACKEND --> OX_PROD
    BACKEND --> SMTP_PROD
    INDEXER --> PG_PROD
    INDEXER --> SORPC_PROD
    SCHEDULER --> BACKEND
    SORPC_PROD --> SC_PROD

    style WEB fill:#e6f3ff,stroke:#333
    style FRONTEND fill:#e6ffe6,stroke:#333
    style BACKEND fill:#e6ffe6,stroke:#333
    style INDEXER fill:#ffe6ff,stroke:#333
    style PG_PROD fill:#fff3e6,stroke:#333
    style SC_PROD fill:#ffffe6,stroke:#333
```

---

## 4. Component Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant BE as Backend
    participant IDX as Indexer
    participant DB as PostgreSQL
    participant SC as Soroban Contracts

    U->>FE: Play game
    FE->>BE: Submit guess
    BE->>DB: Validate & store
    BE->>SC: Record on-chain
    SC-->>BE: Tx hash
    BE-->>FE: Result
    BE->>IDX: Emit event
    IDX->>DB: Ingest event
    IDX->>SC: Verify ledger state
    SC-->>IDX: Ledger data
    IDX->>DB: Update projection
    FE->>BE: Fetch leaderboard
    BE->>DB: Aggregate scores
    BE-->>FE: Leaderboard data
```

---

## 5. Network Boundary Summary

| Connection | Protocol | Local | Testnet | Production |
|---|---|---|---|---|
| FE ↔ BE | HTTP REST | `localhost:4000` | Ingress URL | Load-balanced URL |
| BE ↔ PostgreSQL | TCP (TypeORM) | `localhost:5432` | CI service container | Managed DB endpoint |
| BE ↔ Soroban RPC | JSON-RPC over HTTPS | `testnet` RPC | `testnet` RPC | `mainnet` RPC |
| BE ↔ Indexer | In-process / HTTP | `localhost:4000` | Sidecar | Sidecar |
| BE ↔ Dictionary APIs | HTTPS | Direct | Direct | Direct |

## Related

- [ARCHITECTURE.md](./ARCHITECTURE.md) — monorepo structure and runtime flow
- [SOROBAN_DEPLOYMENT_FLOW.md](./SOROBAN_DEPLOYMENT_FLOW.md) — contract deployment steps
- [PERSISTENT_VOLUME_SEED_DATA.md](./wave/PERSISTENT_VOLUME_SEED_DATA.md) — local database volume strategy
