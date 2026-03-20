# Axiom Protocol — Complete Platform Guide

Version 1.0 — March 2026
Platform: axiomprotocol.app
Network: Arbitrum One (Chain ID 42161)

---

## Table of Contents

1. Overview
2. Who This Is For
3. Getting Started
4. The AXM Governance Token
5. Unified AXUSD — Protocol Stablecoin
6. Community
   - 6a. The Wealth Practice
   - 6b. Land Acquisition Pipeline
7. Products
   - 7a. Property Analysis
   - 7b. Deal Intelligence Workspace
   - 7c. Deal Flow — Distressed Property Feed
   - 7d. Capital Program
   - 7e. Lending Fund
   - 7f. Exchange (DEX)
   - 7g. DePIN
   - 7h. Banking
8. Intelligence
   - 8a. MIRDT
   - 8b. Sentinel
   - 8c. Observer
   - 8d. RE Intelligence
9. Cost Intelligence Engine
10. Field Intelligence
11. Operations (Internal)
    - 11a. Founder Ops
    - 11b. Capital Accounting
    - 11c. Solvency Console
    - 11d. Syndication
    - 11e. Investor Portal
12. Proof of Execution
13. Disclosure and Compliance
14. The Roadmap
15. Institutional Vocabulary Glossary

---

## 1. Overview

Axiom Protocol is governance-first wealth infrastructure for real asset acquisition through community capital formation.

The platform provides the tools, data, and on-chain financial infrastructure that allow everyday people to participate in institutional-grade real estate investment — from initial property discovery through community-governed land ownership. It is operational today on Arbitrum One, supported by 72 verified automated control layers auditable on-chain.

Most community wealth-building groups fail at scale not because of bad intentions, but because they lack the infrastructure to succeed. They operate on spreadsheets, group chats, and informal trust. When capital gets involved, coordination breaks down and records disappear. Axiom replaces that informal layer with structured, auditable, and transparent financial infrastructure — the same kind of infrastructure used by professional capital allocators.

The platform is built on three operating principles:

**Transparency.** Every capital movement, governance decision, and operational action is recorded with full audit trails. Verifiable records replace informal trust. No black boxes.

**Coordination.** Structure and shared rules create reliable collaboration. Defined roles, accountability loops, and evidence-based processes replace ad-hoc decision making.

**Discipline.** Measured onboarding, fixed treasury allocation policies, and institutional-grade reporting. No speculation, no shortcuts. Execution over narrative.

Axiom is not a bank, broker-dealer, or registered investment advisor. Participation in any financial product on the platform requires independent evaluation of all disclosures.

---

## 2. Who This Is For

Axiom Protocol was designed for Black and Latino W-2 earners aged 25–40 in Atlanta, Houston, and Charlotte who are ready to build real wealth through disciplined, structured participation in real estate — but have historically been excluded from institutional-grade capital structures.

The platform serves:

- **Community members** ready to form or join a structured savings and capital group
- **Real estate investors** who want institutional analysis tools without an institutional budget
- **Wholesalers and acquisition agents** who need a fast, reliable underwriting pipeline
- **Accredited investors** seeking real asset debt exposure through a structured fund
- **LP participants** in community-governed real estate offerings
- **Institutional allocators and due diligence teams** evaluating the protocol for capital deployment

Every product on the platform is designed to serve a participant at some point in the journey from disciplined savings to real asset ownership.

---

## 3. Getting Started

### Access the Platform

Navigate to [axiomprotocol.app](https://axiomprotocol.app). The platform runs in your browser — no download required.

### Connect Your Wallet

Axiom uses wallet-based identity. Your self-custody wallet is your account. No usernames or passwords. To connect:

1. Click the **Connect Wallet** button in the top navigation bar.
2. Choose your wallet from the modal — MetaMask, Coinbase Wallet, WalletConnect-compatible wallets, and Rainbow are all supported.
3. Ensure your wallet is set to **Arbitrum One** (Chain ID: 42161). The platform will prompt you to switch networks if needed.
4. Sign the authentication message when prompted. This is a Sign-In With Ethereum (SIWE) verification — it proves you control the wallet without spending any gas.

Some features (the Observer dashboard, Deal Flow feed, and Property Analysis free tier) are accessible without a wallet connection. Most capital and governance features require a connected and authenticated wallet.

### Navigate the Platform

The top navigation is organized into six sections:

| Nav Item | What's There |
|---|---|
| **About** | Mission, team, and platform overview |
| **Disclosure** | Institutional solvency disclosure and compliance documentation |
| **Community** | The Wealth Practice, Land Acquisition Pipeline |
| **Products** | Property Analysis, Deal Intelligence, Deal Flow, Capital Program, Lending Fund, Exchange, Unified AXUSD, DePIN, Banking |
| **Intelligence** | Sentinel, Observer, RE Intelligence |
| **Operations** | Founder Ops, Capital Accounting, Solvency, Syndication, Investor Portal, All Products |

---

## 4. The AXM Governance Token

**What it is:** AXM is an ERC-20 governance and fee-routing token live on Arbitrum One. It is the native governance instrument of the Axiom Protocol ecosystem.

**Contract address:** `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D` (Arbitrum One)

**What AXM governs:**
- Treasury allocation policy decisions
- Protocol upgrade proposals
- Capital program and lending fund parameters
- Land acquisition governance votes

**How to acquire AXM:**
AXM is available through the Axiom Exchange (DEX) at `/dex`. The Exchange Hub contract (`0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D`) operates a V2 DEX ecosystem on Arbitrum One for AXM and AXUSD pairs.

**Participation lockup (staking):**
AXM holders can participate in protocol governance by locking their tokens through the participation lockup mechanism. Locked AXM earns governance weight and contributes to the Graduated Execution Framework qualification scoring.

**Important:** AXM is a governance and fee-routing token. It is not an investment contract, security, or yield-bearing instrument. No returns are guaranteed or implied. Review all disclosures at `/disclosure` before participating.

---

## 5. Unified AXUSD — Protocol Stablecoin

**What it is:** AXUSD is the protocol stablecoin built on the ERC-3643 (T-REX) standard — the institutional framework for compliant real-world asset issuance. It is the primary unit of account and settlement within the Axiom ecosystem.

**Status:** Live on Arbitrum One — 13 verified contracts

**Contract addresses (Arbitrum One):**
- Unified AXUSD Token: `0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7`
- Identity Registry: `0x58f64a1262d5434d6C7637a2309b0999bB6D1970`
- Modular Compliance: `0xaC9E1A91D1C7F584C9FC04E283fae30Ae2F636DD`
- Identity Factory: `0x1A7c55AC9A4AB318039f8E2BDfA82500332c86B9`
- Lending Platform Module: `0xC0177120Fb5922813031a5857f4dF7F01750Bb6F`

**How identity compliance works:**
ERC-3643 embeds identity verification directly into the token standard. Before you can receive AXUSD, your wallet address must be registered in the Identity Registry through the automated KYC process. Once registered, your on-chain identity credential is attached to your wallet — no re-verification needed for subsequent transactions.

**Where AXUSD is used:**
- Lending Fund subscriptions
- Capital Program participation
- Syndication offering subscriptions
- Protocol settlement and fee payments
- Euler V2 lending vault deposits (eAXUSD-4: `0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059`)

**GENIUS Act alignment:**
AXUSD is designed to align with the emerging regulatory framework established by the GENIUS Act. No definitive compliance claim is made — legal review of your specific situation is always required.

**Dashboard:** Navigate to `/axusd-3643` to view your AXUSD holdings, identity status, and the full contract registry.

---

## 6. Community

### 6a. The Wealth Practice

**Route:** `/wealth-practice`
**Status:** Staged Rollout

The Wealth Practice is a structured group savings and allocation program that modernizes the traditional community cooperative savings model with governance controls and institutional audit trails. Groups of defined size make regular contributions, and members receive rotating capital access through a transparent three-stage trust pipeline.

**The three stages:**

| Stage | Description |
|---|---|
| **Forming** | Group is being organized. Members join, contribution parameters are set, and governance rules are established. |
| **Active** | Group is running. Contributions are collected on schedule, rotations are executed according to the group's agreed method, and all activity is recorded on-chain. |
| **Graduated** | Group has completed a full cycle with documented history. Graduated status unlocks access to the Capital Program for participating members. |

**How to start or join a group:**

1. Connect your wallet at `/wealth-practice`.
2. Browse existing groups looking for members, or create a new group by defining your contribution amount, cycle length, and rotation method.
3. Once the group reaches minimum membership and accepts your application, you move into the Forming stage.
4. When the group activates, contributions begin on the defined schedule. Your wallet is linked to your group position — no manual invoicing.
5. Capital is disbursed to each member according to the agreed rotation method, with every disbursement recorded and verifiable.

**Trust scoring:**
Each participant builds a trust score based on their contribution history. On-time contributions, full-cycle completions, and governance participation all contribute to the score. This score carries forward to Capital Program access and other platform features.

**Important:** The Wealth Practice is a structured savings framework, not an investment product. It is not FDIC insured. No yield is guaranteed. Participation is governed by the group's own rules plus protocol-level controls.

---

### 6b. Land Acquisition Pipeline

**Route:** `/land`
**Status:** Staged Rollout

The Land Acquisition Pipeline is a full real estate acquisition lifecycle platform with on-chain governance and voting. Properties move through documented stages from initial identification through due diligence, community governance approval, and acquisition — with every stage verifiable on-chain.

**The pipeline stages:**

| Stage | What Happens |
|---|---|
| **Identified** | Property is flagged as a candidate with public summary and initial data |
| **Due Diligence** | Structured checklist underway — title, zoning, environmental, financial analysis |
| **Approved** | Community governance vote has cleared the acquisition |
| **Acquired** | Acquisition complete, recorded on-chain |

**How the governance vote works:**

1. A property moves to Due Diligence and a proposal is submitted to the governance system.
2. AXM holders vote for or against the acquisition within the proposal window.
3. Quorum requirements must be met for the vote to be valid.
4. Outcomes are recorded on-chain with full vote tally.

**Community funding pools:**
Each candidate property has a community funding pool where members can contribute toward the acquisition target. Contributions and progress are tracked in real time with progress meters visible to all participants.

**Context:** Axiom's active community farmland initiative covers a targeted pipeline of 6+ acres with USDA-supported development planning. The land pipeline is a framework for bridging digital capital to real assets — specific acquisitions are subject to market conditions, governance approval, and regulatory requirements.

---

## 7. Products

### 7a. Property Analysis

**Route:** `/property`
**Status:** Live
**Pricing:** Free (3 per month) | Base ($4.99 per report) | Premium ($14.99 per report)

The Property Analysis tool provides structured, data-driven reports for any US residential property before you commit time or money to a deal.

**How to run a report:**

1. Navigate to `/property`.
2. Enter any US property address in the search field.
3. Select your analysis tier (Free, Base, or Premium).
4. The system queries verified data providers and returns a full report within seconds.

**What each tier includes:**

| Feature | Free | Base | Premium |
|---|---|---|---|
| Value range (low / mid / high) | Yes | Yes | Yes |
| Rent range estimate | Yes | Yes | Yes |
| Rehab cost band | Yes | Yes | Yes |
| Confidence score (0–100) | Yes | Yes | Yes |
| Risk flags with severity | Yes | Yes | Yes |
| Census neighborhood context | Yes | Yes | Yes |
| Tighter valuation range | — | Yes | Yes |
| Property details (sqft, beds, baths) | — | Yes | Yes |
| Tax assessment and sale history | — | Yes | Yes |
| Deal grade (A–F) | — | Yes | Yes |
| Rental comparables (RentCast) | — | — | Yes |
| Walk Score and Transit Score | — | — | Yes |
| Full neighborhood demographic analysis | — | — | Yes |

**Data sources:** US Census Bureau, Federal Housing Finance Agency (FHFA), OpenStreetMap, RentCast, Walk Score API. Every source is attributed in the report.

---

### 7b. Deal Intelligence Workspace

**Route:** `/deal-intelligence`
**Status:** Live

Deal Intelligence is the institutional-grade underwriting engine at the center of the platform. It takes raw property data and produces a complete investment analysis with financial modeling, AI advisory, cost estimation, field inspection, and decision documentation — all in one workspace.

**How to create a deal:**

1. Navigate to `/deal-intelligence` and click **New Deal**.
2. Enter the property address. The system normalizes it, searches existing records, and creates a full property profile enriched with verified data.
3. Select your investment strategy: BRRRR, Fix and Flip, Buy and Hold, Note, or Multifamily.
4. Build your financial scenario using the workspace inputs.

**Workspace tabs:**

| Tab | What It Does |
|---|---|
| **Overview** | Property profile, key metrics, IVCEE risk analysis, AI acquisition advisory |
| **Scenarios** | Build multiple underwriting scenarios (optimistic, base, stress) side by side |
| **Field Intelligence** | Walk inspection sessions — log property conditions system by system |
| **Cost Intelligence** | Craftsman NCE cost estimates — full line-item rehab budgets with regional pricing |
| **Deal Assistant** | AI chat grounded in your deal assumptions, metrics, risks, and scope |
| **Documents** | Upload deal documents for automated AI extraction and analysis |
| **Due Diligence** | Structured DD checklist — title, environmental, zoning, financial, and legal |

**IVCEE — Institutional Viability and Capital Efficiency Engine:**
IVCEE provides six layers of institutional risk analysis on every deal:
- **Probability model:** Viability vs. failure probability, dominant risk factor
- **Stress tests:** DSCR compression, vacancy spikes, interest rate increases
- **Sensitivity matrix:** How changes in purchase price or rent shift the deal
- **Refinance risk:** LTV at refi, DSCR at refi, equity extraction probability
- **Downside protection:** Break-even rent, break-even price, margin of safety
- **Capital efficiency:** Score and rank vs. all other deals in the system

**AI Acquisition Advisory:**
After underwriting, the AI advisor reads all deal metrics and delivers a verdict (Strong Proceed / Conditional Proceed / Hold / Reject), a recommended offer strategy with specific negotiation leverage points, creative financing structures with associated risk levels, and a path to viability for marginal deals.

**Multi-Exit Strategy Engine:**
8 underwriting strategies analyzed simultaneously with comparison and ranking, so you can evaluate BRRRR, Fix and Flip, Buy and Hold, and other approaches on the same property without rebuilding your numbers each time.

---

### 7c. Deal Flow — Distressed Property Feed

**Route:** `/distressed-feed`
**Status:** Live

Deal Flow aggregates real distressed property listings from government agencies and private wholesalers into a single searchable feed.

**Government data sources:**
- U.S. Department of Housing and Urban Development (HUD HomeStore)
- Fannie Mae HomePath
- Freddie Mac HomeSteps
- USDA Rural Development
- Tax Sales and Sheriff Sales

**What each listing shows:**
- Property photos from the original government listing
- Address, city, state, zip, and county
- List price set by the government agency
- Property specifications: bedrooms, bathrooms, square footage, year built
- Distress type classification: foreclosure, REO, tax lien, wholesale, short sale, auction
- Direct link to the source listing on the government website

**How to filter:**
Use the filter panel to narrow by state, city, distress type, property type, price range, and sort by newest, price, discount percentage, or auction date.

**Buy Box Matching:**
Set your acquisition criteria once and the system flags incoming deals that match. Define target states and cities, price range, property type, minimum bedrooms, and maximum price per square foot.

**Wholesaler Submission Portal:**
Licensed wholesalers can submit off-market deals directly into the pipeline. Submissions include property details, asking price, ARV, rehab estimate, and contract end date. Every submission is reviewed before being published.

**Instant Deal Analysis:**
Every listing has an "Analyze Deal" button that sends the property directly to Deal Intelligence — one click populates the address, resolves all property data, and opens a full underwriting workspace with no manual data entry.

---

### 7d. Capital Program

**Route:** `/pilot`
**Status:** Live

The Capital Program is Axiom's primary community investment vehicle — a $1 million dual-asset capital deployment program structured as two Special Purpose Vehicles (SPVs) with institutional-grade reporting, treasury controls, and full audit trails.

**Structure:**
- Two SPVs with defined investment mandates per vehicle
- Treasury bucket system with fixed allocation percentages
- Reserve health monitoring per SPV
- Expansion gate — program rules prevent scale-up until validation thresholds are met

**What the dashboard shows:**
- Capital committed, funded, and distributed across both SPVs
- Per-SPV: target purchase price, equity allocated, debt amount, current valuation, occupancy rate, target yield, monthly net cash flow
- Distribution history with complete tracking
- Full audit log: action, actor role, amount, and timestamp for every event

**Sub-pages:** Performance, Projections, Reports, Documents, Distributions, Audit Log, Investor Roster

**Who can participate:** Accredited investors and LP participants in the Capital Program. Graduated Wealth Practice groups may be eligible for Capital Program access as a program benefit.

---

### 7e. Lending Fund

**Route:** `/lending-fund`
**Status:** Configured (operational structure in place)

The Axiom Lending Fund provides property-secured bridge capital for real estate acquisition and development, structured as an SEC Regulation D 506(c) offering.

**Fund structure:**
- Short-term bridge loans up to 12 months
- Strategies: Fix and Flip and property acquisition
- Maximum 70% LTV on after-repair value
- DSCR requirements: applications with DSCR below 1.25 are flagged for additional review
- Variable interest rates based on risk tier assessment

**Contract addresses (Arbitrum One):**
- Vault: `0xF4AcD4B7EaBfDA7E1b96D3abA1C6340557aa93E5`
- Manager: `0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958`

**Investor onboarding process:**
1. Connect wallet and complete SIWE authentication
2. Review and acknowledge the Private Placement Memorandum (PPM) and Risk Disclosure Supplement
3. Complete accredited investor verification (questionnaire-based, as required by SEC Rule 506(c))
4. Submit subscription commitment in AXUSD through the on-chain vault

**Borrower application process:**
1. Submit application with property address, purchase price, rehab budget, and ARV
2. The underwriting engine calculates DSCR, LTV, and assigns a risk tier
3. Applications are reviewed and funded through the administrative dashboard

**Important:** Participation is limited to accredited investors only. This is not an offering to the general public. Review all fund disclosures before committing capital. Rates are variable.

---

### 7f. Exchange (DEX)

**Route:** `/dex`
**Status:** Live

The Axiom Exchange is a V2 DEX ecosystem on Arbitrum One with 10 mainnet automated control layer contracts for AXM and AXUSD trading pairs. All settlement is recorded on-chain with a full audit trail.

**Exchange Hub contract:** `0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D` (Arbitrum One)

**How to swap:**
1. Connect your wallet at `/dex`
2. Select the token pair you want to swap
3. Enter the amount and review the quote, including price impact
4. Confirm the transaction in your wallet

**Liquidity provision:**
AXM and AXUSD holders can contribute liquidity to supported pools and earn a share of trading fees. Liquidity positions are tracked on-chain.

---

### 7g. DePIN

**Route:** `/depin/denet`
**Status:** Configured

Axiom's DePIN (Decentralized Physical Infrastructure Network) integration provides decentralized storage infrastructure through DeNet node participation. DeNet provides censorship-resistant data storage for the protocol's off-chain records and IPFS-backed document storage.

**Node Suite contract:** `0x223dF824B320beD4A8Fd0648b242621e4d01aAEF` (Arbitrum One)

**How to contribute:**
Node operators connect their storage infrastructure to the DeNet network. Contributions are tracked on-chain and may be eligible for network rewards. Navigate to `/depin/denet` for setup instructions and node status.

---

### 7h. Banking

**Route:** `/banking`
**Status:** Configured — traditional banking operational; crypto custody in staged activation

Axiom Banking is a unified banking layer combining FDIC-insured traditional banking with institutional crypto custody.

**Traditional banking (powered by Unit Finance):**
- FDIC-insured deposit accounts
- ACH funding (deposit from your bank account)
- ACH send (pay from your Axiom account)
- Debit card issuance
- KYC/identity verification built into onboarding
- Wealth Pool accounts — group-linked accounts tied to your Wealth Practice group
- Transaction history and pending approvals dashboard

**How to set up your banking account:**
1. Navigate to `/banking`
2. Complete the KYC verification process — government ID and personal information required
3. Fund your account via ACH from an external bank account
4. Use your debit card for everyday purchases or ACH for larger transfers

**Crypto custody (powered by BitGo):**
- Institutional-grade self-custody wallets for AXM, AXUSD, and ETH on Arbitrum
- Multi-party authorization spending controls
- Receive addresses with confirmed and spendable balance tracking
- Transaction history per wallet

**Bridge Service:**
Convert between fiat and crypto directly within the platform. The Bridge Service provides live CoinGecko price quotes and full status tracking on every conversion transaction.

---

## 8. Intelligence

### 8a. MIRDT — Market Intelligence and Risk Disclosure Terminal

**Route:** `/mirdt` (via Intelligence nav)
**Status:** Live

MIRDT is a probabilistic trend-following analysis system for digital assets and US equities. It generates structured market setups with entry zones, invalidation prices, confidence scores, and full probabilistic outcome ranges.

**What a MIRDT setup includes:**
- Asset and market being analyzed
- Entry zone: the price range where the setup is valid
- Invalidation price: the point at which the thesis is no longer valid
- Thesis summary: plain-language explanation of the market structure
- Confidence score (0–100): reflects the quality and alignment of the signal data
- Signal Z-score: statistical measure of deviation from baseline
- Probabilistic outcomes: P5 (5th percentile), P50 (median), P95 (95th percentile) expected prices
- Volatility estimate and liquidity context notes
- Immutable data snapshot reference for independent auditability

**Important:** All MIRDT outputs are explicitly probabilistic. No directional certainty is claimed. Every page displays a full risk disclosure. MIRDT is a research and educational tool — it is not investment advice.

**MIRDT Execution Model:**
A deterministic, auditable paper trading engine that executes simulated trades based on MIRDT signals. Trades are logged with SHA-256 hash chains for tamper-evident verification. All paper trading results feed into the Proof of Execution Playbook.

---

### 8b. Sentinel — Capital Decision Layer

**Route:** `/sentinel`
**Status:** Live (Advisory Mode)

Axiom Sentinel is a unified capital decision and risk authorization layer. Sentinel monitors protocol positions, evaluates risk exposure, and either advises or enforces capital controls depending on its authority mode.

**Current mode:** Advisory Only. Sentinel generates recommendations and full decision logs with rationale — it does not autonomously move capital.

**What Sentinel monitors:**
- Protocol treasury health and reserve ratios
- Active position exposure and concentration limits
- Regime state (from the Adaptive Metrics Engine)
- Hard brake triggers and gate status
- Cross-module risk signals from MIRDT, Capital Accounting, and Solvency

**Reading the dashboard:**
Sentinel presents risk assessments in structured cards with color-coded status indicators. Each assessment includes the metric being evaluated, the current value, the threshold, the risk level, and the recommended action.

---

### 8c. Observer — Institutional Transparency Dashboard

**Route:** `/observer`
**Status:** Live

Observer is a read-only transparency dashboard for treasury and governance activity. It requires no wallet connection — it is a public-facing accountability interface for anyone who wants to verify what the protocol holds and what its governance controls are set to.

**What Observer shows:**
- Live treasury composition with asset breakdown and percentage allocations
- Governance control settings and current policy modes
- Recent governance actions with actor, action type, and timestamp
- Protocol-level operational status across all major modules
- Arbitrum One network health metrics

**Who uses Observer:** Institutional allocators conducting due diligence, journalists, regulators, grant reviewers, and anyone who wants transparent verification of protocol activity without needing a wallet.

---

### 8d. RE Intelligence

**Route:** `/re`
**Status:** Configured

RE Intelligence is the real estate market intelligence layer, aggregating market data and property analytics for investment decision support. It provides market-level context for the deal underwriting tools — including comparable transaction trends, market velocity, and pricing momentum for target markets.

---

## 9. Cost Intelligence Engine

**Accessed via:** Deal Intelligence Workspace → Cost Intelligence tab
**Status:** Live

The Cost Intelligence Engine is Axiom's verified rehab underwriting moat. It produces institutional-grade construction cost estimates grounded in the Craftsman National Construction Estimator (NCE) cost database, with regional adjustments and full line-item audit trails.

**Why it matters:** Rehab cost estimation is where most investment analyses fail. Most tools use rough per-square-foot guesses that do not account for property condition, trade-specific costs, or regional labor markets. The Axiom Cost Intelligence Engine uses verified industry cost data — the same Craftsman NCE database that professional construction estimators use — and applies it at the line-item level with regional pricing.

**How to build a cost estimate:**

1. Open a deal in the Deal Intelligence workspace and navigate to the **Cost Intelligence** tab.
2. Select the property type (SFR or Multifamily) and the region. The system auto-applies the appropriate regional pricing factor.
3. Choose a template or build a custom scope:

| Template | Best For |
|---|---|
| Light Cosmetic Rehab | Cosmetic updates only — paint, flooring, fixtures |
| Unit Turn | Quick multifamily unit turnaround |
| Medium Value-Add Rehab | Mid-range renovation across multiple systems |
| Heavy Gut Rehab | Full gut renovation with systems replacement |
| Kitchen Renovation | Kitchen-focused scope |
| Bathroom Renovation | Bathroom-focused scope |
| Exterior Refresh | Curb appeal and exterior systems |
| Full Systems Replacement (MF) | Multifamily full mechanical/systems replacement |

4. Add or adjust scope items. For each item, enter the trade (e.g., electrical, plumbing, HVAC), the condition level (light / medium / full replace), and any notes.
5. Click **Generate Estimate**. The engine maps each scope item to the nearest Craftsman NCE benchmark, applies the regional factor, adds waste and contingency, and produces a complete line-item breakdown in under one second.

**What you see in the output:**
- Grand total, per-unit cost, and per-square-foot cost
- Rehab-to-ARV ratio (a ratio above 35% is flagged as high-risk)
- Trade breakdown chart (what percentage of the budget goes to each trade)
- Per-line-item: description, Craftsman benchmark reference, quantity, unit cost, regional factor applied, total, confidence score
- Confidence badge per line (green = 80%+, yellow = 60–80%, red = below 60%)

**Regional pricing (14 markets):**

| Market | Factor |
|---|---|
| Atlanta Metro | 0.90x |
| Charlotte Metro | 0.88x |
| Houston Metro | 0.88x |
| Dallas-Fort Worth | 0.90x |
| Phoenix Metro | 0.92x |
| Chicago Metro | 1.05x |
| Detroit Metro | 0.95x |
| Philadelphia | 1.12x |
| Boston Metro | 1.18x |
| New York City | 1.30x |
| Los Angeles | 1.20x |
| San Francisco Bay | 1.25x |
| Seattle Metro | 1.10x |
| National Average | 1.00x |

**Benchmark variance tracking:**
After a project completes, log the actual costs through the benchmarks API. The system computes variance percentages between your estimate, contractor bids, and actuals — building a validated accuracy dataset over time.

---

## 10. Field Intelligence

**Accessed via:** Deal Intelligence Workspace → Field Intelligence tab
**Status:** Live

Field Intelligence is the walk inspection system. It allows you to log property condition system by system during a physical inspection, with Craftsman cost data displayed in real time as you document each condition.

**Creating an inspection session:**

1. Open a deal and navigate to the **Field Intelligence** tab.
2. Click **New Walk Session**.
3. Select the property type: SFR (Single Family Residential) or Multifamily. This determines which systems appear on the inspection form.

**SFR inspection covers 16 systems:**
Interior paint, flooring, kitchen, bathrooms, electrical, plumbing, HVAC, water heater, windows, doors, roof, foundation, garage, landscaping, and general cleanup.

**Multifamily inspection covers 18 systems:**
All SFR systems except garage and landscaping, plus common areas and laundry room.

**Logging conditions:**
For each system, select the condition level:
- **Light** — cosmetic issues only, functional
- **Medium** — functional but needs upgrade or repair
- **Full Replace** — system requires complete replacement

As you select a condition, the Craftsman mid-range cost for that system displays immediately — so you are building a rough cost picture in real time as you walk the property.

**After the walk:**

1. Click **Generate Scope** to run the deterministic scope engine. It reads every condition you logged, maps each one to the appropriate Craftsman benchmark, applies regional pricing, and produces a complete scope document in under one second — no AI call, no estimation, just the math.

2. Click **Scope Brief** to generate an AI-written 4–5 sentence professional field report narrative summarizing the scope findings in plain language suitable for a lender, partner, or investor. The AI reads the deterministic numbers and writes the narrative — it does not change the numbers.

3. Review the **Anomaly Detection** badge. If any scope item's cost falls 35% above or below the portfolio median for that system, it is automatically flagged for review.

**The Deal Assistant** is available in a separate tab and allows you to ask questions about the deal — the AI is grounded in your deal assumptions, metrics, risks, and scope data. Ask about deal viability, financing options, risk factors, or next steps.

---

## 11. Operations (Internal)

The Operations section is the internal control layer for protocol administrators and founders. These tools provide system-wide oversight, capital tracking, solvency monitoring, and syndication management.

### 11a. Founder Ops

**Route:** `/founder-ops`

The Founder Operations Dashboard provides a system-wide operational overview: active automated control layers, live product status, protocol health, pending actions, and cross-module status.

The **Outcomes tab** is where submitted project outcomes await verification review. Each outcome shows the property, the claimed results (actual rehab cost, timeline, sale price or rent, DSCR), and the supporting evidence. Reviewers click Approve or Reject — the decision is recorded with a note and timestamp, and approved outcomes trigger AXM reward processing.

### 11b. Capital Accounting

**Route:** `/capital`

The Capital Accounting and Performance Intelligence System is a full-stack capital ledger. It maintains double-entry accounting for all capital events, position tracking from open to close, immutable point-in-time snapshots with cryptographic checksums, and performance analytics across multiple timeframes.

**Sub-pages:** Capital Ledger, Performance, Snapshots

**Key metrics tracked:**
- Realized and unrealized profit and loss with mark-to-market valuation
- Return on Capital (RoC) and Return on Deployed Capital (RoDC)
- Capital Efficiency Score
- Variance Stability Index (VSI)
- Drawdown analysis: peak-to-trough depth and recovery duration

### 11c. Solvency Console

**Route:** `/solvency`
**Status:** Live

The Solvency Console is a three-mode institutional solvency dashboard that publishes real-time protocol treasury health.

**Three operating modes:**
- **Allocator View** — summary dashboard for capital allocators evaluating protocol health
- **Clearinghouse View** — technical solvency metrics for settlement and counterparty review
- **Regulatory View** — compliance-oriented presentation of reserves, liabilities, and policy state

**Key metrics displayed:**

| Metric | Definition |
|---|---|
| Treasury Total USD | Total value of all protocol-held assets |
| Liquid Treasury | Assets available without lockup or delay |
| Reserves Total | Designated reserves not available for deployment |
| Liabilities Total | AXUSD outstanding supply (obligations) |
| Coverage Ratio (CR) | Treasury / Liabilities — primary solvency measure |
| Reserve Ratio (RR) | Reserves / Liabilities |
| Loss Buffer USD | Dollar amount the protocol can absorb before CR falls below 1.0x |
| Policy Mode | Bootstrap / Operational / Stress — determines which rules apply |

**Snapshot verification:**
Every solvency snapshot includes a SHA-256 checksum that can be independently verified. The snapshot ID and timestamp are displayed at the top of the disclosure page. Anyone can verify the data has not been altered since the snapshot was published.

### 11d. Syndication

**Route:** `/syndication`

The Syndication module manages the complete lifecycle of real estate offerings from structuring through raising, funding, and investor management.

**Supported offering types:**
- Reg D 506(b)
- Reg D 506(c)
- Regulation CF
- Community Pool
- Club Deal
- Pilot Offering

**Offering lifecycle states:**
Draft → Structuring → Raising → Funded → Active → Winding Down

**What the dashboard tracks per offering:**
- Pipeline count and subscription count
- Total capital committed and total funded
- Capital call schedule with overdue flagging
- Distribution history with on-chain transaction links
- Document vault with public and investor-visibility tiers

### 11e. Investor Portal

**Route:** `/syndication/portal`

The LP Investor Portal is a wallet-authenticated dashboard for limited partners to access their complete capital position across all offerings.

**How to access:**
1. Navigate to `/syndication/portal`
2. Connect your wallet
3. Sign the SIWE authentication message

**What the portal shows:**
- Holdings and cap table position across all offerings
- Subscription history and commitment records
- Capital calls with overdue flagging
- Distribution records with on-chain transaction verification links
- Offering documents available to your investor tier

---

## 12. Proof of Execution

**Route:** Accessible via Operations → Proof of Execution
**Status:** Live

The Proof of Execution system ties market intelligence (MIRDT signals), paper trading, and real-world project outcomes together into a single verifiable track record.

**MIRDT Execution Model:**
Every paper trade executed through the MIRDT Execution Model is logged with a SHA-256 hash chain for tamper-evident verification. Trades are matched to MIRDT setups that generated them — creating an auditable link between market intelligence and execution results.

**Project Outcome Verification:**
When a real project is completed, the operator submits the actual results: final rehab cost, timeline in days, sale price or stabilized rent, DSCR, and supporting evidence documents. The submission enters the verification pipeline:

1. **Submitted** — outcome record created, evidence attached
2. **Under Review** — Founder Ops team reviews evidence against claims
3. **Approved** — outcome verified, AXM rewards issued to the submitting wallet
4. **Rejected** — outcome not verified, reason documented

**Why this matters:**
Every verified outcome becomes part of the network's validated dataset — improving the Cost Intelligence Engine's regional accuracy, informing the MIRDT model's calibration, and building a transparent track record of disciplined execution. AXM rewards for verified data create an economic incentive for accurate, evidence-backed reporting.

---

## 13. Disclosure and Compliance

**Route:** `/disclosure`
**Status:** Live

The `/disclosure` page is the comprehensive institutional disclosure document for Axiom Protocol. It is the canonical source of truth for all compliance-relevant information.

**What the disclosure page covers:**
- Snapshot ID and timestamp at the top — every disclosure is tied to a specific, timestamped solvency snapshot
- Treasury and liability headline numbers derived from the latest solvency snapshot
- Coverage ratio, reserve ratio, and loss buffer with formulas
- Operational status of every module: Live / Configured-Inactive / Planned
- Full contract address registry with status (active / deprecated)
- ERC-3643 Unified AXUSD migration notice
- GENIUS Act alignment language
- Full definitions section with formulas for CR, RR, LBR, and LD

**The 72 verified contracts:**
Axiom Protocol has 72 verified automated control layers deployed and auditable on Arbitrum One (Chain ID 42161). Every contract address is published on the disclosure page and verifiable on Arbiscan.

**Contract standards in use:**
- ERC-20: AXM governance token
- ERC-3643/T-REX: Unified AXUSD stablecoin
- ERC-4626: Euler lending vault
- ERC-1167: Identity Factory (clone pattern)
- ONCHAINID: Wallet identity standard
- SIWE: Sign-In With Ethereum authentication

**Legal standing:**
Axiom Protocol is not a bank, broker-dealer, or registered investment advisor. Participation in any product requires independent legal and financial evaluation. No returns, yields, or profits are guaranteed. Rates described as variable. Review all disclosures at `/disclosure` before participating.

---

## 14. The Roadmap

Axiom Protocol is in its Bootstrap Phase, with a clear build-out roadmap toward a sovereign digital-physical economy.

**Completed (2023–2025):**
- Community farmland initiative with USDA-supported development planning established
- Axiom Protocol infrastructure design and initial build
- 72 automated control layers deployed on Arbitrum One
- DEX V2 ecosystem live on mainnet
- AXM governance token live on mainnet
- Capital Program launched ($1M dual-asset, dual-SPV structure)
- ERC-3643 Unified AXUSD deployed (T-REX compliant)
- SEC Reg D 506(c) Lending Fund structured and configured
- FDIC-insured banking via Unit Finance operational
- Cost Intelligence Engine with Craftsman NCE data deployed
- MIRDT, Sentinel, and Observer intelligence layer operational
- Deal Intelligence with IVCEE underwriting engine live
- Syndication module and LP Investor Portal live
- Field Intelligence with property-type discrimination live

**In Progress (2026):**
- Proof of Execution outcome verification pipeline
- Expanded regional Craftsman benchmark validation from live project data
- Wealth Practice staged rollout and Capital Program pathway
- Land Acquisition Pipeline governance framework deployment

**Planned — Universe Blockchain (L3):**
The long-term vision is the migration of Axiom Protocol's core settlement layer to Universe Blockchain — a dedicated Arbitrum Orbit L3 chain purpose-built for the Axiom Protocol economy. Universe L3 will provide:
- Lower transaction costs for community participants
- Native AXM-denominated gas fees
- Direct bridge between Arbitrum One (L2) and Universe (L3)
- Sovereign chain governance aligned with AXM token holders

The Universe L3 chain definition is already prepared in the codebase and will be activated when the chain is ready for deployment.

**The long-term objective:**
A self-sovereign financial infrastructure with its own economic engine — complete money movement layers (on-ramp, credit, savings, insurance, payments), compliance infrastructure, a developer platform, and cross-chain settlement. The platform will support communities in acquiring and governing real assets with the same rigor as professional capital allocators.

---

## 15. Institutional Vocabulary Glossary

Axiom Protocol uses precise, allocator-friendly vocabulary for all disclosure-facing content. The following table maps common technical terms to their approved equivalents.

| Common Term | Axiom Terminology |
|---|---|
| Smart contracts | Automated control layers |
| Multi-sig | Multi-party authorization |
| DeFi / Decentralized finance | On-chain financial rails |
| Tokenization | Asset onboarding and issuance |
| Staking | Participation lockup |
| SUSU / Savings Circle / ROSCA | The Wealth Practice |
| APY / Guaranteed returns | Variable (rates are variable; no yield is guaranteed) |
| Profit / Get rich | Expand structural wealth-building capacity |

**Maturity labels used throughout the platform:**

| Label | Meaning |
|---|---|
| Live | Operational and active |
| Staged Rollout | Available but rolling out in phases |
| Bootstrap Phase | Early operational phase |
| Configured (Inactive) | Built and configured; not yet activated |
| Planned | On the roadmap, not yet built |

**Forbidden phrases (never used in platform communications):**
- "The only platform" / "Sole platform"
- "Guaranteed returns" / "Guaranteed yield"
- "GENIUS Act compliant" (use: "designed to align with the GENIUS Act framework")
- "We own" / "Owned land" (use: "targeted acquisition pipeline")
- "Make them wealthier" / "Get rich"

---

## Closing Note

Axiom Protocol is built from real execution — an actual community farmland acquisition, verified automated control layers on a public blockchain, and a founder-led infrastructure roadmap developed over more than two decades of hands-on real estate experience.

The platform is governance-first, not yield-first. Every product is built around verifiable execution, not marketing narratives. Every number on every page comes from a verified data source or on-chain record — nothing is fabricated or estimated without disclosure.

The core conviction behind this work: sustainable financial systems are not defined by yield generation alone, but by risk discipline, structural integrity, and decision architecture.

**Platform:** axiomprotocol.app
**Network:** Arbitrum One (Chain ID 42161)
**Contact:** `/contact`
**Disclosure:** `/disclosure`

---

*This document is for informational purposes only. Nothing in this document constitutes investment advice, legal advice, or a solicitation to buy or sell any security or digital asset. All rates described as variable. No returns, yields, or profits are guaranteed or implied. Review all disclosures at axiomprotocol.app/disclosure before participating in any platform product.*
