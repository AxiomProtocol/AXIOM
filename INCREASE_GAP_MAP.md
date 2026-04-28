# Increase Banking Layer — Gap Remediation Map

> ## ⚠ DEPRECATED 2026-04-28
> The Increase account was cancelled. Every Increase API call now short-circuits via `IncreaseDisabledError` (HTTP 503), gated by the `INCREASE_DISABLED=true` env var. The user-facing UI for banking, DAO payroll, rent collection, and the Stripe→Increase card rail has been removed from navigation. Code and database tables are preserved.
>
> **The gaps below are no longer being remediated.** This document is retained for historical context — if Increase is ever re-enabled, or if a new banking provider is selected, the gap analysis is still useful as a checklist of operational concerns to address.
>
> The provider-agnostic seam for the next banking integration lives at `lib/banking/` (`types.ts`, `registry.ts`, `README.md`).
>
> See `replit.md` → "Banking Infrastructure" for current status.

---

**Generated:** 2026-04-01  
**Source:** Axiom Increase Banking Audit (see `AUDIT_REPORT.md`)  
**Audit snapshot:** commit `27406198` — all gap descriptions reflect the codebase at that point  
**Purpose:** Ordered implementation plan for closing all identified gaps

---

## How to Read This Document

Each gap is assigned a priority tier:
- **P1 — Financial Risk:** Direct exposure to lost, duplicated, or unreconciled money. Fix before next live transaction.
- **P2 — Operational Risk:** Manual process required to compensate for missing automation. Fix before scale.
- **P3 — Compliance / Security:** Architectural fragility that creates audit or incident risk.
- **P4 — Developer Experience:** Code quality, documentation, or maintainability issues.

---

## Priority 1 — Financial Risk (Fix Before Next Live Transaction)

---

### GAP-001: No Increase Webhook Handler

**Priority:** P1 — CRITICAL  
**Audit ref:** AUDIT_REPORT.md § Missing #15

#### Problem
There is no `pages/api/webhooks/increase.ts` in the codebase. Increase sends push events to a configured URL when:
- An inbound ACH or wire transaction settles into an account number
- An outbound ACH is returned (NSF, closed account, etc.)
- A card authorization is requested (real-time)
- A transfer status changes (pending → submitted → settled)

Without a webhook receiver, **none of these events are processed**. All deposit confirmation is manual. The `increaseTransactionId` fields in `increase_lp_deposits` and `increase_product_escrows` are never populated.

#### Evidence
```
pages/api/webhooks/          — only unit.ts and bitgo.ts exist
shared/increaseParticipantSchema.ts:57   — increaseTransactionId: varchar never written
shared/increaseParticipantSchema.ts:102  — increaseTransactionId in escrows: never written
increase_lp_deposits.status  — always 'pending'; never transitions automatically
increase_product_escrows.depositedAmountCents — always 0; never incremented automatically
```

#### Proposed Fix

Create `pages/api/webhooks/increase.ts` with:

1. **HMAC-SHA256 signature validation** using `INCREASE-Webhook-Signature` header and `INCREASE_WEBHOOK_SECRET`. Reject any request without a valid signature with HTTP 401.

2. **Event handlers:**

   | Event type | Action |
   |-----------|--------|
   | `transaction.created` | Look up `increase_participants` by `virtualAccountNumber`; match to `increase_lp_deposits` or `increase_product_escrows` by memo/ref; update `status`, `depositedAmountCents`, `increaseTransactionId`, `receivedAt` |
   | `ach_transfer.returned` | Find `increase_distributions` by `increaseTransferId`; update `status = 'returned'`; log alert |
   | `ach_transfer.settled` | Find `increase_distributions` by `increaseTransferId`; update `status = 'settled'` |
   | `inbound_ach_transfer.created` | Log received; cross-reference to virtual account; update deposit intent record |
   | `wire_transfer.misdirected` | Log + alert (no DB match expected) |
   | `card_authorization.created` | Log (future: spend-control enforcement) |
   | `*` (unknown) | Log event type and ID; return 200 (do not error) |

3. **Return 200 always** after initial signature check — prevents Increase retry storms on transient DB errors. Log errors internally.

4. **Environment variable required:** `INCREASE_WEBHOOK_SECRET` — set this in Increase dashboard → Settings → Webhooks, then copy the signing secret.

#### Affected Files
- **Create:** `pages/api/webhooks/increase.ts`
- **Schema reads:** `shared/increaseParticipantSchema.ts` (all 4 tables)
- **New env var:** `INCREASE_WEBHOOK_SECRET`

---

### GAP-002: No Idempotency Keys on ACH / Wire Transfer POSTs

**Priority:** P1 — HIGH  
**Audit ref:** AUDIT_REPORT.md § Partial #13

#### Problem
The Increase API supports an `Idempotency-Key: <uuid>` HTTP header. If the same key is sent twice, Increase returns the **original response** instead of creating a duplicate transfer. Without this header, a network timeout + retry creates duplicate transactions — debiting the Axiom Nexus Account twice and sending a recipient double the intended amount.

Three call sites are affected:

```
lib/services/IncreaseService.ts:191-201  initiateAchTransfer() — no Idempotency-Key
lib/services/IncreaseService.ts:203-217  initiateWireTransfer() — no Idempotency-Key
```

Callers:
```
pages/api/banking/transfer.ts:48-55        — admin ACH
pages/api/banking/transfer.ts:57-66        — admin wire
pages/api/banking/lending-fund/distribute.ts:100-107  — batch LP distributions
pages/api/banking/wealth-practice/insurance/release.ts:119-126  — hold release ACH return
```

#### Proposed Fix

**Step 1:** Add optional `idempotencyKey?: string` to both service methods:

```typescript
// In IncreaseService.ts
async initiateAchTransfer(params: { ... }, idempotencyKey?: string): Promise<IncreaseTransfer> {
  return increaseRequest<IncreaseTransfer>('POST', '/ach_transfers', params, idempotencyKey);
}
```

**Step 2:** Thread the key into `increaseRequest()`:

```typescript
async function increaseRequest<T>(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${process.env.INCREASE_API_KEY ?? ''}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  ...
}
```

**Step 3:** At each call site, generate a deterministic key using `crypto.createHash('sha256')` over the invariant fields:

```typescript
import crypto from 'crypto';

// Example: distribute.ts
const idempotencyKey = crypto
  .createHash('sha256')
  .update(`${accountId}:${externalRoutingNumber}:${externalAccountNumber}:${amountCents}:${new Date().toISOString().slice(0, 10)}`)
  .digest('hex');
```

No new dependencies — Node.js `crypto` is built-in.

#### Affected Files
- `lib/services/IncreaseService.ts` — add idempotencyKey param to `initiateAchTransfer`, `initiateWireTransfer`, and `increaseRequest`
- `pages/api/banking/transfer.ts` — generate + pass idempotency key
- `pages/api/banking/lending-fund/distribute.ts` — generate + pass per-item
- `pages/api/banking/wealth-practice/insurance/release.ts` — generate + pass

---

### GAP-003: `INCREASE_API_KEY` Module-Level Constant

**Priority:** P1 — LOW (serverless) / MEDIUM (long-running server)  
**Audit ref:** AUDIT_REPORT.md § ARCH-3

#### Problem
```typescript
// lib/services/IncreaseService.ts:16
const API_KEY = process.env.INCREASE_API_KEY ?? '';
```
This is evaluated once when the module is first imported. In long-running Node.js servers, a key rotation requires a process restart. In serverless (Vercel), each cold start loads a fresh module — so the practical risk is low. However, all other environment-switching helpers in the same file (`isLive`, `getAccountId`, etc.) correctly read `process.env` per-call for consistency.

#### Proposed Fix

Replace the module-level constant with an inline read inside `increaseRequest()`:

```typescript
// Remove: const API_KEY = process.env.INCREASE_API_KEY ?? '';

// Inside increaseRequest():
headers: {
  Authorization: `Bearer ${process.env.INCREASE_API_KEY ?? ''}`,
  ...
}
```

No API changes — purely internal to `IncreaseService.ts`.

#### Affected Files
- `lib/services/IncreaseService.ts:16` — remove constant, inline into request headers

---

## Priority 2 — Operational Risk (Fix Before Scale)

---

### GAP-004: Insurance Hold `depositedAmountCents` Never Auto-Updated

**Priority:** P2 — HIGH  
**Audit ref:** AUDIT_REPORT.md § Partial #10

#### Problem
`increase_product_escrows.depositedAmountCents` is initialized to 0 at hold creation and is never automatically updated. The expected flow is:

1. Participant creates hold → status `pending`, `depositedAmountCents = 0`
2. Participant sends ACH/wire to their virtual account number
3. Increase fires `transaction.created` webhook → code matches transaction to hold by virtual account number and memo → updates `depositedAmountCents`, `increaseTransactionId`, and possibly transitions status to `partial` or `funded`
4. Admin sees `funded` status → approves participant for group membership

Step 3 is impossible without GAP-001 (webhook handler). Once GAP-001 is implemented, this gap closes automatically if the webhook handler matches deposits to escrows.

**Dependency:** Resolves after GAP-001.

#### Affected Files
- `pages/api/webhooks/increase.ts` (new) — match `transaction.created` to escrow records

---

### GAP-005: `increase_distributions` Status Never Updated Post-Send

**Priority:** P2 — MEDIUM  
**Audit ref:** AUDIT_REPORT.md § Partial #12

#### Problem
Every distribution record is created with `status: 'pending'` when the outbound ACH is initiated. The status is never updated to `settled`, `returned`, or `failed` because there is no webhook handler. If a distribution ACH is returned (NSF, invalid account), the admin has no automatic visibility — they must manually check the Increase dashboard.

**Dependency:** Resolves after GAP-001 (`ach_transfer.returned` and `ach_transfer.settled` handlers update `increase_distributions` status).

#### Affected Files
- `pages/api/webhooks/increase.ts` (new) — handle `ach_transfer.*` events

---

### GAP-006: LP Deposit Amounts Are Self-Reported and Unverified

**Priority:** P2 — HIGH  
**Audit ref:** AUDIT_REPORT.md § Partial #9, ARCH-1

#### Problem
`POST /api/banking/lp-deposit` allows a SIWE-authenticated participant to declare any `amountCents` they intend to deposit. This creates an `increase_lp_deposits` record with `status: 'pending'` — but the amount is never verified against an actual inbound Increase transaction.

The `increaseTransactionId` column exists in the schema but is never populated.

**Dependency:** Resolves after GAP-001 (webhook matches inbound transaction to `memoRef`, populates `increaseTransactionId`, updates `status` and `amountCents` from the real transaction).

**Interim mitigation:** Admin confirmation flow (already requires admin to verify before marking `received`) is the current safeguard. It is adequate for low-volume ops but will not scale.

#### Affected Files
- `pages/api/webhooks/increase.ts` (new) — match `transaction.created` to `increase_lp_deposits` by `memoRef`

---

## Priority 3 — Compliance / Security

---

### GAP-007: Dead Unit Finance Webhook Still Active

**Priority:** P3 — MEDIUM  
**Audit ref:** AUDIT_REPORT.md § ARCH-4

#### Problem
`pages/api/webhooks/unit.ts` is a fully functional webhook handler for the previous banking provider (Unit Finance). It imports `getAccountByUnitId`, `updateAccountBalance`, and `updateCustomerKycStatus` from `lib/server/integrations/bankingStore`. Since Axiom has migrated to Increase, this code is dead but still registered at a route that any actor could call.

If the `UNIT_WEBHOOK_TOKEN` env var is unset, the header check is skipped entirely (lines 23-29), making the endpoint open to unauthenticated POST requests that modify balance records.

#### Proposed Fix
1. Add a hard check: if `UNIT_WEBHOOK_TOKEN` is not set, reject all requests with 503.
2. Or: deprecate the route entirely — add a 410 Gone response with a comment explaining the migration.
3. Remove from production routing once confirmed no Unit Finance events are expected.

#### Affected Files
- `pages/api/webhooks/unit.ts`

---

### GAP-008: `parseCookies` / `getSiweWallet` Duplicated in 8+ Files

**Priority:** P3 — MEDIUM  
**Audit ref:** AUDIT_REPORT.md § ARCH-5

#### Problem
The same 24-line SIWE session resolution pattern is copy-pasted identically in at least 8 route files:

```
pages/api/banking/participant/onboard.ts:10-33
pages/api/banking/participant/[walletAddress].ts:12-36
pages/api/banking/lp-deposit.ts:9-33
pages/api/banking/wealth-practice/insurance/status.ts:9-33
pages/api/banking/insurance/create-hold.ts:12-36
(and ~3 more)
```

A bug or security fix applied to one copy is silently missed in the others. The dev-mode shortcut (`if (process.env.NODE_ENV === 'development') return '__dev__'`) is a security boundary that must be consistently applied.

#### Proposed Fix

Create `lib/server/banking/siweHelper.ts`:

```typescript
import type { NextApiRequest } from 'next';
import { pool } from '../../../server/db';

export function parseCookies(header: string | undefined): Record<string, string> { ... }

export async function getSiweWallet(req: NextApiRequest): Promise<string | null> { ... }
```

Replace all 8+ inline copies with `import { parseCookies, getSiweWallet } from '../../../lib/server/banking/siweHelper'`.

#### Affected Files
- **Create:** `lib/server/banking/siweHelper.ts`
- **Update:** all 8+ route files listed above

---

### GAP-009: Hardcoded Routing Number Fallback

**Priority:** P3 — LOW  
**Audit ref:** AUDIT_REPORT.md § ARCH-6

#### Problem
Two files contain the hardcoded fallback routing number for First Internet Bank (`071006486`):
- `pages/api/banking/wealth-practice/insurance/status.ts:163`
- `pages/api/banking/participant/[walletAddress].ts:122`

This number is correct today but would silently break if First Internet Bank or Increase changes the assigned routing number.

#### Proposed Fix

Introduce `INCREASE_SHARED_ROUTING_NUMBER=071006486` as a documented env var, or derive the number dynamically from `IncreaseService.listAccountNumbers(getAccountId())` and cache it.

#### Affected Files
- `pages/api/banking/wealth-practice/insurance/status.ts:163`
- `pages/api/banking/participant/[walletAddress].ts:122`

---

### GAP-010: No Foreign Key Constraints in Increase Schema

**Priority:** P3 — LOW  
**Audit ref:** AUDIT_REPORT.md § ARCH-7

#### Problem
All three child tables (`increase_lp_deposits`, `increase_distributions`, `increase_product_escrows`) have `participantId: integer('participant_id').notNull()` with no Drizzle `.references(() => increaseParticipants.id)` FK declaration. Orphaned rows are possible if participant records are deleted.

#### Proposed Fix

Add to each child table definition:
```typescript
participantId: integer('participant_id').notNull().references(() => increaseParticipants.id),
```

Run `npm run db:push` to apply. (Safe to add FK constraint via `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY` as long as no orphaned rows exist — verify first.)

#### Affected Files
- `shared/increaseParticipantSchema.ts`

---

## Priority 4 — Developer Experience

---

### GAP-011: `INCREASE_*` Variables Missing from `.env.example`

**Priority:** P4 — HIGH  
**Audit ref:** AUDIT_REPORT.md § executive summary

#### Problem
`.env.example` contains zero Increase-related environment variables. A new developer has no documentation for what Increase variables are required, which are sandbox vs production, or what the expected values look like. The integration uses at least 10 distinct env vars.

#### Proposed Fix

Add a clearly demarcated `INCREASE BANKING` section to `.env.example` (see below in this document for exact variables required).

#### Affected Files
- `.env.example`

---

### GAP-012: No Tests for the Increase Integration

**Priority:** P4 — MEDIUM

#### Problem
Zero test files exist for the Increase banking layer. Critical paths — onboarding, ACH dispatch, idempotency, webhook signature validation — are entirely untested.

#### Proposed Fix (Minimal)

Add unit tests (Jest/Vitest) for:
1. `IncreaseService` request formatting (mock `fetch`, verify headers, body shape)
2. Webhook signature validation (valid and invalid HMAC)
3. Webhook event routing (mock DB, verify status transitions)
4. Idempotency key generation (verify deterministic output for same inputs)

---

## Implementation Order

Execute gaps in this sequence to minimize risk and maximize unblocking velocity:

```
Phase 1 (P1 — Before next live transaction)
  GAP-003  API key per-call          30 min   — 5-line change in IncreaseService.ts
  GAP-002  Idempotency keys          2 hr     — service + 3 call sites
  GAP-001  Increase webhook handler  4 hr     — new file, HMAC validation, event routing

Phase 2 (P2 — Before scale / first external LP deposit)
  GAP-004  Hold depositedAmountCents  (resolves via GAP-001)
  GAP-005  Distribution status sync   (resolves via GAP-001)
  GAP-006  LP deposit verification    (resolves via GAP-001)

Phase 3 (P3 — Hardening sprint)
  GAP-008  Shared SIWE helper         2 hr
  GAP-007  Retire Unit webhook        30 min
  GAP-010  Schema FK constraints      1 hr
  GAP-009  Routing number env var     15 min

Phase 4 (P4 — Developer experience)
  GAP-011  .env.example Increase section  30 min  (done in this task)
  GAP-012  Unit tests                     4 hr
```

---

## Environment Variables Required by the Increase Integration

All variables below should be set in:
- Local development: `.env.local` (git-ignored)
- Staging/production: Vercel dashboard → Project Settings → Environment Variables
- Replit: Secrets panel

| Variable | Required | Description |
|----------|----------|-------------|
| `INCREASE_API_KEY` | Yes | API key from Increase dashboard → Settings → API Keys. Server-only (never expose to client). |
| `INCREASE_ENVIRONMENT` | Yes | `production` for live money; `sandbox` for testing. Controls which account IDs and base URL are used. |
| `INCREASE_BASE_URL` | No | Override for production base URL. Defaults to `https://api.increase.com`. |
| `INCREASE_ACCOUNT_ID` | Production | Axiom Nexus Account ID (format: `account_*`). Used for all treasury operations in live env. |
| `INCREASE_SANDBOX_ACCOUNT_ID` | Sandbox | Sandbox Axiom Nexus Account ID (format: `sandbox_account_*`). |
| `INCREASE_ENTITY_ID` | Production | Axiom Protocol LLC entity ID (format: `entity_*`). Used for org-level operations. |
| `INCREASE_SANDBOX_ENTITY_ID` | Sandbox | Sandbox entity ID. |
| `INCREASE_PROGRAM_ID` | Production | Program ID for per-participant account provisioning (format: `program_*`). Required for onboarding. |
| `INCREASE_SANDBOX_PROGRAM_ID` | Sandbox | Sandbox program ID. Required for sandbox onboarding. |
| `INCREASE_WEBHOOK_SECRET` | Yes | Webhook signing secret from Increase dashboard → Settings → Webhooks. Required for webhook signature validation (GAP-001). |
| `ADMIN_SOLVENCY_KEY` | Yes | Internal admin gate for all admin-only banking routes. Must match `x-admin-key` header. |
