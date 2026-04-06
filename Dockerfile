FROM node:22-alpine

# Install bun
RUN npm install -g bun

# System deps for native modules (sharp, etc.)
RUN apk add --no-cache libc6-compat vips-dev

WORKDIR /app

# Copy lockfile first (best caching)
COPY bun.lock package.json ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Build Next.js
ENV NODE_OPTIONS=--max-old-space-size=1024
RUN bun run build

# Production settings
ENV NODE_ENV=production
ENV PORT=10000
EXPOSE 10000

# Start Next.js
CMD ["bun", "start"]
