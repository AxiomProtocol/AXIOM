# Axiom Protocol Contracts Index

> **Contract Classification Guide**
> 
> This document categorizes all smart contracts by domain and development status.

---

## Status Legend

| Status | Description |
|--------|-------------|
| **Production** | Deployed, verified, and active on Arbitrum One mainnet |
| **In Active Development** | Being developed, not yet deployed to mainnet |
| **Deprecated** | No longer maintained, kept for reference only |

---

## Token & Treasury Domain

| Contract | File | Status | Purpose |
|----------|------|--------|---------|
| AxiomV2 | `AxiomV2.sol` | **Production** | ERC-20 governance token with fee routing and compliance |
| AxiomTreasuryAndRevenueHub | (Interface: `IAxiomTreasuryAndRevenueHub.sol`) | **Production** | Protocol treasury and revenue distribution |
| AxiomStakingAndEmissionsHub | (Interface: `IAxiomStakingAndEmissionsHub.sol`) | **Production** | Token staking and emissions schedule |
| CapitalPoolsAndFunds | `CapitalPoolsAndFunds.sol` | **Production** | Investment pools and fund management |

---

## Real Estate (KeyGrow) Domain

| Contract | File | Status | Purpose |
|----------|------|--------|---------|
| LeaseAndRentEngine | `LeaseAndRentEngine.sol` | **Production** | Lease agreements, rent processing, equity conversion |
| RealtorModule | `RealtorModule.sol` | **Production** | Realtor registration and commission management |
| AxiomLandAndAssetRegistry | (Interface: `IAxiomLandAndAssetRegistry.sol`) | **Production** | Land parcels and property asset registration |

---

## DePIN Infrastructure Domain

| Contract | File | Status | Purpose |
|----------|------|--------|---------|
| DePINNodeSuite | `DePINNodeSuite.sol` | **Production** | Node staking, leasing, and reward distribution |
| DePINNodeSales | `DePINNodeSales.sol` | **Production** ⭐ (Most recent: Nov 26, 2025) | Node sales with ETH/AXM payments, DEX integration |
| IoTOracleNetwork | `IoTOracleNetwork.sol` | **Production** | IoT data validation and oracle feeds |
| UtilityAndMeteringHub | `UtilityAndMeteringHub.sol` | **Production** | Smart city utility metering and billing |

---

## Identity & Compliance Domain

| Contract | File | Status | Purpose |
|----------|------|--------|---------|
| AxiomIdentityComplianceHub | (Interface: `IAxiomIdentityComplianceHub.sol`) | **Production** | KYC/AML verification and compliance management |
| CitizenCredentialRegistry | `CitizenCredentialRegistry.sol` | **Production** | Citizen identity credentials and verification |
| CitizenReputationOracle | `CitizenReputationOracle.sol` | **Production** | Reputation scoring and trust metrics |

---

## DEX & Trading Domain

| Contract | File | Status | Purpose |
|----------|------|--------|---------|
| AxiomExchangeHub | `AxiomExchangeHub.sol` | **Production** | Internal DEX for token swaps |
| MarketsAndListingsHub | `MarketsAndListingsHub.sol` | **Production** | Tokenized securities and RWA trading |
| OracleAndMetricsRelay | `OracleAndMetricsRelay.sol` | **Production** | Price feeds and market metrics |

---

## Cross-Chain & L3 Domain

| Contract | File | Status | Purpose |
|----------|------|--------|---------|
| CrossChainAndLaunchModule | `CrossChainAndLaunchModule.sol` | **Production** | Cross-chain operations and token launches |

---

## Smart City Services Domain

| Contract | File | Status | Purpose |
|----------|------|--------|---------|
| TransportAndLogisticsHub | `TransportAndLogisticsHub.sol` | **Production** | Transport tracking and logistics management |
| SustainabilityHub | `SustainabilityHub.sol` | **Production** | Carbon credits and sustainability tracking |

---

## Community & Engagement Domain

| Contract | File | Status | Purpose |
|----------|------|--------|---------|
| CommunitySocialHub | `CommunitySocialHub.sol` | **Production** | Community features and social engagement |
| AxiomAcademyHub | `AxiomAcademyHub.sol` | **Production** | Educational content and certifications |
| GamificationHub | `GamificationHub.sol` | **Production** | Rewards, achievements, and gamification |

---

## Interface Contracts

| Interface | File | Purpose |
|-----------|------|---------|
| IAxiomIdentityComplianceHub | `interfaces/IAxiomIdentityComplianceHub.sol` | Identity and compliance API |
| IAxiomLandAndAssetRegistry | `interfaces/IAxiomLandAndAssetRegistry.sol` | Land and asset registry API |
| IAxiomStakingAndEmissionsHub | `interfaces/IAxiomStakingAndEmissionsHub.sol` | Staking and emissions API |
| IAxiomTreasuryAndRevenueHub | `interfaces/IAxiomTreasuryAndRevenueHub.sol` | Treasury and revenue API |

---

## Contract Count Summary

| Category | Count |
|----------|-------|
| Token & Treasury | 4 |
| Real Estate (KeyGrow) | 3 |
| DePIN Infrastructure | 4 |
| Identity & Compliance | 3 |
| DEX & Trading | 3 |
| Cross-Chain & L3 | 1 |
| Smart City Services | 2 |
| Community & Engagement | 3 |
| **Total Production Contracts** | **23** |
| Interface Contracts | 4 |

---

## Directory Structure

```
contracts/
├── interfaces/
│   ├── IAxiomIdentityComplianceHub.sol
│   ├── IAxiomLandAndAssetRegistry.sol
│   ├── IAxiomStakingAndEmissionsHub.sol
│   └── IAxiomTreasuryAndRevenueHub.sol
├── AxiomAcademyHub.sol
├── AxiomExchangeHub.sol
├── AxiomV2.sol
├── CapitalPoolsAndFunds.sol
├── CitizenCredentialRegistry.sol
├── CitizenReputationOracle.sol
├── CommunitySocialHub.sol
├── CrossChainAndLaunchModule.sol
├── DePINNodeSales.sol
├── DePINNodeSuite.sol
├── GamificationHub.sol
├── IoTOracleNetwork.sol
├── LeaseAndRentEngine.sol
├── MarketsAndListingsHub.sol
├── OracleAndMetricsRelay.sol
├── RealtorModule.sol
├── SustainabilityHub.sol
├── TransportAndLogisticsHub.sol
├── UtilityAndMeteringHub.sol
├── AxiomV2.abi.json
├── deployment-info.json
└── README.md
```

---

**Copyright (c) 2024 Axiom Protocol. All Rights Reserved.**
