# AXIOM Protocol - Current Roles and Permissions

**Version:** 1.0  
**Network:** Arbitrum One (Chain ID: 42161)  
**Last Updated:** February 2, 2026  
**Last On-Chain Enumeration:** February 2, 2026 (Genesis Snapshot)  
**Source:** [GENESIS_SNAPSHOT.md](./GENESIS_SNAPSHOT.md), [module-to-contract-map.md](./module-to-contract-map.md)  
**Scope:** Governance contracts only. Other contract roles require on-chain enumeration.

---

## Overview

This document enumerates the access control roles across AXIOM Protocol contracts and their current holders.

---

## Role Hierarchy

```
DEFAULT_ADMIN_ROLE (0x00)
├── RISK_COMMITTEE_ROLE     → Propose risk parameter changes
├── SETTLEMENT_AUTHORITY    → Execute settlements
├── GUARDIAN_ROLE           → Emergency pause (immediate)
├── OPERATOR_ROLE           → Day-to-day operations
├── REGISTRAR_ROLE          → Asset registration
├── MINTER_ROLE             → Token minting (if enabled)
└── CIRCUIT_BREAKER_ROLE    → Automated emergency triggers
```

---

## Role Definitions

*Source: [module-to-contract-map.md](./module-to-contract-map.md)*

| Role | Keccak256 Hash | Description |
|------|----------------|-------------|
| DEFAULT_ADMIN_ROLE | `0x0000...0000` | Full administrative control |
| PAUSER_ROLE | Standard OZ | Pause/unpause operations |
| MINTER_ROLE | Standard OZ | Mint tokens (AXM only) |
| COMPLIANCE_ROLE | Contract-specific | Manage compliance |
| RESCUER_ROLE | Contract-specific | Rescue stuck tokens |
| FEE_MANAGER_ROLE | Contract-specific | Configure fees |
| GUARDIAN_ROLE | Contract-specific | Emergency pause (immediate) |
| RISK_COMMITTEE_ROLE | Contract-specific | Risk parameter updates |
| SETTLEMENT_AUTHORITY_ROLE | Contract-specific | Product activation |
| OPERATOR_ROLE | Contract-specific | Day-to-day operations |
| PROPOSER_ROLE | Standard OZ Timelock | Queue timelock operations |
| EXECUTOR_ROLE | Standard OZ Timelock | Execute after delay |
| CANCELLER_ROLE | Standard OZ Timelock | Cancel queued operations |
| CIRCUIT_BREAKER_ROLE | Contract-specific | Automated emergency triggers |

*Note: "Standard OZ" = OpenZeppelin standard hash. "Contract-specific" = derive hash on-chain via keccak256(role_name).*

---

## Current Role Assignments

### Gnosis Safe Multi-Sig

**Address:** `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d`

| Contract | Role | Status |
|----------|------|--------|
| GovernanceHub | DEFAULT_ADMIN_ROLE | Assigned |
| GovernanceHub | GUARDIAN_ROLE | Assigned |
| AxiomTimelockController | DEFAULT_ADMIN_ROLE | Assigned |
| AxiomTimelockController | PROPOSER_ROLE | Assigned |
| AxiomTimelockController | CANCELLER_ROLE | Assigned |
| AxiomTimelockController | GUARDIAN_ROLE | Assigned |
| AxiomTimelockController | CIRCUIT_BREAKER_ROLE | Assigned |
| AxiomTreasuryAndRevenueHub | DEFAULT_ADMIN_ROLE | Assigned |
| AxiomV2 (AXM Token) | DEFAULT_ADMIN_ROLE | Assigned |

### Open Executor (Anyone)

**Address:** `0x0000000000000000000000000000000000000000`

| Contract | Role | Status |
|----------|------|--------|
| AxiomTimelockController | EXECUTOR_ROLE | Open (anyone can execute after delay) |

### Pending Assignments (TBD)

| Contract | Role | Current Holder | Notes |
|----------|------|----------------|-------|
| GovernanceHub | RISK_COMMITTEE_ROLE | TBD | Risk parameter updates |
| GovernanceHub | SETTLEMENT_AUTHORITY_ROLE | TBD | Product activation |

---

## Governance Contract Roles

### GovernanceHub (`0x52Dc85fd653a75323b5307f4D2629ab9A070530E`)

| Role | Current Holder | Purpose |
|------|----------------|---------|
| DEFAULT_ADMIN_ROLE | Gnosis Safe | Full administrative control |
| RISK_COMMITTEE_ROLE | TBD | Risk parameter updates |
| SETTLEMENT_AUTHORITY_ROLE | TBD | Product activation |
| GUARDIAN_ROLE | Gnosis Safe | Emergency pause |

### AxiomTimelockController (`0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899`)

| Role | Current Holder | Purpose |
|------|----------------|---------|
| DEFAULT_ADMIN_ROLE | Gnosis Safe | Full admin |
| PROPOSER_ROLE | Gnosis Safe | Queue operations |
| EXECUTOR_ROLE | Open (anyone) | Execute after delay |
| CANCELLER_ROLE | Gnosis Safe | Cancel queued ops |
| GUARDIAN_ROLE | Gnosis Safe | Emergency pause (immediate) |
| CIRCUIT_BREAKER_ROLE | Gnosis Safe | Automated emergency |

---

## Function Access Classification

### Timelocked Functions (24h delay)

| Contract | Function | Required Role |
|----------|----------|---------------|
| AxiomTreasuryAndRevenueHub | `setAllocation()` | DEFAULT_ADMIN |
| AxiomTreasuryAndRevenueHub | `updateAllocation()` | DEFAULT_ADMIN |
| AxiomTreasuryAndRevenueHub | `setVaultAddresses()` | DEFAULT_ADMIN |
| AxiomTimelockController | `updateDelay()` | DEFAULT_ADMIN |
| AxiomTimelockController | `grantRole()` | DEFAULT_ADMIN |
| AxiomTimelockController | `revokeRole()` | DEFAULT_ADMIN |
| RiskConfig | `setMaxLTV()` | RISK_COMMITTEE |
| RiskConfig | `setLiquidationBonus()` | RISK_COMMITTEE |
| AxiomV2 | `setFeeRates()` | DEFAULT_ADMIN |

### Emergency Functions (Immediate - No Timelock)

| Contract | Function | Required Role |
|----------|----------|---------------|
| All Pausable | `pause()` | GUARDIAN |
| All Pausable | `unpause()` | DEFAULT_ADMIN |
| AxiomTreasuryAndRevenueHub | `emergencySweep()` | GUARDIAN |
| GovernanceHub | `pauseLending()` | GUARDIAN |
| GovernanceHub | `unpauseLending()` | SETTLEMENT_AUTHORITY |
| AxiomTimelockController | `emergencyPause()` | GUARDIAN |
| AxiomTimelockController | `triggerCircuitBreaker()` | CIRCUIT_BREAKER |

### Unrestricted Functions (Public)

| Contract | Function | Access |
|----------|----------|--------|
| AxiomV2 | `transfer()` | Token Owner |
| All DEX | `addLiquidity()` | Public |
| All DEX | `removeLiquidity()` | LP Owner |
| Lending | `requestLoan()` | Public |
| AxiomTimelockController | `execute()` | Anyone (after delay) |

---

## Node Operator Program Roles (Planned)

The following roles are planned for the Node Operator Program:

| Role | Purpose | Gating |
|------|---------|--------|
| PROGRAM_ADMIN | Full program administration | DEFAULT_ADMIN grant |
| PROGRAM_REVIEWER | Approve operator applications | Timelocked grant |
| SLA_ORACLE | Post SLA reports | Timelocked grant |
| CREDENTIAL_ISSUER | Issue operator credentials | Timelocked grant |
| RESEARCH_ATTESTOR_A_ROLE | First attestation signer | Timelocked grant |
| RESEARCH_ATTESTOR_B_ROLE | Second attestation signer | Timelocked grant |
| REPORTING_ORACLE_ROLE | Readiness data posting | Timelocked grant |

---

## Role Enumeration Script

To enumerate current role holders on-chain, run the following script:

```typescript
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://arb-mainnet.g.alchemy.com/v2/YOUR_API_KEY');

const GOVERNANCE_HUB = '0x52Dc85fd653a75323b5307f4D2629ab9A070530E';
const TIMELOCK = '0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899';

const ACCESS_CONTROL_ABI = [
  'function getRoleMemberCount(bytes32 role) view returns (uint256)',
  'function getRoleMember(bytes32 role, uint256 index) view returns (address)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
];

const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';

async function enumerateRoles(contractAddress: string) {
  const contract = new ethers.Contract(contractAddress, ACCESS_CONTROL_ABI, provider);
  
  const count = await contract.getRoleMemberCount(DEFAULT_ADMIN_ROLE);
  console.log(`${contractAddress}: ${count} DEFAULT_ADMIN holders`);
  
  for (let i = 0; i < count; i++) {
    const member = await contract.getRoleMember(DEFAULT_ADMIN_ROLE, i);
    console.log(`  - ${member}`);
  }
}

enumerateRoles(GOVERNANCE_HUB);
enumerateRoles(TIMELOCK);
```

---

## Role Management Best Practices

### Granting Roles

1. All role grants must go through AxiomTimelockController (24h delay)
2. Propose via Gnosis Safe multi-sig
3. Wait for timelock delay
4. Execute after delay expires
5. Verify role assignment on-chain

### Revoking Roles

1. Same process as granting
2. Emergency revocation can use GUARDIAN pause first
3. Document reason for revocation

### Role Verification

After any role change, verify:
1. `hasRole()` returns expected value
2. `getRoleMemberCount()` is correct
3. Audit log updated

---

## Audit Checklist

- [ ] All DEFAULT_ADMIN holders documented
- [ ] All GUARDIAN holders documented
- [ ] Pending role assignments tracked
- [ ] Role enumeration script tested
- [ ] Emergency procedures verified

---

## Related Documentation

- [deployments.md](./deployments.md) - Deployed addresses
- [contract-registry.md](./contract-registry.md) - Contract classification
- [module-to-contract-map.md](./module-to-contract-map.md) - Function-level mapping
- [GENESIS_SNAPSHOT.md](./GENESIS_SNAPSHOT.md) - Genesis baseline

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-02 | Initial creation from Genesis Snapshot and module map |
