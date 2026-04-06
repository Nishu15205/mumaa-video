FROM node:22-alpine

# System deps for native modules (sharp, etc.)
RUN apk add --no-cache libc6-compat vips-dev

WORKDIR /app

# Copy everything EXCEPT what's in .dockerignore
COPY . .

# Install ALL dependencies (dev + prod needed for build)
RUN npm install --legacy-peer-deps

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
