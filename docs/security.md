# Axiom Protocol Security Documentation

> **Security Posture Overview**
> 
> This document describes the current security status, audit roadmap, and administrative controls for all Axiom Protocol smart contracts. Last updated: November 2025.

---

## Audit Status

### External Audits Completed

**No external audits have been completed yet.**

External security audits are planned and in active preparation. The protocol is seeking qualified audit firms specializing in DeFi and ERC-20 token contracts.

### Audit Roadmap

| Priority | Component | Scope | Target Timeline |
|----------|-----------|-------|-----------------|
| 1 | **AxiomV2 Token** | ERC-20 core, fee routing, access control | Q1 2025 |
| 2 | **Staking & Treasury** | AxiomStakingAndEmissionsHub, AxiomTreasuryAndRevenueHub | Q1 2025 |
| 3 | **KeyGrow Contracts** | LeaseAndRentEngine, CapitalPoolsAndFunds | Q2 2025 |
| 4 | **DePIN Infrastructure** | DePINNodeSuite, DePINNodeSales | Q2 2025 |
| 5 | **Market Contracts** | MarketsAndListingsHub, AxiomExchangeHub | Q3 2025 |
| 6 | **Remaining Contracts** | All other deployed contracts | Q3-Q4 2025 |

### Internal Security Review

- **Status**: Completed
- **Scope**: All 23 deployed contracts
- **Methodology**: Manual code review, static analysis, test coverage
- **Findings**: All critical and high-severity issues addressed before deployment

---

## Admin and Governance Control

### Role-Based Access Control

All contracts implement OpenZeppelin's AccessControl pattern. The following roles exist across the contract system:

#### Core Roles

| Role | Bytes32 Hash | Description | Contracts Using |
|------|--------------|-------------|-----------------|
| `DEFAULT_ADMIN_ROLE` | `0x00` | Full admin, can grant/revoke roles | All contracts |
| `PAUSER_ROLE` | `keccak256("PAUSER_ROLE")` | Emergency pause capability | AxiomV2, all pausable contracts |
| `MINTER_ROLE` | `keccak256("MINTER_ROLE")` | Token minting (capped at MAX_SUPPLY) | AxiomV2 |
| `COMPLIANCE_ROLE` | `keccak256("COMPLIANCE_ROLE")` | Manage KYC/AML settings | AxiomV2, IdentityComplianceHub |
| `RESCUER_ROLE` | `keccak256("RESCUER_ROLE")` | Rescue stuck tokens | AxiomV2 |
| `FEE_MANAGER_ROLE` | `keccak256("FEE_MANAGER_ROLE")` | Configure fee parameters | AxiomV2 |
| `ORACLE_MANAGER_ROLE` | `keccak256("ORACLE_MANAGER_ROLE")` | Update oracle data | AxiomV2, IoTOracleNetwork |
| `TREASURY_ROLE` | `keccak256("TREASURY_ROLE")` | Treasury operations | AxiomV2, TreasuryAndRevenueHub |

### Pausable Contracts

The following contracts can be paused in emergency situations:

| Contract | Pause Capability | Controller |
|----------|------------------|------------|
| AxiomV2 (AXM Token) | Yes - all transfers | PAUSER_ROLE |
| AxiomStakingAndEmissionsHub | Yes - staking operations | PAUSER_ROLE |
| AxiomExchangeHub | Yes - swaps and trades | PAUSER_ROLE |
| DePINNodeSales | Yes - purchases | PAUSER_ROLE |

### Current Admin Configuration

| Setting | Value |
|---------|-------|
| Admin Type | Externally Owned Account (EOA) |
| Admin Address | `0x2bB2c2A7a1d82097488bf0b9c2a59c1910CD8D5d` |
| Multi-sig | Planned for post-TGE governance |
| Timelock | Planned for post-TGE governance |

### Planned Governance Upgrades

1. **Pre-TGE**: Single admin EOA for rapid development
2. **At TGE**: Transition to multi-signature wallet (3-of-5)
3. **Post-TGE**: Full DAO governance with timelock (48-hour delay)

---

## Contract Security Features

### AxiomV2 Token Security

```
Security Features:
├── ReentrancyGuard - Prevents reentrancy attacks
├── Pausable - Emergency pause functionality
├── AccessControl - Role-based permissions
├── Supply Cap - MAX_SUPPLY enforcement (15B tokens)
├── Anti-Whale - Configurable max transfer limits
└── Permit - EIP-2612 gasless approvals
```

### Code References

#### Pause Functionality (AxiomV2.sol)
```solidity
function pause() external onlyRole(PAUSER_ROLE) {
    _pause();
}

function unpause() external onlyRole(PAUSER_ROLE) {
    _unpause();
}
```

#### Supply Cap Enforcement (AxiomV2.sol)
```solidity
function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
    require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
    _mint(to, amount);
}
```

---

## Smart Contract Best Practices

### Applied Standards

- [x] OpenZeppelin Contracts v5.x base
- [x] Solidity 0.8.20+ with built-in overflow checks
- [x] ReentrancyGuard on state-changing functions
- [x] AccessControl for all privileged operations
- [x] Events for all state changes
- [x] Input validation on all external functions
- [x] Verified source code on block explorer

### Upgradeability

**All currently deployed contracts are immutable (non-upgradeable).**

This design choice ensures:
- No hidden upgrade risks
- Full code transparency
- Predictable behavior

Future contracts may use UUPS proxy pattern if upgradeability is required, with:
- 48-hour timelock on upgrades
- Multi-sig requirement
- Community notification

---

## Bug Bounty Program

### Status

A bug bounty program is planned for launch concurrent with external audits.

### Planned Scope

| Severity | Reward Range |
|----------|--------------|
| Critical | Up to $50,000 |
| High | Up to $20,000 |
| Medium | Up to $5,000 |
| Low | Up to $1,000 |

### Reporting

Security vulnerabilities should be reported to: **security@axiomprotocol.io**

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested remediation (optional)

---

## Responsible Disclosure

We request that security researchers:

1. Do not publicly disclose vulnerabilities until addressed
2. Do not exploit vulnerabilities beyond proof-of-concept
3. Do not access or modify user data
4. Allow reasonable time for remediation (90 days standard)

---

**Copyright (c) 2024 Axiom Protocol. All Rights Reserved.**
