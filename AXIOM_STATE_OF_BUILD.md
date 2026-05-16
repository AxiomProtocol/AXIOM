# Axiom Protocol — State of Build
**Generated:** May 16, 2026
**Purpose:** Decision-making reference for integration prioritization

---

## Executive Summary

Axiom Protocol is a large, multi-domain financial platform built on Next.js with a PostgreSQL database, two live blockchain deployments (Arbitrum One + Avalanche C-Chain), and deep integrations across custody, banking, payments, real estate, AI, and compliance. The codebase is production-grade in its core financial rails and identity layers. Several modules exist as scaffolding or sandbox-only — these are clearly flagged below.

---

## 1. Blockchain — What Is Live vs. What Is Not

### LIVE — Arbitrum One (Chain ID: 42161)
The primary execution environment. All core contracts are deployed and active.

| Contract | Address | Role |
|---|---|---|
| AXM Token (governance) | `0x864F...539D` | Protocol governance token |
| AXUSD (ERC-3643 stablecoin) | `0x7358...b89C` | Internal settlement layer |
| AXUSD ERC-3643 Token | `0xD611...Ade7` | Compliance-wrapped AXUSD |
| Identity Registry | `0x58f6...1970` | KYC/investor identity |
| Modular Compliance | `0xaC9E...36DD` | Transfer rule engine |
| Claim Issuer | `0x579A...B313` | Credential signing |
| Canonical PSM | `0x5db5...4922` | Peg Stability Module (USDC) |
| EVK Open Market | `0xacdA...09B2` | Lending vault (Euler V2) |
| Euler Earn AXUSD | `0x4359...B45B` | Yield aggregation |
| Governance Hub | `0x52Dc...530E` | On-chain governance |
| AxiomScoreSBT | `0x8Ae0...B008` | Soulbound credit score token |
| AxiomSusuHub | `0x6C69...95A5` | Wealth Practice group economics |
| AXIOM Credit Market | Deployed | Lending facility |
| AXIOM Fixed Loan | Deployed | Fixed-rate loan logic |
| AXIOM Oracle Adapter | Deployed | Multi-source price feed |
| AxiomFounderBadge (NFT) | Deployed | Founder access NFT |
| AxiomParticipation (NFT) | Deployed | Participation NFT |
| AxiomLandReceipt (NFT) | Deployed | Physical land receipt NFT |
| AXGoldVault | Deployed | AXAU gold-backed reserve |
| NAVEngine | Deployed | Net asset value calculation |
| CommodityRegistry | Deployed | Tokenized commodity registry |

**Total active contracts on Arbitrum: 53+**

---

### LIVE — Avalanche C-Chain (Chain ID: 43114)
**Deployed May 16, 2026.** Full ERC-3643 stablecoin suite.

| Contract | Address | Role |
|---|---|---|
| AxiomStable3643 (AXUSD) | `0x98F325185aDaD3D9079944a9bdd99dA315B72322` | Compliant AXUSD on Avalanche |
| IdentityRegistry | `0xc3bF0915bFb5F9210b8bA9AB2Df102E5B792F7eC` | Identity layer |
| ModularCompliance | `0x7892EcA641Edd96E251F8267f1F5394886E7FA5F` | Compliance engine |
| CountryAllowModule | `0xBEfeeC85cB79923b1205c3Ca9E75742319C3b4DD` | Geo-fencing |
| TransferLimitModule | `0x7122092c95e95C96Dd3098FB8d3236a2e4DB40d1` | Velocity limits |
| IdentityRegistryStorage | `0x586c739f80F14Bf119b631A3F82217393E7aD4b0` | Identity storage |
| TrustedIssuersRegistry | `0x17AFdc00949Dd3f27e14dF7CC72BD2CcDaAEA44e` | Trusted claim issuers |
| ClaimTopicsRegistry | `0x9B00f8b54580eCb2CFBdf6A25657285B9e8EC94b` | Claim topic registry |

**Status notes:**
- Admin roles held by deployer EOA — multisig transfer pending
- `allowAll=true` — all countries enabled
- Contracts NOT yet verified on Snowtrace
- No front-end pages yet connect to Avalanche AXUSD

---

### PROTOTYPE — Sui Move
Phase 8 complete. Contracts are hardened and test-ready but not yet deployed to Sui mainnet.

| Module | Purpose |
|---|---|
| `claim_campaign.move` | Merkle-based token distribution |
| `guarded_treasury.move` | Capped supply and minting controls |
| `merkle.move` | On-chain proof verification |

- 28 tests passing
- TypeScript proof toolchain built (`lib/sui/`)
- API routes built (`/api/sui/`)
- Claim UI built (`/sui/claim`)
- Operator dashboard built (`/operator/chains/sui-phase8`)
- **NOT on mainnet yet**

---

### NOT STARTED — Planned Chains

| Chain | Intended Role | Blocker |
|---|---|---|
| Polygon | Identity bridge (ERC-3643 credential mirroring) | SDK not gathered, no contracts written |
| Stellar | Payment rail (remittance / cross-border) | Adapter built in code; no live anchor deployment |
| Canton Network | Institutional interoperability | Partner docs not received |
| Cosmos / Axiom Hub | Sovereign long-term chain | Architecture not finalized |

---

## 2. Application — Pages and User Interfaces

### Public-Facing Pages
| Page | Route | Status |
|---|---|---|
| About / About Us | `/about`, `/about-us` | Built |
| How It Works | `/how-it-works` | Built |
| Infrastructure | `/infrastructure` | Built |
| System Map | `/system-map` | Built |
| Roadmap | `/roadmap` | Built |
| Disclosure (main) | `/disclosure` | Built |
| Access Controls Policy | `/disclosure/access-controls-policy` | Built |
| Collateral Risk Policy | `/disclosure/collateral-risk-policy` | Built |
| Data Retention Policy | `/disclosure/data-retention-policy` | Built |
| Information Security Policy | `/disclosure/information-security-policy` | Built |
| Trust index | `/trust` | Built |
| Trust — Audits | `/trust/audits` | Built |
| Trust — Governance | `/trust/governance` | Built |
| Trust — Security | `/trust/security` | Built |
| Trust — Team | `/trust/team` | Built |
| Trust — No Bridges | `/trust/no-bridges` | Built |
| Loss Coverage Reserve | `/trust/loss-coverage-reserve` | Built |
| FAQ | `/faq` | Built |
| Contact | `/contact` | Built |
| Partner | `/partner` | Built |
| Team | `/team` | Built |
| Impact | `/impact` | Built |
| Community | `/community` | Built |
| Community Credit | `/community-credit` | Built |
| Land | `/land` | Built |
| Privacy | `/privacy` | Built |
| Start | `/start` | Built |
| NFT | `/nft` | Built |

### Asset & Token Pages
| Page | Route | Status |
|---|---|---|
| AXAU (gold reserve overview) | `/axau` | Built |
| AXAU Buy | `/axau-buy` | Built |
| AXAU Disclosure | `/axau-disclosure` | Built |
| AXAU Early Access | `/axau-early-access` | Built |
| AXUSD | `/axusd` | Built |
| AXUSD ERC-3643 | `/axusd-3643` | Built |
| Real Assets (overview) | `/real-assets` | Built |
| Asset Dashboard | `/assets/dashboard` | Built |
| Supported Assets Index | `/assets` | Built |
| Asset Detail | `/assets/[symbol]` | Built |
| KAG (Silver Reserve) | `/commodities/kag` | Built |
| Commodities Index | `/commodities` | Built |
| Commodity Framework | `/commodity-framework` | Built |
| Commodities Insights | `/commodities/insights` | Built |

### Financial Product Pages
| Page | Route | Status |
|---|---|---|
| Dashboard | `/dashboard` | Built |
| Earn | `/earn` | Built |
| Earn AXUSD | `/earn/axusd` | Built |
| Borrow | `/borrow` | Built |
| Credit | `/credit` | Built |
| Savings | `/savings` | Built |
| DEX | `/dex` | Built |
| Lending Fund (index) | `/lending-fund` | Built |
| Lending Fund Apply | `/lending-fund/apply` | Built |
| Lending Fund Invest | `/lending-fund/invest` | Built |
| Lending Fund Borrow | `/lending-fund/borrow` | Built |
| Syndication Portal | `/syndication/portal` | Built |
| Syndication Offerings | `/syndication/offerings/[id]` | Built |
| Secondary Market | `/secondary/marketplace` | Built |
| Secondary Issuer | `/secondary/issuer` | Built |
| Capital Index | `/capital` | Built |
| Capital Ledger | `/capital/ledger` | Built |
| Capital Performance | `/capital/performance` | Built |
| Protocol Intelligence | `/capital/protocol-intelligence` | Built |
| Portfolio Real Assets | `/portfolio/real-assets` | Built |
| Profile | `/profile` | Built |

### Banking & Payment Pages
| Page | Route | Status |
|---|---|---|
| Banking index | `/banking` | Built |
| Banking My Account | `/banking/my-account` | Built |
| DAO Account Dashboard | `/banking/dao-account/dashboard` | Built |
| Onramp | `/onramp` | Built |
| My Card | `/my-card` | Built |
| Treasury Fund | `/treasury/fund` | Built |
| Card-to-Treasury flow | `/treasury/fund/card` | Built |
| CDP Wallets | `/cdp-wallets` | Built |
| Escrow New | `/escrow/new` | Built |
| Escrow Dashboard | `/escrow/dashboard` | Built |
| Escrow Detail | `/escrow/[id]` | Built |
| Axiom Rail Deposit | `/axiom-rail/deposit` | Built |
| Axiom Rail Withdraw | `/axiom-rail/withdraw` | Built |
| Axiom Payment Rails | `/axiom-payment-rails` | Built |
| Stellar Payments | `/stellar-payments` | Built |
| Direct Deposit | `/direct-deposit` | Built |
| Rent Collection | `/rent-collection` | Built |
| DAO Payroll | `/dao-payroll` | Built |

### Real Estate & Intelligence Pages
| Page | Route | Status |
|---|---|---|
| Property Search | `/property` | Built |
| Property Detail | `/property/[mlsNumber]` | Built |
| Property Reports | `/property/reports` | Built |
| Distressed Feed | `/distressed-feed` | Built |
| Deal Intelligence | `/deal-intelligence` | Built |
| Deal Detail | `/deal-intelligence/deal/[id]` | Built |
| Real Estate Deals | `/re` | Built |
| MIRDT Terminal | `/mirdt` | Built |
| Sentinel | `/sentinel` | Built |
| Solvency | `/solvency` | Built |
| Field Capture | `/field-capture/[sessionId]` | Built |

### Governance & Community
| Page | Route | Status |
|---|---|---|
| Wealth Practice | `/wealth-practice` | Built |
| Governance Bridge Allowlist | `/governance/bridge-allowlist` | Built |
| Proof of Execution | `/proof-of-execution` | Built |
| Execution Framework | `/execution-framework` | Built |
| Transparency | `/transparency` | Built |

### Operator / Admin Pages (Internal)
| Page | Route | Status |
|---|---|---|
| Operator Console | `/operator` | Built |
| Operator Integrity | `/operator/integrity` | Built |
| Operator Reserve | `/operator/reserve` | Built |
| Operator Liquidity | `/operator/liquidity` | Built |
| Operator Attestations | `/operator/attestations` | Built |
| Operator Commodities | `/operator/commodities/admissions` | Built |
| Operator Asset Admissions | `/operator/assets/admissions` | Built |
| Operator Notifications | `/operator/notifications` | Built |
| Operator Policy Decisions | `/operator/policy/decisions` | Built |
| Operator AXAU Stabilization | `/operator/axau-stabilization` | Built |
| Operator Chains — Sui Phase 8 | `/operator/chains/sui-phase8` | Built |
| Operator Treasury Card Deposits | `/operator/treasury/card-deposits` | Built |
| Increase Adapter | `/operator/adapters/increase` | Built |
| Stellar Adapter | `/operator/adapters/stellar` | Built |
| Founder Ops | `/founder-ops` | Built |
| Observer Dashboard | `/observer` | Built (8 sub-pages) |
| Pilot Program | `/pilot` | Built (8 sub-pages) |
| DePIN Observer | `/depin/denet` | Built |
| Sentinel Audit | `/sentinel/audit` | Built |
| Sui Claim | `/sui/claim` | Built |

---

## 3. API Endpoints — What Is Wired

The app exposes **~220+ API routes**. Key groupings:

| Domain | Routes | Status |
|---|---|---|
| Auth (Auth0 + SIWE) | `/api/auth/*` | Live |
| AXAU operations | `/api/axau/*` (15 routes) | Live |
| AXUSD operations | `/api/axusd/*` (12 routes) | Live |
| Axiom Rail (Stellar SEPs) | `/api/axiom-rail/*` (25+ routes) | Built |
| Banking / Increase | `/api/banking/*` (10+ routes) | Live |
| Alchemy (on-chain data) | `/api/alchemy/*` (13 routes) | Live |
| Assets registry | `/api/assets/*` | Live |
| Wealth Practice | `/api/wealth-practice/*` (10 routes) | Live |
| Agent Governance | `/api/agent-gov/*` (10 routes) | Live |
| Admin | `/api/admin/*` (12 routes) | Live |
| Webhooks | `/api/webhooks/alchemy`, `/bitgo`, `/circle`, `/increase`, `/unit` | Live |
| Capital (v1) | `/api/v1/capital/*` | Live |
| Sui | `/api/sui/*` | Built (not on mainnet) |
| Sentinel / Solvency | `/api/solvency`, `/api/volatility` | Live |
| Analytics | `/api/analytics/axau/*` | Live |
| Verified Outcomes | `/api/verified-outcomes/*` | Live |

---

## 4. External Integrations — Wired vs. Placeholder

### FULLY WIRED (production-grade)

| Service | What It Does | Where |
|---|---|---|
| **Auth0** | User authentication and session management | `lib/auth0.ts` |
| **Stripe** | Card payments, subscriptions, webhook handling | `lib/stripe/` |
| **Coinbase Onramp** | Card-to-crypto fiat entry | `lib/onramp/` |
| **BitGo CaaS** | Institutional custody, enterprise wallets | `lib/bitgo/`, `lib/services/BitGoCustodyService.ts` |
| **Alchemy** | Arbitrum RPC, WebSocket transaction tracking, NFT APIs, token data | `lib/alchemy/` |
| **Increase** | ACH transfers, bank account management, insurance holds | `lib/capinfra/adapters/ach/` |
| **Resend** | Transactional email, operator notifications | `lib/email/resend.ts` |
| **RentCast** | Real estate AVM, property data, comparable sales | `server/services/real-estate/rentcast.ts` |
| **Alpha Vantage** | Equity price history for MIRDT terminal | `server/services/mirdt/AlphaVantageProvider.ts` |
| **CoinGecko** | Crypto market data for MIRDT terminal | `server/services/mirdt/CoinGeckoProvider.ts` |
| **Gemini AI** | Text generation, image analysis, NFT artwork | `lib/server/gemini.ts` |
| **Anthropic (Claude)** | Marketing content generation | `lib/server/marketing-ai.ts` |
| **OpenAI** | Marketing and content generation | `lib/server/marketing-ai.ts` |
| **Stellar SDK** | SEP-24, SEP-31, SEP-38 payment flows, Axiom Rail anchor | `lib/multichain/stellar/`, `lib/capinfra/adapters/stellar/` |
| **IPFS / NFT.Storage** | NFT media uploads and pinning | `lib/nft/mediaPipeline.ts` |
| **SIWE** | Sign-In with Ethereum wallet authentication | `lib/middleware/siweAuth.ts` |

### SANDBOX / PARTIAL

| Service | Status | Notes |
|---|---|---|
| **Unit** | Sandbox only | Banking integration scaffolded; not in production flow |
| **ElevenLabs** | Python script only | Referenced in `scripts/generate_podcast.py`; not wired into app |
| **Walk Score** | Referenced | API key present in config; active usage not confirmed |

### CONFIGURED BUT DEFERRED (per launch scope)
- ACH wires via Increase — code exists, deferred from AXAU launch scope
- Direct deposit, rent collection on-chain payout — built, deferred
- Unit bank accounts — sandbox-only

---

## 5. Database — What Is Tracked

**300+ tables** across PostgreSQL (Drizzle ORM). Major domains:

| Domain | Key Tables | Purpose |
|---|---|---|
| **Users & Identity** | `users`, `kyc_verifications`, `cap_users`, `cap_identity_profiles`, `t3_identities` | User profiles, KYC status, on-chain identity |
| **Capital Infrastructure** | `cap_assets`, `cap_positions`, `cap_ledger_entries`, `cap_policy_decisions`, `cap_reserve_holdings` | Asset registry, positions, compliance ledger |
| **AXUSD Operations** | `axusd_alerts`, `axusd_snapshots`, `axusd_trading_pools`, `axusd_oracle_fallback_events`, `axusd_bridge_transactions` | Stablecoin health, peg monitoring, bridge activity |
| **AXAU Operations** | `axau_analytics_events`, `axau_purchase_requests` | Gold reserve purchase flow |
| **Axiom Rail** | `axiom_rail_escrows`, `axiom_rail_payroll_runs`, `axiom_rail_rent_properties`, `stellar_payment_transfers` | Escrow, payroll, rent, Stellar settlements |
| **Banking** | `banking_accounts`, `banking_customers`, `unit_accounts`, `unit_payments`, `increase_participants`, `increase_lp_deposits` | Bank account management, ACH, Unit |
| **Real Estate** | `re_deals`, `re_properties`, `re_parcels`, `re_risk_flags`, `due_diligence_reports`, `dp_listings` | Deal pipeline, property data, risk scoring |
| **Syndication** | `syn_offerings`, `syn_subscriptions`, `syn_cap_table`, `syn_capital_calls` | Investment vehicles, investor commitments |
| **Secondary Market** | `sec_listings`, `sec_bids`, `sec_matched_trades`, `sec_positions` | Secondary market trading |
| **Lending** | `dscr_loan_applications`, `dscr_borrowers`, `real_estate_loans`, `crypto_credit_lines`, `income_credit_lines` | Multiple loan types |
| **Wealth Practice** | `susu_group_members`, `susu_interest_hubs`, `wealth_practice_loans` | Community group economics |
| **Land** | `land_candidates`, `land_campaigns`, `land_fund_subscriptions`, `land_options` | Land acquisition pipeline |
| **MIRDT / Sentinel** | `mirdt_execution_runs`, `mirdt_signal_log`, `sentinel_decisions`, `sentinel_regime_snapshots` | Capital intelligence, risk decisions |
| **AME (Adaptive Metrics)** | `ame_evaluations`, `ame_metric_snapshot`, `ame_stress_scenarios` | Adaptive metrics engine |
| **BitGo** | `bitgo_wallets`, `bitgo_transactions`, `bitgo_custody_policies` | Custody operations |
| **NFT** | `nft_tokens`, `nft_mint_eligibility`, `nft_balances` | NFT minting and tracking |
| **Governance** | `governance_proposals`, `governance_votes`, `cap_bridge_allowlist_proposals` | On-chain governance |
| **Agent Governance** | `ag_agents`, `ag_policies`, `ag_intents`, `ag_executions` | AI agent policy management |
| **Compliance** | `compliance_claims`, `compliance_events`, `compliance_complaints`, `t3_claims` | Regulatory compliance audit trail |
| **DePIN** | `node_operators`, `node_onboarding`, `iot_devices` | DePIN node registry |
| **Wallets** | `axiom_wallet_balances`, `axiom_wallet_transactions`, `custody_wallets` | Internal wallet ledger |
| **Pilot Program** | `pilot_investors`, `pilot_spvs`, `pilot_distributions`, `pilot_audit_trail` | Pilot SPV operations |
| **Document AI** | `doc_extractions`, `doc_extraction_fields` | AI document ingestion |
| **Analytics** | `disclosure_snapshots`, `solvency_snapshots`, `ame_data_snapshot` | System-wide health snapshots |

---

## 6. Component Architecture

### Design System
- **Design Law** — the primary UI system. Serif headings (Georgia), monospace data, navy/forest green/muted gold. Zero border-radius, zero gradients, zero CSS animations.
- All pages use `<DesignLawLayout>` wrapper (nav + footer + container)
- Visual layer (`components/visual/`) for commodity/asset pages uses image assets, not CSS effects

### Component Families
| Family | What It Provides |
|---|---|
| `design-law/` | PageShell, DesignLawLayout, SectionHeading, DataTable, FormField, AuditHeader, NexusBankingPanel |
| `visual/` | HeroBanner, MetricStrip, FeatureCard, StockImageBand (image-based visual depth) |
| `web3/` | WalletButton, KYCVerificationGate, InvestmentModal, SuiWalletConnect, AppKitInitializer |
| `sentinel/` | CircuitBreakerBanner, RegimeTimeline, RiskMechanicsPanel |
| `axau/` | MintRedeemPanel, GetPaxgPanel |
| `observer/` | DeNetMetricsPanel, NodeEconomyDashboard |
| `deal-intelligence/` | AcquisitionMemo, DueDiligencePanel, BenchmarkView |
| `axiomRebuild/` | RebuildHome, FutureLandPipeline, ProofStrip |
| `admin/` | ProposalCard |
| `operator/` | OperatorConsoleLayout, IntegrityPagerStatusBanner |

### UI Libraries
- **Custom components** at root `components/ui/` (Tailwind, no Radix dependency)
- **Shadcn/Radix** at `client/src/components/ui/` (Radix UI primitives, CVA)
- **Wagmi/Viem** for Web3 interactions
- **Lucide React** and **Heroicons** for icons
- **Framer Motion** available (used selectively)

---

## 7. What Is NOT Built Yet

These are either fully absent or exist only as placeholder scaffolding:

| Item | Current State | What's Needed |
|---|---|---|
| **Avalanche front-end** | No UI page connects to Avalanche AXUSD | Build mint/redeem UI wired to Avalanche contracts |
| **Avalanche contract verification** | Unverified on Snowtrace | Submit source code to Snowtrace |
| **Avalanche multisig** | Admin roles on deployer EOA | Transfer roles to Gnosis Safe or equivalent |
| **Polygon integration** | Chain registry entry only | SDK review, credential bridge design, contracts |
| **Stellar live anchor** | Adapter code built, no live deployment | Select anchor partner, deploy Horizon integration |
| **Sui mainnet deployment** | Contracts hardened, not deployed | `sui client publish` to mainnet |
| **ElevenLabs in-app** | Python script only | Wire into API/content pipeline |
| **Unit banking (production)** | Sandbox only | Production Unit API credentials and go-live |
| **Canton / Cosmos** | Architecture notes only | Partner agreement, SDK, full design |
| **Mobile app** | Not started | Expo / React Native |
| **GENIUS Act compliance filing** | Documentation aligned | Formal legal review and submission |
| **RESEND_API_KEY** | Listed as missing secret | Needed for production email delivery |

---

## 8. Infrastructure Summary

| Layer | Technology | Status |
|---|---|---|
| Frontend framework | Next.js (Pages Router) | Live |
| Hosting | Vercel | Live |
| Database | PostgreSQL via Neon (Drizzle ORM) | Live |
| Auth | Auth0 + SIWE (dual-path) | Live |
| Wallet connection | MetaMask, WalletConnect, Reown AppKit | Live |
| Blockchain RPC | Alchemy (Arbitrum mainnet WebSocket) | Live |
| Custody | BitGo CaaS | Live |
| Email | Resend | Live |
| Payments (fiat) | Stripe + Coinbase Onramp | Live |
| Banking (ACH) | Increase | Live (deferred from AXAU launch) |
| Banking (neobank) | Unit | Sandbox |
| IPFS/Filecoin | NFT.Storage (Pinata backend) | Live (NFT minting) |
| AI | Gemini, Claude, OpenAI | Live |
| Real estate data | RentCast | Live |
| Market data | Alpha Vantage, CoinGecko | Live |
| Voice/audio | ElevenLabs | Script-only |
| Arbitrum smart contracts | Hardhat + OpenZeppelin | 53+ contracts live |
| Avalanche smart contracts | Hardhat (isolated env) | 8 contracts live |
| Sui Move contracts | Sui Move toolchain | Hardened, not on mainnet |

---

## 9. Decision Framework — What to Integrate Next

Use this to evaluate priority:

**Highest leverage (closes an open loop on something already built):**
1. Verify Avalanche contracts on Snowtrace — one command, closes audit gap
2. Transfer Avalanche admin roles to multisig — security hardening, low complexity
3. Build Avalanche AXUSD front-end page — connects existing deployment to users
4. Deploy Sui claim contracts to mainnet — Phase 8 work is complete and waiting

**Medium leverage (expands active product surface):**
5. Unit banking — go live from sandbox (neobank accounts, virtual cards for users)
6. Stellar live anchor — Axiom Rail adapter is built; needs an anchor partner live
7. ElevenLabs in-app — wire voice/audio into content or product flows

**Longer horizon (new capability tracks):**
8. Polygon identity bridge — meaningful but requires SDK work and design decisions
9. Mobile app — entirely new surface, large effort
10. Canton / Cosmos — long-term sovereign chain vision, no near-term blocker to unblock

---

*This document reflects the live state of the codebase as of May 16, 2026. Re-run scan after any major deployment or integration milestone.*
