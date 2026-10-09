#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

ACTION="${1:-up}"

case "$ACTION" in
    up)
        echo "==> Starting Genyxo Local Development Stack..."
        docker compose --env-file apps/backend/.env -f docker-compose.dev.yml up --build -d
        echo "==> Dev stack started successfully!"
        echo "    - Backend:         http://localhost:3000"
        echo "    - Frontend:        http://localhost:3001"
        echo "    - Redis Commander: http://localhost:8081"
        echo "    - MySQL Port:      3306"
        ;;
    down)
        echo "==> Stopping Dev Stack..."
        docker compose --env-file apps/backend/.env -f docker-compose.dev.yml down
        ;;
    logs)
        docker compose --env-file apps/backend/.env -f docker-compose.dev.yml logs -f
        ;;
    *)
        echo "Usage: $0 [up|down|logs]"
        exit 1
        ;;
esac
