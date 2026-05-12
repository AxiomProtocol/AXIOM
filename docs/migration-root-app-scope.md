# Axiom Protocol Root App Migration Scope

This document locks the migration scope to the root Next.js application only.
It intentionally excludes nested apps and contract tooling unless explicitly
requested later.

## Scope decision

In scope:

- root Next.js app
- root app runtime files
- root app deployment configuration
- root app health endpoints
- root app environment assumptions
- root app Replit dependency cleanup

Out of scope:

- `client/`
- `recruit-standalone/`
- `universe-blockchain/`
- `download/`
- `project/`
- contract tooling unrelated to root app runtime
- standalone package files under nested projects

## Server runtime finding

`server.js` is a hard production dependency only for the Docker/Cloud Run
runtime because the root `Dockerfile` starts it directly:

```dockerfile
CMD ["node","server.js"]
```

`server.js` is not a hard dependency for Vercel. Vercel runs the application
through the native Next.js runtime and bypasses custom Node server entrypoints.

## Deployment alignment finding

The repository currently has two deployment models:

1. Cloud Run / Docker
   - GitHub Actions builds the Docker image.
   - Docker starts `node server.js`.
   - `server.js` provides pre-Next health and warmup behavior.

2. Vercel
   - `vercel.json` declares the Next.js framework.
   - Vercel uses `npm ci` and `next build`.
   - Vercel uses native Next.js routes, rewrites, headers, functions, and crons.

Today, the root app is better aligned to Vercel for fastest deployment
iteration because:

- the app is already a Next.js app,
- Vercel can build it with `npm ci` and `next build`,
- native health routes now cover the custom-server health aliases, and
- no Docker runtime needs to be proven before deploy.

Cloud Run remains viable, but only if the Docker path and `server.js` behavior
are treated as part of the production contract and validated separately.

## Required root runtime files

Keep in scope:

- `package.json`
- `package-lock.json`
- `next.config.js`
- `tsconfig.json`
- `tailwind.config.js`
- `postcss.config.js`
- `middleware.ts`
- `instrumentation.ts`
- `server.js`
- `server-production.js`
- `Dockerfile`
- `vercel.json`
- `.github/workflows/main.yml`
- `.github/workflows/solvency-cron.yml`

## Required root app directories

Keep in scope:

- `app/`
- `pages/`
- `components/`
- `lib/`
- `server/`
- `shared/`
- `src/`
- `styles/`
- `public/`
- `data/` where referenced by root runtime
- `migrations/`
- `drizzle/`
- `scripts/` only for root runtime, migrations, crons, policy exports, and
  operational scripts
- `tests/`
- `e2e/`

## Directories not to modify during this migration

Do not modify unless explicitly requested:

- `client/`
- `recruit-standalone/`
- `universe-blockchain/`
- `download/`
- `project/`
- `_archive/` except when deleting confirmed legacy artifacts in a cleanup PR
- `.agents/`
- `attached_assets/`
- contract deployment tooling unrelated to root app runtime

## Health endpoint scope

Root app health endpoints to preserve:

- `/api/health`
- `/api/healthz`
- `/health`
- `/_health`

Cloud Run/Docker:

- `/api/health`, `/health`, and `/_health` are intercepted by `server.js`.

Vercel:

- health behavior must be provided by native Next.js routes and rewrites.

## Migration guardrails

- Do not rename routes while migrating.
- Do not rename environment variables without compatibility planning.
- Do not alter auth, compliance, treasury, reserve, settlement, oracle, or
  disclosure behavior as part of platform cleanup.
- Keep cleanup PRs focused and reversible.
- Every deploy-target change must pass:

```bash
npm ci
npm run build
```

## Recommended next sequence

1. Treat Vercel as the primary migration target.
2. Keep Cloud Run support documented but secondary.
3. Remove or replace Replit connector dependencies in active root runtime paths.
4. Replace Replit URL fallbacks with canonical app URL configuration.
5. Remove confirmed dead Replit artifacts in a separate cleanup PR.
6. Validate Vercel deploy behavior before deleting Cloud Run/Docker support.
