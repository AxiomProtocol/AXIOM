# Unit Banking + BitGo CaaS — Unified Financial Infrastructure Plan

## Overview

Build a unified financial infrastructure layer integrating **Unit Banking** (fiat rails — FDIC-insured accounts, ACH, debit cards, KYC) and **BitGo CaaS** (crypto custody — institutional wallets, on/off ramps, staking, multi-sig treasury) into Axiom Protocol. Unit handles fiat. BitGo handles crypto custody. A bridge layer connects them so users can move seamlessly between fiat bank accounts and on-chain assets.

## Master Roadmap Alignment

This integration touches multiple phases of the master roadmap (`08_Financial_OS_Master_Roadmap.md`):
- **T015** (Fiat On-Ramp) — replaced by Unit ACH + Bridge fiat-to-crypto flow
- **T017** (Payment Scheduling) — powered by Unit recurring ACH payments
- **T025** (P2P Payments) — powered by Unit book payments (instant, zero-fee internal transfers)
- **T021** (Savings Products) — powered by Unit FDIC-insured deposit accounts
- **T033** (Multi-Sig Treasury) — powered by BitGo multi-sig custody policies and approval workflows
- **T044** (Remittance Corridors) — infrastructure backbone provided by Bridge + Unit ACH + BitGo cross-chain
- **T046** (Cross-Chain Settlement) — infrastructure backbone provided by BitGo multi-chain wallets + Bridge
- **T016** (Multi-Currency Settlement) — FX snapshots and bridge conversion records provide audit trail

## Architecture

```
                    AXIOM PROTOCOL
                         |
          +--------------+--------------+
          |                             |
     UNIT BANKING                 BITGO CaaS
     (Fiat Rails)              (Crypto Custody)
          |                             |
  +-------+-------+           +--------+--------+
  |   |   |   |   |           |    |    |    |   |
  KYC ACH Cards   |        Wallets Send  Multi  |
      |   |    Recurring      |    |    Sig   Staking
      |   |    Payments    Deposit  |   Approval
      |   |                Address  |   Queue
      |   |                         |
      +---+-------BRIDGE-----------+
              Fiat <-> Crypto
           (ACH settle -> token allocate)
           (Crypto lock -> ACH credit)
```

## Existing Codebase Patterns

All new code must follow these established patterns:

- **DB tables**: Raw SQL `CREATE TABLE IF NOT EXISTS` in `instrumentation.ts` (NOT Drizzle migrations)
- **Drizzle schemas**: Separate files under `shared/` (e.g., `shared/unitSchema.ts`, `shared/bitgoSchema.ts`)
- **Auth**: `getSIWESession(req)` or `withSIWEAuth(handler)` from `lib/middleware/siweAuth.ts`
- **Services**: Class-based under `lib/services/`
- **API routes**: `pages/api/`
- **All pages**: `<DesignLawLayout>` wrapper with Design Law styling
- **Env vars gated**: If missing, service is a graceful no-op (console.warn, not throw)

## Credentials Required

**Unit Banking (4 secrets):**
- `UNIT_API_TOKEN` — API token from Unit dashboard
- `UNIT_API_URL` — `https://api.s.unit.sh` (sandbox) or `https://api.unit.co` (live)
- `UNIT_WEBHOOK_SECRET` — HMAC secret for webhook signature verification
- `UNIT_ORG_ID` — Unit organization ID

**BitGo CaaS (3 secrets):**
- `BITGO_ACCESS_TOKEN` — API access token from BitGo dashboard
- `BITGO_API_URL` — `https://app.bitgo-test.com` (test) or `https://app.bitgo.com` (live)
- `BITGO_ENTERPRISE_ID` — BitGo enterprise ID

## Reference Specs

- Full Unit implementation spec: `attached_assets/Axiom_Unit_Replit_Prompt_1773205479217.md` (1,662 lines)
- BitGo developer docs: `https://developers.bitgo.com/docs/crypto-as-a-service-overview`

---

## Tasks

### T001: Install SDKs + Create Client Modules + Request Credentials
- **Blocked By**: []
- **Details**:
  - Install `@unit-finance/unit-node-sdk` and `bitgo` npm packages
  - Request 7 environment secrets from user (4 Unit + 3 BitGo)
  - Create `lib/unit/client.ts` — Unit API config singleton, gated on `UNIT_API_TOKEN`
  - Create `lib/unit/helpers.ts` — centsToDollars, dollarsToCents, formatUnitAmount, mapApplicationStatus, unitHeaders
  - Create `lib/unit/sandbox.ts` — sandbox simulation helpers (simulateIncomingAch, approveApplication), gated to non-production
  - Create `lib/bitgo/client.ts` — BitGo SDK singleton, gated on `BITGO_ACCESS_TOKEN`, configured for test or production based on `BITGO_API_URL`
  - Create `lib/bitgo/helpers.ts` — satoshiToUnit conversions, chain ID mapping (Arbitrum to `tarbitrum`/`arbitrum`), address validation
  - All clients gracefully no-op if credentials missing (console.warn, not throw)
  - Files: `lib/unit/client.ts`, `lib/unit/helpers.ts`, `lib/unit/sandbox.ts`, `lib/bitgo/client.ts`, `lib/bitgo/helpers.ts` (all new)
  - Acceptance: Both SDKs install. Client modules export configs. No crash if env vars missing.

### T002: Database Schemas + Instrumentation Registration
- **Blocked By**: [T001]
- **Details**:
  - Create `shared/unitSchema.ts` with 6 tables:
    - `unit_customers` — KYC/customer records linked to wallet address
    - `unit_accounts` — FDIC-insured deposit accounts (member accounts + Wealth Practice pool accounts)
    - `unit_payments` — ACH and book payment records with purpose tags
    - `unit_recurring_payments` — scheduled recurring ACH payments
    - `unit_cards` — virtual and physical debit cards
    - `unit_webhook_events` — webhook event audit trail
  - Create `shared/bitgoSchema.ts` with 5 tables:
    - `bitgo_wallets` — segregated custody wallets per user
    - `bitgo_transactions` — send/receive/trade records
    - `bitgo_webhooks` — BitGo event audit trail
    - `bitgo_custody_policies` — spending policies, whitelist addresses, velocity limits
    - `bitgo_staking_positions` — staking delegation records
  - Create `shared/bridgeSchema.ts` with 2 tables:
    - `bridge_transfers` — fiat-to-crypto movement records with multi-step status tracking (initiated, ach_pending, ach_settled, crypto_pending, completed, failed)
    - `bridge_fx_snapshots` — FX rate at time of conversion for compliance audit
  - Register all 13 tables in `instrumentation.ts` using existing `CREATE TABLE IF NOT EXISTS` pattern with proper indexes
  - Use UUID primary keys matching existing project pattern
  - Files: `shared/unitSchema.ts`, `shared/bitgoSchema.ts`, `shared/bridgeSchema.ts` (all new), `instrumentation.ts` (edit)
  - Acceptance: All 13 tables auto-create on server start, no errors, proper indexes

### T003: Unit Customer Service (KYC + Onboarding)
- **Blocked By**: [T002]
- **Details**:
  - Create `lib/services/UnitCustomerService.ts` per the Unit spec with methods:
    - `createIndividualApplication()` — submits KYC to Unit API, upserts `unit_customers` row (SSN passed to Unit directly, only last 4 stored locally)
    - `getApplicationStatus()` — fetches live status from Unit if not yet approved, updates local DB
    - `getCustomer()` — gets customer by wallet address
    - `isApproved()` — boolean check for feature gating
  - Uses `getSIWESession`-derived wallet address as the customer identifier
  - Files: `lib/services/UnitCustomerService.ts` (new)
  - Acceptance: Creates Unit applications, polls status, stores records correctly

### T004: Unit Account + Payment + Card Services
- **Blocked By**: [T003]
- **Details**:
  - Create `lib/services/UnitAccountService.ts`:
    - `createMemberAccount()` — standard checking deposit account for KYC-approved customer
    - `createSusuPoolAccount()` — savings account linked to Wealth Practice group (uses existing `susu_purpose_groups` ID)
    - `syncBalance()` — fetch live balance from Unit, update local DB
    - `getAccountsForWallet()` — list all accounts for a wallet
    - `getAccountWithBalance()` — get account with synced balance
    - `getSusuPoolAccount()` — get pool account for a Wealth Practice group
    - `getTransactions()` — fetch transaction history from Unit
  - Create `lib/services/UnitPaymentService.ts`:
    - `createBookPayment()` — instant internal transfer (P2P, Wealth Practice payouts) with idempotency keys
    - `createAchDebit()` — pull money from external bank into Unit account
    - `createRecurringPayment()` — automated recurring ACH (Wealth Practice contributions, aligns with master roadmap T017)
    - `cancelRecurringPayment()` — cancel a recurring payment schedule
    - `processSusuPayout()` — wraps book payment for Wealth Practice cycle rotation payout
    - `collectSusuContribution()` — wraps book payment for member contributions to group pool
  - Create `lib/services/UnitCardService.ts`:
    - `issueVirtualCard()` — instant virtual debit card for KYC-approved customer
    - `issuePhysicalCard()` — physical card with shipping address
    - `freezeCard()` / `unfreezeCard()` — card controls
    - `getCardsForWallet()` — list all cards for a wallet
  - Files: `lib/services/UnitAccountService.ts`, `lib/services/UnitPaymentService.ts`, `lib/services/UnitCardService.ts` (all new)
  - Acceptance: All Unit banking operations work end-to-end through service layer

### T005: BitGo Wallet + Transaction Services
- **Blocked By**: [T002]
- **Details**:
  - Create `lib/services/BitGoWalletService.ts`:
    - `createUserWallet()` — create segregated custody wallet for a user (tagged with Axiom wallet address)
    - `getWallet()` — fetch wallet details + balances for AXM, AXUSD, ETH on Arbitrum
    - `getWalletsForUser()` — list all custody wallets for a wallet address
    - `getDepositAddress()` — generate deposit address for a wallet
    - `getTransactionHistory()` — fetch transaction list from BitGo
  - Create `lib/services/BitGoTransactionService.ts`:
    - `sendTransaction()` — initiate crypto send (AXM, AXUSD, ETH) with policy checks
    - `getTransactionStatus()` — track tx through BitGo's approval flow
    - `createTreasuryTransfer()` — multi-sig treasury operation (maps to master roadmap T033 multi-sig workflow)
  - Create `lib/services/BitGoCustodyService.ts`:
    - `setSpendingPolicy()` — configure per-wallet spending limits, whitelist addresses, velocity limits
    - `getPendingApprovals()` — list transactions awaiting multi-sig approval
    - `approveTransaction()` / `rejectTransaction()` — multi-sig approval actions
  - All services tagged with `platform: 'axiom-protocol'` and `axiomWallet` for cross-reference
  - Files: `lib/services/BitGoWalletService.ts`, `lib/services/BitGoTransactionService.ts`, `lib/services/BitGoCustodyService.ts` (all new)
  - Acceptance: Can create wallets, send transactions, manage policies, handle multi-sig approvals

### T006: Fiat-to-Crypto Bridge Service
- **Blocked By**: [T004, T005]
- **Details**:
  - Create `lib/services/BridgeService.ts` — the unified layer connecting Unit (fiat) to BitGo (crypto):
    - `fiatToCrypto()` — user deposits USD via ACH (Unit) then converts to AXUSD/AXM in BitGo custody wallet
      - Step 1: ACH debit from Unit account
      - Step 2: Record bridge transfer as 'initiated'
      - Step 3: On ACH settlement webhook, trigger BitGo token allocation
      - Step 4: Update bridge transfer to 'completed'
    - `cryptoToFiat()` — user withdraws crypto from BitGo custody then settles to Unit bank account via ACH credit
      - Step 1: Lock crypto in BitGo
      - Step 2: Initiate ACH credit to Unit account
      - Step 3: On settlement, release/burn crypto
    - `getBridgeQuote()` — returns estimated fees, settlement time, and FX rate for a fiat-to-crypto conversion
    - `getBridgeHistory()` — user's conversion history with statuses
    - `syncBridgeStatus()` — polls both Unit and BitGo for in-flight transfer statuses
  - Store conversion rates in `bridge_fx_snapshots` for compliance audit trail
  - Track each transfer in `bridge_transfers` with statuses: initiated, ach_pending, ach_settled, crypto_pending, completed (or failed at any step)
  - This replaces the placeholder fiat on-ramp (master roadmap T015) with a real integrated solution
  - Files: `lib/services/BridgeService.ts` (new)
  - Acceptance: Users can move money between fiat bank accounts and on-chain crypto custody, with full status tracking and audit trail

### T007: All API Routes (Unit + BitGo + Bridge)
- **Blocked By**: [T006]
- **Details**:
  - **Unit routes** (`pages/api/unit/`):
    - `webhook.ts` — webhook handler with HMAC signature verification, raw body parsing, event storage, handlers for application.approved/denied, payment.sent/cleared/rejected/returned
    - `onboard.ts` — POST KYC application (uses `withSIWEAuth`)
    - `status.ts` — GET KYC + accounts status
    - `accounts/create.ts` — POST create deposit or Wealth Practice pool account
    - `accounts/[accountId]/transactions.ts` — GET transaction history
    - `payments/send.ts` — POST book payment (P2P / Wealth Practice)
    - `payments/recurring.ts` — POST/DELETE recurring ACH
    - `cards/issue.ts` — POST issue virtual or physical card
    - `cards/[cardId]/freeze.ts` — POST freeze/unfreeze
  - **BitGo routes** (`pages/api/bitgo/`):
    - `webhook.ts` — webhook handler for BitGo events (transfer confirmations, policy triggers)
    - `wallets/create.ts` — POST create custody wallet
    - `wallets/[walletId]/balance.ts` — GET wallet balances
    - `wallets/[walletId]/transactions.ts` — GET transaction history
    - `send.ts` — POST send crypto transaction
    - `treasury/pending.ts` — GET pending multi-sig approvals
    - `treasury/approve.ts` — POST approve/reject transaction
  - **Bridge routes** (`pages/api/bridge/`):
    - `quote.ts` — POST get fiat-to-crypto conversion quote
    - `transfer.ts` — POST initiate bridge transfer
    - `history.ts` — GET user's bridge transfer history
    - `status/[id].ts` — GET specific transfer status
  - **Sandbox** (`pages/api/dev/`):
    - `unit-sandbox.ts` — sandbox testing endpoint (disabled in production)
  - All routes use `withSIWEAuth` or `getSIWESession` for wallet-based auth
  - Files: approximately 20 new API route files
  - Acceptance: All endpoints respond correctly, webhooks process events, sandbox works in dev

### T008: Banking Dashboard Frontend
- **Blocked By**: [T007]
- **Details**:
  - Create `pages/banking/index.tsx` — unified banking dashboard wrapped in `<DesignLawLayout>` (Design Law styling)
  - **5 tabbed sections:**
    1. **Identity Verification** — Multi-step KYC form (name, email, phone, DOB, masked SSN, address). Status polling after submission. States: Not Started, Submitting, Under Review, Approved, Needs Documents
    2. **Axiom Account** — FDIC-insured balance card with masked routing/account numbers, "Fund Account" ACH flow, recent transactions list, "Create Account" CTA if none exists
    3. **Wealth Practice Pool** — Active pools user belongs to, pool balance, "Contribute Now" (instant book payment), "Set Up Auto-Contribute" (recurring ACH), pool transaction history
    4. **Crypto Custody** — BitGo custody wallet balances (AXM, AXUSD, ETH), deposit address with QR code, send form, transaction history, pending multi-sig approvals
    5. **Bridge** — Fiat-to-Crypto converter. Select direction, enter amount, see quote (fees + FX + settlement time), confirm transfer, track status. Transfer history table.
  - Create 8 components under `components/banking/`:
    - `KycForm.tsx` — multi-step KYC form with masked SSN, validation, status polling
    - `AccountCard.tsx` — balance display with masked routing/account numbers
    - `WealthPoolCard.tsx` — Wealth Practice group pool display with contribute/auto-contribute actions
    - `CustodyWalletCard.tsx` — BitGo wallet balances + deposit address with QR
    - `BridgeWidget.tsx` — fiat-to-crypto conversion widget with quote and confirmation
    - `CardDisplay.tsx` — debit card visual with freeze/unfreeze controls
    - `TransactionList.tsx` — shared transaction history component (used by accounts, custody, bridge)
    - `PendingApprovals.tsx` — multi-sig approval queue for treasury operations
  - Add "Banking" to Products dropdown in `components/design-law/navItems.ts`
  - Files: `pages/banking/index.tsx` (new), 8 component files under `components/banking/` (new), `components/design-law/navItems.ts` (edit)
  - Acceptance: All 5 tabs render, KYC form submits, account displays balance, custody wallet shows balances with deposit address, bridge converts with quotes, card visual renders with controls, nav entry added

### T009: Rate Limiting, Validation, Documentation
- **Blocked By**: [T007]
- **Details**:
  - Apply rate limiting to all `/api/unit/*`, `/api/bitgo/*`, `/api/bridge/*` routes:
    - Strict tier (10 req/min): payment, send, transfer, card endpoints
    - Default tier (60 req/min): read/status endpoints
    - Auth tier (5 req/min): onboard/KYC endpoints
  - Input validation on all routes:
    - Dollar amounts: positive, max $10,000 sandbox / $50,000 production
    - Crypto amounts: positive, reasonable bounds
    - Account/wallet IDs: format validated
    - SSN: format validated before sending to Unit, never logged
    - Addresses: basic Ethereum address validation
  - Create `docs/unit-bitgo-integration.md`:
    - Architecture overview with ASCII diagram
    - How Unit and BitGo map to each Axiom product
    - Sandbox testing guide (how to use sandbox simulation utilities)
    - Environment variable reference (all 7 secrets)
    - Webhook event types and what they trigger in the system
    - Bridge flow diagrams (fiat-to-crypto and crypto-to-fiat step by step)
    - Go-live checklist: what changes from sandbox to live (API URLs and tokens only, no code changes)
  - Update `replit.md` with Unit Banking + BitGo CaaS integration details, new file locations, env var requirements
  - Files: API route files (edit for rate limiting), `docs/unit-bitgo-integration.md` (new), `replit.md` (edit)
  - Acceptance: Rate limiting active on all banking routes, validation rejects bad input, documentation complete, replit.md updated

---

## Dependency Graph

```
T001 (SDKs + Clients)
  |
  v
T002 (Database Schemas)
  |
  +---------+---------+
  |                   |
  v                   v
T003 (Unit KYC)     T005 (BitGo Wallets)
  |                   |
  v                   |
T004 (Unit Accounts   |
  + Payments + Cards) |
  |                   |
  +---------+---------+
            |
            v
       T006 (Bridge)
            |
            v
       T007 (API Routes)
            |
      +-----+-----+
      |           |
      v           v
T008 (Frontend) T009 (Security + Docs)
```

## New Files Summary

**Client modules (5 files):**
- `lib/unit/client.ts`
- `lib/unit/helpers.ts`
- `lib/unit/sandbox.ts`
- `lib/bitgo/client.ts`
- `lib/bitgo/helpers.ts`

**Database schemas (3 files):**
- `shared/unitSchema.ts` (6 tables)
- `shared/bitgoSchema.ts` (5 tables)
- `shared/bridgeSchema.ts` (2 tables)

**Service layer (8 files):**
- `lib/services/UnitCustomerService.ts`
- `lib/services/UnitAccountService.ts`
- `lib/services/UnitPaymentService.ts`
- `lib/services/UnitCardService.ts`
- `lib/services/BitGoWalletService.ts`
- `lib/services/BitGoTransactionService.ts`
- `lib/services/BitGoCustodyService.ts`
- `lib/services/BridgeService.ts`

**API routes (approximately 21 files):**
- `pages/api/unit/webhook.ts`
- `pages/api/unit/onboard.ts`
- `pages/api/unit/status.ts`
- `pages/api/unit/accounts/create.ts`
- `pages/api/unit/accounts/[accountId]/transactions.ts`
- `pages/api/unit/payments/send.ts`
- `pages/api/unit/payments/recurring.ts`
- `pages/api/unit/cards/issue.ts`
- `pages/api/unit/cards/[cardId]/freeze.ts`
- `pages/api/bitgo/webhook.ts`
- `pages/api/bitgo/wallets/create.ts`
- `pages/api/bitgo/wallets/[walletId]/balance.ts`
- `pages/api/bitgo/wallets/[walletId]/transactions.ts`
- `pages/api/bitgo/send.ts`
- `pages/api/bitgo/treasury/pending.ts`
- `pages/api/bitgo/treasury/approve.ts`
- `pages/api/bridge/quote.ts`
- `pages/api/bridge/transfer.ts`
- `pages/api/bridge/history.ts`
- `pages/api/bridge/status/[id].ts`
- `pages/api/dev/unit-sandbox.ts`

**Frontend (9 files):**
- `pages/banking/index.tsx`
- `components/banking/KycForm.tsx`
- `components/banking/AccountCard.tsx`
- `components/banking/WealthPoolCard.tsx`
- `components/banking/CustodyWalletCard.tsx`
- `components/banking/BridgeWidget.tsx`
- `components/banking/CardDisplay.tsx`
- `components/banking/TransactionList.tsx`
- `components/banking/PendingApprovals.tsx`

**Documentation (1 file):**
- `docs/unit-bitgo-integration.md`

**Edited files:**
- `instrumentation.ts` (add 13 tables)
- `components/design-law/navItems.ts` (add Banking to Products)
- `replit.md` (update with integration details)

**Total: approximately 47 new files + 3 edited files**
