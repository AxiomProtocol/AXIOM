# Sovran Wealth Fund - Staking System Guide

This guide provides detailed information on how to interact with the SWF staking system using the SoloMethodEngineV2 contract.

## SoloMethodEngineV2 Overview

The SoloMethodEngineV2 is an advanced staking contract with the following key features:

1. **Dynamic APR**: Adjustable Annual Percentage Rate for staking rewards, set to 25% by default
2. **16-Wallet Structure**: Staked tokens are automatically distributed across 16 virtual wallets
3. **5 Role Types**: Each wallet is assigned one of five roles (BUYER, HOLDER, STAKER, LIQUIDITY, TRACKER)
4. **Seconds-Based Rewards**: Precise reward calculation based on exact time elapsed
5. **Minimum Stake Requirement**: 50 SWF minimum stake amount

## How the 16-Wallet Structure Works

When you stake SWF tokens, the system:

1. Creates 16 virtual "wallets" associated with your address
2. Assigns each wallet one of the five role types
3. Distributes your staked tokens evenly across these wallets
4. Calculates rewards based on the total staked amount
5. Maintains the distribution when you claim rewards or withdraw tokens

This structure enables a sophisticated token allocation that supports the ecosystem's multiple functions and use cases.

## Getting Started with Staking

### Prerequisites

- SWF tokens in your wallet
- A small amount of POL for gas fees
- Node.js installed for CLI tool usage

### Step 1: Check Your Balance and Contract Information

```
node swf-staking-manager.js info
```

This will display:
- Your connected wallet address
- Your SWF token balance
- Contract addresses
- Current staking parameters (APR, minimum stake)

### Step 2: Approve Token Spending

Before staking, you need to approve the staking contract to use your tokens:

```
node swf-staking-manager.js approve 100
```

This approves 100 SWF tokens to be used by the staking contract.

### Step 3: Stake Your Tokens

After approving, you can stake your tokens:

```
node swf-staking-manager.js stake 100
```

This stakes 100 SWF tokens. Remember the minimum staking amount is 50 SWF.

### Step 4: Check Your Staking Information

To see your staking position and pending rewards:

```
node swf-staking-manager.js staking-info
```

This will show:
- Total amount staked
- Your 16-wallet breakdown with roles and balances
- Current APR
- Pending rewards
- Time since last action

## Managing Your Stake

### Claim Rewards

To claim your accumulated staking rewards:

```
node swf-staking-manager.js claim
```

When you claim rewards:
1. The contract calculates rewards based on your staked amount, APR, and time elapsed
2. New SWF tokens are minted to your address
3. Your reward debt is updated to track future rewards accurately

### Withdraw Staked Tokens

To withdraw some or all of your staked tokens:

```
node swf-staking-manager.js withdraw 50
```

This withdraws 50 SWF tokens from your staking position. When withdrawing:
1. Your virtual wallet balances are reduced proportionally
2. Any pending rewards are automatically calculated and claimed
3. Your staked balance is updated

To withdraw all tokens:

```
node swf-staking-manager.js withdraw-all
```

## Reward Calculation System

### How APR Works

- The Annual Percentage Rate (APR) is stored in basis points (1% = 100 basis points)
- Default APR is 25% (2500 basis points)
- Admin can adjust APR between 0.01% and 50%

### Reward Formula

Rewards are calculated using the formula:

```
rewards = (stakedAmount * aprBasisPoints * timeElapsed) / BPS_DIVISOR / SECONDS_IN_YEAR
```

Where:
- stakedAmount is your total staked SWF tokens
- aprBasisPoints is the current APR in basis points (e.g., 2500 for 25%)
- timeElapsed is the number of seconds since your last action
- BPS_DIVISOR is 10000 (100%)
- SECONDS_IN_YEAR is 31536000 (365 days)

This provides a continuous, time-based reward calculation that's more precise than block-based methods.

## Administration Functions

### Set APR (Admin Only)

If you are the contract admin, you can adjust the APR:

```
node swf-staking-manager.js set-apr 20
```

This sets the APR to 20%. Important considerations:
- The APR can be set between 0.01% and 50%
- Changing the APR affects all stakers' future rewards
- Historical rewards are calculated using the APR that was in effect during that period

## Technical Details

### SoloMethodEngineV2 Contract Functions

The main contract functions include:

- `deposit(uint256 amount)`: Stake tokens
- `withdraw(uint256 amount)`: Withdraw tokens
- `claimRewards()`: Claim pending rewards
- `getTotalStaked(address account)`: Get total staked amount
- `getPendingRewards(address account)`: Calculate pending rewards
- `getCurrentAPR()`: Get current APR
- `setAPR(uint256 _newAprBps)`: Set new APR (admin only)
- `getWalletBreakdown(address account)`: Get wallet details

### Smart Contract Features

1. **Reward Debt**: Tracks the rewards already accounted for to ensure accurate calculations
2. **Role Assignment**: Automatically assigns roles to virtual wallets in a predetermined pattern
3. **Minter Permission**: Contract requires MINTER_ROLE from the SWF token to mint rewards
4. **Gas Optimization**: Efficient code to minimize gas costs during staking operations
5. **Security Features**: Access control, input validation, and overflow protection

## Troubleshooting

If you encounter issues with staking:

1. **Transaction failures**: Ensure you have enough POL for gas fees and that gas prices are at least 37.5 gwei
2. **Approval errors**: Check that you approved enough tokens before staking
3. **Minimum stake**: Verify you're staking at least 50 SWF tokens
4. **Contract permissions**: The staking contract must have minting permissions
5. **Reward calculation**: Note that very small stakes or short time periods might show zero rewards due to rounding

## Implementation Examples

### Staking Example

```javascript
// Connect to the contracts
const { ethers } = require("ethers");
const stakingABI = require("./abis/SoloMethodEngineV2.json");
const tokenABI = require("./abis/SovranWealthFund.json");

// Contract addresses
const stakingAddress = "0x..."; // SoloMethodEngine address
const tokenAddress = "0x...";   // SWF token address

// Connect to provider
const provider = new ethers.providers.JsonRpcProvider("https://polygon-rpc.com");
const wallet = new ethers.Wallet("PRIVATE_KEY", provider);
const stakingContract = new ethers.Contract(stakingAddress, stakingABI, wallet);
const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet);

// Approve tokens
const stakeAmount = ethers.utils.parseEther("100");
await tokenContract.approve(stakingAddress, stakeAmount);

// Stake tokens
await stakingContract.deposit(stakeAmount);

// Check staking position
const stakedAmount = await stakingContract.getTotalStaked(wallet.address);
console.log(`Staked amount: ${ethers.utils.formatEther(stakedAmount)} SWF`);

// Check pending rewards
const pendingRewards = await stakingContract.getPendingRewards(wallet.address);
console.log(`Pending rewards: ${ethers.utils.formatEther(pendingRewards)} SWF`);

// Claim rewards
await stakingContract.claimRewards();

// Check wallet breakdown
const wallets = await stakingContract.getWalletBreakdown(wallet.address);
for (let i = 0; i < wallets.length; i++) {
  console.log(`Wallet ${i+1}: Role=${wallets[i].role}, Balance=${ethers.utils.formatEther(wallets[i].balance)} SWF`);
}
```

## Recent Updates

The SoloMethodEngineV2 includes several improvements over the original version:

1. **Dynamic APR**: APR can now be adjusted between 0.01% and 50% (previously fixed)
2. **Seconds-Based Rewards**: More precise rewards calculation based on actual time elapsed
3. **Enhanced Wallet Tracking**: Improved virtual wallet management with detailed breakdown
4. **Gas Optimizations**: Reduced gas costs for staking operations
5. **Expanded Interfaces**: Additional view functions for better data access

## Conclusion

The SWF staking system combines flexible rewards with a sophisticated wallet structure to create a unique ecosystem for token holders. By staking your SWF tokens, you not only earn rewards but also contribute to the stability and growth of the Sovran Wealth Fund ecosystem.

For additional assistance or questions, refer to the main documentation or contact the development team.