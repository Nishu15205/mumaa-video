FROM oven/bun:1-alpine
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile || bun install

# Copy source
COPY index.ts ./

# Expose port
EXPOSE 10000

# Start server
CMD ["bun", "run", "index.ts"]
