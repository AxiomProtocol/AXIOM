# Axiom Protocol — Product Suite
## Integrated Executive Summary & Technical White Paper
**Version 1.0 — April 2026 — CONFIDENTIAL**

---

> This document is intended for institutional allocators, strategic partners, and qualified participants. It describes the Axiom Protocol product suite in architectural and operational terms. Nothing herein constitutes an offer or solicitation of securities or financial services. All yield figures are variable and represent protocol-derived rates, not guarantees.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Platform Architecture Overview](#2-platform-architecture-overview)
3. [Consumer Banking Layer — Axiom Nexus](#3-consumer-banking-layer--axiom-nexus)
   - 3.1 Nexus Card
   - 3.2 Early Direct Deposit
   - 3.3 Crypto-Backed Credit Line
   - 3.4 AXUSD Yield Savings Account
   - 3.5 DAO Operating Accounts
4. [Payment Rail Layer — Axiom Rail](#4-payment-rail-layer--axiom-rail)
   - 4.1 DAO Contributor Payroll
   - 4.2 Rent Collection
   - 4.3 Escrow Service
5. [Community Finance Layer — Wealth Practice](#5-community-finance-layer--wealth-practice)
   - 5.1 Group Economics & Trust Pipeline
   - 5.2 Peer Lending Module
6. [Reserve & Monetary Infrastructure](#6-reserve--monetary-infrastructure)
7. [Compliance & Risk Framework](#7-compliance--risk-framework)
8. [Data Architecture & Persistence Layer](#8-data-architecture--persistence-layer)
9. [Custody Model](#9-custody-model)
10. [Fee Schedule](#10-fee-schedule)
11. [Glossary of Approved Terms](#11-glossary-of-approved-terms)

---

## 1. Executive Summary

Axiom Protocol is a governance-first financial operating system purpose-built to serve the sovereign digital-physical economy. The platform integrates FDIC-insured USD banking rails, on-chain financial infrastructure, community-driven wealth formation, and institutional-grade settlement services into a unified, self-custody-compatible architecture deployed on Arbitrum One.

This document covers the complete product suite shipped through Q1 2026, encompassing nine distinct financial products organized across three operational layers: **Consumer Banking (Axiom Nexus)**, **Payment Rails (Axiom Rail)**, and **Community Finance (Wealth Practice)**. All layers share a common identity model, a common reserve substrate (AXUSD / AXAU), and a common governance token (AXM).

### Strategic Position

The Axiom Protocol occupies a structural gap between traditional banking infrastructure and on-chain financial rails. Participants receive FDIC-insured deposit accounts, programmable payment rails, yield-bearing stablecoin positions, and community lending instruments — all accessed through a single wallet-identity layer and governed by on-chain authorization policies.

Key differentiators:

- **FDIC-insured banking rails** through First Internet Bank via Increase, providing up to $250,000 deposit insurance per participant
- **Non-custodial design** — protocol participants retain custody of on-chain assets; USD banking is operated through regulated partners, not held directly by the protocol
- **Dual-layer reserve instrument** — AXUSD (ERC-3643 compliant settlement stablecoin) backed by a real-world asset reserve (AXAU, pegged to allocated gold via PAXG)
- **Community-native lending** — peer lending through structured group trust pipelines that formalize informal community finance traditions
- **Institutional payment infrastructure** — ACH/wire batch settlement, escrow state machines, and rent collection rails for real-world capital flows

### Capital Infrastructure Summary (April 2026)

| Component | Status | Banking Partner |
|---|---|---|
| Participant checking accounts | Live | First Internet Bank / Increase |
| Virtual routing + account numbers | Live | First Internet Bank / Increase |
| Nexus Debit Card (virtual) | Live | First Internet Bank / Increase |
| Physical card fulfillment | Configured | First Internet Bank / Increase |
| DAO Operating Accounts | Live | First Internet Bank / Increase |
| Crypto collateral custody | Live | BitGo CaaS (Arbitrum One) |
| On-chain yield vault | Live | Euler V2 (Arbitrum One) |
| Stellar anchor / SEP rails | Configured | Axiom Rail (internal) |
| ACH batch payroll | Live | Increase ACH |
| Escrow settlement | Live | Increase ACH/Wire |

---

## 2. Platform Architecture Overview

The Axiom Protocol operates across seven distinct layers, each with a discrete function and custody boundary:

```
Layer 00  Axiom Rail          — Stellar SEP-10/24/31/38 anchor; ACH/wire settlement via Increase
Layer 01  Identity            — ERC-3643 on-chain identity; SIWE session authentication
Layer 02  Reserve             — AXUSD (ERC-3643), AXAU (PAXG-backed), LandNAV oracle
Layer 03  Governance          — AXM token; Sentinel authorization; AME policy engine
Layer 04  Treasury            — Multi-party authorization treasury; allocation policies
Layer 05  Asset Intelligence  — Field capture, property analysis, MIRDT, deal intelligence
Layer 06  Community           — Wealth Practice group economics, peer lending, land acquisition
```

### Core Technology Stack

| Component | Technology |
|---|---|
| Blockchain network | Arbitrum One (chain ID 42161) |
| Wallet connection | Wagmi v2.19 + Reown AppKit v1.8 |
| Authentication | SIWE (Sign-In with Ethereum) + Auth0 |
| Automated control layer | Solidity / OpenZeppelin / @onchain-id |
| RPC provider | Alchemy API |
| Database | PostgreSQL (Neon) + Drizzle ORM |
| Banking API | Increase (REST) |
| Institutional custody | BitGo CaaS |
| Payment rail | Stellar SEP-compliant anchor |
| Email delivery | Resend |
| Frontend | Next.js 14 / React / Tailwind CSS |
| Document generation | Server-rendered HTML (Next.js API routes) |

### Networking & Security

All production endpoints are served over HTTPS via Replit Autoscale deployment. API routes enforce:
- **Rate limiting** per IP and per wallet across all sensitive endpoints
- **SIWE session verification** for all participant-level data access
- **Admin-key gating** (HMAC-SHA256, constant-time comparison) for privileged administrative operations
- **BSA data hashing** — all Bank Secrecy Act identity fields (name, DOB, ID number) are SHA-256 hashed before persistence; raw values are never stored in plaintext
- **AES-256-GCM encryption** for bank routing and account numbers stored in the lending database
- **Idempotency keys** on all ACH/wire origination calls to prevent duplicate settlement

---

## 3. Consumer Banking Layer — Axiom Nexus

The Axiom Nexus suite delivers five FDIC-insured banking products to protocol participants. All products share a common participant registry (`increase_participants`) that links on-chain wallet addresses to regulated banking identities provisioned through Increase and First Internet Bank.

### Participant Onboarding

Every Nexus product requires participants to complete a one-time enrollment:

1. Wallet connection and SIWE authentication
2. Legal identity verification (full name, email, phone)
3. Increase entity creation (KYC via Increase's regulated onboarding)
4. Dedicated deposit account provisioning (routing + account number assigned per participant)

Upon provisioning, each participant receives a unique `participant_ref` identifier that links their on-chain wallet address to their off-chain banking identity across all Nexus products.

---

### 3.1 Nexus Card

**Product:** A Visa/Mastercard debit card issued against the participant's FDIC-insured Nexus checking account, backed by First Internet Bank.

**Functional Capabilities:**

- Instant virtual card issuance accessible through the authenticated dashboard
- In-browser secure credential reveal (PAN, CVV, expiry) with a 30-second display window — credentials are never persisted to the database
- Card freeze/unfreeze control with instantaneous effect via Increase API
- Physical card fulfillment upon request, mailed to the verified address on file

**Authorization Flow:**

The card dashboard is gated behind a two-factor identity check: (1) wagmi wallet connection and (2) SIWE session verification. Card sensitive data is fetched on-demand via `GET /api/banking/participant/card/details`, which forwards the request to Increase's card management API and returns credentials directly to the browser without logging.

**State Machine (card_status):**

```
not_requested → issued → active
                       → frozen → active
                       → cancelled
```

**Key API Endpoints:**

| Method | Endpoint | Access | Function |
|---|---|---|---|
| GET | `/api/banking/participant/card/details` | SIWE session | Reveal PAN/CVV/expiry |
| POST | `/api/banking/participant/card` | SIWE session | Issue new virtual card |
| PATCH | `/api/banking/participant/card/freeze` | SIWE session | Toggle freeze state |
| GET | `/api/banking/participant/card/transactions` | SIWE session | Transaction history |
| POST | `/api/banking/participant/card/physical-request` | SIWE session | Request physical card |

**Database Schema (increase_participants — card fields):**

```sql
card_status             VARCHAR(30)  NOT NULL DEFAULT 'not_requested'
card_id                 VARCHAR(100)
card_last4              VARCHAR(4)
physical_card_requested BOOLEAN      NOT NULL DEFAULT FALSE
physical_card_requested_at TIMESTAMP
```

---

### 3.2 Early Direct Deposit

**Product:** Dedicated ACH routing and account numbers that enable participants to receive employer payroll up to 2 business days before the official pay date, by crediting funds upon ACH file receipt rather than upon settlement.

**Mechanism:**

Standard ACH direct deposit operates on a 2-business-day settlement window. Axiom's banking partner, First Internet Bank through Increase, credits participant accounts at the moment the ACH file arrives from the originating payroll provider — not when the interbank settlement clears. This eliminates the 1–2 day float that conventional banks impose.

**Implementation:**

Each participant is assigned a dedicated virtual routing number and account number through Increase's Virtual Account Number (VAN) product. These numbers are unique to the participant and link directly to their First Internet Bank checking account.

**Pre-Filled Authorization Form:**

The platform generates a legally formatted, pre-filled Direct Deposit Authorization Form populated with the participant's:
- Full legal name and account reference code
- ABA routing number and account number
- Bank name and account type
- Step-by-step payroll portal instructions

The form is served as a downloadable HTML file, formatted for print-to-PDF through the browser's native print dialog. It includes complete authorization language and a signature field for HR submission.

**Key API Endpoints:**

| Method | Endpoint | Access | Function |
|---|---|---|---|
| GET | `/api/banking/participant/direct-deposit` | SIWE session | Retrieve routing/account numbers |
| GET | `/api/banking/participant/direct-deposit/form` | SIWE session | Download pre-filled authorization form |

**Supported Payroll Platforms:** ADP, Gusto, Paychex, Rippling, Workday, QuickBooks Payroll, Wave, Square Payroll, and all standard ACH payroll providers.

**Database Schema (increase_participants — direct deposit fields):**

```sql
virtual_account_number_id VARCHAR(100)
virtual_routing_number    VARCHAR(20)
virtual_account_number    VARCHAR(30)
```

---

### 3.3 Crypto-Backed Credit Line

**Product:** USD-denominated secured credit lines collateralized by BTC, ETH, or AXUSD. No credit checks. No taxable liquidation event from the collateral deposit. Interest accrues only on the drawn balance.

**Collateral Parameters:**

| Asset | Max LTV | Warning LTV | Liquidation LTV |
|---|---|---|---|
| BTC | 50% | 70% | 85% |
| ETH | 50% | 70% | 85% |
| AXUSD | 80% | 90% | 95% |

**Interest & Fee Structure:**

- **Interest rate:** 8.0% APR, accruing daily on the outstanding drawn balance
- **Origination fee:** None
- **Liquidation penalty:** Applied at liquidation threshold per collateral agreement

**Technical Architecture:**

Collateral is held in institutional custody via **BitGo CaaS** on Arbitrum One. Upon credit line creation (`POST /api/credit/open`), the system generates a BitGo deposit address for the selected collateral asset. A real-time health monitor evaluates LTV using price feeds from CoinGecko. When LTV exceeds the warning threshold, the participant receives an automated notification. When it exceeds the liquidation threshold, the position is flagged for operator review.

USD disbursements are originated through Increase ACH to the participant's registered bank account. Repayments are accepted via ACH credit.

**State Machine (crypto_credit_status):**

```
pending_collateral → active → warning → flagged → closed
                           → closed
```

**Key API Endpoints:**

| Method | Endpoint | Access | Function |
|---|---|---|---|
| POST | `/api/credit/open` | SIWE session | Open credit line, generate deposit address |
| POST | `/api/credit/draw` | SIWE session | Disburse USD to registered bank |
| GET | `/api/credit/status` | SIWE session | Current LTV, health, available credit |

**Database Schema (crypto_credit_lines):**

```sql
participant_wallet      VARCHAR(42)  NOT NULL
collateral_asset        ENUM         NOT NULL  -- BTC, ETH, AXUSD
collateral_amount_raw   VARCHAR(60)  NOT NULL
collateral_usd_value_at_open DECIMAL(18,2)
credit_limit_usd        DECIMAL(18,2)
drawn_amount_usd        DECIMAL(18,2) DEFAULT 0
interest_rate_pct       DECIMAL(6,4)  DEFAULT 8.0
status                  ENUM         NOT NULL  -- pending_collateral, active, warning, flagged, closed
bitgo_wallet_id         VARCHAR(200)
bitgo_address_id        VARCHAR(200)
deposit_address         VARCHAR(200)
```

---

### 3.4 AXUSD Yield Savings Account

**Product:** A non-custodial, variable-yield savings vault for AXUSD, deployed on Arbitrum One and backed by the Euler V2 lending protocol. Participants earn lending market yield on idle AXUSD balances without surrendering custody.

**Architecture:**

The vault implements an ERC-4626 compliant interface through Euler V2's AXUSD lending market (`EVK_OPEN_MARKET_VAULT`). Deposits are on-chain operations — participants approve and deposit AXUSD directly from their wallet into the vault contract. The protocol records the transaction for accounting and history purposes, but never holds the assets.

**On-Chain Verification Model:**

Every deposit and withdrawal is verified against the blockchain with fail-closed logic:

1. Client submits a transaction hash after completing the on-chain operation
2. The API fetches the transaction receipt from Arbitrum One via Alchemy
3. Receipt is validated: status = 1, `from` matches the authenticated wallet, `to` matches the vault contract (not just any ERC-20 token)
4. The deposit calldata is decoded to extract the actual `assets` and `receiver` parameters
5. `receiver` must match the authenticated wallet address — prevents spoofing
6. A 10% tolerance check validates the amount against client-provided expectations
7. The chain-derived amount (not the client-submitted amount) is persisted to the database

This model prevents any form of false confirmation, balance inflation, or receiver spoofing.

**Yield Source:**

Yield is generated by the Euler V2 AXUSD lending market. When demand for AXUSD borrowing is high, utilization increases and yield rises. When utilization is low, yield decreases. The rate is fully transparent, variable, and derived from the protocol — not a commitment of the Axiom Protocol.

**Key API Endpoints:**

| Method | Endpoint | Access | Function |
|---|---|---|---|
| GET | `/api/savings/info` | Public | Live APY, TVL, utilization from Euler |
| GET | `/api/savings/position` | SIWE session | On-chain balance, yield earned, history |
| POST | `/api/savings/deposit` | SIWE session | Prepare calldata or confirm deposit |
| POST | `/api/savings/withdraw` | SIWE session | Prepare calldata or confirm withdrawal |

**Database Schema (savings_positions):**

```sql
wallet_address       VARCHAR(42)    NOT NULL
operation            VARCHAR(20)    NOT NULL  -- deposit, withdraw
deposit_amount_axusd NUMERIC
status               VARCHAR(20)    NOT NULL  -- pending, confirmed, failed
tx_hash              VARCHAR(66)    UNIQUE
current_balance_axusd NUMERIC
vault_shares         NUMERIC
created_at           TIMESTAMP      NOT NULL
```

---

### 3.5 DAO Operating Accounts

**Product:** FDIC-insured USD operating accounts for DAOs, DAO LLCs, and legal entities participating in the Axiom Protocol ecosystem. Accounts are provisioned with routing and account numbers, ACH/wire transfer capability, and a live balance dashboard.

**Eligibility:**

- Valid U.S. legal entity (LLC, DAO LLC, Corp, Non-profit)
- Employer Identification Number (EIN) on file
- Authorized signer with government-issued ID (BSA compliance)

**Onboarding Process:**

1. Entity information submission (name, EIN, registered address, entity type)
2. Authorized signer BSA verification (legal name, date of birth, country, ID type/number)
3. Operator review of application (`pending_review → approved`)
4. Account provisioning via Increase: dedicated sub-account + routing/account number
5. Unique one-time account token issued to the authorized signer for dashboard access

**Privacy Architecture:**

BSA identity fields (signer name, DOB, ID number) are SHA-256 hashed before database persistence. The admin list endpoint explicitly excludes BSA fields and signer identity. The account token is hashed using bcrypt before storage; the raw token is displayed only once at provisioning and is unrecoverable thereafter.

**Dashboard Capabilities:**

- Live account balance via Increase API
- Paginated transaction history (configurable limit, maximum 100 per page)
- Full routing and account number display (separate deliberate reveal action)
- ACH/wire transfer origination to counterparty bank accounts

**State Machine (dao_account_status):**

```
pending_review → approved → active
               → rejected
```

**Key API Endpoints:**

| Method | Endpoint | Access | Function |
|---|---|---|---|
| POST | `/api/banking/dao-account/apply` | Rate-limited (3/hr/IP) | Submit entity application |
| GET | `/api/banking/dao-account/list` | Admin key | Application list (BSA excluded) |
| POST | `/api/banking/dao-account/provision` | Admin key | Create Increase account, issue token |
| GET | `/api/banking/dao-account/dashboard` | Account token | Balance, transaction history |
| GET | `/api/banking/dao-account/account-details` | Account token | Full account/routing reveal |
| POST | `/api/banking/dao-account/transfer` | Account token | Initiate ACH or wire |

---

## 4. Payment Rail Layer — Axiom Rail

Axiom Rail is the protocol's payment infrastructure layer, providing programmable settlement for real-world capital flows. It operates as a Stellar SEP-compliant anchor that accepts USDC/AXUSD on-chain and settles the equivalent USD through Increase FDIC-insured ACH and domestic wire rails.

The rail handles three categories of payment:

| Category | Product | Settlement Method |
|---|---|---|
| Batch contributor payroll | DAO Payroll | ACH or Wire (per recipient) |
| Property rent collection | Rent Collection | ACH or Wire |
| Conditional fund release | Escrow Service | ACH or Wire |

All Axiom Rail payments use deterministic idempotency keys to prevent double-origination. Rate limiting is enforced at the IP and account level on all origination endpoints.

---

### 4.1 DAO Contributor Payroll

**Product:** Batch USD payroll disbursement for DAO contributors. Operators submit a contributor list and BSA signer identity; the rail originates individual ACH or wire transfers to each recipient's bank account.

**Flow:**

```
Operator submits batch → BSA signer verified → Idempotency key computed →
Individual ACH/wire per recipient → Status tracked per recipient →
Run marked complete when all recipients settled
```

**Batch Constraints:**

| Parameter | Limit |
|---|---|
| Recipients per run | Max 200 |
| Minimum per recipient | $10.00 |
| Maximum per recipient | $25,000.00 |
| Transfer types | ACH (standard), Wire (domestic) |

**BSA Compliance:**

Each payroll run requires a BSA-compliant originator identity: legal name, date of birth, country of residence, and government ID. This information is SHA-256 hashed before persistence.

**Key API Endpoints:**

| Method | Endpoint | Access | Function |
|---|---|---|---|
| POST | `/api/axiom-rail/payroll` | Authenticated | Submit batch run |
| GET | `/api/axiom-rail/payroll/[runId]` | Authenticated | Run status and recipient outcomes |

**Database Schema:**

```
axiom_rail_payroll_runs         — one row per batch run
axiom_rail_payroll_recipients   — one row per recipient; foreign key to run
```

**Fee Structure:**

| Fee | Amount |
|---|---|
| Per-recipient flat fee | $0.50 |
| Variable fee | 0.10% of gross amount per recipient |
| Domestic wire surcharge | $15.00 per wire recipient |

---

### 4.2 Rent Collection

**Product:** Identity-verified rent collection for landlords, settled via FDIC-insured banking rails. Landlords register a property and receive a stable payment link (property slug) for tenant-initiated payments.

**Flow:**

```
Landlord registers property + bank account → Property slug generated →
Tenant opens payment link → Tenant submits amount + BSA identity →
ACH or wire originated to landlord bank account → Confirmation issued
```

**Property Setup:**

Landlords provide their receiving bank routing number, account number, and bank name. A `management_token_hash` is generated and returned — this token is required for landlords to view payment history for their property. The token is never stored in plaintext.

**Tenant Payment:**

Tenants submit:
- Payment amount (min $10, max $25,000)
- Full legal name, date of birth, country (BSA)
- Transfer type (ACH or wire)

BSA fields are hashed before persistence. Payment is originated via Increase to the landlord's registered bank account.

**Key API Endpoints:**

| Method | Endpoint | Access | Function |
|---|---|---|---|
| POST | `/api/axiom-rail/rent/setup` | Authenticated | Register property |
| GET | `/api/axiom-rail/rent/[slug]` | Public | Property payment page data |
| POST | `/api/axiom-rail/rent/pay` | Rate-limited | Submit tenant payment |
| GET | `/api/axiom-rail/rent/dashboard` | Management token | Payment history for property |

**Fee Structure:**

| Fee | Amount |
|---|---|
| Flat fee | $0.50 |
| Variable fee | 0.10% of payment amount |
| Domestic wire surcharge | $15.00 |

**Database Schema (axiom_rail_rent_properties):**

```sql
id                    UUID PRIMARY KEY
slug                  VARCHAR(100) NOT NULL UNIQUE
landlord_name         VARCHAR(200) NOT NULL
property_address      TEXT NOT NULL
receiving_bank_routing VARCHAR(9) NOT NULL
receiving_bank_account VARCHAR(30) NOT NULL
receiving_bank_name   VARCHAR(200) NOT NULL
default_rent_amount   NUMERIC
management_token_hash VARCHAR(256) NOT NULL
```

---

### 4.3 Escrow Service

**Product:** A party-token-gated programmable escrow system for conditional USD transfers. Designed for security deposits, earnest money, milestone payments, and bilateral settlement between counterparties who do not have a pre-existing trust relationship.

**Architecture:**

The escrow system is built as a deterministic state machine with six states. Access to escrow data is gated by "Party Tokens" — long-form random tokens distributed at creation time. Tokens are SHA-256 hashed before persistence; the raw values are returned once at creation and unrecoverable thereafter. Constant-time hash comparison prevents timing attacks.

**State Machine:**

```
pending_funding → funded → releasing → released
                         → disputed  → releasing → released
                                     → cancelled
```

**Bilateral Approval Integrity:**

The creation endpoint returns only the initiator's token. The counterparty token is delivered exclusively via Resend email to the registered counterparty email address — the initiator cannot perform both approvals. This enforces true two-party bilateral authorization at the API level.

**Release Conditions (three mechanisms):**

| Condition | Trigger | Guard |
|---|---|---|
| `bilateral_approval` | Both parties approve | State must be `funded`; both tokens must approve separately |
| `deadline` | Automated cron / admin | Only for `funded` + `deadline` escrows; no user approval path |
| `admin_resolution` | Admin key | Only valid from `disputed` state |

**Fund Custody Control:**

The `/fund` endpoint is admin-only. Party tokens cannot confirm funding. Funding is confirmed only by: (a) the Axiom Rail monitor after detecting a verified inbound settlement, or (b) an admin after manual reconciliation with a settlement reference. This prevents self-reported funding fraud.

**Key API Endpoints:**

| Method | Endpoint | Access | Function |
|---|---|---|---|
| POST | `/api/axiom-rail/escrow/create` | Rate-limited | Create escrow, return initiator token |
| GET | `/api/axiom-rail/escrow/[id]` | Public | Display-safe escrow status |
| POST | `/api/axiom-rail/escrow/[id]/fund` | Admin key | Confirm receipt of funds |
| POST | `/api/axiom-rail/escrow/[id]/approve` | Party token | Submit bilateral approval |
| POST | `/api/axiom-rail/escrow/[id]/dispute` | Party token | Raise dispute (funded only) |
| POST | `/api/axiom-rail/escrow/[id]/resolve` | Admin key | Resolve dispute, trigger release |
| GET | `/api/axiom-rail/escrow/dashboard` | Party token | List escrows for token holder |
| GET | `/api/axiom-rail/escrow/process-deadlines` | Admin cron | Auto-release deadline escrows |

**Release Purposes (escrow_purpose enum):**

`security_deposit` | `earnest_money` | `milestone_payment` | `general_payment` | `rental_advance` | `service_agreement`

**Database Schema (axiom_rail_escrows):**

```sql
id                    UUID PRIMARY KEY
purpose               escrow_purpose NOT NULL
release_condition     escrow_release_condition NOT NULL
status                escrow_status NOT NULL DEFAULT 'pending_funding'
amount_usd            NUMERIC NOT NULL
initiator_token_hash  VARCHAR(64) NOT NULL
counterparty_email    VARCHAR(256) NOT NULL  -- excluded from public API response
counterparty_token_hash VARCHAR(64) NOT NULL
initiator_approved    BOOLEAN DEFAULT FALSE
counterparty_approved BOOLEAN DEFAULT FALSE
settlement_reference  VARCHAR(200)
deadline              TIMESTAMP
funded_at             TIMESTAMP
released_at           TIMESTAMP
created_at            TIMESTAMP NOT NULL
```

---

## 5. Community Finance Layer — Wealth Practice

The Wealth Practice is the Axiom Protocol's community finance engine, formalizing the rotating savings and lending traditions of diaspora communities (historically known as Susu, Pardner, Chit Fund, and similar models) into a trust-pipeline architecture with structured peer lending.

### 5.1 Group Economics & Trust Pipeline

The Wealth Practice organizes participants into purpose-defined groups with three-stage trust progression:

| Stage | Description | Capabilities |
|---|---|---|
| Stage 1 — Formation | Group created, members invited | Contribution commitment, insurance hold deposit |
| Stage 2 — Active | Members have established contribution history | Peer loan requests, payout rotation eligibility |
| Stage 3 — Seasoned | Extended track record, low default history | Expanded loan limits, protocol-level reputation |

Each group has a defined `contribution_amount`, `cycle_length_days`, `rotation_method` (round-robin or bid), and `creator_wallet`. Insurance holds are tracked through the `increase_insurance_holds` table, where members deposit a required hold amount before the group becomes active.

### 5.2 Peer Lending Module

**Product:** SIWE-gated peer lending within active Wealth Practice groups. Members may request loans funded by other group members, with interest allocated proportionally to pledgers.

**Access Control Architecture:**

- All mutation endpoints derive the actor identity from the SIWE session — no body-supplied IDs
- `GET /api/wealth-practice/loans/group/[groupId]` requires active group membership verification before returning any loan data — prevents enumeration by non-members
- Loan creation is restricted to group members with active status
- Default action (payout routing) is restricted to the group `creator_wallet` only

**Loan Mechanics:**

| Parameter | Detail |
|---|---|
| Minimum loan amount | $10.00 |
| Maximum loan amount | $50,000.00 |
| Interest rate | Group-defined |
| Repayment structure | Installment; allocated to pledgers proportionally |
| Collateral | None (trust-based); insurance hold covers partial exposure |

**Repayment Allocation Formula:**

```
pledger_allocation = actual_repayment × (pledger_amount / total_pledged)
```

Interest is applied once during allocation — not compounded. The formula is enforced at the API level to prevent over-allocation.

**Bank Credential Storage:**

Borrower bank routing and account numbers are encrypted at rest using AES-256-GCM with a 32-byte key stored as an environment secret (`BANK_ENCRYPTION_KEY`). The encryption layer throws in non-development environments if the key is absent — there is no silent fallback to plaintext in production.

**Stellar Rail Integration:**

Loan disbursements and repayments that flow through Axiom Rail use the `sep_protocol` field value `peer-repay` (constrained to VARCHAR(10) to fit the Stellar transfer table schema).

**Key API Endpoints:**

| Method | Endpoint | Access | Function |
|---|---|---|---|
| POST | `/api/wealth-practice/loans/request` | SIWE + group member | Create loan request |
| POST | `/api/wealth-practice/loans/[id]/pledge` | SIWE + group member | Fund a portion of a loan |
| GET | `/api/wealth-practice/loans/group/[groupId]` | SIWE + verified member | List loans for group |
| POST | `/api/wealth-practice/loans/[id]/repay` | SIWE session | Submit repayment |

**Loan State Machine:**

```
pending → open (on first pledge) → partially_funded → funded → active →
repaying → completed
         → defaulted
```

---

## 6. Reserve & Monetary Infrastructure

### AXUSD — Settlement Stablecoin (ERC-3643)

AXUSD is the Axiom Protocol's primary settlement stablecoin, implemented as an ERC-3643 compliant token on Arbitrum One. It serves as the unit of account across all on-chain protocol operations, including yield savings deposits, peer loan denominations, and on-chain treasury accounting.

**Key Properties:**

- **Standard:** ERC-3643 (permissioned token with on-chain identity verification)
- **Reserve backing:** USD-equivalent assets held in regulated custody
- **Oracle:** ERC-7726 compliant oracle infrastructure for AXUSD pricing
- **Yield integration:** ERC-4626 compatible vault interface through Euler V2

### AXAU — Reserve Instrument

AXAU is the protocol's physical-world reserve instrument, backed by allocated gold through PAXG and priced by the LandNAV Oracle. AXUSD holders may purchase AXAU at the current oracle price through the AXAU purchase flow, which is managed through an operational queue with admin fulfillment.

### Reserve Monitoring

The solvency and reserve transparency system (`/solvency`) publishes real-time reserve metrics through three operational modes:

| Mode | Description |
|---|---|
| Normal | Coverage ratio ≥ required minimum |
| Watch | Coverage ratio within 10% of minimum threshold |
| Hard Brake | Coverage ratio below threshold; new commitments paused |

**Key Metrics Tracked:**

- Coverage Ratio (CR): Total Reserve Value / Total AXUSD Supply
- Reserve Ratio (RR): Liquid reserves / 30-day average outflows
- Liquidity Buffer Ratio (LBR): Immediate liquid assets / 7-day projected demand
- Liability Density (LD): Total liabilities / Total reserve assets

---

## 7. Compliance & Risk Framework

### Regulatory Positioning

The Axiom Protocol is designed to align with the GENIUS Act framework for payment stablecoins. All definitive legal conclusions regarding token classification are deferred to qualified legal counsel. The following structures reflect the protocol's compliance posture as of April 2026:

| Area | Structure |
|---|---|
| USD banking | FDIC-insured, operated through Increase + First Internet Bank |
| KYC/AML | Increase-managed onboarding for banking products |
| BSA compliance | SHA-256 hashed identity fields per BSA record requirements |
| Securities | Lending Fund operates under SEC Reg D 506(c) private placement exemption |
| Stablecoin | AXUSD designed to align with GENIUS Act payment stablecoin guidelines |
| Sanctions screening | Circle compliance API for on-chain wallet screening |

### Risk Architecture

**Collateral Risk (Credit Line):**

LTV is monitored in real time using CoinGecko price feeds. Warning notifications are issued at 70% LTV. Operator review is triggered at 85% LTV. BitGo CaaS provides institutional-grade collateral custody with documented liquidation procedures.

**Counterparty Risk (Escrow):**

Funds cannot be released without verified bilateral approval or admin override. The funding custody model prevents self-reported fund receipt — all funding confirmation flows through the Axiom Rail monitor or admin action.

**Operational Risk (Payroll / Rent):**

All ACH and wire originations use deterministic idempotency keys computed from the run ID and recipient parameters. Duplicate origination is rejected at the Increase API level and at the protocol database level.

**Smart Contract Risk:**

On-chain yield vault operations (savings) use the audited Euler V2 lending protocol on Arbitrum One. Axiom Protocol does not operate or modify the vault contracts.

**Peer Lending Risk:**

Peer loans are trust-based within group structures. Insurance holds provide partial collateral coverage. The protocol does not guarantee peer loan repayment. Exposure is bounded by the group's insurance hold balance per participant.

---

## 8. Data Architecture & Persistence Layer

All protocol data is persisted in a PostgreSQL database provisioned through Neon, with schema management via Drizzle ORM. The database schema is version-controlled through `instrumentation.ts`, which runs idempotently on every server start using `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` patterns.

### Schema Inventory (Banking & Rail tables)

| Table | Purpose |
|---|---|
| `increase_participants` | Core participant registry; links wallet to banking identity |
| `increase_insurance_holds` | Wealth Practice group insurance deposits |
| `increase_lp_deposits` | Lending Fund LP capital deposits |
| `increase_distributions` | Protocol distributions to participants |
| `increase_product_escrows` | Product-level escrow tracking (earnest money, etc.) |
| `inbound_ach_events` | Direct deposit receipt events from Increase webhooks |
| `bridge_conversion_requests` | Fiat ↔ AXUSD conversion queue |
| `axiom_rail_payroll_runs` | DAO payroll batch run records |
| `axiom_rail_payroll_recipients` | Individual payroll recipients per run |
| `axiom_rail_rent_properties` | Registered landlord properties |
| `axiom_rail_escrows` | Escrow state machine records |
| `savings_positions` | On-chain AXUSD savings vault positions |
| `dao_account_applications` | DAO operating account applications |
| `crypto_credit_lines` | Crypto-backed credit line records |
| `stellar_payment_transfers` | Stellar SEP transfer records |
| `circle_screening_results` | On-chain wallet compliance screening |

### Instrumentation Integrity

The `instrumentation.ts` file is the single authoritative source for database schema definition. It ensures that any fresh deployment — including production autoscale instances — starts with a fully provisioned database without requiring manual migration steps. Every table and every `ALTER TABLE` column addition is tracked in this file.

---

## 9. Custody Model

Axiom Protocol employs a hybrid custody model designed to maintain participant self-custody for on-chain assets while using regulated institutional custody for fiat and collateral.

| Asset Type | Custody Model | Custodian |
|---|---|---|
| AXUSD (on-chain) | Self-custody | Participant's wallet |
| AXAU (on-chain) | Self-custody | Participant's wallet |
| AXM governance token | Self-custody | Participant's wallet |
| Euler V2 vault shares | Self-custody | Participant's wallet (via on-chain tx) |
| USD deposits | Institutional | First Internet Bank (FDIC-insured, $250k/participant) |
| BTC/ETH collateral | Institutional | BitGo CaaS (regulated, insured) |
| USDC (rail transit) | Institutional | Stellar anchor (transient) |
| DAO operating USD | Institutional | First Internet Bank via Increase |

---

## 10. Fee Schedule

All fees are assessed at the time of transaction. No subscription or account maintenance fees apply to core banking products.

### Banking Products (Axiom Nexus)

| Product | Fee |
|---|---|
| Nexus Card | $0 — standard Visa/Mastercard interchange |
| Early Direct Deposit | $0 — no fee to participants |
| DAO Operating Account | $0 — no monthly fee |
| AXUSD Savings | $0 — yield is net of Euler V2 protocol fees |

### Credit Line

| Fee | Amount |
|---|---|
| Interest rate | 8.0% APR on drawn balance |
| Origination | $0 |
| Liquidation penalty | Per collateral agreement |

### Axiom Rail

| Fee | Amount |
|---|---|
| ACH flat fee (per transaction) | $0.50 |
| ACH variable fee | 0.10% of gross amount |
| Domestic wire surcharge | $15.00 per wire |
| Minimum transaction | $10.00 |
| Maximum transaction | $25,000.00 |

*Applies to: DAO Payroll, Rent Collection, and Escrow settlement.*

---

## 11. Glossary of Approved Terms

This glossary defines Axiom Protocol's institutional vocabulary. Technical terms used in this document align with the canonical definitions in `lib/glossary.ts`.

| Protocol Term | Definition | Avoided Term |
|---|---|---|
| Automated control layer | Protocol logic executed by on-chain programs | Smart contract |
| Multi-party authorization | Threshold signature or multi-approval governance | Multi-sig |
| On-chain financial rails | Permissioned blockchain-based payment and settlement | DeFi |
| Asset onboarding / issuance | Registering a real-world asset on-chain | Tokenization |
| Participation lockup | Time-bounded capital commitment | Staking |
| Variable yield | Protocol-derived, market-determined rate | APY guarantee |
| FDIC-insured banking rails | USD custody through First Internet Bank / Increase | Crypto bank |
| On-chain identity verification | ERC-3643 compliant KYC-linked wallet credential | Wallet whitelist |
| Coverage ratio | Total reserve value / total stablecoin supply | Backing ratio |
| Trust pipeline | Three-stage group trust progression in Wealth Practice | ROSCA / Susu |
| Wealth Practice | Axiom's community group savings and lending program | SUSU / Savings Circle |

---

*Document generated April 2026. This document reflects the operational state of the Axiom Protocol platform as deployed. Product parameters, fee structures, and regulatory posture are subject to revision. For the most current technical specifications, refer to the live codebase and the Axiom Protocol Disclosure page at `/disclosure`.*

*Axiom Protocol LLC — All rights reserved.*
