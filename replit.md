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

## Recent Changes
- Feb 2, 2026: Database repairs and API endpoint creation
  - Created missing database tables: dao_grants, treasuries, treasury_transactions, governance_proposals, dscr_applications, insurance_claims, insurance_policies
  - Created missing API endpoints: /api/lending-fund/stats, /api/dscr/stats, /api/staking/stats, /api/insurance/stats
  - Fixed treasury/stats endpoint with correct table references
- Feb 1, 2026: Initial setup from GitHub repository
- Database schema synced with PostgreSQL
- Development server configured on port 5000

## User Preferences
- None specified yet
