# AXIOM Protocol - Contract Registry

**Version:** 1.0  
**Network:** Arbitrum One (Chain ID: 42161)  
**Last Updated:** February 2, 2026  
**Source:** [CONTRACT_CLASSIFICATION.md](./CONTRACT_CLASSIFICATION.md), [module-to-contract-map.md](./module-to-contract-map.md)

---

## Overview

This document provides a unified contract registry mapping each contract to its tier classification, module membership, and upgrade strategy.

---

## Tier Classification System

| Tier | Description | Upgrade Strategy | L3 Migration |
|------|-------------|------------------|--------------|
| **CORE** | Protocol foundation, cannot fail | Proxy upgrade only | Bridge, not migrate |
| **PRODUCT** | Revenue-generating products | Beacon proxy or redeploy | Migrate state |
| **UTILITY** | Supporting infrastructure | Redeploy freely | Deploy fresh |
| **LEGACY** | Deprecated or superseded | No upgrades | Do not migrate |

---

## Core Contracts (Tier 1)

Critical infrastructure that cannot fail. Failure or corruption would be catastrophic.

### Token Layer

| Contract | Address | Module | Governance |
|----------|---------|--------|------------|
| AxiomV2 (AXM) | `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D` | Token Economics | Timelocked |
| AXUSD Token | `0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C` | Stablecoin | Timelocked |

### Governance Layer

| Contract | Address | Module | Governance |
|----------|---------|--------|------------|
| GovernanceHub | `0x52Dc85fd653a75323b5307f4D2629ab9A070530E` | Governance | Self-governed |
| AxiomTimelockController | `0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899` | Governance | Self-governed |
| AxiomGovernanceConfig | `0xa645a0Fcc15dD22Ee44d774F19731Fb0fE70b2CC` | Governance | Timelocked |

### Treasury Layer

| Contract | Address | Module | Governance |
|----------|---------|--------|------------|
| AxiomTreasuryAndRevenueHub | `0x3fD63728288546AC41dAe3bf25ca383061c3A929` | Treasury Core | Timelocked |
| CapitalPoolsAndFunds | `0xFcCdC1E353b24936f9A8D08D21aF684c620fa701` | Reserve Buckets | Timelocked |

### Identity Layer

| Contract | Address | Module | Governance |
|----------|---------|--------|------------|
| AxiomIdentityComplianceHub | `0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED` | Identity | Timelocked |
| CitizenCredentialRegistry | `0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344` | Identity | Timelocked |

---

## Product Contracts (Tier 2)

Revenue-generating products. Can be upgraded or replaced with state migration.

### Lending Products

| Contract | Address | Module | Governance |
|----------|---------|--------|------------|
| ProductRegistry | `0x31AD75DB98F142069ff30D6C7C206Ca4b5a10e5d` | Lending | Timelocked |
| FixFlipManager | `0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958` | Lending | Timelocked |
| DSCRLoanManager | `0x105117F1AD1B65a5d0C7F0E9A870683A06738E16` | Lending | Timelocked |
| RiskConfig | `0xD9a53c691B688351283Fecc33D8D9AF964A9a078` | Drawdown Protection | Timelocked |
| DSCRRiskConfig | `0xd9d5a2A1aDF917BECd9454De632DfC69895a2B26` | Drawdown Protection | Timelocked |
| DSCRPoolVault V2 | `0x5a09cb67518e6E28d8307D75174430939C044A7d` | Lending | Timelocked |

### Real Estate Products

| Contract | Address | Module | Governance |
|----------|---------|--------|------------|
| AxiomLandAndAssetRegistry | `0xaB15907b124620E165aB6E464eE45b178d8a6591` | Asset Registry | Timelocked |
| LeaseAndRentEngine | `0x26a20dEa57F951571AD6e518DFb3dC60634D5297` | Real Estate | Timelocked |
| RealtorModule | `0x579EA6FC512E5f1b4FC77d5f4f03aA976fa40412` | Real Estate | Timelocked |

### DEX Products

| Contract | Address | Module | Governance |
|----------|---------|--------|------------|
| ExchangeHubV2 | `0x31eF3DCB076ba97229113F4e58Cc9315cb8Dcd28` | Liquidity | Timelocked |
| LPStaking | `0x066623787044440015f7Ea2eC04cA58126cA00a5` | Liquidity | Timelocked |
| TradingRewards | `0xb75b6e3D02116421fbd7c830a0f24d9a42420984` | Liquidity | Timelocked |
| InsuranceFund | `0x449769453e5bc43345092EeD31780bbbfc400F39` | Liquidity | Timelocked |

### Staking Products

| Contract | Address | Module | Governance |
|----------|---------|--------|------------|
| AxiomStakingAndEmissionsHub | `0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885` | Token Economics | Timelocked |

### DePIN Products

| Contract | Address | Module | Governance |
|----------|---------|--------|------------|
| DePINNodeSuite | `0x16dC3884d88b767D99E0701Ba026a1ed39a250F1` | Node Economy | Timelocked |
| DePINNodeSales | `0x876951CaE4Ad48bdBfba547Ef4316Db576A9Edbd` | Node Economy | Timelocked |

---

## Utility Contracts (Tier 3)

Supporting functionality. Can be replaced without migration.

### Oracle Infrastructure

| Contract | Address | Module | Governance |
|----------|---------|--------|------------|
| OracleAdapter | `0xe0074F15EFe0E39fdc39c8e13f752DDC63AB35c7` | Oracle | Timelocked |
| OracleAndMetricsRelay | `0x5c17F4621A47b4E8c357bAA6379b4B223BAA5Ac6` | Oracle | Timelocked |
| CitizenReputationOracle | `0x649a0F1bd204b6f23A92f1CDbb2F1838D691B643` | Oracle | Timelocked |
| IoTOracleNetwork | `0xe38B3443E17A07953d10F7841D5568a27A73ec1a` | Oracle | Timelocked |

### DEX Utilities

| Contract | Address | Module | Governance |
|----------|---------|--------|------------|
| DEXRouter | `0x05c655801dbf4ce8Db5aaE159769B7a1a0bFC0d8` | Liquidity | Timelocked |
| DEXAnalytics | `0x93cDF4AeCE237C62032e40C82d8b09dd76Fdf3E9` | Liquidity | Read-only |
| LimitOrders | `0xBdC968773915095b71156bf265b0b10B23B9F8E2` | Liquidity | Timelocked |
| DEXGovernor | `0x9A86CF2715D4c4Bb6728FB401ACd103527ABf96d` | Liquidity | Timelocked |
| FeeDistributor | `0xD981748E2ed17681D8088be84480FE294d635ae8` | Revenue | Timelocked |

### Smart City Utilities

| Contract | Address | Module | Governance |
|----------|---------|--------|------------|
| UtilityAndMeteringHub | `0xac55BE7E1A6613c5DA66f7AC9520FfD24eF3212d` | Smart City | Timelocked |
| TransportAndLogisticsHub | `0x959c5dd99B170e2b14B1F9b5a228f323946F514e` | Smart City | Timelocked |
| SustainabilityHub | `0xAf4dF8a7733BAB64b7Ce83F2494d6446eF9eC046` | Smart City | Timelocked |

### Community Utilities

| Contract | Address | Module | Governance |
|----------|---------|--------|------------|
| CommunitySocialHub | `0xC2f82eD5C2585B525E01F19eA5C28811AB43aF49` | Community | Timelocked |
| AxiomAcademyHub | `0x30667931BEe54a58B76D387D086A975aB37206F4` | Education | Timelocked |
| GamificationHub | `0x7F455b4614E05820AAD52067Ef223f30b1936f93` | Community | Timelocked |

### Cross-Chain Utilities

| Contract | Address | Module | Governance |
|----------|---------|--------|------------|
| CrossChainAndLaunchModule | `0x28623Ee5806ab9609483F4B68cb1AE212A092e4d` | Cross-Chain | Timelocked |
| MarketsAndListingsHub | `0x98a59D4fb5Fa974879E9F043C3174Ae82Fb9D830` | RWA | Timelocked |

---

## Legacy Contracts (Tier 4)

Deprecated contracts. Do not migrate.

| Contract | Address | Module | Notes |
|----------|---------|--------|-------|
| AxiomExchangeHub (V1) | `0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D` | N/A | Superseded by ExchangeHubV2 |

---

## Module Overview

| Module | Contract Count | Primary Contracts |
|--------|----------------|-------------------|
| Treasury Core | 1 | AxiomTreasuryAndRevenueHub |
| Token Economics | 2 | AxiomV2, AxiomStakingAndEmissionsHub |
| Governance | 3 | GovernanceHub, TimelockController, GovernanceConfig |
| Identity | 2 | IdentityComplianceHub, CitizenCredentialRegistry |
| Lending | 6 | FixFlipManager, DSCRLoanManager, ProductRegistry, etc. |
| Liquidity | 6 | ExchangeHubV2, LPStaking, DEXRouter, etc. |
| Real Estate | 3 | LandRegistry, LeaseEngine, RealtorModule |
| Oracle | 4 | OracleAdapter, MetricsRelay, ReputationOracle, IoT |
| Node Economy | 2 | DePINNodeSuite, DePINNodeSales |
| Smart City | 3 | UtilityHub, TransportHub, SustainabilityHub |
| Community | 3 | SocialHub, AcademyHub, GamificationHub |

---

## Classification Decision Tree

```
Is the contract:
├── Holding user funds directly?
│   └── YES → CORE
├── Managing governance state?
│   └── YES → CORE
├── Generating protocol revenue?
│   └── YES → PRODUCT
├── Recording user-critical data (KYC, credentials)?
│   └── YES → CORE
├── Providing configurable services?
│   └── YES → PRODUCT
├── Providing read-only or stateless services?
│   └── YES → UTILITY
└── Superseded by newer version?
    └── YES → LEGACY
```

---

## Planned Contracts (Not Yet Deployed)

### Node Operator Program (Priority 1)

| Contract | Target Location | Status |
|----------|-----------------|--------|
| NodeOpsRegistry | contracts/node-ops/ | TODO |
| NodeOpsTimelock | contracts/node-ops/ | TODO |
| NodeOpsTypes | contracts/node-ops/ | TODO |

### Capital Bridge (Priority 1)

| Contract | Target Location | Status |
|----------|-----------------|--------|
| CapitalBridgeHub | contracts/capital-bridge/ | TODO |
| CapitalReadinessGate | contracts/readiness/ | TODO |
| OperationalReadinessGate | contracts/readiness/ | TODO |

### Securitization (Priority 1)

| Contract | Target Location | Status |
|----------|-----------------|--------|
| InstrumentRegistry | contracts/securitization/ | TODO |
| PoolRegistry | contracts/securitization/ | TODO |
| ServicingEventLog | contracts/securitization/ | TODO |

---

## Summary Statistics

*Source: [CONTRACT_CLASSIFICATION.md](./CONTRACT_CLASSIFICATION.md)*

| Tier | Count | Upgrade Strategy |
|------|-------|------------------|
| CORE | 10 | Proxy only |
| PRODUCT | 16 | Beacon/Redeploy |
| UTILITY | 16 | Replace freely |
| LEGACY | 1 | No upgrades |
| **TOTAL** | **43** | Per Genesis Snapshot |

*Note: Total aligns with 43 contracts in [deployments.md](./deployments.md).*

---

## Related Documentation

- [deployments.md](./deployments.md) - Deployed addresses and verification
- [CONTRACT_CLASSIFICATION.md](./CONTRACT_CLASSIFICATION.md) - Detailed classification
- [module-to-contract-map.md](./module-to-contract-map.md) - Function-level mapping
- [current-roles-and-permissions.md](./current-roles-and-permissions.md) - Role assignments

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-02 | Initial creation, consolidated from classification docs |
