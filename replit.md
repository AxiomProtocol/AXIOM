# Axiom Smart City - Sovereign Digital-Physical Economy

## Overview
The Axiom Smart City project aims to establish America's first on-chain sovereign smart city economy: a 1,000-acre fintech smart city with comprehensive digital-physical infrastructure. Envisioned as a nation-level fintech ecosystem, it functions as a bank operating system and a complete sovereign economic engine. Key capabilities include a governance token economy (AXM), full-service digital banking, real estate tokenization, DePIN infrastructure, smart city services, Wall Street integration, cross-chain interoperability, and sustainability initiatives, all while being decentralized and community-governed. The business vision is to create a sovereign digital-physical economy, serving as a model for future smart cities.

## User Preferences
- **Communication style**: Simple, everyday language explaining technical concepts.
- **Video scripts**: Always deliver in a plain text code block format (```text```) so the copy button appears for easy one-click copying. No markdown formatting, no scene directions with brackets - just clean, copyable text with the script, caption, and hashtags.

## System Architecture

### UI/UX Decisions
The frontend features a modular design with a professional gold/black theme, yellow accents for tabbed interfaces, and responsive design. Branding prominently displays "AXIOM" with a golden circular token logo, golden gradient text, and the tagline "America's First On-Chain Smart City." All navigation menus are configured in a single file `lib/navigation.js` for centralized management. A "Why Axiom Will Be #1" comparison page is integrated. The main navigation is structured around a Learn → Connect → Save Together journey, with a `StepProgressBanner` component to track user progress.

### Technical Implementations
The core **Axiom Protocol Token (AXM)** is an ERC20 governance and fee-routing token, initially on Arbitrum One, with plans to transition to Universe Blockchain (L3) using AXM as native gas. The **Smart Contract Architecture** is multi-phase, starting on Arbitrum One and migrating to Universe Blockchain, encompassing identity, treasury, staking, emissions, land/asset registry, and future modules. A **Complete Banking Product Suite** offers over 30 product families. The architecture incorporates 23 verified smart contracts on Arbitrum One, covering DePIN, Governance, Treasury, Property/Real Estate, Cross-Chain, Realtor System, and Smart City modules.

### Custody Model Architecture (CRITICAL)
Axiom operates a HYBRID CUSTODY model. Understanding this is essential for accurate product disclosures:

**Custody Types:**
1. **Self-Custody** (Default): User holds tokens in their own wallet. Protocol cannot access funds.
   - Products: AXM token holdings, basic wallet operations
   - Risks: No FDIC insurance, crypto volatility, regulatory changes
   
2. **Smart Contract Custody**: Funds held by audited smart contracts with defined rules.
   - Products: Staking, KeyGrow deposits
   - Risks: All self-custody risks PLUS smart contract bugs, lock-up periods
   
3. **Pooled Custody**: Funds combined with other users, distributions controlled by group/fund rules.
   - Products: SUSU circles, Capital Pools, DEX LP positions
   - Risks: All smart contract risks PLUS counterparty default, liquidity constraints

**Key Files:**
- `lib/custody/disclosure.ts`: Canonical custody type definitions and risk warnings
- `components/CustodyDisclosure.js`: UI component for displaying custody info
- `/bank` page: Product catalog with LIVE vs PLANNED labels

**What We DON'T Have (Removed Claims):**
- No FDIC insurance on any product
- No ACH/wire transfers (planned, not live)
- No lending/credit products (planned, not live)
- No guaranteed yields
- No fiat bank accounts

### Production SSR Patterns (CRITICAL)
To prevent 500 errors in production deployments, follow these patterns:

1. **Static/Marketing Pages**: Use `<Layout showWallet={false}>` for pages that don't need wallet functionality (e.g., `/susu-start`, `/roadmap`). This prevents SSR crashes from wallet components accessing `window`/`localStorage`.

2. **react-hot-toast**: Never import directly at the top level. Use dynamic import pattern:
   ```tsx
   import dynamic from 'next/dynamic';
   const Toaster = dynamic(() => import('react-hot-toast').then((mod) => mod.Toaster), { ssr: false });
   
   let toastLib: typeof import('react-hot-toast') | null = null;
   if (typeof window !== 'undefined') {
     import('react-hot-toast').then((mod) => { toastLib = mod; });
   }
   const showToast = {
     success: (msg: string, opts?: any) => toastLib?.toast.success(msg, opts),
     error: (msg: string, opts?: any) => toastLib?.toast.error(msg, opts),
     loading: (msg: string, opts?: any) => toastLib?.toast.loading(msg, opts),
   };
   ```

3. **Browser-only libraries**: Any library that accesses `window`, `document`, or `localStorage` must be wrapped with `typeof window !== 'undefined'` checks or loaded via `next/dynamic` with `{ ssr: false }`.

### System Design Choices
The architecture follows a "Product Factory Approach" for scalable product expansion. The blockchain network is currently deployed on Arbitrum One (L2), with plans to transition to Universe Blockchain (L3). Data management utilizes PostgreSQL with Drizzle ORM for relational data and MongoDB for specific analytics. The backend features a centralized contract configuration, a dedicated contract service, and chain validation middleware enforcing Arbitrum One for Web3 operations. API responses consistently return `axmBalance` and `axmUsdValue` fields.

Key features include:
- **Axiom Nodes Marketplace**: For purchasing and managing DePIN nodes.
- **DEX Exchange**: A comprehensive decentralized exchange.
- **Governance**: A full-featured governance system.
- **Admin Authentication**: Secure JWT-based authentication for `/admin/*` routes.
- **Platform Expansion Features**: Includes Node Leasing Marketplace, Staking Tiers, Liquidity Mining, Limit Orders, Treasury Buybacks, Treasury Grants DAO, Node Voting Power, Utility Payments, and IoT Dashboard.
- **API Security**: Comprehensive input validation, sanitization, error handling, and EIP-4361 SIWE authentication.
- **SIWE (Sign-In with Ethereum) Implementation**: Full EIP-4361 for cryptographic wallet verification.
- **KeyGrow Rent-to-Own Program**: A real estate program enabling tenants to build equity through ERC-1155 tokenized fractional property shares. Features property browsing, seller portal, enrollment, equity tracking, and integration with ATTOM Data and RentCast. Includes a $500 option fee staked in AXM tokens at 8% APR.
- **Reactive Network Integration (Planned)**: Autonomous, event-driven smart contract automation.
- **Whitepaper Documentation**: Comprehensive 14-section whitepaper at `/whitepaper`.
- **Centralized Environment Validation**: `lib/envValidation.ts` provides standardized functions for checking environment variables.
- **Axiom SUSU (Rotating Savings Groups)**: On-chain ROSCA system for community-based savings pools. Integrates with regional interest groups and purpose categories for discovery.
- **PMA Trust (Private Membership Association)**: Axiom operates as a Private Membership Association Trust, with tokenized membership using whitelist-only ERC-1155/1400 tokens.
- **Equity Calculator** (`/tools/equity-calculator`): Interactive rent-to-own equity calculator.
- **Axiom Academy** (`/academy`): Educational platform with course library and membership tiers.
- **Impact Dashboard** (`/impact`): Real-time platform metrics with animated counters.
- **Member Profile System** (`/profile`, `/profile/[wallet]`): Comprehensive personal profile pages with social sharing capabilities.
- **My Journey Dashboard** (`/journey`): Personal progress tracking page.
- **Community Success Hub** (`/community`): Social proof and testimonial page.
- **Security Audit**: A comprehensive security audit covered 24 deployed smart contracts, with findings and recommendations. Architecture highlights include immutable deployments, OpenZeppelin AccessControl, ReentrancyGuard, Pausable, and centralized admin.
- **The Wealth Practice (Enhanced SUSU)**: Complete wealth-building operating system with three phases:
  - **Phase 1 - Trust & Circles**: PolicyGuardService for soft enforcement (identity verification, 1.5x AXM security deposits, 2-rotation commitments, reputation-based payout positioning). Database tables: `member_credentials`, `policy_commitments`, `reputation_events`.
  - **Phase 2 - Yield & Treasury**: Staking Dashboard (`/staking`) with stake/unstake, rewards claiming, tier display. Enhanced Transparency page with live contract data.
  - **Phase 3 - Ecosystem Expansion**: Governance voting integration, gamification badges (BadgesDisplay component), sustainability rewards API.
- **Wealth Practice Advancement** (`/wealth-practice`): Graduation pathway from community savings to capital investments:
  - **Mode Detection**: Community Mode (<$1K contribution, <$10K pot) vs Capital Mode ($1K+ or $10K+ pot)
  - **Capital Opportunities API** (`/api/wealth/opportunities`): Live data from CapitalPoolsAndFunds contract (`0xFcCdC1E353b24936f9A8D08D21aF684c620fa701`)
  - **Graduated Groups API** (`/api/wealth/graduated-groups`): Tracks groups that have graduated to investment pools
  - **Graduation Readiness Dashboard**: New "Graduation" tab on group pages showing:
    - Current mode (Community vs Capital) with visual indicators
    - Basic readiness progress (members, wallets, commitments)
    - Capital Mode progress bars for all 4 thresholds
    - Estimated graduation timeline
    - One-click graduation button for organizers
  - **Graduation Status API** (`/api/susu/groups/[id]/graduation-status`): Detailed progress metrics
  - **GraduationProgress Component**: Full-featured dashboard with mode detection and progress visualization
  - **WealthAdvancement Component**: Displays tier progression (Community → Capital → Wealth Practice) with live stats
  - **Transparency Reports** (`/wealth-practice` Reports tab): Public dashboard showing graduated groups and performance:
    - Summary stats: graduated groups, active groups, capital mobilized
    - Mode distribution (Community vs Capital)
    - On-chain stats from CapitalPoolsAndFunds contract
    - Category performance with graduation rates
    - Recently graduated groups with transaction links
    - Monthly trends (last 12 months)
  - **Transparency Report API** (`/api/wealth/transparency-report`): Comprehensive report data combining database and on-chain sources
- **Organizer Training & Certification** (`/wealth-practice` Training tab): Complete training and certification system for SUSU organizers:
  - 6 training modules: SUSU Fundamentals, Member Management, Conflict Resolution, Financial Literacy, Graduation Management, Advanced Strategies
  - 3 certification levels: Foundation Organizer, Certified Organizer, Master Organizer
  - Interactive quizzes with passing scores (80%)
  - Progress tracking and certification badges
  - Database tables: `organizer_training_progress`, `organizer_certifications`
  - APIs: `/api/training/progress`, `/api/training/submit-quiz`, `/api/training/module/[id]`
- **Policy Guard Service** (`lib/services/PolicyGuardService.ts`): Soft enforcement layer that validates member credentials, AXM stake requirements, commitment signatures, and reputation scores before allowing SUSU participation.
- **Staking Dashboard** (`/staking`): Complete staking interface for AXM tokens with stake/unstake functionality, pending rewards display, tier system (Bronze/Silver/Gold/Platinum/Diamond), and APR calculation.
- **Gamification System**: Achievement badges earned through platform participation (12 badges total), points tracking, and progress visualization.
- **Sustainability Rewards API**: Integration with SustainabilityHub contract for carbon credits, green scores, and eco rewards.
- **Onramp Center** (`/onramp`): Multi-provider fiat-to-crypto gateway for purchasing tokens:
  - Providers: MoonPay, Ramp, Transak (configurable via environment variables)
  - Features: Wallet address input, chain/asset selection, fiat currency/amount configuration
  - Database: `onramp_purchase_intents` table tracks purchase intents
  - APIs: `/api/onramp/config`, `/api/onramp/intent`, `/api/onramp/status`
  - Compliance: Clear disclaimers about third-party processing, KYC, and non-investment nature
  - Environment variables: `MOONPAY_PUBLISHABLE_KEY`, `RAMP_API_KEY`, `TRANSAK_API_KEY` (server-only where applicable)
- **Governance System**: 
  - Current: API-based voting with voting power = AXM balance + staked AXM
  - Future: On-chain voting via GovernanceHub contract (specification in `contracts/GovernanceHub.sol.spec.md`)
  - Feature flags in `lib/governance/config.ts` for easy switching between API and on-chain modes
  - Service layer in `lib/governance/service.ts` with automatic fallback
- **Emissions & DEX Dashboard**: Live protocol metrics on Transparency page showing token emissions progress and DEX liquidity from deployed contracts.
- **IoT Network Telemetry**: DePIN nodes page includes IoTDashboard component with live data from node sales and IoT oracle contracts.

## External Dependencies
- **Blockchain Networks:** Arbitrum One, Universe Blockchain (L3), Reactive Network
- **Blockchain RPC Provider:** Alchemy API
- **Wallet Integration:** MetaMask SDK
- **Smart Contract Development:** Hardhat, OpenZeppelin Contracts, reactive-lib
- **Libraries:** Ethers.js, viem + TypeScript
- **Databases:** PostgreSQL, Neon Database, MongoDB
- **Database Tools:** Drizzle Kit
- **Email Service:** SendGrid
- **Payment Processing:** Stripe
- **Cloud Storage:** Google Cloud Storage, Storacha (Web3 Storage/IPFS)
- **Property Data:** ATTOM Data
- **Rental Estimates:** RentCast API
- **Location Scores:** Walk Score API