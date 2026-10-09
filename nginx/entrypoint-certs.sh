#!/bin/sh
set -e

SSL_DIR="/etc/nginx/ssl"
mkdir -p "$SSL_DIR"

if [ ! -f "$SSL_DIR/cert.pem" ] || [ ! -f "$SSL_DIR/key.pem" ]; then
    echo "==> [Nginx Entrypoint] SSL certificates not found. Generating fallback self-signed certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_DIR/key.pem" \
        -out "$SSL_DIR/cert.pem" \
        -subj "/C=US/ST=Dev/L=Local/O=Genyxo/CN=localhost" 2>/dev/null
    chmod 600 "$SSL_DIR/key.pem"
    chmod 644 "$SSL_DIR/cert.pem"
    echo "==> [Nginx Entrypoint] Self-signed certificates successfully created in $SSL_DIR"
else
    echo "==> [Nginx Entrypoint] Custom SSL certificates detected in $SSL_DIR"
fi
