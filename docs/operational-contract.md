# Axiom Protocol Root App Operational Contract

This document defines the operational contract for the root Next.js app only.
It is based on `package.json`, `server.js`, `Dockerfile`,
`.github/workflows/main.yml`, and `vercel.json`.

## Canonical commands

### 1. Install

```bash
npm ci
```

`npm` is the canonical package manager for the root app. The lockfile is
`package-lock.json`.

Evidence:

- GitHub Actions uses `npm ci`.
- Vercel is configured with `"installCommand": "npm ci"`.
- Docker uses `npm ci --ignore-scripts`.

### 2. Development

```bash
npm run dev
```

This runs:

```bash
next dev -H 0.0.0.0 -p 5000
```

The canonical local development port is `5000`.

### 3. Build

```bash
npm run build
```

This runs:

```bash
next build
```

No PR should be considered deployment-ready unless both `npm ci` and
`npm run build` pass.

### 4. Production start

The canonical production start command depends on the deployment target.

#### Vercel

Vercel should use the native Next.js runtime configured by `vercel.json`.
There is no custom start command for Vercel.

#### Cloud Run / Docker

Cloud Run currently uses:

```bash
node server.js
```

This is set by the root `Dockerfile`:

```dockerfile
CMD ["node","server.js"]
```

## Is `server.js` part of the canonical production contract?

For Vercel: no.

Vercel bypasses `server.js` and runs the app through its native Next.js
runtime. Any behavior required on Vercel must exist as native Next.js routes,
rewrites, headers, or Vercel config.

For Cloud Run / Docker: yes, currently.

The Docker image starts `server.js` directly. In that runtime, `server.js` is
part of the production contract until the Dockerfile is changed and validated.

## `server.js` behavior

`server.js` provides a small custom HTTP wrapper around Next.js.

It:

- listens on `0.0.0.0`
- reads `PORT`, defaulting to `3000`
- responds immediately to:
  - `/api/health`
  - `/_health`
  - `/health`
- returns `{ status: "ok", ready, timestamp }` for those health checks
- returns `503` for non-health traffic while Next.js is still preparing
- delegates all normal traffic to Next after `app.prepare()`

This warmup behavior is specific to the custom server and is not provided by
Vercel.

## Inconsistencies between local, CI, Docker, and deployment runtimes

### Install command

- Local documentation historically references `npm install`.
- GitHub Actions uses `npm ci`.
- Docker uses `npm ci --ignore-scripts`.
- Vercel uses `npm ci`.

Operational contract: use `npm ci`.

### Start command

- `package.json` defines `start` as `next start`.
- Docker uses `node server.js`.
- Vercel uses native Next.js runtime and does not use `server.js`.

Operational implication:

- `npm run start` validates a Vercel-like Next runtime.
- Docker/Cloud Run validates the custom-server runtime.
- Both paths should be tested if both deployment targets remain supported.

### Ports

- Local dev uses port `5000`.
- E2E dev uses port `5001`.
- `next start` defaults to Next.js defaults unless `-p` or `PORT` is supplied.
- `server.js` defaults to `3000` when `PORT` is not set.
- Docker sets `PORT=8080`.
- GitHub Actions dev-server tests run with `PORT=5000`.

Operational implication:

- Do not hardcode one port in runtime code.
- Platform deployments must provide or respect `PORT`.

### Health checks

- `server.js` handles `/api/health`, `/_health`, and `/health` before Next.js.
- Native Next routes also exist for health checks.
- GitHub Actions waits on `/api/healthz`.
- Vercel must rely on native Next routes and rewrites, not `server.js`.

Operational implication:

- Keep `/api/healthz` for CI readiness.
- Keep `/api/health`, `/health`, and `/_health` behavior stable for external
  monitors and deployment platforms.

### Build validation strength

`next.config.js` currently has:

- `eslint.ignoreDuringBuilds: true`
- `typescript.ignoreBuildErrors: true`

Operational implication:

- `npm run build` proves the app bundles, but it does not prove TypeScript or
  ESLint cleanliness.
- Separate lint/type gates are required if those are desired.

### Deployment config split

- `.github/workflows/main.yml` deploys to Cloud Run from Docker.
- `vercel.json` configures Vercel build, functions, headers, and crons.

Operational implication:

- Cloud Run and Vercel are different runtime contracts.
- A change that works in `next start` or Vercel may not validate `server.js`.
- A change that works in Docker may not validate Vercel serverless/function
  behavior.

## Current deployment contract summary

Use this table as the root app contract until explicitly changed.

| Concern | Canonical value |
| --- | --- |
| Package manager | npm |
| Install | `npm ci` |
| Dev | `npm run dev` |
| Dev port | `5000` |
| Build | `npm run build` |
| Vercel runtime | native Next.js |
| Vercel install | `npm ci` |
| Vercel build | `next build` |
| Docker/Cloud Run runtime | `node server.js` |
| Docker port | `8080` via `PORT=8080` |
| CI install | `npm ci` |
| CI dev server | `npm run dev` with `PORT=5000` |
| CI readiness check | `/api/healthz` |

## Migration notes

- If Vercel is the primary deployment target, do not rely on `server.js`.
- If Cloud Run remains supported, keep `server.js` or replace its behavior with
  an explicitly validated Docker/Next start path.
- Do not remove or rename health endpoints without updating CI, deployment
  monitors, and external uptime checks.
- Do not change install/build/start commands without updating this document,
  `package.json`, deployment config, and CI together.
