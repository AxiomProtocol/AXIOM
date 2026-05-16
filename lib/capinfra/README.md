# Capital Infrastructure (Phase 1)

Modular monolith backend spine: asset registry, identity projection,
deterministic policy evaluator, market data ingestion, append-only audit
events, and operator console foundation endpoints.

This is the canonical source of truth for asset metadata, policy
decisions, and audit history. Other systems (AXAU, AXUSD treasury,
PAXG, future products) read from and emit to this layer.

## Architecture

```
pages/api/capinfra/      ← thin HTTP handlers (router + auth + Zod)
lib/capinfra/            ← stateful services (this directory)
  ids.ts                 ← cuid-style prefixed ID generator
  errors.ts              ← typed errors → HTTP envelope
  auth.ts                ← admin-key auth + role declarations
  audit.ts               ← append-only event writer (the spine)
  assetRegistry.ts       ← cap_assets CRUD
  identity.ts            ← identity projection + wallet linking
  marketData.ts          ← cap_price_snapshots ingest + read with
                           per-asset oracle profile + divergence guard
  policy.ts              ← deterministic policy evaluator
                           (date-stamped POLICY_VERSION registry)
  handler.ts             ← method dispatch + per-route auth helper
  types.ts               ← Zod schemas for the public API
  settlement/, portfolio/, risk/, reserve/  ← Phase 2/3 placeholders
shared/capInfraSchema.ts ← Drizzle schema (17 cap_* tables, 15 enums)
```

### Audit-first invariant

Every mutating endpoint writes one `cap_audit_events` row tagged with
`eventType`, `aggregateType`, `aggregateId`, and the actor. Mutations
use `emitAuditEventStrict` inside a `db.transaction` so the audit row
is atomic with the underlying state change.

### Deterministic policy

`evaluatePolicy(input)` is pure given (asset, identity projection,
input). Results are persisted to `cap_policy_decisions` and idempotency
is keyed on `sha256(canonical(input))` plus `POLICY_VERSION`. Replays
return the original decision instead of re-evaluating. Each call emits
`policy.evaluated`; denied decisions also emit `policy.denied`.

`POLICY_VERSION` is date-stamped (`YYYY-MM-DD.N`) and lives in
`POLICY_VERSION_REGISTRY`. The registry must be appended any time the
rule set or required-claims matrix changes.

### Market data oracle profile

Per-asset oracle config lives at `cap_assets.metadataJson.oracleProfile`
in Phase 1 (a dedicated `cap_oracle_profiles` table is Phase 2):

```
{
  primarySource: string,
  secondarySource: string,
  staleSec: number,
  divergenceBps: number
}
```

On ingestion the service compares the submitted price against the most
recent snapshot from the opposing source for the same
(asset, priceType, quoteCurrency). When the absolute divergence exceeds
`divergenceBps`, the snapshot is **rejected** and a
`price.snapshot_rejected` audit event is emitted. Accepted snapshots
emit `price.snapshot_ingested` with a confidence score derived from
staleness × divergence.

## Identity projection

Phase 1 stores the canonical identity model in `cap_users`,
`cap_identity_profiles`, `cap_claims`, and `cap_wallets`. The spec
describes ingestion from upstream identity sources
(`identity_registry`, `claims_issued`) which do not yet exist in this
codebase; ingestion remains out of scope and is performed by upstream
KYC pipelines that write directly to `cap_*` tables. The projection
endpoints only **read**:

- `GET /identity/users/:userId` — full projection
- `GET /identity/users/:userId/claims` — claims slice only

## Auth

Each endpoint declares one of six operator roles (SUPER_ADMIN,
COMPLIANCE_ADMIN, TREASURY_OPERATOR, RISK_OPERATOR, SUPPORT_READ_ONLY,
AUDITOR_READ_ONLY). `requireOperator` (`lib/capinfra/auth.ts`)
enforces the declared role: the credential presented in `x-admin-key`
must be bound to the route's required role, or be a SUPER_ADMIN
credential (the only privileged-bypass role). Mismatches return 403
`ROLE_INSUFFICIENT`; unknown keys return 403 `Unauthorized` and count
toward the shared IP-based brute-force lockout.

Per-role credentials are configured via env vars:

| Role | Env var |
|------|---------|
| SUPER_ADMIN | `CAPINFRA_KEY_SUPER_ADMIN` |
| COMPLIANCE_ADMIN | `CAPINFRA_KEY_COMPLIANCE_ADMIN` |
| TREASURY_OPERATOR | `CAPINFRA_KEY_TREASURY_OPERATOR` |
| RISK_OPERATOR | `CAPINFRA_KEY_RISK_OPERATOR` |
| SUPPORT_READ_ONLY | `CAPINFRA_KEY_SUPPORT_READ_ONLY` |
| AUDITOR_READ_ONLY | `CAPINFRA_KEY_AUDITOR_READ_ONLY` |

Each var accepts a comma-separated list so multiple operators can
share a role, and each entry may carry a `<label>:<key>` prefix to
identify the operator in audit rows (e.g.
`alice:s3cret,bob:hunter2`). The first binding wins if a key is
listed under two roles, so an accidentally-duplicated key cannot
silently widen privileges.

For backward compatibility, the legacy `ADMIN_SOLVENCY_KEY` is
treated as a SUPER_ADMIN credential. The operator console cookie
auth, the smoke harness, and all axiom-rail endpoints continue to
work unchanged. New deployments should provision per-role keys and
rotate the legacy key out.

The asset registry list/detail endpoints and the two market-data read
endpoints are open per spec §940-946 (`requireAuth: false` on the
route entry).

Audit `actor` stamp format: `<operator>@<role>` once authenticated.
The operator portion comes from the credential's `<label>:` prefix
when present, otherwise from the free-form `x-operator` header
(≤80 chars), otherwise from the literal `admin_key`. The role
suffix satisfies the requirement to record the operator's role
alongside the existing actor stamp.

## HTTP surface

| Method  | Path                                                        | Auth | Role               |
| ------- | ----------------------------------------------------------- | ---- | ------------------ |
| GET     | /api/capinfra/assets                                        | open | AUDITOR_READ_ONLY  |
| POST    | /api/capinfra/assets                                        | yes  | SUPER_ADMIN        |
| GET     | /api/capinfra/assets/:id                                    | open | AUDITOR_READ_ONLY  |
| PATCH   | /api/capinfra/assets/:id                                    | yes  | SUPER_ADMIN        |
| GET     | /api/capinfra/identity/users/:userId                        | yes  | COMPLIANCE_ADMIN   |
| GET     | /api/capinfra/identity/users/:userId/claims                 | yes  | COMPLIANCE_ADMIN   |
| POST    | /api/capinfra/identity/wallets/link                         | yes  | COMPLIANCE_ADMIN   |
| POST    | /api/capinfra/market-data/ingest                            | yes  | TREASURY_OPERATOR  |
| GET     | /api/capinfra/market-data/assets/:assetId/price             | open | AUDITOR_READ_ONLY  |
| GET     | /api/capinfra/market-data/assets/:assetId/history           | open | AUDITOR_READ_ONLY  |
| POST    | /api/capinfra/policy/evaluate                               | yes  | COMPLIANCE_ADMIN   |
| POST    | /api/capinfra/operator/eligibility/inspect                  | yes  | COMPLIANCE_ADMIN   |
| GET     | /api/capinfra/operator/assets/summary                       | yes  | AUDITOR_READ_ONLY  |
| GET     | /api/capinfra/operator/audit                                | yes  | AUDITOR_READ_ONLY  |

## Seed

`npx tsx scripts/capinfra-seed.ts` idempotently inserts AXAU,
AXUSD-TREASURY, and PAXG. Each seed includes an `oracleProfile` and a
`basePolicyJson` rule.

## Smoke test

```
ADMIN_SOLVENCY_KEY=… CAPINFRA_BASE_URL=http://localhost:5000 \
  npx tsx scripts/capinfra-smoke.ts
```

Drives 8 checks end-to-end against the canonical paths: open asset
list, authed price ingest, open price + history reads, authed policy
evaluation, operator eligibility inspection, audit listing, and
operator asset-summary list.

## Phase 2 modules

- `settlement.ts` owns the PENDING → AUTHORIZED → SETTLED / FAILED
  lifecycle. Idempotent on `(user_id, asset_id, action_type,
  idempotency_key)`. Adapter dispatch happens outside any DB
  transaction; the SETTLED transition and `applySettlement` write
  commit atomically.
- `portfolio.ts` exposes `applySettlement` (the sole mutation entry
  point for `cap_positions` and `cap_ledger_entries`), `listPositions`,
  `listLedgerEntries`, and a deterministic `createSnapshot`. The four
  Phase 2 ledger/snapshot tables are written via raw SQL — see the file
  header for the webpack bundling reason.
- `adapters/registry.ts` + `adapters/{internal,evm,stellar,ach}.ts`
  enforce §0.1 isolation: an instruction's `settlement_type` selects
  exactly one adapter and never crosses rails. Only `INTERNAL` is LIVE.
- `notifications.ts` + `notifications/subscriptions.ts` fan out
  best-effort events post-commit using `Promise.allSettled`. A
  notification failure never reverts a SETTLED instruction.

## Phase 3A — Foundations (active)

Ships three blocking capabilities that gate value movement before any
external adapter / webhook lands in 3B.

### 3A.1 Policy publication ledger

`lib/capinfra/policy/publication.ts` — versioned publication of risk
policies into `cap_risk_policies`. Active uniqueness is enforced *per
scope* via `scope_hash` + a partial unique index
(`cap_risk_policies_active_scope_uq` WHERE `is_active = true`).
Publishing a new version in an existing scope deactivates the prior
active row inside the same transaction and emits an audit event.

API:
- `GET  /api/capinfra/policy/versions`               — list (admin)
- `POST /api/capinfra/policy/versions`               — publish (admin)
- `POST /api/capinfra/policy/versions/[id]/retire`   — retire (admin)
- `GET  /api/capinfra/policy/decisions`              — recent decisions

### 3A.2 Reserve service + policy integration

Append-only ledger (`cap_reserve_holdings`), versioned solvency-mode
config (`cap_reserve_config`), deterministic checksum snapshots
(`cap_reserve_holdings_snapshots` + `_lines`).

`evaluatePolicy` consults reserve at decision time:
- Halt mode → DENY with `MANUAL_INTERVENTION_HALT`.
- MINT actions → DENY with `RESERVE_INSUFFICIENT` when
  available headroom (`gross − debited`) is below the request.

These are *mutable-state* denials and intentionally bypass the policy
idempotency cache so re-evaluations pick up current ledger state. Prior
deny rows remain in `cap_policy_decisions` for audit; re-evaluations
write a fresh row under a salted `idempotencyKey`.

Snapshot ordering: `(asset_id ASC, attestation_ref NULLS FIRST, line_index ASC)`,
sha256 over canonicalized JSON projection with explicit `lineIndex`.
Back-to-back snapshots over an unchanged ledger return the same checksum.

API:
- `GET  /api/capinfra/reserve/headroom?assetId=...`
- `GET  /api/capinfra/reserve/snapshots`              — list
- `POST /api/capinfra/reserve/snapshots`              — create
- `GET  /api/capinfra/reserve/snapshots/[id]`
- `POST /api/capinfra/reserve/adjust`                 — append-only adjust
   (requires `idempotencyKey`, `reasonCode`, and an actor)
- `GET  /api/capinfra/reserve/config`                 — active mode + history
- `POST /api/capinfra/reserve/config`                 — change mode
   (requires distinct primary + secondary actor)

### 3A.3 Operator UI + dual-actor admin actions

`lib/capinfra/operatorAuth.ts` — httpOnly cookie gated against
`ADMIN_SOLVENCY_KEY` (constant-time compare). 8-hour session, Secure in
production. `requireOperatorCookie(ctx)` redirects to `/operator/login`
on miss.

Pages (all wrapped in `<DesignLawLayout>`):
- `/operator/login` — key entry
- `/operator` — dashboard with prominent red HALT banner when solvency
  mode is `MANUAL_INTERVENTION`
- `/operator/instructions` and `/operator/instructions/[id]`
- `/operator/reserve` — per-asset headroom, mode, recent snapshots
- `/operator/policy/decisions` — denials filter
- `/operator/notifications`
- `/operator/integrity` — recent `collateral.integrity_failed`
  (auto-freeze) notifications from the last 24 h with a "show
  acknowledged" toggle; complements the dashboard panel which only
  surfaces unread rows
- `/operator/webhooks/quarantine` — viewer for `cap_webhook_events`
  (rows arrive in 3B; surface is wired now)

Reclassify endpoint:
- `POST /api/capinfra/webhooks/events/[id]/reclassify`
  — distinct-actor enforced; original processing fields are not
  overwritten (clarification #1: verified webhook is no-op on the
  original row).

Dual-actor recorder (`lib/capinfra/adminActions.ts`) writes a
`cap_admin_actions` row for both reserve config changes and webhook
reclassifications. Actor distinctness is normalized (trim+lowercase)
and rejected at the API boundary with 400.

### Smoke harness

`scripts/capinfra-smoke.ts` now runs 20 checks (Phase 1: 1–8, Phase 2:
9–14, Phase 3A: 15–20). Phase 3A coverage:

| # | Check |
|---|-------|
| 15 | Publish two versions in same scope; prior is deactivated |
| 16 | Reserve headroom is deterministic across reads |
| 17 | Back-to-back reserve snapshots produce identical sha256 |
| 18 | Adjust without idempotency/reason/actor → 400 |
| 19 | Reserve config with same actor twice → 400; distinct → 200 |
| 20 | `policy/decisions` and `reserve/config` reachable with admin key |

## Phase 3B.1a — Stellar adapter (DRY_RUN) + webhook ingress

- `adapters/stellar/` — Stellar adapter, isolated from the rest of capinfra by `sdk.ts` (the only file allowed to import `@stellar/stellar-sdk`).
- `webhooks/ingress.ts` — generic persist-first → verify → record pipeline. Never writes to portfolio/reserve/settlement.
- `reconciliation/stellar.ts` — typed runner skeleton; full diff lands in 3B.1b.

Endpoints:

- `POST /api/capinfra/webhooks/stellar` — public, signed (HMAC-SHA256 `x-stellar-signature`).
- `GET  /api/capinfra/adapters/stellar/health` — admin detail surface.
- `POST /api/capinfra/adapters/stellar/reconcile` — admin dry-run runner.

Modes: `DRY_RUN` validates against the live network and returns a deterministic `DRYRUN-<sha256>` receipt. `LIVE` is gated; the dispatcher refuses with `ADAPTER_MODE_NOT_PERMITTED` even though the type allows it. The public `/api/capinfra/health` is unchanged.

Idempotency: a verified webhook with a previously-seen `(adapter_key, external_event_id)` does not overwrite prior processing metadata; only `attempts` is bumped, and a `webhook.received.duplicate` audit event is appended.

## Phase 3B.1b — Stellar webhook → settlement wiring + real reconciliation diff

### State machine wiring

`lib/capinfra/settlement.ts` gains two functions:

- `externallySettleInstruction(id, receipt, actor)` — advances `EXECUTING → SETTLED_EXTERNAL` (or `FAILED_EXTERNAL`). Terminal-state instructions (`SETTLED_*`, `FAILED_*`, `CANCELLED`) are immutable; the function throws `ConflictError` (message prefix `external_settle_on_terminal:`). No portfolio/reserve writes are performed inside this function.
- `getInstructionsByExternalRef(externalRef)` — finds instructions with a matching external reference. Ambiguous matches (count > 1) emit a `MISSING_REMOTE` drift row at `WARNING` severity instead of guessing.

### Webhook processor

`lib/capinfra/webhooks/stellarMapping.ts` — maps raw Stellar event payloads (`payment.received`, `payment.sent`, `withdrawal.completed`, etc.) to canonical `SettlementExternalReceipt` shape.

`lib/capinfra/webhooks/processor.ts` — per-event processing pipeline:
- Resolves instruction by `externalRef` using `getInstructionsByExternalRef`.
- Calls `externallySettleInstruction` via canonical service layer (not HTTP loopback).
- Idempotency key on remediation: `recon:stellar:missing-local:${runId}:${txHash}:${opId}` (stable across re-runs of same window).
- Terminal-state `ConflictError` is swallowed as `NO_OP_TERMINAL_STATE`.
- No-instruction path → `FAILED_NO_INSTRUCTION`.
- Unrecognised event type → `NO_OP_EVENT_TYPE`.

### Reconciliation tables

Two new append-only tables in `shared/capInfraSchema.ts`:

| Table | Purpose |
|-------|---------|
| `cap_reconciliation_runs` | One row per run (`rr_` prefix). Tracks window, compared/drift counts, triggered-by, status. |
| `cap_reconciliation_drift` | One row per anomaly (`rd_` prefix). Stores kind, severity, external ref, instruction id, remediation outcome, failure JSON. |

Drift severity vocabulary (canonical Phase 3 ladder):

| Code | Meaning |
|------|---------|
| `INFORMATIONAL` | Expected gap (e.g. DRY_RUN synthetic receipt absent from Horizon) |
| `WARNING` | Ambiguous match or minor discrepancy; operator review suggested |
| `BLOCKING` | Remote payment found but no local instruction; remediation attempted |
| `MANUAL_INTERVENTION` | Multiple terminal-state conflicts or remediation failed repeatedly |

`lib/capinfra/reconciliation/store.ts` — append-only writer for `cap_reconciliation_runs` + `cap_reconciliation_drift`.

### Reconciliation diff engine

`lib/capinfra/reconciliation/stellarDiff.ts` — real Horizon diff runner:
1. Pages Horizon payments via `fetchHorizonPaymentsPage` (cursor-based).
2. Correlates each remote payment to local `AUTHORIZED` / `EXECUTING` instructions by `externalRef`.
3. Classifies missing-remote, missing-local, and amount-mismatch drift items.
4. Remediation for `MISSING_LOCAL` creates a new instruction via canonical `createInstruction` (actor `'stellar-recon'`, not HTTP loopback). Failure is captured in `remediationFailureJson` — never propagated to throw.

`lib/capinfra/reconciliation/stellar.ts` — orchestrator replaces the 3B.1a skeleton:
- Opens a `cap_reconciliation_runs` row (status `RUNNING`).
- Calls `runStellarDiff`.
- Closes the row with `COMPLETED` or `FAILED`.
- Returns `{ runId, status, comparedCount, driftCount }`.

### Webhook processor endpoint

`POST /api/capinfra/webhooks/events/[id]/process` — admin-gated. Manually (re-)processes a single quarantined or unprocessed event. Fire-and-forget enqueue in `webhooks/ingress.ts` also calls this path after a verified STELLAR insert.

### Reconciliation endpoints

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/capinfra/reconciliation/runs` | admin |
| `GET` | `/api/capinfra/reconciliation/runs/[id]` | admin |
| `GET` | `/api/capinfra/reconciliation/runs/[id]/drift` | admin |

### Public health endpoint

`GET /api/capinfra/health` — unauthenticated. Returns `{ status, service, timestamp }`. Regression-guarded by smoke check 33.

### Operator UI

`/operator/adapters/stellar` updated to show:
- Reconciliation runs table (last 10 runs, STELLAR scoped).
- Per-run drift table for the most recent run with severity badges (`INFORMATIONAL` / `WARNING` / `BLOCKING` / `MANUAL_INTERVENTION`).
- Manual "Run reconciliation" button (calls `/api/capinfra/adapters/stellar/reconcile` with operator auth header).

### Smoke harness

Checks 27–33 added (26 → 33 total):

| # | Check |
|---|-------|
| 27 | Reconcile returns `rr_` runId, `COMPLETED`, numeric compared/drift |
| 28 | `GET /reconciliation/runs` returns the persisted run |
| 29 | `GET /reconciliation/runs/[id]` returns correct run with `adapterKey=STELLAR` |
| 30 | `GET /reconciliation/runs/[id]/drift` returns array + total |
| 31 | Webhook process endpoint accepts event and returns valid outcome code |
| 32 | Duplicate processing idempotency (structurally covered by check 31 outcome set) |
| 33 | `GET /api/capinfra/health` regression guard — shape unchanged |

---

## Phase 3A — Foundations (Policy Publication, Reserve, Operator UI)

### Schema additions (T001)

New columns / tables added (additive-only, no destructive migrations):

| Table | Description |
|---|---|
| `cap_risk_policies.scope_hash` | SHA-256 of the policy scope string for the partial unique index |
| `cap_risk_policies_active_scope_uq` | Partial unique index: `(scope_hash) WHERE is_active = true` |
| `cap_reserve_config` | Versioned reserve solvency mode (`OPERATIONAL / CONSERVATIVE / MANUAL_INTERVENTION`) |
| `cap_reserve_holdings` | Append-only reserve ledger (debits + credits per asset) |
| `cap_reserve_holdings_snapshots` | Deterministic checksum snapshots (sha256 over canonical JSON) |
| `cap_reserve_holdings_snapshot_lines` | Line items within a snapshot, order-stable |
| `cap_admin_actions` | Dual-actor recorder for reserve mode changes + webhook reclassification |
| `cap_webhook_events` | Inbound webhook events with quarantine support |

ID prefixes: `aa` (admin action), `we` (webhook event), `rcfg` (reserve config), `rhs` (holdings snapshot), `rhsl` (snapshot line).

### Policy publication module (T002)

`lib/capinfra/policy/publication.ts`:
- `publishPolicyVersion(scope, rules, actor)` — transactional active-uniqueness: deactivates prior active in same scope before inserting new version.
- `listPolicyVersions(query)` — filterable by scope, isActive, limit.

Endpoints:

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/capinfra/policy/versions` | admin | List policy versions |
| `POST` | `/api/capinfra/policy/versions` | admin | Publish new version |
| `POST` | `/api/capinfra/policy/versions/[id]/retire` | admin | Retire a version |
| `GET` | `/api/capinfra/policy/decisions` | admin | List policy decisions |

### Reserve service (T003)

`lib/capinfra/reserve/service.ts`:
- `headroom(assetId)` — deterministic available = total credits − total debits for the asset.
- `adjust({assetId, amount, direction, source, referenceId, reasonCode, actor, idempotencyKey, attestationRef})` — append-only, idempotent on `idempotencyKey`.

`lib/capinfra/reserve/snapshot.ts`:
- Deterministic sha256 snapshot per §7.F: `ORDER BY asset_id, attestation_ref NULLS FIRST, line_index ASC`.
- Identical sha256 returned on back-to-back calls with same ledger state.

`lib/capinfra/reserve/solvencyMode.ts`:
- `getActiveSolvencyMode()` — reads the active `cap_reserve_config` row (supersededAt IS NULL).

`lib/capinfra/adminActions.ts`:
- `assertDistinctActors(primary, secondary)` — constant-time normalized compare; throws `ValidationError` on match.
- `recordDualActorAction(input, tx?)` — persists to `cap_admin_actions`, emits audit event.

`evaluatePolicy` integration: `reserve.insufficient_headroom` rule added — DENIES with `RESERVE_INSUFFICIENT` when `headroom(assetId) < instruction amount`. Reserve blocks via policy; never mutates settlement state.

Endpoints:

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/capinfra/reserve/headroom` | admin | Available headroom for an asset |
| `POST` | `/api/capinfra/reserve/adjust` | admin | Append ledger entry (requires idempotencyKey, reasonCode) |
| `POST` | `/api/capinfra/reserve/snapshots` | admin | Take deterministic sha256 snapshot |
| `GET` | `/api/capinfra/reserve/snapshots/[id]` | admin | Fetch snapshot + lines |
| `GET` | `/api/capinfra/reserve/config` | admin | Active solvency mode + history |
| `POST` | `/api/capinfra/reserve/config` | admin | Change solvency mode (dual-actor, distinct identities required) |

### Operator UI safety-critical surfaces (T004)

`lib/capinfra/operatorAuth.ts` — cookie validation against `ADMIN_SOLVENCY_KEY`.

Pages (all admin-gated via cookie in `getServerSideProps`, use `<DesignLawLayout>`):

| Page | Description |
|---|---|
| `/operator/login` | Login form |
| `/operator` | Dashboard |
| `/operator/instructions` | Settlement instruction list + filter |
| `/operator/instructions/[id]` | Inspector with audit log |
| `/operator/reserve` | Headroom, mode, last snapshot |
| `/operator/policy/decisions` | Recent policy denials |
| `/operator/notifications` | Notification feed |
| `/operator/webhooks/quarantine` | Quarantined events viewer + reclassify button |

Webhook reclassify endpoint: `POST /api/capinfra/webhooks/events/[id]/reclassify` — dual-actor, requires distinct secondaryActor.

### Smoke harness (checks 15–20)

| # | Check |
|---|-------|
| 15 | Publish policy version → 201; second publish in same scope deactivates prior |
| 16 | Reserve headroom for fixed ledger state → deterministic numeric |
| 17 | Reserve snapshot back-to-back → identical sha256 |
| 18 | Reserve adjust without required fields → 400; with all fields → 201 |
| 19 | Reserve mode change with same actor → 400; distinct second actor → 200 |
| 20 | Operator API surfaces reachable with admin key |

---

## Phase 3B.2 — ACH DRY_RUN Adapter

### Adapter isolation contract

All Phase 3B.2 code obeys the capinfra adapter isolation rules:
- No adapter handler writes to portfolio, reserve, or settlement tables.
- No auto-credit from webhook events.
- Reconciliation is append-only (drift rows never updated).
- Remediation uses canonical `createInstruction` (actor `'ach-recon'`), never HTTP loopback.
- Inbound ACH webhook events are always quarantined with `UNSUPPORTED_INBOUND_EVENT`.
- Webhook signing secret lives in `configJson` only (never a process env var).
- `reachable: false` is operator-only; public health stays coarse.

### ACH adapter files

```
lib/capinfra/adapters/ach/
  sdk.ts           ← fetchAchTransactionsPage + decimalStringToCents (integer arithmetic)
  config.ts        ← ZConfig (mode: DRY_RUN | LIVE, environment, accountId), loadAchConfig
  webhook.ts       ← verifyAchSignature (HMAC-SHA256 from configJson only)
  dispatcher.ts    ← dispatchAch — DRY_RUN returns DRYRUN-ACH-{cuid} externalRef; no real API call
  health.ts        ← achHealth — quarantinedCount24h + mode from DB
  index.ts         ← adapter registry export (kind='ACH')
lib/capinfra/webhooks/achMapping.ts     ← mapAchEvent (inbound → QUARANTINED/UNSUPPORTED_INBOUND_EVENT)
lib/capinfra/reconciliation/
  ach.ts           ← runAchReconciliation (adapter config → runAchDiff)
  achDiff.ts  ← full diff engine: DRY_RUN short-circuits remote fetch
```

### Settlement lifecycle

1. Create instruction with `settlementType: 'ACH'` (requires ACH-typed asset — `asset.settlementType` must match).
2. Authorize: no rail-specific logic.
3. Execute: `getAdapter('ACH')` → `dispatchAch` → `SETTLED` with `externalRef: 'DRYRUN-ACH-<cuid>'`.

### DRY_RUN reconciliation

When adapter `mode === 'DRY_RUN'`, `runAchDiff` short-circuits immediately:
- Creates a `cap_reconciliation_runs` row (audit trail preserved).
- Marks it `COMPLETED` with `comparedCount=0`, `driftCount=0`, note `DRY_RUN_SKIP`.
- Never calls the banking provider API (avoids 401 for mismatched env/key).
- DRYRUN-ACH-* externalRefs have no counterpart in the real banking provider transaction feed.

### UNSUPPORTED_INBOUND_EVENT quarantine

Any inbound ACH webhook event (credit received, transfer returned, etc.) is quarantined via `achMapping.ts`:
```
mapAchEvent → { classification: 'QUARANTINED', quarantineReason: 'UNSUPPORTED_INBOUND_EVENT' }
```
No position or reserve changes are made from webhook events.

### HTTP surface

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/capinfra/webhooks/ach` | HMAC (configJson) | ACH webhook ingress |
| `GET` | `/api/capinfra/adapters/ach/health` | admin | ACH adapter health (coarse) |
| `POST` | `/api/capinfra/adapters/ach/reconcile` | admin | Manual reconcile run |

Operator UI page: `/operator/adapters/ach` — health, recent reconciliation runs, recent webhook events.

### Smoke harness (checks 34–41)

| # | Check |
|---|-------|
| 34 | ACH adapter row present in `cap_adapters` |
| 35 | `adapters/increase/health` → 200, `mode=DRY_RUN`, `kind=ACH` |
| 36 | DRY_RUN ACH full settlement lifecycle: PENDING → AUTHORIZED → SETTLED, `externalRef` prefixed `DRYRUN-ACH-` |
| 37 | ACH webhook with bad signature → 202 `QUARANTINED` |
| 38 | ACH webhook with valid signature → 202 `RECEIVED` (or skip if secret not provisioned) |
| 39 | Duplicate ACH webhook → 202, `isDuplicate=true` |
| 40 | `adapters/increase/reconcile` → 200, DRY_RUN short-circuit, `comparedCount=0` |
| 41 | `reconciliation/runs/[id]/drift` → 200, `rows=[]`, no spurious drift from DRYRUN-ACH-* refs |

## Phase 3B.3 — ACH Adapter Control Plane (production rollout)

Four-stage promotion sequence: `DRY_RUN → MANUAL_APPROVAL → LIVE_CANARY → LIVE`.
No mode promotion without all control-plane gates green.

### Core design constraints
- **SUBMITTED ≠ bank-final**: `SUBMITTED` means the instruction passed dual-actor approval and was handed to the banking provider; it does NOT credit reserves or write portfolio positions.
- **No auto-credit on SUBMITTED**: Portfolio writes only happen on confirmed `SETTLED` events delivered via webhook.
- **Dual-actor mode transitions**: Every mode promotion (except emergency disable) requires two distinct actors.
- **Emergency disable is single-actor, immediate**: One risk operator can freeze all ACH operations instantly; a distinct second actor must acknowledge within 4 hours to restore mode-transition capability.
- **4-hour acknowledge window**: Disables older than 4h without acknowledgment are treated as expired; operations unblock automatically (escalation protocol handles the missed ack).
- **Rail isolation boundary**: `asset.settlementType` must equal `instruction.settlementType`. ACH instructions require an ACH-typed asset.

### New instruction statuses
- `PENDING_OPERATOR_APPROVAL` — instruction executed in MANUAL_APPROVAL mode; awaiting dual-actor approval before submission to the banking provider.
- `SUBMITTED` — dual-actor approved; handed to the banking provider. Not bank-final.

### HTTP surface (control plane additions)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/capinfra/adapters/ach/config` | admin | Adapter mode, environment, configVersion |
| `POST` | `/api/capinfra/adapters/ach/config` | admin (dual-actor) | Mode transition (requires distinct primaryActor/secondaryActor) |
| `POST` | `/api/capinfra/adapters/ach/validate` | admin | Run all 5 gate checks; returns allPassed + checks array |
| `POST` | `/api/capinfra/adapters/ach/sweep-timeouts` | admin | Sweep stale EXECUTING/PENDING instructions |
| `GET` | `/api/capinfra/adapters/ach/emergency-disable` | admin | Current unacknowledged disable (if any) |
| `POST` | `/api/capinfra/adapters/ach/emergency-disable` | admin (single-actor) | Immediately freeze ACH; opens 4h ack window |
| `POST` | `/api/capinfra/adapters/ach/emergency-disable/acknowledge` | admin (dual-actor) | Acknowledge disable; restores mode-transition capability |
| `POST` | `/api/capinfra/settlement/instructions/[id]/approve` | admin | Approve PENDING_OPERATOR_APPROVAL → SUBMITTED |
| `POST` | `/api/capinfra/settlement/instructions/[id]/reject` | admin | Reject PENDING_OPERATOR_APPROVAL → FAILED |

### Policy gates (new in 3B.3)

| Gate | Trigger condition |
|---|---|
| `ACH_EMERGENCY_DISABLE_UNACKNOWLEDGED` | Unacknowledged disable within 4h window (non-DRY_RUN modes only) |
| `ACH_RECONCILIATION_OVERDUE` | LIVE_CANARY/LIVE: past `reconCutoffUtcHour` with no completed recon run today |
| `ACH_PER_INSTRUCTION_CAP_EXCEEDED` | Instruction amount > `perInstructionCapUsd` |
| `ACH_DAILY_CAP_EXCEEDED` | Rolling 24h aggregate > `dailyCapUsd` |
| `ACH_CONCENTRATION_CAP_EXCEEDED` | Single asset > `concentrationPct`% of daily aggregate |

### Smoke harness (checks 15–20: Phase 3A)

| # | Check |
|---|-------|
| 15 | `POST /policy/versions` publish A → 201; publish B same scope → A is deactivated (isActive=false) |
| 16 | `POST /reserve/adjust` seed CREDIT; `GET /reserve/headroom` x2 → identical `available` value |
| 17 | `POST /reserve/snapshots` x2 back-to-back → identical sha256 checksum |
| 18 | `POST /reserve/adjust` missing required fields → 400; full fields → 201 |
| 19 | `POST /reserve/config` same-actor → 400; distinct secondary actor → 200 |
| 20 | `GET /policy/decisions` + `GET /reserve/config` → 200 (operator surfaces reachable) |

### Smoke harness (checks 42–64)

| # | Check |
|---|-------|
| 42 | `GET /config` → mode, environment, configVersion present |
| 43 | `POST /validate` → 200, allPassed boolean, 5-check array |
| 44 | `POST /sweep-timeouts` → 200, sweptCount, cutoffMs |
| 45 | `POST /emergency-disable` (single actor) → 200, adminActionId=aa_* |
| 46 | `POST /emergency-disable/acknowledge` same primary=secondary → 400 |
| 47 | `POST /emergency-disable/acknowledge` nonexistent ID → 404 |
| 48 | `POST /emergency-disable/acknowledge` valid → 200, ackActionId=aa_* |
| 49 | `POST /emergency-disable/acknowledge` same action again → 409 |
| 50 | `POST /config` restore DRY_RUN (skipGateCheck) → 200 |
| 51 | `POST /instructions/[id]/approve` nonexistent → 404 |
| 52 | `POST /instructions/[id]/reject` nonexistent → 404 |
| 53 | `POST /instructions/[id]/reject` no body → 400 |
| 54 | `POST /config` DRY_RUN→MANUAL_APPROVAL same-actor → 400 |
| 55 | `POST /config` DRY_RUN→MANUAL_APPROVAL distinct actors → 200 |
| 56 | MANUAL_APPROVAL: create+authorize+execute → PENDING_OPERATOR_APPROVAL |
| 57 | Approve PENDING_OPERATOR_APPROVAL → SUBMITTED |
| 58 | Reject PENDING_OPERATOR_APPROVAL → FAILED |
| 59 | Approve already-SUBMITTED → 409 |
| 60 | Reject already-FAILED → 409 |
| 61 | `GET /config` → mode=MANUAL_APPROVAL |
| 62 | `POST /validate` in MANUAL_APPROVAL → 5 checks, reconcile_pass soft |
| 63 | `POST /sweep-timeouts` in MANUAL_APPROVAL → 200 |
| 64 | Restore adapter to DRY_RUN (idempotency guarantee) |

## Card Onramp (Stripe Checkout)

Card-funded onramp built on Stripe Checkout. Independent of the ACH /
Stellar adapter chain.

### Tables
- `cap_card_deposits` — one row per checkout session.
  Status walk: `PENDING → PAID → MINTED` (AXUSD intent) or
  `PENDING → PAID → PAYOUT_INITIATED → SETTLED` (treasury intent).
  Idempotent on `idempotency_key` and unique on `stripe_session_id`.
- `cap_card_deposit_webhook_events` — gateway-level idempotency by
  Stripe event id; one row per processed webhook event.

### Endpoints (mounted at /api/capinfra/treasury/)
- `POST card-deposit/checkout` — public; creates Stripe Checkout
  session. Min $1.00, max $10,000 per payment. Validates wallet for
  mint intents.
- `POST card-deposit/webhook` — Stripe-signature-verified;
  routes `checkout.session.completed`, `payout.paid`, `payout.failed`.
  Always returns 200 once payment is recorded so Stripe does not retry.
- `GET card-deposits` — admin-key-gated list; supports `?status=` and
  `?intent=` filters.

### Operator surface
- `/treasury/fund` — public payment page (Design Law).
- `/operator/treasury/card-deposits` — operator console (cookie-gated).
  Surfaces the one-time external-account configuration requirement.

### AXUSD mint integration
On `AXUSD_MINT` intent reaching `PAID`, the service fires a loopback
POST to `/api/erc3643/admin/mint` with `ADMIN_SOLVENCY_KEY`. On success,
deposit row is updated to `MINTED` with the on-chain tx hash. On
failure, an audit event of type `card_deposit.mint_failed` is recorded
but the webhook still returns 200 (Stripe must not retry once payment
is on file).

### Operational prerequisite for treasury settlement
Stripe payouts only flow once the treasury bank account is added in
the Stripe dashboard as a verified external bank account
(routing 074920909, account 7192752995). Without this, payments
accumulate in the Stripe balance and never settle to the treasury account. This is
documented inline on the operator console page.

## Collateral Risk Policy (`2026-04-21.1`)

Canonical policy: [`documents/policies/collateral-risk-policy.md`](../../documents/policies/collateral-risk-policy.md).
Public Design Law page: `/disclosure/collateral-risk-policy`.

Every onboarded asset carries a `collateral_class` ∈ {GREEN, YELLOW, RED}.
The column defaults to `RED` (fail-closed): any asset created without an
explicit, justified classification is non-borrowable until risk publishes
a classification.

| Class | Borrowable | Cap source                                       |
|-------|------------|--------------------------------------------------|
| GREEN | yes        | global policy caps                               |
| YELLOW| yes, capped| `basePolicyJson.perTransactionMax` per asset     |
| RED   | no         | always denies BORROW                             |

### Evaluator wiring

`lib/capinfra/policy.ts` gates the new `BORROW` action by
`collateral_class`:

- RED → deny `COLLATERAL_CLASS_RED`
- YELLOW above cap → deny `COLLATERAL_CAP_EXCEEDED`
- Integrity callers may flip an asset to RED → deny `COLLATERAL_INTEGRITY_FAILED`

All three reason codes are listed in `MUTABLE_STATE_DENY_REASONS`, which
forces the evaluator to bypass its idempotent decision cache for
collateral-state changes. The smoke harness proves this (checks 73–75).

### Integrity hook

`lib/capinfra/risk/integrity.ts` exposes `recordIntegrityFailure(kind, …)`
with five `kind`s: `oracle_stale`, `reserve_attestation_failed`,
`redemption_failed`, `issuer_event`, `bridge_event`. It transactionally:

1. Flips `cap_assets.collateral_class` → `RED` with rationale.
2. Emits a `collateral.integrity_failed` audit event keyed by asset and kind.
3. Best-effort fans the same event out to the operator console (HIGH-severity
   `cap_notifications` row) and to the on-call paging channels via
   `lib/capinfra/notifications/integrityPager.ts`. The pager forwards to email
   (`INTEGRITY_ALERT_EMAIL`, comma-separated) and/or a Discord webhook
   (`INTEGRITY_ALERT_DISCORD_WEBHOOK`). Channel failures are caught, logged
   and never bubble back into the asset downgrade transaction.

Wire callers (oracle stalls in `marketData.ts`, reserve attestations,
redemption failures) into this single chokepoint so the policy file in
`documents/policies/collateral-risk-policy.md` is the only place where
emergency-trigger semantics live.

### Guardian disable

`POST /api/capinfra/risk/collateral/disable` (RISK_OPERATOR, dual-actor)
forces an asset to RED out-of-band. Distinct `primaryActor` /
`secondaryActor` enforced; emits the `collateral.guardian_disabled`
audit event (and records an admin action of type
`collateral.guardian_disable`). There
is intentionally no inverse endpoint — re-admission is policy
publication only (Collateral Risk Policy §7).

## Card Onramp (Stripe → Treasury / AXUSD)

`lib/capinfra/cardDeposits/service.ts` exposes a card-funded onramp via
Stripe Checkout. Two intents are supported:

* `TREASURY_FUND` — card payment lands in the Stripe balance; an
  external-account payout to the Axiom treasury bank account
  (routing 074920909 / account 7192752995, configured one-time in the
  Stripe dashboard) settles funds on Stripe's standard schedule
  (typically T+2). State walks `PENDING → PAID → PAYOUT_INITIATED →
  SETTLED`.
* `AXUSD_MINT` — on `checkout.session.completed`, the service performs
  a loopback POST to `/api/erc3643/admin/mint` (auth: `ADMIN_SOLVENCY_KEY`)
  with `amountAxusd = amountCents / 100` and the buyer's wallet, then
  records the resulting tx hash on the deposit row. State walks
  `PENDING → PAID → MINTED`.

### Idempotency model

* `createCheckoutSession` is idempotent on the caller-supplied
  `idempotencyKey` (a per-deposit row constraint), and forwards the
  same key to Stripe so concurrent racers converge on a single Stripe
  session.
* `handleStripeWebhookEvent` is idempotent on Stripe's `event.id` via
  an atomic insert into `cap_card_deposit_webhook_events` with
  `ON CONFLICT DO NOTHING`. Only the worker that wins the gateway insert
  performs side effects; subsequent deliveries no-op.
* The `PENDING → PAID` transition is itself a conditional UPDATE
  (`WHERE status = 'PENDING'`), so even if the gateway gate is bypassed,
  the AXUSD mint hook only fires for the actor that wins the row update.

### Failure semantics

* Pre-signature errors (raw body read, key load) → 5xx so Stripe retries.
* Signature failure → 400 (no retry).
* Gateway claim insert fails → 5xx so Stripe retries delivery
  (no event has been claimed).
* Post-claim side-effect failure (deposit lookup, mint loopback) →
  caught internally, audit event recorded, route returns 200. Operators
  remediate via the `/operator/treasury/card-deposits` console.

### Operational note

First card payment requires the Stripe dashboard external-account setup
pointing to treasury routing and account details before
payouts can flow. Without this, funds remain in the Stripe balance and
the deposit row stays at `PAID` indefinitely.
