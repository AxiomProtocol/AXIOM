# DePINNodeSales Contract - Deployment Required

## Status: NOT YET DEPLOYED

This contract (`DePINNodeSales.sol`) has been created but needs to be deployed to Arbitrum One.

## What This Contract Does

Handles ETH payments for DePIN node purchases with immediate forwarding to the treasury vault at `0x2bB2c2A7a1d82097488bf0b9c2a59c1910CD8D5d`.

## Key Functions

- `mintNode(nodeType, tierId)` - Purchase node with ETH (backward compatible with frontend)
- `purchaseNode(tierId, category, metadata)` - Purchase with optional metadata
- `emergencyWithdraw()` - Admin function to sweep residual ETH to treasury
- `getActiveTiers()` - Get available node tiers and pricing

## Node Tiers (Hardcoded in Contract)

| Tier | Name | Price | Category |
|------|------|-------|----------|
| 1 | Mobile Light | 0.02 ETH | Lite |
| 2 | Desktop Standard | 0.05 ETH | Lite |
| 3 | Desktop Advanced | 0.08 ETH | Lite |
| 4 | Pro Infrastructure | 0.15 ETH | Standard |
| 5 | Enterprise Premium | 0.25 ETH | Standard |

## Deployment Instructions

See `docs/DEPIN_SALES_DEPLOYMENT_GUIDE.md` for complete deployment steps.

Quick deploy:

```bash
npx hardhat run scripts/deploy-depin-sales.ts --network arbitrum
```

## Post-Deployment Steps

1. Update `.env` with deployed contract address:
   ```
   DEPIN_SALES_CONTRACT=0x...
   ```

2. Verify on Blockscout:
   ```bash
   npx hardhat verify --network arbitrum <ADDRESS> "0x2bB2c2A7a1d82097488bf0b9c2a59c1910CD8D5d"
   ```

3. Update `shared/contracts.ts`:
   ```typescript
   DEPIN_SALES: '<deployed_address>'
   ```

4. Restart application to pick up new address

## Current Workaround

Until deployed, the treasury dashboard will show "DePIN Sales Contract: Not Deployed" and purchases will continue to fail. The existing DePINNodeSuite contract at `0x16dC3884d88b767D99E0701Ba026a1ed39a250F1` does not accept ETH payments.

## Expected Behavior After Deployment

1. Node purchases will succeed and ETH will flow to treasury
2. `NodePurchased` events will be emitted and tracked
3. Treasury dashboard will show purchase stats
4. No ETH will be trapped in the sales contract (immediate forwarding)
