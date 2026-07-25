# Projection Data Backup & Restore

**ID:** INFRA-203

## Purpose

Provide a repeatable backup and restore path for indexer projection
data (session projections, cursor positions, and ingested event log)
in local and staging environments.

## Scripts

| Script | Action |
|---|---|
| `scripts/backup-projection-data.sh` | Dumps projection tables to a `.dump` file |
| `scripts/restore-projection-data.sh` | Restores projection tables from a `.dump` file |

## What is backed up

| Table | Entity | Description |
|---|---|---|
| `session_projections` | `SessionProjectionEntity` | Finalized session state projected from on-chain events |
| `indexer_cursors` | `IndexerCursorEntity` | Stream cursor positions for replay safety |
| `ingested_events` | `IngestedEventEntity` | Raw event log ingested by the indexer |

## What is NOT backed up

- Other application tables (auth, game_sessions, words, leaderboard, etc.)
- TypeORM migrations (`typeorm_migrations`)
- Sequences / auto-increment counters
- PostgreSQL roles and permissions
- Configuration or environment files

## Running

### Backup

```bash
# Default output: backup/projection-<timestamp>.dump
./scripts/backup-projection-data.sh

# Custom output path
./scripts/backup-projection-data.sh /tmp/my-backup.dump
```

### Restore

```bash
./scripts/restore-projection-data.sh backup/projection-20260625-120000.dump
```

### Environment variables

All scripts read the standard backend database env vars
(`DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`) with
the same defaults as `backend/.env.example`.

## Safety

- Restore uses `--clean --if-exists` so it can be re-run safely on an
  already-restored database.
- The backup uses custom format (`-Fc`) which is portable across
  PostgreSQL versions and supports selective restore.
- Always verify the backup file before restoring to staging:

  ```bash
  pg_restore --list backup/projection-20260625-120000.dump
  ```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `pg_dump: error: connection to server failed` | PostgreSQL not running | `docker compose -f backend/docker-compose.yml up -d` |
| `pg_restore: error: role "dewordledb_owner" does not exist` | Role missing on target | Use `--no-owner` (already included) |
| `pg_restore: error: could not execute query: ERROR:  relation "session_projections" does not exist` | Migration not run | `npm run db:setup --prefix backend` before restore |
