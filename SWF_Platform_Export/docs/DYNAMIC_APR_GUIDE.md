# Sovran Wealth Fund - Dynamic APR System Guide

This document explains the Dynamic APR system used in the Sovran Wealth Fund ecosystem and provides instructions for interacting with it.

## Overview

The Dynamic APR system automatically adjusts the staking rewards (APR) based on the total amount of SWF tokens deposited in the SWFBasketVault. This creates a balance between incentivizing early adopters and ensuring long-term sustainability.

## Key Components

1. **SWFBasketVault**: Allows users to deposit SWF tokens and receive SWF-BASKET tokens in return.
2. **SoloMethodEngine**: The staking contract where users can stake their SWF tokens to earn rewards.
3. **DynamicAPRController**: Monitors vault deposits and adjusts the staking APR accordingly.

## How It Works

### APR Calculation Logic

The system adjusts APR based on these deposit thresholds:

- **Low Threshold (10,000 SWF)**: When total deposits are below this threshold, APR is set to the maximum (30%).
- **High Threshold (100,000 SWF)**: When total deposits exceed this threshold, APR is set to the minimum (10%).
- **Between Thresholds**: APR is calculated using linear interpolation between the maximum and minimum values.

### Adjustment Schedule

The APR is adjusted:
- Automatically once per day (via scheduled script)
- Only after the adjustment interval has passed (default: 24 hours)

## Interacting with the System

### Depositing into the Vault

To deposit SWF tokens into the vault:

```bash
npx hardhat run scripts/testVaultDeposit.js --network polygon
```

This script:
1. Approves the vault to spend your SWF tokens
2. Deposits tokens into the vault
3. Returns SWF-BASKET tokens at a 1:1 ratio

### Testing Staking and Dynamic APR

To test staking and view current APR information:

```bash
npx hardhat run scripts/testStakingAndDynamicAPR.js --network polygon
```

This script:
1. Displays current staking information
2. Shows the current APR and next adjustment time
3. Performs a test stake (if you have sufficient tokens)
4. Simulates APR at different deposit levels

### Manually Adjusting the APR

To manually trigger an APR adjustment (only works after the adjustment interval):

```bash
npx hardhat run scripts/adjustAPR.js --network polygon
```

### Scheduling Automatic APR Adjustments

To set up automatic daily APR adjustments:

```bash
node scripts/scheduleAPRAdjustments.js
```

For production environments, use PM2 to keep the script running:

```bash
npm install -g pm2
pm2 start scripts/scheduleAPRAdjustments.js --name "swf-apr-adjuster"
```

### Monitoring the System

To monitor vault deposits and APR changes:

```bash
node scripts/monitorVaultAndAPR.js
```

Or schedule regular monitoring with PM2:

```bash
pm2 start scripts/monitorVaultAndAPR.js --name "swf-system-monitor"
```

## Understanding APR Changes

### Advantages of Dynamic APR

1. **Early Adopter Incentive**: Higher APR at lower deposit levels rewards early participants.
2. **Sustainable Long-term Model**: APR decreases as the system grows, ensuring sustainability.
3. **Predictable Changes**: APR changes follow a transparent formula based on vault deposits.

### Deposit Levels and Expected APR

| Total Deposits | Expected APR |
|----------------|-------------|
| < 10,000 SWF   | 30% (max)   |
| 25,000 SWF     | ~25%        |
| 50,000 SWF     | ~20%        |
| 75,000 SWF     | ~15%        |
| ≥ 100,000 SWF  | 10% (min)   |

## Technical Integration

### Contract Addresses

The contract addresses can be found in your `.env` file:

- SWF Token: `SWF_TOKEN_ADDRESS`
- SWFBasketVault: `SWF_BASKET_VAULT_ADDRESS`
- SoloMethodEngine: `SOLO_METHOD_ENGINE_ADDRESS`
- DynamicAPRController: `DYNAMIC_APR_CONTROLLER_ADDRESS`

### API Integration

For integrating with external applications, use the following function calls:

```javascript
// Get current APR and next adjustment time
const aprInfo = await dynamicAPRController.getAPRInfo();
const currentAPR = aprInfo[0].toNumber() / 100; // in percentage
const nextAdjustmentTime = new Date(aprInfo[1].toNumber() * 1000);
const totalDeposited = ethers.utils.formatEther(aprInfo[2]);

// Simulate APR for a specific deposit amount
const depositAmount = ethers.utils.parseEther("50000");
const simulatedAPR = await dynamicAPRController.simulateAPRForDeposit(depositAmount);
console.log(`Simulated APR: ${simulatedAPR.toNumber() / 100}%`);
```

## Troubleshooting

### Common Issues

1. **APR Not Updating**: Check if the adjustment interval has passed using `getAPRInfo()`.
2. **Staking Rewards Lower Than Expected**: Verify the current APR and check if it was recently adjusted downward.
3. **Cannot Deposit to Vault**: Ensure you have approved the vault to spend your tokens.

### Support

For support with the dynamic APR system, please contact the Sovran Wealth Fund team through official channels.