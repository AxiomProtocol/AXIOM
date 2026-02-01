# Axiom Smart Contract Map

**Scan Date:** December 21, 2025  
**Total Contracts:** 24  
**Network:** Arbitrum One (Chain ID: 42161)  
**Deployer:** 0xDFf9e47eb007bF02e47477d577De9ffA99791528  
**Admin/Treasury Vault:** 0x2bB2c2A7a1d82097488bf0b9c2a59c1910CD8D5d

---

## Contract Inventory (24 Contracts)

### Core Infrastructure (1-6)

| # | Contract | Address | Source File | Category |
|---|----------|---------|-------------|----------|
| 1 | AxiomV2 (AXM Token) | 0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D | contracts/AxiomV2.sol | Core Token |
| 2 | AxiomIdentityComplianceHub | 0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED | contracts/interfaces/IAxiomIdentityComplianceHub.sol (interface only) | Identity |
| 3 | AxiomTreasuryAndRevenueHub | 0x3fD63728288546AC41dAe3bf25ca383061c3A929 | contracts/interfaces/IAxiomTreasuryAndRevenueHub.sol (interface only) | Treasury |
| 4 | AxiomStakingAndEmissionsHub | 0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885 | contracts/interfaces/IAxiomStakingAndEmissionsHub.sol (interface only) | Staking |
| 5 | CitizenCredentialRegistry | 0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344 | contracts/CitizenCredentialRegistry.sol | Identity |
| 6 | AxiomLandAndAssetRegistry | 0xaB15907b124620E165aB6E464eE45b178d8a6591 | contracts/interfaces/IAxiomLandAndAssetRegistry.sol (interface only) | Real Estate |

### Real Estate & Rental (7-9)

| # | Contract | Address | Source File | Category |
|---|----------|---------|-------------|----------|
| 7 | LeaseAndRentEngine | 0x00591d360416dE7b016bBedbC6AA1AE798eA873B | contracts/LeaseAndRentEngine.sol | Real Estate |
| 8 | RealtorModule | 0x579EA6FC512E5f1b4FC77d5f4f03aA976fa40412 | contracts/RealtorModule.sol | Real Estate |
| 9 | CapitalPoolsAndFunds | 0xFcCdC1E353b24936f9A8D08D21aF684c620fa701 | contracts/CapitalPoolsAndFunds.sol | Treasury |

### DeFi Banking & Utilities (10-13)

| # | Contract | Address | Source File | Category |
|---|----------|---------|-------------|----------|
| 10 | UtilityAndMeteringHub | 0xac55BE7E1A6613c5DA66f7AC9520FfD24eF3212d | contracts/UtilityAndMeteringHub.sol | Smart City |
| 11 | TransportAndLogisticsHub | 0x959c5dd99B170e2b14B1F9b5a228f323946F514e | contracts/TransportAndLogisticsHub.sol | Smart City |
| 12 | DePINNodeSuite | 0x223dF824B320beD4A8Fd0648b242621e4d01aAEF | contracts/DePINNodeSuite.sol | DePIN |
| 13 | DePINNodeSales | 0x876951CaE4Ad48bdBfba547Ef4316Db576A9Edbd | contracts/DePINNodeSales.sol | DePIN |

### Cross-Chain & Advanced DeFi (14-16)

| # | Contract | Address | Source File | Category |
|---|----------|---------|-------------|----------|
| 14 | CrossChainAndLaunchModule | 0x28623Ee5806ab9609483F4B68cb1AE212A092e4d | contracts/CrossChainAndLaunchModule.sol | Cross-Chain |
| 15 | AxiomExchangeHub (DEX) | 0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D | contracts/AxiomExchangeHub.sol | DEX |
| 16 | CitizenReputationOracle | 0x649a0F1bd204b6f23A92f1CDbb2F1838D691B643 | contracts/CitizenReputationOracle.sol | Identity |

### Market Infrastructure (17-18)

| # | Contract | Address | Source File | Category |
|---|----------|---------|-------------|----------|
| 17 | MarketsAndListingsHub | 0x98a59D4fb5Fa974879E9F043C3174Ae82Fb9D830 | contracts/MarketsAndListingsHub.sol | Markets |
| 18 | OracleAndMetricsRelay | 0x5c17F4621A47b4E8c357bAA6379b4B223BAA5Ac6 | contracts/OracleAndMetricsRelay.sol | Oracle |

### IoT & Smart City (17-18 continued)

| # | Contract | Address | Source File | Category |
|---|----------|---------|-------------|----------|
| 17 | IoTOracleNetwork | 0xe38B3443E17A07993d10F7841D5568a27A73ec1a | contracts/IoTOracleNetwork.sol | Smart City |

### Community & Engagement (19-21)

| # | Contract | Address | Source File | Category |
|---|----------|---------|-------------|----------|
| 19 | CommunitySocialHub | 0xC2f82eD5C2585B525E01F19eA5C28811AB43aF49 | contracts/CommunitySocialHub.sol | Community |
| 20 | AxiomAcademyHub | 0x30667931BEe54a58B76D387D086A975aB37206F4 | contracts/AxiomAcademyHub.sol | Academy |
| 21 | GamificationHub | 0x7F455b4614E05820AAD52067Ef223f30b1936f93 | contracts/GamificationHub.sol | Gamification |

### Sustainability (22)

| # | Contract | Address | Source File | Category |
|---|----------|---------|-------------|----------|
| 22 | SustainabilityHub | 0xAf4dF8a7733BAB64b7Ce83F2494d6446eF9eC046 | contracts/SustainabilityHub.sol | Sustainability |

### Community Finance (23-24)

| # | Contract | Address | Source File | Category |
|---|----------|---------|-------------|----------|
| 23 | AxiomSusuHub | 0x6C69D730327930B49A7997B7b5fb0865F30c95A5 | contracts/AxiomSusuHub.sol | Community |

---

## Source Availability Summary

| Status | Count | Notes |
|--------|-------|-------|
| Full Source Available | 20 | Complete .sol files in contracts/ |
| Interface Only | 4 | IdentityComplianceHub, TreasuryAndRevenueHub, StakingAndEmissionsHub, LandAndAssetRegistry |

The 4 interface-only contracts are deployed on Arbitrum One but their full source is not in this repository. Only minimal interfaces for role management and integration are provided.

---

## Common Patterns Across All Contracts

### Security Features
- All contracts use OpenZeppelin AccessControl for role-based permissions
- All contracts use ReentrancyGuard on state-changing functions
- All contracts implement Pausable for emergency stops
- No upgradeable proxy patterns (all immutable deployments)

### Role Structure
- DEFAULT_ADMIN_ROLE: Overall admin access
- ADMIN_ROLE: Contract-specific admin functions
- Contract-specific roles (POOL_MANAGER_ROLE, VERIFIER_ROLE, etc.)

### Fee Configuration
- Fees expressed in basis points (BPS_DENOMINATOR = 10000)
- Protocol fees route to treasury vault
- Configurable by admin roles

---

## Contracts with SUSU-Relevant Primitives

See CONTRACT_REUSE_ANALYSIS.md for detailed analysis of reusability for SUSU features.
