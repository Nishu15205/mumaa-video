FROM node:20-alpine
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies (no bun.lock needed - use npm for Node.js)
RUN npm install

# Copy source
COPY index.ts ./

# Install tsx for running TypeScript
RUN npm install -g tsx

# Expose port (Render sets PORT env var)
EXPOSE 10000

# Start server using tsx
CMD ["npx", "tsx", "index.ts"]
