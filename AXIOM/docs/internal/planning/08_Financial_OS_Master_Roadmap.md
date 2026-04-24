# Objective
Transform Axiom Protocol into a full-fledged global financial operating system — a self-sovereign financial infrastructure with its own economic engine for global use. Integrates upgrades from OffchainLabs (Arbitrum) and ethereum.org open-source repos, builds complete economic infrastructure layers (money movement, credit, savings, insurance, payments, compliance, developer platform, analytics), and adds empire-tier capabilities: sovereign identity, AI agent economy, remittance corridors, institutional liquidity network, social financial graph, treasury-as-a-service, and cross-chain settlement.

# Tasks

---
## Phase 1: Technical Foundation (from OffchainLabs + ethereum.org)
---

### T001: Upgrade Wallet Connection — Wagmi + RainbowKit
- **Blocked By**: []
- **Details**:
  - Replace the custom MetaMask-only `WalletService.ts` + `WalletContext.tsx` with Wagmi v2 + RainbowKit
  - Install `@rainbow-me/rainbowkit`, ensure `wagmi` and `viem` (already in package.json) are at compatible versions
  - Create `lib/web3/wagmiConfig.ts` with Arbitrum One chain config, Alchemy transport (using existing ALCHEMY_API_KEY), and RainbowKit connectors (MetaMask, Coinbase Wallet, WalletConnect, injected)
  - Wrap `_app.tsx` in `WagmiProvider` + `QueryClientProvider` + `RainbowKitProvider`
  - Update `useWallet` hook to use Wagmi's `useAccount`, `useConnect`, `useDisconnect`, `useChainId`, `useSwitchChain`
  - Update the nav "Access Platform" / "Connect Wallet" button to use RainbowKit's `ConnectButton`
  - Preserve existing SIWE auth flow (`SIWEService.ts`) — trigger sign-in after RainbowKit connect
  - Update `ArbitrumContractsService.ts` to accept a Wagmi-provided signer via `useWalletClient` instead of direct `window.ethereum`
  - Files: `lib/web3/wagmiConfig.ts` (new), `pages/_app.tsx`, `components/WalletConnect/WalletContext.tsx`, `lib/services/WalletService.ts`, `lib/services/ArbitrumContractsService.ts`, `components/design-law/DesignLawLayout.tsx`
  - Acceptance: Users can connect with MetaMask, Coinbase Wallet, WalletConnect, and other injected wallets. Existing SIWE auth still works. Network switching to Arbitrum One still works.

### T002: Install @arbitrum/sdk for Cleaner On-Chain Interactions
- **Blocked By**: [T001]
- **Details**:
  - Install `@arbitrum/sdk` v4
  - Create `lib/arbitrum/sdk.ts` utility module wrapping key SDK features: network detection, gas estimation for L2 transactions, and cross-chain message status tracking
  - Integrate gas estimation into `ArbitrumContractsService.ts` for staking, PSM swaps, and token transfers — show estimated gas in USD before user confirms
  - Add a "Transaction Status" component that uses the SDK's `ParentToChildMessage` / `ChildToParentMessage` classes to track cross-chain message lifecycle (pending → confirmed → executed)
  - Files: `lib/arbitrum/sdk.ts` (new), `lib/services/ArbitrumContractsService.ts`, `lib/services/AXUSDTransactionService.ts`, `components/TransactionStatus.tsx` (new)
  - Acceptance: Gas estimates display before transactions. Cross-chain message tracking works for bridge operations.

### T003: Add L2 Ecosystem Data APIs (DefiLlama, L2Beat, GrowThePie)
- **Blocked By**: []
- **Details**:
  - Create `pages/api/ecosystem/arbitrum.ts` — server-side endpoint that fetches and caches (5-minute TTL via existing `getOrSetCache`) data from:
    - DefiLlama: `https://api.llama.fi/v2/historicalChainTvl/Arbitrum` (TVL)
    - L2Beat: `https://l2beat.com/api/scaling/summary` (Arbitrum One entry: maturity, risk)
    - GrowThePie: `https://api.growthepie.com/v1/fundamentals_7d.json` (tx count, active addresses, median tx cost for Arbitrum)
  - Add an "Arbitrum Ecosystem" card section to the Observer page (`pages/observer/index.tsx`) displaying: Network TVL, 7d Active Addresses, 7d Transaction Count, Median Transaction Cost, L2Beat Risk Assessment
  - Add Arbitrum network health context to the Sentinel page (`pages/sentinel/index.tsx`) — show TVL trend and network activity as additional inputs alongside MIRDT signals
  - Files: `pages/api/ecosystem/arbitrum.ts` (new), `pages/observer/index.tsx`, `pages/sentinel/index.tsx`
  - Acceptance: Observer shows live Arbitrum ecosystem metrics from 3 free APIs. Sentinel displays network health context. Data refreshes every 5 minutes with proper loading/error states.

### T004: Add Sentry Error Monitoring
- **Blocked By**: []
- **Details**:
  - Install `@sentry/nextjs`
  - Manually configure: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
  - Update `next.config.js` to wrap with `withSentryConfig`
  - Request `SENTRY_DSN` environment secret from user
  - Gate Sentry on presence of `SENTRY_DSN` — if not set, Sentry does not initialize (graceful no-op)
  - Add custom error boundary component wrapping key pages
  - Files: `sentry.client.config.ts` (new), `sentry.server.config.ts` (new), `sentry.edge.config.ts` (new), `next.config.js`, `instrumentation.ts`
  - Acceptance: Sentry captures unhandled errors in both client and server. Works in production deployment. Gracefully disabled if no DSN provided.

### T005: Universe L3 Preparation — Arbitrum Chain SDK + Orbit Config
- **Blocked By**: [T001, T002]
- **Details**:
  - Install `@arbitrum/chain-sdk`
  - Create `lib/arbitrum/universe-l3.ts` module with:
    - Universe L3 chain definition (chain ID, RPC, block explorer — placeholder values marked TODO until chain is live)
    - Network registration with `registerCustomArbitrumNetwork` from `@arbitrum/sdk`
    - Bridge configuration for AXM and AXUSD between Arbitrum One (L2) and Universe (L3)
  - Add Universe L3 to Wagmi chain config (from T001) as a secondary chain — disabled by default behind feature flag `UNIVERSE_L3_ENABLED`
  - Create `/universe` placeholder page showing L3 launch roadmap, chain specs, and bridge status
  - Reference `orbit-setup-script` patterns for validator and batch poster funding — document deployment checklist in code comments
  - Files: `lib/arbitrum/universe-l3.ts` (new), `lib/web3/wagmiConfig.ts`, `pages/universe/index.tsx` (new), `components/design-law/navItems.ts`
  - Acceptance: Universe L3 chain definition exists and is ready to activate. Wagmi config supports multi-chain switching. Placeholder page renders under Operations nav.

### T006: Fund Distribution Contract Integration
- **Blocked By**: [T002]
- **Details**:
  - Reference OffchainLabs `fund-distribution-contracts` RewardDistributor pattern
  - Create `lib/services/DistributionService.ts` modeling weighted fund distribution logic:
    - Define distribution recipients (investor profiles from syndication)
    - Calculate weighted payouts based on cap table ownership percentages
    - Generate distribution transaction batches
  - Add a "Distributions" tab to the Syndication offering builder (`pages/syndication/offerings/[id].tsx`) showing:
    - Distribution schedule (quarterly/monthly/on-demand)
    - Distribution history table
    - "Create Distribution" action that calculates per-investor amounts from the cap table
  - Create `pages/api/syndication/offerings/[id]/distributions.ts` API endpoint for CRUD on distribution records
  - Add `syn_distributions` and `syn_distribution_allocations` tables to `shared/syndicationSchema.ts` and `instrumentation.ts`
  - Files: `lib/services/DistributionService.ts` (new), `pages/syndication/offerings/[id].tsx`, `pages/api/syndication/offerings/[id]/distributions.ts` (new), `shared/syndicationSchema.ts`, `instrumentation.ts`
  - Acceptance: Distributions tab shows on offering pages. Can create a distribution that auto-calculates per-investor amounts from cap table. Distribution history displays correctly.

### T007: Token Bridge Reference Page
- **Blocked By**: [T001, T005]
- **Details**:
  - Reference `arbitrum-tutorials` patterns for ETH deposit/withdraw, ERC-20 token deposit/withdraw, and L1-L3 teleport
  - Create a Bridge page at `/bridge` with:
    - Token selector (AXM, AXUSD, ETH), direction selector, amount input with balance display
    - Estimated gas and time display (using Arbitrum SDK from T002)
    - Transaction status tracking (pending → confirming → complete)
  - Initially read-only/informational — actual bridge execution behind feature flag `BRIDGE_ENABLED=false`
  - Uses Wagmi wallet connection from T001 for balance reads
  - Add to Products dropdown in nav
  - Files: `pages/bridge/index.tsx` (new), `lib/arbitrum/bridge.ts` (new), `components/design-law/navItems.ts`
  - Acceptance: Bridge page renders with token/direction selection. Shows balances from connected wallet. Bridge execution gated behind feature flag. Listed under Products nav.

### T008: Automated Test Suite
- **Blocked By**: []
- **Details**:
  - Configure Vitest with `vitest.config.ts` for unit and API tests
  - Create API endpoint tests: syndication CRUD, solvency snapshots, due diligence UUID validation, ecosystem data
  - Create underwriting engine tests: all 8 strategies produce correct outputs for known inputs, strategy comparison ranking
  - Create capital/financial computation tests: AME regime scoring, policy multipliers, hard brake triggers, capital readiness
  - Add `test` and `test:watch` scripts to `package.json`
  - Files: `vitest.config.ts` (new), `tests/api/*.test.ts` (new), `tests/underwriting/*.test.ts` (new), `tests/capital/*.test.ts` (new), `package.json`
  - Acceptance: `npm test` runs all tests. All tests pass. Coverage of critical financial calculations.

### T009: Unified Notification Center
- **Blocked By**: []
- **Details**:
  - Create `notifications` table in `shared/notificationSchema.ts`: id, user_address, category, title, message, read, link, created_at
  - Add table to `instrumentation.ts`
  - Create API routes for list (with unread count), mark read, mark all read, delete
  - Create `NotificationBell.tsx` in nav with unread badge, dropdown panel grouped by category
  - Wire notification creation into Sentinel regime changes, syndication status changes, DD completion, KYC updates
  - Files: `shared/notificationSchema.ts` (new), `pages/api/notifications/*.ts` (new), `components/design-law/NotificationBell.tsx` (new), `components/design-law/DesignLawLayout.tsx`, `instrumentation.ts`
  - Acceptance: Bell icon in nav with unread count. Notifications dropdown works. System events auto-create notifications.

### T010: API Rate Limiting Standardization
- **Blocked By**: []
- **Details**:
  - Create `lib/middleware/rateLimiter.ts` with tiered limits (default 60/min, strict 10/min, auth 5/min, public 120/min)
  - Create `lib/middleware/withApiProtection.ts` composable wrapper combining rate limiting + CORS + sanitization
  - Apply to all syndication, solvency, ecosystem, notification, and distribution routes
  - Add rate limit headers to responses
  - Files: `lib/middleware/rateLimiter.ts` (new), `lib/middleware/withApiProtection.ts` (new), ~15 API route files
  - Acceptance: All API routes have consistent rate limiting. 429 responses for excessive requests.

### T011: Consistent Cache Layer for External APIs
- **Blocked By**: [T003]
- **Details**:
  - Apply `getOrSetCache` from `lib/cache.ts` to all uncached external API calls
  - CoinGecko (1-min TTL), Alpha Vantage (15-min), RentCast (30-min), Walk Score (24-hour)
  - Add cache hit/miss logging, admin cache status endpoint
  - Files: `server/services/mirdt/CoinGeckoProvider.ts`, `server/services/mirdt/AlphaVantageProvider.ts`, `pages/api/admin/cache-status.ts` (new)
  - Acceptance: External API calls cached with appropriate TTLs. Admin can view cache status.

### T012: Investor Portal (LP Dashboard)
- **Blocked By**: [T006]
- **Details**:
  - Create `/investor` page with: portfolio overview (total invested, distributions received, subscriptions count, unrealized value), active subscriptions table, distribution history, documents section
  - Create API routes: portfolio summary, subscriptions list, distributions list for connected wallet
  - Add to Products nav dropdown
  - Files: `pages/investor/index.tsx` (new), `pages/api/investor/*.ts` (new), `components/design-law/navItems.ts`
  - Acceptance: Investor sees all subscriptions, distributions, and documents in one place. Listed in nav.

### T013: Governance Dashboard
- **Blocked By**: [T001]
- **Details**:
  - Create `/governance` page: active proposals, voting power, proposal detail, create proposal form, delegation, vote history
  - Create API routes: proposals CRUD, vote casting, voting power query
  - Create `shared/governanceSchema.ts` with `gov_proposals` and `gov_votes` tables, add to `instrumentation.ts`
  - Add "Governance" to Community dropdown in nav
  - Files: `pages/governance/index.tsx` (new), `pages/api/governance/*.ts` (new), `shared/governanceSchema.ts` (new), `components/design-law/navItems.ts`, `instrumentation.ts`
  - Acceptance: Governance page shows proposals, voting, and delegation. Listed in Community nav.

### T014: Mobile PWA Hardening
- **Blocked By**: []
- **Details**:
  - Create `public/sw.js` service worker: cache-first for static assets, network-first for APIs, offline fallback
  - Update `public/manifest.json` with Axiom branding, standalone display, icons
  - Register service worker in `_app.tsx`, create `pages/offline.tsx`
  - Add apple-mobile-web-app meta tags to `_document.tsx`
  - Files: `public/sw.js` (new), `public/manifest.json`, `pages/_app.tsx`, `pages/offline.tsx` (new), `pages/_document.tsx`
  - Acceptance: App passes PWA installability checks. Offline page works. Installable to home screen.

---
## Phase 2: Money Movement (Getting Money In and Out)
---

### T015: Live Fiat On-Ramp Integration
- **Blocked By**: []
- **Details**:
  - Select Transak as the primary on-ramp provider (170+ countries, strong US coverage, Arbitrum support)
  - Replace placeholder `/onramp` page with a live integration:
    - Embed Transak widget via their JavaScript SDK
    - Configure for USDC and ETH purchases on Arbitrum One
    - Pass connected wallet address (from T001/existing) as destination
    - Support payment methods: credit/debit card, bank transfer, Apple Pay
  - Create `lib/services/OnRampService.ts`:
    - Webhook handler for Transak order status updates (pending → processing → completed → failed)
    - Store transaction records in DB for user history
  - Create `shared/onrampSchema.ts` with `onramp_transactions` table:
    - id, user_address, provider, fiat_currency, fiat_amount, crypto_currency, crypto_amount, status, provider_order_id, created_at, completed_at
  - Add table to `instrumentation.ts`
  - Create `pages/api/onramp/webhook.ts` for Transak webhook callbacks
  - Create `pages/api/onramp/history.ts` for user transaction history
  - Update `/onramp` page to show: widget, recent transactions, supported currencies/methods
  - Files: `pages/onramp.tsx`, `lib/services/OnRampService.ts` (new), `shared/onrampSchema.ts` (new), `pages/api/onramp/webhook.ts` (new), `pages/api/onramp/history.ts` (new), `instrumentation.ts`
  - Acceptance: Users can purchase USDC/ETH with fiat directly on the platform. Transaction history displays. Webhook updates order status.

### T016: Multi-Currency Settlement Engine
- **Blocked By**: [T015]
- **Details**:
  - Create `lib/services/FXService.ts`:
    - Fetch real-time FX rates from a free API (e.g., ExchangeRate-API or Open Exchange Rates)
    - Cache rates with 1-hour TTL
    - Support USD, EUR, GBP, NGN, KES, BRL, INR, GHS, ZAR, MXN
    - Convert AXUSD amounts to/from any supported currency for display
  - Create `pages/api/fx/rates.ts` — public endpoint returning current FX rates relative to USD
  - Update distribution display (T006/T012) to show local currency equivalents based on user preference
  - Add currency preference selector to user settings:
    - Store in `user_preferences` table (user_address, preferred_currency, preferred_locale)
    - Add table to `instrumentation.ts`
  - Create `components/CurrencyDisplay.tsx` — reusable component that renders amounts in both AXUSD and user's preferred local currency
  - Files: `lib/services/FXService.ts` (new), `pages/api/fx/rates.ts` (new), `components/CurrencyDisplay.tsx` (new), `shared/userPreferencesSchema.ts` (new), `instrumentation.ts`
  - Acceptance: FX rates available for 10+ currencies. Amounts display in local currency equivalent. Currency preference persists per user.

### T017: Payment Scheduling & Recurring Contributions
- **Blocked By**: [T015]
- **Details**:
  - Create `lib/services/PaymentScheduler.ts`:
    - Define recurring payment schedules: weekly, biweekly (payday-aligned), monthly
    - Track upcoming payments, overdue payments, and payment history
    - Generate reminders via notification system (T009)
  - Create `shared/paymentScheduleSchema.ts` with tables:
    - `payment_schedules`: id, user_address, type (wealth_practice/savings/loan_repayment), amount, currency, frequency, next_due_date, status (active/paused/completed), created_at
    - `payment_records`: id, schedule_id, amount, status (pending/completed/failed/skipped), due_date, paid_date, transaction_hash, created_at
  - Add tables to `instrumentation.ts`
  - Create API routes:
    - `pages/api/payments/schedules.ts` — CRUD for payment schedules
    - `pages/api/payments/upcoming.ts` — GET upcoming payments for user
    - `pages/api/payments/record.ts` — POST record a payment
  - Integrate with Wealth Practice: when joining a group, auto-create a payment schedule matching the group's contribution frequency
  - Add "Upcoming Payments" widget to investor portal and Wealth Practice pages
  - Files: `lib/services/PaymentScheduler.ts` (new), `shared/paymentScheduleSchema.ts` (new), `pages/api/payments/*.ts` (new), `instrumentation.ts`, `pages/wealth-practice.tsx`
  - Acceptance: Users can create recurring payment schedules. Upcoming payments display. Wealth Practice auto-creates schedules on group join. Reminders fire via notification center.

---
## Phase 3: Credit & Lending (Global Scale)
---

### T018: Automated Loan Servicing Engine
- **Blocked By**: [T017]
- **Details**:
  - Create `lib/services/LoanServicingEngine.ts`:
    - Amortization schedule generation (fixed-rate, interest-only, balloon)
    - Payment application waterfall: fees → interest → principal
    - Late fee calculation (configurable grace period, flat fee or percentage)
    - Payoff quote generation (remaining principal + accrued interest + fees)
    - Default escalation workflow: grace period → late → delinquent → default → recovery
  - Create `shared/loanServicingSchema.ts` with tables:
    - `ls_loans`: id, borrower_address, offering_id, principal, interest_rate, term_months, start_date, maturity_date, status, loan_type, created_at
    - `ls_amortization`: id, loan_id, period, due_date, principal_due, interest_due, balance_after, status
    - `ls_payments`: id, loan_id, amount, principal_applied, interest_applied, fees_applied, payment_date, transaction_hash
    - `ls_late_fees`: id, loan_id, amount, reason, assessed_date, paid_date, status
  - Add tables to `instrumentation.ts`
  - Create API routes:
    - `pages/api/lending/loans/[id].ts` — GET loan detail with amortization schedule
    - `pages/api/lending/loans/[id]/payments.ts` — POST record payment, GET payment history
    - `pages/api/lending/loans/[id]/payoff.ts` — GET payoff quote
  - Add "Loan Servicing" section to lending fund dashboard
  - Files: `lib/services/LoanServicingEngine.ts` (new), `shared/loanServicingSchema.ts` (new), `pages/api/lending/loans/*.ts` (new), `pages/lending-fund.tsx`, `instrumentation.ts`
  - Acceptance: Loans have amortization schedules. Payments apply correctly through waterfall. Late fees calculate automatically. Default escalation tracks status changes.

### T019: Credit Bureau Reporting Integration
- **Blocked By**: [T018]
- **Details**:
  - Create `lib/services/CreditReportingService.ts`:
    - Generate Metro 2 format files (industry standard for credit bureau reporting)
    - Map loan data to Metro 2 fields: account type, payment status, balance, payment history
    - Track reporting history per loan
  - Create `shared/creditReportingSchema.ts` with tables:
    - `cr_reports`: id, report_date, bureau (experian/transunion/equifax), file_path, record_count, status (generated/submitted/accepted/rejected), created_at
    - `cr_tradelines`: id, loan_id, borrower_address, account_number, report_id, payment_rating, balance, status
  - Add tables to `instrumentation.ts`
  - Create API routes:
    - `pages/api/lending/credit-reporting/generate.ts` — POST generate monthly report
    - `pages/api/lending/credit-reporting/history.ts` — GET reporting history
  - Add "Credit Reporting" section to founder ops showing: last report date, records submitted, acceptance status
  - Initially generate reports for manual submission; automated submission requires bureau partnerships (documented as TODO)
  - Files: `lib/services/CreditReportingService.ts` (new), `shared/creditReportingSchema.ts` (new), `pages/api/lending/credit-reporting/*.ts` (new), `instrumentation.ts`
  - Acceptance: Metro 2 format files generate correctly from loan data. Reporting history tracked. Manual submission workflow documented.

### T020: Peer-to-Peer Lending Marketplace
- **Blocked By**: [T018, T012]
- **Details**:
  - Create `/lending-marketplace` page where qualified lenders can browse and fund specific deals
  - Listing section: shows approved deals seeking funding with key metrics (LTV, DSCR, property type, term, rate)
  - Lender participation: select a deal, commit an amount (minimum $1,000), sign commitment on-chain
  - Deal funding tracker: progress bar showing funded vs. target, number of lenders, time remaining
  - Create `shared/p2pLendingSchema.ts` with tables:
    - `p2p_listings`: id, deal_id, offering_id, target_amount, funded_amount, min_commitment, interest_rate, term_months, status (open/funded/closed/cancelled), deadline, created_at
    - `p2p_commitments`: id, listing_id, lender_address, amount, status (committed/funded/repaying/completed), transaction_hash, created_at
  - Add tables to `instrumentation.ts`
  - Create API routes:
    - `pages/api/lending/marketplace/listings.ts` — GET active listings
    - `pages/api/lending/marketplace/[id].ts` — GET detail, POST commit funds
    - `pages/api/lending/marketplace/my-positions.ts` — GET lender's active positions
  - Add to Products nav dropdown
  - Files: `pages/lending-marketplace/index.tsx` (new), `shared/p2pLendingSchema.ts` (new), `pages/api/lending/marketplace/*.ts` (new), `components/design-law/navItems.ts`, `instrumentation.ts`
  - Acceptance: Lenders can browse deals, commit capital, and track their positions. Funding progress displays in real time.

---
## Phase 4: Savings & Yield Products
---

### T021: Structured Savings Products
- **Blocked By**: [T001]
- **Details**:
  - Create `/savings` page with three product types:
    - **Fixed-Term Deposits**: 30/60/90/180/365 day lockups with graduated variable yield tiers
    - **Goal-Based Savings**: Set a target amount and timeline (down payment, education, emergency), track progress with visual bar
    - **Round-Up Savings**: Configure round-up amount (nearest $1/$5/$10), auto-deposit difference on transactions
  - Create `shared/savingsSchema.ts` with tables:
    - `sv_deposits`: id, user_address, product_type (fixed/goal/roundup), amount, target_amount, yield_rate, start_date, maturity_date, status (active/matured/withdrawn), created_at
    - `sv_transactions`: id, deposit_id, type (deposit/withdrawal/interest_credit/roundup), amount, balance_after, created_at
    - `sv_goals`: id, user_address, name, target_amount, current_amount, target_date, category (down_payment/education/emergency/custom), created_at
  - Add tables to `instrumentation.ts`
  - Create API routes:
    - `pages/api/savings/deposits.ts` — CRUD for deposits
    - `pages/api/savings/goals.ts` — CRUD for goals
    - `pages/api/savings/transactions.ts` — GET transaction history
  - Add to Products nav dropdown
  - Files: `pages/savings/index.tsx` (new), `shared/savingsSchema.ts` (new), `pages/api/savings/*.ts` (new), `components/design-law/navItems.ts`, `instrumentation.ts`
  - Acceptance: Users can create fixed-term deposits, set savings goals, configure round-ups. Balance and interest tracking works. Listed in Products nav.

### T022: Yield Aggregation Dashboard
- **Blocked By**: [T021, T006, T012]
- **Details**:
  - Create `/yield` page — unified view of all yield-generating positions:
    - Staking rewards (AXM staking from ArbitrumContractsService)
    - Lending interest (Euler V2 vaults, lending fund)
    - LP fees (Camelot DEX positions)
    - Distribution income (syndication distributions from T006)
    - Savings interest (fixed-term deposits from T021)
  - Summary cards: Total Portfolio Value, Total Yield Earned (all-time), Current APY (blended), Yield This Month
  - Yield breakdown chart: pie chart showing yield by source
  - Position table: each position with asset, amount, APY, yield earned, start date
  - Historical yield chart: line chart showing cumulative yield over time
  - Create `pages/api/yield/summary.ts` — aggregates yield data from all sources for connected wallet
  - Add to Products nav dropdown
  - Files: `pages/yield/index.tsx` (new), `pages/api/yield/summary.ts` (new), `components/design-law/navItems.ts`
  - Acceptance: All yield sources display in one view. Blended APY calculates correctly. Charts render with real data.

---
## Phase 5: Insurance & Protection
---

### T023: Parametric Insurance Products
- **Blocked By**: [T009]
- **Details**:
  - Create `/insurance` page with product catalog:
    - **Smart Contract Coverage**: Protection against contract exploits for DeFi positions (staking, LP, lending)
    - **Rent Guarantee**: Coverage for landlords if tenant defaults (triggered by missed payment records from T018)
    - **Property Damage (Parametric)**: Triggered by weather data exceeding thresholds (wind speed, rainfall) at property coordinates
  - Create `shared/insuranceSchema.ts` with tables:
    - `ins_products`: id, name, description, product_type, premium_rate, coverage_limit, status (active/discontinued), created_at
    - `ins_policies`: id, product_id, user_address, covered_asset_id, coverage_amount, premium_amount, premium_frequency, start_date, end_date, status (active/claimed/expired/cancelled), created_at
    - `ins_claims`: id, policy_id, claim_amount, trigger_type (manual/parametric/automated), trigger_data (JSON), status (filed/reviewing/approved/paid/denied), filed_date, resolved_date
    - `ins_pool`: id, total_balance, total_coverage_outstanding, coverage_ratio, last_updated
  - Add tables to `instrumentation.ts`
  - Create API routes:
    - `pages/api/insurance/products.ts` — GET available products
    - `pages/api/insurance/policies.ts` — GET user policies, POST purchase policy
    - `pages/api/insurance/claims.ts` — POST file claim, GET claim status
    - `pages/api/insurance/pool.ts` — GET pool health metrics
  - Add to Products nav dropdown
  - Files: `pages/insurance/index.tsx` (new), `shared/insuranceSchema.ts` (new), `pages/api/insurance/*.ts` (new), `components/design-law/navItems.ts`, `instrumentation.ts`
  - Acceptance: Users can browse products, purchase policies, and file claims. Pool health metrics display. Listed in Products nav.

### T024: Emergency Fund Automation
- **Blocked By**: [T021, T017]
- **Details**:
  - Add emergency fund feature to the savings system (T021):
    - Auto-routing: configurable percentage of every inflow routed to emergency reserve
    - Target: user sets monthly expenses, system targets 3-6 months as reserve goal
    - Progress tracking with milestone notifications (25%, 50%, 75%, 100% funded)
    - Withdrawal restrictions: require confirmation and cooling period for non-emergency withdrawals
  - Create `pages/api/savings/emergency-fund.ts`:
    - GET current emergency fund status (balance, target, progress %)
    - POST configure auto-routing percentage and target months
    - POST withdraw with reason
  - Add emergency fund card to investor portal (T012) and savings page (T021)
  - Wire into notification system (T009) for milestone alerts
  - Files: `pages/api/savings/emergency-fund.ts` (new), `pages/savings/index.tsx`, `pages/investor/index.tsx`
  - Acceptance: Users can configure auto-routing to emergency fund. Progress tracks toward target. Milestone notifications fire.

---
## Phase 6: Payments & Commerce
---

### T025: Peer-to-Peer AXUSD Payments
- **Blocked By**: [T001]
- **Details**:
  - Create `/pay` page for AXUSD person-to-person transfers:
    - Send: enter recipient address (or select from contacts), amount, optional memo
    - Request: create a payment request with amount and memo, generates shareable link
    - QR Code: generate/scan QR codes for payment addresses and requests
    - Contacts: save frequently-used addresses with display names
    - Transaction history: recent sends and receives with status
  - Create `shared/paymentsSchema.ts` with tables:
    - `pay_contacts`: id, user_address, contact_address, display_name, created_at
    - `pay_requests`: id, requester_address, amount, memo, status (pending/paid/expired/cancelled), payment_tx, expires_at, created_at
    - `pay_transactions`: id, sender_address, recipient_address, amount, memo, transaction_hash, status, created_at
  - Add tables to `instrumentation.ts`
  - Create API routes:
    - `pages/api/pay/send.ts` — POST initiate transfer (calls AXUSD contract via Wagmi)
    - `pages/api/pay/request.ts` — CRUD for payment requests
    - `pages/api/pay/contacts.ts` — CRUD for contacts
    - `pages/api/pay/history.ts` — GET transaction history
  - Add to Products nav dropdown
  - Files: `pages/pay/index.tsx` (new), `shared/paymentsSchema.ts` (new), `pages/api/pay/*.ts` (new), `components/design-law/navItems.ts`, `instrumentation.ts`
  - Acceptance: Users can send AXUSD, create payment requests with shareable links, manage contacts, and view history. QR codes generate.

### T026: Merchant Payment Rails
- **Blocked By**: [T025]
- **Details**:
  - Create `/merchants` page for merchant onboarding and payment acceptance:
    - Merchant registration: business name, category, wallet address, webhook URL
    - Payment Links: generate unique payment links with fixed or variable amounts
    - Payment Button: embeddable HTML/JS snippet for merchant websites
    - Dashboard: transaction volume, settlement history, pending settlements
  - Create `shared/merchantSchema.ts` with tables:
    - `merch_profiles`: id, owner_address, business_name, category, webhook_url, api_key_hash, status (active/suspended), created_at
    - `merch_payment_links`: id, merchant_id, amount (nullable for variable), description, slug (unique URL), status, expires_at, created_at
    - `merch_transactions`: id, merchant_id, payment_link_id, payer_address, amount, fee_amount, net_amount, transaction_hash, status, created_at
  - Add tables to `instrumentation.ts`
  - Create API routes:
    - `pages/api/merchants/register.ts` — POST merchant registration
    - `pages/api/merchants/payment-links.ts` — CRUD for payment links
    - `pages/api/merchants/[slug]/pay.ts` — public payment page for a link
    - `pages/api/merchants/transactions.ts` — GET merchant transaction history
    - `pages/api/merchants/webhook.ts` — POST test webhook
  - Fee structure: 1% transaction fee on merchant payments, accumulated in treasury
  - Files: `pages/merchants/index.tsx` (new), `shared/merchantSchema.ts` (new), `pages/api/merchants/*.ts` (new), `components/design-law/navItems.ts`, `instrumentation.ts`
  - Acceptance: Merchants can register, create payment links, embed payment buttons. Transactions process with 1% fee. Settlement history displays.

### T027: Bill Pay Integration
- **Blocked By**: [T016, T025]
- **Details**:
  - Create `/bill-pay` page for paying bills from AXUSD balance:
    - Add Payee: name, account number, category (rent/utilities/insurance/phone/internet/other)
    - Pay Bill: select payee, enter amount, schedule date (immediate or future)
    - Recurring Bills: set up auto-pay for regular bills
    - Payment History: bills paid with confirmation numbers and status
  - Create `shared/billPaySchema.ts` with tables:
    - `bp_payees`: id, user_address, payee_name, account_number, category, routing_info, created_at
    - `bp_payments`: id, user_address, payee_id, amount, currency, scheduled_date, status (scheduled/processing/completed/failed), confirmation_number, created_at
    - `bp_recurring`: id, user_address, payee_id, amount, frequency, next_date, status (active/paused), created_at
  - Add tables to `instrumentation.ts`
  - Create API routes:
    - `pages/api/bill-pay/payees.ts` — CRUD for payees
    - `pages/api/bill-pay/payments.ts` — POST pay, GET history
    - `pages/api/bill-pay/recurring.ts` — CRUD for recurring bills
  - Initially: convert AXUSD → USD via off-ramp and process ACH (requires partnership — document as TODO for live ACH)
  - MVP: track bills and payments in the system with manual off-ramp step
  - Add to Products nav dropdown
  - Files: `pages/bill-pay/index.tsx` (new), `shared/billPaySchema.ts` (new), `pages/api/bill-pay/*.ts` (new), `components/design-law/navItems.ts`, `instrumentation.ts`
  - Acceptance: Users can add payees, pay bills, set up recurring payments. Payment history tracks all activity.

---
## Phase 7: Global Expansion Infrastructure
---

### T028: Multi-Jurisdiction Compliance Engine
- **Blocked By**: [T016]
- **Details**:
  - Create `lib/compliance/JurisdictionEngine.ts`:
    - Define compliance rules per jurisdiction: US (SEC/FinCEN), EU (MiCA/GDPR), UK (FCA), Nigeria (SEC), Kenya (CMA), Brazil (CVM)
    - KYC tier requirements per jurisdiction (document types, verification levels)
    - Transaction limits per jurisdiction
    - Tax withholding rates per country
    - Restricted jurisdictions list (OFAC-sanctioned countries)
  - Create `shared/complianceSchema.ts` with tables:
    - `cpl_jurisdictions`: id, country_code, name, regulatory_body, kyc_tier_required, tx_daily_limit, tx_monthly_limit, withholding_rate, status (active/restricted/blocked), created_at
    - `cpl_user_jurisdiction`: id, user_address, country_code, kyc_tier_achieved, verification_date, next_review_date, status
    - `cpl_regulatory_reports`: id, jurisdiction, report_type (SAR/CTR/periodic), period, record_count, status (draft/submitted/accepted), submitted_date, created_at
  - Add tables to `instrumentation.ts`
  - Create API routes:
    - `pages/api/compliance/jurisdiction/[code].ts` — GET rules for a jurisdiction
    - `pages/api/compliance/user-status.ts` — GET compliance status for connected wallet
    - `pages/api/compliance/check.ts` — POST pre-transaction compliance check
  - Integrate jurisdiction check into transaction flows (P2P payments, syndication subscriptions, lending)
  - Files: `lib/compliance/JurisdictionEngine.ts` (new), `shared/complianceSchema.ts` (new), `pages/api/compliance/*.ts` (new), `instrumentation.ts`
  - Acceptance: Jurisdiction rules defined for 6+ countries. Pre-transaction compliance checks work. User jurisdiction status tracks KYC tier.

### T029: Localization System (Multi-Language)
- **Blocked By**: []
- **Details**:
  - Install `next-intl` (following ethereum.org's pattern)
  - Configure locale routing in `middleware.ts`: detect browser language, support URL prefix (`/es/`, `/fr/`, `/pt/`, `/sw/`)
  - Create translation files for 5 languages:
    - `messages/en.json` — English (default, extract all current hardcoded strings)
    - `messages/es.json` — Spanish (Houston, Latin America)
    - `messages/fr.json` — French (West Africa)
    - `messages/pt.json` — Portuguese (Brazil)
    - `messages/sw.json` — Swahili (East Africa)
  - Start with core UI: nav items, page titles, button labels, form labels, error messages, footer
  - Create `components/design-law/LanguageSwitcher.tsx` — dropdown in nav for language selection
  - Replace hardcoded strings in `DesignLawLayout.tsx`, nav items, and key pages with `useTranslations()` calls
  - Files: `middleware.ts`, `messages/*.json` (new), `components/design-law/LanguageSwitcher.tsx` (new), `components/design-law/DesignLawLayout.tsx`, `i18n.ts` (new)
  - Acceptance: Site renders in 5 languages. Language switcher in nav works. URL prefixes route correctly. Falls back to English for untranslated strings.

### T030: Regional Wealth Practice Hubs
- **Blocked By**: [T029, T028]
- **Details**:
  - Extend the Wealth Practice system to support culturally-adapted regional variants:
    - **SUSU** (West Africa / Diaspora) — existing model
    - **Tontine** (French-speaking Africa) — longer cycles, larger groups, elder-led
    - **Tanda** (Mexico / Latin America) — weekly rotation, family-group focus
    - **Chit Fund** (India / South Asia) — auction-based payout, interest component
    - **Paluwagan** (Philippines / Southeast Asia) — trust-circle based, smaller amounts
  - Create `shared/regionalWealthSchema.ts` with tables:
    - `rw_templates`: id, region_code, cultural_name, description, default_cycle_weeks, default_group_size, payout_model (rotation/auction/elder_selection), currency, created_at
    - `rw_groups`: id, template_id, name, region_code, cycle_weeks, group_size, contribution_amount, currency, status, created_at
  - Add tables to `instrumentation.ts`
  - Update `/wealth-practice` page to show regional templates with cultural context
  - Create `pages/api/wealth-practice/templates.ts` — GET available templates by region
  - Allow group creation from templates with region-appropriate defaults
  - Files: `shared/regionalWealthSchema.ts` (new), `pages/api/wealth-practice/templates.ts` (new), `pages/wealth-practice.tsx`, `instrumentation.ts`
  - Acceptance: 5 regional templates defined with cultural context. Groups can be created from templates. Regional defaults apply correctly.

---
## Phase 8: Institutional Infrastructure
---

### T031: Developer API Platform
- **Blocked By**: [T010]
- **Details**:
  - Create `/developers` page — public API documentation and key management:
    - API key generation: users create API keys (hashed in DB, shown once)
    - Key management: list, revoke, set permissions (read/write/admin)
    - Interactive API docs: endpoint list with try-it-now functionality
    - Webhooks: register webhook URLs for events (new_proposal, distribution_paid, loan_funded, price_alert)
  - Create `shared/developerSchema.ts` with tables:
    - `dev_api_keys`: id, user_address, key_hash, name, permissions (JSON), rate_limit_tier, last_used_at, status (active/revoked), created_at
    - `dev_webhooks`: id, user_address, url, events (JSON array), secret_hash, status (active/paused), last_triggered_at, failure_count, created_at
    - `dev_webhook_logs`: id, webhook_id, event_type, payload_hash, response_status, response_time_ms, created_at
  - Add tables to `instrumentation.ts`
  - Create API routes:
    - `pages/api/developers/keys.ts` — CRUD for API keys
    - `pages/api/developers/webhooks.ts` — CRUD for webhooks
    - `pages/api/developers/docs.ts` — GET OpenAPI spec
  - Create `lib/middleware/apiKeyAuth.ts` — authenticate requests via `X-API-Key` header (alternative to SIWE for programmatic access)
  - Generate OpenAPI/Swagger spec from existing routes
  - Add to nav under Operations
  - Files: `pages/developers/index.tsx` (new), `shared/developerSchema.ts` (new), `pages/api/developers/*.ts` (new), `lib/middleware/apiKeyAuth.ts` (new), `components/design-law/navItems.ts`, `instrumentation.ts`
  - Acceptance: Developers can create API keys, register webhooks, and browse API docs. API key auth works alongside SIWE.

### T032: Regulatory Reporting Engine
- **Blocked By**: [T028, T018]
- **Details**:
  - Create `lib/services/RegulatoryReportingService.ts`:
    - **SAR (Suspicious Activity Reports)**: Flag transactions exceeding thresholds or matching suspicious patterns, generate reports
    - **CTR (Currency Transaction Reports)**: Auto-generate for transactions over $10,000
    - **K-1 Tax Documents**: Generate annual K-1 forms for syndication investors from distribution data
    - **Fund Performance Reports**: GIPS-compliant performance summaries for the lending fund
    - **Periodic Compliance Reports**: Monthly/quarterly summaries for each jurisdiction
  - Create `shared/regulatorySchema.ts` with tables:
    - `reg_reports`: id, report_type (SAR/CTR/K1/performance/periodic), jurisdiction, period, generated_date, file_path, status (draft/reviewed/submitted), reviewer_address, created_at
    - `reg_flags`: id, user_address, flag_type (high_value/velocity/pattern), transaction_ids (JSON), description, status (open/reviewed/cleared/escalated), created_at
  - Add tables to `instrumentation.ts`
  - Create API routes:
    - `pages/api/regulatory/reports.ts` — GET list, POST generate
    - `pages/api/regulatory/flags.ts` — GET active flags, PATCH update status
    - `pages/api/regulatory/k1/[investor].ts` — GET K-1 for investor
  - Add "Regulatory" section to founder ops dashboard
  - Files: `lib/services/RegulatoryReportingService.ts` (new), `shared/regulatorySchema.ts` (new), `pages/api/regulatory/*.ts` (new), `pages/founder-ops/index.tsx`, `instrumentation.ts`
  - Acceptance: SAR/CTR flags auto-generate. K-1 documents generate from distribution data. Reports list in founder ops.

### T033: Multi-Sig Treasury Workflow
- **Blocked By**: [T001]
- **Details**:
  - Create `/treasury` page — formalized multi-sig treasury management:
    - Proposal creation: describe treasury action (transfer, swap, stake), set amount and destination
    - Approval workflow: required signers threshold (e.g., 3-of-5), approval status per signer
    - Execution: auto-execute when threshold met, record on-chain transaction
    - Audit trail: complete history of all treasury proposals with outcomes
  - Create `shared/treasuryOpsSchema.ts` with tables:
    - `tres_proposals`: id, proposer_address, action_type (transfer/swap/stake/unstake/other), description, amount, token, destination, required_approvals, status (pending/approved/executed/rejected/expired), execution_tx, created_at, expires_at
    - `tres_approvals`: id, proposal_id, signer_address, approved (boolean), signature, created_at
    - `tres_signers`: id, address, name, role, status (active/removed), added_at
  - Add tables to `instrumentation.ts`
  - Create API routes:
    - `pages/api/treasury/proposals.ts` — CRUD for treasury proposals
    - `pages/api/treasury/proposals/[id]/approve.ts` — POST approve/reject
    - `pages/api/treasury/signers.ts` — GET/POST manage signers
    - `pages/api/treasury/history.ts` — GET execution history
  - Integrate with existing Safe multi-sig infrastructure
  - Add to Operations nav dropdown
  - Files: `pages/treasury/index.tsx` (new), `shared/treasuryOpsSchema.ts` (new), `pages/api/treasury/*.ts` (new), `components/design-law/navItems.ts`, `instrumentation.ts`
  - Acceptance: Treasury proposals can be created, approved by multiple signers, and executed. Full audit trail displays.

---
## Phase 9: Data & Intelligence
---

### T034: Economic Dashboard
- **Blocked By**: [T003, T022]
- **Details**:
  - Create `/economy` page — macro-level view of Axiom's own economic activity:
    - **TVL**: Total value locked across all protocol products (staking, lending, savings, LP)
    - **Money Velocity**: AXUSD circulation rate (transactions / supply per period)
    - **Lending Volume**: Total originated, active loans, default rate
    - **Savings Rate**: Total deposited in savings products, average duration
    - **Active Users**: DAU/WAU/MAU with growth trends
    - **Geographic Distribution**: Map or chart showing user distribution by region
    - **Revenue**: Protocol fee revenue (merchant fees, PSM fees, lending spreads)
  - Create `pages/api/economy/metrics.ts` — aggregates data from all internal systems:
    - Query staking balances, lending tables, savings tables, payment tables, user counts
    - Cache with 15-minute TTL
  - Create `pages/api/economy/timeseries.ts` — historical economic data for charts:
    - Daily snapshots of key metrics stored in `econ_snapshots` table
  - Create `shared/economySchema.ts` with table:
    - `econ_snapshots`: id, snapshot_date, tvl, axusd_supply, axusd_velocity, active_users, lending_volume, savings_total, revenue_total, created_at
  - Add table to `instrumentation.ts`
  - Add to Intelligence nav dropdown
  - Files: `pages/economy/index.tsx` (new), `pages/api/economy/*.ts` (new), `shared/economySchema.ts` (new), `components/design-law/navItems.ts`, `instrumentation.ts`
  - Acceptance: Economic dashboard shows all key metrics with real data. Time series charts render historical trends. Listed in Intelligence nav.

### T035: On-Chain Analytics Dashboard
- **Blocked By**: [T003]
- **Details**:
  - Create `/analytics` page — on-chain health metrics for the AXM/AXUSD ecosystem:
    - **Wallet Growth**: New wallets holding AXM or AXUSD over time
    - **Token Distribution**: Top holders, Gini coefficient, concentration risk
    - **Governance Participation**: Voting rates, proposal frequency, delegation patterns
    - **Staking Ratio**: Percentage of AXM supply staked, staker count trends
    - **DEX Activity**: Trading volume, liquidity depth, price impact estimates
    - **Contract Activity**: Transaction counts per contract, gas usage trends
  - Create `pages/api/analytics/on-chain.ts`:
    - Query Arbitrum RPC for wallet counts, token balances, contract interactions
    - Use existing Alchemy API for indexed data
    - Cache with 30-minute TTL
  - Create `pages/api/analytics/distribution.ts`:
    - Calculate Gini coefficient from AXM holder distribution
    - Top 10/25/50/100 holder concentration
  - Add to Intelligence nav dropdown
  - Files: `pages/analytics/index.tsx` (new), `pages/api/analytics/*.ts` (new), `components/design-law/navItems.ts`
  - Acceptance: On-chain metrics display with real blockchain data. Token distribution analysis shows concentration metrics. Listed in Intelligence nav.

---
## Phase 10: Sovereign Identity (Musk — Vertical Integration)
---

### T036: Sovereign Identity Passport
- **Blocked By**: [T001, T028]
- **Details**:
  - Create a unified Axiom Identity system where one verification unlocks every product
  - Build on existing ERC-3643 on-chain identity + KYC pipeline, but extend to a portable "Financial Passport":
    - Identity tier (basic/verified/accredited/institutional)
    - Credit score (from AxiomScoreSBT)
    - Jurisdiction and tax residency
    - Compliance clearances (which products user is eligible for)
    - Achievement badges (Wealth Practice completions, lending track record, governance participation)
  - Create `pages/identity/index.tsx` — user-facing identity dashboard:
    - Current verification tier and upgrade path
    - Linked credentials (KYC docs, accreditation, jurisdiction)
    - Portable ID: exportable verifiable credential (W3C VC format) for use in other protocols
    - Activity-based trust score computed from on-chain behavior
  - Create `shared/identitySchema.ts` with tables:
    - `id_passports`: id, user_address, tier (basic/verified/accredited/institutional), trust_score, jurisdiction_code, tax_residency, credential_hash, issued_at, expires_at, status
    - `id_credentials`: id, passport_id, credential_type (kyc/accreditation/credit_score/achievement), issuer, claim_data (JSON), verified_at, expires_at
    - `id_trust_events`: id, user_address, event_type (loan_repaid/cycle_completed/vote_cast/deal_closed), score_impact, created_at
  - Add tables to `instrumentation.ts`
  - Create API routes:
    - `pages/api/identity/passport.ts` — GET user's passport, POST create/upgrade
    - `pages/api/identity/credentials.ts` — GET credentials, POST add credential
    - `pages/api/identity/trust-score.ts` — GET computed trust score with breakdown
    - `pages/api/identity/verify.ts` — POST verify a portable credential from another user
  - Trust score algorithm: weighted sum of on-time payments (30%), governance participation (15%), lending track record (25%), Wealth Practice completions (20%), account age (10%)
  - Add "Identity" to About dropdown or as standalone nav item
  - Files: `pages/identity/index.tsx` (new), `shared/identitySchema.ts` (new), `pages/api/identity/*.ts` (new), `components/design-law/navItems.ts`, `instrumentation.ts`
  - Acceptance: Users see their identity tier, trust score, and credentials. Trust score computes from real activity. Portable credential exports work.

---
## Phase 11: AI Agent Economy (Musk — Automation)
---

### T037: Autonomous Financial Agents
- **Blocked By**: [T009, T003]
- **Details**:
  - Extend the existing Agent Governance system (`/api/agent-gov/`) into a full autonomous agent economy
  - Create `lib/agents/AgentRuntime.ts` — the execution engine for autonomous agents:
    - Agent lifecycle: create → configure → activate → monitor → pause → retire
    - Budget management: each agent has an AXUSD budget with spending limits
    - Action authorization: all agent actions go through Sentinel for approval
    - Audit trail: every agent decision logged with reasoning
  - Define 5 initial agent types:
    - **Deal Scout Agent**: Monitors distressed feed, runs underwriting on new listings, surfaces deals passing all strategy thresholds → creates notification
    - **Treasury Rebalancer Agent**: Reads AME policy engine output, proposes treasury rebalancing actions when regime changes → creates treasury proposal (T033)
    - **MIRDT Signal Agent**: Monitors MIRDT setups, auto-executes paper trades when Sentinel authorizes → logs to proof of execution
    - **Wealth Practice Manager Agent**: Automates payout rotations, sends reminders, handles late payment escalation → creates notifications
    - **Compliance Monitor Agent**: Scans transactions for CTR/SAR triggers, flags suspicious patterns → creates regulatory flags (T032)
  - Create `shared/agentRuntimeSchema.ts` with tables:
    - `agt_instances`: id, agent_type, name, config (JSON), budget_limit, budget_spent, status (active/paused/retired), owner_address, created_at
    - `agt_actions`: id, agent_id, action_type, input_data (JSON), output_data (JSON), authorized_by (sentinel/manual), cost, status (pending/executed/rejected), created_at
    - `agt_budgets`: id, agent_id, period_start, period_end, allocated, spent, remaining
  - Add tables to `instrumentation.ts`
  - Create API routes:
    - `pages/api/agents/instances.ts` — CRUD for agent instances
    - `pages/api/agents/[id]/actions.ts` — GET action history
    - `pages/api/agents/[id]/configure.ts` — POST update agent config
    - `pages/api/agents/dashboard.ts` — GET overview of all agents with status and budget
  - Create `/agents` page — agent management dashboard showing all active agents, recent actions, budget utilization, and health status
  - Add to Operations nav dropdown
  - Files: `lib/agents/AgentRuntime.ts` (new), `lib/agents/types/*.ts` (new, one per agent type), `shared/agentRuntimeSchema.ts` (new), `pages/agents/index.tsx` (new), `pages/api/agents/*.ts` (new), `components/design-law/navItems.ts`, `instrumentation.ts`
  - Acceptance: 5 agent types defined and configurable. Agents execute actions through Sentinel authorization. Budget tracking works. Dashboard shows agent activity.

---
## Phase 12: Real Estate Vertical Integration (Musk — Own the Stack)
---

### T038: Full Property Lifecycle Management
- **Blocked By**: [T018, T006]
- **Details**:
  - Extend the acquisitions OS to cover the FULL property lifecycle post-acquisition:
  - **Property Management Module** at `/property-management`:
    - Tenant screening: application intake, background check integration (placeholder for provider), credit check via trust score
    - Lease management: create/renew/terminate leases, rent amount, security deposit, terms
    - Rent collection: monthly invoicing tied to payment scheduler (T017), late fee automation
    - Maintenance requests: tenant submits request, assign contractor, track resolution, cost tracking
    - Financial reporting: per-property P&L, NOI calculation, cap rate tracking over time
  - Create `shared/propertyMgmtSchema.ts` with tables:
    - `pm_properties`: id, offering_id, address, property_type, units, status (active/vacant/maintenance/sold), acquired_date, created_at
    - `pm_tenants`: id, property_id, unit_number, tenant_name, tenant_address, lease_start, lease_end, rent_amount, deposit_amount, status (active/notice/eviction/former), created_at
    - `pm_leases`: id, property_id, tenant_id, start_date, end_date, monthly_rent, deposit, terms (JSON), status, created_at
    - `pm_rent_ledger`: id, lease_id, due_date, amount_due, amount_paid, paid_date, status (due/paid/late/waived), late_fee, created_at
    - `pm_maintenance`: id, property_id, tenant_id, category (plumbing/electrical/hvac/structural/other), description, priority (low/medium/high/emergency), assigned_to, cost, status (open/assigned/in_progress/completed), created_at
  - Add tables to `instrumentation.ts`
  - Create API routes:
    - `pages/api/property-management/properties.ts` — CRUD
    - `pages/api/property-management/tenants.ts` — CRUD
    - `pages/api/property-management/rent.ts` — GET ledger, POST record payment
    - `pages/api/property-management/maintenance.ts` — CRUD for work orders
    - `pages/api/property-management/[id]/financials.ts` — GET property P&L
  - Add to Operations nav dropdown
  - Files: `pages/property-management/index.tsx` (new), `shared/propertyMgmtSchema.ts` (new), `pages/api/property-management/*.ts` (new), `components/design-law/navItems.ts`, `instrumentation.ts`
  - Acceptance: Full property lifecycle management from tenant screening through rent collection and maintenance. Per-property financials calculate correctly.

### T039: Disposition & Exit Management
- **Blocked By**: [T038]
- **Details**:
  - Add disposition workflow to property management:
    - **Listing Preparation**: Generate property listing with financials, photos, and investment summary
    - **Sale Tracking**: Track offers, negotiations, accepted price, closing timeline
    - **1031 Exchange Tracking**: Identify replacement property deadlines (45-day identification, 180-day closing), track exchange intermediary
    - **Investor Exit Waterfall**: Calculate per-investor returns based on cap table and waterfall terms (preferred return, catch-up, promote split)
    - **Final Distribution**: Generate final distribution allocating sale proceeds per waterfall
  - Create `shared/dispositionSchema.ts` with tables:
    - `disp_listings`: id, property_id, offering_id, list_price, list_date, status (preparing/active/under_contract/sold/withdrawn), sold_price, sold_date, created_at
    - `disp_offers`: id, listing_id, buyer_name, offer_amount, terms (JSON), status (received/countered/accepted/rejected/expired), created_at
    - `disp_1031_exchanges`: id, listing_id, identification_deadline, closing_deadline, replacement_properties (JSON), intermediary, status, created_at
    - `disp_exit_waterfalls`: id, offering_id, listing_id, gross_proceeds, costs, net_proceeds, waterfall_calc (JSON with per-investor breakdown), status (draft/approved/distributed), created_at
  - Add tables to `instrumentation.ts`
  - Create API routes and add Disposition tab to property management and offering pages
  - Files: `shared/dispositionSchema.ts` (new), `pages/api/disposition/*.ts` (new), `pages/property-management/index.tsx`, `instrumentation.ts`
  - Acceptance: Sale tracking works. 1031 exchange deadlines calculate. Exit waterfall distributes proceeds per cap table.

---
## Phase 13: Social Financial Graph (X.com — Network Effects)
---

### T040: Protocol Activity Feed
- **Blocked By**: [T009]
- **Details**:
  - Create `/feed` page — a protocol-wide activity stream showing the Axiom economy in motion:
    - Deal activity: "New deal sourced in Atlanta — 4-unit multifamily, $320K"
    - Wealth Practice: "Group #47 completed cycle 6 — $24,000 distributed"
    - Governance: "Proposal AXP-12 passed with 78% approval"
    - Lending: "Lending fund deployed $150K to Fix & Flip in Houston"
    - Savings: "Community savings milestone — $1M total deposited"
    - Syndication: "Offering AXO-5 fully funded — $500K raised from 12 investors"
  - All feed items are protocol-level aggregates — NO personal financial data exposed
  - Create `shared/feedSchema.ts` with table:
    - `protocol_feed`: id, event_type (deal/wealth_practice/governance/lending/savings/syndication/milestone), title, description, metadata (JSON), created_at
  - Add table to `instrumentation.ts`
  - Create API routes:
    - `pages/api/feed/latest.ts` — GET paginated feed (50 items per page)
    - `pages/api/feed/by-type.ts` — GET filtered by event type
  - Wire feed creation into existing systems: deal creation, Wealth Practice cycle completion, governance vote outcomes, lending deployments, syndication funding milestones
  - Add to Community nav dropdown
  - Files: `pages/feed/index.tsx` (new), `shared/feedSchema.ts` (new), `pages/api/feed/*.ts` (new), `components/design-law/navItems.ts`, `instrumentation.ts`
  - Acceptance: Feed shows real protocol activity. Events auto-create from system actions. No personal financial data exposed. Paginated.

### T041: Reputation & Achievement System
- **Blocked By**: [T036]
- **Details**:
  - Extend the identity passport (T036) with a gamified achievement system using Soulbound tokens:
  - Define achievement categories:
    - **Wealth Builder**: Completed 1/5/10 Wealth Practice cycles
    - **Deal Maker**: Analyzed 5/25/100 deals, closed 1/5/10 as sponsor
    - **Reliable Borrower**: 6/12/24 consecutive on-time loan payments
    - **Governance Citizen**: Voted on 5/25/100 proposals, created 1/5 proposals
    - **Savings Milestone**: Reached $1K/$10K/$50K/$100K total savings
    - **Community Builder**: Referred 5/25/100 active members
    - **OG Member**: 1/2/5 year continuous membership
  - Create `shared/achievementSchema.ts` with tables:
    - `ach_definitions`: id, category, name, description, tier (bronze/silver/gold), criteria (JSON), icon_url, created_at
    - `ach_earned`: id, user_address, achievement_id, earned_at, metadata (JSON), sbt_token_id (nullable — minted on-chain when claimed)
    - `ach_progress`: id, user_address, achievement_id, current_value, target_value, last_updated
  - Add tables to `instrumentation.ts`
  - Create API routes:
    - `pages/api/achievements/definitions.ts` — GET all available achievements
    - `pages/api/achievements/my-progress.ts` — GET user's progress and earned achievements
    - `pages/api/achievements/claim.ts` — POST claim an earned achievement (future: mint SBT)
  - Add achievements section to identity page (T036)
  - Wire progress tracking into: Wealth Practice completions, loan payments, governance votes, savings deposits, deal closings
  - Files: `shared/achievementSchema.ts` (new), `pages/api/achievements/*.ts` (new), `pages/identity/index.tsx`, `instrumentation.ts`
  - Acceptance: Achievements defined across 7 categories with 3 tiers each. Progress tracks automatically. Earned achievements display on identity page.

### T042: Community Deal Rooms & Messaging
- **Blocked By**: [T009]
- **Details**:
  - Create built-in messaging system for protocol collaboration (keep users in-app instead of Discord):
  - **Deal Rooms**: Auto-created for each syndication offering — sponsor + subscribed investors can discuss
  - **Wealth Practice Group Chat**: Auto-created for each group
  - **Governance Discussion Threads**: One thread per proposal for debate before voting
  - **Direct Messages**: Wallet-to-wallet encrypted messaging
  - Create `shared/messagingSchema.ts` with tables:
    - `msg_rooms`: id, room_type (deal_room/wealth_practice/governance/direct), reference_id (offering_id, group_id, proposal_id, or null), name, created_at
    - `msg_members`: id, room_id, user_address, role (owner/member/viewer), joined_at
    - `msg_messages`: id, room_id, sender_address, content (encrypted text), message_type (text/system/file_link), created_at
    - `msg_read_receipts`: id, message_id, user_address, read_at
  - Add tables to `instrumentation.ts`
  - Create API routes:
    - `pages/api/messages/rooms.ts` — GET user's rooms
    - `pages/api/messages/rooms/[id].ts` — GET messages (paginated), POST send message
    - `pages/api/messages/rooms/[id]/members.ts` — GET/POST manage members
    - `pages/api/messages/unread.ts` — GET unread count across all rooms
  - Create `/messages` page — inbox view with room list and message panel
  - Auto-create rooms when: new offering created (deal room), new Wealth Practice group formed, new governance proposal submitted
  - Integrate unread count into notification bell (T009)
  - Files: `pages/messages/index.tsx` (new), `shared/messagingSchema.ts` (new), `pages/api/messages/*.ts` (new), `components/design-law/navItems.ts`, `instrumentation.ts`
  - Acceptance: Rooms auto-create for offerings, groups, and proposals. Messages send and display. Unread counts show in nav.

### T043: Referral & Network Growth Engine
- **Blocked By**: [T036, T017]
- **Details**:
  - Create referral system where every member earns rewards for growing the network:
  - Each wallet gets a unique referral code/link
  - Reward triggers:
    - Referred user joins a Wealth Practice group → referrer earns AXM bonus (tracked, not auto-minted)
    - Referred user makes first syndication investment → referrer earns allocation bonus credit
    - Referred user completes first savings goal → both earn a reward credit
    - Referred user completes KYC → referrer earns trust score boost
  - Create `shared/referralSchema.ts` with tables:
    - `ref_codes`: id, user_address, code (unique), link_url, created_at
    - `ref_referrals`: id, referrer_address, referred_address, code_used, status (signed_up/activated/qualified), created_at
    - `ref_rewards`: id, referral_id, reward_type (axm_bonus/allocation_credit/trust_boost), amount, status (pending/credited/claimed), created_at
    - `ref_leaderboard`: id, user_address, total_referrals, qualified_referrals, total_rewards_earned, rank, period (monthly/all_time), created_at
  - Add tables to `instrumentation.ts`
  - Create API routes:
    - `pages/api/referrals/my-code.ts` — GET/POST user's referral code
    - `pages/api/referrals/track.ts` — POST record a referral (called on signup with code)
    - `pages/api/referrals/rewards.ts` — GET user's referral rewards
    - `pages/api/referrals/leaderboard.ts` — GET top referrers
  - Create `/referrals` page — user's referral link, stats, rewards, and leaderboard
  - Add to Community nav dropdown
  - Files: `pages/referrals/index.tsx` (new), `shared/referralSchema.ts` (new), `pages/api/referrals/*.ts` (new), `components/design-law/navItems.ts`, `instrumentation.ts`
  - Acceptance: Referral codes generate per user. Rewards track when referred users hit milestones. Leaderboard ranks top referrers.

---
## Phase 14: Cross-Border & Institutional Corridors (Ripple/XRP — Payment Rails)
---

### T044: AXUSD Remittance Corridors
- **Blocked By**: [T016, T025, T028]
- **Details**:
  - Create `/remittance` page for sending money internationally via AXUSD:
  - Supported corridors (initial):
    - US → Nigeria (AXUSD → NGN)
    - US → Mexico (AXUSD → MXN)
    - US → Ghana (AXUSD → GHS)
    - US → Jamaica (AXUSD → JMD)
    - US → Colombia (AXUSD → COP)
  - User flow:
    1. Select corridor (destination country)
    2. Enter amount in USD or destination currency
    3. See FX rate (from T016), fee (1-2%), and recipient receives amount
    4. Enter recipient details (name, phone/mobile money, bank account)
    5. Send AXUSD — backend handles conversion and local payout (initially via partner integration placeholder)
  - Create `shared/remittanceSchema.ts` with tables:
    - `rem_corridors`: id, source_country, destination_country, source_currency, destination_currency, fee_percentage, min_amount, max_amount, status (active/suspended), payout_partner, created_at
    - `rem_recipients`: id, sender_address, name, country, phone, bank_name, account_number, mobile_money_provider, created_at
    - `rem_transfers`: id, sender_address, recipient_id, corridor_id, send_amount_usd, fee_amount, fx_rate, receive_amount_local, status (initiated/processing/delivered/failed/refunded), partner_reference, created_at
  - Add tables to `instrumentation.ts`
  - Create API routes:
    - `pages/api/remittance/corridors.ts` — GET available corridors with rates
    - `pages/api/remittance/recipients.ts` — CRUD for saved recipients
    - `pages/api/remittance/send.ts` — POST initiate transfer
    - `pages/api/remittance/history.ts` — GET transfer history
    - `pages/api/remittance/track/[id].ts` — GET transfer status
  - Fee comparison widget: show Axiom fee vs. Western Union / MoneyGram for same corridor
  - Add to Products nav dropdown
  - Files: `pages/remittance/index.tsx` (new), `shared/remittanceSchema.ts` (new), `pages/api/remittance/*.ts` (new), `components/design-law/navItems.ts`, `instrumentation.ts`
  - Acceptance: 5 corridors defined with rates. Users can save recipients, initiate transfers, and track status. Fee comparison displays.

### T045: Institutional Liquidity Network (White-Label API)
- **Blocked By**: [T031, T028]
- **Details**:
  - Package Axiom's infrastructure as a white-label service for institutions:
  - Target institutions: community banks, CDFIs, credit unions, Black-owned banks
  - Create `/institutional` page — partner onboarding and management:
    - Institution registration: name, type, charter number, primary contact, API needs
    - Product selection: which Axiom products to white-label (savings, lending, Wealth Practice, syndication)
    - Branding: upload logo, set colors, custom domain mapping (future)
    - API access: dedicated API keys with institution-scoped permissions
  - Create `shared/institutionalSchema.ts` with tables:
    - `inst_partners`: id, institution_name, institution_type (bank/cdfi/credit_union/other), charter_number, primary_contact, api_key_id (references dev_api_keys), products_enabled (JSON array), branding (JSON), status (applicant/onboarding/active/suspended), created_at
    - `inst_users`: id, partner_id, user_address, external_user_id, created_at
    - `inst_transactions`: id, partner_id, product, action, amount, user_address, metadata (JSON), created_at
    - `inst_billing`: id, partner_id, period, transaction_count, fee_total, status (pending/invoiced/paid), created_at
  - Add tables to `instrumentation.ts`
  - Create API routes:
    - `pages/api/institutional/register.ts` — POST partner application
    - `pages/api/institutional/[id]/dashboard.ts` — GET partner dashboard metrics
    - `pages/api/institutional/[id]/users.ts` — GET/POST manage institutional users
    - `pages/api/institutional/[id]/billing.ts` — GET billing history
  - Billing model: per-transaction fee or monthly flat rate (configurable per partner)
  - Add to Operations nav dropdown
  - Files: `pages/institutional/index.tsx` (new), `shared/institutionalSchema.ts` (new), `pages/api/institutional/*.ts` (new), `components/design-law/navItems.ts`, `instrumentation.ts`
  - Acceptance: Institutions can register, select products, and receive API access. Transaction tracking per institution. Billing calculates.

### T046: Cross-Chain Settlement Protocol
- **Blocked By**: [T005, T007, T028]
- **Details**:
  - Build a unified settlement layer for moving AXUSD across chains and into fiat:
  - Settlement flow: Source chain → Axiom Settlement Engine → Destination (chain or fiat)
  - Supported paths:
    - Arbitrum One ↔ Universe L3 (native bridge from T007)
    - Arbitrum One → Ethereum L1 (via Arbitrum SDK bridge)
    - Any chain → Fiat (via off-ramp partner)
    - Fiat → Any chain (via on-ramp from T015)
  - Create `lib/services/SettlementEngine.ts`:
    - Route selection: determine optimal path for a settlement (direct bridge, multi-hop, or fiat)
    - Fee calculation: aggregate fees across all hops
    - Compliance check: pre-settlement jurisdiction and limit checks (T028)
    - Status tracking: track settlement through each hop
  - Create `shared/settlementSchema.ts` with tables:
    - `stl_settlements`: id, initiator_address, source_chain, source_token, destination_chain, destination_type (chain/fiat), destination_token_or_currency, amount, fee_total, route (JSON array of hops), status (initiated/routing/in_transit/settling/completed/failed), created_at
    - `stl_hops`: id, settlement_id, hop_order, from_chain, to_chain, method (bridge/swap/offramp/onramp), amount_in, amount_out, fee, transaction_hash, status, created_at
    - `stl_routes`: id, name, source_chain, destination_chain, hops (JSON), avg_time_seconds, avg_fee_percentage, status (active/deprecated), created_at
  - Add tables to `instrumentation.ts`
  - Create API routes:
    - `pages/api/settlement/quote.ts` — POST get settlement quote (route, fees, time estimate)
    - `pages/api/settlement/initiate.ts` — POST start settlement
    - `pages/api/settlement/[id]/status.ts` — GET settlement status with hop detail
    - `pages/api/settlement/routes.ts` — GET available settlement routes
  - Files: `lib/services/SettlementEngine.ts` (new), `shared/settlementSchema.ts` (new), `pages/api/settlement/*.ts` (new), `instrumentation.ts`
  - Acceptance: Settlement quotes return accurate fees and time. Multi-hop routing works. Settlement status tracks through each hop.

### T047: Treasury-as-a-Service
- **Blocked By**: [T031, T034]
- **Details**:
  - Package the AME policy engine, solvency monitoring, and stress testing as a service for other DAOs/protocols:
  - Create `/treasury-service` page — product page and client dashboard:
    - Product description: what TaaS provides (solvency monitoring, policy recommendations, stress testing, disclosure page generation)
    - Client onboarding: register treasury addresses, configure monitoring parameters
    - Client dashboard: live solvency metrics, policy mode, stress test results, alerts
    - Pricing: monthly subscription in AXUSD (tiered by treasury size)
  - Create `shared/taasSchema.ts` with tables:
    - `taas_clients`: id, protocol_name, contact_address, treasury_addresses (JSON array), config (JSON — thresholds, alert preferences), plan_tier (basic/pro/enterprise), status (trial/active/suspended), created_at
    - `taas_snapshots`: id, client_id, snapshot_date, treasury_value, coverage_ratio, reserve_ratio, policy_mode, stress_results (JSON), created_at
    - `taas_alerts`: id, client_id, alert_type (threshold_breach/regime_change/stress_failure), message, severity (info/warning/critical), acknowledged, created_at
    - `taas_billing`: id, client_id, period, plan_tier, amount_axusd, status (pending/paid/overdue), created_at
  - Add tables to `instrumentation.ts`
  - Create API routes:
    - `pages/api/taas/register.ts` — POST client registration
    - `pages/api/taas/[id]/snapshot.ts` — GET latest snapshot, POST trigger new snapshot
    - `pages/api/taas/[id]/stress-test.ts` — POST run stress test with custom scenarios
    - `pages/api/taas/[id]/alerts.ts` — GET alerts
    - `pages/api/taas/[id]/disclosure.ts` — GET auto-generated disclosure page data
  - Reuse existing `lib/solvency/ame/` engine — parameterize it to accept any treasury addresses instead of only Axiom's
  - Add to Products nav dropdown
  - Files: `pages/treasury-service/index.tsx` (new), `shared/taasSchema.ts` (new), `pages/api/taas/*.ts` (new), `components/design-law/navItems.ts`, `instrumentation.ts`
  - Acceptance: External protocols can register treasury addresses. Solvency snapshots compute for client treasuries. Stress tests run. Alerts fire on threshold breaches.

### T048: Stablecoin Settlement Network
- **Blocked By**: [T046, T026]
- **Details**:
  - Position AXUSD as the settlement token for the entire Axiom economy:
  - Create `lib/services/AXUSDNetworkService.ts`:
    - Track AXUSD velocity: transactions per supply per period
    - Monitor AXUSD distribution across chains and products
    - Liquidity pool health across DEXs
    - Settlement volume by category (rent, distributions, merchant, remittance, P2P)
  - Create `/axusd-network` page — AXUSD network health dashboard:
    - Total AXUSD supply and backing ratio
    - Velocity metrics and trends
    - Settlement volume by category (pie chart)
    - Liquidity depth across pools
    - Chain distribution (how much AXUSD on each chain)
    - Fee revenue generated by PSM and settlements
  - Create `shared/axusdNetworkSchema.ts` with table:
    - `axusd_network_snapshots`: id, snapshot_date, total_supply, backing_ratio, velocity_24h, velocity_7d, settlement_volume_24h, settlement_by_category (JSON), liquidity_depth, fee_revenue_24h, chain_distribution (JSON), created_at
  - Add table to `instrumentation.ts`
  - Create API routes:
    - `pages/api/axusd-network/metrics.ts` — GET current network metrics
    - `pages/api/axusd-network/history.ts` — GET historical snapshots for charts
  - Add to Intelligence nav dropdown
  - Files: `pages/axusd-network/index.tsx` (new), `lib/services/AXUSDNetworkService.ts` (new), `shared/axusdNetworkSchema.ts` (new), `pages/api/axusd-network/*.ts` (new), `components/design-law/navItems.ts`, `instrumentation.ts`
  - Acceptance: AXUSD network metrics display with real data. Velocity and settlement volume track. Fee revenue calculates.

### T049: Hardware Node Program (DePIN Physical Infrastructure)
- **Blocked By**: [T005]
- **Details**:
  - Extend the existing DeNet DePIN integration into a physical node program for Universe L3:
  - Create `/nodes` page — node operator program:
    - Node types: Validator (secures Universe L3), Storage (IPFS/DeNet), Observer (monitors protocol health)
    - Hardware specs: recommended hardware for each node type
    - Rewards: AXM earnings per node type, uptime requirements, slashing conditions
    - Order flow: reserve a node → receive hardware (future) → register on-chain → start earning
    - Operator dashboard: node status, uptime, rewards earned, peers connected
  - Create `shared/nodeProgram.ts` with tables:
    - `node_orders`: id, operator_address, node_type (validator/storage/observer), hardware_config (JSON), shipping_address (encrypted), status (reserved/shipped/delivered/activated), order_date, created_at
    - `node_registrations`: id, operator_address, node_type, node_id (on-chain), ip_hash, region, status (registered/active/inactive/slashed), uptime_percentage, last_heartbeat, created_at
    - `node_rewards`: id, node_id, period, uptime_hours, reward_amount_axm, penalty_amount, net_reward, status (pending/distributed), created_at
  - Add tables to `instrumentation.ts`
  - Create API routes:
    - `pages/api/nodes/register.ts` — POST register a node
    - `pages/api/nodes/my-nodes.ts` — GET operator's nodes
    - `pages/api/nodes/rewards.ts` — GET reward history
    - `pages/api/nodes/network.ts` — GET network-wide node stats (total nodes, regions, uptime average)
  - Add to Products nav dropdown
  - Files: `pages/nodes/index.tsx` (new), `shared/nodeProgram.ts` (new), `pages/api/nodes/*.ts` (new), `components/design-law/navItems.ts`, `instrumentation.ts`
  - Acceptance: Node program page shows types, specs, and rewards. Registration flow works. Operator dashboard shows node status.
