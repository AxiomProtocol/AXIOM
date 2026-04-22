# Capital Infrastructure — Phase 2 Implementation Plan

**Status**: APPROVED with clarifications (see §0.1)
**Prerequisite**: Phase 1 merged (Task #116) — modular monolith spine in place
**Out of scope**: Phase 3 (real external partner wiring, reconciliation jobs, webhooks, risk policy enforcement, operator UI, automated tests, role matrix beyond admin/auditor)

---

## 0.1 Approved clarifications (binding contract additions)

The following five clarifications were added on approval and are binding for Phase 2:

1. **Settlement lifecycle is a hard contract.** The only legal transitions are:
   `PENDING → AUTHORIZED → EXECUTING → SETTLED | FAILED | CANCELLED`.
   Terminal states (`SETTLED`, `FAILED`, `CANCELLED`) are immutable: no service path may transition out of them; any attempt returns `409 ValidationError('terminal_state')`. `CANCELLED` is reachable only from `PENDING` or `AUTHORIZED`.

2. **Testing scope.** Smoke harness validation (extending `scripts/capinfra-smoke.ts` with 6 new Phase 2 checks) is in scope for Phase 2. A full automated test suite (Vitest/Jest) remains out of scope and is tracked under Task #119.

3. **Notification independence.** Notification persistence and delivery MUST NEVER roll back or block a successful settlement transaction. Notifications are downstream effects of canonical audit events:
   - Subscription handlers fire **after** the settlement DB transaction commits, never inside it.
   - All notification work is wrapped in `try/catch`; failures log via `audit.recordEvent('notification.delivery_failed', ...)` but never throw to the caller.
   - Email (`Resend`) sends are fire-and-forget for Phase 2; failures append to audit, never propagate.

4. **Snapshot determinism.** `buildSnapshot()` checksum generation MUST use a stable ordering rule before hashing. Sort key:
   `ORDER BY user_id ASC, asset_id ASC, wallet_id ASC NULLS FIRST, line_index ASC`.
   The same `(asOf, position set)` MUST always produce an identical checksum.

5. **Phase 2 vs Phase 3 boundary.** Phase 2 reuses existing Phase 1 policy and asset status checks (`evaluatePolicy()`, `cap_assets.status='ACTIVE'`) but introduces NO new risk-policy enforcement logic. The `cap_risk_*` tables remain dormant. Any new policy field, new claim type, or new risk band is out of scope and deferred to Phase 3.

---

## 0. Scope summary

Phase 2 builds the **execution + portfolio + adapter + notification** layer on top of the Phase 1 spine. Four service domains:

1. **Settlement service** — idempotent instruction lifecycle (PENDING → AUTHORIZED → EXECUTING → SETTLED/FAILED/CANCELLED)
2. **Adapter service** — pluggable, isolated execution backends (INTERNAL ships live; EVM/Stellar/ACH stubs)
3. **Portfolio service** — derived position/ledger state, only mutated by settlement
4. **Notifications** — in-app + email fan-out from canonical audit events

All four Phase 2 schemas already exist from Phase 1 (`cap_settlement_instructions`, `cap_adapters`, `cap_positions`, `cap_ledger_entries`, `cap_drawdowns`, `cap_snapshots`, `cap_snapshot_lines`, `cap_drift_series`, `cap_price_marks`, `cap_accounts`, `cap_fees`). One additive table is required (`cap_notifications`). **No destructive schema migrations.**

---

## 1. Architectural rules (enforcement, not aspiration)

| Rule | Enforcement mechanism |
|---|---|
| Same Drizzle + spec contract approach as Phase 1 | All new types in `lib/capinfra/types.ts` as Zod schemas; all responses parse-validated; all DB access through Drizzle, no raw SQL in services. |
| Reuse Phase 1 policy + audit foundations | Settlement creation MUST call `evaluatePolicy()`; portfolio mutations MUST happen inside the same `db.transaction` as the settlement that triggered them; every mutation writes a `cap_audit_events` row via `audit.recordEvent()`. Lint check: services other than `audit.ts` may not `INSERT INTO cap_audit_events` directly. |
| Settlement idempotency | `Idempotency-Key` header required on `POST /instructions`; uniqueness enforced at DB layer (`cap_settlement_instructions_idem_uq`); duplicate keys return prior row, not a new one; an `settlement.idempotent_replay` event is appended on each replay. |
| Portfolio derived from settlements | `cap_positions` and `cap_ledger_entries` write paths exist ONLY inside `applySettlement()`; no other code path may insert/update them. Enforced via single export from `portfolio.ts`. |
| Adapter isolation | Settlement service imports only `adapters/registry.ts`; partner SDKs (Increase, BitGo, Stellar Horizon, Alchemy) imported only inside specific adapter files. Code-review grep check: `lib/capinfra/settlement.ts` must not import any individual adapter file. |
| No product-specific logic in execution core | Settlement service operates purely on `(assetId, action, amount, settlementType)` resolved from `cap_assets` config; no per-asset `if (symbol === 'AXAU')` branches anywhere outside seed/data files. |

---

## 2. Module map

### 2.1 Settlement service — `lib/capinfra/settlement.ts`

**Owns**: `cap_settlement_instructions`, `cap_fees`
**Reuses**: `policy.evaluatePolicy()`, `audit.recordEvent()`, `assetRegistry.getAssetById()`, `ids.generateId('inst')`, `adapters/registry.dispatch()`

| Function | Behavior |
|---|---|
| `createInstruction(input, actor, idempotencyKey)` | Resolve asset → call `evaluatePolicy()`. On `allowed=false`: write `settlement.denied`, throw `ValidationError(reasonCode)`. On allow: insert row with `status='PENDING'`, `policy_decision_id=<decisionId>`, `idempotency_key=<key>`. Wrapped in `db.transaction`. Idempotent via `cap_settlement_instructions_idem_uq`: duplicate key returns the prior row + emits `settlement.idempotent_replay`. |
| `authorizeInstruction(id, actor)` | PENDING → AUTHORIZED only. Re-validates policy version-locked to original `policy_decision_id` (no re-evaluation, just integrity check). Writes `settlement.authorized`. |
| `executeInstruction(id, actor)` | AUTHORIZED → EXECUTING → SETTLED \| FAILED. Dispatches via `adapterRegistry.dispatch(adapterId, instruction)`. On success: status=SETTLED, calls `portfolio.applySettlement(instruction, tx)` inside the same transaction, writes `settlement.settled`. On failure: status=FAILED, writes `settlement.failed`. |
| `cancelInstruction(id, actor, reason)` | Only PENDING/AUTHORIZED can cancel. Writes `settlement.cancelled`. Terminal states (SETTLED/FAILED/CANCELLED) reject with `ValidationError`. |
| `listInstructions(filter, page)` | Cursor-paginated; admin/operator only. |
| `getInstructionById(id)` | Admin/operator only. |

**Endpoints** under `pages/api/capinfra/settlement/`:
- `POST /instructions` — create (requires `Idempotency-Key` header)
- `GET /instructions` — list (operator)
- `GET /instructions/:id` — detail (operator)
- `POST /instructions/:id/authorize` — operator
- `POST /instructions/:id/execute` — operator
- `POST /instructions/:id/cancel` — operator

**Audit events emitted**: `settlement.created`, `settlement.denied`, `settlement.authorized`, `settlement.executing`, `settlement.settled`, `settlement.failed`, `settlement.cancelled`, `settlement.idempotent_replay`. All carry `correlationId` (from `x-correlation-id` header) and `policyDecisionId`.

---

### 2.2 Adapter service — `lib/capinfra/adapters/`

**Owns**: `cap_adapters`

```
lib/capinfra/adapters/
  registry.ts        register/lookup, no business logic
  types.ts           AdapterDescriptor, DispatchResult, AdapterError
  internal.ts        INTERNAL adapter (book transfer, no external call) — LIVE
  evm.ts             EVM stub — Phase 3 wiring
  stellar.ts         Stellar stub — Phase 3 wiring
  ach.ts             ACH/wire stub — Phase 3 wiring
```

**Adapter contract**:
```ts
interface CapAdapter {
  kind: 'INTERNAL' | 'EVM' | 'STELLAR' | 'ACH' | 'WIRE' | 'SWIFT' | 'CCTP';
  name: string;
  capabilities: { actions: CapActionType[]; settlements: CapSettlementType[] };
  dispatch(instruction: SettlementInstruction): Promise<DispatchResult>;
  reconcile?(externalRef: string): Promise<ReconcileResult>;
}
```

**Hard isolation rule**: settlement service NEVER imports `internal.ts` / `evm.ts` etc. directly — only `registry.dispatch(adapterId, instruction)`. All external partner SDKs are confined to adapter modules. This is the explicit "no product-specific logic in core execution" enforcement.

**Phase 2 ships only the `INTERNAL` adapter live**. Other adapters are stub-registered (`isActive=false`) so the registry shape exists for Phase 3 without further refactor.

**Endpoints** under `pages/api/capinfra/adapters/`:
- `GET /adapters` — list (operator)
- `GET /adapters/:id` — detail (operator)
- `POST /adapters` — register/activate (super-admin)
- `PATCH /adapters/:id` — toggle `isActive` / update `configJson` (super-admin)

**Audit events**: `adapter.registered`, `adapter.updated`, `adapter.dispatched`, `adapter.dispatch_failed`.

---

### 2.3 Portfolio service — `lib/capinfra/portfolio.ts`

**Owns**: `cap_positions`, `cap_ledger_entries`, `cap_accounts`, `cap_drawdowns`, `cap_snapshots`, `cap_snapshot_lines`, `cap_drift_series`, `cap_price_marks`
**Reuses**: `marketData.getLatestPrice()` for valuation, `audit.recordEvent()` for events

**Core invariant**: portfolio state is **derived, never authored directly**. Only `applySettlement(instruction, tx)` may mutate `cap_positions` and `cap_ledger_entries`. There are no `setPosition` / `bumpQuantity` write paths exposed.

| Function | Behavior |
|---|---|
| `applySettlement(instruction, tx)` | Called inside `executeInstruction` transaction. Writes paired ledger entries to `cap_ledger_entries` (debit/credit, same `tx_group_id`); upserts `cap_positions` row (user × asset × wallet) with new `quantity`, `averageCost`, `currentValueUsd`. Emits `portfolio.position_updated` + `portfolio.ledger_posted`. |
| `getPosition(userId, assetId, walletId?)` | Read canonical position. |
| `listPositions(userId, filter)` | User's portfolio with computed valuations from `marketData.getLatestPrice()`. |
| `valuePosition(positionId, asOf?)` | Re-marks via `marketData.getLatestPrice()`; writes optional `cap_price_marks` row; never mutates the position. |
| `buildSnapshot(asOf, actor)` | Aggregate all positions × latest prices → write `cap_snapshots` + N `cap_snapshot_lines`. Computes `regimeBand`, `policyState`, `confidence`, `warnings`, `checksum`. Emits `portfolio.snapshot_built`. |
| `recordDrift(snapshotId, expected, actual)` | Writes `cap_drift_series` row; flags drawdowns when `variance_pct` crosses thresholds → `cap_drawdowns` row + `portfolio.drawdown_opened`. |
| `listDrawdowns(filter)` | Operator view. |

**Endpoints** under `pages/api/capinfra/portfolio/`:
- `GET /portfolio/positions` — current user's positions (or operator with `?userId=`)
- `GET /portfolio/positions/:id`
- `GET /portfolio/ledger?txGroupId=` — read ledger entries (operator)
- `POST /portfolio/snapshots` — operator-triggered snapshot build
- `GET /portfolio/snapshots/:id` — snapshot + lines
- `GET /portfolio/drawdowns?status=ACTIVE` — operator

**Audit events**: `portfolio.position_updated`, `portfolio.ledger_posted`, `portfolio.snapshot_built`, `portfolio.drift_recorded`, `portfolio.drawdown_opened`, `portfolio.drawdown_recovered`.

---

### 2.4 Notification service — `lib/capinfra/notifications.ts` + new table

**Schema add (additive, non-destructive)** — `shared/capInfraSchema.ts`:

```ts
cap_notifications (
  id                varchar PK ('ntf_' prefix),
  user_id           varchar nullable,           -- null = operator broadcast
  channel           varchar ('IN_APP' | 'EMAIL' | 'WEBHOOK'),
  topic             varchar,                    -- e.g. 'settlement.settled'
  severity          cap_severity_level,
  subject           varchar,
  body_json         jsonb,
  correlation_id    varchar,
  related_event_id  varchar,                    -- references cap_audit_events.id
  read_at           timestamp,
  delivered_at      timestamp,
  created_at        timestamp default now()
);
indexes:
  cap_notifications_user_unread_idx (user_id, read_at)
  cap_notifications_topic_created_idx (topic, created_at)
  cap_notifications_correlation_idx (correlation_id)
```

**Service**:

| Function | Behavior |
|---|---|
| `notify(input)` | Persist row; if `EMAIL` route via Resend integration; if `WEBHOOK` enqueue (Phase 3 — Phase 2 just persists). `IN_APP` is just a DB write. |
| `subscribe(eventType, handler)` | In-process subscription registered at boot in `lib/capinfra/notifications/subscriptions.ts`. |
| `markRead(notificationId, userId)` | User-facing. |
| `listForUser(userId, page)` | Current user's notifications. |
| `listForOperator(filter, page)` | Operator stream with topic/since filters. |

**Subscriptions wired in Phase 2** (event → notification mapping):

| Trigger event | Recipient | Channel | Severity |
|---|---|---|---|
| `settlement.settled` | end user | `IN_APP` | INFO |
| `settlement.failed` | end user + operator | `IN_APP` + `EMAIL` | HIGH |
| `policy.denied` | operator | `IN_APP` | WARNING |
| `portfolio.drawdown_opened` | operator | `EMAIL` | gated `severity ≥ ELEVATED` |
| `adapter.dispatch_failed` | operator | `EMAIL` | HIGH |

**Endpoints** under `pages/api/capinfra/notifications/`:
- `GET /notifications` — current user's
- `POST /notifications/:id/read` — current user
- `GET /notifications/operator?topic=&since=` — operator stream

---

## 3. New types/enums

No new enums needed. Phase 1 already provides:
- `cap_settlement_status` (PENDING/AUTHORIZED/EXECUTING/SETTLED/FAILED/CANCELLED)
- `cap_action_type` (MINT/REDEEM/TRANSFER/BUY/SELL/STAKE/UNSTAKE/CUSTODY_MOVE)
- `cap_route_type` (DIRECT/INTERMEDIATED/ATOMIC_SWAP/CCTP)
- `cap_settlement_type` (INTERNAL/EVM/STELLAR/ACH/WIRE/SWIFT)
- `cap_drawdown_status` (ACTIVE/RECOVERED)
- `cap_severity_level` (INFO/LOW/MEDIUM/HIGH/CRITICAL)

Notification `channel` and `topic` stay as `varchar` for Phase 2 flexibility; promoted to enum in Phase 3 once the topic taxonomy stabilizes.

---

## 4. File deliverables (additive only; nothing replaced)

```
lib/capinfra/
  settlement.ts                       NEW
  portfolio.ts                        NEW
  notifications.ts                    NEW
  notifications/subscriptions.ts      NEW
  adapters/
    registry.ts                       NEW
    types.ts                          NEW
    internal.ts                       NEW (LIVE)
    evm.ts                            NEW (stub)
    stellar.ts                        NEW (stub)
    ach.ts                            NEW (stub)

pages/api/capinfra/
  settlement/instructions/index.ts            NEW
  settlement/instructions/[id]/index.ts       NEW
  settlement/instructions/[id]/authorize.ts   NEW
  settlement/instructions/[id]/execute.ts     NEW
  settlement/instructions/[id]/cancel.ts      NEW
  adapters/index.ts                           NEW
  adapters/[id].ts                            NEW
  portfolio/positions/index.ts                NEW
  portfolio/positions/[id].ts                 NEW
  portfolio/ledger.ts                         NEW
  portfolio/snapshots/index.ts                NEW
  portfolio/snapshots/[id].ts                 NEW
  portfolio/drawdowns.ts                      NEW
  notifications/index.ts                      NEW
  notifications/[id]/read.ts                  NEW
  notifications/operator.ts                   NEW

shared/capInfraSchema.ts              ADDITIVE: capNotifications table only
scripts/capinfra-seed.ts              ADDITIVE: seed INTERNAL adapter row
documents/cap-infra/README.md         APPEND: Phase 2 contract reference
lib/capinfra/README.md                APPEND: Phase 2 service notes
scripts/capinfra-smoke.ts             APPEND: 6 new Phase 2 checks
```

**No Phase 1 file is rewritten.** Only `shared/capInfraSchema.ts` and `scripts/capinfra-seed.ts` get additive entries; everything else is new.

---

## 5. Acceptance criteria (Done definition for Phase 2)

1. `POST /api/capinfra/settlement/instructions` with the same `Idempotency-Key` returns the same instruction ID twice; second call emits `settlement.idempotent_replay`.
2. Settlement instruction with `allowed=false` from `evaluatePolicy()` → `400 ValidationError` with `reasonCode`; no row written; `settlement.denied` audit event present.
3. `POST /instructions/:id/execute` against the INTERNAL adapter atomically: status → SETTLED, paired ledger rows in `cap_ledger_entries`, `cap_positions` upserted, four audit events emitted (`settlement.executing`, `adapter.dispatched`, `portfolio.position_updated`, `settlement.settled`).
4. `POST /portfolio/snapshots` writes `cap_snapshots` + N `cap_snapshot_lines` with deterministic `checksum`; re-running with same `asOf` produces identical checksum.
5. `cap_positions` and `cap_ledger_entries` are unwritable from any path other than `applySettlement()` (verified by code-review grep).
6. Notification fires on `settlement.settled` and is retrievable via `GET /notifications`.
7. `lib/capinfra/settlement.ts` contains zero imports from individual adapter files (only `adapters/registry`).
8. Smoke harness extended to 14 checks; all pass.
9. No regressions in the existing 8 Phase 1 smoke checks.
10. `documents/cap-infra/README.md` Phase 2 section published.

---

## 6. Explicitly out of scope (Phase 3+)

- Real EVM/Stellar/ACH adapter wiring (only stubs ship; partner SDKs not imported)
- Webhook delivery for notifications (table + IN_APP only)
- Reconciliation jobs (`adapter.reconcile()` interface defined but no scheduled runner)
- Per-role permission matrix beyond admin/auditor (Task #117)
- Operator console UI (Task #118)
- Automated test suite (Task #119)
- Risk policy enforcement layer (`cap_risk_*` tables remain dormant)
- External email templates beyond plain-text Resend send

---

## 7. Change footprint

- ~13 new service files
- ~14 new endpoint files
- 1 additive schema row (`cap_notifications`)
- 1 additive seed row (INTERNAL adapter)
- 6 new smoke checks
- Zero rewrites of Phase 1 code

---

## 8. Pre-implementation checklist (gates before any code)

- [ ] User approves this plan
- [ ] Confirm `cap_notifications` table can be added via `npm run db:push --force` without disturbing Phase 1 tables
- [ ] Confirm Resend integration (`resend==1.0.0`, already installed) is the chosen email transport
- [ ] Confirm `Idempotency-Key` header is the agreed contract (vs body field)
- [ ] Confirm operator role currently maps to `SUPER_ADMIN` / `COMPLIANCE_ADMIN` for Phase 2 endpoints (no new role enum yet)

**On approval**: implementation proceeds in this order — adapters/registry → settlement → portfolio → notifications → endpoints → smoke → docs append.
