FROM oven/bun:1 AS base

# ─── Dependencies ────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

# ─── Build ───────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bunx prisma generate
RUN bun run build

# ─── Production ─────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# Install prisma CLI for migrations at runtime
RUN npm install -g prisma

USER nextjs
EXPOSE 10000
ENV PORT=10000
ENV HOSTNAME=0.0.0.0

CMD ["sh", "-c", "prisma migrate deploy 2>/dev/null; node server.js"]
