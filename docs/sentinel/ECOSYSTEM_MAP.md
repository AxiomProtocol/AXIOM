# Axiom Sentinel — Ecosystem Map

Generated: 2026-02-09

## Apps and Entry Points

| Component | Type | Path |
|-----------|------|------|
| Main Application | Next.js Pages Router | / |
| Standalone Build | next build → .next/standalone | Autoscale deployment |
| Health Check | Pages API | /api/health |
| Static Health | Pages SSG | /healthz |

## API Routes

### Auth
- POST /api/auth/siwe/nonce
- POST /api/auth/siwe/verify
- GET /api/auth/siwe/session
- POST /api/auth/siwe/logout

### Sentinel (NEW)
- GET /api/sentinel/health
- GET /api/sentinel/overview
- GET /api/sentinel/signals
- GET /api/sentinel/decisions
- GET /api/sentinel/regimes
- GET /api/sentinel/audit
- POST /api/sentinel/run-signals
- POST /api/sentinel/qualify
- POST /api/sentinel/allocate
- POST /api/sentinel/authorize

### MIRDT (Intelligence Terminal)
- GET /api/mirdt/setups
- GET /api/mirdt/[id]
- POST /api/mirdt/run-scan
- POST /api/mirdt/mark-expired
- POST /api/mirdt/paper-trades

### Observer (Institutional)
- GET /api/observer/overview
- GET /api/observer/treasury
- GET /api/observer/assets
- GET /api/observer/risk
- GET /api/observer/governance
- GET /api/observer/node-economy
- GET /api/observer/capital-bridge
- GET /api/observer/lock-readiness
- GET /api/observer/reports
- GET /api/observer/export
- GET /api/observer/nodes/[id]

### Pilot (Capital Program)
- GET/POST /api/pilot
- GET/POST /api/pilot/spvs
- GET/POST /api/pilot/investors
- GET/POST /api/pilot/capital-calls
- GET/POST /api/pilot/distributions
- GET /api/pilot/documents
- GET /api/pilot/projections
- GET /api/pilot/benchmarks
- GET /api/pilot/reports
- GET /api/pilot/audit
- GET /api/pilot/expansion-gate
- GET /api/pilot/notifications

### AXUSD (Stablecoin)
- GET /api/axusd/peg-status
- GET /api/axusd/supply
- GET /api/axusd/treasury-health
- GET /api/axusd/pools
- GET /api/axusd/history
- GET /api/axusd/alerts
- GET /api/axusd/bridge
- GET /api/axusd/incentives
- GET /api/axusd/liquidity
- GET /api/axusd/lp-analytics
- GET /api/axusd/psm

### Other
- GET /api/euler/vault-stats
- GET /api/impact/metrics
- GET /api/realestate/fund-stats
- POST /api/realestate/loan-application
- GET /api/realestate/risk-params
- GET /api/transparency/treasury
- POST /api/contact
- POST /api/early-access
- POST /api/sms-subscribe
- GET /api/roadmap

## Database Schema Summary

PostgreSQL (Neon-backed) via Drizzle ORM — 176+ tables

### Sentinel Tables (NEW)
- sentinel_signals — Trading signals with direction, entry zones, probability scores
- sentinel_decisions — Authorization decisions with hash chain (logHash, prevHash)
- sentinel_trades — Paper trading with PnL tracking
- sentinel_calibration_runs — Model calibration metrics
- sentinel_regime_snapshots — Market regime captures
- sentinel_audit_log — Immutable audit trail with hash chain

### Core Domain Tables
- users, user_roles, user_xp_levels
- pilot_spvs, pilot_investors, pilot_capital_calls, pilot_distributions
- mirdt_setups, mirdt_data_snapshots, mirdt_paper_trades
- investment_commitments, investment_accounts, investment_ledger
- treasuries, treasury_transactions
- axusd_snapshots, axusd_alerts, axusd_trading_pools
- governance_proposals, governance_votes
- node_operators, operator_rewards
- dscr_applications, dscr_properties, dscr_borrowers

## Onchain Contracts

### Arbitrum One — Verified Contracts
| Contract | Address | Purpose |
|----------|---------|---------|
| AXM Token | 0x53e79F3a8e60eB0a6bE88B60f3c95Bc7b22C5A54 | Governance token |
| DEX Router | server/abis/dex/AxiomDEXRouter.json | Swap routing |
| Exchange Hub V2 | server/abis/dex/AxiomExchangeHubV2.json | Order execution |
| LP Staking | server/abis/dex/AxiomLPStaking.json | Liquidity mining |
| Fee Distributor | server/abis/dex/AxiomFeeDistributor.json | Fee routing |
| Insurance Fund | server/abis/dex/AxiomInsuranceFund.json | Risk reserves |
| DEX Governor | server/abis/dex/AxiomDEXGovernor.json | Governance |
| Limit Orders | server/abis/dex/AxiomLimitOrders.json | Limit order book |
| Oracle Adapter | server/abis/dex/AxiomOracleAdapter.json | Price feeds |
| Trading Rewards | server/abis/dex/AxiomTradingRewards.json | Incentives |
| DEX Analytics | server/abis/dex/AxiomDEXAnalytics.json | Analytics |

### External Protocol Integrations
- Euler Finance — Vault lending markets
- Morpho Blue — Lending protocol
- Chainlink — Price feeds (ETH, USDC, USDT, DAI, WBTC, ARB, LINK)
- Camelot — DEX liquidity pools

### Hardhat Configurations
- hardhat.config.ts — Main config
- hardhat.config.dex.ts — DEX contracts
- hardhat.config.capital-bridge.ts — Bridge contracts

## Capital Action Surfaces

| Surface | Location | Actions | Sentinel Gating |
|---------|----------|---------|-----------------|
| DEX Router | DexService.ts | swap, addLiquidity, removeLiquidity | REQUIRED |
| LP Staking | DexService.ts | deposit, withdraw | REQUIRED |
| Euler Vaults | EulerVaultService.ts | deposit, withdraw, approve | REQUIRED |
| Morpho Markets | MorphoMarketService.ts | borrow, repay, withdraw | REQUIRED |
| Treasury | InstitutionalTreasuryService.ts | fund allocation, transfers | REQUIRED |
| Insurance Fund | AxiomInsuranceFund | fund management | REQUIRED |
| Fee Distribution | AxiomFeeDistributor | fee routing | REQUIRED |
| Token Operations | AXM ERC20 | mint, burn, transfer | REQUIRED |
| Capital Bridge | capital-bridge config | cross-chain transfers | REQUIRED |
| Parameter Changes | Governor, configs | risk params, oracles | REQUIRED |

## Current Auth Model

- SIWE (Sign-In With Ethereum) for wallet authentication
- ADMIN_WALLETS environment variable for admin access
- API scan key (MIRDT_SCAN_KEY) for internal endpoints
- Feature flags gate external fund flows (observation mode)
- No unified authorization layer for capital actions (gap)

## Current Logging and Observability

- Console logging in API routes
- No structured audit trail (gap — now addressed by Sentinel)
- No hash-chained decision logging (gap — now addressed by Sentinel)
- No regime classification or systematic risk assessment (gap — now addressed by Sentinel)

## Gaps and Risks

1. **No centralized capital decision authority** → Sentinel addresses this
2. **No signed authorization decisions** → AuthorizationService now provides this
3. **No onchain permission gating** → Phase 6 (PermissionManager contract)
4. **No audit hash chain** → AuditLogger now provides this
5. **MIRDT generates signals but nothing gates capital** → run-signals pipeline now converts MIRDT → Sentinel signals
6. **No regime-aware risk management** → RegimeEngine now classifies market environment
7. **No calibrated confidence scores** → ConfidenceCalibrator now provides Platt scaling
