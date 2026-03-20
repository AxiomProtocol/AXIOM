# Axiom Protocol - Sovereign Digital-Physical Economy

## Overview
The Axiom Protocol is a governance-first wealth infrastructure focused on land acquisition to build a sovereign digital-physical economy. Its core purpose is to build wealth together, on-chain, through self-custody and a non-custodial approach. The project aims to be a reference architecture for future sovereign digital-physical economies, offering a new financial operating system for digital-physical economies with capabilities including a governance token (AXM), treasury tools, real estate asset onboarding, DePIN infrastructure, cross-chain interoperability, and sustainability initiatives.

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
The core Axiom Protocol Token (AXM) is an ERC20 governance token on Arbitrum One, with a planned migration to Universe Blockchain (L3). The multi-phase Smart Contract Architecture on Arbitrum One includes identity, treasury, staking, emissions, and asset registries, supported by 72 verified smart contracts. The platform utilizes a HYBRID CUSTODY model for its Complete DeFi Treasury Suite. An "Active Contract Verification System" ensures the integrity of AXUSD and PSM contract addresses.

### Deployment
Production deployment uses Replit Autoscale (Vercel) for serverless scaling. A custom domain `axiomprotocol.app` is used. BitGo API integration requires a static outbound IP.

### System Design Choices
The architecture employs a "Product Factory Approach" for scalability. The current blockchain network is Arbitrum One, with a planned migration to Universe Blockchain (L3). Data is managed using PostgreSQL with Drizzle ORM and MongoDB for analytics. The backend features centralized contract configuration, a dedicated contract service, and chain validation middleware.

Key features include:
- **DEX V2 Ecosystem** and **Institutional Observer Dashboard**.
- **Lending Fund** (SEC Reg D 506(c)).
- **Euler V2 AXUSD Lending Markets**.
- **MIRDT (Market Intelligence & Risk Disclosure Terminal)** for probabilistic trend-following analysis.
- **Axiom Sentinel**: A unified capital decision and risk authorization layer.
- **Founder Operations Dashboard**: Internal dashboard for system overview and operations. Includes an "Outcomes" tab showing outcomes pending verification review with approve/reject buttons calling the review API.
- **Solvency and Reserve Transparency**: A page providing a three-mode institutional solvency console.
- **Adaptive Metrics Engine (AME)**: A deterministic financial computation engine.
- **AME AI Oracle**: A Gemini-powered interpretation layer for AME metrics.
- **MIRDT Execution Model**: A deterministic, auditable engine for paper trading based on MIRDT market intelligence.
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
- **Banking Infrastructure (Unit + BitGo)**: Unified banking layer at `/banking`. Unit provides FDIC-insured deposit accounts, ACH payments, debit cards, and KYC. BitGo provides institutional crypto custody wallets (AXM, AXUSD, ETH on Arbitrum). A Bridge Service connects fiat↔crypto with live CoinGecko quotes and full status tracking.
- **Multi-Exit Strategy Engine**: Provides 8 underwriting strategies with comparison and ranking.
- **Due Diligence Checklist System**: Structured DD workflow.
- **Craftsman Cost Database**: `rehab_cost_benchmarks` table seeded with 57 reference costs from Craftsman National Construction Estimator (NCE). Covers 18 systems × 3 condition levels (light/medium/full_replace) × property type (sfr/multifamily/both). Cost units: per_unit, per_sqft, per_door, per_window, flat. API at `/api/rehab-costs?property_type=sfr|multifamily`. Scope generation loads DB costs and embeds them as grounding context in the AI prompt.
- **Property-type discrimination in inspection**: `field_inspection_sessions.property_type` column (sfr/multifamily). SFR form: 16 systems (adds roof, foundation, garage, landscaping; removes common_area, laundry_room). MF form: 18 systems. Session creation UI includes property type toggle. Walk form shows Craftsman mid-range cost per system dynamically as conditions are selected. Craftsman Cost Reference table is toggleable in the walk view.
- **Capital Readiness Card**: Computes capital analysis for funding sources.
- **AI Acquisition Memo Builder**: Gemini-powered institutional acquisition memo generator.
- **Syndication Module**: Full syndication operating system.
- **LP Investor Portal**: Wallet-authenticated investor dashboard at `/syndication/portal`. Shows holdings, subscriptions, capital calls, distributions, and offering documents.
- **Mobile Optimization**: All key pages optimized for mobile screens.

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
- **Google AI Stack:** Gemini AI Integration via Replit AI Integrations (various Gemini models)
- **Property Data:** RentCast API, Walk Score API
- **Market Data:** Alpha Vantage, CoinGecko
- **Banking Rails:** Unit Finance (`@unit-finance/unit-node-sdk` v1.4.1)
- **Crypto Custody:** BitGo CaaS (REST API)
- **Text-to-Speech:** ElevenLabs API (env: `ELEVENLABS_API_KEY`). Voices: George (`JBFqnCBsd6RMkjVDRZzb`) for MARCUS, Rachel (`21m00Tcm4TlvDq8ikWAM`) for ISHA. Model: `eleven_multilingual_v2`. Rachel requires paid plan; Alice (`Xb7hH8MSUJpSbSDYk0k2`) is free-tier fallback. Script: `scripts/generate_podcast.py` (resumable, normalizes to -16 LUFS).
- **Podcast content:** `documents/Axiom_Banking_RealEstate_Podcast_Script.md` (full script), `documents/Axiom_Banking_RealEstate_Podcast.mp3` (partial audio — 73/103 utterances, -16 LUFS normalized). Re-run `python scripts/generate_podcast.py` after ElevenLabs plan upgrade or quota reset.