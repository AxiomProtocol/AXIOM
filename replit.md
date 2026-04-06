# Axiom Protocol - Sovereign Digital-Physical Economy

## Overview
The Axiom Protocol is a governance-first wealth infrastructure focused on land acquisition to build a sovereign digital-physical economy. Its core purpose is to build wealth together, on-chain, through self-custody and a non-custodial approach, serving as a reference architecture for future sovereign digital-physical economies. Key capabilities include a governance token (AXM), treasury tools, real estate asset onboarding, DePIN infrastructure, cross-chain interoperability, and sustainability initiatives.

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
The frontend adheres to the "Axiom Protocol Design Law," featuring a modular, responsive design with serif headings, monospace data, a navy/forest green/muted gold palette, and specific UI patterns like pagination and flat solid buttons. Mobile optimization is prioritized.

### Wallet Connection Architecture
Wallet connection uses Wagmi v2.19 + Reown AppKit v1.8 with SIWE for authentication on the Arbitrum One chain.

### Technical Implementations
The core Axiom Protocol Token (AXM) is an ERC20 governance token on Arbitrum One, with a planned migration to Universe Blockchain (L3). The multi-phase Smart Contract Architecture on Arbitrum One includes identity, treasury, staking, emissions, and asset registries. A HYBRID CUSTODY model is used for the Complete DeFi Treasury Suite. An "Active Contract Verification System" ensures AXUSD and PSM contract integrity. Production deployment utilizes Replit Autoscale (Vercel). The system includes an ERC-3643 compliant Unified AXUSD stablecoin with automated KYC and an ERC-7726 oracle infrastructure for AXUSD pricing. The AXAU Reserve Instrument is live on mainnet, leveraging several contracts for minting/redeeming against PAXG and LandNAVOracle.

### System Design Choices
The architecture employs a "Product Factory Approach" for scalability. The current blockchain network is Arbitrum One, with a planned migration to Universe Blockchain (L3). Data is managed using PostgreSQL with Drizzle ORM and MongoDB for analytics. The backend features centralized contract configuration, a dedicated contract service, and chain validation middleware.

Key features include:
- Stellar Payments Rail (Layer 00 Extension): Full Circle USDC on Stellar integration. `lib/multichain/stellar/` contains: `StellarPaymentAdapter.ts` (real `@stellar/stellar-sdk` implementation, no stubs), `types.ts` (anchor registry, corridors, SEP types), `StellarReadinessService.ts`. API routes at `/api/stellar/`: `health`, `corridors`, `anchor/info`, `payment/initiate`, `payment/[id]`, `account/[publicKey]`, `sep31/info`, `sep31/initiate`, `sep31/[id]`, `sep38/info`, `sep38/prices`, `sep38/quote`, and `auth` (SEP-10). UI at `/stellar-payments` shows live Horizon network health, MoneyGram anchor status, 4 corridors (USDC→USD via MoneyGram, USDC→USDC via MoneyGram, USDC direct via Circle, ARS via Anclap), and payment initiation flow. DB table: `stellar_payment_transfers` (26 columns). Feature flag: `ENABLE_STELLAR_PAYMENTS_RAIL=true`. Active anchor: MoneyGram (`STELLAR_ACTIVE_ANCHOR`; network guard auto-falls-back to moneygram on mainnet). SEP-10 signing keypair: public key `GBLOO5JUZQDP6JMIX26X5AC26QUNYFYMNT2CLAMGAWDU4HA4VG2IAVIY` (`STELLAR_SIGNING_PUBLIC_KEY`), secret in `STELLAR_SIGNING_SECRET_KEY`. stellar.toml: `VERSION=2.0.0`, `SIGNING_KEY`, `WEB_AUTH_ENDPOINT=https://axiomprotocol.app/api/stellar/auth`, `[[CURRENCIES]]` (USDC/Circle). MoneyGram Ramps allowlist pending — must deploy to `axiomprotocol.app` then resubmit at developer.moneygram.com with domain `axiomprotocol.app` and email `info@axiomprotocol.app`.
- Architecture Diagram Component: `components/design-law/AxiomArchitectureDiagram.tsx` — reusable full and compact variants showing all 7 layers and capital flow. Embeddable anywhere in the site.
- System Map Page: `/system-map` — 5-section dedicated system architecture page (hero, diagram, capital flow, layer breakdown, direct/assisted paths, trust/verification, CTA). Added to nav under Infrastructure dropdown.
- Social Content: `content/social/xrp-vs-axiom-thread.md` — ready-to-post X thread (primary 10-post + backup 5-post) positioning Axiom vs XRP. Includes caption/reply one-liners.
- DEX V2 Ecosystem and Institutional Observer Dashboard.
- Lending Fund (SEC Reg D 506(c)) and Euler V2 AXUSD Lending Markets.
- MIRDT Capital Intelligence Terminal: Nine-dimension advisory signal engine.
- Axiom Sentinel: Unified capital decision and risk authorization layer.
- Founder Operations Dashboard: Internal system overview and operations.
- Solvency and Reserve Transparency: Three-mode institutional solvency console.
- Adaptive Metrics Engine (AME): Deterministic financial computation engine with an AME AI Oracle.
- The Wealth Practice: Manages community group economics with a three-stage trust pipeline.
- Physical-Digital Bridge (Land Acquisition Pipeline): Full land acquisition lifecycle with live governance.
- Property Analysis Tool: Pay-per-report property analysis tool.
- Capital Accounting and Performance Intelligence System: Full-stack capital ledger.
- DeNet DePIN Node Integration: Decentralized storage infrastructure.
- IVCEE: Allocator-grade underwriting intelligence engine.
- Document Ingestion & Extraction: AI-powered document analysis.
- Distressed Property Feed (Deal Flow): Aggregates distressed properties.
- Agent Governance System: Policy-based autonomous agent authorization.
- Banking Infrastructure: Primary banking layer via Increase.com (FDIC-insured, ACH/wire rails) — LIVE; BitGo CaaS for institutional crypto custody on Arbitrum One — LIVE (activated). Banking page `/banking` has 7 tabs including Crypto Custody tab; new admin-gated `/api/bitgo/enterprise/overview` endpoint returns live wallet list, network, enterprise ID, and pending approvals count.
- Multi-Exit Strategy Engine: Provides 8 underwriting strategies.
- Due Diligence Checklist System: Structured DD workflow.
- Craftsman Cost Database and Cost Intelligence Engine: Rehab underwriting grounded in Craftsman NCE data.
- Capital Readiness Card: Computes capital analysis for funding sources.
- AI Acquisition Memo Builder: Gemini-powered institutional acquisition memo generator.
- Syndication Module: Full syndication operating system with an LP Investor Portal.
- Axiom Secondary Network V1: Permissioned secondary transfer, settlement, registry, and intelligence layer for Axiom-issued private market products.
- Field Capture System (Layer 5): Mobile-first walkthrough system for property inspections.
- On-Chain Lending Credit Market: Production smart contracts for fixed-term loans and gated LP pools.
- AXUSD → AXAU Simplified Purchase Flow: `/axau-buy` page where users spend AXUSD to receive AXAU; ops team acquires PAXG, deposits to vault, and mints. `axau_purchase_requests` table tracks all requests. Founder Ops "AXAU Queue" tab shows pending requests, vault stats, and fulfillment actions (mark processing → enter tx hash → fulfill/fail). Resend confirmation email on submit.

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
- **Banking Rails:** Increase (REST API)
- **Crypto Custody:** BitGo CaaS (REST API)
- **Text-to-Speech:** ElevenLabs API