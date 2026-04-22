Axiom Execution Gate Framework

Document Type: Release Gating Criteria
Version: 1.0
Date: March 10, 2026
Classification: Internal Operating Document


OVERVIEW

This framework defines four sequential gates that govern when new categories of work may begin. Each gate has specific capabilities that must be verified, evidence that must be produced, pass conditions, and failure conditions.

No work from a subsequent gate's scope may begin until the preceding gate is passed. This is not a suggestion. It is a hard constraint.


GATE 1: PLATFORM INTEGRITY

Purpose: Confirm the platform's foundational systems are reliable, observable, and protected before any new capabilities are deployed.

Target Assessment Date: Day 30 of 90-Day Plan

Required Capabilities:
  T001 - Wallet Connection Upgrade (complete and stable)
  T004 - Error Monitoring / Sentry (capturing errors in production)
  T008 - Automated Test Suite (passing for all existing financial computations)
  T010 - API Rate Limiting (applied to all existing routes)
  T014 - Mobile PWA Hardening (installable and offline-capable)

Required Evidence:
  1. Multi-wallet connection verified with at least MetaMask and one additional wallet (Coinbase Wallet or WalletConnect).
  2. SIWE authentication flow works end-to-end with new wallet layer.
  3. Sentry captures at least one real error in each environment (client, server).
  4. Test suite includes at least:
     - 5 API endpoint tests covering existing syndication and solvency routes
     - 8 underwriting strategy tests (one per strategy) with known inputs and expected outputs
     - 3 AME computation tests covering regime scoring and policy multiplier calculations
  5. All test suite tests pass with zero failures.
  6. Rate limiting returns 429 for requests exceeding the configured threshold on at least 3 routes.
  7. PWA passes Lighthouse installability audit.

Pass Conditions:
  All 7 evidence items verified. No critical bugs in wallet connection or SIWE auth. Test suite green.

Failure Conditions:
  - Wallet connection fails for any supported wallet type.
  - SIWE auth broken or degraded compared to pre-T001 behavior.
  - Test suite has failing tests for financial computations.
  - Sentry not capturing errors in production.
  - Rate limiting not applied to syndication or solvency routes.

What Cannot Begin Before Gate 1 Passes:
  - T002 (Arbitrum SDK) — depends on stable wallet layer
  - T013 (Governance Dashboard) — depends on wallet for voting
  - T033 (Treasury Workflow) — depends on wallet for signing
  - T006 (Fund Distribution) — depends on T002 which depends on T001
  - Any Track B capital execution work
  - Any Track C consumer financial product


GATE 2: INSTITUTIONAL RELIABILITY

Purpose: Confirm the platform's governance, notification, caching, and data layers support institutional-grade operations.

Target Assessment Date: Day 60 of 90-Day Plan

Required Capabilities:
  All Gate 1 capabilities (maintained)
  T002 - Arbitrum SDK Integration (gas estimation functional)
  T003 - L2 Ecosystem Data APIs (returning live data)
  T009 - Notification Center (delivering system events)
  T011 - Cache Standardization (all external APIs cached)
  T013 - Governance Dashboard (proposals and voting functional)
  T033 - Multi-Sig Treasury Workflow (multi-party approval functional)

Required Evidence:
  1. Gate 1 evidence remains valid (regression check).
  2. Gas estimation displays for at least one transaction type (staking or PSM swap).
  3. Ecosystem data endpoint returns live data from at least 2 of 3 sources (DefiLlama, L2Beat, GrowThePie).
  4. Notification bell shows unread count. At least one notification type auto-creates from a system event (Sentinel regime change or syndication status change).
  5. Cache status endpoint shows hit/miss counts for at least 3 external APIs.
  6. A governance proposal can be created, voted on, and resolved through the complete lifecycle.
  7. A treasury proposal can be created, approved by the required number of signers, and either executed or rejected.

Pass Conditions:
  All 7 evidence items verified. Gate 1 evidence still holds (no regressions). Notification delivery is reliable.

Failure Conditions:
  - Any Gate 1 regression.
  - Governance proposal lifecycle incomplete (cannot vote or resolve).
  - Treasury approval workflow broken (cannot reach threshold or execute).
  - Notification delivery failing silently.
  - Ecosystem data returning stale or error results for more than 1 hour.

What Cannot Begin Before Gate 2 Passes:
  - T006 (Fund Distribution) — requires stable SDK and governance framework
  - T012 (Investor Portal) — requires distribution infrastructure
  - T031 (Developer API Platform) — requires stable, rate-limited API surface
  - T037 (Autonomous Agents) — requires notification delivery and ecosystem data
  - T035 (On-Chain Analytics) — requires ecosystem data APIs
  - Any Track B compliance or regulatory work


GATE 3: CAPITAL EXECUTION READINESS

Purpose: Confirm the platform can safely manage capital deployment, investor reporting, and distribution workflows.

Target Assessment Date: Day 90 of 90-Day Plan (or first assessment in next 90-day cycle)

Required Capabilities:
  All Gate 2 capabilities (maintained)
  T006 - Fund Distribution (distribution calculations verified)
  T012 - Investor Portal (portfolio data accurate)
  T015 - Fiat On-Ramp (transaction processing functional)
  T017 - Payment Scheduling (recurring schedules functional)
  T031 - Developer API Platform (API keys and auth functional)

Required Evidence:
  1. Gate 2 evidence remains valid (regression check).
  2. A distribution can be created for a syndication offering. Per-investor amounts match cap table percentages within rounding tolerance.
  3. Distribution history displays correctly on the investor portal.
  4. Investor portal shows accurate subscription count, total invested, and distributions received for a test wallet.
  5. Fiat on-ramp widget loads and connects to the provider. At least one test transaction (if sandbox mode available) completes the lifecycle.
  6. A recurring payment schedule can be created, and upcoming payments display correctly.
  7. An API key can be created, and a request authenticated with that key succeeds.

Pass Conditions:
  All 7 evidence items verified. Distribution calculations are correct. Investor data is accurate. Payment scheduling is functional.

Failure Conditions:
  - Any Gate 2 regression.
  - Distribution calculation error exceeding 0.01% of total distribution amount.
  - Investor portal showing incorrect subscription or distribution data.
  - Fiat on-ramp widget failing to load or provider integration broken.
  - Payment schedule not generating correct upcoming payment dates.

What Cannot Begin Before Gate 3 Passes:
  - T018 (Loan Servicing) — capital execution must be reliable first
  - T020 (P2P Lending Marketplace) — requires investor infrastructure
  - T022 (Yield Aggregation) — requires distribution and savings data
  - T028 (Compliance Engine) — compliance rules applied to capital flows
  - T038 (Property Management) — requires distribution and loan servicing
  - T036 (Identity Passport) — requires compliance engine foundation
  - Any consumer payment products (T025, T026, T027)


GATE 4: CONSUMER RAILS READINESS

Purpose: Confirm the platform has sufficient institutional, compliance, and capital infrastructure to safely support consumer financial products.

Target Assessment Date: Beyond initial 90-day window (estimated Day 120-150)

Required Capabilities:
  All Gate 3 capabilities (maintained)
  T018 - Loan Servicing Engine (amortization and payment waterfall verified)
  T028 - Multi-Jurisdiction Compliance Engine (rules for at least 3 jurisdictions)
  T036 - Sovereign Identity Passport (identity tiers and trust scoring functional)

Required Evidence:
  1. Gate 3 evidence remains valid (regression check).
  2. A loan has a correct amortization schedule. A payment applies through the waterfall (fees, interest, principal) correctly.
  3. Late fee calculation triggers correctly after grace period expiration.
  4. Compliance rules return correct KYC tier requirements and transaction limits for at least 3 jurisdictions.
  5. Pre-transaction compliance check correctly blocks a transaction that violates jurisdiction limits.
  6. An identity passport displays the correct tier, trust score, and linked credentials for a test user.
  7. Trust score computation produces non-zero values based on at least 2 activity types.

Pass Conditions:
  All 7 evidence items verified. Financial calculations are correct. Compliance checks enforce rules. Identity system is functional.

Failure Conditions:
  - Any Gate 3 regression.
  - Loan amortization schedule calculation error.
  - Payment waterfall applying amounts in wrong order.
  - Compliance check failing to block a non-compliant transaction.
  - Identity trust score returning zero for a user with qualifying activity.

What Cannot Begin Before Gate 4 Passes:
  - T025 (P2P Payments) — consumer payment product
  - T026 (Merchant Rails) — merchant payment processing
  - T027 (Bill Pay) — consumer bill payment
  - T044 (Remittance Corridors) — cross-border consumer transfers
  - T023 (Insurance Products) — consumer protection products
  - T042 (Messaging) — community communication platform
  - T043 (Referral Engine) — growth mechanics
  - T045 (Institutional Liquidity Network) — white-label service
  - T046 (Cross-Chain Settlement) — settlement infrastructure
  - T047 (Treasury-as-a-Service) — external service packaging
  - T048 (Stablecoin Network Dashboard) — network metrics
  - T049 (Hardware Node Program) — physical infrastructure


GATE ASSESSMENT PROCESS

For each gate assessment:

  1. Review each evidence item against production state.
  2. Run the automated test suite. All tests must pass.
  3. Verify no regressions from previous gates.
  4. Document the assessment result with date, evidence status, and pass/fail determination.
  5. If the gate fails, identify which evidence items failed, determine root cause, and establish a remediation plan before reassessment.
  6. Reassessment may occur no sooner than 5 business days after remediation is deployed.

Gate assessments are documented in the project record. They are not informal check-ins.
