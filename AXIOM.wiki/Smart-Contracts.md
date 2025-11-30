# Smart Contract Architecture

## Overview

Axiom Protocol has deployed 23 verified smart contracts on Arbitrum One, with additional contracts planned for the Universe Blockchain (L3).

> **Patent Pending:** Smart contract designs are proprietary and protected.

---

## Deployed Contracts (Arbitrum One)

For the complete list of all 23 contracts with addresses and verification status, see [docs/contract_registry.md](../docs/contract_registry.md).

### Core Protocol (6 contracts)

| Contract | Purpose |
|----------|---------|
| AxiomV2 (AXM Token) | ERC-20 governance token with fee routing |
| AxiomIdentityComplianceHub | KYC/AML verification hub |
| AxiomTreasuryAndRevenueHub | Protocol treasury and revenue distribution |
| AxiomStakingAndEmissionsHub | Token staking and emissions |
| CitizenCredentialRegistry | Citizen identity credentials |
| AxiomLandAndAssetRegistry | Land parcels and property registration |

### Real Estate / KeyGrow (3 contracts)

| Contract | Purpose |
|----------|---------|
| LeaseAndRentEngine | Lease management and equity conversion |
| RealtorModule | Realtor registration and commissions |
| CapitalPoolsAndFunds | Investment pools and option staking |

### DePIN Infrastructure (4 contracts)

| Contract | Purpose |
|----------|---------|
| DePINNodeSuite | Node staking and leasing |
| DePINNodeSales | Node sales with ETH/AXM payments |
| IoTOracleNetwork | IoT data validation |
| UtilityAndMeteringHub | Smart city utility metering |

### DEX & Trading (3 contracts)

| Contract | Purpose |
|----------|---------|
| AxiomExchangeHub | Internal DEX for token swaps |
| MarketsAndListingsHub | Tokenized securities trading |
| OracleAndMetricsRelay | Price feeds and metrics |

### Cross-Chain & Advanced (4 contracts)

| Contract | Purpose |
|----------|---------|
| CrossChainAndLaunchModule | Cross-chain operations |
| CitizenReputationOracle | Reputation scoring |
| TransportAndLogisticsHub | Transport tracking |
| SustainabilityHub | Carbon credits and sustainability |

### Community & Engagement (3 contracts)

| Contract | Purpose |
|----------|---------|
| CommunitySocialHub | Community features |
| AxiomAcademyHub | Educational content |
| GamificationHub | Rewards and achievements |

---

## Contract Summary

| Category | Count |
|----------|-------|
| Core Protocol | 6 |
| Real Estate (KeyGrow) | 3 |
| DePIN Infrastructure | 4 |
| DEX & Trading | 3 |
| Cross-Chain & Advanced | 4 |
| Community & Engagement | 3 |
| **Total Production Contracts** | **23** |

---

## Technical Standards

### Token Standards
- **ERC-20** - AXM governance token
- **ERC-1155** - Property shares (multi-token)
- **ERC-721** - Unique certificates (planned)

### Security Features
- OpenZeppelin Contracts v5.x base
- Solidity 0.8.20+ with overflow protection
- ReentrancyGuard on state-changing functions
- Role-based AccessControl
- Pausable functionality
- Immutable (non-upgradeable) contracts

### Compliance
- ISO 20022 data formats
- GENIUS Act ready
- KYC/AML integration points
- Audit trails

---

## Development Stack

```
Solidity 0.8.20+
├── OpenZeppelin Contracts v5.x
├── Hardhat (development)
├── Ethers.js (interaction)
└── Arbitrum One (deployment)
```

---

## Security Audits

- Internal security review: Complete
- External audit: Planned Q1 2025
- Bug bounty: Planned

See [docs/security.md](../docs/security.md) for complete security documentation.

---

## Future Contracts

### Universe Blockchain (L3)
- Native AXM as gas token
- Optimized for smart city operations
- Custom precompiles
- Higher throughput

---

**Licensing Required:** licensing@axiomprotocol.io

Copyright (c) 2024 Axiom Protocol. All Rights Reserved.
