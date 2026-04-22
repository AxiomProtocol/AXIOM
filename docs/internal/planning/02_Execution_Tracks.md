Axiom Financial OS Execution Tracks

Document Type: Execution Architecture
Version: 1.0
Date: March 10, 2026
Classification: Internal Operating Document


OVERVIEW

The 49 capabilities in the Axiom Financial OS Capability Map are organized into three execution tracks. Each track serves a distinct strategic purpose, carries its own risk profile, and has explicit entry and exit conditions.

Tracks are not simultaneous workstreams. They are staged. Track A establishes the foundation. Track B extends that foundation into capital operations. Track C extends both into consumer-facing financial products. Work may overlap at boundaries, but the sequencing discipline described here must be respected.


TRACK A: INSTITUTIONAL CORE

Purpose:
Harden the platform's technical foundation, governance reliability, observability, and institutional credibility. This track ensures the protocol can be trusted before it is extended.

Included Capabilities:

  T001 - Wallet Connection Upgrade
  T002 - Arbitrum SDK Integration
  T003 - L2 Ecosystem Data APIs
  T004 - Error Monitoring (Sentry)
  T008 - Automated Test Suite
  T009 - Notification Center
  T010 - API Rate Limiting
  T011 - Cache Standardization
  T013 - Governance Dashboard
  T014 - Mobile PWA Hardening
  T033 - Multi-Sig Treasury Workflow
  T035 - On-Chain Analytics

Why These Belong Together:
Every item in this track either improves the reliability, auditability, or operational visibility of the existing platform. None of these capabilities introduce new financial products or new compliance surfaces. They strengthen what already exists.

Wallet and SDK upgrades (T001, T002) are foundational because every on-chain interaction depends on them. Error monitoring (T004) and testing (T008) are prerequisites for safely deploying anything else. Rate limiting (T010) and caching (T011) protect the platform from abuse and external API instability. The notification center (T009) is infrastructure that multiple future systems depend on. Governance (T013) and treasury workflow (T033) formalize decision-making processes that must exist before capital deployment tools are built. On-chain analytics (T035) provides the observability layer for token health.

Dependencies:
  T002 depends on T001
  T011 depends on T003
  T033 depends on T001
  T013 depends on T001
  T035 depends on T003

Key Risks:
  - Wallet upgrade (T001) touches the authentication layer for the entire platform. Regression risk is high. Must be accompanied by T008 (testing) running in parallel or immediately after.
  - Sentry integration (T004) modifies the build pipeline. Must be validated against production deployment.
  - Rate limiting (T010) applied incorrectly could block legitimate users. Requires careful tuning and monitoring.

Exit Gate:
Track A is considered complete when:
  1. Multi-wallet connection works with no regression in SIWE auth
  2. Automated tests pass for all critical financial computations
  3. Sentry captures errors in both client and server
  4. All API routes have rate limiting applied
  5. External API calls are cached with appropriate TTLs
  6. Notification center delivers system events
  7. Governance proposals can be created, voted on, and resolved
  8. Treasury proposals follow multi-party approval workflow

Track A does not need to be 100% complete before Track B begins. Specific Track B items may start once their Track A prerequisites pass their individual acceptance criteria.


TRACK B: ASSET AND CAPITAL EXECUTION

Purpose:
Connect the hardened platform infrastructure to actual capital deployment, asset management, and institutional reporting workflows. This track builds the operating layer for real economic activity.

Included Capabilities:

  T005 - Universe L3 Preparation
  T006 - Fund Distribution
  T007 - Token Bridge
  T012 - Investor Portal
  T018 - Loan Servicing Engine
  T019 - Credit Bureau Reporting
  T020 - Peer-to-Peer Lending Marketplace
  T022 - Yield Aggregation Dashboard
  T028 - Multi-Jurisdiction Compliance Engine
  T031 - Developer API Platform
  T032 - Regulatory Reporting Engine
  T034 - Economic Dashboard
  T036 - Sovereign Identity Passport
  T037 - Autonomous Financial Agents
  T038 - Property Lifecycle Management
  T039 - Disposition and Exit Management

Why These Belong Together:
These capabilities share a common requirement: they involve capital, assets, or compliance obligations. Fund distributions (T006), loan servicing (T018), and property management (T038) are all operational financial workflows that must be correct, auditable, and compliant. The investor portal (T012), yield dashboard (T022), and economic dashboard (T034) provide transparency surfaces for those operations. Compliance (T028), regulatory reporting (T032), and identity (T036) are the governance guardrails that make capital deployment permissible. The developer API (T031) enables programmatic access for institutional integrations. Autonomous agents (T037) automate operational decisions within Sentinel authorization boundaries.

L3 preparation (T005) and the token bridge (T007) belong here because they are capital infrastructure, not consumer features. They enable cross-chain asset movement and are prerequisites for cross-border settlement.

Dependencies:
  T005 depends on T001, T002 (Track A)
  T006 depends on T002 (Track A)
  T007 depends on T001, T005
  T012 depends on T006
  T018 depends on T017 (Track C, payment scheduling)
  T019 depends on T018
  T020 depends on T018, T012
  T022 depends on T021 (Track C, savings), T006, T012
  T028 depends on T016 (Track C, multi-currency)
  T031 depends on T010 (Track A)
  T032 depends on T028, T018
  T034 depends on T003 (Track A), T022
  T036 depends on T001 (Track A), T028
  T037 depends on T009 (Track A), T003 (Track A)
  T038 depends on T018, T006
  T039 depends on T038

Cross-Track Dependencies (Notable):
  T018 (Loan Servicing) depends on T017 (Payment Scheduling, Track C). This is an intentional cross-track dependency. Payment scheduling is a shared utility that serves both capital execution and consumer workflows. It should be built as infrastructure in early Track C work, gated alongside Track A completion.

  T028 (Compliance Engine) depends on T016 (Multi-Currency, Track C). Multi-currency display is needed for jurisdiction-specific transaction limits. This is another shared utility dependency.

Key Risks:
  - Fund distribution (T006) and loan servicing (T018) involve financial calculations where errors have direct monetary consequences. Must have test coverage from T008 before deployment.
  - Compliance engine (T028) and regulatory reporting (T032) create compliance obligations once activated. These should not be deployed as placeholders. They must be accurate or clearly marked as non-operational.
  - Property management (T038) introduces a significant new operational surface. If launched without adequate testing, it creates support burden and data integrity risk.
  - Autonomous agents (T037) execute actions automatically. A misconfigured agent could generate incorrect proposals, flags, or trades. Must be gated behind Sentinel authorization with conservative initial budgets.

Exit Gate:
Track B is considered complete when:
  1. Fund distributions calculate correctly from cap table data
  2. Investor portal displays accurate portfolio data
  3. Loan servicing produces correct amortization schedules and payment waterfalls
  4. Compliance engine defines rules for at least 6 jurisdictions
  5. Regulatory reports generate in correct formats
  6. Identity passport computes trust scores from real activity data
  7. At least 2 agent types are operational with Sentinel authorization
  8. Property management supports full tenant-to-maintenance lifecycle


TRACK C: CONSUMER FINANCIAL RAILS

Purpose:
Deliver consumer-facing financial products that make the protocol usable as a daily financial tool. This track builds the products that drive adoption and network effects.

Included Capabilities:

  T015 - Fiat On-Ramp
  T016 - Multi-Currency Settlement
  T017 - Payment Scheduling
  T021 - Structured Savings Products
  T023 - Parametric Insurance Products
  T024 - Emergency Fund Automation
  T025 - Peer-to-Peer AXUSD Payments
  T026 - Merchant Payment Rails
  T027 - Bill Pay
  T029 - Localization (Multi-Language)
  T030 - Regional Wealth Practice Hubs
  T040 - Protocol Activity Feed
  T041 - Reputation and Achievement System
  T042 - Community Deal Rooms and Messaging
  T043 - Referral and Network Growth Engine
  T044 - Remittance Corridors
  T045 - Institutional Liquidity Network
  T046 - Cross-Chain Settlement Protocol
  T047 - Treasury-as-a-Service
  T048 - Stablecoin Settlement Network Dashboard
  T049 - Hardware Node Program

Why These Belong Together:
These capabilities are consumer-facing, network-effect-driven, or expansion-oriented. They do not strengthen the existing institutional core or enable capital deployment. They extend the platform's reach to new users, new geographies, and new use cases.

Some items in this track (T017 Payment Scheduling, T016 Multi-Currency) serve as shared utilities for Track B. Those specific items should be built early in Track C, concurrent with late Track A work, so they are available when Track B needs them.

The social features (T040-T043) are engagement and retention tools. The global expansion items (T029, T030, T044) are geographic reach extensions. The institutional services (T045, T047) package existing capabilities for external consumption. The DePIN and settlement items (T046, T048, T049) are long-horizon infrastructure.

Dependencies:
  T015 has no hard prerequisites (can use existing wallet connection)
  T016 depends on T015
  T017 depends on T015
  T021 depends on T001 (Track A)
  T023 depends on T009 (Track A)
  T024 depends on T021, T017
  T025 depends on T001 (Track A)
  T026 depends on T025
  T027 depends on T016, T025
  T029 has no hard prerequisites
  T030 depends on T029, T028 (Track B)
  T040 depends on T009 (Track A)
  T041 depends on T036 (Track B)
  T042 depends on T009 (Track A)
  T043 depends on T036 (Track B), T017
  T044 depends on T016, T025, T028 (Track B)
  T045 depends on T031 (Track B), T028 (Track B)
  T046 depends on T005 (Track B), T007 (Track B), T028 (Track B)
  T047 depends on T033 (Track A), T034 (Track B)
  T048 depends on T046, T026
  T049 depends on T005 (Track B)

Key Risks:
  - Fiat on-ramp (T015) introduces third-party provider dependency and regulatory exposure. Provider selection and integration quality directly affect user trust.
  - Payment and merchant rails (T025, T026) create transaction processing obligations. Errors or downtime directly impact user funds.
  - Insurance (T023) creates coverage commitments. Must have adequate pool reserves and actuarial modeling before offering policies.
  - Remittance corridors (T044) involve cross-border money transmission. Regulatory requirements vary by corridor and are non-trivial.
  - Messaging (T042) introduces content moderation and storage scaling concerns.
  - Localization (T029) affects every user-facing string. Incorrect translations in financial contexts could cause confusion or compliance issues.

Exit Gate:
Track C is considered complete when:
  1. Users can purchase crypto with fiat and see local currency equivalents
  2. Recurring payment schedules function with automated reminders
  3. Savings products track deposits, interest, and goals correctly
  4. P2P payments send AXUSD with QR code and request link support
  5. At least 3 remittance corridors are operational with accurate FX rates
  6. Protocol activity feed displays real system events
  7. Referral system tracks registrations and rewards


TRACK INTERACTION RULES

  1. Track A work may proceed independently of Tracks B and C.
  2. Track B work may begin on individual items only after their Track A prerequisites pass acceptance criteria.
  3. Track C work may begin on shared utility items (T015, T016, T017) concurrent with late Track A work.
  4. Track C consumer product items (T025, T026, T027, T029, T030, T040-T049) should not begin until Track A is substantially complete and Track B core items (T006, T012, T018) are in progress or complete.
  5. No more than 2 tracks may have active work simultaneously.
  6. Cross-track dependencies are explicitly documented. No implicit assumptions.
