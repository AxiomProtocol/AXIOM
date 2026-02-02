# AXIOM Protocol Contract Classification

**Version:** 1.0
**Date:** February 2, 2026
**Purpose:** Separate core vs product contracts for independent upgrade paths

---

## Classification Overview

Contracts are classified into four tiers based on their role in the protocol:

| Tier | Description | Upgrade Strategy | L3 Migration |
|------|-------------|------------------|--------------|
| **Core** | Protocol foundation, cannot fail | Proxy upgrade only | Bridge, not migrate |
| **Product** | Revenue-generating products | Beacon proxy or redeploy | Migrate state |
| **Utility** | Supporting infrastructure | Redeploy freely | Deploy fresh |
| **Legacy** | Deprecated or superseded | No upgrades | Do not migrate |

---

## Tier 1: Core Contracts

These contracts form the protocol foundation. Failure or corruption would be catastrophic.

### Token Layer

| Contract | Address | Classification | Notes |
|----------|---------|----------------|-------|
| AxiomV2 (AXM) | `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D` | **CORE** | Governance token, cannot replace |
| AXUSD Token | `0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C` | **CORE** | Settlement layer |

### Governance Layer

| Contract | Address | Classification | Notes |
|----------|---------|----------------|-------|
| GovernanceHub | `0x52Dc85fd653a75323b5307f4D2629ab9A070530E` | **CORE** | Timelock governance |
| AxiomTimelockController | `0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899` | **CORE** | Execution layer |
| AxiomGovernanceConfig | `0xa645a0Fcc15dD22Ee44d774F19731Fb0fE70b2CC` | **CORE** | Config registry |

### Treasury Layer

| Contract | Address | Classification | Notes |
|----------|---------|----------------|-------|
| AxiomTreasuryAndRevenueHub | `0x3fD63728288546AC41dAe3bf25ca383061c3A929` | **CORE** | Protocol treasury |
| CapitalPoolsAndFunds | `0xFcCdC1E353b24936f9A8D08D21aF684c620fa701` | **CORE** | Investment pools |

### Identity Layer

| Contract | Address | Classification | Notes |
|----------|---------|----------------|-------|
| AxiomIdentityComplianceHub | `0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED` | **CORE** | KYC/AML foundation |
| CitizenCredentialRegistry | `0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344` | **CORE** | Identity records |

---

## Tier 2: Product Contracts

These contracts generate revenue or provide user-facing products. Can be upgraded or replaced with state migration.

### Lending Products

| Contract | Address | Classification | Notes |
|----------|---------|----------------|-------|
| ProductRegistry | `0x31AD75DB98F142069ff30D6C7C206Ca4b5a10e5d` | **PRODUCT** | Product configs |
| FixFlipManager | `0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958` | **PRODUCT** | Bridge loans |
| DSCRLoanManager | `0x105117F1AD1B65a5d0C7F0E9A870683A06738E16` | **PRODUCT** | Rental loans |
| RiskConfig | `0xD9a53c691B688351283Fecc33D8D9AF964A9a078` | **PRODUCT** | Fix & Flip params |
| DSCRRiskConfig | `0xd9d5a2A1aDF917BECd9454De632DfC69895a2B26` | **PRODUCT** | DSCR params |
| DSCRPoolVault V2 | `0x5a09cb67518e6E28d8307D75174430939C044A7d` | **PRODUCT** | Capital pool |

### Real Estate Products

| Contract | Address | Classification | Notes |
|----------|---------|----------------|-------|
| AxiomLandAndAssetRegistry | `0xaB15907b124620E165aB6E464eE45b178d8a6591` | **PRODUCT** | Land records |
| LeaseAndRentEngine | `0x26a20dEa57F951571AD6e518DFb3dC60634D5297` | **PRODUCT** | Lease management |
| RealtorModule | `0x579EA6FC512E5f1b4FC77d5f4f03aA976fa40412` | **PRODUCT** | Realtor registry |

### DEX Products

| Contract | Address | Classification | Notes |
|----------|---------|----------------|-------|
| ExchangeHubV2 | `0x31eF3DCB076ba97229113F4e58Cc9315cb8Dcd28` | **PRODUCT** | Trading router |
| LPStaking | `0x066623787044440015f7Ea2eC04cA58126cA00a5` | **PRODUCT** | LP incentives |
| TradingRewards | `0xb75b6e3D02116421fbd7c830a0f24d9a42420984` | **PRODUCT** | Volume rewards |
| InsuranceFund | `0x449769453e5bc43345092EeD31780bbbfc400F39` | **PRODUCT** | Trading insurance |

### Staking Products

| Contract | Address | Classification | Notes |
|----------|---------|----------------|-------|
| AxiomStakingAndEmissionsHub | `0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885` | **PRODUCT** | Token staking |

### DePIN Products

| Contract | Address | Classification | Notes |
|----------|---------|----------------|-------|
| DePINNodeSuite | `0x16dC3884d88b767D99E0701Ba026a1ed39a250F1` | **PRODUCT** | Node staking |
| DePINNodeSales | `0x876951CaE4Ad48bdBfba547Ef4316Db576A9Edbd` | **PRODUCT** | Node sales |

---

## Tier 3: Utility Contracts

These contracts provide supporting functionality. Can be replaced without migration.

### Oracle Infrastructure

| Contract | Address | Classification | Notes |
|----------|---------|----------------|-------|
| OracleAdapter | `0xe0074F15EFe0E39fdc39c8e13f752DDC63AB35c7` | **UTILITY** | Price feeds |
| OracleAndMetricsRelay | `0x5c17F4621A47b4E8c357bAA6379b4B223BAA5Ac6` | **UTILITY** | Metrics relay |
| CitizenReputationOracle | `0x649a0F1bd204b6f23A92f1CDbb2F1838D691B643` | **UTILITY** | Reputation |
| IoTOracleNetwork | `0xe38B3443E17A07953d10F7841D5568a27A73ec1a` | **UTILITY** | IoT data |

### DEX Utilities

| Contract | Address | Classification | Notes |
|----------|---------|----------------|-------|
| DEXRouter | `0x05c655801dbf4ce8Db5aaE159769B7a1a0bFC0d8` | **UTILITY** | Order routing |
| DEXAnalytics | `0x93cDF4AeCE237C62032e40C82d8b09dd76Fdf3E9` | **UTILITY** | Analytics |
| LimitOrders | `0xBdC968773915095b71156bf265b0b10B23B9F8E2` | **UTILITY** | Limit orders |
| DEXGovernor | `0x9A86CF2715D4c4Bb6728FB401ACd103527ABf96d` | **UTILITY** | DEX params |
| FeeDistributor | `0xD981748E2ed17681D8088be84480FE294d635ae8` | **UTILITY** | Fee routing |

### Smart City Utilities

| Contract | Address | Classification | Notes |
|----------|---------|----------------|-------|
| UtilityAndMeteringHub | `0xac55BE7E1A6613c5DA66f7AC9520FfD24eF3212d` | **UTILITY** | Metering |
| TransportAndLogisticsHub | `0x959c5dd99B170e2b14B1F9b5a228f323946F514e` | **UTILITY** | Transport |
| SustainabilityHub | `0xAf4dF8a7733BAB64b7Ce83F2494d6446eF9eC046` | **UTILITY** | Carbon credits |

### Community Utilities

| Contract | Address | Classification | Notes |
|----------|---------|----------------|-------|
| CommunitySocialHub | `0xC2f82eD5C2585B525E01F19eA5C28811AB43aF49` | **UTILITY** | Social features |
| AxiomAcademyHub | `0x30667931BEe54a58B76D387D086A975aB37206F4` | **UTILITY** | Education |
| GamificationHub | `0x7F455b4614E05820AAD52067Ef223f30b1936f93` | **UTILITY** | Gamification |

### Cross-Chain Utilities

| Contract | Address | Classification | Notes |
|----------|---------|----------------|-------|
| CrossChainAndLaunchModule | `0x28623Ee5806ab9609483F4B68cb1AE212A092e4d` | **UTILITY** | Cross-chain ops |
| MarketsAndListingsHub | `0x98a59D4fb5Fa974879E9F043C3174Ae82Fb9D830` | **UTILITY** | RWA listings |

---

## Tier 4: Legacy Contracts

Contracts that have been superseded or are deprecated.

| Contract | Address | Classification | Notes |
|----------|---------|----------------|-------|
| AxiomExchangeHub (V1) | `0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D` | **LEGACY** | Superseded by V2 |

---

## L3 Migration Strategy by Tier

### Core Contracts

**Strategy:** Bridge, don't migrate

- Deploy fresh instances on L3
- Use bridge for token transfers (AXM, AXUSD)
- Governance remains on L2 initially
- L3 contracts check L2 governance via bridge

### Product Contracts

**Strategy:** Deploy fresh + migrate state

1. Deploy new instances on L3
2. Export state from L2 contracts
3. Import state to L3 contracts
4. Validate state integrity
5. Switch traffic to L3

### Utility Contracts

**Strategy:** Deploy fresh

- Deploy new instances on L3
- Configure for L3 environment
- No state migration needed

### Legacy Contracts

**Strategy:** Do not migrate

- Leave on L2 only
- Eventually deprecate
- No L3 presence

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

## Summary Statistics

| Tier | Count | Upgrade Strategy |
|------|-------|------------------|
| CORE | 10 | Proxy only |
| PRODUCT | 16 | Beacon/Redeploy |
| UTILITY | 15 | Replace freely |
| LEGACY | 1 | No upgrades |
| **TOTAL** | **42** | |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-02 | AXIOM Team | Initial classification |
