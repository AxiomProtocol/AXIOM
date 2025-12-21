# Axiom Smart City - Sovereign Digital-Physical Economy

## Overview
The Axiom Smart City project aims to establish America's first on-chain sovereign smart city economy: a 1,000-acre fintech smart city with comprehensive digital-physical infrastructure. Envisioned as a nation-level fintech ecosystem, it functions as a bank operating system and a complete sovereign economic engine. Key capabilities include a governance token economy (AXM), full-service digital banking, real estate tokenization, DePIN infrastructure, smart city services, Wall Street integration, cross-chain interoperability, and sustainability initiatives, all while being decentralized and community-governed. The business vision is to create a sovereign digital-physical economy, serving as a model for future smart cities.

## User Preferences
- **Communication style**: Simple, everyday language explaining technical concepts.
- **Video scripts**: Always deliver in a plain text code block format (```text```) so the copy button appears for easy one-click copying. No markdown formatting, no scene directions with brackets - just clean, copyable text with the script, caption, and hashtags.

## System Architecture

### UI/UX Decisions
The frontend features a modular design with a professional gold/black theme, yellow accents for tabbed interfaces, and responsive design. Branding prominently displays "AXIOM" with a golden circular token logo, golden gradient text, and the tagline "America's First On-Chain Smart City." A "Why Axiom Will Be #1" comparison page is integrated into the main navigation.

**Centralized Navigation**: All navigation menus are configured in a single file `lib/navigation.js`. To add new pages to the navigation, edit this file only - it exports `NAV_ITEMS` (main nav), `FOOTER_ECOSYSTEM`, `FOOTER_RESOURCES`, and `FOOTER_COMPANY`. Both the homepage (`pages/index.js`) and shared Layout (`components/Layout.js`) import from this config.

### Technical Implementations
The core **Axiom Protocol Token (AXM)** is an ERC20 governance and fee-routing token, initially on Arbitrum One, with plans to transition to Universe Blockchain (L3) using AXM as native gas. The **Smart Contract Architecture** is multi-phase, starting on Arbitrum One and migrating to Universe Blockchain, encompassing identity, treasury, staking, emissions, land/asset registry, and future modules for DEX, credit scoring, IoT, Wall Street/RWA markets, and community features. A **Complete Banking Product Suite** offers over 30 product families including deposit/savings, credit/lending, payments, investments, tokenized assets, and institutional services, supported by an internal DEX. The architecture incorporates 23 verified smart contracts on Arbitrum One, covering DePIN, Governance, Treasury, Property/Real Estate, Cross-Chain, Realtor System, and Smart City modules for utility metering, citizen identity, and sustainability.

### System Design Choices
The architecture follows a "Product Factory Approach" for scalable product expansion. The blockchain network is currently deployed on Arbitrum One (L2), with plans to transition to Universe Blockchain (L3) post-TGE. Data management utilizes PostgreSQL with Drizzle ORM for relational data and MongoDB for specific analytics. The backend features a centralized contract configuration, a dedicated contract service, and chain validation middleware enforcing Arbitrum One for Web3 operations. API responses consistently return `axmBalance` and `axmUsdValue` fields.

Key features include:
- **Axiom Nodes Marketplace**: For purchasing and managing DePIN nodes with tiered rewards.
- **DEX Exchange**: A comprehensive decentralized exchange with swap, liquidity, pools, and staking functionalities.
- **Governance**: A full-featured governance system with proposals, delegation, and council management.
- **Admin Authentication**: Secure JWT-based authentication for `/admin/*` routes with `withAdminAuth` middleware.
- **Platform Expansion Features**: Includes Node Leasing Marketplace, Staking Tiers, Liquidity Mining, Limit Orders, Treasury Buybacks, Treasury Grants DAO, Node Voting Power, Utility Payments, and IoT Dashboard.
- **API Security**: Comprehensive input validation, sanitization, error handling, and EIP-4361 SIWE authentication.
- **SIWE (Sign-In with Ethereum) Implementation**: Full EIP-4361 for cryptographic wallet verification across key API endpoints and client-side integration.
- **KeyGrow Rent-to-Own Program**: A first-of-its-kind real estate program enabling tenants to build equity through ERC-1155 tokenized fractional property shares (100,000 shares per property). Features property browsing, seller portal, enrollment, equity tracking, and integration with ATTOM Data and RentCast. KeyGrow tables use a dedicated schema module (`shared/keygrowSchema.ts`) to avoid Next.js/webpack compilation issues with large shared schema files. Enhanced with financial analysis metrics including price-to-rent ratio, affordability index, equity projections (1/3/5 year), monthly ownership costs breakdown, cap rate, and time-to-ownership estimates. Walk Score integration ready for walkability, transit, and bike scores. Properties filtered to affordable range ($50K-$375K). **Option Consideration System**: $500 option fee from tenants (legally correct term for rent-to-own, replacing "good faith deposit") is staked in AXM tokens at 8% APR, with rewards accumulating toward the tenant's down payment and credited toward purchase price at closing. Tracked via `keygrow_deposits` table with full staking rewards calculation.
- **Reactive Network Integration (Planned)**: Autonomous, event-driven smart contract automation for DePIN, Governance, Treasury, DEX, Cross-Chain, and Smart City IoT.
- **Whitepaper Documentation**: Comprehensive 14-section whitepaper at `/whitepaper` covering executive summary, market opportunity, technology architecture, tokenomics, ecosystem components, National Bank of Axiom (30+ banking products), Wall Street integration (MarketsAndListingsHub), governance & compliance (ISO 20022 + GENIUS Act), roadmap, financials, risks & mitigations, and legal disclosures.
- **Centralized Environment Validation**: `lib/envValidation.ts` provides standardized functions for checking environment variables (database, APIs, payment services) with graceful fallback responses for production stability.
- **Axiom SUSU (Rotating Savings Groups)**: On-chain ROSCA (Rotating Savings and Credit Association) system enabling community-based savings pools. Members contribute fixed amounts each cycle, with one member receiving the pooled funds each round until everyone has received once. Features include configurable pool parameters (2-50 members, AXM or ERC20 tokens, flexible cycle durations), sequential or randomized payout order, grace periods for late payments, protocol fee routing to treasury, and comprehensive event logging. Integrates with existing AxiomV2 token and treasury vault. Contract: `AxiomSusuHub.sol`, documentation at `docs/SUSU_USER_GUIDE.md`. **Regional Interest Groups** (December 2025): Three-tier off-chain group discovery system - Interest Hubs (regional/city/country), Purpose Groups (pre-commitment savings goals), and Susu Circles (on-chain pools). Users discover groups by region and purpose category (12 preset categories: Emergency Fund, Home Down Payment, Business Startup, Education, etc.). Purpose Groups feature standardized naming format: `{Region} | {Purpose} | {Amount} {Currency} | {Cycle}`. Database tables: `susu_interest_hubs`, `susu_purpose_categories`, `susu_purpose_groups`, `susu_hub_members`, `susu_group_members`, `susu_invitations`, `susu_analytics_events`, `susu_feature_flags`. API endpoints: `/api/susu/hubs`, `/api/susu/groups`, `/api/susu/categories`, `/api/susu/discover`, `/api/susu/groups/[id]/graduate`, `/api/susu/admin/stats`, `/api/susu/admin/feature-flags`. Frontend: "Discover Groups" tab with regional filters, purpose pills, group creation modal, and "Graduate to On-Chain" button for ready groups. **Admin Dashboard** (`/susu-admin`): Overview stats, hub/group management, feature flag toggles with wallet-based authorization. **Analytics Tracking**: Event-driven funnel tracking for hub_join, group_join, group_create, graduation events.
- **PMA Trust (Private Membership Association)**: Axiom operates as a Private Membership Association Trust, providing constitutional protections under 1st Amendment (freedom of association), 4th Amendment (privacy), 5th & 14th Amendment (due process), 9th Amendment (unenumerated rights), and 10th Amendment (reserved powers). Structure: Non-charitable private membership trust with Grantor → Trustee Board → Protector/Council → Members hierarchy. Tokenized membership using whitelist-only ERC-1155/1400 tokens as membership certificates (not securities), with transfer restrictions and revocability clauses. Pages: `/pma` (information), `/pma/join` (application), `/pma/governance` (trust structure). Legal documents: `docs/PMA_TRUST_DECLARATION.md`, `docs/PMA_BYLAWS.md`, `docs/PMA_MEMBERSHIP_AGREEMENT.md`. Applications stored in `pmaApplications` database table.
- **Equity Calculator** (`/tools/equity-calculator`): Interactive rent-to-own equity calculator with sliders for monthly rent, property price, and term. Shows equity projections (1/3/5 year), monthly payment breakdown, and comparison to traditional renting. Includes email capture for lead generation with UTM tracking. Leads stored in `leads` database table.
- **Axiom Academy** (`/academy`): Educational platform with course library, membership tiers (Free/$25 Pro/$99 Enterprise), and email capture. Features 6 starter courses covering Smart City 101, KeyGrow, Financial Literacy, DePIN, SUSU, and Governance. Database tables: `academy_courses`, `academy_lessons`, `academy_memberships`, `academy_progress`, `academy_certificates`.
- **Impact Dashboard** (`/impact`): Real-time platform metrics with animated counters showing community members, equity distributed, KeyGrow enrollments, SUSU pools, DePIN nodes, governance proposals, and global reach. Pulls live data from database with fallback to baseline metrics. Database table: `platform_metrics`.

## Security Audit (December 2025)
A comprehensive security audit was completed covering all 24 deployed smart contracts:
- **Audit Report:** `docs/AXIOM_SECURITY_AUDIT_REPORT.md` - Publishable report with findings, triage, and recommendations
- **Risk Register:** `docs/risk_register.json` - Machine-readable risk data for tracking
- **Verification Script:** `scripts/audit.sh` - On-chain verification checklist
- **Slither Reports:** `slither-report.json`, `slither-report.sarif` - Raw static analysis output

**Summary:** 12 Slither HIGH findings triaged to 3 actionable issues:
1. DePINNodeSuite.createLease() - arbitrary transferFrom (needs msg.sender validation)
2. LeaseAndRentEngine.createLease() - arbitrary transferFrom (needs msg.sender validation)
3. AxiomSusuHub._generateRandomOrder() - weak PRNG (consider Chainlink VRF)

**Architecture Highlights:**
- No upgradeable proxy patterns (all immutable deployments)
- Consistent OpenZeppelin AccessControl across all contracts
- ReentrancyGuard and Pausable on all critical functions
- Centralized admin at treasury vault address

## Project Resources
- **GitHub Main Repository:** https://github.com/AxiomProtocol/AXIOM
- **GitHub Wiki (Documentation):** https://github.com/AxiomProtocol/AXIOM/wiki
- **Contract Count:** 24 verified contracts on Arbitrum One (including AxiomSusuHub)
- **TGE Timeline:** Q1 2026

## External Dependencies
-   **Blockchain Networks:** Arbitrum One, Universe Blockchain (L3), Reactive Network
-   **Blockchain RPC Provider:** Alchemy API
-   **Reactive Network RPC:** `https://mainnet-rpc.rnk.dev/`
-   **Wallet Integration:** MetaMask SDK
-   **Smart Contract Development:** Hardhat, OpenZeppelin Contracts, reactive-lib
-   **Libraries:** Ethers.js, viem + TypeScript
-   **Databases:** PostgreSQL, Neon Database, MongoDB
-   **Database Tools:** Drizzle Kit
-   **Email Service:** SendGrid
-   **Payment Processing:** Stripe
-   **Cloud Storage:** Google Cloud Storage, Storacha (Web3 Storage/IPFS)
-   **Property Data:** ATTOM Data (for KeyGrow)
-   **Rental Estimates:** RentCast API (market rent data with comparables)
-   **Location Scores:** Walk Score API (walkability, transit, bike scores) - API key required