# Axiom Smart City - Sovereign Digital-Physical Economy

## Overview
The Axiom Smart City project aims to establish America's first 1,000-acre on-chain sovereign smart city economy. This fintech smart city will function as a bank operating system and a complete sovereign economic engine. Key capabilities include a governance token (AXM), digital banking, real estate tokenization, DePIN infrastructure, smart city services, Wall Street integration, cross-chain interoperability, and sustainability initiatives within a decentralized, community-governed framework. The project's vision is to create a model for future sovereign digital-physical economies.

## User Preferences
- **Communication style**: Simple, everyday language explaining technical concepts.
- **Video scripts**: Always deliver in a plain text code block format (```text```) so the copy button appears for easy one-click copying. No markdown formatting, no scene directions with brackets - just clean, copyable text with the script, caption, and hashtags.

## System Architecture

### UI/UX Decisions
The frontend features a modular design with a professional gold/black theme and yellow accents, ensuring responsiveness. Branding includes "AXIOM" with a golden circular token logo, golden gradient text, and the tagline "Build Wealth Together, On-Chain." Navigation, defined in `lib/navigation.js`, guides users through a Learn → Connect → Save Together journey, complemented by a `StepProgressBanner`.

### Technical Implementations
The core Axiom Protocol Token (AXM) is an ERC20 governance and fee-routing token on Arbitrum One, slated for migration to Universe Blockchain (L3). The multi-phase Smart Contract Architecture, initially on Arbitrum One, covers identity, treasury, staking, emissions, land/asset registry, and future modules. The platform offers a Complete Banking Product Suite with over 30 product families, supported by 23 verified smart contracts on Arbitrum One across various domains. Axiom utilizes a HYBRID CUSTODY model, incorporating Self-Custody, Smart Contract Custody, and Pooled Custody, with disclosures managed via `lib/custody/disclosure.ts` and `components/CustodyDisclosure.js`.

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
-   **V2 Analytics Dashboard**: Unified dashboard for Sovereign Banking metrics.
-   **veAXM Staking Mode**: Enhanced staking page with lock durations and voting power preview.
-   **On-Chain Credit Score Display**: `CreditScoreCard` component with FICO-like visualization.
-   **Referral System**: Full referral tracking with unique codes and leaderboards.
-   **Member Badges**: Achievement system with 10 badge types across 4 rarity tiers.
-   **Governance Proposal Drafting**: UI for veAXM holders to create proposals.
-   **Yield Vault**: Auto-compounding AXM staking.
-   **Push Notifications**: PWA service worker for push notifications with preference settings.
-   **Transparency Dashboard**: Real-time protocol metrics including TVL, burned AXM, veAXM locked, insurance fund balance, SUSU pools, and DePIN nodes.

Wealth Engine V2 Contracts (Sovereign Banking System) implement AIP-001 Master Architectural Plan:
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