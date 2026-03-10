Axiom Financial OS Capability Map

Document Type: Strategic Capability Blueprint
Version: 1.0
Date: March 10, 2026
Classification: Internal Operating Document


OVERVIEW

This document defines the full capability surface of the Axiom Financial OS. It is the authoritative reference for what the platform is designed to become. It is not an execution schedule. Execution sequencing, gating, and dependency management are handled in separate planning documents.

Each capability is assigned a stable identifier (T001-T049) and classified by functional domain. These identifiers are reused across all planning documents for traceability.


CAPABILITY DOMAINS


Domain 1: Platform Infrastructure

These capabilities establish the foundational technical systems upon which all other capabilities depend.

T001 - Wallet Connection Upgrade (Wagmi + RainbowKit)
  Multi-wallet support replacing single-provider MetaMask integration.
  Enables MetaMask, Coinbase Wallet, WalletConnect, and injected wallets.

T002 - Arbitrum SDK Integration
  Structured on-chain interaction layer with gas estimation and cross-chain message tracking.

T004 - Error Monitoring (Sentry)
  Centralized error capture across client and server environments.

T008 - Automated Test Suite
  Unit and integration tests for API endpoints, underwriting engine, and financial computations.

T010 - API Rate Limiting
  Tiered rate limiting middleware applied consistently across all API routes.

T011 - Cache Standardization
  Unified caching layer for all external API dependencies with appropriate TTLs and observability.

T014 - Mobile PWA Hardening
  Service worker, offline fallback, and installability for mobile-first access.


Domain 2: Blockchain and Network Infrastructure

T005 - Universe L3 Preparation
  Arbitrum Orbit chain definition, bridge configuration, and feature-flagged activation.

T007 - Token Bridge
  Cross-chain bridge interface for AXM, AXUSD, and ETH with feature-gated execution.

T046 - Cross-Chain Settlement Protocol
  Multi-hop settlement engine for moving AXUSD across chains and into fiat.

T049 - Hardware Node Program (DePIN)
  Physical node operator program for Universe L3 validators, storage, and observers.


Domain 3: Governance and Operations

T009 - Notification Center
  Unified notification system with categories, read tracking, and system event integration.

T013 - Governance Dashboard
  Proposal lifecycle, voting, delegation, and vote history.

T033 - Multi-Sig Treasury Workflow
  Formalized treasury proposal, multi-party approval, and execution audit trail.

T037 - Autonomous Financial Agents
  Policy-authorized agent runtime with budget management and Sentinel integration.


Domain 4: Capital Deployment and Asset Execution

T006 - Fund Distribution
  Weighted distribution calculation from cap table with batch generation and history.

T012 - Investor Portal (LP Dashboard)
  Unified portfolio view for investors showing subscriptions, distributions, and documents.

T018 - Loan Servicing Engine
  Amortization, payment waterfall, late fees, and default escalation.

T019 - Credit Bureau Reporting
  Metro 2 format generation for bureau submission from loan data.

T020 - Peer-to-Peer Lending Marketplace
  Deal-level lending participation with funding tracking.

T022 - Yield Aggregation Dashboard
  Unified yield view across staking, lending, LP, distributions, and savings.

T038 - Property Lifecycle Management
  Post-acquisition property operations including tenants, leases, rent collection, and maintenance.

T039 - Disposition and Exit Management
  Sale tracking, 1031 exchange timelines, and investor exit waterfall calculations.


Domain 5: Data and Intelligence

T003 - L2 Ecosystem Data APIs
  External data aggregation from DefiLlama, L2Beat, and GrowThePie.

T034 - Economic Dashboard
  Protocol-level economic metrics including TVL, velocity, lending volume, and revenue.

T035 - On-Chain Analytics
  Wallet growth, token distribution, governance participation, and DEX activity.

T048 - Stablecoin Settlement Network Dashboard
  AXUSD network health metrics including supply, velocity, and settlement volume.


Domain 6: Consumer Financial Products

T015 - Fiat On-Ramp
  Third-party widget integration for fiat-to-crypto purchases on Arbitrum.

T016 - Multi-Currency Settlement
  FX rate service with local currency display and user preferences.

T017 - Payment Scheduling
  Recurring contribution management with reminders and Wealth Practice integration.

T021 - Structured Savings Products
  Fixed-term deposits, goal-based savings, and round-up savings.

T024 - Emergency Fund Automation
  Auto-routing to emergency reserves with milestone tracking.

T025 - Peer-to-Peer AXUSD Payments
  Person-to-person transfers, payment requests, QR codes, and contacts.

T026 - Merchant Payment Rails
  Merchant onboarding, payment links, embeddable buttons, and fee collection.

T027 - Bill Pay
  Payee management, scheduled payments, and recurring bill automation.


Domain 7: Insurance and Protection

T023 - Parametric Insurance Products
  Smart contract coverage, rent guarantee, and weather-triggered property insurance.


Domain 8: Identity and Compliance

T028 - Multi-Jurisdiction Compliance Engine
  Per-jurisdiction rules, KYC tiers, transaction limits, and withholding rates.

T032 - Regulatory Reporting Engine
  SAR, CTR, K-1, and periodic compliance report generation.

T036 - Sovereign Identity Passport
  Unified identity system with tiers, trust scoring, and portable credentials.

T041 - Reputation and Achievement System
  Soulbound token achievements across 7 categories with progress tracking.


Domain 9: Global Expansion

T029 - Localization (Multi-Language)
  5-language support with locale routing and translation infrastructure.

T030 - Regional Wealth Practice Hubs
  Culturally-adapted group economics templates for 5 regional models.

T044 - Remittance Corridors
  International money transfer via AXUSD with 5 initial corridors.


Domain 10: Institutional Services

T031 - Developer API Platform
  API key management, webhooks, and interactive documentation.

T045 - Institutional Liquidity Network
  White-label infrastructure for community banks, CDFIs, and credit unions.

T047 - Treasury-as-a-Service
  Packaged AME policy engine and solvency monitoring for external protocols.


Domain 11: Social and Network

T040 - Protocol Activity Feed
  Protocol-wide activity stream with aggregate events and privacy protection.

T042 - Community Deal Rooms and Messaging
  In-app messaging for deal rooms, group chats, governance threads, and direct messages.

T043 - Referral and Network Growth Engine
  Referral codes, milestone-based rewards, and leaderboard.


CAPABILITY COUNT SUMMARY

  Total capabilities: 49
  Infrastructure: 7
  Blockchain/Network: 4
  Governance/Operations: 4
  Capital/Asset Execution: 8
  Data/Intelligence: 4
  Consumer Financial: 7
  Insurance: 1
  Identity/Compliance: 4
  Global Expansion: 3
  Institutional Services: 3
  Social/Network: 3

This map is the authoritative inventory. All execution planning references these identifiers.
