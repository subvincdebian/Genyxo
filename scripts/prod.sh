#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

if [ ! -f ".env" ]; then
    echo "[WARNING] .env file not found! Copying from .env.example..."
    cp .env.example .env
fi

ACTION="${1:-up}"

case "$ACTION" in
    up)
        echo "==> Starting Genyxo Production Stack..."
        docker compose up --build -d
        echo "==> Production stack successfully deployed!"
        docker compose ps
        ;;
    down)
        echo "==> Stopping Production Stack..."
        docker compose down
        ;;
    restart)
        docker compose restart
        ;;
    status)
        docker compose ps
        ;;
    logs)
        docker compose logs -f
        ;;
    *)
        echo "Usage: $0 [up|down|restart|status|logs]"
        exit 1
        ;;
esac
