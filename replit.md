# Axiom Smart City - Sovereign Digital-Physical Economy

## Overview
The Axiom Smart City project aims to establish America's first 1,000-acre on-chain sovereign smart city economy. This DeFi protocol operates as a community-governed treasury system and economic engine. Key capabilities include a governance token (AXM), DeFi treasury tools, real estate tokenization, DePIN infrastructure, smart city services, cross-chain interoperability, and sustainability initiatives within a decentralized, community-governed framework. The project's vision is to create a model for future sovereign digital-physical economies.

**COMPLIANCE NOTE (Dec 2024)**: All "banking" terminology has been rebranded to DeFi-compliant language for Coinbase Onramp integration. "National Bank of Axiom" → "Axiom Treasury", "accounts" → "vaults", "banking" → "DeFi protocol", FDIC references removed, specific APY promises replaced with "variable protocol rewards". Platform emphasizes self-custody model and non-custodial DeFi operations.

## User Preferences
- **Communication style**: Simple, everyday language explaining technical concepts.
- **Video scripts**: Always deliver in a plain text code block format (```text```) so the copy button appears for easy one-click copying. No markdown formatting, no scene directions with brackets - just clean, copyable text with the script, caption, and hashtags.

## System Architecture

### UI/UX Decisions
The frontend features a modular design with a professional gold/black theme and yellow accents, ensuring responsiveness. Branding includes "AXIOM" with a golden circular token logo, golden gradient text, and the tagline "Build Wealth Together, On-Chain." Navigation, defined in `lib/navigation.js`, guides users through a Learn → Connect → Save Together journey, complemented by a `StepProgressBanner`.

### Official Web3 Design Template (Jan 2026)
The homepage and marketing pages use the official Web3 immersive design system located in `components/axiomRebuild/`:

**Core Components:**
- `Web3Hero.tsx` - Immersive hero with floating 3D orbs, glassmorphism, animated stats
- `Web3Section.tsx` - Scroll-animated sections with image support, variants (default/highlight/dark)
- `ImmersiveCard.tsx` - 3D hover-effect cards with perspective transforms
- `styles/web3Theme.ts` - Design tokens (colors, shadows, animations, icons)

**Design Principles:**
- White background with subtle radial gradient overlays for depth
- Primary color: Teal (#00D4AA) with purple (#7B68EE) and gold (#FFD700) accents
- Glassmorphism: `rgba(255,255,255,0.85)` + `backdrop-filter: blur(20px)`
- 3D depth via deep shadows, floating elements, perspective transforms
- IntersectionObserver-based scroll animations
- Deep immersive 3D images in `public/generated/`

**Section Variants:**
- `default` - White background, dark text
- `highlight` - Teal gradient overlay (KeyGrow section)
- `dark` - Dark gradient background (CTA sections)

**Image Integration:**
- Alternating left/right layouts
- 3D shadow effects with gradient overlays
- Scroll-triggered scale and fade animations

**Copy Configuration:**
- `copy/homeCopy.ts` - Homepage content with image paths
- Each section supports: title, body, bullets, CTAs, image, imageAlt

### Technical Implementations
The core Axiom Protocol Token (AXM) is an ERC20 governance and fee-routing token on Arbitrum One, slated for migration to Universe Blockchain (L3). The multi-phase Smart Contract Architecture, initially on Arbitrum One, covers identity, treasury, staking, emissions, land/asset registry, and future modules. The platform offers a Complete DeFi Treasury Suite with self-custody vaults, savings circles, staking, and investment pools, supported by 23 verified smart contracts on Arbitrum One across various domains. Axiom utilizes a HYBRID CUSTODY model, incorporating Self-Custody, Smart Contract Custody, and Pooled Custody, with disclosures managed via `lib/custody/disclosure.ts` and `components/CustodyDisclosure.js`.

### System Design Choices
The architecture employs a "Product Factory Approach" for scalability. Arbitrum One serves as the current blockchain network, with a planned migration to Universe Blockchain (L3). Data management is handled by PostgreSQL with Drizzle ORM and MongoDB for analytics. The backend includes centralized contract configuration, a dedicated contract service, and chain validation middleware for Arbitrum One, with API responses consistently providing `axmBalance` and `axmUsdValue`.

Key features include:
-   **Axiom Nodes Marketplace**: For DePIN node management.
-   **DEX Exchange**: A comprehensive decentralized exchange.
-   **Governance**: A full-featured governance system (API-based, transitioning to on-chain).
-   **Admin Authentication & RBAC**: JWT-based authentication for `/admin/*` routes with hierarchical roles and a two-step approval system for sensitive actions, including a $5000 threshold policy and audit logging.
-   **AI Agent & Upgrade Framework**: A security-first framework with configurable modes (off/observe/propose), production safety defaults, dry-run capabilities, a read-only query endpoint, robust audit logging with secret redaction, idempotency, and release governance. Prompt templates are stored in `prompts/`.
-   **API Security**: Input validation, sanitization, error handling, and EIP-4361 SIWE authentication.
-   **KeyGrow Rent-to-Own Program**: Real estate program using ERC-1155 tokenized fractional property shares.
-   **Axiom SUSU (Rotating Savings Groups)**: On-chain ROSCA system ("The Wealth Practice") with Community Pool and Personal Vault custody modes.
-   **PMA Trust**: Operates as a Private Membership Association Trust with tokenized ERC-1155/1400 memberships.
-   **AI Member Support**: Gemini-powered chat assistant.
-   **V2 Analytics Dashboard**: Unified dashboard for DeFi protocol metrics.
-   **SEED (Wealth Engine)**: Lock AXM → Earn SEED → Access produce cycles, land cohorts, governance. Curve-style locking (1-4 years) with tier-based participation benefits.
-   **On-Chain Credit Score Display**: `CreditScoreCard` component with FICO-like visualization.
-   **Referral System**: Full referral tracking with unique codes and leaderboards.
-   **Member Badges**: Achievement system with 10 badge types across 4 rarity tiers.
-   **Governance Proposal Drafting**: UI for SEED holders to create proposals.
-   **Yield Vault**: Auto-compounding AXM staking.
-   **Push Notifications**: PWA service worker for push notifications with preference settings.
-   **Transparency Dashboard**: Real-time protocol metrics including TVL, burned AXM, SEED locked, insurance fund balance, SUSU pools, and DePIN nodes.
-   **Axiom Steward Corps**: Elite coordination corps for managing regional participation, food distribution, and land readiness. Features include: eligibility verification (AXM balance, holding duration, participation), 5-stage selection process (screening → application → pledge → probation → confirmation), role hierarchy (Coordinator/Lead/Council), and probation metrics tracking. Data in `lib/stewardCorps.ts`, components in `components/stewardCorps/`, pages at `/stewards`, `/stewards/apply`, `/stewards/dashboard`.
-   **Steward Dashboard (Jan 2026)**: Full-featured operational dashboard for active stewards with 13 components, 10 pages, and collapsible sidebar navigation. Components in `components/stewardsDashboard/`, pages at `/stewards/dashboard/*`. Features include:
    - **Overview Dashboard**: Real-time metrics cards (next drop, open tasks, participants, land leads), quick actions, region health score, operational alerts
    - **Produce Drops**: Create/edit drop events, manage reservations, track pickup status (reserved → confirmed → pickedUp/noShow)
    - **Participant Directory**: Searchable participant list with activity scores, engagement flags, and profile details
    - **Land Pipeline**: Drag-and-drop kanban for land leads (new → needsData → qualified → underReview → escalated → pursuing → acquired)
    - **Tasks Board**: Kanban-style task management with priorities and due dates
    - **Communications**: Message composer with templates (drop announcement, reservation open, pickup instructions, etc.) and channel selection
    - **Region Management**: View assigned region, pickup points, and fellow stewards
    - **Group Formation**: Create and manage participant groups for onboarding and cohorts
    - **Reputation Panel**: View reliability/responsiveness/land quality/reporting scores with unlock progression
    - **Weekly Reports**: Auto-populated metrics with summary/issues/plan submission
    - **Settings**: Notification preferences, region profile configuration, admin role assignment
    - **Analytics**: Custom event tracking via `lib/stewardsAnalytics.ts` with 18 tracked events and sessionStorage deduplication
    - **API Routes**: `/api/stewards/dashboard/*` (auth, overview), `/api/stewards/drops/*` (reserve), `/api/stewards/land/*` (interest), `/api/stewards/cohorts/*` (join)
    - **Database**: 29 tables in `shared/schema.ts` for steward operations (regions, drops, reservations, participants, land leads, tasks, messages, reports, reputation metrics)

Wealth Engine V2 Contracts (DeFi Treasury System) implement AIP-001 Master Architectural Plan:
-   **AxiomScoreSBT**: ERC-5192 Soulbound Token for on-chain credit scoring (300-850 range), integrated with SUSU repayment history.
-   **SusuInsuranceFund**: Default Insurance Fund with 5% node rewards diversion to cover broken SUSU circles.
-   **SEED**: Lock AXM → Earn SEED (voting power). Curve-style locking (1-4 years), time-weighted voting power, epoch-based rewards. Tier system: Seedling → Sprout → Sapling → Grove.
-   **AxiomFeeBurner**: 0.5% fee switch on treasury products with automatic AXM buyback/burn and 50% distribution to SEED holders.

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