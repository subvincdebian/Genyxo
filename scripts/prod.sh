#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

if [ ! -f "apps/backend/.env" ]; then
    echo "ERROR: apps/backend/.env with production credentials is required." >&2
    exit 1
fi

ACTION="${1:-up}"
COMPOSE=(docker compose --env-file apps/backend/.env -f docker-compose.yml -f docker-compose.prod.yml)

case "$ACTION" in
    up)
        if [ ! -f nginx/ssl/cert.pem ] || [ ! -f nginx/ssl/key.pem ]; then
            echo "ERROR: nginx/ssl/cert.pem and nginx/ssl/key.pem are required for production TLS." >&2
            exit 1
        fi
        echo "==> Starting Genyxo Production Stack..."
        "${COMPOSE[@]}" config --quiet
        "${COMPOSE[@]}" build
        "${COMPOSE[@]}" up -d mysql redis
        "${COMPOSE[@]}" run --rm db-migrate
        "${COMPOSE[@]}" up -d --wait
        "${COMPOSE[@]}" ps
        echo "==> Production stack successfully deployed!"
        ;;
    down)
        echo "==> Stopping Production Stack..."
        "${COMPOSE[@]}" down
        ;;
    restart)
        "${COMPOSE[@]}" restart
        ;;
    status)
        "${COMPOSE[@]}" ps
        ;;
    logs)
        "${COMPOSE[@]}" logs -f
        ;;
    *)
        echo "Usage: $0 [up|down|restart|status|logs]"
        exit 1
        ;;
esac
