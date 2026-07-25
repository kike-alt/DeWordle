#!/usr/bin/env bash
# infra-up.sh — manage the local DeWordle infrastructure stack
#
# Usage:
#   ./scripts/infra-up.sh [command]
#
# Commands:
#   postgres   Start Postgres only (default when no command given)
#   backend    Start Postgres + NestJS API
#   proxy      Start Postgres + Soroban RPC caching proxy
#   full       Start all services (Postgres + API + proxy)
#   down       Stop and remove all containers
#   logs       Tail logs from all running containers
#   ps         Show container status
#
# Environment overrides:
#   SOROBAN_RPC_URL               Upstream RPC endpoint (default: testnet)
#   SOROBAN_CORE_GAME_CONTRACT_ID Deployed contract ID (default: placeholder)
#   JWT_SECRET                    Auth secret (default: insecure local value)
#   RPC_CACHE_TTL_MS              Proxy cache TTL in ms (default: 30000)
#
# See docs/LOCAL_INFRA_STACK.md for full documentation.

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
COMPOSE_FILE="$PROJECT_ROOT/backend/docker-compose.yml"

CMD="${1:-postgres}"

run_compose() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

case "$CMD" in
  postgres)
    echo "Starting Postgres..."
    run_compose up -d --wait
    echo "Postgres is up on localhost:5432"
    echo "  DB: dewordledb  user: dewordledb_owner  password: password"
    ;;

  backend)
    echo "Starting Postgres + backend API..."
    run_compose --profile backend up -d --wait --build
    echo ""
    echo "Services ready:"
    echo "  Postgres:   localhost:5432"
    echo "  Backend:    http://localhost:3000"
    echo ""
    echo "Run migrations if this is a fresh database:"
    echo "  cd backend && npm run typeorm:migration:run"
    ;;

  proxy)
    echo "Starting Postgres + RPC proxy..."
    run_compose --profile rpc-proxy up -d --wait
    echo ""
    echo "Services ready:"
    echo "  Postgres:   localhost:5432"
    echo "  RPC Proxy:  http://localhost:7545  (upstream: ${SOROBAN_RPC_URL:-testnet})"
    echo ""
    echo "Point your backend at the proxy:"
    echo "  SOROBAN_RPC_URL=http://localhost:7545"
    ;;

  full)
    echo "Starting full stack (Postgres + backend + RPC proxy)..."
    run_compose --profile backend --profile rpc-proxy up -d --wait --build
    echo ""
    echo "Services ready:"
    echo "  Postgres:   localhost:5432"
    echo "  Backend:    http://localhost:3000"
    echo "  RPC Proxy:  http://localhost:7545"
    echo ""
    echo "Run migrations if this is a fresh database:"
    echo "  cd backend && npm run typeorm:migration:run"
    ;;

  down)
    echo "Stopping all containers..."
    run_compose --profile backend --profile rpc-proxy down "${@:2}"
    echo "Done."
    ;;

  logs)
    run_compose --profile backend --profile rpc-proxy logs -f "${@:2}"
    ;;

  ps)
    run_compose --profile backend --profile rpc-proxy ps
    ;;

  *)
    echo "Unknown command: $CMD"
    echo ""
    echo "Usage: $0 [postgres|backend|proxy|full|down|logs|ps]"
    exit 1
    ;;
esac
