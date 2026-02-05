# --- Build stage ---
FROM node:20-bookworm-slim AS build
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# DO NOT swallow build errors. If build fails, we want to know.
RUN pnpm -s build

# --- Runtime stage ---
FROM node:20-bookworm-slim
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Runtime deps only is optional; keep simple for now by copying built app.
COPY --from=build /app /app

# Cloud Run entrypoint (your server binds 0.0.0.0 and uses PORT)
CMD ["node","server.js"]
