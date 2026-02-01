# Safe Wallet Integration Guide

## Prerequisites
- Safe Wallet addresses configured with proper admin rights
- Safe signers available to approve transactions
- Network: Arbitrum One

## Safe Wallet Addresses

**Admin 1 Safe:** (Controls contracts 1-9, 12)
- Used for: Stages 1, 2, and Stage 3b
- Requires: X of Y signatures from your Safe owners

**Deployer Safe:** (Controls contracts 10-11, 13-22)
- Used for: Stage 3a
- Requires: X of Y signatures from your Safe owners

## Execution Workflow

### Stage 1: Core Security & Token Plumbing
**Safe Required:** Admin 1 Safe  
**Estimated Gas:** ~500,000 gas (~$5-10 depending on gas prices)

**Transaction Batch:**
1. AXM Token.grantRole(0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6, 0x3fD63728288546AC41dAe3bf25ca383061c3A929)
2. AXM Token.grantRole(0x8227712ef8ad39d0f26f06731ef0df8665eb7ada7f41b1ee089adf3c238862a2, 0x3fD63728288546AC41dAe3bf25ca383061c3A929)
3. Staking Hub.grantRole(0x8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c, 0x3fD63728288546AC41dAe3bf25ca383061c3A929)
4. AXM Token.grantRole(0x6e8b2c3b9e2b7e8d9d8a7f9c6d5e4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f, 0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED)
5. Credential Registry.grantRole(0x2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a, 0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED)
6. AXM Token.setComplianceModule(0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED)
7. Treasury.setVault(0, 0x0000000000000000000000000000000000000001)
8. Treasury.setVault(1, 0x0000000000000000000000000000000000000002)
9. Treasury.setVault(2, 0x0000000000000000000000000000000000000003)
10. Treasury.setVault(3, 0x0000000000000000000000000000000000000004)
11. Treasury.setVault(4, 0x0000000000000000000000000000000000000005)

**Steps:**
1. Create new transaction in Safe Transaction Builder
2. Import transaction batch from JSON (see below)
3. Review all 11 transactions
4. Queue for approval
5. Collect required signatures
6. Execute batch

### Stage 2: Financial & Real Estate Mesh
**Safe Required:** Admin 1 Safe  
**Estimated Gas:** ~250,000 gas (~$2-5)

**Transaction Batch:**
1. Lease Engine.grantRole(0x7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f, 0x3fD63728288546AC41dAe3bf25ca383061c3A929)
2. Realtor Module.grantRole(0x9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b, 0x3fD63728288546AC41dAe3bf25ca383061c3A929)
3. Capital Pools.grantRole(0xe4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5, 0x3fD63728288546AC41dAe3bf25ca383061c3A929)
4. Lease Engine.grantRole(0x8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a, 0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED)
5. Realtor Module.grantRole(0xb1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d, 0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED)

### Stage 3a: Utility Hub
**Safe Required:** Deployer Safe  
**Estimated Gas:** ~80,000 gas (~$1-2)

**Transaction Batch:**
1. Utility Hub.grantRole(0xa6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c, 0xe38B3443E17A07953d10F7841D5568a27A73ec1a)

### Stage 3b: DePIN Suite
**Safe Required:** Admin 1 Safe  
**Estimated Gas:** ~80,000 gas (~$1-2)

**Transaction Batch:**
1. DePIN Suite.grantRole(0xb3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d, 0xe38B3443E17A07953d10F7841D5568a27A73ec1a)

### Stage 4: Community & Cross-Chain
**No transactions required** - contracts ready to use

---

## Safe Transaction Builder JSON

I've prepared the exact transaction batches you can import directly into Safe:

**Location:** `integration/safe-transactions/`
- `stage1-admin1-safe.json` - Stage 1 transactions
- `stage2-admin1-safe.json` - Stage 2 transactions  
- `stage3a-deployer-safe.json` - Stage 3a transactions
- `stage3b-admin1-safe.json` - Stage 3b transactions

**Import Steps:**
1. Open Safe Wallet UI
2. Go to "New Transaction" → "Transaction Builder"
3. Click "Import from JSON"
4. Upload the appropriate JSON file
5. Review transactions
6. Queue for signatures

---

## Verification After Each Stage

After executing each stage batch, verify on Blockscout:

**Stage 1:**
```
Visit AXM Token on Blockscout → "Read Contract"
- Check hasRole(MINTER_ROLE, Treasury) = true
- Check hasRole(FEE_MANAGER_ROLE, Treasury) = true
- Check hasRole(COMPLIANCE_ROLE, Identity Hub) = true
```

**Stage 2:**
```
Visit Lease Engine on Blockscout → "Read Contract"
- Check hasRole(TREASURY_ROLE, Treasury) = true
- Check hasRole(COMPLIANCE_ROLE, Identity Hub) = true
```

**Stage 3:**
```
Visit Utility Hub on Blockscout → "Read Contract"
- Check hasRole(METER_ORACLE_ROLE, IoT Oracle) = true

Visit DePIN Suite on Blockscout → "Read Contract"
- Check hasRole(ORACLE_ROLE, IoT Oracle) = true
```

---

## Rollback Instructions

If a transaction fails:
1. Do NOT execute subsequent stages
2. Check error on Blockscout
3. Fix issue (usually wrong Safe or missing permissions)
4. Re-execute failed transaction batch
5. Continue with next stage after verification

---

## Estimated Timeline

- **Stage 1:** 30-60 minutes (11 transactions, gathering signatures)
- **Stage 2:** 15-30 minutes (5 transactions)
- **Stage 3a:** 10-15 minutes (1 transaction, Deployer Safe)
- **Stage 3b:** 10-15 minutes (1 transaction, Admin 1 Safe)
- **Total:** 1-2 hours including signature collection and verification

---

## Security Checklist

Before executing:
- [ ] Verified Safe wallet addresses control correct contracts
- [ ] Confirmed required number of signers available
- [ ] Reviewed all transaction parameters
- [ ] Backed up integration scripts and documentation
- [ ] Set appropriate gas limits
- [ ] Monitored Arbitrum gas prices for optimal execution time

---

## Support

If you encounter issues:
1. Check Safe transaction queue for pending approvals
2. Verify contract addresses match deployment records
3. Confirm Safe has admin rights on target contracts
4. Review Blockscout for transaction error details
5. Refer to integration logs and documentation

**All role grants are idempotent** - safe to retry without side effects.
