#!/usr/bin/env bash
set -euo pipefail

# backup-projection-data.sh
# Backs up indexer projection tables via pg_dump.
#
# Usage:
#   ./scripts/backup-projection-data.sh [output_path]
#
# Default output: backup/projection-<timestamp>.dump
# Uses custom format (pg_dump -Fc) for efficient restore.
#
# Required env vars:
#   DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME
# (same as backend/.env.example)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT="${1:-"${SCRIPT_DIR}/../backup/projection-$(date +%Y%m%d-%H%M%S).dump"}"
mkdir -p "$(dirname "$OUTPUT")"

: "${DB_HOST:=localhost}"
: "${DB_PORT:=5432}"
: "${DB_USERNAME:=dewordledb_owner}"
: "${DB_PASSWORD:=password}"
: "${DB_NAME:=dewordledb}"

export PGPASSWORD="$DB_PASSWORD"

TABLES=(
  session_projections
  indexer_cursors
  ingested_events
)

echo "Backing up projection tables to: $OUTPUT"
pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USERNAME" \
  -d "$DB_NAME" \
  -Fc \
  -t session_projections \
  -t indexer_cursors \
  -t ingested_events \
  --no-owner \
  --no-acl \
  -f "$OUTPUT"

echo "Backup complete: $(du -h "$OUTPUT" | cut -f1)"
