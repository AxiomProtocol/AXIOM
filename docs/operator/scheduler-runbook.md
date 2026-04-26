# Scheduler Endpoints Runbook

Operator reference for the periodic background jobs exposed under
`/api/scheduler/*`. Each endpoint is intended to be hit by an external
scheduler (Google Cloud Scheduler, GitHub Actions cron, k8s CronJob, or
any equivalent) on a fixed cadence. None of them self-trigger — if the
external scheduler is not configured, the job silently does nothing.

## Shared conventions

- **Method**: `POST`
- **Auth header**: `x-scan-key: $MIRDT_SCAN_KEY`
  - Same secret is used by every endpoint in this file.
  - In `NODE_ENV=development` the auth check is skipped if `MIRDT_SCAN_KEY`
    is unset, so local manual triggers Just Work.
- **Failure mode if unscheduled**: the corresponding console
  (`/operator/property-reports/stuck`, `/admin/oracle-fallbacks`, …)
  fills up with rows that never get reaped. There is no in-app retry —
  the cron *is* the retry.

After deploying to a fresh environment, verify each entry below has a
matching scheduled job before declaring the deploy done.

---

## 1. `/api/scheduler/resolve-stuck-property-payments`

Auto-confirms property-report payments where the buyer's AXUSD transfer
already landed on-chain but they never POSTed the tx hash back to
`/api/property/confirm-payment`. Also auto-expires pending rows that
have been abandoned past the max-age window.

Source:
- Endpoint: [`pages/api/scheduler/resolve-stuck-property-payments.ts`](../../pages/api/scheduler/resolve-stuck-property-payments.ts)
- Resolver: [`lib/property/stuckPaymentResolver.ts`](../../lib/property/stuckPaymentResolver.ts)
- Operator console: [`/operator/property-reports/stuck`](../../pages/operator/property-reports/stuck.tsx)

### Recommended cadence

**Every 5–15 minutes.** Buyers expect their report within minutes of a
successful payment, and the resolver only acts after a row has been
pending for `STUCK_PAYMENT_MIN_AGE_MINUTES` (default 15), so anything
slower than ~15 min defeats the point.

Suggested cron expressions:

| Cadence | Cron | Notes |
|---------|------|-------|
| Every 5 min | `*/5 * * * *` | Tightest reasonable cadence; OK on Arbitrum One. |
| Every 10 min | `*/10 * * * *` | Recommended default. |
| Every 15 min | `*/15 * * * *` | Acceptable lower bound — matches the default min-age window. |

### Required environment

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `MIRDT_SCAN_KEY` | yes (in non-dev) | — | Auth header secret. |
| `ARBITRUM_RPC_URL` | recommended | `https://arb1.arbitrum.io/rpc` | RPC used to scan AXUSD `Transfer` logs. Use a paid provider in production; the public endpoint rate-limits aggressively. |

### Tunable env vars

All knobs are positive integers; a missing or invalid value falls back
to the default below.

| Variable | Default | What it controls |
|----------|---------|------------------|
| `STUCK_PAYMENT_MIN_AGE_MINUTES` | `15` | Pending rows younger than this are ignored — gives the buyer a chance to finish the normal flow. |
| `STUCK_PAYMENT_MAX_AGE_HOURS` | `72` | Pending rows older than this with no matching transfer are marked `expired`. |
| `STUCK_PAYMENT_LIMIT` | `25` | Max pending rows considered per run. Acts as a fairness/cost cap on RPC log scans. |
| `STUCK_PAYMENT_BLOCK_RANGE` | `10000` | Per-call `getLogs` window. Most RPC providers reject larger ranges. |
| `STUCK_PAYMENT_MAX_LOOKBACK_BLOCKS` | `1500000` (~4 d on Arb One) | Hard cap on how far back the resolver will scan logs for any single row, regardless of `createdAt`. |

### Interpreting the JSON summary

A successful run returns `200` with:

```json
{
  "success": true,
  "scanned": 7,
  "resolved": [
    { "reportId": "uuid", "txHash": "0x…", "status": "ready" }
  ],
  "expired": ["uuid", "uuid"],
  "errors": [
    { "reportId": "uuid", "reason": "Could not fetch latest block: …" }
  ],
  "unresolvedReportIds": ["uuid"]
}
```

| Field | Meaning |
|-------|---------|
| `scanned` | Pending rows the resolver looked at this run (≤ `STUCK_PAYMENT_LIMIT`). `0` is normal — most runs find nothing. |
| `resolved[]` | Rows transitioned `pending → paid` plus the matching tx hash. `status` is the post-promotion state (`ready` once `generateReport` finished, `failed` if generation surfaced an error, `paid` for non-default outcomes). |
| `expired[]` | Report IDs aged past `STUCK_PAYMENT_MAX_AGE_HOURS` and marked `expired`. |
| `errors[]` | Per-row (or `reportId: "all"`) failure reasons. Non-empty errors do not fail the HTTP call — investigate but do not page on a single transient RPC error. |
| `unresolvedReportIds[]` | Pending rows with no matching transfer that are *not yet* old enough to expire. They will be re-checked next run. |

`5xx` from this endpoint means the resolver itself crashed before it
could even build a summary — page on repeated `5xx`, not on transient
`errors[]` entries.

### Operator console cross-link

[`/operator/property-reports/stuck`](../../pages/operator/property-reports/stuck.tsx)
shows the same `listStuckPending` view, exposes a manual "Run resolver
sweep" button, and lets operators per-row confirm or expire entries.
The page header links here for cadence/env-var reference.

---

## 2. `/api/scheduler/prune-overdue-alert`

Health-check endpoint that pages operators when the oracle-fallback
pruning job has not run within its expected window, and opportunistically
trims `prune_alert_log` retention.

Source: [`pages/api/scheduler/prune-overdue-alert.ts`](../../pages/api/scheduler/prune-overdue-alert.ts)

### Recommended cadence

**Every 12–24 hours.** The whole point is to detect when the daily
prune job has gone missing, so running this alert checker more often
than the prune job adds no signal.

Suggested cron: `0 */12 * * *` (every 12 h on the hour).

### Required environment

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `MIRDT_SCAN_KEY` | yes (in non-dev) | — | Auth header secret. |
| `PRUNE_ALERT_EMAIL` | optional | — | Comma-separated email recipients (sent via Resend). |
| `PRUNE_ALERT_DISCORD_WEBHOOK` | optional | — | Discord webhook URL for the same alert. |

At least one of the alert channels should be configured in production —
otherwise the endpoint will report `notificationsSent: 0` even when an
overdue condition is detected.

### Interpreting the JSON summary

```json
{
  "success": true,
  "overdue": false,
  "status": "ok",
  "lastPrunedAt": "2026-04-24T03:00:00.000Z",
  "hoursSincePrune": 11.2,
  "thresholdHours": 26,
  "notificationsSent": 0,
  "errors": [],
  "skipped": false,
  "cleanup": {
    "deletedCount": 4,
    "retentionDays": 30,
    "error": null
  }
}
```

| Field | Meaning |
|-------|---------|
| `overdue` | `true` when `hoursSincePrune > thresholdHours`; alerts are sent in that case. |
| `notificationsSent` | Count of channels that successfully delivered. `0` while `overdue=false` is normal. |
| `errors[]` | Per-channel send failures; investigate when non-empty. |
| `skipped` | `true` when an alert was suppressed (e.g. recently sent) — do not page on this. |
| `cleanup` | Result of the opportunistic `prune_alert_log` retention sweep; non-fatal. |

---

## 3. `/api/scheduler/prune-oracle-fallback`

Deletes `axusd_oracle_fallback_events` rows older than the configured
retention window by calling the `prune_oracle_fallback_events()` SQL
function. Every run is recorded in `oracle_fallback_prune_history`.

Source: [`pages/api/scheduler/prune-oracle-fallback.ts`](../../pages/api/scheduler/prune-oracle-fallback.ts)

### Recommended cadence

**Daily**, e.g. `0 3 * * *` (03:00 UTC). Only required when `pg_cron` is
not enabled in the target database — when it is, the same SQL function
runs from inside Postgres on its own schedule and this HTTP path becomes
a redundant manual lever.

### Required environment

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `MIRDT_SCAN_KEY` | yes (in non-dev) | — | Auth header secret. |
| `ORACLE_FALLBACK_RETENTION_DAYS` | optional | `90` | Retention window applied by the HTTP path. Keep in sync with the `app.oracle_fallback_retention_days` Postgres GUC used by the pg_cron path. |

### Interpreting the JSON summary

```json
{
  "success": true,
  "deletedCount": 12,
  "retentionDays": 90
}
```

`deletedCount: 0` is normal in steady state. Persistent `5xx` responses
usually indicate the migration that defines `prune_oracle_fallback_events`
has not been applied — verify migrations `0045`–`0047` are present.

---

## Manual trigger (any of the above)

```bash
curl -X POST "$BASE_URL/api/scheduler/resolve-stuck-property-payments" \
  -H "x-scan-key: $MIRDT_SCAN_KEY"
```

Substitute the path and (where relevant) any tunable env vars before
firing. Manual triggers are safe to run at any time — every endpoint
is idempotent at the row level.
