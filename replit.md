# Axiom Smart City - Sovereign Digital-Physical Economy

## Overview
The Axiom Smart City project aims to establish America's first 1,000-acre on-chain sovereign smart city economy. It functions as a community-governed DeFi protocol with a robust treasury system and economic engine. Its core purpose is to create a model for future sovereign digital-physical economies, emphasizing self-custody and a non-custodial DeFi approach. Key capabilities include a governance token (AXM), DeFi treasury tools, real estate tokenization, DePIN infrastructure, smart city services, cross-chain interoperability, and sustainability initiatives within a decentralized, community-governed framework. The project's ambition is to build wealth together, on-chain.

## User Preferences
- **Communication style**: Simple, everyday language explaining technical concepts.
- **Video scripts**: Always deliver in a plain text code block format (```text```) so the copy button appears for easy one-click copying. No markdown formatting, no scene directions with brackets - just clean, copyable text with the script, caption, and hashtags.
- **Navigation system**: The active navigation is the `NAV_LINKS` array in `components/design-law/DesignLawLayout.tsx` (and duplicated in `components/design-law/DesignLawHome.tsx` for the home page). When adding new pages to the nav, update both files. The legacy nav files (`navConfig.ts`, `SiteNavModel.ts`, `lib/navigation.js`) exist but are NOT rendered by the current DesignLawLayout.
- **Page structure**: ALL pages now use `<DesignLawLayout>` wrapper from `components/design-law`. This provides: nav header (AXIOM logo, 10 nav links, Connect Wallet button, mobile hamburger), footer (chain ID, disclaimer, timestamp), and `max-w-7xl mx-auto px-6 py-8` container. New pages must wrap in `<DesignLawLayout>` and use Design Law styling (serif headings, monospace data, dl-* color classes, no rounded corners/shadows/animations/gradients).
- **DEPRECATED - Old page structure**: Do NOT use the old dark-themed structure with `<Layout>` wrapper, `bg-black`/`bg-gray-900` backgrounds, or yellow accent colors. Do NOT use bare `<>` fragment wrappers or teal accent colors. All pages must use `<DesignLawLayout>` wrapper.
- **Data sources**: NEVER use hardcoded placeholder data in any new pages. Always fetch real data from blockchain (via services like `CamelotPoolService`), database (PostgreSQL/Drizzle), or external APIs. Use async data fetching patterns with proper loading states and error handling.

## System Architecture

### UI/UX Decisions
The frontend features a modular, responsive design with white backgrounds and teal, purple, and gold accents. Branding includes "AXIOM" with a golden circular token logo and the tagline "Build Wealth Together, On-Chain." All new pages must comply with the "Axiom Protocol Design Law," which mandates serif headings, monospace data, navy/forest green/muted gold palette, light mode only, no gradients/shadows/animations, and specific UI patterns like pagination and flat solid buttons. A Lexicon Guard enforces prohibited terms.

### Technical Implementations
The core Axiom Protocol Token (AXM) is an ERC20 governance and fee-routing token on Arbitrum One, with a planned migration to Universe Blockchain (L3). The multi-phase Smart Contract Architecture on Arbitrum One covers identity, treasury, staking, emissions, and asset registries, supported by 23 verified smart contracts. The platform offers a Complete DeFi Treasury Suite with self-custody vaults, savings circles, staking, and investment pools, utilizing a HYBRID CUSTODY model. The system includes an "Active Contract Verification System" that serves as the single source of truth for AXUSD and PSM contract addresses, auto-generated and verified on-chain.

### System Design Choices
The architecture employs a "Product Factory Approach" for scalability. Arbitrum One is the current blockchain network, with a planned migration to Universe Blockchain (L3). Data management uses PostgreSQL with Drizzle ORM and MongoDB for analytics. The backend includes centralized contract configuration, a dedicated contract service, and chain validation middleware. Key active features include the DEX V2 Ecosystem, an Institutional Observer Dashboard, a Lending Fund (SEC Reg D 506(c) compliant), the Axiom Capital Program, Euler V2 AXUSD Lending Markets, the MIRDT (Market Intelligence & Risk Disclosure Terminal) for probabilistic trend-following analysis, and **Axiom Sentinel** — the unified capital decision and risk authorization layer.

**Axiom Sentinel:** This component acts as the unified capital decision and risk authorization layer across all Axiom products. It converts MIRDT market intelligence signals into authorized capital actions with cryptographic audit trails. Its architecture involves an in-app Next.js service as the control plane, manual API triggers for job scheduling, Drizzle + PostgreSQL for the database, mixed onchain/offchain gating, and an append-only DB with a hash chain for auditing. Core engines include `RegimeEngine`, `ConfidenceCalibrator`, `ConfirmationEngine`, `PortfolioEngine`, `AuthorizationService`, and `AuditLogger`. Sentinel also incorporates a circuit breaker, notification hooks, and reusable capital action gating with risk constraints.

**Founder Operations Dashboard:** This internal tool provides a 4-tab dashboard for System Overview, Capital Allocation, Risk Checkpoints, and Operations Log, along with an interactive playbook. It aggregates live data from various Axiom components and includes 6 mandatory Guard Rails for operational safety.

**Solvency and Reserve Transparency:** The `/solvency` page provides verifiable visibility into protocol financial health. It combines live metrics from a database-backed snapshot system (`solvencySnapshots` table) with institutional disclosure content including definitions, capital waterfall, stabilization policy modes, FAQ, and verification instructions. Admin snapshot ingestion is available at `/api/solvency/ingest-snapshot` (protected by `ADMIN_SOLVENCY_KEY`). Metrics API at `/api/solvency/metrics` returns a versioned `solvency-v1` JSON contract.

**DeNet DePIN Node Integration:** This integrates decentralized storage infrastructure via DeNet Datakeeper Node. A dedicated dashboard monitors node status and storage metrics, supported by an internal Google Cloud deployment guide. The integration utilizes a client, uploader, verifier, and CID enforcement package.

**Deployment SOP:** The project exclusively uses `autoscale` for deployment. The `next.config.js` must include `output: 'standalone'`, and `package.json` scripts specify `next dev -p 5000`, `next build` with asset copying, and `start` using `node .next/standalone/server.js`. Ports are `5000` for dev and `3000` for production, with `HOSTNAME=0.0.0.0`. Health checks are available at `/api/health` and `/healthz`, with `/api/health` having zero external dependencies.

## External Dependencies
- **Blockchain Networks:** Arbitrum One, Universe Blockchain (L3)
- **Blockchain RPC Provider:** Alchemy API
- **Wallet Integration:** MetaMask SDK
- **Smart Contract Development:** Hardhat, OpenZeppelin Contracts
- **Libraries:** Ethers.js, viem + TypeScript
- **Databases:** PostgreSQL, Neon Database, MongoDB
- **Database Tools:** Drizzle Kit
- **Email Service:** Resend
- **Payment Processing:** Stripe
- **Cloud Storage:** Google Cloud Storage, Storacha (Web3 Storage/IPFS)
- **Auth Provider:** Supabase
- **Google AI Stack:** Gemini AI Integration via Replit AI Integrations (gemini-3-pro-preview, gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-image)
- **Property Data:** ATTOM Data, RentCast API, Walk Score API
- **Market Data:** Alpha Vantage (US equities OHLCV), CoinGecko (digital asset OHLCV)