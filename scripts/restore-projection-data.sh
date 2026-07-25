#!/usr/bin/env bash
set -euo pipefail

# restore-projection-data.sh
# Restores indexer projection tables from a pg_dump custom-format backup.
#
# Usage:
#   ./scripts/restore-projection-data.sh <backup_file>
#
# Required env vars:
#   DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME
#
# What is restored:
#   - session_projections  (session projection state)
#   - indexer_cursors      (stream cursor positions)
#   - ingested_events      (raw ingested event log)
#
# What is NOT restored:
#   - Other application tables (auth, game_sessions, words, etc.)
#   - Migrations (typeorm_migrations)
#   - Sequences / auto-increment counters

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

: "${DB_HOST:=localhost}"
: "${DB_PORT:=5432}"
: "${DB_USERNAME:=dewordledb_owner}"
: "${DB_PASSWORD:=password}"
: "${DB_NAME:=dewordledb}"

export PGPASSWORD="$DB_PASSWORD"

echo "Restoring projection tables from: $BACKUP_FILE"

# Warn if running against non-local
if [ "$DB_HOST" != "localhost" ] && [ "$DB_HOST" != "127.0.0.1" ]; then
  echo "WARNING: Restoring to remote host $DB_HOST — ensure this is intentional!"
fi

pg_restore \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USERNAME" \
  -d "$DB_NAME" \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  -t session_projections \
  -t indexer_cursors \
  -t ingested_events \
  "$BACKUP_FILE"

echo "Restore complete."
