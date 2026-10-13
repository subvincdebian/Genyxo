#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSL_DIR="${SCRIPT_DIR}/ssl"

mkdir -p "${SSL_DIR}"
umask 077

if [ -f "${SSL_DIR}/cert.pem" ] && [ -f "${SSL_DIR}/key.pem" ]; then
    echo "==> SSL certificates already exist in ${SSL_DIR}"
    exit 0
fi
if [ -e "${SSL_DIR}/cert.pem" ] || [ -e "${SSL_DIR}/key.pem" ]; then
    echo "ERROR: Incomplete certificate pair; inspect existing files before generating replacements." >&2
    exit 1
fi

TEMP_DIR="$(mktemp -d "${SSL_DIR}/.dev-certs-XXXXXX")"
trap 'rm -f -- "${TEMP_DIR}/key.pem" "${TEMP_DIR}/cert.pem"; rmdir -- "$TEMP_DIR"' EXIT

echo "==> Generating local self-signed SSL certificates for Genyxo..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "${TEMP_DIR}/key.pem" \
    -out "${TEMP_DIR}/cert.pem" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" \
    -subj "/C=US/ST=Dev/L=Local/O=Genyxo/CN=localhost"
test -f "${TEMP_DIR}/key.pem" && test -f "${TEMP_DIR}/cert.pem"
chmod 600 "${TEMP_DIR}/key.pem"
chmod 644 "${TEMP_DIR}/cert.pem"
mv -- "${TEMP_DIR}/key.pem" "${SSL_DIR}/key.pem"
mv -- "${TEMP_DIR}/cert.pem" "${SSL_DIR}/cert.pem"
echo "==> SSL certificates generated in ${SSL_DIR}"
