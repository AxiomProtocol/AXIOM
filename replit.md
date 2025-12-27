# Axiom Smart City - Sovereign Digital-Physical Economy

## Overview
The Axiom Smart City project aims to establish America's first 1,000-acre on-chain sovereign smart city economy. This fintech smart city will function as a bank operating system and a complete sovereign economic engine, featuring a governance token (AXM), digital banking, real estate tokenization, DePIN infrastructure, smart city services, Wall Street integration, cross-chain interoperability, and sustainability initiatives within a decentralized, community-governed framework. The project envisions creating a model for future sovereign digital-physical economies.

## User Preferences
- **Communication style**: Simple, everyday language explaining technical concepts.
- **Video scripts**: Always deliver in a plain text code block format (```text```) so the copy button appears for easy one-click copying. No markdown formatting, no scene directions with brackets - just clean, copyable text with the script, caption, and hashtags.

## System Architecture

### UI/UX Decisions
The frontend features a modular design with a professional gold/black theme and yellow accents, ensuring responsiveness. Branding includes "AXIOM" with a golden circular token logo, golden gradient text, and the tagline "America's First On-Chain Smart City." Navigation, defined in `lib/navigation.js`, guides users through a Learn → Connect → Save Together journey, complemented by a `StepProgressBanner`.

### Technical Implementations
The core Axiom Protocol Token (AXM) is an ERC20 governance and fee-routing token on Arbitrum One, slated for migration to Universe Blockchain (L3). The multi-phase Smart Contract Architecture, initially on Arbitrum One, covers identity, treasury, staking, emissions, land/asset registry, and future modules. The platform offers a Complete Banking Product Suite with over 30 product families, supported by 23 verified smart contracts on Arbitrum One across various domains.

### Custody Model Architecture
Axiom utilizes a HYBRID CUSTODY model, incorporating Self-Custody, Smart Contract Custody (e.g., Staking), and Pooled Custody (e.g., SUSU circles), with disclosures managed via `lib/custody/disclosure.ts` and `components/CustodyDisclosure.js`. No products are FDIC insured.

### Production SSR Patterns
Static/marketing pages use `<Layout showWallet={false}>`. Browser-only libraries are dynamically imported with `{ ssr: false }` or guarded by `typeof window !== 'undefined'` to prevent Server-Side Rendering issues.

### System Design Choices
The architecture employs a "Product Factory Approach" for scalability. Arbitrum One serves as the current blockchain network, with a planned migration to Universe Blockchain (L3). Data management is handled by PostgreSQL with Drizzle ORM and MongoDB for analytics. The backend includes centralized contract configuration, a dedicated contract service, and chain validation middleware for Arbitrum One, with API responses consistently providing `axmBalance` and `axmUsdValue`.

Key features include:
-   **Axiom Nodes Marketplace**: For DePIN node management.
-   **DEX Exchange**: A comprehensive decentralized exchange.
-   **Governance**: A full-featured governance system (API-based, transitioning to on-chain).
-   **Admin Authentication & RBAC**: JWT-based authentication for `/admin/*` routes with hierarchical roles (superadmin, admin, finance, moderator) and a two-step approval system for sensitive actions, including a $5000 threshold policy and audit logging.
-   **AI Agent & Upgrade Framework**: A security-first framework for AI agents with configurable modes (off/observe/propose), production safety defaults, dry-run capabilities, a read-only query endpoint, robust audit logging with secret redaction, idempotency, and release governance. Prompt templates are stored in `prompts/`.
-   **API Security**: Input validation, sanitization, error handling, and EIP-4361 SIWE authentication.
-   **KeyGrow Rent-to-Own Program**: Real estate program using ERC-1155 tokenized fractional property shares.
-   **Axiom SUSU (Rotating Savings Groups)**: On-chain ROSCA system ("The Wealth Practice") with Community Pool and Personal Vault custody modes and a Trust Bridge explainer.
-   **PMA Trust**: Operates as a Private Membership Association Trust with tokenized ERC-1155/1400 memberships.
-   **AI Member Support**: Gemini-powered chat assistant.
-   **V2 Analytics Dashboard** (`/v2-analytics`): Unified dashboard for Sovereign Banking metrics (Protocol Overview, Credit & Scoring, Governance).
-   **veAXM Staking Mode**: Enhanced staking page with lock durations and voting power preview.
-   **On-Chain Credit Score Display**: CreditScoreCard component with FICO-like visualization.
-   **Referral System** (`/referrals`): Full referral tracking with unique codes and leaderboards.
-   **Member Badges** (`/badges`): Achievement system with 10 badge types across 4 rarity tiers.
-   **Governance Proposal Drafting** (`/governance/create`): UI for veAXM holders to create proposals.
-   **Yield Vault** (`/yield-vault`): Auto-compounding AXM staking.
-   **Push Notifications** (`/notifications`): PWA service worker for push notifications with preference settings.
-   **Transparency Dashboard** (`/transparency-dashboard`): Real-time protocol metrics including TVL, burned AXM, veAXM locked, insurance fund balance, SUSU pools, and DePIN nodes.

### Wealth Engine V2 Contracts (Sovereign Banking System)
These V2 contracts implement the AIP-001 Master Architectural Plan for the Sovereign Banking System:
-   **AxiomScoreSBT**: ERC-5192 Soulbound Token for on-chain credit scoring (300-850 range), integrated with SUSU repayment history.
-   **SusuInsuranceFund**: Default Insurance Fund with 5% node rewards diversion to cover broken SUSU circles.
-   **veAXM**: Vote-Escrowed AXM with Curve-style locking (1-4 years), time-weighted voting power, and epoch-based reward distribution.
-   **AxiomFeeBurner**: 0.5% fee switch on banking products with automatic AXM buyback/burn and 50% distribution to veAXM holders.

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

## Engagement & Gamification Features

### Revenue Strengthening Components
-   **VeAXMLockCalculator**: Interactive lock duration comparison tool showing projected rewards for 1-4 year locks, integrated into staking page.
-   **NodeROICalculator**: DePIN node ROI calculator with tier comparison, break-even analysis, and uptime adjustment.
-   **ProtocolHealthScore**: Aggregate protocol health score (0-100) based on TVL, burns, governance, insurance, and community activity.
-   **FeeContributionWidget**: Shows 0.5% fee contribution breakdown (50% burned, 50% to veAXM) during transactions.
-   **SUSUInsuranceProgress**: Visual insurance fund coverage indicator showing fund balance, claims history, and per-circle protection.

### Engagement Features
-   **veAXM Leaderboard** (`/veaxm-leaderboard`): Public ranking of top veAXM holders with timeframe filters (all-time, month, week), voting power display, pagination support, and user rank tracking.
-   **LockChallengeBadges**: Gamified lock duration badges with 6 badge types (Committed, Dedicated, True Believer, Diamond Hands, Whale Locker, Early Adopter) and 4 rarity tiers (Common, Rare, Epic, Legendary).
-   **InsuranceClaimsHistory**: Public log of SUSU insurance claims with status tracking (pending, approved, rejected, paid), integrated into transparency dashboard.
-   **CreditScoreTracker**: Shows 10 actions to improve on-chain credit score across 4 categories (SUSU, staking, governance, community) with points tracking.
-   **WeeklyDigestCard**: Email subscription for weekly protocol activity summaries including burns, veAXM rewards, insurance fund growth, and new circles/operators.
-   **NodeReferralWidget**: 5% referral bonus system for node operator referrals, with referral code generation and earnings tracking.
-   **NodeUpgradePath**: Node tier upgrade system with 80% credit toward higher tiers, supporting 7 node tiers from Lite Starter ($99) to Pro Operator ($9,999).

### Engagement APIs
-   **Badge Award** (`/api/veaxm/award-badge`): Automatically awards lock challenge badges when users lock veAXM for qualifying durations.
-   **Referral Code Generation** (`/api/nodes/generate-referral`): Generates unique referral codes for node operators with earnings tracking.
-   **Weekly Digest Cron** (`/api/cron/weekly-digest`): Scheduled job endpoint to send weekly protocol summaries to subscribers via SendGrid.
-   **Digest Subscription** (`/api/digest/subscribe`): Manages email subscriptions for weekly protocol digests.
-   **Insurance Claims** (`/api/insurance/claims`): Public API for SUSU insurance claims history with stats.
-   **Lock Badges** (`/api/lock-badges`): Tracks and awards gamified lock duration badges.
-   **Node Referrals** (`/api/nodes/referrals`): Tracks node operator referral bonuses and earnings.
-   **Leaderboard** (`/api/veaxm/leaderboard`): Paginated veAXM holder rankings with user position.

### Engagement Database Tables
-   `lock_challenge_badges`: Gamified lock duration achievement badges
-   `node_referral_bonuses`: Node operator referral rewards tracking
-   `insurance_claims`: SUSU insurance claims history
-   `weekly_digest_subscriptions`: Email subscription preferences for protocol digests
-   `credit_score_actions`: Credit score improvement actions catalog
-   `node_upgrades`: Node tier upgrade transactions