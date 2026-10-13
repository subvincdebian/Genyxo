FROM nginx:1.27-alpine

RUN apk add --no-cache openssl curl

# Remove default nginx configurations
RUN rm -rf /etc/nginx/conf.d/*

# Copy high-concurrency configurations
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/

# Setup auto-cert generator in official nginx entrypoint directory
COPY entrypoint-certs.sh /docker-entrypoint.d/40-generate-certs.sh
RUN chmod +x /docker-entrypoint.d/40-generate-certs.sh

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1/health || exit 1
