# Axiom Nexus Banking — Integration Executive Summary
## Per-Participant Banking Infrastructure, Product Integration Layer, and Institutional Fiat Rails

**Document Version:** 1.0
**Date:** March 31, 2026
**Classification:** Internal Operations Reference
**Network:** Arbitrum One (Chain ID 42161)
**Banking Partner:** Increase.com — First Internet Bank (FDIC Member)

---

## Table of Contents

1. Overview
2. What Was Built
3. The Axiom Nexus Account — Per-Participant Model
4. Participant Onboarding Flow
5. Product Integration — Nexus Account Status on Every Page
6. Wealth Practice — Insurance Hold Lifecycle
7. Lending Fund — Fiat Deposit Infrastructure
8. Banking Admin Dashboard — Participants Tab
9. API Architecture and Authentication Model
10. Security Architecture
11. Operational Runbook (Admin Reference)
12. Technical Inventory

---

## 1. Overview

The Axiom Nexus Banking integration connects every participant-facing product to a dedicated, FDIC-insured banking account through Increase.com, operating on First Internet Bank's institutional rails. Every participant who registers receives their own unique banking identity — a KYC entity, a dedicated deposit account, a virtual account number with dedicated routing, and a Nexus Debit Card — provisioned automatically at onboarding.

This is not a shared treasury model. Every participant's account is legally and structurally separate from every other participant's account and from Axiom's operating treasury. The shared Axiom Nexus Account (account no. ending in `givz`) is the organization-level account for operational flows. Individual participants are provisioned under the same program but receive their own Increase entity IDs and account IDs, which are stored per-participant in the `increase_participants` database table.

The integration spans six product surfaces: Wealth Practice (community savings circles), the Lending Fund (Reg D LP capital), Deal Intelligence (earnest money coordination), Syndication (capital calls), DePIN (node reward disbursement), and the Capital Program (pilot program contributions). Every product page now displays a live Nexus Account Status card showing the participant's masked account number, card status, and available balance — loaded directly from their dedicated Increase account.

---

## 2. What Was Built

### Schema (PostgreSQL / Drizzle ORM)

Four new tables were added to the production database:

**`increase_participants`**
Core participant registry. Stores wallet address, participant reference code (AXM-XXXXXXXX), full legal name, email, KYC fields (DOB, SSN last 4, address), Increase entity ID, Increase account ID, virtual account number, virtual routing number, card ID, card last 4, card status, and onboarding status. Every row is linked to exactly one Increase entity and one Increase account.

**`increase_product_escrows`**
Product-level capital holds. Tracks earnest money deposits, insurance holds, capital program contributions, and settlement escrows by product and purpose. Fields: participant ID, product, purpose, amount cents, deposited amount cents, status (pending/funded/released/forfeited), funded timestamp, transaction ID.

**`increase_lp_deposits`**
Lending Fund LP deposit ledger. Records intended deposit amounts, actual received amounts, deposit timestamps, and application status (pending / received / applied). Linked to participant and group (if applicable).

**`increase_distributions`**
Distribution ledger. Records ACH distributions from the Lending Fund and Wealth Practice to participants. Tracks amount, type, period, status (pending / sent / settled / failed), and Increase transaction ID.

### Increase Service Extension (`lib/services/IncreaseService.ts`)

Seven new methods added:

- `createIndividualEntity(params)` — provisions a KYC identity entity with legal name, DOB, SSN last 4, and address
- `createAccount(params)` — provisions a dedicated deposit account linked to the entity under the Axiom program
- `issueVirtualCard(params)` — issues a virtual Nexus Debit Card linked to the participant's account
- `listCards(accountId)` — lists all cards on a given account
- `getCard(cardId)` — retrieves card details (last4, expiry, status)
- `getAccountBalance(accountId)` — retrieves available and current balance for a given account
- `createVirtualAccountNumber(params)` — provisions a dedicated virtual account number for ACH receipt

All methods are environment-aware: sandbox mode when `INCREASE_ENVIRONMENT=sandbox`, live mode only when explicitly configured.

### API Endpoints

Twelve new API routes were deployed:

| Route | Method | Purpose |
|---|---|---|
| `/api/banking/participant/onboard` | POST | KYC registration — entity + account + virtual account + card |
| `/api/banking/participant/status` | GET | Self-status (SIWE) — account, card, balance, holds |
| `/api/banking/participant/[walletAddress]` | GET | Full participant record with balance enrichment |
| `/api/banking/participant/card` | GET/POST | Card status and issuance |
| `/api/banking/wealth-practice/insurance/status` | GET | Insurance hold status for a group (SIWE-first) |
| `/api/banking/wealth-practice/insurance/fund` | POST | Create pending insurance hold + return deposit instructions |
| `/api/banking/wealth-practice/insurance/release` | POST | Release or forfeit an insurance hold (admin) |
| `/api/banking/lending-fund/deposit-instructions` | GET | LP deposit routing details (SIWE-first) |
| `/api/banking/lending-fund/distribution` | POST | Record and initiate LP distribution (admin) |
| `/api/banking/overview` | GET | Organization-level account summary |
| `/api/banking/transactions` | GET | Increase transaction ledger |
| `/api/banking/account-numbers` | GET | Virtual account numbers list |

### UI Components

**`NexusBankingPanel`** (shared component, `components/design-law/NexusBankingPanel.tsx`)
Used on six product pages. Shows deposit routing instructions, contextual guidance, and a three-column Nexus Account Status card with:
- Masked account number (last 4 digits of virtual account number)
- Nexus Card status: ACTIVE (with last 4) / PENDING ISSUANCE / Not yet issued
- Available balance (pulled from participant's dedicated Increase account)

Handles all card status enum values: `active`, `issued`, `card_pending`, `pending`, `not_requested`, `program_required`.

---

## 3. The Axiom Nexus Account — Per-Participant Model

Each participant is provisioned with four components:

**Component 1 — Increase Entity (KYC Identity)**
A verified individual entity on Increase's platform. Requires full legal name, date of birth, SSN last 4, and U.S. residential address. This is the KYC anchor. The entity ID (`increaseEntityId`) is stored on the participant record.

**Component 2 — Dedicated Deposit Account**
An Increase bank account linked to the participant's entity, provisioned under the Axiom program ID. This account is structurally separate from Axiom's operating treasury. The account ID (`increaseAccountId`) is stored on the participant record. Both `increaseEntityId` and `increaseAccountId` must be set for a participant to be considered fully provisioned.

**Component 3 — Virtual Account Number**
A dedicated routing number and account number assigned to the participant's Increase account for ACH receipt. Participants send ACH transfers to this number and deposits are automatically matched without a memo code. The virtual account number and routing number are stored on the participant record and displayed in the product Nexus panels.

**Component 4 — Nexus Debit Card**
A virtual Visa debit card issued on the participant's account. Used for operational disbursements, reward payouts, and capital program distributions. Card issuance is best-effort at onboarding (non-blocking if Increase card issuance is temporarily unavailable) and can be retried via the card API.

### Provisioning Policy

All four components are provisioned at onboarding. Steps 1 (entity), 2 (account), and 3 (virtual account number) are hard-fail — if any step cannot complete, the entire onboarding returns an error and no partial record is created. Step 4 (card) is best-effort — a participant can onboard successfully without a card and have it issued later.

If `INCREASE_PROGRAM_ID` is not configured, onboarding fails with `PROGRAM_ID_MISSING` rather than falling back to the shared treasury account. The shared treasury account is never used as a participant account under any circumstances.

---

## 4. Participant Onboarding Flow

### Registration Forms

Two registration forms collect all required KYC fields:

**Wealth Practice** (`/wealth-practice`) — Community participant registration
**Lending Fund** (`/lending-fund/invest`) — LP investor registration

Both forms require:
- Full legal name
- Email address
- Date of birth
- SSN last 4
- Street address
- City
- State
- ZIP code

Client-side validation enforces all fields before submission. Institutional framing is used throughout: participants are informed they are providing information for identity verification purposes, not stored credentials.

### Onboarding API Flow (`POST /api/banking/participant/onboard`)

```
Step 1 — Create Increase entity (HARD FAIL)
  └── Sends fullName, DOB, ssnLast4, address to Increase
  └── Stores increaseEntityId on participant record

Step 2 — Create dedicated account (HARD FAIL)
  └── Links entity to Axiom program
  └── Returns unique account ID
  └── Stores increaseAccountId on participant record
  └── FAILS with PROGRAM_ID_MISSING if no program configured

Step 3 — Provision virtual account number (HARD FAIL)
  └── Creates dedicated routing + account number for ACH receipt
  └── Stores virtualRoutingNumber + virtualAccountNumber

Step 4 — Issue Nexus Card (BEST EFFORT)
  └── Issues virtual Visa card on participant account
  └── Stores cardId + cardLast4 + cardStatus
  └── Onboarding succeeds even if card issuance fails
```

---

## 5. Product Integration — Nexus Account Status on Every Page

The `NexusBankingPanel` component is integrated on six product pages. When a participant connects their wallet, the panel fetches their Increase account data and renders a live status card.

| Product Page | Route | Context |
|---|---|---|
| Wealth Practice | `/wealth-practice` | Insurance hold deposit instructions |
| Lending Fund | `/lending-fund/invest` | LP fiat deposit (ACH/wire) |
| Deal Intelligence | `/deal-intelligence/deal/[id]` | Earnest money deposit |
| Syndication | `/syndication/offerings/[id]` | Capital call funding |
| DePIN (DeNet) | `/depin/denet` | Node reward disbursement account |
| Capital Program | `/pilot` | Contribution funding account |
| Exchange | `/dex` | Settlement and withdrawal account |

### Nexus Account Status Card

Every panel shows a three-column status card at the top of the participant's registered view:

**Account No.** — Masked virtual account number (last 4 digits)
**Nexus Card** — Status (ACTIVE ···· [last4] / PENDING ISSUANCE / Not yet issued)
**Available Balance** — USD balance on the participant's dedicated Increase account

Balance is only shown when both `increaseAccountId` and `increaseEntityId` are set, preventing any exposure of treasury-level balances to individual participants.

---

## 6. Wealth Practice — Insurance Hold Lifecycle

Community group membership is gated behind a funded insurance hold. Participants cannot join a Wealth Practice group until their insurance hold deposit has cleared and been confirmed by Operations.

### How It Works

**Hold Amount**: One quarter of the monthly contribution amount (e.g., $25 hold for a $100/mo group)

**Participant Flow**:
1. Participant connects wallet and selects a group to join
2. System checks insurance hold status via SIWE-authenticated API (no wallet address input required)
3. If no hold exists: system creates a pending escrow record and returns deposit instructions
4. Participant sends ACH to their dedicated virtual account number (no memo required)
5. Operations confirms receipt in Increase dashboard and calls the fund confirmation API
6. Hold status changes to `funded`; participant may now join the group

**Server-Side Gating**: `/api/wealth-practice/join` queries `increase_product_escrows` for a funded insurance hold matching the participant and group. In production, join is blocked if no funded hold exists. The join flow uses the connected wagmi wallet address — no manual wallet input is presented to the user.

### Insurance Hold API Endpoints

**Status** (`GET /api/banking/wealth-practice/insurance/status?groupId=...`)
Returns hold status, required hold amount, deposited amount, and deposit instructions. Wallet derived from SIWE — no `?wallet=` param needed for participants. Admin path accepts `?wallet=` override.

**Fund** (`POST /api/banking/wealth-practice/insurance/fund`)
Two modes:
- Participant: creates pending hold, returns deposit instructions. Wallet from SIWE.
- Admin (with `adminConfirm: true`): marks hold funded with actual `depositedAmountCents`.

**Release** (`POST /api/banking/wealth-practice/insurance/release`)
Admin-only. Releases or forfeits a hold:
- Standard release: `{ holdId }` — group graduation, funds returned to participant
- Forfeiture: `{ holdId, reason: "forfeited" }` — early exit, funds retained in Nexus Account

---

## 7. Lending Fund — Fiat Deposit Infrastructure

Accredited LP participants can fund their Lending Fund position via fiat bank transfer (ACH or wire) to the Axiom Nexus Account. The invest page (`/lending-fund/invest`) includes a dedicated "Fiat Deposit" panel.

### Deposit Flow

1. Participant connects wallet and registers Nexus Account (if not already done)
2. Panel shows participant's dedicated virtual account number and routing number
3. Participant logs their intended deposit amount in the platform
4. Participant sends ACH or wire to their Nexus Account virtual account number
5. Operations matches the deposit via Increase transaction ledger
6. LP deposit record status transitions: `pending` → `received` → `applied`

### Distribution Recording

Admin can record and initiate LP distributions via `POST /api/banking/lending-fund/distribution`. Distributions are logged to `increase_distributions` with amount, type, period, and status. Distribution confirmations are sent via ACH to the participant's registered bank account.

### Deposit Instructions API

`GET /api/banking/lending-fund/deposit-instructions` is SIWE-first: participant's wallet is derived from their session, no `?wallet=` query parameter needed. Admin path accepts optional `?wallet=` override.

---

## 8. Banking Admin Dashboard — Participants Tab

The Banking Operations dashboard at `/banking` now includes a sixth tab: **Participants**. This tab gives Operations full visibility into all registered Nexus Account participants.

### What the Tab Shows

**Registered Participants Table**
Every registered participant with:
- Participant reference code (AXM-XXXXXXXX)
- Full name and email (masked in the table header)
- Wallet address (truncated)
- Onboarding status
- Card status
- Account number (masked — last 4 only)
- Increase entity ID and account ID

**Open Insurance Escrows Sub-table**
For each participant: all pending insurance holds with required amount, deposited amount, shortfall, and group reference.

**LP Deposits Sub-table**
All recorded LP deposit intentions with intended amount, status, and timestamp.

### Admin Operational Guide

The Participants tab includes a built-in operations guide with four action cards:

- **To confirm an insurance hold**: `POST /api/banking/wealth-practice/insurance/fund` with `{ holdId, depositedAmountCents }` + `x-admin-key` header
- **To release a hold** (graduation): `POST /api/banking/wealth-practice/insurance/release` with `{ holdId }`
- **To apply an LP deposit**: Update LP deposit record status through the admin table
- **To forfeit a hold** (early exit): `POST /api/banking/wealth-practice/insurance/release` with `{ holdId, reason: "forfeited" }`

All write operations require the `x-admin-key` header.

---

## 9. API Architecture and Authentication Model

### SIWE-First Identity

All participant-facing banking endpoints derive the participant's identity from their SIWE (Sign-In with Ethereum) session cookie. No wallet address is accepted as a query parameter from participants — the server reads the authenticated wallet from the `wallet_sessions` table.

Pattern:
```
GET /api/banking/wealth-practice/insurance/status?groupId=123
  → Server reads siwe_session cookie
  → Queries wallet_sessions for wallet_address
  → Uses that wallet to look up participant record
  → Returns data for the authenticated participant only
```

Admin override is available on all endpoints via the `x-admin-key: [ADMIN_SOLVENCY_KEY]` header. Admin paths accept `?wallet=` for querying specific participants.

In development (`NODE_ENV=development`), SIWE returns `__dev__` and optional `?wallet=` query params are accepted as a testing fallback.

### Auth Stack

| Layer | Mechanism | Scope |
|---|---|---|
| Wallet connection | Wagmi v2 + Reown AppKit | Front-end wallet state |
| Session identity | SIWE cookie (`siwe_session`) | Participant API auth |
| Admin operations | `x-admin-key` header | Write/admin API auth |
| Card status check | SIWE-derived account ID | Real-time Increase API |
| Balance check | SIWE-derived account ID | Real-time Increase API |

---

## 10. Security Architecture

### Dedicated Account Isolation

Every participant's `increaseAccountId` is their own dedicated Increase account, provisioned under their own KYC entity. The organization's treasury account (`account_3q7ro70b6ma4w5ijgivz`) is never assigned to any participant.

**Balance Guard**: Account balance is only fetched and returned when BOTH `increaseAccountId` AND `increaseEntityId` are set on the participant record. This dual-field guard ensures that any historical record that might have been provisioned without a dedicated entity cannot expose treasury balance to a participant.

### Provisioning Enforcement

The onboarding endpoint enforces a strict no-fallback policy:
- No `INCREASE_PROGRAM_ID` configured → `PROGRAM_ID_MISSING` error (HTTP 502), not a fallback to shared account
- Entity creation failure → `ENTITY_PROVISIONING_FAILED` error, no partial record created
- Account creation failure → `ACCOUNT_PROVISIONING_FAILED` error, entity ID returned for debugging
- Virtual account failure → `VIRTUAL_ACCOUNT_FAILED` error, entity and account IDs returned

### Join Gating

The Wealth Practice join endpoint (`/api/wealth-practice/join`) enforces the insurance hold requirement server-side. The UI check is a user-experience layer; the server independently queries for a funded hold before accepting any join. In production, there is no admin override for the join gate — a funded hold is required. In development, `NODE_ENV=development` allows the gate to pass for testing.

---

## 11. Operational Runbook (Admin Reference)

### Confirming a Wealth Practice Insurance Deposit

1. Log into the Increase sandbox/production dashboard
2. Search incoming ACH transfers for the participant's reference code (AXM-XXXXXXXX) in the memo or description
3. Verify amount matches the required hold amount (shown in the Participants tab)
4. Call:
   ```
   POST /api/banking/wealth-practice/insurance/fund
   x-admin-key: [ADMIN_SOLVENCY_KEY]
   { "holdId": 123, "depositedAmountCents": 2500, "adminConfirm": true }
   ```
5. Hold status changes to `funded`; participant may now join their group

### Releasing a Hold After Group Graduation

```
POST /api/banking/wealth-practice/insurance/release
x-admin-key: [ADMIN_SOLVENCY_KEY]
{ "holdId": 123 }
```
Initiate ACH credit from Nexus Account back to participant's registered bank. Log the outgoing transfer amount in the distribution ledger.

### Forfeiting a Hold (Early Exit)

```
POST /api/banking/wealth-practice/insurance/release
x-admin-key: [ADMIN_SOLVENCY_KEY]
{ "holdId": 123, "reason": "forfeited" }
```
Hold amount remains in the Nexus Account. Redistribute per fund policy. Record as a distribution to the group's remaining members.

### Recording an LP Distribution

```
POST /api/banking/lending-fund/distribution
x-admin-key: [ADMIN_SOLVENCY_KEY]
{
  "walletAddress": "0x...",
  "amountCents": 50000,
  "type": "interest",
  "period": "Q1-2026"
}
```

---

## 12. Technical Inventory

### Files Created or Modified

**Schema**
- `shared/increaseParticipantSchema.ts` — 4 new tables, all types exported

**Service Layer**
- `lib/services/IncreaseService.ts` — 7 new methods, env-aware routing

**API Routes (New)**
- `pages/api/banking/participant/onboard.ts`
- `pages/api/banking/participant/status.ts`
- `pages/api/banking/participant/[walletAddress].ts`
- `pages/api/banking/participant/card.ts`
- `pages/api/banking/wealth-practice/insurance/status.ts`
- `pages/api/banking/wealth-practice/insurance/fund.ts`
- `pages/api/banking/wealth-practice/insurance/release.ts`
- `pages/api/banking/lending-fund/deposit-instructions.ts`
- `pages/api/banking/lending-fund/distribution.ts`

**UI Components**
- `components/design-law/NexusBankingPanel.tsx` — shared banking panel with Nexus Status Card

**Product Pages (Modified)**
- `pages/wealth-practice.tsx` — insurance hold join flow, registration form, Nexus panel
- `pages/lending-fund/invest.tsx` — fiat deposit panel, LP registration form
- `pages/deal-intelligence/deal/[id].tsx` — earnest money Nexus panel
- `pages/syndication/portal.tsx` — capital call Nexus panel
- `pages/depin/denet.tsx` — node reward Nexus panel
- `pages/pilot/index.tsx` — capital program Nexus panel
- `pages/dex.tsx` — exchange settlement Nexus panel
- `pages/banking/index.tsx` — Participants tab (6th tab), admin operational guide

### Environment Variables

| Variable | Purpose |
|---|---|
| `INCREASE_API_KEY` | Increase REST API key (sandbox or live) |
| `INCREASE_ENVIRONMENT` | `sandbox` or `production` |
| `INCREASE_ACCOUNT_ID` | Organization-level Nexus Account ID |
| `INCREASE_SANDBOX_ACCOUNT_ID` | Sandbox equivalent of above |
| `INCREASE_PROGRAM_ID` | Axiom banking program ID (required for participant provisioning) |
| `INCREASE_SANDBOX_PROGRAM_ID` | Sandbox equivalent of above |
| `ADMIN_SOLVENCY_KEY` | Admin API key for all write operations |

---

*Axiom Protocol is not a bank, broker-dealer, or registered investment advisor. All banking services are provided through Increase.com and First Internet Bank, Member FDIC. Participant account balances are FDIC-insured up to applicable limits. This document is for internal operational reference only.*
