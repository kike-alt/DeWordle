# syntax=docker/dockerfile:1

# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps first (layer-cached until package files change)
COPY package*.json ./
RUN npm ci

# Build TypeScript → dist/
COPY . .
RUN npm run build

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
