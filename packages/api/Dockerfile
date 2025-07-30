FROM oven/bun:1.2.15-alpine AS base

WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
COPY packages/api/package.json ./packages/api/
COPY packages/core/package.json ./packages/core/
RUN bun install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build --filter=@beam/api

FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono

COPY --from=builder --chown=hono:nodejs /app/packages/api/dist ./dist
COPY --from=builder --chown=hono:nodejs /app/packages/api/package.json ./package.json

USER hono

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["bun", "run", "dist/index.js"]
