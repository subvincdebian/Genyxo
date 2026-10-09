#!/usr/bin/env bash
set -euo pipefail

# ==============================================================
# Automated MySQL Backup Script for Genyxo Platform
# ==============================================================

BACKUP_DIR="${BACKUP_DIR:-/var/backups/genyxo}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DATE="$(date +"%Y%m%d_%H%M%S")"
CONTAINER_NAME="${MYSQL_CONTAINER:-genyxo-mysql}"
DB_NAME="${MYSQL_DATABASE:-genyxo}"

mkdir -p "$BACKUP_DIR"

BACKUP_FILE="${BACKUP_DIR}/genyxo_backup_${DATE}.sql.gz"

echo "==> [Backup] Starting MySQL backup for database '${DB_NAME}'..."

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    docker exec "$CONTAINER_NAME" \
        sh -c 'exec mysqldump --all-databases -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --quick' \
        | gzip > "$BACKUP_FILE"
    echo "==> [Backup] Backup created successfully: $BACKUP_FILE"
    echo "==> [Backup] Size: $(du -h "$BACKUP_FILE" | cut -f1)"
else
    echo "==> [Backup Error] Container ${CONTAINER_NAME} is not running!"
    exit 1
fi

# Clean up older backups
echo "==> [Backup] Cleaning up backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -type f -name "genyxo_backup_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
echo "==> [Backup] Cleanup complete."
