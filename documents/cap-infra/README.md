# Capital Infrastructure (capinfra) — Phase 1

The capinfra spine is the canonical backend for asset registry,
identity projection, deterministic policy decisions, market data,
append-only audit, and operator console foundation endpoints.

This document is the contract reference. The implementation lives in
[`lib/capinfra/`](../../lib/capinfra) and HTTP routes in
[`pages/api/capinfra/`](../../pages/api/capinfra). The internal
engineering README is [`lib/capinfra/README.md`](../../lib/capinfra/README.md).

## Scope

Phase 1 ships:

- Asset registry (`cap_assets`, with versioned status transitions)
- Identity projection (reads `cap_*` and joins legacy
  `kyc_verifications` / `compliance_claims` by wallet address)
- Deterministic policy evaluator (idempotent, version-stamped)
- Market data ingestion with per-asset oracle profile + divergence
  guard
- Append-only audit events (`cap_audit_events`)
- Operator console endpoints (audit listing, asset summary list,
  eligibility inspector)

Out of scope for Phase 1: settlement engine, portfolio rollups,
risk surfaces, reserves accounting (schema scaffolding only).

## HTTP Surface

All write/operator/identity/policy endpoints require
`x-admin-key: <ADMIN_SOLVENCY_KEY>` and an `x-operator: <free-form>`
header (≤80 chars). The operator string is stamped into every audit
event.

| Method | Path | Auth | Role |
|---|---|---|---|
| GET    | `/api/capinfra/assets`                                  | open | AUDITOR_READ_ONLY |
| POST   | `/api/capinfra/assets`                                  | yes  | SUPER_ADMIN |
| GET    | `/api/capinfra/assets/:id`                              | open | AUDITOR_READ_ONLY |
| PATCH  | `/api/capinfra/assets/:id`                              | yes  | SUPER_ADMIN |
| GET    | `/api/capinfra/identity/users/:userId`                  | yes  | COMPLIANCE_ADMIN |
| GET    | `/api/capinfra/identity/users/:userId/claims`           | yes  | COMPLIANCE_ADMIN |
| POST   | `/api/capinfra/identity/wallets/link`                   | yes  | COMPLIANCE_ADMIN |
| POST   | `/api/capinfra/market-data/ingest`                      | yes  | TREASURY_OPERATOR |
| GET    | `/api/capinfra/market-data/assets/:assetId/price`       | open | AUDITOR_READ_ONLY |
| GET    | `/api/capinfra/market-data/assets/:assetId/history`     | open | AUDITOR_READ_ONLY |
| POST   | `/api/capinfra/policy/evaluate`                         | yes  | COMPLIANCE_ADMIN |
| POST   | `/api/capinfra/operator/eligibility/inspect`            | yes  | COMPLIANCE_ADMIN |
| GET    | `/api/capinfra/operator/assets/summary`                 | yes  | AUDITOR_READ_ONLY |
| GET    | `/api/capinfra/operator/audit`                          | yes  | AUDITOR_READ_ONLY |

## Audit Event Taxonomy (Phase 1)

| Event | Aggregate | Emitted by |
|---|---|---|
| `asset.created`             | `asset`           | `POST /assets` |
| `asset.updated`             | `asset`           | `PATCH /assets/:id` |
| `identity.wallet_linked`    | `user`            | `POST /identity/wallets/link` |
| `price.snapshot_ingested`   | `price_snapshot`  | `POST /market-data/ingest` (accept) |
| `price.snapshot_rejected`   | `price_snapshot`  | `POST /market-data/ingest` (reject) |
| `policy.evaluated`          | `policy_decision` | `POST /policy/evaluate` (every call, including replays) |
| `policy.denied`             | `policy_decision` | `POST /policy/evaluate` (when allowed=false) |

`policy.evaluated` and `policy.denied` payloads include
`replay: true|false` so consumers can distinguish first-evaluation
emits from idempotent-replay emits. First-evaluation writes are
transactional with the decision row.

## Identity Projection Sources

The projection unifies two stores so the policy evaluator does not
care where a claim came from:

- **Canonical (capinfra-owned)** — `cap_users`, `cap_identity_profiles`,
  `cap_claims`, `cap_wallets`. Written by Axiom services that adopt
  the cap_* contract directly.
- **Legacy (read-only join)** — `kyc_verifications` (joined by
  `cap_wallets.address` ↔ `kyc_verifications.user_address`) and
  `compliance_claims` (joined by `cap_wallets.address` ↔
  `compliance_claims.claimant_address`). These tables are owned by
  upstream KYC / compliance pipelines; capinfra never writes to them.

The legacy slice surfaces under `projection.legacy.{kycVerifications,
complianceClaims}` in `GET /identity/users/:userId`.

The spec mentions `identity_registry` and `claims_issued` as additional
upstream sources. Those tables do not exist in this codebase today;
when they appear, add a third reader to `loadLegacySlice()` in
`lib/capinfra/identity.ts` without changing the public projection
shape.

## Policy Versioning

`POLICY_VERSION_REGISTRY` in `lib/capinfra/policy.ts` is the canonical
list of date-stamped policy versions (`YYYY-MM-DD.N`). The current
`POLICY_VERSION` is the last entry. Append the registry — never
mutate or remove an entry — when the rule set or required-claims
matrix changes; the entry is part of the idempotency key, so old
decisions remain replayable under their original version.

## Market Data Oracle Profile

Per-asset oracle configuration is stored on
`cap_assets.metadataJson.oracleProfile` for Phase 1 (a dedicated
`cap_oracle_profiles` table is Phase 2):

```json
{
  "primarySource": "paxos",
  "secondarySource": "alphavantage",
  "staleSec": 900,
  "divergenceBps": 200
}
```

On ingestion the service compares the submitted price against the most
recent snapshot from the opposing source for the same
`(asset, priceType, quoteCurrency)`. If the absolute divergence
exceeds `divergenceBps`, the snapshot is rejected with HTTP 422 and a
`price.snapshot_rejected` audit event. Accepted snapshots return
HTTP 201 with a confidence score derived from staleness × divergence.

## Naming Notes

- Capinfra owns the canonical `cap_positions` table (user-asset
  positions). The pre-existing MIRDT trading-book positions table
  previously held the same name and has been renamed to
  `cap_trading_positions`. The Drizzle export `capPositions` in
  `shared/schema.ts` still points at the trading table; renaming that
  export to `capTradingPositions` is a safe future cleanup tracked in
  follow-up #117.

## Smoke Test

```
ADMIN_SOLVENCY_KEY=… CAPINFRA_BASE_URL=http://localhost:5000 \
  npx tsx scripts/capinfra-smoke.ts
```

Drives 8 checks against canonical paths: open asset list, authed
price ingest, open price + history reads, authed policy evaluation,
operator eligibility inspector, audit listing, operator asset-summary.

## Phase 2 — Settlement, Portfolio, Adapters, Notifications

Phase 2 layers four cooperating services on top of the Phase 1 spine.
None of these introduce new policy semantics — the policy evaluator
remains the only authority for authorization decisions.

### Settlement lifecycle
`POST /api/capinfra/settlement/instructions` (auth) → creates a
`PENDING` instruction. Idempotent on `(user_id, asset_id, action_type,
idempotency_key)`; replay returns the same row with HTTP 201.
`POST /api/capinfra/settlement/instructions/[id]/authorize` (auth) →
runs the policy evaluator and flips PENDING → AUTHORIZED, or rejects
the row to FAILED with the policy result captured on the audit trail.
`POST /api/capinfra/settlement/instructions/[id]/execute` (auth) →
dispatches against the asset's `settlement_type` adapter outside any
DB transaction, then opens a single transaction that flips
AUTHORIZED → SETTLED **and** writes the position upsert + balanced
ledger pair via `applySettlement`. Adapter failures park the row at
FAILED with `external_ref` recording the adapter error code.

### Adapters
`lib/capinfra/adapters/registry.ts` enforces §0.1 isolation: each
adapter is loaded by `settlement_type` and never reaches across rails.
The `INTERNAL` adapter is LIVE and used for AXUSD treasury moves.
`EVM`, `STELLAR`, and `ACH` are stubs that return
`NotImplementedAdapterError` until production rails wire in.

### Portfolio & ledger
`applySettlement` is the only mutation entry point for `cap_positions`,
`cap_ledger_entries`, `cap_snapshots`, and `cap_snapshot_lines`. It is
invoked inside the SETTLED transaction so a partial write is impossible.
Ledger pairs are balanced double-entry rows with a shared
`tx_group_id`; reads run via `GET /api/capinfra/portfolio/ledger` and
`/positions`. Snapshot creation uses the canonical ordering
`user_id, asset_id, wallet_id NULLS FIRST, asOf, id` and a sha256
checksum so back-to-back snapshots over the same data are bit-identical.

### Notifications
`cap_notifications` records best-effort fan-out events; subscribers
are registered in `lib/capinfra/notifications/subscriptions.ts` and
fire **after** the settlement transaction commits via
`Promise.allSettled` so a notification failure never rolls back a
SETTLED instruction. Read endpoints: `GET /api/capinfra/notifications`
(filter by user, topic, severity) and `POST /api/capinfra/notifications/[id]/read`.

### Bootstrap
Seed two ledger accounts (`cap_internal_assets`,
`cap_internal_liabilities`) and the `capinfra-internal` adapter row
via `npx tsx scripts/capinfra-seed.ts`.

### Webpack note
Four Phase 2 ledger/snapshot tables (`cap_accounts`,
`cap_ledger_entries`, `cap_snapshots`, `cap_snapshot_lines`) live in
the very large `shared/schema.ts` barrel; the Next API-route bundle
resolves their Drizzle table refs as `undefined` at runtime.
`portfolio.ts` therefore reads/writes those four tables via raw
parameterized SQL through `db.execute(sql\`…\`)`. The Phase 1
`cap_positions` table lives in `shared/capInfraSchema.ts` and bundles
cleanly, so it continues to use the typed Drizzle helpers.

## Smoke Test (extended)

The harness now drives 14 checks: 8 from Phase 1 plus the Phase 2
end-to-end settlement → portfolio → snapshot → notification flow.

## Phase 3A — Foundations

Phase 3A ships three blocking surfaces that gate value movement before
any external adapter or webhook is introduced in Phase 3B.

1. **Policy publication ledger.** Versioned publish into
   `cap_risk_policies` with single-active-per-scope enforcement (partial
   unique on `scope_hash` WHERE `is_active = true`). Reasoned retire
   path; full audit trail.

2. **Reserve service.** Append-only `cap_reserve_holdings` (CREDIT /
   DEBIT, source-tagged, idempotent by `idempotencyKey`), versioned
   solvency-mode config in `cap_reserve_config`, deterministic
   sha256-checksummed snapshots in `cap_reserve_holdings_snapshots` +
   `_lines`. Wired into `evaluatePolicy` so MINT actions DENY with
   `RESERVE_INSUFFICIENT` when headroom is short, and *every* action
   DENIES with `MANUAL_INTERVENTION_HALT` while solvency mode is in
   halt. Per R7 the reserve never mutates settlement state — it blocks
   strictly via the policy layer.

3. **Operator console.** Cookie-gated `/operator/*` pages built on
   `DesignLawLayout`. Surfaces settlement instructions (with audit log
   inspector), reserve headroom + recent snapshots, recent policy
   denials, notifications, and quarantined webhook events.
   Mode-change and webhook reclassify endpoints require a distinct
   second actor and write to the `cap_admin_actions` ledger.

### Tables introduced

| Table | Purpose |
|-------|---------|
| `cap_reserve_config` | Versioned solvency-mode config (dual-actor) |
| `cap_reserve_holdings` | Append-only reserve ledger entries |
| `cap_reserve_holdings_snapshots` | Deterministic snapshot manifest |
| `cap_reserve_holdings_snapshot_lines` | Per-asset snapshot lines |
| `cap_admin_actions` | Dual-actor administrative ledger |
| `cap_webhook_events` | Adapter inbound events (rows from 3B) |

### New ID prefixes

`aa` (admin action), `ac` (adapter config), `we` (webhook event),
`rcfg` (reserve config), `rhs` (reserve holdings snapshot),
`rhsl` (reserve holdings snapshot line).

### Smoke harness

20 checks (1–14 unchanged, 15–20 added). Run with:

```bash
ADMIN_SOLVENCY_KEY=... CAPINFRA_BASE_URL=http://localhost:5000 \
  npx tsx scripts/capinfra-smoke.ts
```

### Phase 3B (next)

External adapters (banking / custody webhooks), reconciliation jobs,
and the producer-side of `cap_webhook_events` land in 3B. The
operator quarantine surface and reclassify endpoint are already in
place to receive them.

## Phase 3B.1a — Stellar DRY_RUN + webhook ingress

- Adapter isolation: every Stellar SDK import lives only in `lib/capinfra/adapters/stellar/sdk.ts`. The adapter is the first capinfra adapter with optional `health()` and `verifyWebhook()` methods; the registry contract is unchanged for INTERNAL/EVM/ACH.
- DRY_RUN-only dispatch with deterministic synthetic receipt; LIVE explicitly refused.
- Persistence-first webhook ingress (raw body always written first); malformed bodies and bad signatures are quarantined with stable reason codes.
- Duplicate verified events bump attempts and emit a duplicate audit event; processed metadata is preserved.
- Operator UI: `/operator/adapters/stellar` (health + reconciliation runner + last 20 events). Quarantine page now supports an adapter filter.
- Reconciliation runner is interface-only in 3B.1a; full diff lands in 3B.1b.

## Phase 3B.1b — Webhook → settlement wiring + real reconciliation diff

### What changed

**Settlement wiring**: `externallySettleInstruction` advances `EXECUTING → SETTLED_EXTERNAL` or `FAILED_EXTERNAL`. Terminal states are permanently immutable — the function raises `ConflictError` and the processor records `NO_OP_TERMINAL_STATE`. No portfolio or reserve writes happen inside webhook processing or reconciliation.

**Reconciliation diff engine**: replaces the 3B.1a skeleton with a real Horizon cursor-pager (`fetchHorizonPaymentsPage`). Drift items are classified into:

| Kind | Severity | Meaning |
|------|----------|---------|
| `MISSING_REMOTE` | `INFORMATIONAL` (for DRY_RUN receipts) / `BLOCKING` | Local instruction has no Horizon counterpart |
| `MISSING_LOCAL` | `BLOCKING` | Horizon payment has no local instruction; remediation creates one via `createInstruction` |
| `AMOUNT_MISMATCH` | `WARNING` | Amounts differ between Horizon and local |
| `AMBIGUOUS_MATCH` | `WARNING` | Multiple instructions share the same external ref |

Remediation failure is captured in `remediationFailureJson` — never re-thrown.

**New tables**: `cap_reconciliation_runs` (`rr_` prefix) and `cap_reconciliation_drift` (`rd_` prefix). Both are append-only.

**Processor endpoint**: `POST /api/capinfra/webhooks/events/[id]/process` — manually (re-)runs the processing pipeline for a single event. Fire-and-forget is also triggered automatically after verified webhook ingress.

**Public health endpoint**: `GET /api/capinfra/health` — unauthenticated, returns `{ status, service, timestamp }`.

### New HTTP surface

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `POST` | `/api/capinfra/webhooks/events/[id]/process` | admin | Re-process a single event |
| `GET` | `/api/capinfra/reconciliation/runs` | admin | List runs (filterable by adapterKey) |
| `GET` | `/api/capinfra/reconciliation/runs/[id]` | admin | Single run detail |
| `GET` | `/api/capinfra/reconciliation/runs/[id]/drift` | admin | Drift rows for a run |
| `GET` | `/api/capinfra/health` | public | Shape regression guard |

### Smoke harness

33 checks total. Run with:

```bash
ADMIN_SOLVENCY_KEY=... CAPINFRA_BASE_URL=http://localhost:5000 \
  npx tsx scripts/capinfra-smoke.ts
```

| # | Check |
|---|-------|
| 27 | Reconcile returns `rr_` runId, `COMPLETED`, numeric compared/drift |
| 28 | `GET /reconciliation/runs` returns the persisted run |
| 29 | `GET /reconciliation/runs/[id]` returns correct run |
| 30 | `GET /reconciliation/runs/[id]/drift` returns array + total |
| 31 | Webhook process endpoint returns valid outcome |
| 32 | Duplicate processing idempotency |
| 33 | `GET /api/capinfra/health` shape regression guard |

---

## Phase 3A — Foundations (Policy Publication, Reserve, Operator Safety Surfaces)

### Policy publication (3A.1)

`lib/capinfra/policy/publication.ts` adds versioned policy management with single-active-per-scope enforcement. Publishing a new version atomically deactivates the prior active version in the same scope.

HTTP endpoints:

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/capinfra/policy/versions` | admin | Filter by scope, isActive |
| `POST` | `/api/capinfra/policy/versions` | admin | Publish; enforces single-active |
| `POST` | `/api/capinfra/policy/versions/[id]/retire` | admin | Retire a version |
| `GET` | `/api/capinfra/policy/decisions` | admin | Recent policy decisions |

### Reserve accounting (3A.2)

Deterministic append-only reserve ledger (`cap_reserve_holdings`). Reserve blocks settlement via policy — it never writes to settlement or position tables directly.

Key guarantees:
- `headroom(assetId)` = Σ credits − Σ debits (integer arithmetic, no floats).
- Back-to-back `snapshot` calls return identical sha256 for the same ledger state.
- `adjust` requires `idempotencyKey` + `reasonCode` + `attestationRef` (all three).
- Reserve solvency mode change requires two distinct actor identities (`assertDistinctActors`).

HTTP endpoints:

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/capinfra/reserve/headroom` | admin | `?assetId=...` |
| `POST` | `/api/capinfra/reserve/adjust` | admin | Append-only, idempotent |
| `POST` | `/api/capinfra/reserve/snapshots` | admin | sha256 snapshot |
| `GET` | `/api/capinfra/reserve/snapshots/[id]` | admin | Snapshot + lines |
| `GET` | `/api/capinfra/reserve/config` | admin | Active mode + history |
| `POST` | `/api/capinfra/reserve/config` | admin | Dual-actor mode change |

### Operator safety-critical UI (3A.3)

Cookie-gated operator portal (cookie validated against `ADMIN_SOLVENCY_KEY`). All pages use `<DesignLawLayout>`.

Pages: `/operator`, `/operator/login`, `/operator/instructions`, `/operator/instructions/[id]`, `/operator/reserve`, `/operator/policy/decisions`, `/operator/notifications`, `/operator/integrity`, `/operator/webhooks/quarantine`.

The dedicated `/operator/integrity` console lists recent
`collateral.integrity_failed` (auto-freeze) notifications from the
last 24 h with a "show acknowledged" toggle so operators can find
rows that were already cleared via the dashboard panel's "Mark read"
button. The dashboard panel's header link points at this console.

Webhook reclassification (`POST /api/capinfra/webhooks/events/[id]/reclassify`) requires dual-actor (distinct identities, persisted to `cap_admin_actions`).

---

## Phase 3B.2 — ACH/Increase DRY_RUN Settlement Rail

### Adapter contract summary

- **Mode**: `DRY_RUN` only in this phase. No `LIVE` or `MANUAL_APPROVAL` modes.
- **Settlement**: executes synchronously, returns `externalRef: 'DRYRUN-ACH-<cuid>'`.
- **Inbound webhooks**: always quarantined (`UNSUPPORTED_INBOUND_EVENT`); no auto-credit.
- **Reconciliation**: short-circuits in `DRY_RUN` — no Increase API call, returns `comparedCount=0`, persists audit run.
- **Signing secret**: stored in `configJson` only (not an environment variable).
- **Public health**: coarse shape only (mode, kind, quarantinedCount24h); `reachable` is operator-only.
- **Decimal arithmetic**: `decimalStringToCents` — integer arithmetic, no floating-point.

### Rail isolation requirement

`asset.settlementType` must equal `instruction.settlementType`. ACH instructions require an asset with `settlementType='ACH'`. The smoke harness seeds a dedicated `AXUSD-ACH-SMOKE` asset for dispatch testing.

### HTTP surface

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/capinfra/webhooks/increase` | HMAC (configJson) | Webhook ingress (202 always) |
| `GET` | `/api/capinfra/adapters/increase/health` | admin | Coarse adapter health |
| `POST` | `/api/capinfra/adapters/increase/reconcile` | admin | Manual reconcile run |

### Smoke harness (41/41 total)

Checks 34–41 cover the full ACH lifecycle:

| # | Check |
|---|-------|
| 34 | ACH adapter registered in `cap_adapters` |
| 35 | Health → mode=DRY_RUN, kind=ACH |
| 36 | PENDING → AUTHORIZED → SETTLED with DRYRUN-ACH-* externalRef |
| 37 | Bad-sig webhook → QUARANTINED |
| 38 | Good-sig webhook → RECEIVED (or skipped if secret not provisioned) |
| 39 | Duplicate webhook → isDuplicate=true |
| 40 | Reconcile → DRY_RUN_SKIP, comparedCount=0 |
| 41 | Drift endpoint → rows=[], no spurious drift |

## Phase 3B.3 — ACH Adapter Control Plane

Four-stage production rollout: `DRY_RUN → MANUAL_APPROVAL → LIVE_CANARY → LIVE`.

### Settlement status additions
- **PENDING_OPERATOR_APPROVAL** — instruction in MANUAL_APPROVAL mode awaiting dual-actor approval.
- **SUBMITTED** — approved and handed to Increase. Not bank-final; portfolio writes occur only on confirmed `SETTLED` webhook events.

### Control plane endpoints

| Endpoint | Purpose |
|---|---|
| `GET /adapters/increase/config` | Current mode + configVersion |
| `POST /adapters/increase/config` | Dual-actor mode transition |
| `POST /adapters/increase/validate` | 5 gate checks (account_reachable, webhook_secret_valid, webhook_roundtrip_pass, duplicate_dedup_pass, reconcile_pass) |
| `POST /adapters/increase/sweep-timeouts` | Expire stale instructions |
| `GET/POST /adapters/increase/emergency-disable` | Single-actor freeze; GET shows current unacknowledged disable |
| `POST /adapters/increase/emergency-disable/acknowledge` | Dual-actor acknowledgment within 4h window |
| `POST /settlement/instructions/[id]/approve` | Operator approval → SUBMITTED |
| `POST /settlement/instructions/[id]/reject` | Operator rejection → FAILED |

### Smoke harness (64/64 total)

Checks 42–64 cover the full ACH control plane. All 64 checks green.

## Phase 3A — Foundations

Delivers the three foundational surfaces required before Phase 3B production promotion: policy publication ledger, reserve service, and operator UI safety-critical surfaces.

### 3A.1 — Policy Publication

`lib/capinfra/policy/publication.ts` manages the authoritative "which version is in force for which scope" record in `cap_risk_policies`. Key guarantees:

- **Single-active-per-scope**: the partial unique index `cap_risk_policies_active_scope_uq` on `(scope_hash) WHERE is_active = true` is enforced by both the DB and a transactional `SELECT FOR UPDATE` + deactivate in `publishPolicyVersion`.
- **Deterministic scope hash**: `computeScopeHash(scope)` — sha256 over canonicalized (keys sorted, values recursively sorted) JSON. Reproducible across processes.
- Publishing atomically deactivates the prior active row in the scope and emits `policy.version.retired` + `policy.version.published` audit events.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET`  | `/api/capinfra/policy/versions` | admin | List with optional `name`, `isActive`, `scopeHash`, `limit` filters |
| `POST` | `/api/capinfra/policy/versions` | admin | Publish new version (deactivates prior in same scope) |
| `POST` | `/api/capinfra/policy/versions/[id]/retire` | admin | Retire a specific version |
| `GET`  | `/api/capinfra/policy/decisions` | admin | Read filtered decisions (`userId`, `assetId`, `action`, `allowed`, `reasonCode`, `from`, `to`, `limit`) |

### 3A.2 — Reserve Service

Append-only ledger semantics in `cap_reserve_holdings`. Net per-asset balance is `SUM(direction=CREDIT) - SUM(direction=DEBIT)`. Reserve NEVER mutates settlement state — insufficient headroom is enforced via the policy layer (`RESERVE_INSUFFICIENT` reason code in `lib/capinfra/policy.ts`).

**Snapshot determinism** (§7.F): `createSnapshot` aggregates holdings into `(assetId, attestationRef)` buckets, then sorts `(assetId ASC, attestationRef NULLS FIRST)`, assigns monotonic `lineIndex`, and sha256-hashes a canonicalized JSON projection. Back-to-back snapshots over the same ledger state produce identical checksums.

**Config versioning**: `cap_reserve_config` is append-only. Every mode change supersedes the prior active row and requires distinct `primaryActor` / `secondaryActor`.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET`  | `/api/capinfra/reserve/headroom?assetId=…` | admin | Net available headroom (deterministic) |
| `POST` | `/api/capinfra/reserve/adjust` | admin | Append holding row (idempotencyKey, reasonCode, actor required) |
| `GET`  | `/api/capinfra/reserve/snapshots` | admin | List recent snapshots |
| `POST` | `/api/capinfra/reserve/snapshots` | admin | Create deterministic snapshot |
| `GET`  | `/api/capinfra/reserve/snapshots/[id]` | admin | Snapshot + lines |
| `GET`  | `/api/capinfra/reserve/config` | admin | Active solvency mode + history |
| `POST` | `/api/capinfra/reserve/config` | admin (dual-actor) | Mode change (primaryActor ≠ secondaryActor) |

### 3A.3 — Operator UI

Cookie-gated internal console (validates `ADMIN_SOLVENCY_KEY` via `lib/capinfra/operatorAuth.ts`). All pages redirect to `/operator/login` without a valid cookie.

| Route | Description |
|---|---|
| `/operator/login` | Key exchange form |
| `/operator` | Dashboard: instruction counts, denial counts, quarantine count, reserve mode, last snapshot |
| `/operator/instructions` | Settlement instruction list + status filter |
| `/operator/instructions/[id]` | Instruction inspector with audit log |
| `/operator/reserve` | Headroom, mode, last snapshot details |
| `/operator/policy/decisions` | Recent denied decisions |
| `/operator/notifications` | Notification feed |
| `/operator/webhooks/quarantine` | Quarantined event viewer + dual-actor reclassify |

**Reclassify endpoint** (`POST /api/capinfra/webhooks/events/[id]/reclassify`): dual-actor, requires distinct `primaryActor` / `secondaryActor`. Updates status and records `webhook.event.reclassify` in `cap_admin_actions`.

### Smoke harness (Phase 3A, checks 15–20)

| # | Check |
|---|-------|
| 15 | Publish policy version A → 201; publish B same scope → A becomes `isActive=false` |
| 16 | Seed CREDIT + `GET headroom` x2 → identical `available`, reflects seed |
| 17 | `POST /reserve/snapshots` x2 → identical sha256 checksum |
| 18 | `POST /reserve/adjust` missing required fields → 400; with all fields → 201 |
| 19 | `POST /reserve/config` same actor → 400; distinct secondary actor → 200 |
| 20 | `GET /policy/decisions` + `GET /reserve/config` → 200 |

All 67 smoke checks green as of Phase 3A (Phase 1: 1–8, Phase 2: 9–14, Phase 3A: 15–20, Phase 3B.1a: 21–41, Phase 3B.3: 42–67).

## Collateral Risk Policy (`2026-04-21.1`)

Canonical policy: [`documents/policies/collateral-risk-policy.md`](../policies/collateral-risk-policy.md).
Public Design Law page: `/disclosure/collateral-risk-policy` (linked from
the Disclosure dropdown in the top nav).

Every onboarded asset carries a `collateral_class` ∈ {GREEN, YELLOW, RED},
defaulting to `RED` (fail-closed). The deterministic policy evaluator
gates the new `BORROW` action by class:

- RED → deny `COLLATERAL_CLASS_RED`
- YELLOW above per-asset cap → deny `COLLATERAL_CAP_EXCEEDED`
- Integrity flip → deny `COLLATERAL_INTEGRITY_FAILED`

All three reason codes participate in `MUTABLE_STATE_DENY_REASONS`, so
the evaluator's idempotent decision cache is bypassed when collateral
state changes.

### Operator surface

- `POST /api/capinfra/risk/collateral/disable` — RISK_OPERATOR, dual-actor
  (distinct `primaryActor` / `secondaryActor`), reason required.
  Transactionally flips the asset to RED and emits
  the `collateral.guardian_disabled` audit event (admin action type
  `collateral.guardian_disable`). No inverse endpoint by design —
  re-admission is policy-publication-only.
- `/operations/cap-infra` — CollateralClassBadge + per-row Disable button +
  modal; reload event hook refreshes the asset list after success.

### Integrity callers

`lib/capinfra/risk/integrity.ts#recordIntegrityFailure(kind, …)` is the
single chokepoint for emergency-trigger flips. Five `kind`s are
recognised: `oracle_stale`, `reserve_attestation_failed`,
`redemption_failed`, `issuer_event`, `bridge_event`. Emits
`collateral.integrity_failed`.

### Smoke checks (73–75)

The smoke harness verifies the end-to-end gate:

- 73 — YELLOW (AXUSD-TREASURY) BORROW above per-asset cap denies
  `COLLATERAL_CAP_EXCEEDED`; below cap allows.
- 74 — Guardian disable on AXAU (GREEN) returns `previousClass=GREEN`,
  `newClass=RED`.
- 75 — Cache-bypass proof: same BORROW input that was ALLOWed in 74
  pre-disable now denies `COLLATERAL_CLASS_RED` post-disable.

The harness restores AXAU to GREEN via direct SQL at the end (test-only;
prod re-admission remains policy-publication-only).

### One-shot classification backfill

`scripts/capinfra-classify-collateral-backfill.ts` is the canonical
one-shot operator script for environments that contain `cap_assets`
rows created before the Collateral Risk Policy publication. It:

1. Sets the canonical seed assets (AXAU=GREEN, PAXG=GREEN,
   AXUSD-TREASURY=YELLOW) with explicit doctrinal rationale.
2. Pins every other unclassified asset to RED with a "policy
   publication backfill" rationale, preserving the fail-closed
   invariant. Risk owners must then re-classify each asset through the
   audited `cap_risk_policies` publication flow before borrow can
   resume.
3. Verifies post-run that no asset is missing classification rationale
   and exits non-zero if any remain.

Each row touched also writes a `collateral.classification_backfilled`
audit event so the change is traceable. Re-runs are idempotent: explicit
GREEN/YELLOW classifications are never overwritten. Use `--dry-run` to
print the plan without writing.

```
DATABASE_URL=... npx tsx scripts/capinfra-classify-collateral-backfill.ts --dry-run
DATABASE_URL=... npx tsx scripts/capinfra-classify-collateral-backfill.ts
```

### Reserve / redemption integrity wiring

`adjustReserve` carries a post-commit integrity hook that closes the
loop on the Collateral Risk Policy:

- When `source = 'ATTESTATION'` and the asset's net headroom is
  negative after the write, the hook calls
  `recordIntegrityFailure({ kind: 'reserve_attestation_failed' })`.
- When `source = 'REDEMPTION'` and the asset's net headroom is
  negative after the write, the hook calls
  `recordIntegrityFailure({ kind: 'redemption_failed' })`.

The hook is best-effort and never blocks the underlying reserve write
(any failure is logged with `[reserve.adjust] integrity hook failed
(non-blocking)`). Combined with the oracle-staleness path in
`marketData.getLatestPrice`, every trigger named in the Collateral Risk
Policy has a live wired chokepoint. Smoke check 76 exercises this
end-to-end against AXAU.

### On-call paging configuration (REQUIRED in production)

Whenever `recordIntegrityFailure` flips an asset to RED it persists a
HIGH-severity `collateral.integrity_failed` notification on the
`operator` channel **and** fans the same event out to the on-call
pager (`lib/capinfra/notifications/integrityPager.ts`). The pager
wakes a real human via email and/or Discord. Without configuration
the pager logs a single warning per process
(`[capinfra.integrity-pager] no paging channels configured; …`) and
returns `skipped: true` — the only signal on-call would receive is
the in-app dashboard panel, which is not enough for a collateral
emergency.

Two env vars gate the pager. **Both are optional individually but at
least one MUST be set in every production environment.** Configure
both for redundancy.

| Env var | Format | Owner | Recommended value |
|---|---|---|---|
| `INTEGRITY_ALERT_EMAIL` | Comma-separated email recipients (no spaces required, trimmed) | Risk / SRE on-call lead | The current on-call rotation alias plus the risk lead's direct address (e.g. `oncall@axiomprotocol.app,risk-lead@axiomprotocol.app`). Send to a real human alias, not a shared inbox nobody watches. |
| `INTEGRITY_ALERT_DISCORD_WEBHOOK` | Discord-compatible webhook URL (`https://discord.com/api/webhooks/...`) | Risk / SRE on-call lead | A webhook bound to the `#capinfra-pager` channel that pings the on-call role. |

Configuration model is identical to the prune-overdue alert pipeline
(`PRUNE_ALERT_EMAIL` / `PRUNE_ALERT_DISCORD_WEBHOOK` in
`lib/admin/prune-alert.ts`) so operators only have to learn one
shape. Both pagers also share the property that channel failures are
caught and never re-thrown.

#### At-a-glance dashboard banner (Task #305)

The single per-process log warning is easy to miss in aggregated
logs, so the operator console renders an `IntegrityPagerStatusBanner`
at the top of `/operator` and `/operator/integrity` that mirrors the
pager's own configuration view:

| Pager state | Banner |
|---|---|
| Both env vars set | Green &mdash; "Pager: email + discord configured" |
| Exactly one set | Amber &mdash; "Pager: &lt;channel&gt; only — set the other env var for redundancy" |
| Neither set | Loud red &mdash; "WARNING: on-call pager not configured — auto-freeze events will only show in this dashboard" |

Server-side rendering reads the same env-var helpers the pager uses
(`lib/capinfra/notifications/integrityPagerStatus.ts`) so the banner
can never disagree with what the pager actually sees: if the pager
would skip, the banner says "not configured", and vice versa. The
companion endpoint
`GET /api/capinfra/operator/integrity-pager-status` returns the same
booleans (cookie-auth) for any future client-side refresh path.
Recipient lists and webhook URLs themselves never reach the client.

#### Verifying configuration after rotation

The pager exposes a synthetic test endpoint specifically so on-call
can confirm wiring before a real auto-freeze fires. After **any**
rotation of the email recipient list or Discord webhook, an on-call
operator MUST run a wiring check:

1. From the operator console (already logged in via the
   `cap_operator_key` cookie) press **Send test page** on
   `/operator/integrity`, OR
2. Server-to-server, hit the endpoint directly:

```bash
curl -X POST "$BASE_URL/api/capinfra/risk/integrity/test-page" \
  -H "x-admin-key: $ADMIN_SOLVENCY_KEY" \
  -H "x-operator: oncall-rotation-check"
```

The response body is
`{ result: { channelsPaged, errors, skipped } }` — `channelsPaged`
must include every channel the env vars claim to configure
(`["email"]`, `["discord"]`, or `["email","discord"]`). Synthetic
pages are clearly labelled `[TEST PAGE]` in the email subject and
Discord embed so on-call cannot mistake the verification for a real
auto-freeze. If a channel is listed in `errors` it failed delivery —
fix the env var (typo, expired webhook, Resend domain not verified,
…) and re-run the test before considering the rotation complete.

#### Production deployment checklist (paging gate)

A new environment cannot be promoted to production-serving without
satisfying every row below. This list is the canonical pre-promotion
gate for the integrity pager and lives next to the Collateral Risk
Policy because the pager is the only channel that wakes a human when
a `collateral.integrity_failed` event fires.

- [ ] At least one of `INTEGRITY_ALERT_EMAIL` or
      `INTEGRITY_ALERT_DISCORD_WEBHOOK` is set in the production
      environment. Setting **both** is strongly recommended for
      redundancy; an email-only or Discord-only deployment satisfies
      the gate but loses redundancy if that single channel is
      degraded (Resend domain drift, expired webhook, …).
- [ ] If `INTEGRITY_ALERT_EMAIL` is configured, every recipient
      resolves to a monitored on-call alias (not a shared inbox
      nobody watches).
- [ ] If `INTEGRITY_ALERT_DISCORD_WEBHOOK` is configured, the
      webhook is bound to a channel that pings the on-call role
      (silent webhooks defeat the purpose).
- [ ] If `INTEGRITY_ALERT_EMAIL` is configured, the Resend
      integration is connected (`getResendClient()` in
      `lib/email/resend.ts` returns without throwing) so the email
      channel can actually deliver.
- [ ] `ADMIN_SOLVENCY_KEY` is set so the wiring-check endpoint and
      the operator console cookie both authenticate.
- [ ] The on-call wiring check above has been run against the
      production base URL and `result.channelsPaged` matches the
      configured channels with `errors: []`.
- [ ] The runbook owner (Risk / SRE on-call lead) is recorded in the
      env-var ownership table above and knows they own rotation.

Promotion sign-off should not be granted while any item is
unchecked. The single per-process warning is intentionally quiet so
it does not deafen log aggregation, which means absence of warnings
in production logs is **not** evidence the pager is configured —
only the wiring check is.
