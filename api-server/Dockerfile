# Node.js API Server
FROM node:20-slim

WORKDIR /app

# Install bun for faster dependency installation
RUN npm install -g bun

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY src ./src

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Temporarily use minimal health check server for debugging
CMD ["node", "src/healthcheck.js"]
