# Axiom Protocol Root App Environment Matrix

This matrix is scoped to the root Next.js app only. It is based on the current
root app code, deployment files, CI workflows, and migration docs. It does not
include secret values.

Requirement legend:

- Required: app, route, workflow, or subsystem should not be considered ready
  without this variable.
- Conditional: required only when the related subsystem, cron, webhook, script,
  or provider is enabled.
- Optional: has a code fallback or only improves behavior.
- Avoid: legacy or migration-only variable that should not be required for the
  Vercel target.

Sensitivity legend:

- Sensitive: secret, credential, webhook signing key, private key, or privileged
  operational key.
- Public: safe for `NEXT_PUBLIC_*` client exposure, but still controlled config.
- Non-sensitive: environment selector, feature flag, URL, or non-secret setting.
- Internal: not a secret by itself, but should not be casually exposed because it
  describes infrastructure or operations.

## Runtime, platform, and deployment

| Variable | Purpose | Subsystem | Local | Preview | Production | Sensitivity | Notes / ownership |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `NODE_ENV` | Selects development/test/production behavior. | Next.js, DB, auth, tests | Required | Required | Required | Non-sensitive | Owned by platform/runtime. Do not override casually. |
| `PORT` | Runtime port for dev, `next start`, `server.js`, CI, and container. | Runtime/deployment | Optional | Platform | Platform | Non-sensitive | Cloud Run Docker sets `8080`; local dev script uses `5000`. |
| `VERCEL` | Detects Vercel runtime in diagnostics. | Observer diagnostics | N/A | Platform | Platform | Non-sensitive | Set by Vercel. |
| `AXIOM_ENV` | App environment label. | Env config | Optional | Conditional | Conditional | Non-sensitive | Present in `.env.example`; ownership is platform/release. |
| `LAUNCH_MODE` | Enables wallet-only launch gating. | Middleware, launch mode | Optional | Conditional | Conditional | Non-sensitive | High impact if set to `wallet_only`; changes public route access. |
| `OBSERVATION_MODE` | Feature flag for observation behavior. | Feature flags | Optional | Conditional | Conditional | Non-sensitive | Confirm owner before production changes. |
| `STRICT_BOOT_PREFLIGHT` | Tightens integrity pager status/preflight behavior. | Notifications/preflight | Optional | Conditional | Conditional | Non-sensitive | Production ownership uncertain. |
| `TREASURY_INTERNAL_ENABLED` | Treasury internal feature flag. | Feature flags | Optional | Conditional | Conditional | Non-sensitive | High-risk subsystem; owner should be treasury/operator. |
| `PRIVATE_CREDIT_SELF_FUNDED_ENABLED` | Private credit self-funded feature flag. | Feature flags | Optional | Conditional | Conditional | Non-sensitive | Compliance/business owner needed. |
| `REG_CF_ENABLED` | Reg CF feature flag. | Feature flags | Optional | Conditional | Conditional | Non-sensitive | Compliance-sensitive. |
| `INSTITUTIONAL_LP_ENABLED` | Institutional LP feature flag. | Feature flags | Optional | Conditional | Conditional | Non-sensitive | Compliance-sensitive. |
| `EXTERNAL_DEPOSITS_ENABLED` | External deposits feature flag. | Feature flags | Optional | Conditional | Conditional | Non-sensitive | Settlement/treasury-sensitive. |
| `INVESTOR_ONBOARDING_ENABLED` | Investor onboarding feature flag. | Feature flags | Optional | Conditional | Conditional | Non-sensitive | Compliance-sensitive. |
| `NEXT_PUBLIC_GA_ID` | Google Analytics measurement ID. | Analytics/head tags | Optional | Optional | Optional | Public | Marketing/analytics owned. |
| `HOMEPAGE_HERO_CTA_VARIANT` | Homepage CTA variant override. | Homepage truth service | Optional | Optional | Optional | Non-sensitive | Product/marketing owned. |
| `HOMEPAGE_HERO_VARIANT` | Homepage headline variant override. | Homepage truth service | Optional | Optional | Optional | Non-sensitive | Product/marketing owned. |

## URLs and public app identity

| Variable | Purpose | Subsystem | Local | Preview | Production | Sensitivity | Notes / ownership |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Canonical public app URL. | Email links, alerts, NFT metadata, Replit replacement | Optional | Required | Required | Public | Recommended canonical URL for Vercel migration. |
| `NEXT_PUBLIC_BASE_URL` | Public base URL fallback in routes. | Escrow, property checkout, NFT, syndication | Optional | Conditional | Conditional | Public | Overlaps with `NEXT_PUBLIC_APP_URL`; ownership should be unified. |
| `NEXT_PUBLIC_SITE_URL` | Site URL fallback. | Property checkout | Optional | Optional | Conditional | Public | Ownership uncertain; consider consolidating. |
| `NEXT_PUBLIC_API_URL` | API base URL for client/server fetches. | Weekly digest, client config | Optional | Conditional | Conditional | Public | May be unnecessary if same-origin. |
| `PUBLIC_DOMAIN` | Public domain hint for internal solvency ingest. | Solvency auto-ingest | Optional | Conditional | Conditional | Non-sensitive | Ownership uncertain. |
| `INTERNAL_API_BASE_URL` | Internal API base for server-side calls. | Solvency auto-ingest | Optional | Conditional | Conditional | Internal | Required if auto-ingest cannot call same-origin. |
| `APP_URL` | External app URL used by scheduled GitHub workflow. | Solvency GitHub cron | N/A | Conditional | Required if workflow active | Internal | GitHub secret; no value in repo. |
| `BASE_URL` | Script base URL fallback. | Operational scripts | Optional | Optional | Conditional | Internal | Used by scripts; not primary runtime contract. |
| `CAPINFRA_BASE_URL` | Capinfra script/API base URL. | Operational scripts | Optional | Optional | Conditional | Internal | Used by vault sprint scripts. |
| `SOLVENCY_REFRESH_URL` | Explicit solvency refresh endpoint. | Solvency refresh script | Optional | Optional | Conditional | Internal | Alternative to derived app URL. |
| `REPLIT_DEV_DOMAIN` | Legacy Replit domain fallback. | Legacy URLs, CORS, email links | Avoid | Avoid | Avoid | Non-sensitive | Replacement-needed per Replit audit. |
| `REPLIT_DOMAINS` | Legacy Replit domain list. | Legacy scripts/services | Avoid | Avoid | Avoid | Non-sensitive | Replacement-needed per Replit audit. |
| `REPLIT_DEPLOYMENT` | Replit diagnostic flag. | Observer diagnostics | Avoid | Avoid | Avoid | Non-sensitive | Should not be required on Vercel. |
| `REPL_ID` | Replit diagnostic flag. | Observer diagnostics | Avoid | Avoid | Avoid | Non-sensitive | Should not be required on Vercel. |

## Database and migrations

| Variable | Purpose | Subsystem | Local | Preview | Production | Sensitivity | Notes / ownership |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `DATABASE_URL` | Primary PostgreSQL connection string. | DB, Drizzle, APIs, services | Required for DB-backed flows | Required | Required | Sensitive | Critical owner: platform/database. Must not point tests at production. |
| `TEST_DATABASE_URL` | Dedicated test database URL. | CI migrations/tests | Required for CI | Conditional | N/A | Sensitive | GitHub Actions requires this for predeploy tests. |
| `SKIP_MIGRATIONS` | Skip Vitest global migration setup. | Tests | Optional | Optional | N/A | Non-sensitive | Test-only escape hatch. |
| `SKIP_DB_MIGRATE` | Prevent migrate module auto-run. | Migrations/tests | Optional | Optional | N/A | Non-sensitive | Test/migration guard. |
| `RUN_DB_MIGRATE` | Force migration auto-run. | Migrations | Optional | Optional | Conditional | Non-sensitive | Use carefully; migration owner should approve. |
| `VITEST` | Test runner marker. | Migrate guard | Tool-set | Tool-set | N/A | Non-sensitive | Set by Vitest/runtime. |

## Authentication, admin, cron, and operator control

| Variable | Purpose | Subsystem | Local | Preview | Production | Sensitivity | Notes / ownership |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ADMIN_SOLVENCY_KEY` | Legacy/super-admin key for operator/admin APIs and tests. | Admin, operator, solvency, capinfra | Conditional | Required for admin flows | Required | Sensitive | High-risk. Owner should be platform/security. |
| `ADMIN_SETUP_SECRET` | Alternate admin setup/realestate auth. | Admin/realestate | Optional | Conditional | Conditional | Sensitive | Ownership uncertain. |
| `ADMIN_EDIT_TOKEN` | Roadmap/admin edit token. | Roadmap API | Optional | Conditional | Conditional | Sensitive | Ownership uncertain. |
| `ADMIN_WALLETS` | Admin wallet allowlist. | Admin config | Optional | Conditional | Conditional | Sensitive | Treat as access-control config. |
| `CAPINFRA_KEY_*` | Role-scoped capinfra admin keys. | Capinfra auth | Optional | Conditional | Required for role-gated ops | Sensitive | Documented pattern; exact names are dynamic. |
| `SESSION_SECRET` | Session/JWT fallback secret. | Auth/admin | Optional | Required | Required | Sensitive | Required if session auth paths are active. |
| `JWT_SECRET` | JWT signing/verification secret. | Auth/admin | Optional | Required | Required | Sensitive | Required for `server/admin-api.ts` and auth helpers. |
| `MIRDT_SCAN_KEY` | Scheduler/sentinel/admin scan key. | Sentinel, scheduler, ops | Optional in development | Required | Required | Sensitive | Many routes allow dev fallback only. |
| `CRON_SECRET` | Bearer secret for cron endpoints. | Cron/solvency/erc3643 | Optional | Required for cron | Required | Sensitive | GitHub/Vercel cron owner. |
| `SENTINEL_SIGNER_KEY` | Sentinel log/hash signing salt/key. | Sentinel authorization service | Optional | Conditional | Required if sentinel live | Sensitive | Defaults in dev; production owner needed. |

## Supabase

| Variable | Purpose | Subsystem | Local | Preview | Production | Sensitivity | Notes / ownership |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. | Supabase admin/client | Optional | Conditional | Conditional | Public | Required only if Supabase-backed flows are active. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key. | Supabase client | Optional | Conditional | Conditional | Public | Public but controlled. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin service role. | Supabase admin | Optional | Conditional | Conditional | Sensitive | Never expose to client. |

## Email, alerts, and notifications

| Variable | Purpose | Subsystem | Local | Preview | Production | Sensitivity | Notes / ownership |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `RESEND_API_KEY` | Direct Resend API key. | Email | Optional | Required for email flows | Required for email flows | Sensitive | Preferred replacement for Replit connector fallback. |
| `RESEND_FROM_EMAIL` | Default sender email. | Email | Optional | Conditional | Required for branded email | Non-sensitive | May be domain-verified. |
| `PILOT_FROM_EMAIL` | Sender for pilot notifications. | Pilot notifications | Optional | Conditional | Conditional | Non-sensitive | Pilot owner. |
| `COMPLIANCE_ALERT_EMAIL` | ERC-3643 claim expiry alert recipient. | Compliance alerts | Optional | Conditional | Conditional | Sensitive | Recipient list may be operationally sensitive. |
| `INTEGRITY_ALERT_EMAIL` | Integrity pager email recipients. | Capinfra notifications | Optional | Conditional | Conditional | Sensitive | On-call/ops owner. |
| `INTEGRITY_ALERT_DISCORD_WEBHOOK` | Integrity pager Discord webhook. | Capinfra notifications | Optional | Conditional | Conditional | Sensitive | Webhook secret. |
| `INTEGRITY_PAGER_WIRING_OWNER_EMAIL` | Wiring-check owner email. | Capinfra notifications | Optional | Conditional | Conditional | Sensitive | Ops owner. |
| `PRUNE_ALERT_EMAIL` | Prune alert recipients. | Admin prune alerts | Optional | Conditional | Conditional | Sensitive | Ops owner. |
| `PRUNE_ALERT_DISCORD_WEBHOOK` | Prune Discord webhook. | Admin prune alerts | Optional | Conditional | Conditional | Sensitive | Webhook secret. |
| `PRUNE_ALERT_LOG_RETENTION_DAYS` | Retention for prune alert logs. | Admin config | Optional | Optional | Conditional | Non-sensitive | Compliance/ops retention owner. |
| `CARD_DEPOSITS_ARCHIVE_EMAIL` | Card deposit archive recipient. | Card deposits | Optional | Conditional | Conditional | Sensitive | Treasury/ops owner. |
| `DISCORD_BOT_TOKEN` | Discord bot token. | Discord admin APIs | Optional | Conditional | Conditional | Sensitive | Replacement for Replit Discord connector fallback. |
| `DISCORD_OPERATOR_CHANNEL_ID` | Discord alert channel. | Alchemy webhook alerts | Optional | Conditional | Conditional | Internal | Ops owner. |
| `SLACK_WEBHOOK_URL` | Slack alert webhook. | Alert service | Optional | Conditional | Conditional | Sensitive | Webhook secret. |
| `ALERT_WEBHOOK_URL` | Generic alert webhook. | Alert service | Optional | Conditional | Conditional | Sensitive | Webhook secret. |
| `SMTP_HOST` | SMTP host. | Legacy mail service | Optional | Conditional | Conditional | Internal | Legacy ownership uncertain. |
| `SMTP_PORT` | SMTP port. | Legacy mail service | Optional | Conditional | Conditional | Non-sensitive | Legacy ownership uncertain. |
| `SMTP_SECURE` | SMTP TLS mode. | Legacy mail service | Optional | Conditional | Conditional | Non-sensitive | Legacy ownership uncertain. |
| `SMTP_USER` | SMTP username. | Legacy mail service | Optional | Conditional | Conditional | Sensitive | Legacy ownership uncertain. |
| `SMTP_PASS` | SMTP password. | Legacy mail service | Optional | Conditional | Conditional | Sensitive | Legacy ownership uncertain. |
| `EMAIL_USER` | Alternate SMTP username. | Legacy mail service | Optional | Conditional | Conditional | Sensitive | Legacy ownership uncertain. |
| `EMAIL_PASS` | Alternate SMTP password. | Legacy mail service | Optional | Conditional | Conditional | Sensitive | Legacy ownership uncertain. |
| `EMAIL_FROM` | Legacy sender address. | Legacy mail service | Optional | Conditional | Conditional | Non-sensitive | Legacy ownership uncertain. |
| `EMAIL_ALERTS_ENABLED` | Enables email alert path. | Alert service | Optional | Conditional | Conditional | Non-sensitive | Ops owner. |

## Replit connector legacy variables

| Variable | Purpose | Subsystem | Local | Preview | Production | Sensitivity | Notes / ownership |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `REPLIT_CONNECTORS_HOSTNAME` | Legacy Replit connector host. | Email/Discord/Google connectors | Avoid | Avoid | Avoid | Internal | Replacement-needed per `docs/replit-dependency-audit.md`. |
| `REPL_IDENTITY` | Legacy Replit identity token source. | Replit connector auth | Avoid | Avoid | Avoid | Sensitive | Do not require on Vercel. |
| `WEB_REPL_RENEWAL` | Legacy Replit deploy token source. | Replit connector auth | Avoid | Avoid | Avoid | Sensitive | Do not require on Vercel. |

## Payments and billing

| Variable | Purpose | Subsystem | Local | Preview | Production | Sensitivity | Notes / ownership |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `STRIPE_SECRET_KEY` | Stripe server API key. | Property payments, card deposits, billing | Conditional | Required for payments | Required for payments | Sensitive | Payments owner. |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature secret. | Stripe webhooks | Conditional | Required if webhook active | Required if webhook active | Sensitive | Must match endpoint deployment. |
| `STRIPE_EXPECTED_ACCOUNT_ID` | Guard expected Stripe account. | Stripe client guard | Optional | Recommended | Recommended | Internal | Protects against wrong account/key. |
| `STRIPE_EXPECTED_KEY_ID` | Alternate expected Stripe key/account marker. | Stripe client guard | Optional | Recommended | Recommended | Internal | Ownership: payments/platform. |
| `BILLING_PRICE_ID_WORKBOOK_MONTHLY` | Workbook subscription price ID. | Workbook billing | Optional | Conditional | Conditional | Non-sensitive | Billing owner. |
| `BILLING_WEBHOOK_SECRET` | Workbook billing webhook secret. | Workbook billing | Optional | Conditional | Conditional | Sensitive | Required if workbook webhooks active. |

## Banking, treasury rails, and bridge providers

| Variable | Purpose | Subsystem | Local | Preview | Production | Sensitivity | Notes / ownership |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `BANKING_PROVIDER` | Selects active banking provider. | Banking registry | Optional | Conditional | Conditional | Non-sensitive | Banking owner. |
| `INCREASE_ENVIRONMENT` | Increase sandbox/production selector. | Increase banking | Optional | Required if Increase active | Required if Increase active | Non-sensitive | Must align with IDs and API keys. |
| `INCREASE_API_KEY` | Increase production API key. | Increase banking | Avoid for local | Avoid in preview unless live testing | Required for live Increase | Sensitive | Banking owner. |
| `INCREASE_SANDBOX_API_KEY` | Increase sandbox API key. | Increase banking | Conditional | Conditional | N/A unless sandbox | Sensitive | Use for non-production. |
| `INCREASE_BASE_URL` | Increase production URL override. | Increase banking | Optional | Optional | Optional | Internal | Usually default. |
| `INCREASE_SANDBOX_BASE_URL` | Increase sandbox URL override. | Increase banking | Optional | Optional | Optional | Internal | Usually default. |
| `INCREASE_ACCOUNT_ID` | Production account ID. | Increase banking | Avoid | Avoid | Required if live Increase | Sensitive | Banking/treasury owner. |
| `INCREASE_ENTITY_ID` | Production entity ID. | Increase banking | Avoid | Avoid | Required if live Increase | Sensitive | Banking owner. |
| `INCREASE_PROGRAM_ID` | Production program ID. | Increase onboarding | Avoid | Avoid | Required if onboarding active | Sensitive | Banking owner. |
| `INCREASE_SANDBOX_ACCOUNT_ID` | Sandbox account ID. | Increase banking | Conditional | Conditional | N/A unless sandbox | Sensitive | Banking owner. |
| `INCREASE_SANDBOX_ENTITY_ID` | Sandbox entity ID. | Increase banking | Conditional | Conditional | N/A unless sandbox | Sensitive | Banking owner. |
| `INCREASE_SANDBOX_PROGRAM_ID` | Sandbox program ID. | Increase onboarding | Conditional | Conditional | N/A unless sandbox | Sensitive | Banking owner. |
| `INCREASE_WEBHOOK_SECRET` | Increase webhook signing secret. | Webhooks | Conditional | Required if webhook active | Required if webhook active | Sensitive | Must match provider webhook config. |
| `INCREASE_DISABLED` | Disables Increase webhook handling. | Webhooks | Optional | Optional | Conditional | Non-sensitive | Emergency/ops flag. |
| `UNIT_API_URL` | Unit API base URL. | Unit banking/syndication | Optional | Conditional | Conditional | Internal | Unit owner. |
| `UNIT_API_TOKEN` | Unit API token. | Unit banking/syndication | Optional | Conditional | Conditional | Sensitive | Unit owner. |
| `UNIT_WEBHOOK_TOKEN` | Unit webhook verification token. | Webhooks | Optional | Required if Unit webhook active | Required if active | Sensitive | Unit owner. |
| `UNIT_ROUTING_NUMBER` | Funding instructions routing number. | Syndication funding | Optional | Conditional | Conditional | Sensitive | Treasury/banking owner. |
| `UNIT_ACCOUNT_NUMBER` | Funding instructions account number. | Syndication funding | Optional | Conditional | Conditional | Sensitive | Treasury/banking owner. |
| `UNIT_TREASURY_ACCOUNT_ID` | Unit treasury account ID. | Syndication capital calls | Optional | Conditional | Conditional | Sensitive | Treasury owner. |
| `PLAID_CLIENT_ID` | Plaid client ID. | Plaid/capinfra | Optional | Conditional | Conditional | Sensitive | Banking owner. |
| `PLAID_SECRET` | Plaid secret. | Plaid/capinfra | Optional | Conditional | Conditional | Sensitive | Banking owner. |
| `PLAID_ENV` | Plaid environment. | Plaid/capinfra | Optional | Conditional | Conditional | Non-sensitive | Must align with credentials. |
| `PLAID_ENCRYPTION_KEY` | Encrypts Plaid material. | Plaid encryption | Optional in dev | Required if Plaid active | Required if active | Sensitive | Critical secret. |
| `BRIDGE_FEE_PERCENT` | Bridge fee configuration. | Bridge/integrations | Optional | Conditional | Conditional | Non-sensitive | Treasury/product owner. |

## Blockchain, wallets, contracts, and RPC

| Variable | Purpose | Subsystem | Local | Preview | Production | Sensitivity | Notes / ownership |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ALCHEMY_API_KEY` | Server-side Arbitrum RPC/API key. | RPC, observer, NFT, savings, oracle | Conditional | Required for on-chain features | Required for on-chain features | Sensitive | Platform/web3 owner. |
| `NEXT_PUBLIC_ALCHEMY_API_KEY` | Client-safe Alchemy key. | Wagmi/client RPC | Optional | Conditional | Conditional | Public | Public but controlled. |
| `ALCHEMY_WEBHOOK_SECRET` | Alchemy webhook signing secret. | Webhooks | Optional | Required if webhook active | Required if active | Sensitive | Must match Alchemy webhook config. |
| `ARBITRUM_RPC_URL` | RPC URL fallback/override. | On-chain services | Optional | Conditional | Conditional | Internal | Use when not using Alchemy. |
| `MAINNET_RPC_URL` | Legacy/root script RPC fallback. | Legacy scripts | Optional | Optional | Conditional | Internal | Ownership uncertain. |
| `DEPLOYER_PRIVATE_KEY` | EVM signer private key. | NFT, ERC3643, settlement, scripts | Avoid | Avoid unless test wallet | Conditional/live ops only | Sensitive | High risk; never expose. |
| `DEPLOYER_PK` | Alternate deployer private key name. | Operational scripts | Avoid | Avoid | Conditional/live ops only | Sensitive | Legacy alias; ownership uncertain. |
| `PRIVATE_KEY` | Alternate private key fallback. | Operational scripts | Avoid | Avoid | Conditional/live ops only | Sensitive | Legacy alias; avoid standardizing. |
| `AXIOM_OPERATOR_KEY` | Operator private key. | Rewards service | Avoid | Conditional | Conditional | Sensitive | High-risk on-chain key. |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID. | Wallet UI | Optional | Conditional | Conditional | Public | Required for wallet connection UX. |
| `NEXT_PUBLIC_E2E_WAGMI` | Enables E2E mock wallet mode. | Wallet tests | Optional | Optional | N/A | Non-sensitive | Test-only. |
| `NEXT_PUBLIC_ENABLE_EARN_AXUSD_DEPOSITS` | Enables Earn AXUSD deposits UI/path. | Earn vaults | Optional | Conditional | Conditional | Public | Product/risk owner. |
| `NFT_CONTRACT_FOUNDER` | Founder NFT contract address. | NFT APIs | Optional | Conditional | Conditional | Non-sensitive | Contract config owner. |
| `NFT_CONTRACT_PARTICIPATION` | Participation NFT contract address. | NFT APIs | Optional | Conditional | Conditional | Non-sensitive | Contract config owner. |
| `NFT_CONTRACT_LAND` | Land NFT contract address. | NFT APIs | Optional | Conditional | Conditional | Non-sensitive | Contract config owner. |
| `TREASURY_ADDRESS` | NFT contract metadata treasury address. | NFT metadata | Optional | Conditional | Conditional | Non-sensitive | Check canonical address source. |
| `TREASURY_WALLET_ADDRESS` | Treasury wallet for syndication/funding. | Syndication/treasury | Optional | Conditional | Conditional | Sensitive/Internal | Treasury owner. |
| `TREASURY_WALLET` | Legacy treasury wallet setting. | Legacy server API | Optional | Optional | Conditional | Sensitive/Internal | Ownership uncertain. |
| `AXM_TOKEN_ADDRESS` | AXM token address. | Rewards/bridge/subprojects | Optional | Conditional | Conditional | Non-sensitive | Contract config owner. |
| `AXUSD_TOKEN_ADDRESS` | AXUSD token address. | Rewards/settlement | Optional | Conditional | Conditional | Non-sensitive | Contract config owner. |
| `AXUSD_ADDRESS` | AXUSD script address. | Operational scripts | Optional | Conditional | Conditional | Non-sensitive | Script/contract owner. |
| `USDC_ADDRESS` | USDC script address. | Operational scripts | Optional | Conditional | Conditional | Non-sensitive | Script/contract owner. |
| `ROUTER_ADDRESS` | DEX/router script address. | Operational scripts | Optional | Conditional | Conditional | Non-sensitive | Contract owner. |
| `PAIR_ADDRESS` | Pair script address. | Operational scripts | Optional | Conditional | Conditional | Non-sensitive | Contract owner. |
| `SWF_TOKEN_ADDRESS` | Legacy token address. | Legacy APIs/scripts | Optional | Optional | Conditional | Non-sensitive | Legacy ownership uncertain. |
| `ORACLE_STALE_THRESHOLD_SECONDS` | Oracle freshness threshold. | AXAU/oracle service | Optional | Conditional | Conditional | Non-sensitive | Oracle/risk owner. |
| `PAXG_BUFFER_MIN_PAXG` | PAXG reserve buffer threshold. | Operator readiness | Optional | Conditional | Conditional | Non-sensitive | Reserve/risk owner. |
| `EVM_ADAPTER_MODE` | EVM adapter mode. | Capinfra EVM adapter | Optional | Conditional | Conditional | Non-sensitive | Settlement/risk owner. |
| `EVM_ADAPTER_LIVE_ALLOWLIST` | Live EVM adapter allowlist. | Capinfra EVM adapter | Optional | Conditional | Required if live adapter | Sensitive/Internal | Settlement/risk owner. |
| `TIMEBOOST_ENABLED` | Enables Timeboost service. | DEX service | Optional | Conditional | Conditional | Non-sensitive | DEX owner. |
| `TIMEBOOST_MAX_BID` | Timeboost max bid setting. | DEX service | Optional | Conditional | Conditional | Non-sensitive | DEX/risk owner. |
| `POLYGONSCAN_API_KEY` | Legacy explorer verification key. | Archived/legacy contract APIs | Optional | Optional | Conditional | Sensitive | Likely out of runtime path; manual review. |

## Circle, Coinbase CDP, and BitGo

| Variable | Purpose | Subsystem | Local | Preview | Production | Sensitivity | Notes / ownership |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `CIRCLE_APP_ID` | Circle app ID. | Circle wallet client | Optional | Conditional | Conditional | Sensitive/Internal | Circle owner. |
| `CIRCLE_API_KEY` | Circle API key. | Circle webhook/compliance | Optional | Conditional | Conditional | Sensitive | Circle owner. |
| `CIRCLE_COMPLIANCE_API_KEY` | Circle compliance key. | Circle compliance | Optional | Conditional | Conditional | Sensitive | Compliance/payment owner. |
| `CIRCLE_ENVIRONMENT` | Circle environment selector. | Circle services | Optional | Conditional | Conditional | Non-sensitive | Must match keys. |
| `NEXT_PUBLIC_CIRCLE_PAYMASTER_ENABLED` | Client feature flag. | Circle/paymaster UI | Optional | Conditional | Conditional | Public | Product/infra owner. |
| `COINBASE_PROJECT_ID` | Coinbase/CDP project ID. | Onramp/CDP | Optional | Conditional | Conditional | Sensitive/Internal | Coinbase owner. |
| `COINBASE_API_KEY` | Coinbase CDP API key ID. | CDP client | Optional | Conditional | Conditional | Sensitive | Paired with API secret. |
| `COINBASE_API_KEY2` | Coinbase CDP API secret. | CDP client | Optional | Conditional | Conditional | Sensitive | Naming ownership uncertain. |
| `CDP_PROJECT_ID` | CDP project ID fallback. | Onramp/CDP | Optional | Conditional | Conditional | Sensitive/Internal | CDP owner. |
| `NEXT_PUBLIC_CDP_PROJECT_ID` | Public CDP project ID. | Onramp/client | Optional | Conditional | Conditional | Public | Public but controlled. |
| `CDP_WALLET_SECRET` | CDP wallet secret. | CDP wallet service | Optional | Conditional | Conditional | Sensitive | High-risk custody-adjacent secret. |
| `BITGO_ACCESS_TOKEN` | BitGo API token. | BitGo custody/integrations | Optional | Conditional | Conditional | Sensitive | Custody owner. |
| `BITGO_API_URL` | BitGo API base URL. | BitGo custody/integrations | Optional | Conditional | Conditional | Internal | Must align sandbox/live. |
| `BITGO_ENTERPRISE_ID` | BitGo enterprise ID. | BitGo custody | Optional | Conditional | Conditional | Sensitive/Internal | Custody owner. |
| `BITGO_COIN` | BitGo coin/network selector. | BitGo custody | Optional | Conditional | Conditional | Non-sensitive | Must align environment. |
| `BITGO_WALLET_PASSPHRASE` | BitGo wallet passphrase. | BitGo integrations | Avoid | Avoid | Conditional | Sensitive | High-risk; placeholder fallback exists and needs review. |
| `BITGO_WEBHOOK_SECRET` | BitGo webhook signing secret. | Webhooks | Optional | Required if webhook active | Required if active | Sensitive | Custody/webhook owner. |

## Stellar and Axiom Rail

| Variable | Purpose | Subsystem | Local | Preview | Production | Sensitivity | Notes / ownership |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ENABLE_STELLAR_PAYMENTS_RAIL` | Enables Stellar rail UI. | Axiom payment rails | Optional | Conditional | Conditional | Public/Non-sensitive | Product/rail owner. |
| `STELLAR_ACTIVE_ANCHOR` | Selects active Stellar anchor. | Stellar anchor info | Optional | Conditional | Conditional | Non-sensitive | Defaults to `axiom-rail`. |
| `STELLAR_SIGNING_SECRET_KEY` | Stellar signing/JWT secret fallback. | Stellar auth | Optional | Required if Stellar auth active | Required if active | Sensitive | Rail owner. |
| `STELLAR_JWT_SECRET` | Stellar JWT secret. | Stellar auth | Optional | Required if auth active | Required if active | Sensitive | Prefer explicit JWT secret in production. |

## Market data, property data, and pricing

| Variable | Purpose | Subsystem | Local | Preview | Production | Sensitivity | Notes / ownership |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ATTOM_API_KEY` | Property data API key. | Property/real estate/distressed feed | Optional | Conditional | Conditional | Sensitive | Property data owner. |
| `ATTOM_API_KET` | Typo fallback for ATTOM key. | Property data | Avoid | Avoid | Avoid | Sensitive | Exists in code; ownership uncertain. |
| `RENTCAST_API_KEY` | Rentcast API key. | Property/rent data | Optional | Conditional | Conditional | Sensitive | Property data owner. |
| `WALKSCORE_API_KEY` | Walk Score API key. | Property data | Optional | Conditional | Conditional | Sensitive | Property data owner. |
| `ALPHA_VANTAGE_API_KEY` | Alpha Vantage market/macro key. | Prices, volatility, MIRDT | Optional | Conditional | Conditional | Sensitive | Market data owner. |
| `PRICES_CACHE_TTL_SECONDS` | Price cache TTL. | Prices API | Optional | Optional | Conditional | Non-sensitive | Defaults to 60 seconds. |

## Cost intelligence and construction data

| Variable | Purpose | Subsystem | Local | Preview | Production | Sensitivity | Notes / ownership |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `CRAFTSMAN_API_KEY` | Craftsman API key. | Cost intelligence | Optional | Conditional | Conditional | Sensitive | Cost intelligence owner. |
| `CRAFTSMAN_API_BASE_URL` | Craftsman API base URL. | Cost intelligence | Optional | Optional | Optional | Internal | Defaults in code. |
| `CRAFTSMAN_API_TIMEOUT_MS` | Craftsman timeout. | Cost intelligence | Optional | Optional | Optional | Non-sensitive | Tunable. |
| `CRAFTSMAN_API_MAX_RETRIES` | Craftsman retry count. | Cost intelligence | Optional | Optional | Optional | Non-sensitive | Tunable. |
| `CRAFTSMAN_API_RETRY_DELAY_MS` | Craftsman retry delay. | Cost intelligence | Optional | Optional | Optional | Non-sensitive | Tunable. |
| `COST_CATALOG_CACHE_TTL_MS` | Catalog cache TTL. | Cost intelligence | Optional | Optional | Optional | Non-sensitive | Tunable. |
| `COST_DEFAULT_CONTINGENCY_PCT` | Default contingency percentage. | Cost intelligence | Optional | Optional | Optional | Non-sensitive | Product/risk owner. |
| `COST_DEFAULT_SOFT_COST_PCT` | Default soft-cost percentage. | Cost intelligence | Optional | Optional | Optional | Non-sensitive | Product/risk owner. |

## Solvency AME tuning

| Variable | Purpose | Subsystem | Local | Preview | Production | Sensitivity | Notes / ownership |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `AME_CR_EXPANSION` | AME collateral ratio expansion value. | Solvency AME | Optional | Conditional | Conditional | Non-sensitive | Risk/solvency owner. |
| `AME_CR_NORMAL` | AME collateral ratio normal value. | Solvency AME | Optional | Conditional | Conditional | Non-sensitive | Risk/solvency owner. |
| `AME_CR_DEFENSIVE` | AME collateral ratio defensive value. | Solvency AME | Optional | Conditional | Conditional | Non-sensitive | Risk/solvency owner. |
| `AME_RR_EXPANSION` | AME reserve ratio expansion value. | Solvency AME | Optional | Conditional | Conditional | Non-sensitive | Risk/solvency owner. |
| `AME_RR_NORMAL` | AME reserve ratio normal value. | Solvency AME | Optional | Conditional | Conditional | Non-sensitive | Risk/solvency owner. |
| `AME_RR_DEFENSIVE` | AME reserve ratio defensive value. | Solvency AME | Optional | Conditional | Conditional | Non-sensitive | Risk/solvency owner. |
| `AME_VPI_DEFENSIVE` | AME VPI defensive threshold. | Solvency AME | Optional | Conditional | Conditional | Non-sensitive | Risk/solvency owner. |
| `AME_VPI_SHOCK` | AME VPI shock threshold. | Solvency AME | Optional | Conditional | Conditional | Non-sensitive | Risk/solvency owner. |
| `AME_RSR_RUN` | AME RSR run threshold. | Solvency AME | Optional | Conditional | Conditional | Non-sensitive | Risk/solvency owner. |
| `AME_LSR_FLOOR` | AME LSR floor. | Solvency AME | Optional | Conditional | Conditional | Non-sensitive | Risk/solvency owner. |
| `AME_SMF_EXPONENT` | AME stress multiplier exponent. | Solvency AME | Optional | Conditional | Conditional | Non-sensitive | Risk/solvency owner. |
| `AME_BRAKE_RELEASE_CONSECUTIVE` | Consecutive release count for hard-brake logic. | Solvency AME | Optional | Conditional | Conditional | Non-sensitive | Risk/solvency owner. |

## AI, automation, and external workflow integrations

| Variable | Purpose | Subsystem | Local | Preview | Production | Sensitivity | Notes / ownership |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `AI_AGENT_MODE` | AI agent mode selector. | Env config/agent governance | Optional | Conditional | Conditional | Non-sensitive | Production defaults should be conservative. |
| `AI_AGENT_PRODUCTION_OVERRIDE` | Enables AI behavior in production. | Env config/agent governance | Avoid | Avoid | Conditional with approval | Non-sensitive | High governance risk. |
| `AXIOM_AGENT_LIVE_EXECUTION` | Enables live agent execution. | Agent governance | Avoid | Avoid | Conditional with approval | Non-sensitive | High governance risk. |
| `AI_MONTHLY_LIMITS_JSON` | AI monthly usage limits. | Workbook/AI usage meter | Optional | Conditional | Conditional | Sensitive/Internal | May reveal operational limits. |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI-compatible API key. | AI integrations/scripts | Optional | Conditional | Conditional | Sensitive | AI owner. |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI-compatible base URL. | AI integrations/scripts | Optional | Optional | Conditional | Internal | Provider owner. |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | Anthropic API key. | AI integrations/scripts | Optional | Conditional | Conditional | Sensitive | AI owner. |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | Anthropic base URL override. | AI integrations/scripts | Optional | Optional | Conditional | Internal | Provider owner. |
| `AI_INTEGRATIONS_GEMINI_API_KEY` | Gemini API key. | AI integrations | Optional | Conditional | Conditional | Sensitive | AI owner. |
| `AI_INTEGRATIONS_GEMINI_BASE_URL` | Gemini base URL override. | AI integrations | Optional | Optional | Conditional | Internal | Provider owner. |
| `MATRIX_HOMESERVER_URL` | Matrix homeserver URL. | Matrix workflow | Optional | Conditional | Conditional | Internal | Workflow owner. |
| `MATRIX_ACCESS_TOKEN` | Matrix access token. | Matrix workflow | Optional | Conditional | Conditional | Sensitive | Workflow owner. |
| `MATRIX_USER_ID` | Matrix user ID. | Matrix workflow | Optional | Conditional | Conditional | Internal | Workflow owner. |
| `FAMILYSEARCH_CLIENT_ID` | FamilySearch OAuth client ID. | Workbook/family search | Optional | Conditional | Conditional | Sensitive/Internal | Uses legacy Replit URL fallback; ownership uncertain. |
| `GITHUB_TOKEN` | GitHub API token for PR/repo fetches. | GitHub integrations | Optional | Conditional | Conditional | Sensitive | Use least privilege. |

## Storage and IPFS

| Variable | Purpose | Subsystem | Local | Preview | Production | Sensitivity | Notes / ownership |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `PINATA_JWT` | Pinata/IPFS upload token. | NFT artwork/scripts | Optional | Conditional | Conditional | Sensitive | Needed for pinning flows, not normal page render. |
| `PUBLIC_OBJECT_SEARCH_PATHS` | Legacy object storage public paths. | Legacy storage | Avoid | Avoid | Avoid | Internal | Replit object-storage runtime was removed; confirm before reintroducing. |
| `PRIVATE_OBJECT_DIR` | Legacy object storage private dir. | Legacy storage | Avoid | Avoid | Avoid | Internal | Replit object-storage runtime was removed; confirm before reintroducing. |

## Legacy and uncertain variables

| Variable | Purpose | Subsystem | Local | Preview | Production | Sensitivity | Notes / ownership |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token. | Legacy Telegram docs/config | Optional | Optional | Conditional | Sensitive | No root runtime ownership confirmed. |
| `TELEGRAM_GROUP_USERNAME` | Telegram group username. | Legacy Telegram docs/config | Optional | Optional | Conditional | Non-sensitive | Ownership uncertain. |
| `MONGODB_URI` | MongoDB connection string. | Legacy/uncertain | Avoid | Avoid | Avoid unless owner confirms | Sensitive | Present in `.env.example`; no root ownership confirmed. |
| `ADMIN_USERNAMES` | Legacy admin username list. | Legacy/uncertain | Optional | Optional | Conditional | Sensitive/Internal | Ownership uncertain. |
| `URL_SHORTENER_DOMAIN` | Branded shortlink domain. | Legacy/marketing | Optional | Optional | Conditional | Non-sensitive | Ownership uncertain. |
| `DEPLOYER_PK` / `PRIVATE_KEY` | Legacy signer aliases. | Scripts/contracts | Avoid | Avoid | Conditional/live ops only | Sensitive | Do not standardize without owner approval. |
| `ADMIN` | Admin address in `.env.example`. | Contract/deploy config | Optional | Optional | Conditional | Non-sensitive | Contract tooling mostly out of migration scope. |
| `PEAQ_RPC_URL` | peaq RPC URL. | Axiom contract scripts | Optional | Optional | Conditional | Internal | Contract tooling mostly out of migration scope. |
| `PEAQ_API_KEY` | peaq API key placeholder. | Axiom contract scripts | Optional | Optional | Conditional | Sensitive | Contract tooling mostly out of migration scope. |
| `SCHEMA_CUSTODIAN` | Gold reserve schema value. | AXAU/deploy config | Optional | Optional | Conditional | Non-sensitive | Ownership uncertain. |
| `SCHEMA_AUDITOR` | Gold reserve schema value. | AXAU/deploy config | Optional | Optional | Conditional | Non-sensitive | Ownership uncertain. |
| `GOLD_CUSTODIAN` | Gold custodian address. | AXAU/deploy config | Optional | Optional | Conditional | Non-sensitive | Ownership uncertain. |
| `GOLD_AUDITOR` | Gold auditor address. | AXAU/deploy config | Optional | Optional | Conditional | Non-sensitive | Ownership uncertain. |
| `MONTHLY_CAP_AXM` | Rewards cap. | Rewards/deploy config | Optional | Optional | Conditional | Non-sensitive | Ownership uncertain. |
| `LOCK_SECONDS` | Rewards lock duration. | Rewards/deploy config | Optional | Optional | Conditional | Non-sensitive | Ownership uncertain. |

## Ownership gaps and cleanup notes

- `.env.example` is not a complete source of truth. Many variables appear only
  in code paths.
- `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_SITE_URL`,
  `PUBLIC_DOMAIN`, `INTERNAL_API_BASE_URL`, and script-specific base URLs
  overlap. URL ownership should be consolidated before Vercel cutover.
- Replit connector variables are still present in active replacement-needed
  paths. They should not be required for production Vercel.
- `ATTOM_API_KET` appears to be a typo fallback for `ATTOM_API_KEY`; ownership
  should be resolved before removing it.
- Any variable containing private keys, webhook secrets, admin keys, API tokens,
  database URLs, wallet passphrases, or service-role keys must be managed only
  through the deployment secret store.
- Auth, compliance, treasury, reserve, settlement, oracle, disclosure, banking,
  and webhook variables require owner approval before behavior changes.

