# Axiom Internal Funding System — Architecture Brainstorm

**Status:** Pre-build brainstorm only. No production code. No deployment steps.
**Date:** May 2026
**Author:** Axiom Protocol Architecture Review

---

## 1. Problem Statement

### What Problem This Solves

Users who want to participate in Axiom Protocol features — buying AXAU, earning in AXUSD, accessing the lending fund, contributing to The Wealth Practice — currently have no frictionless on-ramp from a debit card to internal activity. Every flow requires either:

- A crypto wallet already funded on Arbitrum One (high barrier for new users)
- A Coinbase Onramp session that lands crypto directly in their wallet but bypasses any Axiom-native allocation logic
- A manual operator-triggered treasury card deposit (not a user-facing flow)

The result: users with real spending power sitting on a debit card cannot easily enter Axiom's economy. Every dollar of participation that requires on-chain setup is a dollar that doesn't enter the protocol.

### Why Internal Funding Matters for Axiom

1. **Acquisition funnel**: A card top-up is the most accessible entry point for users who are crypto-curious but not crypto-native.
2. **Allocation layer**: Axiom needs a surface where a user says "put $200 into AXAU, $100 into AXUSD, $50 into my Wealth Practice contribution" — that allocation decision needs a staging balance to operate on.
3. **Protocol revenue**: Platform fees, management fees, and treasury contributions can be deducted cleanly from an internal balance rather than requiring on-chain micro-transactions for small amounts.
4. **Operational control**: An internal ledger gives Axiom reversibility (partial refunds, holds, dispute handling) that direct-to-chain flows do not.
5. **Compliance surface**: A balance layer is where KYC, velocity limits, source-of-funds checks, and SAR-trigger logic live cleanly without polluting on-chain contracts.

---

## 2. Product Truth

### What This Feature Is

- An **internal stored-value balance** — a number in Axiom's database representing USD the user has deposited
- A **debit card top-up mechanism** using Stripe Checkout (already wired: `lib/capinfra/cardDeposits/service.ts`)
- A **user-facing allocation router** that lets the user direct that balance toward Axiom features
- A **ledger** that tracks every credit, debit, hold, reversal, and allocation decision with a full audit trail
- A **staging layer** between fiat and on-chain — the balance converts to on-chain assets only when the user directs it

### What This Feature Is Not

- Not a bank account
- Not a deposit account (no FDIC language, no account/routing numbers, no wire reception)
- Not card issuing (no Axiom debit card, no BIN, no network membership)
- Not ACH origination or reception
- Not a money transmitter license product (must stay clearly inside the "closed-loop stored value" or "platform credit" exemption)
- Not push-to-card payouts
- Not custody of external assets by default (Axiom holds USD at Stripe; users hold tokens on-chain)

### Language Axiom Should Use Publicly

| Preferred | Avoid |
|---|---|
| "Axiom balance" | "bank account", "deposit account" |
| "top up your balance" | "deposit funds", "send money to Axiom" |
| "platform credit" | "stored value account" (regulatory weight) |
| "allocate from your balance" | "transfer funds" |
| "your available balance" | "account balance", "ledger balance" |
| "card-funded" | "funded via ACH", "bank-funded" |
| "allocation hold" | "escrow" (legal weight) |
| "funds processing" | "settlement pending" (implies bank rails) |

---

## 3. User Flows

### Flow 1: Debit Card Top-Up → Internal Axiom Balance

```
User lands on /wallet/fund
  → Enters amount ($25 min, $2,500 max per session)
  → Stripe Checkout opens (card form, hosted by Stripe)
  → Stripe processes payment
  → Stripe webhook fires: checkout.session.completed
  → Axiom webhook handler:
       1. Verifies Stripe signature
       2. Idempotency check on stripe_payment_intent_id
       3. Credits user's internal balance in axiom_wallet_ledger
       4. Emits BALANCE_TOPPED_UP event
       5. Sends confirmation email (Resend)
  → User sees updated available balance in UI
  → User can allocate after 24hr hold clears
```

**Key existing asset:** `lib/capinfra/cardDeposits/service.ts` already handles Stripe Checkout
creation and webhook processing. The `cap_card_deposits` table already tracks intent types
(`AXUSD_MINT`, `TREASURY_FUND`). A new intent type `WALLET_TOPUP` slots in here.

---

### Flow 2: Internal Balance → Platform Fees

```
User triggers a fee-bearing action (e.g. AXAU purchase, lending fund entry)
  → Fee amount computed (fixed or % of transaction)
  → System checks available_balance >= fee
  → If yes: debit fee from internal balance, credit protocol fee account
  → Fee recorded in axiom_wallet_transactions (type: FEE)
  → Transaction proceeds
  → If no: user prompted to top up before proceeding
```

---

### Flow 3: Internal Balance → AXUSD-Related Flow

```
User selects "Convert to AXUSD" from balance allocation screen
  → Enters amount
  → System checks available_balance >= amount
  → HOLD placed on amount (balance becomes pending)
  → Existing AXUSD_MINT intent fires (already in lib/capinfra/cardDeposits/service.ts)
  → On-chain mint executes to user's connected wallet address
  → On mint confirmation:
       - HOLD released
       - Balance debited
       - axiom_wallet_transactions record: type=AXUSD_ALLOCATION
  → User sees AXUSD in their wallet
```

**Key existing asset:** The `AXUSD_MINT` card intent already exists end-to-end. This flow
wraps it with a pre-funded balance check instead of charging the card each time.

---

### Flow 4: Internal Balance → AXAU Purchase Flow

```
User selects "Buy AXAU" from balance allocation screen
  → Enters AXUSD amount to spend
  → System converts internal balance → AXUSD (Flow 3)
  → AXUSD in wallet triggers existing AXAU purchase request flow
       (pages/api/axau/purchase-request/index.ts — KYC-gated)
  → Operator fulfills on-chain (existing fulfill endpoint)
  → axiom_wallet_transactions records: type=AXAU_ALLOCATION
```

**Note:** AXAU fulfillment remains operator-gated in v1 (by design — it's a reserve instrument).

---

### Flow 5: Internal Balance → External Supported Asset Workflow

```
User selects external asset (PAXG, WBTC, cbETH, USDC)
  → Enters amount
  → System checks balance, places HOLD
  → Coinbase Onramp session created (lib/onramp/sessionService.ts)
       with pre-filled asset, amount, and wallet address
  → User completes Onramp in popup
  → Onramp delivers asset directly to user's wallet (Coinbase-custodied leg)
  → Axiom records intent; balance debited on Onramp completion webhook
  → axiom_wallet_transactions: type=EXTERNAL_ASSET_ALLOCATION, asset=PAXG etc.
```

**Important:** Axiom does NOT custody the external assets — they go directly to the user's
wallet via Coinbase Onramp. Axiom's balance is debited when the Onramp session is confirmed.

---

### Flow 6: Failed Payment Flow

```
Stripe payment fails (card declined, 3DS fail, insufficient funds)
  → Stripe fires payment_intent.payment_failed
  → Axiom webhook: no balance credit issued (idempotency guard)
  → User sees: "Your card was declined. No funds were moved."
  → User can retry with different card
  → No hold, no ledger entry created
```

---

### Flow 7: Refund / Reversal / Dispute Flow

```
User requests refund (within 14-day window):
  → System checks: balance >= original top-up amount
  → If yes and no allocations made: Stripe refund API called,
       balance debited, refund_issued record created
  → If partial allocations made: refundable = balance remaining
       (allocated portions non-refundable — disclosed at top-up)
  → If Stripe chargeback filed by user:
       → Stripe notifies via dispute webhook
       → Axiom freezes balance immediately
       → If on-chain allocations already made: non-recoverable (disclosed)
       → Chargeback loss absorbed (must be priced into spread)
       → Internal fraud flag on user record
```

---

### Flow 8: Wallet Balance History Flow

```
User opens /wallet/history
  → Fetches axiom_wallet_transactions WHERE user_id = current_user
  → Paginated list, newest first
  → Each row: date, type (TOP_UP / FEE / AXUSD_ALLOCATION / REFUND etc.),
       amount (signed), running balance, status, reference
  → Filterable by type and date range
  → CSV export available
```

---

## 4. Architecture Options

### Option A: Stripe-Funded Internal Wallet Ledger ✅ SELECTED

**Description:** User card payments flow into Stripe. Stripe holds the fiat. Axiom's database
maintains a shadow balance (USD cents). On allocation, Axiom executes on-chain actions
(mint, Onramp, etc.) against the shadow balance, with Stripe's funds as the float.

**Existing codebase fit:**
- `cap_card_deposits` table → extend with `WALLET_TOPUP` intent
- `lib/capinfra/cardDeposits/service.ts` → add `processWalletTopup()`
- `TreasuryLedgerService.ts` → already has double-entry patterns
- New table: `axiom_wallet_balances` (user_id, available_cents, pending_cents, lifetime totals)
- New table: `axiom_wallet_transactions` (append-only ledger)

**Integration with Founder-Ops Reserves Tab:**
The allocation policy engine already built on the Reserves tab
(`pilot_allocation_policies`, `pilot_allocation_extractions`) is the policy/guidance layer.
The Axiom wallet balance becomes the **funding source** that feeds that allocation engine.
When the founder tops up via debit card, the Reserves tab allocation panel reads
`axiom_wallet_balances.available_cents` as the amount to split — instead of (or alongside)
the weekly settlement net pay. Both funding sources use the same 9-asset allocation policy
and the same AI alternative generation.

**Pros:**
- Uses infrastructure already built and tested (Stripe webhooks, intent processing, idempotency)
- Full control over balance, holds, reversals
- Clean audit trail
- No third-party wallet custody risk
- Platform fees trivially deductible
- Direct integration path to existing Reserves tab allocation engine

**Cons:**
- Stripe holds the fiat float — Stripe account health is critical
- Stripe ToS scrutiny on "stored value" — must be clearly characterized as platform credit
- Refunds constrained by Stripe's refund window (90 days for card)
- Chargeback exposure: if user allocates on-chain then disputes card, funds unrecoverable

**Operational complexity:** Medium — one new webhook intent, two new tables, new UI flow
**Legal/compliance complexity:** Medium-Low — closed-loop platform credit, no MTL required

---

### Option B: Stripe + Coinbase Onramp Hybrid (Dual-Rail Funding)

**Description:** User chooses at top-up time: card → Stripe internal balance, OR card →
Coinbase Onramp → USDC directly on-chain. Both paths write to same `axiom_wallet_balances`.

**Pros:** Onramp already wired; reduces Axiom fiat float exposure; crypto-native users prefer on-chain USDC

**Cons:** Dual-rail UX complexity; Onramp webhook reliability; two sources of truth

**Operational complexity:** High
**Best fit for Axiom now:** v2 layer-on, not v1 foundation

---

### Option C: Internal Order-Routing Model Without Stored Balance (Stateless)

**Description:** No balance stored. User picks action → card charged in that moment → executes.
One Stripe charge per action. Already partially implemented (existing `AXUSD_MINT` intent).

**Pros:** Zero ledger complexity; no float risk; almost already built

**Cons:** No allocation layer; multiple charges for multi-asset split; no balance history;
limits future extensibility

**Best fit for Axiom now:** Only if Option A is blocked for regulatory reasons

---

### Option D: Column Bank-Backed Virtual Sub-Accounts

**Description:** Each user gets a KYC'd virtual sub-account at Column Bank. Card → ACH →
Column sub-account → allocation.

**Pros:** FDIC-insured float; ACH origination; true bank-grade audit trail

**Cons:** Column not yet integrated; per-user bank KYC friction; ACH is T+1/T+2 not instant;
operating sub-accounts on behalf of users = potential money transmission in some states

**Best fit for Axiom now:** No. Future-state for institutional/corporate users.

---

## 5. Internal Ledger Model

### Tables Required (Option A)

**`axiom_wallet_balances`** — one row per user
| Column | Type | Notes |
|---|---|---|
| user_id | UUID PRIMARY KEY | FK → users |
| available_cents | BIGINT NOT NULL DEFAULT 0 | USD cents spendable |
| pending_cents | BIGINT NOT NULL DEFAULT 0 | In-flight top-ups + active holds |
| lifetime_deposited_cents | BIGINT NOT NULL DEFAULT 0 | Fraud/velocity reference |
| lifetime_allocated_cents | BIGINT NOT NULL DEFAULT 0 | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**`axiom_wallet_transactions`** — append-only ledger
| Column | Type | Notes |
|---|---|---|
| id | UUID PRIMARY KEY | |
| user_id | UUID FK | |
| type | TEXT | TOP_UP, HOLD, HOLD_RELEASE, DEBIT, FEE, REFUND, REVERSAL, DISPUTE_FREEZE |
| amount_cents | BIGINT | Always positive — direction from `direction` column |
| direction | TEXT | CREDIT or DEBIT |
| balance_after_cents | BIGINT | Immutable running balance snapshot |
| status | TEXT | PENDING, SETTLED, FAILED, REVERSED |
| reference_type | TEXT | STRIPE_CHECKOUT, AXUSD_MINT, AXAU_PURCHASE, ONRAMP_SESSION, FEE |
| reference_id | TEXT | Stripe payment intent ID, order ID etc. |
| allocation_asset | TEXT | AXAU / AXUSD / PAXG / WBTC / cbETH / USDC — null for TOP_UP/FEE |
| notes | TEXT | Internal operator notes |
| idempotency_key | TEXT UNIQUE | Prevents double-write from webhook retries |
| created_at | TIMESTAMP | |

### Ledger Mechanics

**Top-up sequence:**
1. Stripe Checkout session created → `axiom_wallet_transactions`: type=TOP_UP, status=PENDING
2. Stripe webhook confirms → status=SETTLED, `available_cents` += amount, `pending_cents` -= amount

**Hold (allocation in flight):**
1. User initiates allocation → `available_cents` -= amount, `pending_cents` += amount, type=HOLD
2. On-chain confirmation → HOLD_RELEASE + DEBIT rows; `pending_cents` -= amount
3. On failure → HOLD_RELEASE row; `available_cents` restored

**Available balance:** `available_cents` only (pending excluded from spendable)
**Pending balance:** `pending_cents` (top-ups in flight + active holds)
**Reversal:** New REVERSAL row mirroring original DEBIT — never mutate existing rows
**Audit trail:** All rows append-only; `balance_after_cents` written at insert time from a
serialized transaction (SELECT FOR UPDATE → INSERT transaction → UPDATE balance)

---

## 6. Risk and Compliance Boundaries

### Regulatory Exposure Map

| Behavior | Risk Level | Mitigation |
|---|---|---|
| Balance usable only within Axiom | Low | Explicitly closed-loop |
| Balance transferable between users | Very High | Never build this |
| Balance earns interest/yield | High | Never yield on idle balance |
| Balance redeemable for cash/bank transfer | Medium-High | Stripe refund to original card only |
| Routing/account number attached | Very High | Never — makes it a bank account |
| Per-user sub-accounts at Column | High | Defer until legal review |

### Language to Avoid

- "Deposit" (implies bank deposit)
- "Account" (implies bank account)
- "Funds held by Axiom" (implies custodian)
- "FDIC insured" (it is not)
- "Withdraw to bank" (implies bank rails)
- "Earn X% on your balance" (implies yield product)
- "Send to a friend" (implies P2P transfer — triggers MSB classification)

### Chargeback / Dispute Risk — Primary Exposure

User tops up $500 → allocates to AXAU → files card dispute → Stripe claws back $500 →
AXAU already minted → Axiom loses $500.

**Mitigations:**
1. KYC gate before any top-up (existing `kyc_verifications` gate)
2. Clear terms at checkout: "on-chain allocations are non-refundable"
3. Velocity limits: $500/day, $2,000/month per user until track record established
4. 24–48hr hold before first allocation on a new card
5. Stripe Radar rules blocking high-dispute BINs
6. 2–5% of total float held as chargeback reserve

### Fraud Risks

- Card testing: $1 top-ups to test stolen cards → block after 2 failed attempts
- Synthetic identity: fund with stolen card, allocate on-chain → KYC + 48hr hold is primary defense
- Velocity abuse: multiple accounts same device/IP → device fingerprinting at checkout

---

## 7. UX / Product Structure

### Suggested Pages

| Route | Purpose |
|---|---|
| `/wallet` | Balance overview — available, pending, recent transactions |
| `/wallet/fund` | Top-up: amount entry → Stripe Checkout → confirmation |
| `/wallet/allocate` | Allocation screen — asset + amount + confirm |
| `/wallet/history` | Full ledger — paginated, filterable, CSV export |
| `/wallet/refund/[txId]` | Self-service refund within 14-day window |

### Reserves Tab Integration (Founder-Ops)

The Reserves tab on `/founder-ops` already has:
- Allocation policy editor (driver share % + treasury share % + per-asset weights)
- Fixed-policy split display showing $ amounts per asset
- AI alternative generation via Gemini

With the wallet balance added, the Reserves tab gains a third funding source selector:

```
Funding source: [ Settlement net pay ▼ ] [ Axiom wallet balance ▼ ] [ Custom amount ]
```

When "Axiom wallet balance" is selected, the allocation panel reads `available_cents`
from `axiom_wallet_balances` instead of the settlement net pay, and shows:
- Your available balance: $X,XXX.XX
- Driver allocation ($X at 80%): per-asset breakdown
- Treasury allocation ($X at 20%): per-asset breakdown
- "Execute" buttons per asset that trigger the actual allocation flows

### Suggested API Surfaces

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/wallet/balance` | GET | Available + pending for authed user |
| `/api/wallet/topup/checkout` | POST | Create Stripe Checkout (WALLET_TOPUP intent) |
| `/api/wallet/topup/webhook` | POST | Stripe webhook — credits balance |
| `/api/wallet/allocate` | POST | Deduct balance + trigger allocation action |
| `/api/wallet/transactions` | GET | Paginated ledger rows |
| `/api/wallet/refund` | POST | Request refund |
| `/api/wallet/admin/freeze` | POST | Admin-only dispute freeze |

### Status Labels

| Internal Status | User-facing label |
|---|---|
| PENDING | Processing |
| SETTLED | Completed |
| HOLD | Reserved |
| REVERSED | Refunded |
| DISPUTE_FREEZE | Account review in progress |
| FAILED | Payment failed |

### Empty / Error States

- **Zero balance:** "Your Axiom balance is $0.00. Add funds with your debit card to start allocating."
- **Pending only:** "Your $X.XX is still processing (typically 1–2 minutes). You can allocate once it settles."
- **Insufficient balance:** "You need $X more. Top up to continue."
- **Card declined:** "Your card was not charged. Please try a different card or contact your bank."
- **KYC incomplete:** "Complete identity verification before adding funds." → KYC flow link

---

## 8. Recommendation

### Simplest Viable Model
**Option A** with 24-hour hold before first allocation, KYC gate, and velocity limits.
Uses infrastructure already built. Adds only two database tables and one new Stripe intent type.
Integrates directly into the existing Reserves tab allocation engine.

### Safest Model
Option A + 48-hour hold on all top-ups + KYC gate at balance creation (not just at allocation).
Trade-off: slightly more friction.

### Most Scalable Model
Option A foundation → Option B layer (Coinbase Onramp as alternate funding path writing to the
same `axiom_wallet_balances` table) → Column Bank integration for ACH-funded institutional accounts.

### What Should Be Built First (Phased)

**Phase 1 — Core wallet (build immediately):**
1. DB migration: `axiom_wallet_balances` + `axiom_wallet_transactions`
2. `WALLET_TOPUP` intent in `lib/capinfra/cardDeposits/service.ts`
3. `/api/wallet/balance` + `/api/wallet/topup/checkout` + webhook handler
4. `/wallet/fund` top-up UI + `/wallet` balance page

**Phase 2 — Allocation integration:**
5. `/api/wallet/allocate` wired to existing AXUSD mint + Onramp
6. `/wallet/allocate` UI
7. Reserves tab funding source selector (wallet balance as input to existing policy engine)

**Phase 3 — Operations:**
8. `/wallet/history` transaction ledger UI
9. Admin freeze endpoint
10. Daily float reconciliation job

---

## 9. Deferred Features

| Feature | Why Deferred |
|---|---|
| ACH funding | Requires bank rail; triggers MSB analysis |
| Wire reception | Requires account/routing numbers — becomes bank product |
| Card issuance (Axiom card) | BIN sponsorship, separate regulatory posture |
| Push-to-card payouts | Visa/MC payout certification required |
| Balance-to-balance user transfers | P2P money transmission — requires MSB license in most states |
| Yield / interest on idle balance | Makes this a deposit/investment product |
| Lending against balance | Credit product — separate disclosure required |
| Corporate / institutional sub-accounts | Requires Column + per-entity KYC at bank level |
| Recurring auto-invest | v2 — no regulatory change needed when added later |

---

## 10. Build Readiness

### Can Be Built Immediately
- Database schema (two tables, one migration)
- Stripe webhook extension (`WALLET_TOPUP` intent alongside existing `AXUSD_MINT` and `TREASURY_FUND`)
- Balance read APIs
- Top-up Checkout flow (reuses existing Stripe Checkout pattern)
- Allocation flow wired to existing AXUSD mint + Coinbase Onramp
- Transaction history UI
- KYC gate (existing `kyc_verifications` infrastructure already in place)
- Reserves tab funding source selector (wired to `axiom_wallet_balances`)

### Needs More Diligence Before Public Launch
- **Refund policy language** — legal review confirming "on-chain allocations non-refundable" is enforceable
- **Stored-value exemption memo** — payments attorney confirms closed-loop model qualifies for exemption (~$1,500–3,000, needed before public marketing)
- **Stripe ToS confirmation** — confirm platform credit use case is within acceptable use
- **Chargeback reserve sizing** — model at 0.5% of volume before launch

### Stays Out of Scope
- Everything in the Deferred Features list
- Any language positioning this as a bank account, investment account, or money transmission service
- Yield on idle balance at any point in the v1 roadmap
- Balance withdrawal to bank (Stripe refund-to-card only; bank payout is not in scope)

---

## Summary

**Recommended architecture:** Option A — Stripe-funded internal wallet ledger

**Biggest risks:**
1. Chargeback-then-allocate attack → mitigation: 24–48hr hold
2. Stripe ToS characterization → mitigation: "platform credit" framing + rep confirmation
3. Regulatory classification → mitigation: stored-value exemption memo before public launch
4. Float reconciliation drift → mitigation: daily reconciliation job from day one

**Cleanest product truth:**
*"Axiom balance is platform credit — funded by your debit card, used exclusively to allocate
into Axiom Protocol features. It is not a bank account, earns no interest, and is not
transferable to other users or to a bank account."*

**Build first:** DB migration → `WALLET_TOPUP` webhook intent → balance API → top-up UI →
Reserves tab funding source selector

---

```
AXIOM INTERNAL FUNDING BRAINSTORM READY
```

---

*This document is a pre-build architecture brainstorm. No production code, contracts, or
deployments are implied. All flows and schema designs are subject to engineering and legal
review before implementation.*
