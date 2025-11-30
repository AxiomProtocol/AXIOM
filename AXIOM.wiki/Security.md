# Security

## Overview

Axiom Protocol powers a comprehensive financial and real-world asset infrastructure, including tokenized real estate, banking products, and decentralized physical infrastructure (DePIN). Given the scope and sensitivity of these operations, the protocol is designed with defense in depth, least privilege access controls, and transparency as foundational principles.

This document describes the current security architecture, administrative controls, audit status, and responsible disclosure process.

> **Reference:** For detailed technical security documentation including code snippets and role hashes, see [docs/security.md](../docs/security.md).

---

## Smart Contract Security Architecture

### Libraries and Standards

Axiom Protocol smart contracts are built on well-audited, industry-standard foundations:

| Component | Implementation |
|-----------|----------------|
| **Base Contracts** | OpenZeppelin Contracts v5.x |
| **Compiler** | Solidity 0.8.20+ with built-in overflow/underflow protection |
| **Token Standards** | ERC-20 (AXM), ERC-1155 (property shares planned) |
| **Access Control** | OpenZeppelin AccessControl with role-based permissions (on core contracts) |
| **Reentrancy Protection** | ReentrancyGuard on select state-changing functions |
| **Pausability** | Pausable pattern available for emergency use (on select contracts) |

### Security Features

The protocol implements security best practices on core contracts:

- **Role-Based Access Control (RBAC)** - Sensitive functions require specific roles (MINTER_ROLE, PAUSER_ROLE, TREASURY_ROLE, etc.)
- **Reentrancy Guards** - Applied to state-changing functions where applicable
- **Supply Cap Enforcement** - Hard cap of 15 billion AXM tokens enforced in AxiomV2
- **Input Validation** - External function inputs validated in contract functions
- **Event Logging** - State changes emit events for transparency

> **Note:** Security features are not implemented uniformly across all contracts. For specific implementation details per contract, see [docs/security.md](../docs/security.md). Contract source code can be verified on Arbitrum Blockscout for contracts listed in the [Contract Registry](../docs/contract_registry.md).

### Contract Upgradeability

The current deployed contracts follow an immutable design pattern (non-upgradeable).

Benefits of this approach:
- Predictable, auditable behavior
- No hidden upgrade risks during initial deployment phase

> **Important:** The immutability of individual contracts should be verified by examining the contract source code on the block explorer. Future contracts may implement the UUPS proxy pattern with multi-signature and timelock controls if upgradeability is required.

---

## Admin Controls and Governance

### Role Structure

Critical operations are gated by specific roles. Key roles include:

| Role | Purpose |
|------|---------|
| DEFAULT_ADMIN_ROLE | Grant/revoke other roles |
| PAUSER_ROLE | Emergency pause capability |
| MINTER_ROLE | Token minting (capped) |
| COMPLIANCE_ROLE | KYC/AML settings |
| TREASURY_ROLE | Treasury operations |
| FEE_MANAGER_ROLE | Fee configuration |

For specific role assignments per contract, see [docs/security.md](../docs/security.md).

### Pausable Contracts

Multiple contracts implement emergency pause capability using OpenZeppelin's Pausable pattern.

For the complete list of pausable contracts and their pause controllers, see [docs/security.md](../docs/security.md).

### Current Admin Configuration

| Setting | Current Status |
|---------|----------------|
| Admin Type | Externally Owned Account (EOA) |
| Admin Address | `0x2bB2c2A7a1d82097488bf0b9c2a59c1910CD8D5d` |
| Multi-sig Wallet | **Planned** - 3-of-5 configuration at TGE |
| Timelock | **Planned** - 48-hour delay post-TGE |

### Governance Transition Roadmap

1. **Pre-TGE (Current)**: Single admin EOA for development agility
2. **At TGE (Q1 2026)**: Transition to 3-of-5 multi-signature wallet
3. **Post-TGE**: Full DAO governance with 48-hour timelock on critical operations

---

## Audits, Testing, and Rollout

### Audit Status

**No external security audits have been completed yet.**

The core contracts are being prepared for third-party audits before mainnet launch and TGE.

### Internal Testing

- **Internal Security Review**: Completed for deployed contracts
- **Methodology**: Manual code review and static analysis
- **Findings**: Issues identified during internal review were addressed before deployment

> **Disclaimer:** Internal reviews do not substitute for independent third-party security audits. External audits are planned before TGE.

### Audit Roadmap

| Priority | Component | Target Timeline |
|----------|-----------|-----------------|
| 1 | AxiomV2 Token | Q1 2025 |
| 2 | Staking & Treasury | Q1 2025 |
| 3 | KeyGrow Contracts | Q2 2025 |
| 4 | DePIN Infrastructure | Q2 2025 |
| 5 | Market Contracts | Q3 2025 |
| 6 | Remaining Contracts | Q3-Q4 2025 |

### Rollout Strategy

- **Staged Deployments**: New features deployed to testnet before mainnet
- **Gradual Activation**: Features enabled incrementally with monitoring
- **Emergency Response**: Pause capabilities for rapid incident response

---

## Responsible Disclosure

### Reporting Security Vulnerabilities

Security vulnerabilities should be reported to:

**Email:** security@axiomprotocol.io

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested remediation (optional)

### Disclosure Policy

We ask that security researchers:

1. **Do not publicly disclose** vulnerabilities until they have been addressed
2. **Do not exploit** vulnerabilities beyond proof-of-concept demonstration
3. **Do not access or modify** user data during research
4. **Allow reasonable time** for remediation (90-day standard disclosure window)

Good faith security research is welcomed and appreciated. Exploitation or abuse of vulnerabilities is not permitted and may be subject to legal action.

### Bug Bounty Program

A bug bounty program is planned for launch concurrent with external audits.

| Severity | Planned Reward Range |
|----------|---------------------|
| Critical | Up to $50,000 |
| High | Up to $20,000 |
| Medium | Up to $5,000 |
| Low | Up to $1,000 |

---

## Related Documentation

- [[Smart Contracts]] - Full contract list and addresses
- [[Tokenomics]] - Token economics and supply details
- [[Roadmap]] - Development timeline including security milestones

---

**Contact:** security@axiomprotocol.io

Copyright (c) 2024 Axiom Protocol. All Rights Reserved.
