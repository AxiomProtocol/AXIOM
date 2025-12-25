# Axiom Smart City - Sovereign Digital-Physical Economy

## Overview
The Axiom Smart City project aims to establish America's first on-chain sovereign smart city economy: a 1,000-acre fintech smart city with comprehensive digital-physical infrastructure. It functions as a bank operating system and a complete sovereign economic engine. Key capabilities include a governance token economy (AXM), full-service digital banking, real estate tokenization, DePIN infrastructure, smart city services, Wall Street integration, cross-chain interoperability, and sustainability initiatives, all while being decentralized and community-governed. The business vision is to create a sovereign digital-physical economy, serving as a model for future smart cities.

## User Preferences
- **Communication style**: Simple, everyday language explaining technical concepts.
- **Video scripts**: Always deliver in a plain text code block format (```text```) so the copy button appears for easy one-click copying. No markdown formatting, no scene directions with brackets - just clean, copyable text with the script, caption, and hashtags.

## System Architecture

### UI/UX Decisions
The frontend features a modular design with a professional gold/black theme, yellow accents, and responsive design. Branding prominently displays "AXIOM" with a golden circular token logo, golden gradient text, and the tagline "America's First On-Chain Smart City." Navigation menus are centrally managed in `lib/navigation.js`, structured around a Learn → Connect → Save Together journey with a `StepProgressBanner`.

### Technical Implementations
The core **Axiom Protocol Token (AXM)** is an ERC20 governance and fee-routing token on Arbitrum One, planning transition to Universe Blockchain (L3) as native gas. The **Smart Contract Architecture** is multi-phase, beginning on Arbitrum One and migrating to Universe Blockchain, covering identity, treasury, staking, emissions, land/asset registry, and future modules. A **Complete Banking Product Suite** offers over 30 product families. The architecture incorporates 23 verified smart contracts on Arbitrum One across DePIN, Governance, Treasury, Property/Real Estate, Cross-Chain, Realtor System, and Smart City modules.

### Custody Model Architecture
Axiom operates a HYBRID CUSTODY model with three types:
1.  **Self-Custody**: User holds tokens directly.
2.  **Smart Contract Custody**: Funds held by audited smart contracts (e.g., Staking, KeyGrow).
3.  **Pooled Custody**: Funds combined with other users, distributions by group rules (e.g., SUSU circles).
Key files for custody definitions and UI components are `lib/custody/disclosure.ts` and `components/CustodyDisclosure.js`. No products are FDIC insured, and certain traditional banking features like ACH/wire transfers or lending are planned but not live.

### Production SSR Patterns
To prevent 500 errors, static/marketing pages use `<Layout showWallet={false}>`. `react-hot-toast` and other browser-only libraries are dynamically imported with `{ ssr: false }` or guarded by `typeof window !== 'undefined'` checks.

### System Design Choices
The architecture uses a "Product Factory Approach" for scalability. The blockchain network is on Arbitrum One, with plans for Universe Blockchain (L3). Data management uses PostgreSQL with Drizzle ORM and MongoDB for analytics. The backend features centralized contract configuration, a dedicated contract service, and chain validation middleware for Arbitrum One. API responses consistently include `axmBalance` and `axmUsdValue`.

Key features include:
-   **Axiom Nodes Marketplace**: For DePIN node management.
-   **DEX Exchange**: A comprehensive decentralized exchange.
-   **Governance**: A full-featured governance system.
-   **Admin Authentication**: JWT-based authentication for `/admin/*` routes.
-   **API Security**: Input validation, sanitization, error handling, and EIP-4361 SIWE authentication.
-   **KeyGrow Rent-to-Own Program**: Real estate program using ERC-1155 tokenized fractional property shares, integrated with ATTOM Data and RentCast.
-   **Axiom SUSU (Rotating Savings Groups)**: On-chain ROSCA system with Community Pool (pooled custody) and Personal Vault (smart contract custody) modes.
-   **PMA Trust**: Axiom operates as a Private Membership Association Trust with tokenized whitelist-only ERC-1155/1400 memberships.
-   **Equity Calculator**: Interactive rent-to-own equity calculator.
-   **Axiom Academy**: Educational platform.
-   **Impact Dashboard**: Real-time platform metrics.
-   **Member Profile System**: Comprehensive personal profile pages.
-   **My Journey Dashboard**: Personal progress tracking.
-   **Community Success Hub**: Testimonial page.
-   **Security Audit**: Covered 24 deployed smart contracts, emphasizing immutable deployments, OpenZeppelin AccessControl, ReentrancyGuard, and Pausable.
-   **The Wealth Practice**: A wealth-building system with phases for Trust & Circles (PolicyGuardService for soft enforcement), Yield & Treasury (Staking Dashboard), and Ecosystem Expansion (governance, gamification, sustainability rewards). Includes a **Wealth Practice Advancement** pathway for graduating groups to capital investments, with a **GraduationProgress Component** and **Transparency Reports**.
-   **Organizer Training & Certification**: System for SUSU organizers with modules, certification levels, and progress tracking.
-   **Staking Dashboard**: AXM staking interface with tiers and APR calculation.
-   **Gamification System**: Achievement badges and points tracking.
-   **Sustainability Rewards API**: Integration with a SustainabilityHub contract.
-   **Onramp Center**: Multi-provider fiat-to-crypto gateway (MoonPay, Ramp, Transak).
-   **Governance System**: Currently API-based, transitioning to on-chain via GovernanceHub contract.
-   **Emissions & DEX Dashboard**: Live protocol metrics.
-   **IoT Network Telemetry**: DePIN nodes page with data from node sales and IoT oracle contracts.

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