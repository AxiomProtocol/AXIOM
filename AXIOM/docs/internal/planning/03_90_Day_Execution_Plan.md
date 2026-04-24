Axiom Financial OS 90-Day Execution Plan

Document Type: Time-Bound Execution Roadmap
Version: 1.0
Date: March 10, 2026
Classification: Internal Operating Document


OVERVIEW

This document defines the active execution window for the next 90 calendar days (March 10 through June 8, 2026). It divides work into three horizons: NOW (active), NEXT (queued), and LATER (deferred). The maximum concurrent active task count is 10.

Active work is limited to Track A (Institutional Core) with early shared-utility items from Track C that unblock Track B dependencies. No consumer-facing product launches occur in this window.


PLANNING ASSUMPTIONS

  1. Single engineering team with limited concurrent capacity.
  2. Platform is live in production. All changes carry regression risk.
  3. No external compliance partnerships are finalized in this window.
  4. Track B capital execution items begin only after Track A core prerequisites pass.
  5. Track C consumer products are deferred beyond this 90-day window except for shared utilities.


NOW: ACTIVE WINDOW (Days 1-30)

Active Task Count: 10

Sprint 1 (Days 1-15): Foundation Layer

  T001 - Wallet Connection Upgrade (Track A)
    Priority: Critical
    Rationale: Blocks T002, T005, T007, T013, T021, T025, T033. Highest-leverage prerequisite in the entire roadmap.
    Status: COMPLETE (March 10, 2026)
    Notes: Wagmi v3 + RainbowKit v2 integrated. WalletContext rewritten with Wagmi hooks. ConnectWalletButton uses RainbowKit Custom. Legacy useWallet.ts preserved as backward-compatible wrapper. SIWE auto-sign-in preserved. ArbitrumContractsService updated with setProviderAndSigner(). All routes verified 200.

  T004 - Error Monitoring / Sentry (Track A)
    Priority: Critical
    Rationale: Must be in place before other changes ship. Provides observability for regression detection during T001 rollout.
    Status: Active

  T008 - Automated Test Suite (Track A)
    Priority: Critical
    Rationale: Financial computation correctness is non-negotiable. Must validate existing underwriting, AME, and capital calculations before modifying infrastructure.
    Status: Active

  T010 - API Rate Limiting (Track A)
    Priority: High
    Rationale: No dependencies. Protects existing production API surface. Should be applied before new endpoints are added.
    Status: Active

  T014 - Mobile PWA Hardening (Track A)
    Priority: Medium
    Rationale: No dependencies. Independent work stream. Improves mobile access for target demographic.
    Status: Active

Sprint 2 (Days 16-30): Observability and Governance

  T003 - L2 Ecosystem Data APIs (Track A)
    Priority: High
    Rationale: Unblocks T011, T035, T037. Feeds ecosystem data into Observer and Sentinel.
    Status: Active (starts Day 16, or earlier if capacity allows)

  T009 - Notification Center (Track A)
    Priority: High
    Rationale: Unblocks T023, T037, T040, T042. Required for system event delivery. Prerequisite for most Track B and C operational features.
    Status: Active

  T011 - Cache Standardization (Track A)
    Priority: Medium
    Rationale: Depends on T003. Standardizes all external API caching. Reduces external API costs and latency.
    Status: Active (begins after T003 endpoints exist)

  T013 - Governance Dashboard (Track A)
    Priority: High
    Rationale: Depends on T001. Formalizes governance process before capital deployment features launch.
    Status: Active (begins after T001 passes acceptance)

  T033 - Multi-Sig Treasury Workflow (Track A)
    Priority: High
    Rationale: Depends on T001. Treasury operations must have multi-party authorization before fund distribution features launch.
    Status: Active (begins after T001 passes acceptance)


NEXT: QUEUED WINDOW (Days 31-60)

These tasks activate as NOW items complete and prerequisites are satisfied. Active task count remains at or below 10.

Track A Completion:

  T002 - Arbitrum SDK Integration (Track A)
    Prerequisite: T001 complete
    Rationale: Enables gas estimation and cross-chain message tracking. Prerequisite for T005, T006, T007.

  T035 - On-Chain Analytics (Track A)
    Prerequisite: T003 complete
    Rationale: Token distribution and governance participation metrics. Completes the observability layer.

Track B Early Items:

  T006 - Fund Distribution (Track B)
    Prerequisite: T002 complete
    Rationale: Core capital execution capability. Unlocks T012 (Investor Portal) and T022 (Yield Dashboard).

  T012 - Investor Portal (Track B)
    Prerequisite: T006 complete
    Rationale: LP transparency surface. Required for syndication operational maturity.

  T031 - Developer API Platform (Track B)
    Prerequisite: T010 complete
    Rationale: Enables programmatic access. Prerequisite for T045 (Institutional Liquidity Network).

  T037 - Autonomous Financial Agents (Track B)
    Prerequisite: T009 complete, T003 complete
    Rationale: Extends existing Agent Governance system. All actions authorized by Sentinel.

Track C Shared Utilities:

  T015 - Fiat On-Ramp (Track C, shared utility)
    Prerequisite: None (can use existing wallet)
    Rationale: Unblocks T016 and T017, which are prerequisites for T018 (Loan Servicing), T027 (Bill Pay), T028 (Compliance), and T044 (Remittance). This is a shared utility, not a consumer product launch.

  T017 - Payment Scheduling (Track C, shared utility)
    Prerequisite: T015 complete
    Rationale: Shared utility needed by T018 (Loan Servicing), T024 (Emergency Fund), T038 (Property Management), and T043 (Referral Engine). Building it here prevents Track B blockage.


LATER: DEFERRED WINDOW (Days 61-90 and Beyond)

These tasks are explicitly deferred. They may enter the NEXT queue as the execution window advances, but they should not begin in this 90-day period unless all prerequisite gates are passed and active task count allows.

Track B Deferred (await earlier Track B completion):

  T005 - Universe L3 Preparation
    Deferred because: Depends on T001 + T002. L3 chain is not yet live. Preparation is valuable but not blocking current operations.

  T007 - Token Bridge
    Deferred because: Depends on T005. Bridge is feature-gated regardless. No user-facing urgency.

  T018 - Loan Servicing Engine
    Deferred because: Depends on T017. Financial calculation complexity requires T008 (tests) to be mature first. High-consequence feature.

  T019 - Credit Bureau Reporting
    Deferred because: Depends on T018. Requires bureau partnership (external dependency). Metro 2 generation is useful but not urgent without live loans.

  T020 - Peer-to-Peer Lending Marketplace
    Deferred because: Depends on T018 + T012. Significant new product surface with compliance implications.

  T028 - Multi-Jurisdiction Compliance Engine
    Deferred because: Depends on T016. Creates compliance obligations once activated. Must be accurate, not placeholder.

  T032 - Regulatory Reporting Engine
    Deferred because: Depends on T028 + T018. Cannot generate correct reports without compliance rules and loan data.

  T034 - Economic Dashboard
    Deferred because: Depends on T003 + T022. Requires multiple product surfaces to exist before metrics are meaningful.

  T036 - Sovereign Identity Passport
    Deferred because: Depends on T001 + T028. Identity tiers require compliance engine for jurisdiction mapping.

  T038 - Property Lifecycle Management
    Deferred because: Depends on T018 + T006. Large operational surface. Requires loan servicing and distribution infrastructure.

  T039 - Disposition and Exit Management
    Deferred because: Depends on T038. Cannot exist without property management.

Track C Deferred (consumer products):

  T016 - Multi-Currency Settlement
    Deferred because: Depends on T015. FX service is useful but not blocking core operations.

  T021 - Structured Savings Products
    Deferred because: New financial product surface. Requires T001 (wallet) and mature testing.

  T022 - Yield Aggregation Dashboard
    Deferred because: Depends on T021, T006, T012. Requires multiple yield sources to exist.

  T023 - Parametric Insurance Products
    Deferred because: Creates coverage commitments. Requires actuarial modeling and pool capitalization.

  T024 - Emergency Fund Automation
    Deferred because: Depends on T021, T017. Extension of savings product.

  T025 - Peer-to-Peer AXUSD Payments
    Deferred because: Consumer payment product. Requires stable wallet infrastructure.

  T026 - Merchant Payment Rails
    Deferred because: Depends on T025. Significant new product with fee processing obligations.

  T027 - Bill Pay
    Deferred because: Depends on T016, T025. Requires off-ramp partnership for ACH.

  T029 - Localization (Multi-Language)
    Deferred because: Affects all user-facing strings. Best done after UI stabilizes.

  T030 - Regional Wealth Practice Hubs
    Deferred because: Depends on T029, T028. Requires localization and compliance.

  T040 - Protocol Activity Feed
    Deferred because: Engagement feature. More valuable when multiple product surfaces generate events.

  T041 - Reputation and Achievement System
    Deferred because: Depends on T036. Requires identity passport.

  T042 - Community Deal Rooms and Messaging
    Deferred because: Large new surface (messaging infrastructure). High ongoing support burden.

  T043 - Referral and Network Growth Engine
    Deferred because: Depends on T036, T017. Network growth tools are premature before core products stabilize.

  T044 - Remittance Corridors
    Deferred because: Depends on T016, T025, T028. Cross-border money transmission requires compliance framework.

  T045 - Institutional Liquidity Network
    Deferred because: Depends on T031, T028. White-label packaging requires stable API and compliance.

  T046 - Cross-Chain Settlement Protocol
    Deferred because: Depends on T005, T007, T028. Long-horizon infrastructure.

  T047 - Treasury-as-a-Service
    Deferred because: Depends on T033, T034. Requires mature treasury workflow and economic dashboard.

  T048 - Stablecoin Settlement Network Dashboard
    Deferred because: Depends on T046, T026. Requires settlement protocol and merchant activity.

  T049 - Hardware Node Program
    Deferred because: Depends on T005. Universe L3 must be operational.


ACTIVE TASK SUMMARY BY DAY

  Days 1-15:  T001, T004, T008, T010, T014 (5 tasks)
  Days 16-30: T003, T009, T011, T013, T033 (5 additional, 10 total active)
  Days 31-45: T002, T035, T006, T015 (replace completed items)
  Days 46-60: T012, T031, T037, T017 (replace completed items)
  Days 61-90: Evaluate gate passage, begin earliest Track B deferred items if gates pass


GATE CHECKPOINTS WITHIN THIS WINDOW

  Day 30: Gate 1 (Platform Integrity) assessment
  Day 60: Gate 2 (Institutional Reliability) assessment
  Day 90: Gate 3 (Capital Execution Readiness) assessment

Gates are defined in the Execution Gate Framework document.
