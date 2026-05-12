# Axiom Protocol Vercel Deploy Checklist

This checklist is scoped to the root Next.js app only. It uses
`docs/migration-root-app-scope.md`, `docs/operational-contract.md`,
`docs/replit-dependency-audit.md`, and `docs/environment-matrix.md` as the
source of truth.

Do not use this checklist to change runtime behavior. It is a deployment
readiness checklist for the current root app baseline.

## 1. Scope confirmation

- [ ] Deploy only the root Next.js app.
- [ ] Do not deploy nested apps as part of this migration:
  - `client/`
  - `recruit-standalone/`
  - `universe-blockchain/`
  - `download/`
  - `project/`
- [ ] Do not include contracts tooling unrelated to root app runtime.
- [ ] Treat Vercel as the primary migration target.
- [ ] Treat Cloud Run/Docker as a separate runtime contract while the
      `Dockerfile` starts `node server.js`.

## 2. GitHub and branch readiness

- [ ] Confirm GitHub is the source of truth for the branch being deployed.
- [ ] Confirm the deploy commit is pushed.
- [ ] Confirm the PR has no uncommitted local-only changes.
- [ ] Confirm the PR description lists:
  - files changed,
  - risk level,
  - validation results,
  - rollback path.

## 3. Vercel project settings

- [ ] Framework preset: Next.js.
- [ ] Root directory: repository root.
- [ ] Install command:

```bash
npm ci
```

- [ ] Build command:

```bash
next build
```

- [ ] Output directory:

```text
.next
```

- [ ] Node.js version: Node 20 or a compatible Vercel runtime matching the root
      app package expectations.

## 4. Required local validation before deploy

No deployment is ready unless both commands pass:

```bash
npm ci
npm run build
```

Recommended Vercel-style runtime check:

```bash
npm run start -- -p 5124
```

Then verify:

- [ ] `/api/health` returns HTTP 200 JSON.
- [ ] `/api/healthz` returns HTTP 200.
- [ ] `/health` returns HTTP 200 JSON.
- [ ] `/_health` returns HTTP 200 JSON through rewrite/native behavior.

## 5. Health endpoint expectations

Preserve these endpoints:

- `/api/health`
- `/api/healthz`
- `/health`
- `/_health`

Vercel does not run `server.js`, so all Vercel health behavior must come from
native Next.js routes, rewrites, or Vercel config.

## 6. Environment variables

Use `docs/environment-matrix.md` as the deployment source of truth.

Minimum categories to verify before production:

- [ ] Runtime/platform variables.
- [ ] Public app URL variables.
- [ ] Database variables.
- [ ] Auth/admin/cron variables.
- [ ] Email/notification variables.
- [ ] Payment/webhook variables.
- [ ] Banking and treasury rail variables.
- [ ] Blockchain/RPC variables.
- [ ] Storage/IPFS variables if NFT/artwork flows are active.

Do not expose secret values in PRs, logs, screenshots, or docs.

## 7. Critical production secrets

Confirm these are configured only if their subsystem is active:

- [ ] `DATABASE_URL`
- [ ] `ADMIN_SOLVENCY_KEY`
- [ ] `CRON_SECRET`
- [ ] `SESSION_SECRET`
- [ ] `JWT_SECRET`
- [ ] `RESEND_API_KEY`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] webhook signing secrets for active providers
- [ ] provider API keys for active banking, custody, payment, and blockchain
      services

Do not rename env vars during deployment.

## 8. URL and domain checks

- [ ] `NEXT_PUBLIC_APP_URL` points to the canonical Vercel production domain or
      custom domain.
- [ ] `NEXT_PUBLIC_BASE_URL` is either aligned with `NEXT_PUBLIC_APP_URL` or is
      intentionally different and documented.
- [ ] `NEXT_PUBLIC_SITE_URL` is aligned where used.
- [ ] `APP_URL` is set for GitHub scheduled workflows if those workflows remain
      active.
- [ ] No production deployment depends on `REPLIT_DEV_DOMAIN` or
      `REPLIT_DOMAINS`.

## 9. Replit dependency checks

Confirmed-unused Replit artifacts have been removed in the migration baseline.

Do not remove replacement-needed or uncertain items without a separate scoped
task. Remaining Replit items include:

- active Replit connector fallbacks in email/Discord/contact/banking/compliance
  paths,
- Replit URL fallbacks in NFT, syndication, alert, onramp, and env config paths,
- Replit CORS origins,
- documentation/compliance references that require manual review.

See `docs/replit-dependency-audit.md`.

## 10. Cron and scheduled jobs

Vercel config currently defines cron paths in `vercel.json`.

Before enabling production crons:

- [ ] Confirm `/api/erc3643/identity/expiry-check` has required secrets.
- [ ] Confirm `/api/cron/refresh-solvency` has required secrets.
- [ ] Confirm `/api/cron/reserve-alerts` has required secrets.
- [ ] Confirm `/api/cron/reserve-snapshot` has required secrets.
- [ ] Confirm GitHub `solvency-cron.yml` is either still needed or intentionally
      disabled/replaced.
- [ ] Avoid double-running the same cron from both GitHub Actions and Vercel
      unless explicitly intended.

## 11. High-risk subsystem checks

Do not change these during baseline deployment unless explicitly scoped:

- auth/admin/operator access,
- compliance/KYC/ERC-3643 identity,
- treasury,
- reserve and solvency,
- settlement,
- oracle,
- banking rails,
- webhooks,
- disclosures and policy documents,
- contract config and deployed addresses.

## 12. Post-deploy smoke checks

After Vercel deploy, verify:

- [ ] Home page loads.
- [ ] `/api/health` returns expected JSON.
- [ ] `/api/healthz` returns `ok`.
- [ ] `/health` returns expected JSON.
- [ ] `/_health` returns expected JSON.
- [ ] `robots.txt` loads.
- [ ] `sitemap.xml` loads.
- [ ] Critical public disclosure pages load.
- [ ] Operator/admin paths are not unintentionally exposed.
- [ ] Cron endpoints reject unauthenticated requests where applicable.
- [ ] Webhook endpoints reject unsigned or invalid requests where applicable.

## 13. Rollback

- [ ] Keep the previous known-good deployment available in Vercel.
- [ ] Record the deployed commit SHA.
- [ ] If the deploy fails, roll back through Vercel to the previous deployment.
- [ ] If code rollback is needed, revert the relevant migration baseline commits
      and redeploy.

