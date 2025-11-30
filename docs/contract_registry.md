# Axiom Protocol Contract Registry

> **Production Contracts on Arbitrum One**
> 
> This document is the authoritative registry of all deployed and verified smart contracts. Last updated: November 2025.

---

## Network Information

| Attribute | Value |
|-----------|-------|
| **Network** | Arbitrum One |
| **Chain ID** | 42161 |
| **RPC URL** | https://arb1.arbitrum.io/rpc |
| **Block Explorer** | https://arbitrum.blockscout.com |
| **Deployer Address** | `0xDFf9e47eb007bF02e47477d577De9ffA99791528` |
| **Total Contracts** | 23 |
| **Initial Deployment** | November 22, 2025 |
| **Most Recent Deployment** | November 26, 2025 (DePINNodeSales V2) |

---

## Core Infrastructure Contracts (1-6)

| # | Contract Name | Purpose | Address | Upgradeable | Admin Controller |
|---|---------------|---------|---------|-------------|------------------|
| 1 | **AxiomV2** (AXM Token) | ERC-20 governance token with fee routing | [`0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D`](https://arbitrum.blockscout.com/address/0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D) | No | Multi-role AccessControl |
| 2 | **AxiomIdentityComplianceHub** | KYC/AML verification and identity management | [`0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED`](https://arbitrum.blockscout.com/address/0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED) | No | DEFAULT_ADMIN_ROLE |
| 3 | **AxiomTreasuryAndRevenueHub** | Protocol treasury and revenue distribution | [`0x3fD63728288546AC41dAe3bf25ca383061c3A929`](https://arbitrum.blockscout.com/address/0x3fD63728288546AC41dAe3bf25ca383061c3A929) | No | DEFAULT_ADMIN_ROLE |
| 4 | **AxiomStakingAndEmissionsHub** | Token staking and emissions management | [`0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885`](https://arbitrum.blockscout.com/address/0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885) | No | DEFAULT_ADMIN_ROLE |
| 5 | **CitizenCredentialRegistry** | Citizen identity and credentials | [`0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344`](https://arbitrum.blockscout.com/address/0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344) | No | DEFAULT_ADMIN_ROLE |
| 6 | **AxiomLandAndAssetRegistry** | Land parcels and asset registration | [`0xaB15907b124620E165aB6E464eE45b178d8a6591`](https://arbitrum.blockscout.com/address/0xaB15907b124620E165aB6E464eE45b178d8a6591) | No | DEFAULT_ADMIN_ROLE |

---

## Real Estate & Rental Contracts (7-9)

| # | Contract Name | Purpose | Address | Upgradeable | Admin Controller |
|---|---------------|---------|---------|-------------|------------------|
| 7 | **LeaseAndRentEngine** | Lease agreements and rent processing (KeyGrow) | [`0x26a20dEa57F951571AD6e518DFb3dC60634D5297`](https://arbitrum.blockscout.com/address/0x26a20dEa57F951571AD6e518DFb3dC60634D5297) | No | DEFAULT_ADMIN_ROLE |
| 8 | **RealtorModule** | Realtor registration and commissions | [`0x579EA6FC512E5f1b4FC77d5f4f03aA976fa40412`](https://arbitrum.blockscout.com/address/0x579EA6FC512E5f1b4FC77d5f4f03aA976fa40412) | No | DEFAULT_ADMIN_ROLE |
| 9 | **CapitalPoolsAndFunds** | Investment pools and fund management | [`0xFcCdC1E353b24936f9A8D08D21aF684c620fa701`](https://arbitrum.blockscout.com/address/0xFcCdC1E353b24936f9A8D08D21aF684c620fa701) | No | DEFAULT_ADMIN_ROLE |

---

## DeFi & Utility Contracts (10-13)

| # | Contract Name | Purpose | Address | Upgradeable | Admin Controller |
|---|---------------|---------|---------|-------------|------------------|
| 10 | **UtilityAndMeteringHub** | Smart city utility metering | [`0xac55BE7E1A6613c5DA66f7AC9520FfD24eF3212d`](https://arbitrum.blockscout.com/address/0xac55BE7E1A6613c5DA66f7AC9520FfD24eF3212d) | No | DEFAULT_ADMIN_ROLE |
| 11 | **TransportAndLogisticsHub** | Transport and logistics tracking | [`0x959c5dd99B170e2b14B1F9b5a228f323946F514e`](https://arbitrum.blockscout.com/address/0x959c5dd99B170e2b14B1F9b5a228f323946F514e) | No | DEFAULT_ADMIN_ROLE |
| 12 | **DePINNodeSuite** | DePIN node staking and leasing | [`0x16dC3884d88b767D99E0701Ba026a1ed39a250F1`](https://arbitrum.blockscout.com/address/0x16dC3884d88b767D99E0701Ba026a1ed39a250F1) | No | DEFAULT_ADMIN_ROLE |
| 13 | **DePINNodeSales** ⭐ | Node sales with ETH/AXM payments (Most recent: Nov 26, 2025) | [`0x876951CaE4Ad48bdBfba547Ef4316Db576A9Edbd`](https://arbitrum.blockscout.com/address/0x876951CaE4Ad48bdBfba547Ef4316Db576A9Edbd) | No | DEFAULT_ADMIN_ROLE |

---

## Cross-Chain & Advanced DeFi Contracts (14-17)

| # | Contract Name | Purpose | Address | Upgradeable | Admin Controller |
|---|---------------|---------|---------|-------------|------------------|
| 14 | **CrossChainAndLaunchModule** | Cross-chain operations and launches | [`0x28623Ee5806ab9609483F4B68cb1AE212A092e4d`](https://arbitrum.blockscout.com/address/0x28623Ee5806ab9609483F4B68cb1AE212A092e4d) | No | DEFAULT_ADMIN_ROLE |
| 15 | **AxiomExchangeHub** | Internal DEX and token swaps | [`0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D`](https://arbitrum.blockscout.com/address/0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D) | No | DEFAULT_ADMIN_ROLE |
| 16 | **CitizenReputationOracle** | Citizen reputation scoring | [`0x649a0F1bd204b6f23A92f1CDbb2F1838D691B643`](https://arbitrum.blockscout.com/address/0x649a0F1bd204b6f23A92f1CDbb2F1838D691B643) | No | DEFAULT_ADMIN_ROLE |
| 17 | **IoTOracleNetwork** | IoT data validation and oracles | [`0xe38B3443E17A07953d10F7841D5568a27A73ec1a`](https://arbitrum.blockscout.com/address/0xe38B3443E17A07953d10F7841D5568a27A73ec1a) | No | DEFAULT_ADMIN_ROLE |

---

## Market Infrastructure Contracts (18-19)

| # | Contract Name | Purpose | Address | Upgradeable | Admin Controller |
|---|---------------|---------|---------|-------------|------------------|
| 18 | **MarketsAndListingsHub** | Tokenized securities and RWA trading | [`0x98a59D4fb5Fa974879E9F043C3174Ae82Fb9D830`](https://arbitrum.blockscout.com/address/0x98a59D4fb5Fa974879E9F043C3174Ae82Fb9D830) | No | DEFAULT_ADMIN_ROLE |
| 19 | **OracleAndMetricsRelay** | Price feeds and metrics | [`0x5c17F4621A47b4E8c357bAA6379b4B223BAA5Ac6`](https://arbitrum.blockscout.com/address/0x5c17F4621A47b4E8c357bAA6379b4B223BAA5Ac6) | No | DEFAULT_ADMIN_ROLE |

---

## Community & Engagement Contracts (20-22)

| # | Contract Name | Purpose | Address | Upgradeable | Admin Controller |
|---|---------------|---------|---------|-------------|------------------|
| 20 | **CommunitySocialHub** | Community features and social | [`0xC2f82eD5C2585B525E01F19eA5C28811AB43aF49`](https://arbitrum.blockscout.com/address/0xC2f82eD5C2585B525E01F19eA5C28811AB43aF49) | No | DEFAULT_ADMIN_ROLE |
| 21 | **AxiomAcademyHub** | Educational content and certifications | [`0x30667931BEe54a58B76D387D086A975aB37206F4`](https://arbitrum.blockscout.com/address/0x30667931BEe54a58B76D387D086A975aB37206F4) | No | DEFAULT_ADMIN_ROLE |
| 22 | **GamificationHub** | Rewards and gamification | [`0x7F455b4614E05820AAD52067Ef223f30b1936f93`](https://arbitrum.blockscout.com/address/0x7F455b4614E05820AAD52067Ef223f30b1936f93) | No | DEFAULT_ADMIN_ROLE |

---

## Sustainability Contracts (23)

| # | Contract Name | Purpose | Address | Upgradeable | Admin Controller |
|---|---------------|---------|---------|-------------|------------------|
| 23 | **SustainabilityHub** | Carbon credits and sustainability tracking | [`0xAf4dF8a7733BAB64b7Ce83F2494d6446eF9eC046`](https://arbitrum.blockscout.com/address/0xAf4dF8a7733BAB64b7Ce83F2494d6446eF9eC046) | No | DEFAULT_ADMIN_ROLE |

---

## Access Control Roles

All contracts use OpenZeppelin AccessControl with the following standard roles:

| Role | Description |
|------|-------------|
| `DEFAULT_ADMIN_ROLE` | Full administrative control, can grant/revoke roles |
| `PAUSER_ROLE` | Can pause/unpause contract operations |
| `MINTER_ROLE` | Can mint new tokens (AXM token only) |
| `COMPLIANCE_ROLE` | Manage compliance settings |
| `RESCUER_ROLE` | Rescue stuck tokens |
| `FEE_MANAGER_ROLE` | Configure fee parameters |
| `ORACLE_MANAGER_ROLE` | Update oracle data |
| `TREASURY_ROLE` | Treasury operations |

---

## Verification

All contracts are verified on Arbitrum Blockscout. To verify any contract:

1. Click the contract address link above
2. Navigate to the "Contract" tab
3. View the verified source code and ABI
4. Compare with source files in `/contracts/` directory

---

## Interface Contracts

The following interface contracts define the standard APIs:

| Interface | Purpose |
|-----------|---------|
| `IAxiomIdentityComplianceHub` | Identity and compliance interface |
| `IAxiomLandAndAssetRegistry` | Land and asset registry interface |
| `IAxiomStakingAndEmissionsHub` | Staking and emissions interface |
| `IAxiomTreasuryAndRevenueHub` | Treasury and revenue interface |

---

**Copyright (c) 2024 Axiom Protocol. All Rights Reserved.**
