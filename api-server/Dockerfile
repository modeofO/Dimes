# Node.js API Server
FROM node:20-slim

WORKDIR /app

# Install bun for faster builds
RUN npm install -g bun

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY src ./src
COPY .env* ./

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Run the server
CMD ["bun", "run", "src/server.js"]
