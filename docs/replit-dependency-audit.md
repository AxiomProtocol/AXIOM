# Axiom Protocol Root App Replit Dependency Audit

This audit is limited to the root Next.js application and its direct runtime,
deployment, and operational support files. Nested apps are out of scope unless
explicitly requested.

No runtime code was changed by this audit.

## Summary

No active `.replit` file, root `replit.nix`, or Replit GitHub workflow was
found.

The main Replit migration risk is not project configuration. It is active root
runtime code that still uses:

- Replit connector environment variables,
- Replit domain fallbacks,
- hardcoded Replit hosts,
- Replit object-storage sidecar assumptions, and
- the legacy `@replit/database` dependency.

## 1. Confirmed unused and safe to remove

These items appear outside the active root Next.js runtime or are broken legacy
artifacts. Remove them only in a dedicated cleanup PR.

### Missing platform files

- `.replit`
  - Not found.
- `replit.nix`
  - Not found.
- Replit workflow/config files
  - No active Replit workflow/config file found.

### Legacy bot artifacts

- `telegram-bot-axiom.nix`
  - Uses `pkgs.replitPackages.jest`.
  - Not part of the root app runtime.

- `telegram-bot-package.json`
  - Starts `replit-bot-runner.js`.
  - `replit-bot-runner.js` was not found.
  - Not part of root `package.json` scripts.

### Archived Replit database usage

- `utils/pdfLogger.js`
  - Imports `@replit/database`.
  - Traced to archived report code.

- `_archive/api/reports/transparency-reports.js`
- `_archive/api/reports/reserves-history.js`
- `_archive/api/reports/generate-pdf.js`
  - Archived report paths using `@replit/database` or `utils/pdfLogger.js`.

### Legacy object storage

- `server/objectStorage.js`
  - Uses Replit sidecar endpoint `http://127.0.0.1:1106`.
  - Traced to legacy `routes/kyc.js`, which is not mounted by root `server.js`.

- `server/axiom_integrations/object_storage/objectStorage.ts`
  - Uses the same Replit sidecar pattern.
  - No active root Next route import found in this audit.

### Legacy package metadata

- `package.json`
  - `build:replit` duplicates `build`.
  - `legacy-start` and `legacy-dev` point to missing root
    `unified-platform.js`.
  - `main` also references missing root `unified-platform.js`.

- `@replit/database`
  - Appears removable after archived PDF/logger paths are removed or confirmed
    permanently dead.

## 2. Used and needs replacement

These appear in active or plausibly active root runtime paths.

### Active email connector fallback

- `lib/email/resend.ts`

Current behavior:

- prefers direct `RESEND_API_KEY`,
- falls back to Replit connector environment variables:
  - `REPLIT_CONNECTORS_HOSTNAME`
  - `REPL_IDENTITY`
  - `WEB_REPL_RENEWAL`
  - `X_REPLIT_TOKEN`

Active consumers include:

- `pages/api/webhooks/increase.ts`
- `pages/api/erc3643/identity/submit.ts`
- `pages/api/axau/purchase-request/index.ts`
- `pages/api/axiom-rail/escrow/create.ts`
- `pages/api/syndication/offerings/[id]/capital-calls/index.ts`
- `pages/api/syndication/offerings/[id]/reports.ts`
- `pages/api/syndication/offerings/[id]/k1-generate.ts`
- `lib/property/stuckPaymentResolver.ts`

Replacement:

- make direct `RESEND_API_KEY` / `RESEND_FROM_EMAIL` the only production path,
- remove Replit connector fallback after verifying all email call sites.

### Active routes using Replit connector directly

- `pages/api/contact.ts`
  - Public contact route.
  - Uses Replit connector to resolve Resend credentials.

- `pages/api/banking/dao-account/apply.ts`
  - Banking/BSA-sensitive route.
  - Uses Replit connector for notification email.

- `pages/api/erc3643/identity/expiry-check.ts`
  - Compliance-sensitive cron route.
  - Uses Replit connector for compliance alert email.

Replacement:

- switch to direct Resend credentials,
- preserve current validation, persistence, and non-fatal email behavior,
- handle compliance/banking changes in a focused review.

### Discord connector fallback

- `server/services/discordBot.ts`
- `pages/api/discord/*`

Current behavior:

- uses `DISCORD_BOT_TOKEN` if present,
- otherwise attempts Replit connector token resolution.

Replacement:

- require direct Discord bot configuration in production,
- remove Replit connector fallback after Discord admin APIs are validated.

### URL and domain fallbacks

Files using `REPLIT_DEV_DOMAIN`, `REPLIT_DOMAINS`, or hardcoded Replit hosts:

- `pages/api/nft/metadata/[tokenId].ts`
- `pages/api/nft/contract-metadata/[contract].ts`
- `pages/api/syndication/offerings/[id]/capital-calls/index.ts`
- `pages/api/syndication/offerings/[id]/reports.ts`
- `pages/api/syndication/offerings/[id]/k1-generate.ts`
- `lib/capinfra/notifications/integrityPager.ts`
- `lib/admin/prune-alert.ts`
- `lib/reserves/reserveAlertRunner.ts`
- `lib/onramp/config.ts`
- `lib/server/envConfig.ts`
- `scripts/refresh-solvency.ts`
- `scripts/alchemy-webhook-setup.ts`

Replacement:

- standardize on a canonical app URL:
  - `NEXT_PUBLIC_APP_URL` for public/client-safe URLs,
  - optionally `APP_URL` for server-only operational URLs.

### CORS allowlist

- `lib/middleware/cors.ts`

Current behavior:

- allows `REPLIT_DEV_DOMAIN` when set,
- always allows `https://axiom-nexus.replit.app`.

Replacement:

- remove Replit origins after confirming no production traffic depends on them,
- preserve explicit-origin CORS behavior for Coinbase/onramp compliance.

## 3. Uncertain, requires manual review

These may be unused, manual-only, archived, or operationally sensitive.

### Older email modules

- `lib/server/resendEmail.ts`
  - Uses Replit connector only.
  - Active import found in `pages/api/realestate/loan-approval-email.ts`.

- `lib/server/emailService.ts`
  - Uses Replit connector only.
  - Mostly traced to archived notification paths and digest-related code.

Manual review:

- decide whether to replace them with `lib/email/resend.ts`,
- verify active routes before deletion.

### Google Docs and partner email services

- `server/services/googleDocsService.ts`
  - Uses Replit connectors.
  - Traced to `server/routes/manuscript.ts`, which is not obviously mounted by
    root `server.js`.

- `server/services/partner-email.ts`
  - Uses Replit connector and Replit domain fallback.
  - Imports are mainly under `_archive`.

Manual review:

- confirm whether manual scripts or restored routes still depend on these.

### NFT metadata scripts

- `scripts/nft/args-founder.js`
- `scripts/nft/args-land.js`
- `scripts/nft/args-participation.js`
- `scripts/nft/deploy-nft.ts`
- `scripts/nft/check-and-mint-anchors.ts`

Concern:

- hardcoded `axiom-nexus.replit.app` URLs may be reflected in deployed token
  metadata or contract metadata.

Manual review:

- verify immutability/on-chain implications before editing.

### Operational scripts

- `scripts/deploy-discord-rest.ts`
- `scripts/createManifestoGoogleDoc.ts`
- `scripts/create-peoples-rwa-manifesto.js`
- `scripts/create-pma-doc.js`
- `scripts/generate-q5-placeholders.ts`

Manual review:

- determine whether these are still used operationally.

### Diagnostics and tests

- `pages/api/observer/diag.ts`
  - Exposes Replit deployment booleans.

- `tests/buyer-emails.test.ts`
- `tests/property-report-emails.test.ts`
  - Mock Replit connector envs for email behavior.

- `tests/axiom-rail-security.run.ts`
  - Ensures wildcard `*.replit.dev` origins remain blocked.

Manual review:

- update tests after runtime Replit fallbacks are removed,
- keep security test intent when removing Replit references.

### Documentation and compliance references

- `documents/policies/information-security-policy.md`
- `documents/plaid/security-questionnaire-answers.md`
- `documents/policy/stripe-approvable-use-cases.md`
- `documents/repo-cleanup/media-migration-list.md`
- `docs/internal/planning/09_Unit_BitGo_Unified_Integration_Plan.md`
- `public/documents/governance-lending-audit-report.md`
- other docs referencing missing `replit.md`

Manual review:

- compliance and processor-inventory references should not be edited casually,
- update only after replacement processors and deployment target are confirmed.

### Attached prompt artifact

- `attached_assets/Axiom_Unit_Replit_Prompt_1773205479217.md`

Manual review:

- appears non-runtime, but cleanup depends on artifact retention policy.

## Removal order recommendation

1. Replace active connector usage in:
   - `pages/api/contact.ts`
   - `pages/api/banking/dao-account/apply.ts`
   - `pages/api/erc3643/identity/expiry-check.ts`
   - `lib/email/resend.ts`
2. Replace Replit domain fallbacks with canonical app URL config.
3. Remove Replit CORS origins after traffic validation.
4. Remove unused Replit object-storage and archived PDF/logger paths.
5. Remove `@replit/database`.
6. Clean up legacy `package.json` scripts.
7. Update tests and compliance documents.

## Current migration risk

High-value risk before Vercel cutover:

- active Replit connector dependency in contact, banking, compliance, Discord,
  and email flows.

Lower-risk cleanup:

- missing `.replit` / `replit.nix` config,
- unused archived Replit DB paths,
- broken Telegram/Replit bot scripts,
- legacy package script names.
