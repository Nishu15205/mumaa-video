FROM node:22-alpine

# System deps for native modules (sharp, etc.)
RUN apk add --no-cache libc6-compat vips-dev

WORKDIR /app

# Copy package files first (layer caching)
COPY package.json package-lock.json* ./

# Install ALL dependencies (dev + prod needed for build)
RUN npm install --legacy-peer-deps

# Copy source code
COPY src ./src/
COPY public ./public/
COPY prisma ./prisma/
COPY next.config.ts tsconfig.json postcss.config.mjs tailwind.config.ts ./

# Generate Prisma client using LOCAL binary (v6 pinned)
RUN ./node_modules/.bin/prisma generate

# Build Next.js
ENV NODE_OPTIONS=--max-old-space-size=1024
RUN npm run build

# Production settings
ENV NODE_ENV=production
ENV PORT=10000
EXPOSE 10000

# Start Next.js using local binary (NOT npx)
CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0"]
