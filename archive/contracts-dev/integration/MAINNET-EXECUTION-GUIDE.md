# Mainnet Execution Guide

## Critical: Dual-Admin Requirement for Stage 3

### Issue
Stage 3 integration requires access to **two separate admin wallets**:
- **Deployer** (`0xDFf9e47eb007bF02e47477d577De9ffA99791528`): Admin for Utility Hub (Contract 10)
- **Admin 1** (`0x93696b537d814Aed5875C4490143195983AED365`): Admin for DePIN Suite (Contract 12)

### Mainnet Execution Options

#### Option 1: Sequential Manual Execution (Recommended)
Execute Stage 3 in two separate transactions:

**Step 1: Grant METER_ORACLE_ROLE (using Deployer wallet)**
```bash
# Set deployer private key in environment
export PRIVATE_KEY="<deployer_private_key>"

# Run custom script for Step 1 only
npx hardhat run integration/scripts/stage3-step1-only.ts --network arbitrum
```

**Step 2: Grant ORACLE_ROLE (using Admin 1 wallet)**
```bash
# Set admin1 private key in environment
export PRIVATE_KEY="<admin1_private_key>"

# Run custom script for Step 2 only
npx hardhat run integration/scripts/stage3-step2-only.ts --network arbitrum
```

#### Option 2: Multi-Sig Coordination
If using a multi-sig wallet or key management service:
1. Configure your wallet to have access to both admin keys
2. Execute Stage 3 with proper key switching
3. Verify both role grants completed

#### Option 3: Admin Consolidation (Future)
Consider consolidating admin rights to a single address for simpler operations:
1. Grant DEFAULT_ADMIN_ROLE from Deployer to Admin 1 on Utility Hub
2. Revoke from Deployer
3. Now Admin 1 controls all contracts and can run full integration

---

## Complete Mainnet Execution Workflow

### Pre-Execution Checklist
- [ ] Both admin private keys available and secure
- [ ] Arbitrum mainnet RPC configured
- [ ] Gas funds available in both admin wallets (est. 0.01 ETH each)
- [ ] Hardhat fork testing completed successfully
- [ ] All contracts verified on Blockscout

### Execution Sequence

**Stages 1, 2, 4: Single-Admin Execution**
```bash
# Set Admin 1 private key
export PRIVATE_KEY="<admin1_private_key>"

# Execute Stages 1, 2, 4
npm run integrate:stage1
npm run integrate:stage2
npm run integrate:stage4
```

**Stage 3: Dual-Admin Execution**
See "Option 1: Sequential Manual Execution" above

**Or: Master Script (Requires Manual Intervention)**
```bash
# Execute all stages (will pause at Stage 3 for manual execution)
npm run integrate:all
```

---

## Admin Address Reference

### Contracts by Admin

**Admin 1** (`0x93696b537d814Aed5875C4490143195983AED365`):
- Contracts 1-9: AXM Token, Identity Hub, Treasury, Staking, Credentials, Land Registry, Lease Engine, Realtor, Capital Pools
- Contract 12: DePIN Node Suite

**Deployer** (`0xDFf9e47eb007bF02e47477d577De9ffA99791528`):
- Contracts 10-11: Utility Hub, Transport & Logistics
- Contracts 13-22: Cross-Chain, Exchange Hub, Reputation Oracle, IoT Oracle, Markets, Oracle Relay, Community Social, Academy, Gamification, Sustainability

---

## Verification After Execution

After each stage, verify on-chain:

### Stage 1 Verification
```bash
npm run integrate:test:stage1
```

### Stage 2 Verification
```typescript
// Check Treasury roles
await leaseEngine.hasRole(TREASURY_ROLE, TREASURY_ADDRESS);
await realtorModule.hasRole(ADMIN_ROLE, TREASURY_ADDRESS);
// ... etc
```

### Stage 3 Verification
```typescript
// Check IoT Oracle roles
await utilityHub.hasRole(METER_ORACLE_ROLE, IOT_ORACLE_ADDRESS);
await depinSuite.hasRole(ORACLE_ROLE, IOT_ORACLE_ADDRESS);
```

### Stage 4 Verification
No verification needed (no configuration required)

---

## Rollback Plan

If any stage fails:

1. **Do NOT proceed to next stage**
2. Check transaction on Blockscout for error details
3. Verify admin wallet has correct permissions
4. Re-run failed stage after fixing issue
5. All role grants are idempotent (safe to retry)

---

## Security Best Practices

- **Never commit private keys** to repository
- Use environment variables or hardware wallets
- Verify transaction details before signing
- Monitor gas prices before execution
- Keep audit log of all executed transactions
- Use read-only mode to verify state before mutations

---

## Support & Troubleshooting

### Common Issues

**Issue: AccessControlUnauthorizedAccount**
- **Cause:** Wrong admin wallet used for transaction
- **Fix:** Verify which admin controls the contract, use correct private key

**Issue: Role already granted**
- **Cause:** Integration step already executed
- **Fix:** This is safe - skip to next step

**Issue: Out of gas**
- **Cause:** Insufficient gas limit or price
- **Fix:** Increase gas limit in hardhat.config.ts

---

## Post-Integration Tasks

After successful integration:

1. ✅ Verify all 18 role grants on-chain
2. ✅ Test critical workflows (stake, lease, utility payment)
3. ✅ Deploy operations dashboard
4. ✅ Set up monitoring and alerts
5. ✅ Document integration completion in project logs
6. ✅ Back up integration scripts and logs

---

**Status:** Integration scripts tested and ready for mainnet execution.  
**Requirement:** Dual-admin wallet access for complete automated execution.  
**Alternative:** Sequential manual execution with wallet switching.
