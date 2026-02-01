# GovernanceHub Migration Guide

## Overview

This document describes the migration from API-based governance to on-chain GovernanceHub for the Axiom Lending infrastructure.

## New Contract Address

| Contract | Address | Network |
|----------|---------|---------|
| GovernanceHub | `[TO BE DEPLOYED]` | Arbitrum One |

## GovernanceHub Roles

| Role | Purpose | Recommended Holder |
|------|---------|-------------------|
| DEFAULT_ADMIN_ROLE | Full admin access, role management | Protocol multisig |
| RISK_COMMITTEE_ROLE | Propose risk parameter changes | Risk committee multisig |
| SETTLEMENT_AUTHORITY_ROLE | Approve deal lifecycle actions | Settlement multisig |
| GUARDIAN_ROLE | Emergency pause (immediate) | Security EOA or multisig |

## Timelock Configuration

| Parameter | Value | Notes |
|-----------|-------|-------|
| Minimum Delay | 24 hours | Configurable (1h - 30d) |
| Grace Period | 14 days | Window to execute after eta |

## Migration Steps

### Phase 1: Deployment (Day 0)

```bash
# Deploy GovernanceHub (uses separate config to avoid compilation conflicts)
npx hardhat run scripts/deploy-governance-hub.ts --config hardhat.governance.config.ts --network arbitrumOne

# Verify on Blockscout
npx hardhat verify --config hardhat.governance.config.ts --network arbitrumOne <GOVERNANCE_HUB_ADDRESS> "<ADMIN_ADDRESS>"
```

### Phase 2: Authorization (Day 0)

```javascript
// Connect to GovernanceHub as admin
const governanceHub = await ethers.getContractAt("GovernanceHub", GOVERNANCE_HUB_ADDRESS);

// Authorize all target contracts
await governanceHub.authorizeTarget(RISK_CONFIG_ADDRESS);
await governanceHub.authorizeTarget(DSCR_RISK_CONFIG_ADDRESS);
await governanceHub.authorizeTarget(FIX_FLIP_MANAGER_ADDRESS);
await governanceHub.authorizeTarget(DSCR_LOAN_MANAGER_ADDRESS);
await governanceHub.authorizeTarget(PRODUCT_REGISTRY_ADDRESS);
```

### Phase 3: Wiring (Day 0-1)

```javascript
// Wire GovernanceHub to each contract
await riskConfig.setGovernanceHub(GOVERNANCE_HUB_ADDRESS);
await dscrRiskConfig.setGovernanceHub(GOVERNANCE_HUB_ADDRESS);
await fixFlipManager.setGovernanceHub(GOVERNANCE_HUB_ADDRESS);
await dscrLoanManager.setGovernanceHub(GOVERNANCE_HUB_ADDRESS);
await productRegistry.setGovernanceHub(GOVERNANCE_HUB_ADDRESS);
```

### Phase 4: Role Assignment (Day 1)

```javascript
const RISK_COMMITTEE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RISK_COMMITTEE_ROLE"));
const SETTLEMENT_AUTHORITY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SETTLEMENT_AUTHORITY_ROLE"));
const GUARDIAN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GUARDIAN_ROLE"));

// Grant roles to multisigs
await governanceHub.grantRole(RISK_COMMITTEE_ROLE, RISK_COMMITTEE_MULTISIG);
await governanceHub.grantRole(SETTLEMENT_AUTHORITY_ROLE, SETTLEMENT_MULTISIG);
await governanceHub.grantRole(GUARDIAN_ROLE, GUARDIAN_ADDRESS);
```

### Phase 5: Enforcement Activation (Day 2+)

```javascript
// Enable governance enforcement (after testing)
await riskConfig.setGovernanceEnforced(true);
await dscrRiskConfig.setGovernanceEnforced(true);
await fixFlipManager.setGovernanceEnforced(true);
await dscrLoanManager.setGovernanceEnforced(true);
await productRegistry.setGovernanceEnforced(true);
```

### Phase 6: Legacy Key Revocation (Day 7+)

**CRITICAL: Only perform after confirming all operations work via GovernanceHub**

```javascript
const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
const RISK_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RISK_MANAGER_ROLE"));

// Revoke deployer's direct admin access on RiskConfig
await riskConfig.revokeRole(ADMIN_ROLE, DEPLOYER_ADDRESS);
await riskConfig.revokeRole(RISK_MANAGER_ROLE, DEPLOYER_ADDRESS);

// Revoke deployer's direct admin access on DSCRRiskConfig
await dscrRiskConfig.revokeRole(ADMIN_ROLE, DEPLOYER_ADDRESS);
await dscrRiskConfig.revokeRole(RISK_MANAGER_ROLE, DEPLOYER_ADDRESS);

// Revoke deployer's direct admin access on FixFlipManager
await fixFlipManager.revokeRole(ADMIN_ROLE, DEPLOYER_ADDRESS);
await fixFlipManager.revokeRole(UNDERWRITER_ROLE, DEPLOYER_ADDRESS);

// Revoke deployer's direct admin access on DSCRLoanManager
await dscrLoanManager.revokeRole(ADMIN_ROLE, DEPLOYER_ADDRESS);
await dscrLoanManager.revokeRole(UNDERWRITER_ROLE, DEPLOYER_ADDRESS);
await dscrLoanManager.revokeRole(SERVICER_ROLE, DEPLOYER_ADDRESS);

// Revoke deployer's direct admin access on ProductRegistry
await productRegistry.revokeRole(ADMIN_ROLE, DEPLOYER_ADDRESS);
```

## Updated shared/contracts.ts

```typescript
export const GOVERNANCE_CONTRACTS = {
  GOVERNANCE_HUB: '[DEPLOYED_ADDRESS]'
} as const;
```

## Action Types Reference

| ActionType | Value | Required Role |
|------------|-------|---------------|
| RISK_PARAM_UPDATE | 0 | RISK_COMMITTEE_ROLE |
| PRODUCT_ACTIVATION | 1 | SETTLEMENT_AUTHORITY_ROLE |
| PRODUCT_DEACTIVATION | 2 | SETTLEMENT_AUTHORITY_ROLE |
| PRODUCT_REGISTRATION | 3 | SETTLEMENT_AUTHORITY_ROLE |
| PRODUCT_DEREGISTRATION | 4 | SETTLEMENT_AUTHORITY_ROLE |
| MANAGER_UPDATE | 5 | SETTLEMENT_AUTHORITY_ROLE |
| CONTRACT_CONFIG_UPDATE | 6 | DEFAULT_ADMIN_ROLE |
| EMERGENCY_UNPAUSE | 7 | DEFAULT_ADMIN_ROLE or SETTLEMENT_AUTHORITY_ROLE |

## Example: Proposing a Risk Parameter Update

```javascript
// 1. Encode the call data
const newRiskParams = {
  productId: 1,
  maxLtvBps: 7000,
  maxTermDays: 180,
  maxLoanSize: ethers.parseEther("1000000"),
  minLoanSize: ethers.parseEther("50000"),
  originationFeeBps: 200,
  interestRateBps: 1100,
  lateFeePerDayBps: 50,
  insuranceReserveBps: 500,
  protocolFeeBps: 200,
  active: true
};

const callData = riskConfig.interface.encodeFunctionData("setProductRisk", [1, newRiskParams]);

// 2. Calculate eta (24 hours from now)
const eta = Math.floor(Date.now() / 1000) + 86400 + 100;

// 3. Propose action
const tx = await governanceHub.connect(riskCommittee).proposeAction(
  0, // RISK_PARAM_UPDATE
  RISK_CONFIG_ADDRESS,
  callData,
  eta
);

// 4. Wait for timelock
// ... 24 hours later ...

// 5. Execute action
await governanceHub.connect(riskCommittee).executeAction(actionId);
```

## Emergency Pause Procedure

```javascript
// Guardian can pause immediately (no timelock)
await governanceHub.connect(guardian).pauseLending();

// Admin or Settlement Authority must unpause
await governanceHub.connect(admin).unpauseLending();
```

## Backward Compatibility

The updated contracts maintain backward compatibility:

1. **Dual Authorization**: Both legacy ADMIN_ROLE and GOVERNANCE_HUB_ROLE can perform privileged actions
2. **Optional Enforcement**: `governanceEnforced` flag allows gradual migration
3. **Existing Roles Preserved**: All existing roles continue to work until explicitly revoked

## Verification Checklist

- [ ] GovernanceHub deployed and verified on Blockscout
- [ ] All target contracts authorized in GovernanceHub
- [ ] GovernanceHub wired to all contracts via `setGovernanceHub()`
- [ ] Roles granted to appropriate multisigs
- [ ] Test proposal/execute cycle completed successfully
- [ ] Test emergency pause/unpause cycle completed successfully
- [ ] Governance enforcement enabled on all contracts
- [ ] Legacy admin keys revoked from deployer
- [ ] shared/contracts.ts updated with GovernanceHub address
- [ ] Whitepaper updated to reflect on-chain governance status

## Rollback Procedure

If issues are discovered:

1. Disable governance enforcement: `setGovernanceEnforced(false)`
2. Operations revert to legacy ADMIN_ROLE control
3. Fix issues in GovernanceHub
4. Re-enable enforcement after testing
