# AXIOM Protocol

## Overview
AXIOM Protocol is a land-first community ownership platform built with Next.js. It enables communities to acquire, develop, and own real estate through SEC-compliant crowdfunding, SUSU-style pooling, and tokenized land options. The project aims to position AXIOM as treasury infrastructure on Arbitrum One and evolve towards a self-funded, public Universe L3 launch.

## User Preferences
- Staged deployments without breaking production
- Internal-first approach before public launches
- Revenue generation to fund expansion
- Block format with copy buttons for external content
- Deployment settings are defined in `docs/DEPLOYMENT_SOP.md` - NEVER deviate from these settings
- Test Results: Always update `docs/observation-mode/test-results.md` when adding new tests or verifying components

## System Architecture
The platform is built with Next.js 14, React 18, TypeScript, and TailwindCSS for the frontend, and Node.js with Express for the backend. It utilizes PostgreSQL with Drizzle ORM for database management. Blockchain integration is handled via Solidity smart contracts on Arbitrum One, with authentication managed by SIWE (Sign-In With Ethereum) and MetaMask SDK.

Key features include:
- A Land Acquisition System covering sourcing, evaluation, and tokenization.
- SEC Reg CF Crowdfunding Compliance.
- SUSU Savings Circles (on-chain ROSCA).
- A robust Governance and Voting System.
- Web3 Wallet Integration (MetaMask).
- KYC Verification System.
- A Steward Corps Training Program.
- A comprehensive Node Operator Admin System with multi-role support, audit logging, rate limiting, and email notifications.
- A Credits Ledger System for managing operator credits and transactions.
- A Readiness Gate System with on-chain checks for observation period, uptime, incidents, and TVL thresholds.
- A Note Portal for managing private credit notes, payment events, covenants, and documents.
- An institutional-grade whitepaper covering protocol architecture, tokenomics, governance, and more.

The project follows a staged evolution strategy, starting with stabilization (Phase 0) and moving through Treasury Integration (Phase 1), Modularization (Phase 2), Universe L3 Testnet (Phase 3), Universe L3 Private Mainnet (Phase 4), and finally Public Universe L3 Launch (Phase 5). The architecture emphasizes multi-chain gold integration, positioning Arbitrum One as the primary financial brain.

## External Dependencies
- **Blockchain Network**: Arbitrum One (Chain ID: 42161)
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: Sign-In With Ethereum (SIWE), MetaMask SDK
- **Email Service**: Resend (for notifications)
- **Gold Tokens**: PAXG (primary), XAUT (secondary) - for multi-chain gold integration strategy