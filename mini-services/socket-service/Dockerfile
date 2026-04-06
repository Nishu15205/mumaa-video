FROM node:22-alpine

WORKDIR /app

# Copy socket service files
COPY package.json ./
COPY tsconfig.json ./
COPY index.ts ./

# Install deps
RUN npm install --legacy-peer-deps

# Start socket service
ENV PORT=10000
EXPOSE 10000

CMD ["npx", "tsx", "index.ts"]
