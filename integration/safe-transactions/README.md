# Safe Wallet Transaction Files

These JSON files can be directly imported into Safe's Transaction Builder on Arbitrum One.

## Files

| File | Safe Required | Transactions | Description |
|------|---------------|--------------|-------------|
| `stage1-admin1-safe.json` | Admin 1 Safe | 11 | Core security & token plumbing |
| `stage2-admin1-safe.json` | Admin 1 Safe | 5 | Financial & real estate mesh |
| `stage3a-deployer-safe.json` | Deployer Safe | 1 | Utility Hub oracle role |
| `stage3b-admin1-safe.json` | Admin 1 Safe | 1 | DePIN Suite oracle role |

## How to Import

### Step 1: Open Safe Transaction Builder
1. Go to https://app.safe.global/
2. Connect your wallet and select your Safe
3. Navigate to "New Transaction" → "Transaction Builder"

### Step 2: Import JSON
1. Click "Upload JSON" or "Import from JSON"
2. Select the appropriate file for your Safe
3. Review all transactions carefully
4. Verify contract addresses match deployment records

### Step 3: Execute
1. Queue transaction batch for signatures
2. Collect required number of approvals
3. Execute batch when ready
4. Verify on Blockscout after execution

## Execution Order

Execute in this sequence:
1. **Stage 1** (Admin 1 Safe) - 11 transactions
2. **Stage 2** (Admin 1 Safe) - 5 transactions
3. **Stage 3a** (Deployer Safe) - 1 transaction
4. **Stage 3b** (Admin 1 Safe) - 1 transaction
5. **Stage 4** - No transactions needed

## Verification

After each stage, verify role grants on Blockscout:
- Contract → "Read Contract" tab
- Call `hasRole(roleHash, granteeAddress)`
- Should return `true` for all granted roles

## Safe Addresses Needed

**Admin 1 Safe:**
- Controls: Contracts 1-9, 12
- Used for: Stages 1, 2, and 3b
- Address: _[Your Admin 1 Safe address]_

**Deployer Safe:**
- Controls: Contracts 10-11, 13-22
- Used for: Stage 3a
- Address: _[Your Deployer Safe address]_

## Gas Estimates

- Stage 1: ~500,000 gas (~$5-10)
- Stage 2: ~250,000 gas (~$2-5)
- Stage 3a: ~80,000 gas (~$1-2)
- Stage 3b: ~80,000 gas (~$1-2)
- **Total: ~$10-20** (depending on gas prices)

## Support

For questions or issues:
- Review `integration/MAINNET-EXECUTION-GUIDE.md`
- Check `integration/scripts/safe-wallet-integration.md`
- Verify contract addresses in `integration/config/contracts.config.ts`
