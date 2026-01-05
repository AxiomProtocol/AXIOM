# Axiom Smart City - Sovereign Digital-Physical Economy

## Overview
The Axiom Smart City project aims to establish America's first 1,000-acre on-chain sovereign smart city economy. This DeFi protocol operates as a community-governed treasury system and economic engine. Key capabilities include a governance token (AXM), DeFi treasury tools, real estate tokenization, DePIN infrastructure, smart city services, cross-chain interoperability, and sustainability initiatives within a decentralized, community-governed framework. The project's vision is to create a model for future sovereign digital-physical economies. All "banking" terminology has been rebranded to DeFi-compliant language for Coinbase Onramp integration, emphasizing a self-custody model and non-custodial DeFi operations.

## User Preferences
- **Communication style**: Simple, everyday language explaining technical concepts.
- **Video scripts**: Always deliver in a plain text code block format (```text```) so the copy button appears for easy one-click copying. No markdown formatting, no scene directions with brackets - just clean, copyable text with the script, caption, and hashtags.

## System Architecture

### UI/UX Decisions
The frontend features a modular design with a professional gold/black theme and yellow accents, ensuring responsiveness. Branding includes "AXIOM" with a golden circular token logo, golden gradient text, and the tagline "Build Wealth Together, On-Chain." A unified navigation system employs a land-first approach with consistent headers and footers across marketing pages, managed via `SiteNavModel.ts`, `SiteHeader.tsx`, `SiteFooter.tsx`, and `SiteLayout.tsx`. The official Web3 design template, located in `components/axiomRebuild/`, provides an immersive experience with `Web3Hero.tsx`, `Web3Section.tsx`, `ImmersiveCard.tsx`, and `styles/web3Theme.ts`, utilizing white backgrounds, teal, purple, and gold accents, glassmorphism, 3D depth, and scroll animations.

### Technical Implementations
The core Axiom Protocol Token (AXM) is an ERC20 governance and fee-routing token on Arbitrum One, with planned migration to Universe Blockchain (L3). The multi-phase Smart Contract Architecture on Arbitrum One covers identity, treasury, staking, emissions, and asset registries. The platform offers a Complete DeFi Treasury Suite with self-custody vaults, savings circles, staking, and investment pools, supported by 23 verified smart contracts. Axiom utilizes a HYBRID CUSTODY model (Self-Custody, Smart Contract Custody, Pooled Custody) with disclosures managed via `lib/custody/disclosure.ts` and `components/CustodyDisclosure.js`.

### System Design Choices
The architecture employs a "Product Factory Approach" for scalability. Arbitrum One serves as the current blockchain network, with a planned migration to Universe Blockchain (L3). Data management uses PostgreSQL with Drizzle ORM and MongoDB for analytics. The backend includes centralized contract configuration, a dedicated contract service, and chain validation middleware for Arbitrum One, with API responses providing `axmBalance` and `axmUsdValue`.

Key features include:
-   **Axiom Nodes Marketplace**
-   **DEX Exchange**
-   **Governance** (API-based, transitioning to on-chain)
-   **Admin Authentication & RBAC** (JWT-based with two-step approval and audit logging)
-   **AI Agent & Upgrade Framework** (security-first, configurable modes, audit logging, idempotency)
-   **API Security** (input validation, EIP-4361 SIWE authentication)
-   **KeyGrow Rent-to-Own Program** (ERC-1155 tokenized fractional property shares)
-   **Axiom SUSU (Rotating Savings Groups)** (on-chain ROSCA with Community Pool and Personal Vault custody)
-   **PMA Trust** (Private Membership Association Trust with tokenized ERC-1155/1400 memberships)
-   **AI Member Support** (Gemini-powered chat assistant)
-   **V2 Analytics Dashboard**
-   **SEED (Wealth Engine)** (AXM locking for voting power and participation benefits)
-   **On-Chain Credit Score Display** (`CreditScoreCard` with FICO-like visualization)
-   **Referral System**
-   **Member Badges**
-   **Governance Proposal Drafting**
-   **Yield Vault** (auto-compounding AXM staking)
-   **Push Notifications**
-   **Transparency Dashboard** (real-time protocol metrics)
-   **Axiom Steward Corps** (elite coordination corps for regional management, food distribution, and land readiness, including a 5-stage selection process, role hierarchy, and probation metrics tracking)
-   **Steward Recruitment System** (full-funnel tools with landing page, interest capture, admin dashboard, and social content templates)
-   **Steward Dashboard** (operational dashboard for active stewards with overview, produce drops, participant directory, land pipeline, tasks board, communications, region management, group formation, reputation panel, weekly reports, and settings)
-   **Steward-Activated Land Program** (landowner onboarding, steward playbook, outreach scripts, application system, lead management, stewardship plans, activation cycles, owner checklists, and optional future acquisition discussions)
-   **Wealth Engine V2 Contracts** (DeFi Treasury System including AxiomScoreSBT for on-chain credit scoring, SusuInsuranceFund, SEED for AXM locking and voting power, and AxiomFeeBurner for AXM buyback/burn and SEED holder distribution).
-   **AXUSD Stablecoin System** (CDP-style hybrid stablecoin with PSM, VaultEngine, Liquidator, BackstopVault, TBillVault, and MarketOperations - security audited with multi-AI review).
-   **AXUSD Ecosystem Integrations** (SusuAXUSDAdapter for stablecoin savings circles, KeyGrowPaymentModule for rent-to-own housing, SEEDYieldDistributor for SEED holder rewards, AXUSDRevenueRouter for protocol fee distribution, LiquidityBootstrapper for DEX pool seeding - all on Arbitrum One mainnet).
-   **Land Acquisition System** (SEC Reg CF compliant crowdfunding with tokenized land options via LandOptionRegistry ERC-1155, RegCFCrowdfunding for SEC-compliant $5M raises, and LandAcquisitionPool for SUSU-style community pooling - page at `/land-acquisition` with generated images).
-   **Land Acquisition Admin Tools** (Enhanced admin workflow at `/admin/land-deals` and `/admin/land-pipeline` with:
    - 3-step landowner property submission form at `/landowners/submit` with automatic lead scoring (0-100)
    - **Property Listing Import** - Paste URLs from Zillow, Realtor, Redfin, LoopNet, LandWatch to auto-extract property data
    - Email notifications via Resend for new submissions, status changes, and admin alerts
    - Document uploads via Replit Object Storage for property deeds, surveys, photos
    - Automatic and manual steward assignment API
    - 6-stage multi-stage approval workflow (Submission → Admin Review → Steward Assignment → Steward Evaluation → Community Vote → Final Approval)
    - CRM Kanban pipeline view with drag-and-drop status updates
    - Database tables: land_submissions, land_documents, land_options, crowdfunding_campaigns, governance_proposals)
-   **Social Campaign & Referral System** (Marketing tools for crowdfunding campaigns:
    - Short links with `/c/[slug]` redirect pages and OG meta tags for social previews
    - Social share buttons (Twitter/X, Facebook, LinkedIn, WhatsApp, Email)
    - Referral code generation (AX + 6 alphanumeric) with click/conversion tracking
    - Referral attribution for investments with campaign analytics
    - Database tables: campaign_short_links, referral_attributions, steward_reviews, community_votes)

## External Dependencies
-   **Blockchain Networks:** Arbitrum One, Universe Blockchain (L3)
-   **Blockchain RPC Provider:** Alchemy API
-   **Wallet Integration:** MetaMask SDK
-   **Smart Contract Development:** Hardhat, OpenZeppelin Contracts
-   **Libraries:** Ethers.js, viem + TypeScript
-   **Databases:** PostgreSQL, Neon Database, MongoDB
-   **Database Tools:** Drizzle Kit
-   **Email Service:** Resend (via Replit Integration)
-   **Payment Processing:** Stripe
-   **Cloud Storage:** Google Cloud Storage, Storacha (Web3 Storage/IPFS)
-   **Property Data:** ATTOM Data
-   **Rental Estimates:** RentCast API
-   **Location Scores:** Walk Score API
-   **Auth Provider:** Supabase
-   **Google AI Stack:** Gemini AI Integration via Replit AI Integrations (gemini-3-pro-preview, gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-image)