#!/usr/bin/env bash
set -euo pipefail
umask 077

# ==============================================================
# Automated MySQL Backup Script for Genyxo Platform
# ==============================================================

BACKUP_DIR="${BACKUP_DIR:-/var/backups/genyxo}"
RETENTION_DAYS="${RETENTION_DAYS-14}"
DATE="$(date +"%Y%m%d_%H%M%S")"
CONTAINER_NAME="${MYSQL_CONTAINER:-genyxo-mysql}"
DB_NAME="${MYSQL_DATABASE:-${MYSQLDATABASE:-genyxo}}"

if [[ ! "$RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
    echo "==> [Backup Error] RETENTION_DAYS must be a non-negative integer." >&2
    exit 1
fi

RUNNING_CONTAINERS="$(docker ps --format '{{.Names}}')"
if ! grep -Fxq -- "$CONTAINER_NAME" <<< "$RUNNING_CONTAINERS"; then
    echo "==> [Backup Error] Container ${CONTAINER_NAME} is not running!" >&2
    exit 1
fi

mkdir -p "$BACKUP_DIR"
TEMP_FILE="$(mktemp "${BACKUP_DIR}/genyxo_backup_${DATE}_XXXXXX.sql.gz.tmp")"
trap 'rm -f -- "$TEMP_FILE"' EXIT
trap 'exit 1' HUP INT TERM
BACKUP_FILE="${TEMP_FILE%.tmp}"

echo "==> [Backup] Starting MySQL backup for database '${DB_NAME}'..."
docker exec "$CONTAINER_NAME" \
    sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump --databases "$1" -uroot --single-transaction --quick' \
    sh "$DB_NAME" | gzip > "$TEMP_FILE"
mv -- "$TEMP_FILE" "$BACKUP_FILE"
echo "==> [Backup] Backup created successfully: $BACKUP_FILE"
echo "==> [Backup] Size: $(du -h "$BACKUP_FILE" | cut -f1)"

# Clean up older backups
echo "==> [Backup] Cleaning up backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -type f -name "genyxo_backup_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
echo "==> [Backup] Cleanup complete."
