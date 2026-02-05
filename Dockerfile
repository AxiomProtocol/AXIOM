FROM node:20-bookworm-slim AS build
WORKDIR /app

# Copy manifests first
COPY package.json package-lock.json ./

# Install deps (reproducible)
RUN npm ci

# Copy rest of repo
COPY . .

# Build (fail if build fails)
RUN npm run build

# Runtime image
FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Copy built app
COPY --from=build /app /app

# Start
CMD ["node","server.js"]
