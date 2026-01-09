# Axiom Smart City - Sovereign Digital-Physical Economy

## Overview
The Axiom Smart City project aims to establish America's first 1,000-acre on-chain sovereign smart city economy. It operates as a community-governed DeFi protocol with a treasury system and economic engine. Key capabilities include a governance token (AXM), DeFi treasury tools, real estate tokenization, DePIN infrastructure, smart city services, cross-chain interoperability, and sustainability initiatives within a decentralized, community-governed framework. The project's vision is to create a model for future sovereign digital-physical economies, emphasizing a self-custody and non-custodial DeFi approach.

## User Preferences
- **Communication style**: Simple, everyday language explaining technical concepts.
- **Video scripts**: Always deliver in a plain text code block format (```text```) so the copy button appears for easy one-click copying. No markdown formatting, no scene directions with brackets - just clean, copyable text with the script, caption, and hashtags.

## System Architecture

### UI/UX Decisions
The frontend features a modular, responsive design with a professional gold/black theme and yellow accents. Branding includes "AXIOM" with a golden circular token logo and the tagline "Build Wealth Together, On-Chain." A unified navigation system uses a land-first approach with consistent headers and footers. The official Web3 design template provides an immersive experience with glassmorphism, 3D depth, and scroll animations, utilizing white backgrounds, teal, purple, and gold accents.

### Technical Implementations
The core Axiom Protocol Token (AXM) is an ERC20 governance and fee-routing token on Arbitrum One, with a planned migration to Universe Blockchain (L3). The multi-phase Smart Contract Architecture on Arbitrum One covers identity, treasury, staking, emissions, and asset registries, supported by 23 verified smart contracts. The platform offers a Complete DeFi Treasury Suite with self-custody vaults, savings circles, staking, and investment pools, utilizing a HYBRID CUSTODY model.

### System Design Choices
The architecture employs a "Product Factory Approach" for scalability. Arbitrum One is the current blockchain network, with a planned migration to Universe Blockchain (L3). Data management uses PostgreSQL with Drizzle ORM and MongoDB for analytics. The backend includes centralized contract configuration, a dedicated contract service, and chain validation middleware.

Key features include:
-   **Axiom Nodes Marketplace & DEX Exchange**
-   **Governance** (API-based, transitioning to on-chain)
-   **Admin Authentication & RBAC** (JWT-based with two-step approval and audit logging)
-   **AI Agent & Upgrade Framework** (security-first, configurable modes, audit logging, idempotency)
-   **KeyGrow Rent-to-Own Program** (ERC-1155 tokenized fractional property shares)
-   **Axiom SUSU (Rotating Savings Groups)** (on-chain ROSCA with Community Pool and Personal Vault custody)
-   **PMA Trust** (Private Membership Association Trust with tokenized ERC-1155/1400 memberships)
-   **AI Member Support** (Gemini-powered chat assistant)
-   **SEED (Wealth Engine)** (AXM locking for voting power and participation benefits)
-   **On-Chain Credit Score Display** (`CreditScoreCard` with FICO-like visualization)
-   **Steward Corps & Recruitment System** (elite coordination corps with 12-month seasonal training program covering Foundations + Spring/Summer/Fall/Winter quarters, operational dashboard, and land program. Three tiers: Premium $6,000, Standard $3,000, Scholarship $750 with AXUSD graduation rewards.)
-   **Wealth Engine V2 Contracts** (DeFi Treasury System including AxiomScoreSBT, SusuInsuranceFund, SEED, and AxiomFeeBurner)
-   **AXUSD Stablecoin System** (CDP-style hybrid stablecoin with PSM, VaultEngine, Liquidator, BackstopVault, TBillVault, and MarketOperations)
-   **AXUSD Ecosystem Integrations** (SusuAXUSDAdapter, KeyGrowPaymentModule, SEEDYieldDistributor, AXUSDRevenueRouter, LiquidityBootstrapper on Arbitrum One mainnet)
-   **Land Acquisition System** (SEC Reg CF compliant crowdfunding with tokenized land options, community pooling, and enhanced admin tools for property submission, listing import, and multi-stage approval workflow)
-   **Social Campaign & Referral System** (Marketing tools with short links, social sharing, and referral tracking for crowdfunding campaigns)
-   **SEC Reg CF Compliance System** (Investor protection and regulatory compliance with investment limit calculator, KYC verification, required risk disclosures, and full audit trail)
-   **Closed-Loop Coordination System** (Membership-based coordination with PMA Membership Gate, Purpose Pools for resource coordination, a robust Governance System, Land Candidates Pipeline, and Treasury Transparency. All terminology focuses on coordination and participation, with AXUSD for settlement and accounting only.)
-   **Land Reclamation Workbook** (Paid subscription tool for genealogical land research with case management, evidence tracking, AI Research Assistant, and ethical use safeguards.)

## External Dependencies
-   **Blockchain Networks:** Arbitrum One, Universe Blockchain (L3)
-   **Blockchain RPC Provider:** Alchemy API
-   **Wallet Integration:** MetaMask SDK
-   **Smart Contract Development:** Hardhat, OpenZeppelin Contracts
-   **Libraries:** Ethers.js, viem + TypeScript
-   **Databases:** PostgreSQL, Neon Database, MongoDB
-   **Database Tools:** Drizzle Kit
-   **Email Service:** Resend
-   **Payment Processing:** Stripe
-   **Cloud Storage:** Google Cloud Storage, Storacha (Web3 Storage/IPFS)
-   **Property Data:** ATTOM Data, RentCast API, Walk Score API
-   **Auth Provider:** Supabase
-   **Google AI Stack:** Gemini AI Integration via Replit AI Integrations (gemini-3-pro-preview, gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-image)