#!/usr/bin/env bash
# Ops helpers. Usage: scripts/ops.sh <redis-eviction|check-npm-scripts|prune-dumps>
set -euo pipefail

case "${1:-}" in
  redis-eviction)
    # Evict least-recently-used keys when projection cache hits the memory cap.
    redis-cli CONFIG SET maxmemory "${REDIS_MAXMEMORY:-256mb}"
    redis-cli CONFIG SET maxmemory-policy allkeys-lru
    ;;
  check-npm-scripts)
    # Fail if any script referenced by a package.json script is not executable.
    fail=0
    while IFS= read -r pkg; do
      dir=$(dirname "$pkg")
      for f in $(grep -oE '(\./)?scripts/[A-Za-z0-9_./-]+\.sh' "$pkg" | sort -u); do
        if [ -f "$dir/$f" ] && [ ! -x "$dir/$f" ]; then
          echo "Not executable: $dir/$f (referenced in $pkg)"; fail=1
        fi
      done
    done < <(find . -name package.json -not -path '*/node_modules/*')
    exit $fail
    ;;
  prune-dumps)
    # Daily cron: delete PostgreSQL dumps older than the retention window.
    dir="${BACKUP_DIR:-/var/backups/postgres}"
    days="${RETENTION_DAYS:-14}"
    find "$dir" -type f -name '*.sql*' -mtime +"$days" -print -delete
    ;;
  *)
    echo "usage: $0 <redis-eviction|check-npm-scripts|prune-dumps>" >&2; exit 1 ;;
esac
