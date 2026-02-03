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
- Feb 3, 2026: **Deployment Fix: MODULE_NOT_FOUND Resolution**
  - Removed `output: 'standalone'` from next.config.js
  - Removed legacy build scripts (build:deploy, build:deploy:clean, prebuild:deploy) that deleted .next/server
  - Simplified to standard `next build` and `next start -p 5000`
  - Root cause: Legacy scripts were deleting critical Next.js modules like response-cache
  - See docs/DEPLOYMENT_SOP.md Troubleshooting section for full details
- Feb 3, 2026: **Step 3: Credits Ledger System Complete**
  - Database tables: credits_ledger, credits_transactions, onchain_rewards_sync (schema in shared/schema.ts)
  - Operator API: GET /api/operator/credits, POST /api/operator/credits (claim credits)
  - Admin API: GET /api/admin/credits, POST accrue/adjust/sync endpoints
  - All endpoints use raw SQL via pool connection for consistency with existing codebase patterns
  - Admin authentication via x-admin-wallet header with isAdminWallet() validation
  - Credits tab UI added to operator portal (between "rewards" and "network" tabs)
  - Integration tests: 28/28 passing in tests/credits-ledger.test.ts
  - Documentation updated: docs/observation-mode/test-results.md
- Feb 2, 2026: **Node Economy Dashboard & Operator Tools**
  - Created NodeEconomyDashboard component (components/observer/NodeEconomyDashboard.tsx)
  - Displays real-time on-chain data: node counts by class, epoch/rewards info, stake requirements, slashing parameters
  - Auto-refresh every 30 seconds with live countdown timer for next epoch
  - Added "Network" tab to operator portal (/operator) - accessible without wallet connection
  - Integration tests for Node Economy ABIs (tests/node-economy-abi.test.ts, 25 tests passing)
  - Contract addresses linked to Blockscout for transparency
- Feb 2, 2026: **Technical Debt Resolution Complete**
  - Validated ABIs against actual contract artifacts in archive/
  - Replaced non-existent functions (operatorToNode → getNodesByOperator, getClaimedRewards → calculateNodeReward)
  - Added node_chain_sync table and on_chain_node_id column to schema
  - Consolidated API to use NodeEconomyService singleton (reduced duplication)
  - All changes reviewed and verified working with live on-chain data
- Feb 2, 2026: **Step 2: On-Chain Contracts Integration Complete**
  - Integrated NodeRegistry, NodeRewards, SlashingEngine contracts at verified addresses
  - Created lib/contracts/node-economy/ service layer with TypeScript clients
  - Refactored API to use centralized config (getArbitrumRpcUrl, NODE_ECONOMY_CONTRACTS)
  - Distinguished ON_CHAIN_NODE_CLASSES (Storage/Execution/Indexing/Research) from OPERATOR_ROLES (Observer/Validator/Attestor)
  - Updated docs/deployments.md with Node Economy contracts section
  - API tested with live on-chain data returning correct contract state
- Feb 2, 2026: **Step 1: Node Operator Blueprint Documentation Complete**
  - Created docs/node-operator/ directory with comprehensive blueprint
  - architecture.md - System architecture with component diagram
  - workflow.md - Operator lifecycle state machine and transitions
  - data-model.md - Database schema and API contracts
  - on-chain-spec.md - Smart contract specifications for Step 2
  - All specs derived from existing UI, APIs, and archived contract artifacts
- Feb 2, 2026: **Step 0: Repo Discovery and Inventory Complete**
  - Created docs/deployments.md - canonical table of 43 deployed contracts
  - Created docs/contract-registry.md - tier classification (Core/Product/Utility/Legacy)
  - Created docs/current-roles-and-permissions.md - role holders and permissions
  - All docs sourced from GENESIS_SNAPSHOT.md and CONTRACT_CLASSIFICATION.md
- Feb 2, 2026: **Wallet Connectivity SOP Documented**
  - Fixed SIWE nonce 500 error by adding drizzle-orm to outputFileTracingIncludes
  - Added comprehensive Wallet Connectivity section to DEPLOYMENT_SOP.md
  - Documents critical build configuration, environment variables, connection flow, and troubleshooting
- Feb 2, 2026: **Multi-Role Node Operator Support**
  - Operators can now select and hold all 3 roles simultaneously (Observer, Validator, Attestor)
  - Added `roles` jsonb column to node_operators table
  - Updated application form with multi-select checkboxes for roles
  - "Full Operator Mode" indicator when all 3 roles selected
  - Certificate displays all assigned roles
  - Certificate modal shows multiple roles properly formatted
  - Print certificate function supports multi-role display
  - Per Node Charter: Roles are hierarchical (Attestor includes Validator includes Observer capabilities)
  - Dual attestation requirements still enforced (different Attestors required)
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
- **Test Results**: Always update `docs/observation-mode/test-results.md` when adding new tests or verifying components

## Deployment Reference
See `docs/DEPLOYMENT_SOP.md` for:
- Required environment variables
- Build and run commands
- Admin wallet configuration
- Pre/post deployment checklists
