# DePINNodeSales Contract Deployment Guide

## Overview

The `DePINNodeSales.sol` contract handles ETH payments for DePIN node purchases and immediately forwards funds to the treasury vault. This separates payment processing from operational node management (DePINNodeSuite).

## Prerequisites

- Hardhat environment configured
- Deployer wallet with ETH on Arbitrum One
- Treasury vault address: `0x2bB2c2A7a1d82097488bf0b9c2a59c1910CD8D5d`

## Deployment Steps

### 1. Compile the Contract

```bash
npx hardhat compile
```

### 2. Create Deployment Script

Create `scripts/deploy-depin-sales.ts`:

```typescript
import { ethers } from "hardhat";

async function main() {
  const treasuryVault = "0x2bB2c2A7a1d82097488bf0b9c2a59c1910CD8D5d";
  
  console.log("Deploying DePINNodeSales contract...");
  console.log("Treasury Vault:", treasuryVault);
  
  const DePINNodeSales = await ethers.getContractFactory("DePINNodeSales");
  const sales = await DePINNodeSales.deploy(treasuryVault);
  
  await sales.waitForDeployment();
  const address = await sales.getAddress();
  
  console.log("DePINNodeSales deployed to:", address);
  
  // Verify initial configuration
  const totalNodes = await sales.totalNodesSold();
  const treasury = await sales.treasurySafe();
  
  console.log("\nInitial Configuration:");
  console.log("- Total Nodes Sold:", totalNodes.toString());
  console.log("- Treasury Safe:", treasury);
  
  // Display tier pricing
  console.log("\nNode Tiers:");
  for (let i = 1; i <= 5; i++) {
    const tier = await sales.nodeTiers(i);
    console.log(`- Tier ${i}: ${tier.name} - ${ethers.formatEther(tier.priceEth)} ETH (${tier.category === 0 ? 'Lite' : 'Standard'})`);
  }
  
  return address;
}

main()
  .then((address) => {
    console.log("\n✅ Deployment successful!");
    console.log("Next steps:");
    console.log("1. Verify contract on Blockscout");
    console.log("2. Update DEPIN_SALES_CONTRACT env var to:", address);
    console.log("3. Update frontend to use new contract");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 3. Deploy to Arbitrum One

```bash
npx hardhat run scripts/deploy-depin-sales.ts --network arbitrum
```

### 4. Verify on Blockscout

```bash
npx hardhat verify --network arbitrum <CONTRACT_ADDRESS> "0x2bB2c2A7a1d82097488bf0b9c2a59c1910CD8D5d"
```

## Post-Deployment Configuration

### 1. Update Environment Variables

Add to `.env`:

```bash
DEPIN_SALES_CONTRACT=<deployed_contract_address>
```

### 2. Update Frontend Configuration

Update `pages/axiom-depin-nodes.tsx`:

```typescript
// Replace this line:
const DEPIN_CONTRACT_ADDRESS = '0x16dC3884d88b767D99E0701Ba026a1ed39a250F1';

// With:
const DEPIN_SALES_CONTRACT = process.env.NEXT_PUBLIC_DEPIN_SALES_CONTRACT || '<deployed_address>';
```

Update the contract interface:

```typescript
const depinContract = new ethers.Contract(
  DEPIN_SALES_CONTRACT,  // Use new contract
  DEPIN_ABI,
  signer
);
```

### 3. Update Shared Contracts Config

Add to `shared/contracts.ts`:

```typescript
export const DEFI_UTILITY_CONTRACTS = {
  // ... existing contracts
  DEPIN_NODES: '0x16dC3884d88b767D99E0701Ba026a1ed39a250F1',
  DEPIN_SALES: '<deployed_address>'  // Add new contract
} as const;
```

## Contract Features

### Automatic ETH Forwarding
- 100% of node purchase ETH is immediately forwarded to treasury
- No trapped funds in contract
- Gas-efficient single-transaction flow

### Node Tiers

| Tier | Name | Price | Category |
|------|------|-------|----------|
| 1 | Mobile Light | 0.02 ETH | Lite (Browser) |
| 2 | Desktop Standard | 0.05 ETH | Lite (Browser) |
| 3 | Desktop Advanced | 0.08 ETH | Lite (Browser) |
| 4 | Pro Infrastructure | 0.15 ETH | Standard (Hardware) |
| 5 | Enterprise Premium | 0.25 ETH | Standard (Hardware) |

### Admin Functions

```solidity
// Update tier pricing
function setTier(uint256 tierId, string name, uint256 price, NodeCategory category, bool active)

// Emergency withdraw residual ETH
function emergencyWithdraw()

// Update treasury address
function updateTreasury(address newTreasury)

// Pause/unpause sales
function pause()
function unpause()
```

## Testing

### Test Purchase Flow

```javascript
const { ethers } = require("hardhat");

async function testPurchase() {
  const sales = await ethers.getContractAt("DePINNodeSales", "<contract_address>");
  
  // Get tier info
  const tier = await sales.nodeTiers(1);
  console.log("Tier 1:", tier);
  
  // Purchase node
  const tx = await sales.purchaseNode(1, 0, "test@example.com", {
    value: tier.priceEth
  });
  
  await tx.wait();
  console.log("Purchase successful!");
  
  // Check balances
  const contractBalance = await ethers.provider.getBalance(sales.address);
  const treasuryBalance = await ethers.provider.getBalance(await sales.treasurySafe());
  
  console.log("Contract balance (should be 0):", ethers.formatEther(contractBalance));
  console.log("Treasury balance:", ethers.formatEther(treasuryBalance));
}

testPurchase();
```

## Monitoring & Analytics

The DePIN Event Monitor (`/admin/depin-monitor`) will automatically track:
- `NodePurchased` events
- ETH flow to treasury
- Purchase statistics by tier
- Buyer addresses and metadata

## Security Considerations

1. **Immediate Forwarding**: All ETH is forwarded immediately to prevent trapped funds
2. **Emergency Sweep**: Admin can withdraw any residual balance as a safety measure
3. **Access Control**: Critical functions protected by ADMIN_ROLE
4. **Reentrancy Guard**: All payable functions use nonReentrant modifier
5. **Pausable**: Sales can be paused in emergency situations

## Integration Checklist

- [ ] Contract deployed to Arbitrum One
- [ ] Contract verified on Blockscout
- [ ] DEPIN_SALES_CONTRACT env var set
- [ ] Frontend updated to use new contract address
- [ ] shared/contracts.ts updated
- [ ] Test purchase completed successfully
- [ ] Treasury received ETH
- [ ] Event monitoring confirmed working
- [ ] Admin dashboard shows correct balances

## Troubleshooting

**Problem**: Contract balance not zero after purchase
**Solution**: Check if treasury address is correct and can receive ETH

**Problem**: Purchase transaction fails
**Solution**: Ensure msg.value >= tier price and tier is active

**Problem**: Events not showing in monitor
**Solution**: Verify event listener is running and watching correct contract address

## Support

For issues or questions, contact the Axiom development team.
