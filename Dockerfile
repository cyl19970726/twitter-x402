# Use Bun official image
FROM oven/bun:1 as base
WORKDIR /app

# Install system dependencies required for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Expose port
EXPOSE 8787

# Start the application
CMD ["bun", "run", "src/index.ts"]
