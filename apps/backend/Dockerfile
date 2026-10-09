# ==========================================
# Multi-Stage Production Dockerfile for Genyxo
# Framework: NestJS (Fastify) + TypeScript
# Runtime: Node.js 22 Alpine (Secured & Hardened)
# ==========================================

# ------------------------------------------
# Stage 1: Dependencies Cache
# ------------------------------------------
FROM node:25-alpine AS dependencies
WORKDIR /app

# Install build tools if any native modules require compilation
RUN apk add --no-cache libc6-compat python3 make g++

COPY package*.json ./
RUN npm ci

# ------------------------------------------
# Stage 2: Application Builder
# ------------------------------------------
FROM node:25-alpine AS builder
WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
RUN npm run build

# Prune devDependencies to keep image lean
RUN npm prune --omit=dev && npm cache clean --force

# ------------------------------------------
# Stage 3: Minimal Production Runner
# ------------------------------------------
FROM node:25-alpine AS runner
WORKDIR /app

# Install tini for PID 1 zombie reaping and proper POSIX signal propagation (SIGTERM/SIGINT)
RUN apk add --no-cache tini curl

ENV NODE_ENV=production
ENV PORT=3000

# Create dedicated non-root user and group
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Copy runtime assets and build output
COPY --from=dependencies --chown=nestjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Switch to non-root user
USER nestjs

# Expose internal application port
EXPOSE 3000

# Docker native healthcheck probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/health/liveness || exit 1

# Signal handling with tini
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
