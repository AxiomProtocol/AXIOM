# Axiom Protocol - Sovereign Digital-Physical Economy

## Overview
The Axiom Protocol is a governance-first wealth infrastructure focused on land acquisition to build a sovereign digital-physical economy. Its core purpose is to build wealth together, on-chain, through self-custody and a non-custodial approach. It offers a new financial operating system for digital-physical economies with capabilities including a governance token (AXM), treasury tools, real estate asset onboarding, DePIN infrastructure, cross-chain interoperability, and sustainability initiatives, aiming to be a reference architecture for future sovereign digital-physical economies.

## User Preferences
- **Communication style**: Simple, everyday language explaining technical concepts.
- **Video scripts**: Always deliver in a plain text code block format (```text```) so the copy button appears for easy one-click copying. No markdown formatting, no scene directions with brackets - just clean, copyable text with the script, caption, and hashtags.
- **Navigation system**: The active navigation is the `NAV_ITEMS` array in `components/design-law/navItems.ts` (consumed by `DesignLawLayout.tsx`). Navigation uses grouped dropdowns: About (direct), Disclosure (direct), Community (dropdown: Wealth Practice, Land), Products (dropdown: Property Analysis, Deal Intelligence, Deal Flow, Capital Program, Lending Fund, Exchange, Unified AXUSD, DePIN, Banking), Intelligence (dropdown: MIRDT, Sentinel, Observer, RE Intelligence), Operations (dropdown: Founder Ops, Proof of Execution, Execution Framework, Capital Accounting, Solvency, Syndication, Investor Portal, All Products), Contact (direct). Dropdowns use click-to-open with outside-click-to-close behavior. Desktop breakpoint is `lg:`.
- **Page structure**: ALL pages now use `<DesignLawLayout>` wrapper from `components/design-law`. This provides: nav header (AXIOM logo, 7 top-level nav items with dropdown menus, Connect Wallet button, mobile hamburger), footer (chain ID, disclaimer, timestamp), and `max-w-7xl mx-auto px-6 py-8` container. New pages must wrap in `<DesignLawLayout>` and use Design Law styling (serif headings, monospace data, dl-* color classes, no rounded corners/shadows/animations/gradients).
- **Institutional vocabulary**: In disclosure-facing content, use allocator-friendly vocabulary: "automated control layers" (not "smart contracts"), "multi-party authorization" (not "multi-sig"), "on-chain financial rails" (not "DeFi"), "asset onboarding/issuance" (not "tokenization"), "participation lockup" (not "staking"). Technical terms are preserved in a glossary on `/disclosure`. GENIUS Act references must say "designed to align with" (not "compliant"). No definitive legal conclusions about token classification. The canonical glossary file is `lib/glossary.ts` — it defines all approved terms, forbidden phrases, maturity labels, and safe replacement patterns.
- **SUSU Rebrand (Feb 2026)**: All user-facing references to "SUSU", "Savings Circle", "ROSCA" have been rebranded to "The Wealth Practice" (formal) or "Wealth Practice" (short). Database table/column names (susu_groups, susu_members, etc.) remain unchanged; route path updated from `/susu` to `/wealth-practice` — only visible labels, headings, descriptions, and copy were updated. The canonical name and definition are in `lib/glossary.ts`. Historical/educational references to the traditional SUSU concept are preserved in Part 1 of the public educational documents.
- **Language hardening rules**: No absolutist positioning ("only platform", "sole platform", "the standard for everyone"). No unqualified physical asset claims (use "pipeline", "framework", "targeted acquisition" instead of specific acreage without evidence). No wealth outcome promises ("make wealthier", "guaranteed returns", "APY" as a claim — use "Variable" for rates). No forbidden characters in new copy (no asterisks or hashtags in body text).
- **Disclosure page**: `/disclosure` is the comprehensive institutional disclosure document. It fetches a single canonical snapshot from `/api/solvency/latest` and derives all headline numbers from that snapshot (treasury, liabilities, coverage ratio, policy mode). Snapshot ID and timestamp is displayed at the top. Definitions section provides formulas for CR, RR, LBR, LD. Unified AXUSD (ERC-3643) migration notice replaces the old dual-ecosystem non-mixing rule. Contract addresses updated to reflect new ERC-3643 system with legacy contracts marked deprecated. Operational status is segmented into Live/Configured-Inactive/Planned.
- **DEPRECATED - Old page structure**: Do NOT use the old dark-themed structure with `<Layout>` wrapper, `bg-black`/`bg-gray-900` backgrounds, or yellow accent colors. Do NOT use bare `<>` fragment wrappers or teal accent colors. All pages must use `<DesignLawLayout>`.
- **Data sources**: NEVER use hardcoded placeholder data in any new pages. Always fetch real data from blockchain (via services like `CamelotPoolService`), database (PostgreSQL/Drizzle), or external APIs. Use async data fetching patterns with proper loading states and error handling.

## System Architecture

### UI/UX Decisions
The frontend uses a modular, responsive design adhering to the "Axiom Protocol Design Law," featuring serif headings, monospace data, a navy/forest green/muted gold palette, light mode only, and specific UI patterns like pagination and flat solid buttons.

### Wallet Connection Architecture
Wallet connection utilizes Wagmi v2.19 + Reown AppKit v1.8 with SIWE for authentication, configured for the Arbitrum One chain. AppKit provides a built-in modal supporting various wallets.

### Technical Implementations
The core Axiom Protocol Token (AXM) is an ERC20 governance token on Arbitrum One, with a planned migration to Universe Blockchain (L3). The multi-phase Smart Contract Architecture on Arbitrum One includes identity, treasury, staking, emissions, and asset registries, supported by 72 verified smart contracts. The platform utilizes a HYBRID CUSTODY model for its Complete DeFi Treasury Suite. An "Active Contract Verification System" ensures the integrity of AXUSD and PSM contract addresses. Production deployment uses Replit Autoscale (Vercel) for serverless scaling.

### System Design Choices
The architecture employs a "Product Factory Approach" for scalability. The current blockchain network is Arbitrum One, with a planned migration to Universe Blockchain (L3). Data is managed using PostgreSQL with Drizzle ORM and MongoDB for analytics. The backend features centralized contract configuration, a dedicated contract service, and chain validation middleware.

Key features include:
- **DEX V2 Ecosystem** and **Institutional Observer Dashboard**.
- **Lending Fund** (SEC Reg D 506(c)).
- **Euler V2 AXUSD Lending Markets**.
- **MIRDT (Market Intelligence & Risk Disclosure Terminal)** for probabilistic trend-following analysis.
- **Axiom Sentinel**: A unified capital decision and risk authorization layer.
- **Founder Operations Dashboard**: Internal dashboard for system overview and operations, including an "Outcomes" tab.
- **Solvency and Reserve Transparency**: A page providing a three-mode institutional solvency console.
- **Adaptive Metrics Engine (AME)**: A deterministic financial computation engine with an **AME AI Oracle** (Gemini-powered interpretation).
- **MIRDT Execution Model**: A deterministic, auditable engine for paper trading.
- **Proof of Execution Playbook**: Internal dashboard tracking paper trading P&L.
- **The Wealth Practice**: Manages community group economics with a three-stage trust pipeline.
- **Physical-Digital Bridge (Land Acquisition Pipeline)**: Full land acquisition lifecycle with live governance.
- **Property Analysis Tool**: Pay-per-report property analysis tool with free, base, and premium tiers.
- **Graduated Execution Framework (GEF)**: A behavior-based qualification system.
- **Capital Accounting and Performance Intelligence System**: A full-stack capital ledger.
- **DeNet DePIN Node Integration**: Provides decentralized storage infrastructure.
- **IVCEE (Institutional Viability & Capital Efficiency Engine)**: An allocator-grade underwriting intelligence engine.
- **Document Ingestion & Extraction**: AI-powered document analysis in the Deal Intelligence workspace.
- **Distressed Property Feed (Deal Flow)**: Aggregates distressed properties from government sources and a wholesaler submission portal.
- **Agent Governance System**: Policy-based autonomous agent authorization.
- **ERC-3643 Unified AXUSD (T-REX Compliant)**: A unified ERC-3643 compliant stablecoin with a frontend dashboard and automated KYC.
- **Banking Infrastructure (Unit + BitGo)**: Unified banking layer at `/banking` providing FDIC-insured deposit accounts, ACH, debit cards, KYC, and institutional crypto custody. A Bridge Service connects fiat↔crypto.
- **Multi-Exit Strategy Engine**: Provides 8 underwriting strategies with comparison and ranking.
- **Due Diligence Checklist System**: Structured DD workflow.
- **Craftsman Cost Database**: `rehab_cost_benchmarks` table seeded with 57 reference costs from Craftsman National Construction Estimator (NCE), used for deterministic scope generation. Regional pricing modifiers are applied.
- **Property-type discrimination in inspection**: `field_inspection_sessions.property_type` column (sfr/multifamily) dictates form structure and cost calculations.
- **Cost Intelligence Engine**: Production-grade rehab underwriting engine grounded in Craftsman NCE data, integrated as "Cost Intelligence" tab in deal workspace.
- **Capital Readiness Card**: Computes capital analysis for funding sources.
- **AI Acquisition Memo Builder**: Gemini-powered institutional acquisition memo generator.
- **Syndication Module**: Full syndication operating system with an **LP Investor Portal** at `/syndication/portal`.
- **Axiom Secondary Network V1**: Permissioned secondary transfer, settlement, registry, and intelligence layer for Axiom-issued private market products. Routes: `/secondary` (investor portfolio), `/secondary/marketplace` (listings + bidding), `/secondary/issuer` (issuer console: NAV marks, approvals, registry), `/secondary/admin` (admin: compliance flags, settlement oversight, audit trail). Schema: 44 enums + 29 tables (`sec_` prefix) in `shared/secondarySchema.ts`. Services: `server/services/secondary/` (auth, compliance, positions, marketplace, transfers, approvals, settlement, pricing, analytics, audit, notifications). API: `pages/api/secondary/` (13 routes). Key business rules: 10-check compliance gate before every transfer, 0.5% platform fee at settlement, 180-day hold on secondary lots, NAV discount threshold triggers review, beneficial ownership registry updated atomically at settlement. Seed: `scripts/seed-secondary.ts` (3 series, 2 test investors, 3 positions, 1 active listing).
- **Mobile Optimization**: All key pages optimized for mobile screens.
- **Field Capture System (Layer 5)**: Mobile-first walkthrough system for real-world property inspections at `/field-capture/[sessionId]`. Features include tap-optimized condition buttons, real-time rehab cost binding, unit type designation, offline-first draft save, voice note capture, unit replication engine, and session completion summary with recommendations.
- **On-Chain Lending Credit Market (Task #31)**: Two production smart contracts deployed and verified on Arbitrum One (2026-03-22). `AXIOMCreditMarket` (`0x322CB0cB2B1E35B6C59f6571D8250D681b1E27E1`) — LP vault + on-chain loan lifecycle state machine (6 states: PENDING → APPROVED → ACTIVE → DELINQUENT → REPAID / DEFAULTED); interest-first repayment; `fundLoan()` disburses AXUSD to borrower. `AXIOMFixedLoan` (`0xd73B04eEbBb09c01cB40544AcD7C2fE80dbb1913`) — ERC-721 receipt NFT minted on funding, burned on terminal state; fully on-chain Base64 SVG metadata. Both contracts verified on Arbitrum Blockscout. API `pages/api/realestate/loan-lifecycle.ts` anchors origination and funding on-chain via DEPLOYER_PRIVATE_KEY signer (same pattern as distributions.ts). Slither audit: 0 findings (all timestamp false positives annotated). Addresses exported from `src/config/activeContracts.generated.ts` as `CREDIT_MARKET_ADDRESS` + `FIXED_LOAN_NFT_ADDRESS`.

## External Dependencies
- **Blockchain Networks:** Arbitrum One, Universe Blockchain (L3)
- **Blockchain RPC Provider:** Alchemy API
- **Wallet Integration:** MetaMask SDK, Wagmi, Reown AppKit
- **Smart Contract Development:** Hardhat, OpenZeppelin Contracts, @onchain-id/solidity
- **Libraries:** Ethers.js, viem + TypeScript
- **Databases:** PostgreSQL, Neon Database, MongoDB
- **Database Tools:** Drizzle Kit
- **Email Service:** Resend
- **Payment Processing:** Stripe
- **Cloud Storage:** Google Cloud Storage, Storacha (Web3 Storage/IPFS)
- **Auth Provider:** Auth0 (`@auth0/nextjs-auth0` v3) + SIWE
- **Google AI Stack:** Gemini AI Integration via Replit AI Integrations
- **Property Data:** RentCast API, Walk Score API
- **Market Data:** Alpha Vantage, CoinGecko
- **Banking Rails:** Unit Finance (`@unit-finance/unit-node-sdk` v1.4.1)
- **Crypto Custody:** BitGo CaaS (REST API)
- **Text-to-Speech:** ElevenLabs API