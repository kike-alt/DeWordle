# Ephemeral Test Database Provisioning

**Script:** `scripts/provision-ephemeral-db.js`
**Workflow:** `.github/workflows/ephemeral-test-db.yml`
**ID:** INFRA-207

## Purpose

Provides a shared helper for provisioning and tearing down short-lived
PostgreSQL databases for integration tests, CI runs, and contributor
cleanup flows.

## How it works

The script wraps `psql` calls to create and drop databases using the
project's standard connection env vars.  It supports three actions:

| Action | Description |
|---|---|
| `provision` | Creates a new database with a unique name (`test_<hex>`) |
| `teardown` | Drops a database by name |
| `auto`     | Provisions, runs a command (passed as remaining args), then tears down |

## Running locally

```bash
# Provision a database and print its name
node scripts/provision-ephemeral-db.js provision

# Tear it down
node scripts/provision-ephemeral-db.js teardown test_a1b2c3d4

# Auto mode — provision, run your test, then teardown
node scripts/provision-ephemeral-db.js auto "npm run test:e2e --prefix backend"
```

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` / `DB_USERNAME` | `dewordledb_owner` | Database user |
| `DB_PASSWORD` | `password` | Database password |
| `DB_NAME` | `dewordledb` | Base database to connect to for management commands |
| `EPHEMERAL_DB_PREFIX` | `test_` | Prefix for auto-generated database names |
| `EPHEMERAL_DB_NAME` | *(auto)* | Specific database name (skip auto-generation) |
| `ACTION` | `auto` | Action to perform |

The auto-generated name is printed as `EPHEMERAL_DB_NAME=<name>` and
also exported to `EPHEMERAL_DB_NAME` in the environment of the child
command.

## CI integration

The workflow spins up a PostgreSQL service container, provisions an
ephemeral database, runs a connectivity check, and tears it down in a
`post-job` step (always runs, even on failure).

## Teardown guarantees

- The workflow uses `if: always()` so teardown runs even if a prior step fails.
- The `psql` DROP command uses `IF EXISTS` to avoid errors on double-teardown.
