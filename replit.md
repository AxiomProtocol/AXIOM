# Axiom Smart City - Sovereign Digital-Physical Economy

## Overview
The Axiom Smart City project aims to establish America's first on-chain sovereign smart city economy. This 1,000-acre fintech smart city will feature comprehensive digital-physical infrastructure, functioning as a bank operating system and a complete sovereign economic engine. Key capabilities include a governance token economy (AXM), full-service digital banking, real estate tokenization, DePIN infrastructure, smart city services, Wall Street integration, cross-chain interoperability, and sustainability initiatives, all within a decentralized and community-governed framework. The project's vision is to create a model for future sovereign digital-physical economies.

## User Preferences
- **Communication style**: Simple, everyday language explaining technical concepts.
- **Video scripts**: Always deliver in a plain text code block format (```text```) so the copy button appears for easy one-click copying. No markdown formatting, no scene directions with brackets - just clean, copyable text with the script, caption, and hashtags.

## System Architecture

### UI/UX Decisions
The frontend utilizes a modular design with a professional gold/black theme, yellow accents, and responsive design. Branding includes "AXIOM" with a golden circular token logo, golden gradient text, and the tagline "America's First On-Chain Smart City." Navigation is managed in `lib/navigation.js` following a Learn → Connect → Save Together journey with a `StepProgressBanner`.

### Technical Implementations
The core **Axiom Protocol Token (AXM)** is an ERC20 governance and fee-routing token on Arbitrum One, with plans to transition to Universe Blockchain (L3). The **Smart Contract Architecture** is multi-phase, starting on Arbitrum One and migrating to Universe Blockchain, covering identity, treasury, staking, emissions, land/asset registry, and future modules. A **Complete Banking Product Suite** offers over 30 product families. The architecture includes 23 verified smart contracts on Arbitrum One across DePIN, Governance, Treasury, Property/Real Estate, Cross-Chain, Realtor System, and Smart City modules.

### Custody Model Architecture
Axiom employs a HYBRID CUSTODY model: Self-Custody, Smart Contract Custody (e.g., Staking), and Pooled Custody (e.g., SUSU circles). Key files are `lib/custody/disclosure.ts` and `components/CustodyDisclosure.js`. No products are FDIC insured.

### Production SSR Patterns
Static/marketing pages use `<Layout showWallet={false}>`. Browser-only libraries are dynamically imported with `{ ssr: false }` or guarded by `typeof window !== 'undefined'` checks to prevent SSR issues.

### System Design Choices
The architecture follows a "Product Factory Approach" for scalability. The blockchain network is Arbitrum One, with a planned migration to Universe Blockchain (L3). Data management uses PostgreSQL with Drizzle ORM and MongoDB for analytics. The backend features centralized contract configuration, a dedicated contract service, and chain validation middleware for Arbitrum One. API responses consistently include `axmBalance` and `axmUsdValue`.

Key features include:
-   **Axiom Nodes Marketplace**: For DePIN node management.
-   **DEX Exchange**: A comprehensive decentralized exchange.
-   **Governance**: A full-featured governance system.
-   **Admin Authentication & RBAC**: JWT-based authentication for `/admin/*` routes with a hierarchical role-based access control (superadmin, admin, finance, moderator) and a two-step approval system for sensitive actions, including a $5000 threshold policy and audit logging.
-   **AI Agent & Upgrade Framework**: A security-first framework for AI agents with configurable modes (off/observe/propose), production safety defaults, dry-run capabilities, a read-only query endpoint, robust audit logging with secret redaction, idempotency, and release governance. Prompt templates are stored in `prompts/`.
-   **API Security**: Input validation, sanitization, error handling, and EIP-4361 SIWE authentication.
-   **KeyGrow Rent-to-Own Program**: Real estate program using ERC-1155 tokenized fractional property shares.
-   **Axiom SUSU (Rotating Savings Groups)**: On-chain ROSCA system ("The Wealth Practice") with Community Pool and Personal Vault custody modes, including a Trust Bridge explainer for the three-stage trust system.
-   **PMA Trust**: Operates as a Private Membership Association Trust with tokenized ERC-1155/1400 memberships.
-   **Equity Calculator**: Interactive rent-to-own equity calculator.
-   **Axiom Academy**: Educational platform.
-   **Impact Dashboard**: Real-time platform metrics.
-   **Member Profile System**: Comprehensive personal profile pages.
-   **My Journey Dashboard**: Personal progress tracking.
-   **Community Success Hub**: Testimonial page.
-   **Security Audit**: Covered 24 deployed smart contracts, focusing on immutable deployments, OpenZeppelin AccessControl, ReentrancyGuard, and Pausable.
-   **The Wealth Practice**: A wealth-building system with phases for Trust & Circles, Yield & Treasury, and Ecosystem Expansion, including a **Wealth Practice Advancement** pathway and **Transparency Reports**.
-   **Organizer Training & Certification**: System for SUSU organizers.
-   **Staking Dashboard**: AXM staking interface.
-   **Gamification System**: Achievement badges and points tracking.
-   **Sustainability Rewards API**: Integration with a SustainabilityHub contract.
-   **Onramp Center**: Multi-provider fiat-to-crypto gateway.
-   **Governance System**: Currently API-based, transitioning to on-chain.
-   **Emissions & DEX Dashboard**: Live protocol metrics.
-   **IoT Network Telemetry**: DePIN nodes page with data from node sales and IoT oracle contracts.
-   **AI Member Support**: Gemini-powered chat assistant for platform guidance.
-   **Smart Organizer Assistant**: AI-powered insights for SUSU organizers.
-   **Content Generation API**: Auto-generates reports and insights.
-   **Graduation Dashboard**: Tracks group progression.
-   **Trust Score Analytics**: Provides trust metrics and trend analysis.
-   **Investment Matching**: Matches Capital Mode opportunities to group profiles.
-   **Notification System**: Email (SendGrid) and in-app notifications.
-   **Platform Metrics Dashboard**: Real-time analytics.
-   **Purpose Group Onboarding**: 5-step guided wizard for new members.
-   **AI Group Health Analysis**: Gemini-powered analysis of SUSU group metrics.
-   **AI Personalized Insights**: Gemini AI for journey summaries and guidance.
-   **AI Weekly Summary**: Gemini-powered weekly organizer summaries.
-   **AI Savings Tips**: Personalized savings advice.
-   **AI Smart Matching**: AI-powered group matching.
-   **Purpose Group Matching Algorithm**: Weighted scoring system for group matching.
-   **Organizer Dashboard**: Comprehensive dashboard for certified SUSU organizers.
-   **Enhanced Analytics Dashboard**: Real-time platform metrics.
-   **Notification Preferences System**: User-configurable notification toggles.
-   **Email Notification Testing**: SendGrid integration verification.
-   **V2 Analytics Dashboard** (`/v2-analytics`): Unified dashboard for Sovereign Banking metrics with tabs for Protocol Overview (fee burner, insurance fund, veAXM rewards), Credit & Scoring (credit score card + history chart), and Governance (proposal voting with veAXM power). Includes TokenomicsExplainer accordion component.
-   **V2 Admin Management** (`/admin/v2-management`): Admin panel for V2 contract management with pause/unpause controls, parameter settings, and action logging. Wallet-gated to authorized addresses.
-   **veAXM Staking Mode**: Enhanced staking page with mode toggle between "Regular Staking" and "veAXM Vote Lock" with 1-4 year lock durations, voting power preview, and rewards claiming.
-   **On-Chain Credit Score Display**: CreditScoreCard component with FICO-like visualization (300-850 range), tier display, payment history metrics, and CreditScoreHistory timeline chart.
-   **Governance Voting UI**: Proposal voting interface for veAXM holders with voting power display, for/against voting, and proposal status tracking.
-   **Real Yield Rewards** (`/rewards`): Unified rewards page with veAXM claim functionality, claim history timeline, and interactive yield calculator with lock duration projections.
-   **Credit Builder** (`/credit-builder`): Educational page showing score improvement actions, tier benefits (Poor to Excellent), and on-chain credit score integration.
-   **Referral System** (`/referrals`): Full referral tracking with unique referral codes, reward history, and community leaderboard.
-   **Member Badges** (`/badges`): Achievement system with 10 badge types across 4 rarity tiers (Common, Rare, Epic, Legendary) displayed on profiles.
-   **Group Analytics** (`/group-analytics`): SUSU group performance dashboard with completion rates, trust scores, sorting options, and group comparisons.

### Wealth Engine V2 Contracts (Sovereign Banking System)
The following V2 contracts implement the AIP-001 Master Architectural Plan for transitioning to a Sovereign Banking System:
-   **AxiomScoreSBT** (`0x8Ae0f77e2cB2dED0496Dbe2F827be38F5756B008`): ERC-5192 Soulbound Token for on-chain credit scoring (300-850 range). Extends ERC-721 with transfer blocking, integrates with SUSU for repayment history tracking.
-   **SusuInsuranceFund** (`0x7B69ce0d83f45C2dBa3e5B73076beA8b1Be1271F`): Default Insurance Fund with 5% node rewards diversion (500 BPS) to cover broken SUSU circles.
-   **veAXM** (`0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046`): Vote-Escrowed AXM with Curve-style locking (1-4 years), time-weighted voting power, checkpoint system for accurate decay tracking, and epoch-based reward distribution.
-   **AxiomFeeBurner** (`0xF5d59581Eb0fd024aC1b2B67f1B290832eb8Cb94`): 0.5% fee switch (50 BPS) on banking products with automatic AXM buyback via DEX and burn to 0xdead, plus 50% distribution to veAXM holders.

## External Dependencies
-   **Blockchain Networks:** Arbitrum One, Universe Blockchain (L3)
-   **Blockchain RPC Provider:** Alchemy API
-   **Wallet Integration:** MetaMask SDK
-   **Smart Contract Development:** Hardhat, OpenZeppelin Contracts
-   **Libraries:** Ethers.js, viem + TypeScript
-   **Databases:** PostgreSQL, Neon Database, MongoDB
-   **Database Tools:** Drizzle Kit
-   **Email Service:** SendGrid
-   **Payment Processing:** Stripe
-   **Cloud Storage:** Google Cloud Storage, Storacha (Web3 Storage/IPFS)
-   **Property Data:** ATTOM Data
-   **Rental Estimates:** RentCast API
-   **Location Scores:** Walk Score API
-   **Auth Provider:** Supabase
-   **Google AI Stack:** Gemini AI Integration via Replit AI Integrations (gemini-3-pro-preview, gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-image) with a unified service module at `lib/server/gemini.ts`.