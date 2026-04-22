Axiom Financial OS Dependency Matrix

Document Type: Task Dependency Reference
Version: 1.0
Date: March 10, 2026
Classification: Internal Operating Document


OVERVIEW

This matrix documents every dependency relationship between the 49 capabilities in the Axiom Financial OS. For each task, it identifies what it depends on, what it blocks, which execution track it belongs to, its execution priority within the 90-day window, and the risk of starting it before prerequisites are satisfied.

Priority levels:
  P1 - Must start in Days 1-15 (critical path)
  P2 - Must start in Days 16-30 (foundation completion)
  P3 - Start in Days 31-60 (queued, prerequisite-gated)
  P4 - Start in Days 61-90 (deferred, gate-dependent)
  P5 - Beyond 90-day window (future planning horizon)


MATRIX

T001 - Wallet Connection Upgrade
  Track: A
  Depends On: (none)
  Blocks: T002, T005, T007, T013, T021, T025, T033, T036
  Priority: P1
  Risk If Started Too Early: None. No prerequisites. Should start immediately.

T002 - Arbitrum SDK Integration
  Track: A
  Depends On: T001
  Blocks: T005, T006, T007
  Priority: P3
  Risk If Started Too Early: SDK integration against unstable wallet layer causes rework. Wait for T001 acceptance.

T003 - L2 Ecosystem Data APIs
  Track: A
  Depends On: (none)
  Blocks: T011, T035, T034, T037
  Priority: P2
  Risk If Started Too Early: None. Independent work with no prerequisites.

T004 - Error Monitoring (Sentry)
  Track: A
  Depends On: (none)
  Blocks: (none directly, but enables regression detection for all subsequent work)
  Priority: P1
  Risk If Started Too Early: None. Should be among the first items deployed.

T005 - Universe L3 Preparation
  Track: B
  Depends On: T001, T002
  Blocks: T007, T046, T049
  Priority: P4
  Risk If Started Too Early: Chain definition work without stable wallet and SDK layers creates config that must be rewritten. L3 is not yet live, so preparation is speculative.

T006 - Fund Distribution
  Track: B
  Depends On: T002
  Blocks: T012, T022, T038
  Priority: P3
  Risk If Started Too Early: Distribution calculations without Arbitrum SDK gas estimation creates a disconnected implementation. Financial calculations must be validated by T008 tests.

T007 - Token Bridge
  Track: B
  Depends On: T001, T005
  Blocks: T046
  Priority: P4
  Risk If Started Too Early: Bridge without L3 preparation has no destination chain. Feature-gated regardless, but premature work creates maintenance burden.

T008 - Automated Test Suite
  Track: A
  Depends On: (none)
  Blocks: (none directly, but enables safe deployment of all financial computation changes)
  Priority: P1
  Risk If Started Too Early: None. Testing infrastructure should exist before modifying financial calculations.

T009 - Notification Center
  Track: A
  Depends On: (none)
  Blocks: T023, T037, T040, T042
  Priority: P2
  Risk If Started Too Early: None. Independent infrastructure component.

T010 - API Rate Limiting
  Track: A
  Depends On: (none)
  Blocks: T031
  Priority: P1
  Risk If Started Too Early: None. Should be applied to existing routes before new routes are added.

T011 - Cache Standardization
  Track: A
  Depends On: T003
  Blocks: (none directly)
  Priority: P2
  Risk If Started Too Early: Cannot standardize caching for ecosystem APIs before those APIs exist.

T012 - Investor Portal
  Track: B
  Depends On: T006
  Blocks: T020, T022
  Priority: P3
  Risk If Started Too Early: Portal without distribution data shows empty state. Investor trust requires populated, accurate data.

T013 - Governance Dashboard
  Track: A
  Depends On: T001
  Blocks: (none directly, but governance formalization is prerequisite for institutional credibility)
  Priority: P2
  Risk If Started Too Early: Governance that depends on wallet connection cannot function until T001 is stable.

T014 - Mobile PWA Hardening
  Track: A
  Depends On: (none)
  Blocks: (none)
  Priority: P1
  Risk If Started Too Early: None. Independent work stream.

T015 - Fiat On-Ramp
  Track: C (shared utility)
  Depends On: (none, can use existing wallet)
  Blocks: T016, T017
  Priority: P3
  Risk If Started Too Early: Third-party integration without error monitoring (T004) in place means provider failures go undetected. Acceptable risk given T004 parallel timeline.

T016 - Multi-Currency Settlement
  Track: C (shared utility)
  Depends On: T015
  Blocks: T027, T028, T044
  Priority: P4
  Risk If Started Too Early: FX rate service without on-ramp means no fiat context exists. Currency display without transaction capability confuses users.

T017 - Payment Scheduling
  Track: C (shared utility)
  Depends On: T015
  Blocks: T018, T024, T043
  Priority: P3
  Risk If Started Too Early: Scheduling without payment rails creates schedules that cannot be fulfilled. Acceptable if T015 is in progress.

T018 - Loan Servicing Engine
  Track: B
  Depends On: T017
  Blocks: T019, T020, T032, T038
  Priority: P4
  Risk If Started Too Early: Amortization and payment waterfall without tested financial computation layer (T008) risks incorrect calculations with monetary consequences. Without payment scheduling (T017), loan payments cannot be tracked against schedules.

T019 - Credit Bureau Reporting
  Track: B
  Depends On: T018
  Blocks: (none)
  Priority: P5
  Risk If Started Too Early: Metro 2 generation without live loan data produces empty or test reports. Bureau submission requires partnership not yet established.

T020 - Peer-to-Peer Lending Marketplace
  Track: B
  Depends On: T018, T012
  Blocks: (none)
  Priority: P5
  Risk If Started Too Early: Marketplace without loan servicing means funded deals cannot be tracked. Without investor portal, lenders have no position management.

T021 - Structured Savings Products
  Track: C
  Depends On: T001
  Blocks: T022, T024
  Priority: P4
  Risk If Started Too Early: Savings products without stable wallet layer create deposit and withdrawal risk. Financial product launch without test suite (T008) and error monitoring (T004) is unsafe.

T022 - Yield Aggregation Dashboard
  Track: B
  Depends On: T021, T006, T012
  Blocks: T034
  Priority: P5
  Risk If Started Too Early: Dashboard aggregating nonexistent yield sources shows empty data. Misleading if savings, distributions, and LP positions do not yet exist.

T023 - Parametric Insurance Products
  Track: C
  Depends On: T009
  Blocks: (none)
  Priority: P5
  Risk If Started Too Early: Insurance creates coverage obligations. Launching without actuarial modeling, pool capitalization, and claims infrastructure creates financial liability.

T024 - Emergency Fund Automation
  Track: C
  Depends On: T021, T017
  Blocks: (none)
  Priority: P5
  Risk If Started Too Early: Cannot automate routing to savings without savings products and payment scheduling.

T025 - Peer-to-Peer AXUSD Payments
  Track: C
  Depends On: T001
  Blocks: T026, T027, T044
  Priority: P5
  Risk If Started Too Early: Payment product without mature wallet, rate limiting, and error monitoring creates fund-loss risk. High-consequence feature.

T026 - Merchant Payment Rails
  Track: C
  Depends On: T025
  Blocks: T048
  Priority: P5
  Risk If Started Too Early: Merchant payments without P2P payment infrastructure creates broken payment links. Fee processing errors have financial consequences.

T027 - Bill Pay
  Track: C
  Depends On: T016, T025
  Blocks: (none)
  Priority: P5
  Risk If Started Too Early: Bill pay without fiat off-ramp means payments cannot actually reach payees. Creates user frustration.

T028 - Multi-Jurisdiction Compliance Engine
  Track: B
  Depends On: T016
  Blocks: T030, T032, T036, T044, T045, T046
  Priority: P4
  Risk If Started Too Early: Compliance rules without multi-currency context means jurisdiction-specific limits cannot be expressed in local terms. Inaccurate compliance engine is worse than no compliance engine.

T029 - Localization (Multi-Language)
  Track: C
  Depends On: (none)
  Blocks: T030
  Priority: P5
  Risk If Started Too Early: Translating UI strings while the UI is still changing creates translation maintenance burden. Best done after UI stabilizes.

T030 - Regional Wealth Practice Hubs
  Track: C
  Depends On: T029, T028
  Blocks: (none)
  Priority: P5
  Risk If Started Too Early: Regional templates without localization and compliance create culturally inappropriate or legally non-compliant product variants.

T031 - Developer API Platform
  Track: B
  Depends On: T010
  Blocks: T045
  Priority: P3
  Risk If Started Too Early: API platform without rate limiting exposes unprotected endpoints to external consumers. Security risk.

T032 - Regulatory Reporting Engine
  Track: B
  Depends On: T028, T018
  Blocks: (none)
  Priority: P5
  Risk If Started Too Early: Report generation without compliance rules and loan data produces incorrect regulatory documents. Compliance risk.

T033 - Multi-Sig Treasury Workflow
  Track: A
  Depends On: T001
  Blocks: T047
  Priority: P2
  Risk If Started Too Early: Treasury workflow without stable wallet connection means signers cannot authenticate. Multi-sig requires reliable wallet state.

T034 - Economic Dashboard
  Track: B
  Depends On: T003, T022
  Blocks: T047
  Priority: P5
  Risk If Started Too Early: Economic dashboard without yield data and ecosystem APIs shows empty metrics. Misleading for internal and external observers.

T035 - On-Chain Analytics
  Track: A
  Depends On: T003
  Blocks: (none directly)
  Priority: P3
  Risk If Started Too Early: Analytics without ecosystem API infrastructure requires separate API setup. Minor risk.

T036 - Sovereign Identity Passport
  Track: B
  Depends On: T001, T028
  Blocks: T041, T043
  Priority: P4
  Risk If Started Too Early: Identity tiers without compliance engine cannot map jurisdictions. Trust scores without multiple product surfaces to measure have no meaningful data.

T037 - Autonomous Financial Agents
  Track: B
  Depends On: T009, T003
  Blocks: (none directly)
  Priority: P3
  Risk If Started Too Early: Agents without notification delivery cannot report their actions. Agents without ecosystem data have incomplete inputs for decision-making.

T038 - Property Lifecycle Management
  Track: B
  Depends On: T018, T006
  Blocks: T039
  Priority: P5
  Risk If Started Too Early: Property management without loan servicing and fund distribution means rent collection and NOI calculations lack integration points. Large surface area with high support burden.

T039 - Disposition and Exit Management
  Track: B
  Depends On: T038
  Blocks: (none)
  Priority: P5
  Risk If Started Too Early: Exit management without property management has no properties to exit. Waterfall calculations without distribution infrastructure cannot execute payouts.

T040 - Protocol Activity Feed
  Track: C
  Depends On: T009
  Blocks: (none)
  Priority: P5
  Risk If Started Too Early: Feed without multiple active product surfaces generates sparse, low-value content. Engagement tool with no engagement.

T041 - Reputation and Achievement System
  Track: C
  Depends On: T036
  Blocks: (none)
  Priority: P5
  Risk If Started Too Early: Achievements without identity passport have no anchor. Progress tracking without active products means no progress to track.

T042 - Community Deal Rooms and Messaging
  Track: C
  Depends On: T009
  Blocks: (none)
  Priority: P5
  Risk If Started Too Early: Messaging infrastructure without active user base creates empty rooms. Ongoing moderation and storage costs begin immediately.

T043 - Referral and Network Growth Engine
  Track: C
  Depends On: T036, T017
  Blocks: (none)
  Priority: P5
  Risk If Started Too Early: Referral rewards without identity and payment scheduling means rewards cannot be tracked or paid. Growth tools before product-market fit waste resources.

T044 - Remittance Corridors
  Track: C
  Depends On: T016, T025, T028
  Blocks: (none)
  Priority: P5
  Risk If Started Too Early: Cross-border transfers without compliance engine and multi-currency settlement create regulatory violations. High-consequence if launched prematurely.

T045 - Institutional Liquidity Network
  Track: C
  Depends On: T031, T028
  Blocks: (none)
  Priority: P5
  Risk If Started Too Early: White-label packaging without stable API platform and compliance framework delivers unreliable service to institutional partners. Reputation risk.

T046 - Cross-Chain Settlement Protocol
  Track: C
  Depends On: T005, T007, T028
  Blocks: T048
  Priority: P5
  Risk If Started Too Early: Settlement engine without bridge infrastructure and compliance rules has no functional paths. Pure speculative development.

T047 - Treasury-as-a-Service
  Track: C
  Depends On: T033, T034
  Blocks: (none)
  Priority: P5
  Risk If Started Too Early: TaaS without mature treasury workflow and economic dashboard means the product being packaged does not yet work reliably. Selling an immature product to external protocols damages credibility.

T048 - Stablecoin Settlement Network Dashboard
  Track: C
  Depends On: T046, T026
  Blocks: (none)
  Priority: P5
  Risk If Started Too Early: Network dashboard without settlement protocol and merchant activity has no data to display. Pure placeholder.

T049 - Hardware Node Program
  Track: C
  Depends On: T005
  Blocks: (none)
  Priority: P5
  Risk If Started Too Early: Node program without Universe L3 operational means no chain to validate. Hardware orders for a nonexistent network.


CRITICAL PATH

The longest dependency chain in the roadmap:

  T001 -> T002 -> T005 -> T007 -> T046 -> T048

This chain spans from wallet upgrade through cross-chain settlement to the stablecoin network dashboard. It touches Tracks A, B, and C and represents approximately 6-9 months of sequential work.

The most dependency-dense node is T001 (Wallet Connection Upgrade), which directly blocks 8 other tasks. It is the single most leveraged item in the roadmap.

The second critical chain:

  T015 -> T017 -> T018 -> T038 -> T039

This chain runs from fiat on-ramp through loan servicing to property disposition. It represents the full real estate capital lifecycle.


DEPENDENCY COUNT SUMMARY

Tasks with zero dependencies (can start immediately):
  T001, T003, T004, T008, T009, T010, T014, T015, T029

Tasks blocking the most downstream work:
  T001 blocks 8 tasks directly
  T028 blocks 6 tasks directly
  T018 blocks 4 tasks directly
  T009 blocks 4 tasks directly
  T005 blocks 3 tasks directly
