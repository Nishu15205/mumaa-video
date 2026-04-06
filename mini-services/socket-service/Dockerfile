FROM node:22-alpine

# Install bun
RUN npm install -g bun

WORKDIR /app

# Copy lockfile + package.json
COPY bun.lock package.json ./

# Install deps
RUN bun install --frozen-lockfile

# Copy source
COPY index.ts ./

# Start
ENV PORT=10000
EXPOSE 10000

CMD ["bun", "index.ts"]
