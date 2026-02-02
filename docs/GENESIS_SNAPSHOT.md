# AXIOM Protocol Genesis Snapshot

**Version:** 1.0
**Snapshot Date:** February 2, 2026
**Network:** Arbitrum One (Chain ID: 42161)
**Block Explorer:** https://arbitrum.blockscout.com

---

## Purpose

This document serves as the authoritative reference for AXIOM Protocol's deployed infrastructure as of the Genesis snapshot date. All future upgrades, migrations, and L3 deployments will reference this baseline.

---

## Network Information

| Attribute | Value |
|-----------|-------|
| **Network** | Arbitrum One |
| **Chain ID** | 42161 |
| **RPC URL** | https://arb1.arbitrum.io/rpc |
| **Block Explorer** | https://arbitrum.blockscout.com |
| **Current Deployer** | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` |
| **Original Deployer** | `0xDFf9e47eb007bF02e47477d577De9ffA99791528` (contracts 1-22) |
| **Multi-Sig** | `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d` (Gnosis Safe) |

---

## Contract Registry Summary

| Category | Deployed | Size Verified | Notes |
|----------|----------|---------------|-------|
| Core Infrastructure | 23 | 14 | All verified on Blockscout |
| Governance Infrastructure | 6 | 6 | All size-checked |
| DEX V2 Ecosystem | 10 | 10 | 5 are proxies (170 bytes) |
| Lending Fund Infrastructure | 3 | 3 | All size-checked |
| AXUSD System | 1 | 1 | 5 planned for Phase 1 |
| **Total Deployed** | **43** | **34** | Size verified via eth_getCode |

---

## Core Infrastructure Contracts (1-23)

**Verification Method:** On-chain code size check via eth_getCode RPC call on Feb 2, 2026

### Token & Treasury (1-6)

| # | Contract | Address | Size | Purpose |
|---|----------|---------|------|---------|
| 1 | AxiomV2 (AXM Token) | `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D` | 16.88 KB | ERC-20 governance token |
| 2 | AxiomIdentityComplianceHub | `0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED` | 2.87 KB | KYC/AML verification |
| 3 | AxiomTreasuryAndRevenueHub | `0x3fD63728288546AC41dAe3bf25ca383061c3A929` | 6.18 KB | Treasury & revenue distribution |
| 4 | AxiomStakingAndEmissionsHub | `0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885` | 6.06 KB | Token staking & emissions |
| 5 | CitizenCredentialRegistry | `0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344` | 8.97 KB | Citizen identity |
| 6 | AxiomLandAndAssetRegistry | `0xaB15907b124620E165aB6E464eE45b178d8a6591` | 3.55 KB | Land & asset registration |

### Real Estate & Rental (7-9)

| # | Contract | Address | Size | Purpose |
|---|----------|---------|------|---------|
| 7 | LeaseAndRentEngine | `0x26a20dEa57F951571AD6e518DFb3dC60634D5297` | 11.75 KB | Lease & rent processing |
| 8 | RealtorModule | `0x579EA6FC512E5f1b4FC77d5f4f03aA976fa40412` | 12.50 KB | Realtor registration |
| 9 | CapitalPoolsAndFunds | `0xFcCdC1E353b24936f9A8D08D21aF684c620fa701` | 10.68 KB | Investment pools |

### DeFi & Utility (10-13)

| # | Contract | Address | Verified | Purpose |
|---|----------|---------|----------|---------|
| 10 | UtilityAndMeteringHub | `0xac55BE7E1A6613c5DA66f7AC9520FfD24eF3212d` | Yes | Utility metering |
| 11 | TransportAndLogisticsHub | `0x959c5dd99B170e2b14B1F9b5a228f323946F514e` | Yes | Transport tracking |
| 12 | DePINNodeSuite | `0x16dC3884d88b767D99E0701Ba026a1ed39a250F1` | Yes | Node staking |
| 13 | DePINNodeSales | `0x876951CaE4Ad48bdBfba547Ef4316Db576A9Edbd` | Yes | Node sales |

### Cross-Chain & Advanced (14-17)

| # | Contract | Address | Verified | Purpose |
|---|----------|---------|----------|---------|
| 14 | CrossChainAndLaunchModule | `0x28623Ee5806ab9609483F4B68cb1AE212A092e4d` | Yes | Cross-chain ops |
| 15 | AxiomExchangeHub | `0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D` | Yes | Internal DEX |
| 16 | CitizenReputationOracle | `0x649a0F1bd204b6f23A92f1CDbb2F1838D691B643` | Yes | Reputation scoring |
| 17 | IoTOracleNetwork | `0xe38B3443E17A07953d10F7841D5568a27A73ec1a` | Yes | IoT data oracles |

### Market Infrastructure (18-19)

| # | Contract | Address | Verified | Purpose |
|---|----------|---------|----------|---------|
| 18 | MarketsAndListingsHub | `0x98a59D4fb5Fa974879E9F043C3174Ae82Fb9D830` | Yes | RWA trading |
| 19 | OracleAndMetricsRelay | `0x5c17F4621A47b4E8c357bAA6379b4B223BAA5Ac6` | Yes | Price feeds |

### Community & Engagement (20-23)

| # | Contract | Address | Verified | Purpose |
|---|----------|---------|----------|---------|
| 20 | CommunitySocialHub | `0xC2f82eD5C2585B525E01F19eA5C28811AB43aF49` | Yes | Community features |
| 21 | AxiomAcademyHub | `0x30667931BEe54a58B76D387D086A975aB37206F4` | Yes | Education |
| 22 | GamificationHub | `0x7F455b4614E05820AAD52067Ef223f30b1936f93` | Yes | Gamification |
| 23 | SustainabilityHub | `0xAf4dF8a7733BAB64b7Ce83F2494d6446eF9eC046` | Yes | Carbon credits |

---

## Governance Infrastructure Contracts

| Contract | Address | Size | Purpose |
|----------|---------|------|---------|
| GovernanceHub | `0x52Dc85fd653a75323b5307f4D2629ab9A070530E` | 8.92 KB | 24hr timelock governance |
| AxiomTimelockController | `0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899` | 7.00 KB | Timelock execution |
| AxiomGovernanceConfig | `0xa645a0Fcc15dD22Ee44d774F19731Fb0fE70b2CC` | 4.33 KB | Governance parameters |
| ProductRegistry | `0x31AD75DB98F142069ff30D6C7C206Ca4b5a10e5d` | 4.08 KB | Loan product registration |
| RiskConfig | `0xD9a53c691B688351283Fecc33D8D9AF964A9a078` | 4.76 KB | Fix & Flip risk params |
| DSCRRiskConfig | `0xd9d5a2A1aDF917BECd9454De632DfC69895a2B26` | 5.10 KB | DSCR loan risk params |

### Governance Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| Minimum Delay | 24 hours | Hardcoded floor: 1 hour |
| Default Delay | 24 hours | Configured at deployment |
| Maximum Delay | 30 days | Hardcoded cap |
| Grace Period | 14 days | Actions expire after ETA + grace |
| Lock Status | Configurable | Not yet locked forever |

### Role Assignments (GovernanceHub)

| Role | Current Holder | Purpose |
|------|----------------|---------|
| DEFAULT_ADMIN_ROLE | Gnosis Safe | Full administrative control |
| RISK_COMMITTEE_ROLE | TBD | Risk parameter updates |
| SETTLEMENT_AUTHORITY_ROLE | TBD | Product activation |
| GUARDIAN_ROLE | Gnosis Safe | Emergency pause |

---

## DEX V2 Ecosystem Contracts

**Note:** Many DEX V2 contracts are proxies (170 bytes) pointing to implementation contracts.

| Contract | Address | Size | Purpose |
|----------|---------|------|---------|
| ExchangeHubV2 | `0x31eF3DCB076ba97229113F4e58Cc9315cb8Dcd28` | 0.17 KB (Proxy) | Central trading router |
| OracleAdapter | `0xe0074F15EFe0E39fdc39c8e13f752DDC63AB35c7` | 0.17 KB (Proxy) | Chainlink aggregation |
| LPStaking | `0x066623787044440015f7Ea2eC04cA58126cA00a5` | 0.17 KB (Proxy) | Liquidity incentives |
| FeeDistributor | `0xD981748E2ed17681D8088be84480FE294d635ae8` | 0.17 KB (Proxy) | Revenue distribution |
| TradingRewards | `0xb75b6e3D02116421fbd7c830a0f24d9a42420984` | 0.17 KB (Proxy) | Volume incentives |
| DEXRouter | `0x05c655801dbf4ce8Db5aaE159769B7a1a0bFC0d8` | 0.17 KB (Proxy) | Order execution |
| DEXAnalytics | `0x93cDF4AeCE237C62032e40C82d8b09dd76Fdf3E9` | 0.17 KB (Proxy) | On-chain metrics |
| LimitOrders | `0xBdC968773915095b71156bf265b0b10B23B9F8E2` | 0.17 KB (Proxy) | Conditional execution |
| DEXGovernor | `0x9A86CF2715D4c4Bb6728FB401ACd103527ABf96d` | 0.17 KB (Proxy) | DEX governance |
| InsuranceFund | `0x449769453e5bc43345092EeD31780bbbfc400F39` | 0.17 KB (Proxy) | Trading loss coverage |

---

## Lending Fund Infrastructure Contracts

| Contract | Address | Size | Purpose |
|----------|---------|------|---------|
| FixFlipManager | `0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958` | 11.11 KB | Bridge loan origination |
| DSCRLoanManager | `0x105117F1AD1B65a5d0C7F0E9A870683A06738E16` | 15.81 KB | Rental loan origination |
| DSCRPoolVault V2 | `0x5a09cb67518e6E28d8307D75174430939C044A7d` | 8.78 KB | DSCR capital pool |

### Registered Loan Products

| ID | Name | LTV | DSCR | APR | Range | Term |
|----|------|-----|------|-----|-------|------|
| 1 | Fix & Flip Bridge | 75% | N/A | 12% | $50K-$5M | 6-18 mo |
| 2 | DSCR 30-Year Rental | 75% | 1.25 | 8% | $75K-$3M | 360 mo |
| 3 | DSCR 15-Year Rental | 80% | 1.15 | 7.25% | $75K-$3M | 180 mo |
| 4 | BRRRR Refinance | 70% | 1.30 | 8.5% | $100K-$2M | 240 mo |

---

## AXUSD System Contracts

| Contract | Address | Verified | Purpose |
|----------|---------|----------|---------|
| AXUSD Token | `0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C` | Yes (6.30 KB) | Stablecoin (ERC-20) |

**Note:** The following AXUSD system contracts are planned but not yet deployed:
- VaultEngine (CDP management) - Phase 1
- PSM (1:1 USDC mint/redeem) - Phase 1
- Liquidator (Position handling) - Phase 1
- BackstopVault (Protocol reserves) - Phase 1
- MarketOperations (Peg defense) - Phase 1

---

## Access Control Roles (All Contracts)

| Role | Description |
|------|-------------|
| `DEFAULT_ADMIN_ROLE` | Full administrative control |
| `PAUSER_ROLE` | Pause/unpause operations |
| `MINTER_ROLE` | Mint tokens (AXM only) |
| `COMPLIANCE_ROLE` | Manage compliance |
| `RESCUER_ROLE` | Rescue stuck tokens |
| `FEE_MANAGER_ROLE` | Configure fees |
| `ORACLE_MANAGER_ROLE` | Update oracle data |
| `TREASURY_ROLE` | Treasury operations |
| `RISK_COMMITTEE_ROLE` | Risk parameters |
| `SETTLEMENT_AUTHORITY_ROLE` | Product activation |
| `GUARDIAN_ROLE` | Emergency pause |

---

## Contract Classification for Upgrades

### Core Contracts (Require Proxy Upgrade)

These contracts hold critical state and cannot be simply redeployed:

| Contract | State Type | Migration Complexity |
|----------|------------|---------------------|
| AxiomV2 (AXM) | Balances, allowances | High - token migration |
| GovernanceHub | Pending actions, roles | High - governance state |
| ProductRegistry | Product configs | Medium |
| AxiomTreasuryAndRevenueHub | Treasury balances | High |
| AxiomStakingAndEmissionsHub | Stakes, rewards | High |
| AXUSD Token | Balances, allowances | High - token migration |

### Product Contracts (Can Redeploy + Migrate)

These contracts can be redeployed and state migrated:

| Contract | State Type | Migration Complexity |
|----------|------------|---------------------|
| RiskConfig | Parameters only | Low |
| DSCRRiskConfig | Parameters only | Low |
| FixFlipManager | Loan records | Medium |
| DSCRLoanManager | Loan records | Medium |
| LeaseAndRentEngine | Lease records | Medium |

### Utility Contracts (Stateless - Replace Freely)

These contracts are stateless or can be replaced:

| Contract | Notes |
|----------|-------|
| OracleAdapter | Configuration only |
| DEXRouter | Routing logic only |
| DEXAnalytics | Read-only aggregation |
| LimitOrders | Pending orders need migration |

---

## Oracle Configuration

### Chainlink Price Feeds

| Asset | Feed Address | Heartbeat |
|-------|--------------|-----------|
| ETH/USD | Arbitrum Chainlink | 1 hour |
| USDC/USD | Arbitrum Chainlink | 1 hour |
| ARB/USD | Arbitrum Chainlink | 1 hour |
| LINK/USD | Arbitrum Chainlink | 1 hour |

### Property Valuation Sources

- ATTOM Data API
- RentCast API
- Walk Score API

---

## Verification Commands

```bash
# Verify GovernanceHub on Arbiscan
cast call 0x52Dc85fd653a75323b5307f4D2629ab9A070530E "minimumDelay()(uint256)" --rpc-url https://arb1.arbitrum.io/rpc

# Get authorized targets
cast call 0x52Dc85fd653a75323b5307f4D2629ab9A070530E "getAuthorizedTargets()(address[])" --rpc-url https://arb1.arbitrum.io/rpc

# Check lending paused status
cast call 0x52Dc85fd653a75323b5307f4D2629ab9A070530E "lendingPaused()(bool)" --rpc-url https://arb1.arbitrum.io/rpc

# Verify AXM token supply
cast call 0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D "totalSupply()(uint256)" --rpc-url https://arb1.arbitrum.io/rpc
```

---

## Verification URLs

### Core Infrastructure
- AXM Token: https://arbiscan.io/address/0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D
- Identity Hub: https://arbiscan.io/address/0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED
- Treasury Hub: https://arbiscan.io/address/0x3fD63728288546AC41dAe3bf25ca383061c3A929

### Governance
- GovernanceHub: https://arbiscan.io/address/0x52Dc85fd653a75323b5307f4D2629ab9A070530E
- ProductRegistry: https://arbiscan.io/address/0x31AD75DB98F142069ff30D6C7C206Ca4b5a10e5d

### DEX V2
- ExchangeHubV2: https://arbiscan.io/address/0x31eF3DCB076ba97229113F4e58Cc9315cb8Dcd28

### Lending
- FixFlipManager: https://arbiscan.io/address/0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958
- DSCRLoanManager: https://arbiscan.io/address/0x105117F1AD1B65a5d0C7F0E9A870683A06738E16

---

## Git Tag Requirement

**Action Required:** Create genesis tag manually:

```bash
git tag -a genesis-snapshot-2026-02-02 -m "Genesis Snapshot: Phase 0 stabilization baseline for Universe L3 roadmap"
git push origin genesis-snapshot-2026-02-02
```

This tag marks the baseline for all future upgrades and L3 migrations.

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-02 | AXIOM Team | Initial complete snapshot |
| 1.1 | 2026-02-02 | AXIOM Team | Added verified on-chain contract sizes |
