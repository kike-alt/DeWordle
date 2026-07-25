# Persistent Volume and Seed-Data Strategy

**ID:** INFRA-208

## Purpose

Define when local data should persist versus when it can be safely
destroyed, so contributors can troubleshoot, reset, and rebuild their
local stacks without losing unrelated work.

## Volume layout

### Named volume: `postgres_data`

- **Defined in:** `backend/docker-compose.yml`
- **Mount:** `/var/lib/postgresql/data`
- **Lifetime:** Survives `docker compose down`; removed only by explicit
  `docker compose down -v` or `docker volume rm`.

This volume stores the full PostgreSQL data directory (tables, indexes,
migration state, seed data).  It is shared across all containers in the
`backend` compose project.

### What lives inside

| Path inside volume | Contents |
|---|---|
| `base/` | Table data for all databases |
| `pg_wal/` | Write-ahead log (WAL) |
| `pg_stat/` | Statistics and performance data |
| `global/` | Cluster-wide catalog |

## Seed data flow

```
backend/data/five-letter-words.txt  (source of truth for word list)
        │
        ▼
backend/scripts/seed-words.ts      (TypeORM-based seeder)
        │
        ▼
postgres_data / dewordledb         (words table in PostgreSQL)
```

### Seed commands

| Command | Description |
|---|---|
| `npm run seed:words --prefix backend` | Seeds words from `five-letter-words.txt` (skips if already present) |
| `npm run seed:words:force --prefix backend` | Clears existing words and re-seeds from scratch |
| `npm run db:setup --prefix backend` | Runs pending migrations then seeds words |

## When to persist vs. reset

### Keep (do not reset)

- Tables you created for your feature branch
- Migration history (`typeorm_migrations` table)
- Seed data loaded by `seed:words` or `db:setup`
- Other contributors' feature-branch tables (if sharing a database)

### Safe to reset

- Any ephemeral or CI-provisioned database (see
  [EPHEMERAL_TEST_DB.md](./EPHEMERAL_TEST_DB.md))
- The `postgres_data` volume when you need a clean slate for migration
  development or schema troubleshooting

## How to reset safely

### Option A: Reset only seed data (lowest impact)

```bash
npm run seed:words:force --prefix backend
```

This clears and re-loads the words table without touching other tables,
migrations, or volume state.

### Option B: Full volume reset (all data lost, fastest clean)

```bash
# Stop the container and remove the volume
docker compose -f backend/docker-compose.yml down -v

# Restart and rebuild
docker compose -f backend/docker-compose.yml up -d

# Wait for health check, then run migrations and seed
npm run db:setup --prefix backend
```

### Option C: Reset without affecting other Docker state

```bash
# Remove only the named volume
docker volume rm dewordle_postgres_data

# Restart (compose will recreate the volume)
docker compose -f backend/docker-compose.yml up -d

# Wait for health check, then run migrations and seed
npm run db:setup --prefix backend
```

## Cache expectations

| Cache | Persistence | Reset method |
|---|---|---|
| PostgreSQL shared buffers | In-memory, lost on container restart | Restart container |
| npm cache (`~/.npm`) | Host-level, shared | `npm cache clean --force` |
| Rust / cargo cache | Host-level, shared | `cargo clean` |
| Soroban test snapshots | In-repo (`test_snapshots/`) | `git checkout -- soroban/**/test_snapshots/` |

## Troubleshooting

### Migration "already applied" errors after volume reset

If you removed the volume and re-created it, TypeORM should run all
pending migrations fresh.  If you see "already applied" errors, the
migration history table is stale — verify no orphaned `postgres_data`
volumes exist:

```bash
docker volume ls | grep postgres
```

### Seed script hangs

Ensure the PostgreSQL container is healthy before seeding:

```bash
docker compose -f backend/docker-compose.yml ps
# Wait for "healthy" status, then seed
```

### Port conflict (5432 already in use)

If another PostgreSQL instance is running on your host, either stop it
or change the published port in `docker-compose.yml`:

```yaml
ports:
  - '5433:5432'
```

Then update `.env` with `DB_PORT=5433`.
