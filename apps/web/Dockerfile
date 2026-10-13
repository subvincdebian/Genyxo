# ==========================================
# Multi-Stage Production Dockerfile for Genyxo Frontend
# Framework: Next.js (Standalone Mode) + React 19 + Tailwind v4
# Runtime: Node.js 22 Alpine (Secured & Hardened)
# ==========================================

# ------------------------------------------
# Stage 1: Dependencies Cache
# ------------------------------------------
FROM node:22-alpine AS dependencies
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN npm ci

# ------------------------------------------
# Stage 2: Application Builder
# ------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Define build arguments that might be baked into client bundles
ARG NEXT_PUBLIC_SOCKET_URL=/
ENV NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL}

RUN npm run build

# ------------------------------------------
# Stage 3: Minimal Production Runner
# ------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache tini curl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV BACKEND_URL=http://app:3000
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Switch to unprivileged user
USER nextjs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://127.0.0.1:3001/ || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]

