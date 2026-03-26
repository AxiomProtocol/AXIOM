# Axiom Protocol - Sovereign Digital-Physical Economy

## Overview
The Axiom Protocol is a governance-first wealth infrastructure focused on land acquisition to build a sovereign digital-physical economy. Its core purpose is to build wealth together, on-chain, through self-custody and a non-custodial approach. It offers a new financial operating system for digital-physical economies, aiming to be a reference architecture for future sovereign digital-physical economies. Key capabilities include a governance token (AXM), treasury tools, real estate asset onboarding, DePIN infrastructure, cross-chain interoperability, and sustainability initiatives.

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
The frontend uses a modular, responsive design adhering to the "Axiom Protocol Design Law," featuring serif headings, monospace data, a navy/forest green/muted gold palette, light mode only, and specific UI patterns like pagination and flat solid buttons. Mobile optimization is a key focus for all critical pages.

### Wallet Connection Architecture
Wallet connection utilizes Wagmi v2.19 + Reown AppKit v1.8 with SIWE for authentication, configured for the Arbitrum One chain.

### Technical Implementations
The core Axiom Protocol Token (AXM) is an ERC20 governance token on Arbitrum One, with a planned migration to Universe Blockchain (L3). The multi-phase Smart Contract Architecture on Arbitrum One includes identity, treasury, staking, emissions, and asset registries. 53 automated control layers are actively integrated in the application (live on-chain calls); an additional ~28 are deployed and verified but not yet wired to app routes (planned product phases); ~10 are deprecated legacy versions. The platform utilizes a HYBRID CUSTODY model for its Complete DeFi Treasury Suite. An "Active Contract Verification System" ensures the integrity of AXUSD and PSM contract addresses. Production deployment uses Replit Autoscale (Vercel) for serverless scaling. The system includes an ERC-3643 compliant Unified AXUSD stablecoin with automated KYC, and an ERC-7726 oracle infrastructure for AXUSD pricing.

### System Design Choices
The architecture employs a "Product Factory Approach" for scalability. The current blockchain network is Arbitrum One, with a planned migration to Universe Blockchain (L3). Data is managed using PostgreSQL with Drizzle ORM and MongoDB for analytics. The backend features centralized contract configuration, a dedicated contract service, and chain validation middleware.

Key features include:
- DEX V2 Ecosystem and Institutional Observer Dashboard.
- Lending Fund (SEC Reg D 506(c)).
- Euler V2 AXUSD Lending Markets (eAXUSD-6 vault: `0xacdA87801f6409bB5157BA78aF1BD9631d6609B2`, oracle: `0xc894d1500CB1FBf8F045e87bd357A51345197c4e`, IRM: `0x13B4F093C95785a621b928A9fa31Ea7a7fAb1662`) and EulerSwap AXUSD Liquidity Layer.
- Euler Earn AXUSD Yield Aggregation Vault (Task #39, DEPLOYED 2026-03-25): earnAXUSD vault at `0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B` — single strategy (eAXUSD-6 EVK vault, 1M AXUSD cap), 10% performance fee → AxiomFeeBurner, whitelisted in LPM. Factory: `0xB9B5d62B9fE9E1B505466e75817aB178A1D2ec9d`.
- EulerSwap AXUSD Liquidity Layer (Task #40, FULLY CONFIGURED 2026-03-26): USDC/AXUSD pool at `0x0101D5adE5Ce318FE39be50E985e4fa05362a8A8` — reconfigured via `EVC.call(pool.reconfigure(dParams, initialState))` (TX `0xd6098da4cbb7edbfb21d0b125937bd6e604e7e59d00bb737243a3e65c61d9688`). Curve params: equilibriumReserve0=100 USDC, equilibriumReserve1=100 AXUSD, priceX=1e18, priceY=1e6 (ratio=1e12, correct for 18-dec AXUSD / 6-dec USDC at 1:1 peg), concentration=~0.999, fee=0.003%. Pool status=UNLOCKED (1). LPM whitelist confirmed ✓: pool is at index [10] in `LPM.getPlatforms(COMPLIANCE)` — no further admin action required. EVC, EVK vault, Earn vault, and EulerSwap pool are all listed. Factory V2: `0x138AB9B33741B25bb7BcDa466175c8B2E2b96dc4`, V1: `0x7949bE8B154D7B5ce6E75cBfc646AeF3a25970E2`.
- MIRDT Capital Intelligence Terminal (`/mirdt`): Nine-dimension advisory signal engine producing a Protocol Readiness Score (PRS, 0-10). Dimensions: Digital Commodity (CoinGecko BTC/ETH), Protocol Health (solvency payload_json CR/liquidity/policyMode), Real Asset Market (Alpha Vantage VNQ), Construction Cost (market_cost_signals), Deal Flow Velocity (re_deals), Credit Portfolio (income_credit_lines), Community Coordination (susu_purpose_groups), Model Accuracy (prediction_actual_variances), Growth Velocity (pma_applications/users). Signal Integrity Log with SHA-256 checksums. Integrates with Founder Ops as a compact PRS widget. All paper trading language removed — this is a capital intelligence advisory system, not a simulation tool.
- Axiom Sentinel: A unified capital decision and risk authorization layer.
- Founder Operations Dashboard: Internal dashboard for system overview and operations.
- Solvency and Reserve Transparency: Provides a three-mode institutional solvency console.
- Adaptive Metrics Engine (AME): A deterministic financial computation engine with an AME AI Oracle.
- The Wealth Practice: Manages community group economics with a three-stage trust pipeline.
- Physical-Digital Bridge (Land Acquisition Pipeline): Full land acquisition lifecycle with live governance.
- Property Analysis Tool: Pay-per-report property analysis tool with free, base, and premium tiers.
- Capital Accounting and Performance Intelligence System: A full-stack capital ledger.
- DeNet DePIN Node Integration: Provides decentralized storage infrastructure.
- IVCEE (Institutional Viability & Capital Efficiency Engine): An allocator-grade underwriting intelligence engine.
- Document Ingestion & Extraction: AI-powered document analysis in the Deal Intelligence workspace.
- Distressed Property Feed (Deal Flow): Aggregates distressed properties from government sources and a wholesaler submission portal.
- Agent Governance System: Policy-based autonomous agent authorization.
- Banking Infrastructure (Unit + BitGo): Unified banking layer providing FDIC-insured deposit accounts, ACH, debit cards, KYC, and institutional crypto custody, with a Bridge Service connecting fiat↔crypto.
- Multi-Exit Strategy Engine: Provides 8 underwriting strategies with comparison and ranking.
- Due Diligence Checklist System: Structured DD workflow.
- Craftsman Cost Database: `rehab_cost_benchmarks` table seeded with 57 reference costs from Craftsman National Construction Estimator (NCE).
- Cost Intelligence Engine: Production-grade rehab underwriting engine grounded in Craftsman NCE data.
- Capital Readiness Card: Computes capital analysis for funding sources.
- AI Acquisition Memo Builder: Gemini-powered institutional acquisition memo generator.
- Syndication Module: Full syndication operating system with an LP Investor Portal.
- Axiom Secondary Network V1: Permissioned secondary transfer, settlement, registry, and intelligence layer for Axiom-issued private market products with an investor portfolio, marketplace, issuer console, and admin functionalities.
- Field Capture System (Layer 5): Mobile-first walkthrough system for real-world property inspections.
- On-Chain Lending Credit Market: Production smart contracts (`AXIOMFixedLoan` and `AXIOMCreditMarket`) deployed on Arbitrum One for fixed-term loans and gated LP pools.

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