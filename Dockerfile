FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

COPY --from=build /app /app
CMD ["node","server.js"]
