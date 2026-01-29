# Executive Summary: AXUSD Lending Markets on Euler V2

**Document Version:** 1.0.0  
**Date:** January 29, 2026  
**Network:** Arbitrum One (Chain ID: 42161)  
**Status:** LIVE - Governance Observation Window (Ends March 26, 2026)

---

## Table of Contents

1. [Strategic Overview](#strategic-overview)
2. [Market Opportunity](#market-opportunity)
3. [Technical Architecture](#technical-architecture)
4. [Smart Contract Infrastructure](#smart-contract-infrastructure)
5. [Revenue Model & Fee Configuration](#revenue-model--fee-configuration)
6. [Risk Management Framework](#risk-management-framework)
7. [Governance Structure](#governance-structure)
8. [Integration Points](#integration-points)
9. [Roadmap & Milestones](#roadmap--milestones)
10. [Key Metrics & Monitoring](#key-metrics--monitoring)

---

## Strategic Overview

### Mission Statement

Deploy institutional-grade lending markets for AXUSD on Euler V2 to establish external liquidity pathways without deploying treasury capital during the governance observation window. This strategy positions Axiom Protocol to attract external liquidity providers seeking yield while enabling borrowers to leverage Real World Asset (RWA) collateral.

### Key Strategic Objectives

| Objective | Description | Status |
|-----------|-------------|--------|
| **External Liquidity Attraction** | Enable external LPs to earn yield on AXUSD deposits | Active |
| **Protocol Revenue Generation** | Collect 10% interest spread for protocol sustainability | Configured |
| **Institutional Credibility** | Leverage Euler V2's audited infrastructure | Operational |
| **Zero Treasury Deployment** | No protocol capital at risk during observation | Maintained |
| **Governance Transparency** | Full on-chain governance with audit trail | Implemented |

### Why Euler V2?

Euler V2 represents the next generation of modular lending infrastructure, offering:

- **Permissionless Vault Creation**: Deploy custom lending markets without protocol approval
- **Flexible Collateral Configuration**: Support multiple collateral types with granular LTV settings
- **Euler Vault Kit (EVK)**: Standardized vault architecture with proven security
- **Institutional Adoption**: Growing ecosystem of serious DeFi participants
- **Cross-Vault Composability**: Integrate with broader Euler ecosystem

---

## Market Opportunity

### Target User Segments

#### Liquidity Providers (LPs)
- **Profile**: Yield-seeking capital allocators, institutional treasuries, DeFi yield optimizers
- **Value Proposition**: Earn yield on AXUSD deposits backed by diversified collateral
- **Expected Behavior**: Long-term deposits seeking stable, predictable returns

#### Borrowers
- **Profile**: RWA holders, real estate investors, treasury managers
- **Value Proposition**: Access liquidity without selling underlying assets
- **Expected Behavior**: Collateralized borrowing against USDC, USDT, WETH, ARB

### Competitive Positioning

| Feature | Axiom AXUSD Vault | Traditional DeFi Lending |
|---------|-------------------|-------------------------|
| **Collateral Types** | Stablecoins + Blue-Chip Crypto | Typically crypto-only |
| **RWA Integration Path** | Built-in architecture | Requires custom development |
| **Fee Transparency** | On-chain, auditable | Variable |
| **Governance** | Community-controlled | Often centralized |
| **Regulatory Alignment** | SEC Reg D 506(c) framework | Often unregulated |

### External-First Adoption Strategy

Given the absence of an existing community base, the strategy prioritizes:

1. **Institutional Treasury Adoption**: Target external protocol treasuries seeking diversified yield
2. **Yield Aggregator Integration**: Partner with yield optimizers (Yearn, Beefy, etc.)
3. **Cross-Protocol Liquidity**: Attract capital from Euler V2 ecosystem participants
4. **DeFi Native Marketing**: Focus on metrics, APY, and risk-adjusted returns

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AXUSD Lending Ecosystem                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────┐ │
│  │   Liquidity     │    │   AXUSD Vault   │    │     Borrowers       │ │
│  │   Providers     │───▶│   (Euler V2)    │◀───│                     │ │
│  │                 │    │                 │    │                     │ │
│  │  Deposit AXUSD  │    │  0xCf00...429   │    │  Collateralize +    │ │
│  │  Earn Yield     │    │                 │    │  Borrow AXUSD       │ │
│  └─────────────────┘    └────────┬────────┘    └─────────────────────┘ │
│                                  │                                      │
│                                  │ 10% Interest Fee                     │
│                                  ▼                                      │
│                    ┌─────────────────────────────┐                      │
│                    │    AXUSDRevenueRouter       │                      │
│                    │    0x39A9...30a             │                      │
│                    └─────────────┬───────────────┘                      │
│                                  │                                      │
│              ┌───────────────────┼───────────────────┐                  │
│              ▼                   ▼                   ▼                  │
│    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐         │
│    │  SEED Yield     │ │   Treasury      │ │   Backstop      │         │
│    │  Distributor    │ │                 │ │   Vault         │         │
│    └─────────────────┘ └─────────────────┘ └─────────────────┘         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Collateral Vault Architecture

The AXUSD Lending Vault supports four collateral types, each with calibrated risk parameters:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Collateral Vaults                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐    ┌─────────────────┐                            │
│  │   USDC Vault    │    │   USDT Vault    │                            │
│  │   0x0a1e...899  │    │   0x3751...D51  │                            │
│  │   LTV: 90/95%   │    │   LTV: 90/95%   │                            │
│  │   (Borrow/Liq)  │    │   (Borrow/Liq)  │                            │
│  └─────────────────┘    └─────────────────┘                            │
│                                                                         │
│  ┌─────────────────┐    ┌─────────────────┐                            │
│  │   WETH Vault    │    │   ARB Vault     │                            │
│  │   0x78E3...dFF  │    │   0x7eD8...E8B9 │                            │
│  │   LTV: 80/85%   │    │   LTV: 70/75%   │                            │
│  │   (Borrow/Liq)  │    │   (Borrow/Liq)  │                            │
│  └─────────────────┘    └─────────────────┘                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### API Infrastructure

The integration includes a comprehensive API layer for real-time vault monitoring:

| Endpoint | Purpose | Data Provided |
|----------|---------|---------------|
| `/api/euler/vault-stats` | Vault metrics & fee configuration | TVL, APY, utilization, fee status |
| `/api/euler/user-position` | User-specific data | Shares, assets, position value |
| `/api/euler/collateral` | Collateral configuration | LTV ratios, vault addresses |

---

## Smart Contract Infrastructure

### Deployed Contracts (Arbitrum One Mainnet)

| Contract | Address | Purpose | Verified |
|----------|---------|---------|----------|
| **AXUSD Lending Vault** | `0xCf00A6FA6f5bAc1f224Cee029DacF3b8CCC79429` | Core lending vault | Yes |
| **AxiomVaultGovernorV2** | `0xE742Ee9b946043ecc75bFc71B47216C1f8248316` | Vault governance controller | Yes |
| **Price Oracle** | `0x1045B6c70AC7b491bf724B5Aa4D89F542D955E15` | Collateral price feeds | Yes |
| **AXUSDRevenueRouter** | `0x39A9Ca593d350450d93aF7F24dC1A682df47F30a` | Fee routing & distribution | Yes |
| **AXUSD Token** | `0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c` | Underlying asset | Yes |

### Collateral Vault Contracts

| Collateral | Vault Address | Borrow LTV | Liquidation LTV |
|------------|---------------|------------|-----------------|
| **USDC** | `0x0a1eCC5Fe8C9be3C809844fcBe615B46A869b899` | 90% | 95% |
| **USDT** | `0x37512F45B4ba8808910632323b73783Ca938CD51` | 90% | 95% |
| **WETH** | `0x78E3E051D32157AACD550fBB78458762d8f7edFF` | 80% | 85% |
| **ARB** | `0x7eD866D2D66c3149FaFE854C30C68a8BA7ceE8B9` | 70% | 75% |

### Contract Interaction Patterns

#### Governance Actions (CRITICAL)

All governance actions must route through the `AxiomVaultGovernorV2` contract. Direct calls to the vault will fail.

```typescript
// CORRECT: Route through Governor
const governor = new ethers.Contract(GOVERNOR_ADDRESS, governorAbi, wallet);
const vaultCalldata = vaultInterface.encodeFunctionData('setFeeReceiver', [newReceiver]);
await governor.executeCall(VAULT_ADDRESS, vaultCalldata);

// WRONG: Direct vault call (WILL FAIL)
// await vault.setFeeReceiver(newReceiver);  // Access control error
```

#### User Interactions

```typescript
// Deposit AXUSD (User)
await axusd.approve(vaultAddress, amount);
await vault.deposit(amount, userAddress);

// Borrow against collateral
await collateralVault.depositCollateral(collateralAmount);
await vault.borrow(borrowAmount, userAddress);
```

---

## Revenue Model & Fee Configuration

### Fee Structure

| Parameter | Value | Description |
|-----------|-------|-------------|
| **Interest Fee** | 10% (1000 bps) | Percentage of borrower interest captured |
| **Fee Receiver** | Revenue Router | `0x39A9Ca593d350450d93aF7F24dC1A682df47F30a` |
| **LP Share** | 90% | Percentage of interest paid to liquidity providers |

### Revenue Flow

```
Borrower Interest Payment (100%)
         │
         ├──────────────────────────────────────────┐
         │                                          │
         ▼                                          ▼
  Liquidity Providers (90%)              AXUSDRevenueRouter (10%)
         │                                          │
         │                    ┌─────────────────────┼─────────────────────┐
         │                    │                     │                     │
         │                    ▼                     ▼                     ▼
         │             SEED Yield              Treasury              Backstop
         │             Distributor                                    Vault
         │                    │                     │                     │
         │                    │                     │                     │
         ▼                    ▼                     ▼                     ▼
   Yield to LPs         AXM Staker            Protocol            Insurance
                        Rewards              Operations              Fund
```

### Revenue Projections

Based on the 10% interest spread configuration:

| Total Value Locked | Est. Annual Borrow Interest | Protocol Revenue (10%) | Monthly Revenue |
|--------------------|----------------------------|------------------------|-----------------|
| $100,000 | $8,000 | $800 | $67 |
| $500,000 | $40,000 | $4,000 | $333 |
| $1,000,000 | $80,000 | $8,000 | $667 |
| $5,000,000 | $400,000 | $40,000 | $3,333 |
| $10,000,000 | $800,000 | $80,000 | $6,667 |

*Assumptions: 8% average borrow APY, 50% utilization rate*

### Governance Transaction Record

| Proposal ID | Action | Status | Transaction Hash |
|-------------|--------|--------|------------------|
| AXM-GOV-002 | Set Fee Recipient to Revenue Router | EXECUTED | [`0x2dba6cd2...`](https://arbiscan.io/tx/0x2dba6cd2be8d3378974e51086ffb06f507f28df2381aa7265e0f90cf6f4e1a08) |

---

## Risk Management Framework

### Conservative Parameter Strategy

During the governance observation window (ending March 26, 2026), conservative parameters are maintained:

| Parameter | Current Setting | Rationale |
|-----------|-----------------|-----------|
| **USDC/USDT LTV** | 90/95% | Stablecoins carry minimal volatility risk |
| **WETH LTV** | 80/85% | Blue-chip but volatile; moderate buffer |
| **ARB LTV** | 70/75% | Higher volatility; significant safety margin |
| **Borrow Cap** | 500,000 AXUSD | Limited exposure during observation |
| **Supply Cap** | Unlimited | Allow organic liquidity growth |

### Risk Categories & Mitigations

#### Smart Contract Risk
- **Mitigation**: Euler V2 is audited by Trail of Bits, Spearbit, and others
- **Monitoring**: Real-time contract event tracking via API
- **Response**: Governance can pause operations if anomalies detected

#### Collateral Risk
- **Mitigation**: Conservative LTV ratios with liquidation buffers
- **Monitoring**: Price oracle health checks
- **Response**: Automatic liquidations via Euler infrastructure

#### Liquidity Risk
- **Mitigation**: No protocol capital deployed; LP risk only
- **Monitoring**: Utilization rate tracking
- **Response**: Interest rate model adjusts dynamically

#### Governance Risk
- **Mitigation**: Multi-sig requirements, timelock delays
- **Monitoring**: All governance actions logged on-chain
- **Response**: Community can vote on parameter changes

### Data Quality Monitoring

The vault-stats API includes data quality indicators:

```json
{
  "feeConfiguration": {
    "dataQuality": "COMPLETE",
    "status": {
      "feeRoutingStatus": "CONFIGURED_REVENUE_ROUTER"
    }
  },
  "warnings": null
}
```

| Data Quality Status | Meaning |
|---------------------|---------|
| `COMPLETE` | All RPC calls successful, data reliable |
| `PARTIAL_DATA` | Some calls failed, warnings included |
| `DATA_FETCH_ERROR` | Critical data unavailable |

---

## Governance Structure

### Access Control Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Governance Hierarchy                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                    ┌─────────────────────┐                              │
│                    │   GovernanceHub     │                              │
│                    │   (24h Timelock)    │                              │
│                    │   0x52Dc...530E     │                              │
│                    └──────────┬──────────┘                              │
│                               │                                         │
│                               │ Authorized Caller                       │
│                               ▼                                         │
│                    ┌─────────────────────┐                              │
│                    │ AxiomVaultGovernorV2│                              │
│                    │   0xE742...8316     │                              │
│                    └──────────┬──────────┘                              │
│                               │                                         │
│                               │ executeCall()                           │
│                               ▼                                         │
│                    ┌─────────────────────┐                              │
│                    │   AXUSD Vault       │                              │
│                    │   0xCf00...9429     │                              │
│                    └─────────────────────┘                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Governance Capabilities

| Action | Required Path | Timelock |
|--------|---------------|----------|
| Set Fee Receiver | Governor.executeCall() | None (Governor-only) |
| Adjust LTV Parameters | GovernanceHub → Governor | 24 hours |
| Modify Interest Rate Model | GovernanceHub → Governor | 24 hours |
| Emergency Pause | Governor (direct) | None |
| Unpause | GovernanceHub → Governor | 24 hours |

### Governance Documentation

All governance actions are documented in `/docs/governance/`:

- `AXM-GOV-001-*`: Reserved for future proposals
- `AXM-GOV-002-euler-vault-fee-recipient.md`: Fee recipient configuration (EXECUTED)
- `AXM-GOV-003-*`: Reserved for future proposals

---

## Integration Points

### Frontend Integration

The Euler V2 lending markets are integrated into the Axiom platform at multiple touchpoints:

| Page | Integration | Description |
|------|-------------|-------------|
| `/earn` | Earn Tab | Display AXUSD vault APY alongside other yield opportunities |
| `/borrow` | Borrow Page | Enable collateralized borrowing interface |
| `/dex` | DEX Earn Tab | Show vault stats in trading interface |
| `/yield-vault` | Yield Vault Page | Dedicated vault management UI |
| `/dashboard` | Dashboard Widget | Position overview and quick actions |

### External Integrations

| Integration | Status | Purpose |
|-------------|--------|---------|
| **Euler V2 App** | Live | Direct vault access via Euler interface |
| **DeFiLlama** | Pending | TVL tracking and yield aggregation |
| **Yield Aggregators** | Planned | Automated yield optimization |
| **Portfolio Trackers** | Planned | DeBank, Zapper integration |

### API Integration

```typescript
// Fetch vault statistics
const response = await fetch('/api/euler/vault-stats');
const { vault, feeConfiguration } = await response.json();

console.log(`TVL: $${vault.totalSupply}`);
console.log(`Supply APY: ${vault.supplyAPY}%`);
console.log(`Fee Status: ${feeConfiguration.status.feeRoutingStatus}`);
```

---

## Roadmap & Milestones

### Phase 1: Foundation (COMPLETE)

- [x] Deploy AXUSD Lending Vault on Euler V2
- [x] Configure 4 collateral types (USDC, USDT, WETH, ARB)
- [x] Set conservative LTV parameters
- [x] Deploy AxiomVaultGovernorV2 for governance control
- [x] Configure fee recipient to Revenue Router
- [x] Execute governance transaction (AXM-GOV-002)
- [x] Build vault-stats API with error handling
- [x] Document governance procedures

### Phase 2: Observation Window (Current)

*January 29, 2026 - March 26, 2026*

- [ ] Monitor vault health and utilization metrics
- [ ] Track LP deposits and borrower activity
- [ ] Gather data for parameter optimization
- [ ] Prepare institutional outreach materials
- [ ] Build DeFiLlama integration
- [ ] Complete security review

### Phase 3: Growth (Post-Observation)

*March 26, 2026 onwards*

- [ ] Increase borrow caps based on utilization data
- [ ] Optimize LTV parameters based on market conditions
- [ ] Launch yield aggregator partnerships
- [ ] Deploy marketing campaign targeting external LPs
- [ ] Integrate with major portfolio trackers
- [ ] Consider additional collateral types

### Phase 4: Maturity

- [ ] Achieve $10M+ TVL target
- [ ] Establish stable protocol revenue stream
- [ ] Enable RWA collateral types
- [ ] Cross-chain expansion (if applicable)
- [ ] Institutional partnership announcements

---

## Key Metrics & Monitoring

### Real-Time Metrics Dashboard

The `/api/euler/vault-stats` endpoint provides comprehensive metrics:

```json
{
  "vault": {
    "totalSupply": "0.00",
    "totalBorrows": "0.00",
    "availableLiquidity": "0.00",
    "utilization": "0.00",
    "supplyAPY": "0.00",
    "borrowAPY": "0.00",
    "supplyCap": "Unlimited",
    "borrowCap": "500,000"
  },
  "feeConfiguration": {
    "feeReceiver": "0x39A9Ca593d350450d93aF7F24dC1A682df47F30a",
    "interestFeePercent": "10.00",
    "dataQuality": "COMPLETE",
    "status": {
      "feeRoutingStatus": "CONFIGURED_REVENUE_ROUTER"
    }
  }
}
```

### Key Performance Indicators (KPIs)

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Total Value Locked** | $1M (6mo) | $0 | Observation |
| **Utilization Rate** | 50-70% | N/A | Awaiting deposits |
| **Protocol Revenue** | $8K/mo (at $1M TVL) | $0 | Fee routing active |
| **Data Quality** | COMPLETE | COMPLETE | Healthy |
| **Governance Actions** | All documented | 1/1 | On track |

### Monitoring Checklist

- [ ] Daily: Check utilization rate and APY
- [ ] Weekly: Review protocol revenue accrual
- [ ] Monthly: Governance parameter review
- [ ] Quarterly: Security audit schedule
- [ ] Ongoing: API health and error rates

---

## Appendix

### Contract ABIs

Key function signatures for vault interaction:

```solidity
// AXUSD Vault (Euler EVault)
function totalAssets() external view returns (uint256);
function totalBorrows() external view returns (uint256);
function interestRate() external view returns (uint256);
function feeReceiver() external view returns (address);
function interestFee() external view returns (uint16);
function deposit(uint256 assets, address receiver) external returns (uint256 shares);
function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);

// AxiomVaultGovernorV2
function executeCall(address target, bytes calldata data) external returns (bytes memory);
```

### External Resources

- [Euler V2 Documentation](https://docs.euler.finance/)
- [Euler Vault on Arbitrum](https://app.euler.finance/vault/0xCf00A6FA6f5bAc1f224Cee029DacF3b8CCC79429?network=arbitrumone)
- [Arbiscan Contract](https://arbiscan.io/address/0xCf00A6FA6f5bAc1f224Cee029DacF3b8CCC79429)
- [Governance Transaction](https://arbiscan.io/tx/0x2dba6cd2be8d3378974e51086ffb06f507f28df2381aa7265e0f90cf6f4e1a08)

### Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-29 | Initial executive summary |

---

*This document is maintained by the Axiom Protocol governance team. For questions or updates, submit a governance proposal or contact the development team.*
