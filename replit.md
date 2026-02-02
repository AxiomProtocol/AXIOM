# AXIOM Protocol

## Overview
AXIOM Protocol is a comprehensive land-first community ownership platform built with Next.js. It enables communities to acquire, develop, and own real estate through SEC-compliant crowdfunding, SUSU-style pooling, and tokenized land options.

## Technology Stack
- **Frontend**: Next.js 14, React 18, TypeScript, TailwindCSS
- **Backend**: Node.js, Express, PostgreSQL
- **Blockchain**: Arbitrum One (Chain ID: 42161), Solidity smart contracts
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: SIWE (Sign-In With Ethereum), MetaMask SDK

## Project Structure
```
├── pages/           # Next.js pages and API routes
├── components/      # React components
├── shared/          # Shared schema and types
├── server/          # Backend server code
├── lib/             # Utility libraries
├── contracts/       # Solidity smart contracts
├── styles/          # CSS and styling
├── public/          # Static assets
└── docs/            # Documentation
```

## Key Features
- Land Acquisition System (sourcing, evaluation, tokenization)
- SEC Reg CF Crowdfunding Compliance
- SUSU Savings Circles (on-chain ROSCA)
- Governance and Voting System
- MetaMask/Web3 Wallet Integration
- KYC Verification System
- Steward Corps Training Program

## Development Commands
- `npm run dev` - Start development server on port 5000
- `npm run build` - Build for production
- `npm run db:push` - Push database schema changes
- `npm run db:studio` - Open Drizzle Studio for database management

## Database
Uses PostgreSQL with Drizzle ORM. Schema defined in `shared/schema.ts`.

## Strategic Roadmap

AXIOM Protocol is following a staged evolution strategy:

### Current Phase: Phase 0 - Stabilization
- Documenting Genesis snapshot of all deployed contracts
- Creating upgrade foundation for future migrations
- Preparing for Phase 1: Treasury Integration Layer

### Planned Phases:
1. **Phase 1: Treasury Integration** (2-3 months) - Position AXIOM as treasury infrastructure on Arbitrum One
2. **Phase 2: Modularization** (1-2 months) - Refactor contracts for L3 portability
3. **Phase 3: Universe L3 Testnet** (1-2 months) - Private L3 for internal testing
4. **Phase 4: Universe L3 Private Mainnet** (3-6 months) - Revenue generation before public launch
5. **Phase 5: Public Universe L3 Launch** - Full public launch when self-funded

See `docs/UNIVERSE_L3_ROADMAP.md` for complete strategy.

## Recent Changes
- Feb 2, 2026: **Node Operator Admin System (Production Ready)**
  - Created comprehensive admin panel at /admin/operators with stats dashboard
  - Features: view all operators, filter by status, view details, advance through phases, reject, send custom emails
  - Wallet-based admin authentication (configurable via ADMIN_WALLETS env var)
  - Email notifications via Resend for status changes (advancement, rejection, custom)
  - **Production Enhancements:**
    - Centralized admin config (lib/admin/config.ts) with env var support
    - Audit logging (admin_audit_logs table) tracks all admin actions with details
    - Rate limiting (30 requests/minute per admin wallet)
    - Audit log viewer tab displays complete admin action history
    - Bulk operations: advance up to 20 operators at once with checkbox selection
    - CSV export with filter support (all/pending/onboarding/active statuses)
  - API endpoints: /api/admin/operators (list), /api/admin/operators/[id] (details), /api/admin/operators/advance, /api/admin/operators/reject, /api/admin/operators/send-email, /api/admin/check-access, /api/admin/operators/bulk-advance, /api/admin/operators/export, /api/admin/audit-logs
  - Operator onboarding phases: APPLIED → VERIFIED → PROVISIONED → DRY_RUN_PASSED → CERTIFIED → ACTIVE
  - Fixed operator database schema with missing columns (onboarding_phase, total_milestones_completed, etc.)
  - Created node_onboarding table for tracking onboarding progress
- Feb 2, 2026: **Operator Portal Enhancement**
  - Added SiteLayout navigation to /operator page for consistent site-wide navigation
  - Created comprehensive educational content for public visitors (no wallet required)
  - Covers: Node Operator Program overview, three operator roles (Observer/Validator/Attestor), rewards structure, onboarding journey, FAQs
  - Created node_operators and operator_rewards database tables
  - Created siwe_nonces and wallet_sessions tables for SIWE authentication
- Feb 2, 2026: **Phase 0 Stabilization Complete**
  - Genesis tag created: [genesis-snapshot-2026-02-02](https://github.com/AxiomProtocol/AXIOM/releases/tag/genesis-snapshot-2026-02-02)
  - 43 contracts documented, 34 size-verified via on-chain eth_getCode
  - All contracts confirmed safe (under 24KB limit)
  - Created: GENESIS_SNAPSHOT.md, DEPLOYMENT_SIZE_AUDIT.md, CONTRACT_CLASSIFICATION.md, UPGRADE_PROXY_PLAN.md
  - Fork script ready for testnet experimentation
- Feb 2, 2026: Strategic roadmap created for Universe L3 launch
  - Created `docs/UNIVERSE_L3_ROADMAP.md` with staged deployment strategy
  - Fixed deployment configuration for production
- Feb 2, 2026: Database repairs and API endpoint creation
  - Created missing database tables: dao_grants, treasuries, treasury_transactions, governance_proposals, dscr_applications, insurance_claims, insurance_policies
  - Created missing API endpoints: /api/lending-fund/stats, /api/dscr/stats, /api/staking/stats, /api/insurance/stats
  - Fixed treasury/stats endpoint with correct table references
- Feb 1, 2026: Initial setup from GitHub repository
- Database schema synced with PostgreSQL
- Development server configured on port 5000

## User Preferences
- Staged deployments without breaking production
- Internal-first approach before public launches
- Revenue generation to fund expansion
- Block format with copy buttons for external content
- **Deployment settings are defined in `docs/DEPLOYMENT_SOP.md` - NEVER deviate from these settings**

## Deployment Reference
See `docs/DEPLOYMENT_SOP.md` for:
- Required environment variables
- Build and run commands
- Admin wallet configuration
- Pre/post deployment checklists
