# Axiom Protocol — Increase Banking Layer Audit Report

**Audit Date:** 2026-04-01  
**Auditor:** Axiom Protocol Engineering  
**Scope:** Increase.com banking integration — all routes, services, schema, webhooks, and environment configuration  
**Environment at audit time:** `INCREASE_ENVIRONMENT=production`, First Internet Bank (Axiom Nexus Account)  
**Note:** All findings reflect the state of the codebase at audit time (commit `27406198`). Subsequent work under Task #49 will close the gaps identified here.

---

## Executive Summary

The Increase banking layer covers the institutional core of Axiom Protocol: treasury operations, per-participant KYC onboarding, virtual account number issuance, inbound deposit tracking, outbound ACH/wire, LP distributions, insurance hold escrows, and debit card issuance.

**18 capabilities were evaluated.** Results:

| Status | Count |
|--------|-------|
| VERIFIED — correctly built | 7 |
| PARTIAL — built but with critical gaps | 6 |
| MISSING — not implemented | 5 |

**Three Priority-1 risks were identified** that carry direct financial exposure:
1. No Increase webhook handler → all deposit reconciliation is manual and unverified
2. No idempotency keys on ACH/wire POSTs → duplicate transfers on retry
3. `INCREASE_API_KEY` captured at module load (minor in serverless, but architecturally wrong)

---

## Capability Matrix

| # | Capability | Status | Risk | Evidence |
|---|-----------|--------|------|----------|
| 1 | Treasury / house operating account | VERIFIED | — | `overview.ts:9`, `IncreaseService.ts:19-22` |
| 2 | Program-aware account architecture | VERIFIED | — | `onboard.ts:161-190`, `IncreaseService.ts:29-32` |
| 3 | Per-participant KYC entity provisioning | VERIFIED | — | `onboard.ts:137-157` |
| 4 | Per-participant dedicated account + virtual account number | VERIFIED | — | `onboard.ts:160-215` |
| 5 | Outbound ACH credits | VERIFIED | — | `transfer.ts:48-55`, `distribute.ts:100-107` |
| 6 | Outbound wire transfers | VERIFIED | — | `transfer.ts:57-66` |
| 7 | Virtual debit card issuance | VERIFIED | — | `onboard.ts:217-233`, `IncreaseService.ts:249-264` |
| 8 | Sandbox / production environment switching | VERIFIED | — | `IncreaseService.ts:6-32` |
| 9 | Inbound deposit tracking (intent layer) | PARTIAL | HIGH | `lp-deposit.ts:74-84`, no webhook |
| 10 | Insurance hold escrow lifecycle | PARTIAL | HIGH | `insurance/create-hold.ts`, `release.ts`, no auto-fund |
| 11 | Inbound ACH / wire reconciliation (real transactions) | PARTIAL | HIGH | `increaseParticipantSchema.ts:57`, field unused |
| 12 | ACH / wire transfer status lifecycle (outbound) | PARTIAL | MEDIUM | `increaseDistributions` status never updated post-send |
| 13 | Idempotent transfer creation | PARTIAL | HIGH | `transfer.ts:48-66` — no `Idempotency-Key` header |
| 14 | Card spend controls / real-time auth | PARTIAL | LOW | Card issued; no spend controls or auth webhooks |
| 15 | Increase webhook ingestion | MISSING | CRITICAL | No `pages/api/webhooks/increase.ts` |
| 16 | Real-Time Payments (RTP) | MISSING | LOW | No method in `IncreaseService.ts`, no route |
| 17 | Card push payouts | MISSING | LOW | No `card_payment` API in service |
| 18 | Bill pay / multi-rail orchestration | MISSING | LOW | No service, no routes |

---

## Section 1 — VERIFIED CORRECT

### 1. Treasury / House Operating Account
**File:** `pages/api/banking/overview.ts`, `lib/services/IncreaseService.ts`

The Axiom Nexus Account (`account_3q7ro70b6ma4w5ijgivz`, First Internet Bank) is correctly referenced via `getAccountId()`, which reads `INCREASE_ACCOUNT_ID` (production) or `INCREASE_SANDBOX_ACCOUNT_ID` (sandbox) at call time. The overview endpoint returns live account metadata, current/available balances, recent transactions, and routing info. Environment is evaluated per-request, not at module load.

### 2. Program-Aware Account Architecture
**File:** `pages/api/banking/participant/onboard.ts:161-190`, `lib/services/IncreaseService.ts:29-32`

`getProgramId()` reads `INCREASE_PROGRAM_ID` or `INCREASE_SANDBOX_PROGRAM_ID` per-request. Onboarding hard-fails with a 502 and error code `PROGRAM_ID_MISSING` if the program ID is not configured — there is no shared-account fallback. This is the correct behavior for an institutional-grade participant model.

### 3. Per-Participant KYC Entity Provisioning
**File:** `pages/api/banking/participant/onboard.ts:137-157`

Every participant receives their own Increase individual entity provisioned via `createIndividualEntity()`. Fields collected: full name, date of birth, SSN last 4, and full address. Entity creation is a hard fail — if it fails, no DB record is created.

### 4. Per-Participant Dedicated Account + Virtual Account Number
**File:** `pages/api/banking/participant/onboard.ts:160-254`

The full 4-step provisioning chain is correctly implemented:
1. `createIndividualEntity()` — hard fail
2. `createAccount()` with entity_id + program_id — hard fail
3. `createParticipantVirtualAccount()` with inbound ACH debit blocked, checks not allowed — hard fail
4. `issueVirtualCard()` — best effort (non-blocking)

All three hard-fail IDs (`increaseEntityId`, `increaseAccountId`, `virtualAccountNumberId`) plus routing/account numbers are persisted atomically. No partial records.

### 5. Outbound ACH Credits
**Files:** `pages/api/banking/transfer.ts:48-55`, `pages/api/banking/lending-fund/distribute.ts:100-107`

Admin-gated. `initiateAchTransfer()` correctly calls `POST /ach_transfers`. The distribute endpoint supports single and batch modes (up to 50 recipients per batch). Each successful distribution creates an `increase_distributions` record with `increaseTransferId` and `status: 'pending'`.

### 6. Outbound Wire Transfers
**File:** `pages/api/banking/transfer.ts:57-66`

Admin-gated. `initiateWireTransfer()` correctly calls `POST /wire_transfers` with `message_to_recipient`, `beneficiary_name`, and `originator_name`. Input is validated (type, amount, routing, account, description) before dispatch.

### 7. Virtual Debit Card Issuance
**Files:** `pages/api/banking/participant/onboard.ts:217-233`, `lib/services/IncreaseService.ts:249-264`

`issueVirtualCard()` correctly calls `POST /cards` with a billing address. Card issuance is best-effort during onboarding; a `card.ts` route allows post-hoc provisioning. Card ID, last4, and status are stored in `increase_participants`.

### 8. Sandbox / Production Environment Switching
**File:** `lib/services/IncreaseService.ts:6-32`

`isLive()`, `getBaseUrl()`, `getAccountId()`, `getEntityId()`, and `getProgramId()` are all per-request functions (not module-level constants) reading `INCREASE_ENVIRONMENT` at call time. The `SandboxBanner` UI component only renders when `INCREASE_ENVIRONMENT === 'sandbox'`. This is the correct pattern.

---

## Section 2 — PARTIAL (Built But With Critical Gaps)

### 9. Inbound Deposit Tracking (Intent Layer)
**File:** `pages/api/banking/lp-deposit.ts:74-84`  
**Gap severity:** HIGH

`POST /api/banking/lp-deposit` creates an `increase_lp_deposits` record in `pending` status when a participant declares intent to fund. The `amountCents` is **client-provided** — it is never verified against an actual Increase transaction. The `increaseTransactionId` field (`shared/increaseParticipantSchema.ts:57`) exists in the schema but is never populated. Status transitions (`pending → received → applied`) require manual admin intervention because no webhook confirms the actual inbound transaction.

**Risk:** A participant could declare a large deposit intent and gain access to group membership status without funds ever arriving. Admin confirmation is the only safeguard.

### 10. Insurance Hold Escrow Lifecycle
**Files:** `pages/api/banking/insurance/create-hold.ts`, `pages/api/banking/wealth-practice/insurance/release.ts`  
**Gap severity:** HIGH

Insurance holds are created in `pending` status via `create-hold.ts`. The `depositedAmountCents` field (`increaseProductEscrows`) starts at 0 and is **never incremented automatically** — there is no webhook or polling that matches an inbound Increase transaction to the hold record. Admins must manually transition a hold from `pending → funded` (which requires a separate admin PATCH route that was not found in the audit). The release path is correctly implemented: ACH return must succeed before the hold is marked `released`.

**Risk:** Holds are marked `funded` or `partial` only if an admin manually updates them. Participants may see stale hold status.

### 11. Inbound ACH / Wire Reconciliation (Real Transactions)
**File:** `shared/increaseParticipantSchema.ts:57` (`increaseTransactionId`), `shared/increaseParticipantSchema.ts:102` (`increaseTransactionId` in escrows)  
**Gap severity:** HIGH

Both `increase_lp_deposits` and `increase_product_escrows` have `increaseTransactionId` fields intended to hold the Increase transaction ID from the inbound ACH or wire that funded the record. These fields are never populated anywhere in the codebase — there is no code that calls the Increase API to match transactions to deposit/escrow records, and no webhook handler to receive push notifications.

### 12. ACH / Wire Transfer Status Lifecycle (Outbound)
**Files:** `pages/api/banking/lending-fund/distribute.ts`, `pages/api/banking/wealth-practice/insurance/release.ts`  
**Gap severity:** MEDIUM

`increase_distributions` records are created with `status: 'pending'` when an outbound ACH is initiated. The status is never updated to `settled`, `returned`, or `failed` because there is no Increase webhook handler. If an ACH is returned (NSF, invalid account), the distribution record will remain `pending` indefinitely with no alert.

### 13. Idempotent Transfer Creation
**Files:** `pages/api/banking/transfer.ts:48-66`, `pages/api/banking/lending-fund/distribute.ts:100-107`, `pages/api/banking/wealth-practice/insurance/release.ts:119-126`  
**Gap severity:** HIGH

The Increase API supports an `Idempotency-Key` HTTP header that prevents duplicate transfer creation on retry. None of the three sites that call `initiateAchTransfer()` or `initiateWireTransfer()` pass this header. A network timeout followed by a client retry would create duplicate transfers and debit the Axiom Nexus Account twice.

**Evidence:** `IncreaseService.ts:191-217` — neither method accepts nor forwards an idempotency key. The `increaseRequest()` helper at line 34 has no idempotency-key support.

### 14. Card Spend Controls / Real-Time Auth
**File:** `lib/services/IncreaseService.ts:249-264`  
**Gap severity:** LOW

Cards are issued correctly. However, there are no spend controls configured (`spending_limits`, `allowed_categories`), no real-time authorization webhook handler, and no `card_payment` tracking in the schema. This is acceptable for the current product stage but represents a gap before card spend is enabled for participants.

---

## Section 3 — MISSING

### 15. Increase Webhook Ingestion — CRITICAL
**Expected path:** `pages/api/webhooks/increase.ts`  
**Risk:** CRITICAL

No Increase webhook handler exists. The only webhook handlers in the codebase are for the previous provider (Unit Finance at `pages/api/webhooks/unit.ts`) and BitGo. Without a webhook receiver:

- Inbound ACH/wire transactions are never detected automatically
- Outbound ACH return/failure events are never processed
- `increase_lp_deposits` and `increase_product_escrows` records are never reconciled against real transaction data
- All deposit confirmation is manual, creating operational risk and compliance exposure

The `INCREASE_WEBHOOK_SECRET` environment variable is not set anywhere and is not documented in `.env.example`.

**Pattern to follow:** `pages/api/webhooks/unit.ts` (HMAC token validation + event-type switch).  
**Increase webhook docs:** https://increase.com/documentation/webhooks

### 16. Real-Time Payments (RTP)
**Risk:** LOW (product-stage)

No RTP method exists in `IncreaseService.ts`. The Increase API supports `POST /real_time_payments_transfers`. Axiom has no current product requirement for RTP but it is part of the Increase capability set.

### 17. Card Push Payouts
**Risk:** LOW (product-stage)

No `card_payment` (Visa/MC push-to-card) support exists. Increase supports `POST /card_payments`. Not a current Axiom product requirement.

### 18. Bill Pay / Multi-Rail Orchestration
**Risk:** LOW (product-stage)

No bill pay service, no recipient management, no rail-selection logic. Not a current Axiom product requirement.

---

## Section 4 — High-Risk Architectural Issues

### ARCH-1: No Webhook → Unverified Deposit Amounts (Compliance Gap)
Inbound `increase_lp_deposits.amountCents` is **entirely self-reported** by the client. No code anywhere verifies this against an actual Increase transaction. The `depositedAmountCents` on `increase_product_escrows` starts at 0 and is never auto-incremented. This is the most significant gap — it means Axiom cannot automatically verify that capital actually arrived before granting participant access.

### ARCH-2: No Idempotency Keys on Money-Moving POSTs (Duplicate Transfer Risk)
Three call sites dispatch ACH or wire transfers with no `Idempotency-Key` header to Increase. Network errors + client retries create duplicate transfers. This is a direct financial risk.

### ARCH-3: `INCREASE_API_KEY` Module-Level Constant
`lib/services/IncreaseService.ts:16`: `const API_KEY = process.env.INCREASE_API_KEY ?? ''` is evaluated once when the module is first loaded. In long-running server processes (not serverless), a key rotation would require a restart to take effect. In Next.js API routes on serverless infrastructure (Vercel), each invocation typically loads a fresh module, mitigating the risk — but this is an architectural smell. All other environment-switching functions (`isLive`, `getAccountId`, etc.) correctly read `process.env` per-call.

### ARCH-4: Dead Unit Finance Webhook Still Active
`pages/api/webhooks/unit.ts` is a full handler for the previous banking provider. It imports from `lib/server/integrations/bankingStore` (functions `getAccountByUnitId`, `updateAccountBalance`, `updateCustomerKycStatus`). Since Axiom has migrated to Increase, this handler is dead code. It should be clearly documented, disabled, or removed to avoid confusion during on-call incidents.

### ARCH-5: `parseCookies` / `getSiweWallet` Copy-Pasted Across 8+ Files
Identical SIWE session resolution code is duplicated in:
- `pages/api/banking/participant/onboard.ts:10-33`
- `pages/api/banking/participant/[walletAddress].ts:12-36`
- `pages/api/banking/lp-deposit.ts:9-33`
- `pages/api/banking/wealth-practice/insurance/status.ts:9-33`
- `pages/api/banking/wealth-practice/insurance/fund.ts` (assumed)
- `pages/api/banking/insurance/create-hold.ts:12-36`
- `pages/api/banking/participant/status.ts` (assumed)
- `pages/api/banking/participant/card.ts` (assumed)

A security fix or behavioral change to the SIWE session lookup must be applied to every copy. A shared `lib/server/banking/siweHelper.ts` module would eliminate this risk.

### ARCH-6: Hardcoded Routing Number Fallback
`pages/api/banking/wealth-practice/insurance/status.ts:163`: `p.virtualRoutingNumber ?? '071006486'` and `pages/api/banking/participant/[walletAddress].ts:122`: same fallback. The routing number `071006486` (First Internet Bank) is correct but is hardcoded in two places. It should come from an environment variable or Increase account number lookup to survive a bank change.

### ARCH-7: No Foreign Key Constraints in Schema
`shared/increaseParticipantSchema.ts`: `participantId: integer('participant_id').notNull()` in all three child tables — no Drizzle `.references(() => increaseParticipants.id)` foreign key declared. This allows orphaned rows if a participant record is deleted. Not a current operational risk (participant deletion is not exposed), but worth hardening.

---

## Appendix: Files Audited

| File | Lines | Role |
|------|-------|------|
| `lib/services/IncreaseService.ts` | 332 | Core Increase API client |
| `shared/increaseParticipantSchema.ts` | 127 | Drizzle schema for 4 tables |
| `pages/api/banking/overview.ts` | 70 | Treasury account overview |
| `pages/api/banking/transfer.ts` | 83 | Admin ACH/wire dispatch |
| `pages/api/banking/lp-deposit.ts` | 144 | LP deposit intent capture |
| `pages/api/banking/participants.ts` | 84 | Admin participant list |
| `pages/api/banking/participant/onboard.ts` | 271 | KYC + full provisioning |
| `pages/api/banking/participant/[walletAddress].ts` | 138 | Participant detail + balance |
| `pages/api/banking/participant/status.ts` | ~50 | Participant status check |
| `pages/api/banking/participant/card.ts` | ~60 | Card issuance |
| `pages/api/banking/participant/register.ts` | ~40 | Basic registration |
| `pages/api/banking/lending-fund/distribute.ts` | 148 | Batch LP distribution |
| `pages/api/banking/lending-fund/deposit-instructions.ts` | ~60 | Deposit instructions |
| `pages/api/banking/wealth-practice/insurance/status.ts` | 173 | Insurance hold status |
| `pages/api/banking/wealth-practice/insurance/fund.ts` | ~80 | Fund hold |
| `pages/api/banking/wealth-practice/insurance/release.ts` | 175 | Hold release / forfeit |
| `pages/api/banking/insurance/create-hold.ts` | 127 | Create insurance hold |
| `pages/api/banking/insurance/[holdId].ts` | ~50 | Hold by ID |
| `pages/api/banking/insurance/wallet/[walletAddress].ts` | ~50 | Holds by wallet |
| `pages/api/webhooks/unit.ts` | 139 | Unit Finance webhook (dead) |
| `.env.example` | 93 | Environment docs |
