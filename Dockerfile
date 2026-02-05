# --- Build stage ---
FROM node:20-bookworm-slim AS build
WORKDIR /app

# pnpm via corepack
RUN corepack enable

# Copy manifests first for layer caching
COPY package.json pnpm-lock.yaml ./

# Install deps
RUN pnpm install --frozen-lockfile

# Copy the rest of the repo
COPY . .

# Build if you have a build script (won't fail if missing)
RUN pnpm -s build || true

# --- Runtime stage ---
FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable

# Copy app from build stage
COPY --from=build /app /app

# Cloud Run listens on 8080 by default
ENV PORT=8080
EXPOSE 8080

# If your app uses start script, this will work
CMD ["pnpm","start"]
