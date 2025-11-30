# SWF Integrated Engine Guide

This guide provides instructions for using the SWF Integrated Engine, which combines the functionality of two systems:

1. **SoloMethodEngine**: Provides staking capabilities with 16-wallet role-based distribution and dynamic APR
2. **SovereignEngine**: Manages role-based allocation percentages across specific wallet addresses

## Overview

The Integrated Engine provides a unified interface for interacting with both systems, allowing users to:

- Stake SWF tokens and earn rewards based on a dynamic APR (currently 25%)
- Distribute SWF tokens across designated wallets according to predefined allocation percentages
- Manage staking parameters including adjusting the APR (admin only)

## Setup

1. Create a `.env` file with the following information:

```
PRIVATE_KEY=your_wallet_private_key
SWF_CONTRACT_ADDRESS=0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7
INTEGRATED_ENGINE_ADDRESS=address_after_deployment
ALCHEMY_API_KEY=your_alchemy_api_key_optional
NETWORK=polygon
```

2. Make sure you have the required dependencies installed:

```
npm install ethers dotenv
```

## CLI Commands

The `swf-integrated-manager.js` script provides a command-line interface for interacting with the Integrated Engine.

### Staking Commands

#### View Staking Information

To check your current staking status, APR rate, pending rewards, and wallet breakdown:

```
node swf-integrated-manager.js staking-info
```

#### Approve Token Spending

Before staking, you need to approve the Integrated Engine to spend your tokens:

```
node swf-integrated-manager.js approve 100
```

This approves 100 SWF tokens to be used by the engine.

#### Stake Tokens

To stake tokens (after approving):

```
node swf-integrated-manager.js stake 100
```

This stakes 100 SWF tokens. The minimum staking amount is 50 SWF.

#### Claim Rewards

To claim your accumulated rewards:

```
node swf-integrated-manager.js claim
```

#### Withdraw Tokens

To withdraw some or all of your staked tokens:

```
node swf-integrated-manager.js withdraw 50
```

This withdraws 50 SWF tokens from your staking position. Any pending rewards will be automatically updated during withdrawal.

#### Set APR (Admin Only)

If you are the admin of the contract, you can adjust the APR (Annual Percentage Rate) for staking rewards:

```
node swf-integrated-manager.js set-apr 20
```

This sets the APR to 20%. The APR can be set between 0.01% and 50% (5000 basis points maximum). This action can only be performed by the contract admin.

### Sovereign Engine Commands

#### View Sovereign Information

To view information about the role-based allocations and registered wallets:

```
node swf-integrated-manager.js sovereign-info
```

This displays all registered wallets, their roles, and allocation percentages.

#### Distribute Tokens (Admin Only)

If you are the admin, you can distribute tokens according to the predefined allocation percentages:

```
node swf-integrated-manager.js distribute 1000
```

This distributes 1000 SWF tokens across all registered wallets according to their allocation percentages. For example, if the "Treasury" wallet has a 20% allocation, it will receive 200 SWF tokens.

## Staking Mechanism

The staking system uses a 16-wallet structure that evenly distributes your staked tokens across different roles:

1. **BUYER** - Represents tokens actively participating in buying activity
2. **HOLDER** - Represents tokens held for longer-term value
3. **STAKER** - Represents tokens committed to the staking ecosystem
4. **LIQUIDITY** - Represents tokens providing system liquidity
5. **TRACKER** - Represents tokens tracking network activity

When you stake your tokens, they are automatically and evenly distributed across these 16 wallets. This balanced distribution ensures your tokens are represented in all aspects of the SWF ecosystem.

## Rewards

The Integrated Engine offers dynamic APR (Annual Percentage Rate) on your staked tokens, currently set at 25%. The APR can be adjusted by the admin based on market conditions. Rewards are calculated based on:

- The amount of tokens you have staked
- The duration of your stake
- The current APR (visible through the `getCurrentAPR()` function)
- Continuous compounding (reward calculation updates in real-time)

You can claim your rewards at any time, but they are also automatically updated when you withdraw tokens or make additional deposits.

## Sovereign Distribution System

The Sovereign Engine component manages a list of 16 wallet addresses, each with:

- A designated role (e.g., "Treasury", "Main Distributor", "OTC Buyer 1")
- An allocation percentage (e.g., 20%, 15%, 5%)

When the admin calls the `distribute` function, the specified amount of tokens is automatically split according to these percentages and sent to the corresponding wallets.

## Important Notes

1. **Gas Prices**: The manager automatically sets gas prices to at least 37.5 gwei to ensure transactions are processed on the Polygon network. Adjust this if needed.

2. **Minimum Stake**: You must stake at least 50 SWF tokens.

3. **Dynamic APR**: The staking contract uses a dynamic APR system, initially set to 25%. The contract admin can adjust this rate between 0.01% and 50% to respond to market conditions.

4. **Reward Calculation**: Rewards are calculated continuously based on seconds elapsed since your last action (stake, claim, or withdraw). This provides more accurate reward compounding.

5. **Treasury Role**: The Treasury wallet (20% allocation) plays a special role in the system. Make sure this address is properly funded if using the staking reward system.

6. **Minter Role**: The Integrated Engine must have the MINTER_ROLE on the SWF token to distribute rewards. This is configured during deployment.

## Troubleshooting

If you encounter issues:

1. **Transaction failures**: Check that you have enough POL for gas fees
2. **Approval errors**: Make sure you approved enough tokens before staking or distributing
3. **Connection issues**: Verify your RPC URL and network configuration
4. **Reward calculation**: Rewards accumulate continuously but may be small initially
5. **APR setting errors**: Ensure you're the admin when trying to set APR
6. **Distribution errors**: Verify you have enough tokens in your wallet before distributing

## Advanced: Interacting Directly with Contracts

Advanced users can interact directly with the contracts using web3 libraries or tools like Etherscan.

### Key Contract Functions

**Integrated Engine Contract:**

#### Staking Functions:
- `deposit(uint256 amount)`: Stake tokens
- `withdraw(uint256 amount)`: Withdraw tokens
- `claimRewards()`: Claim accumulated rewards
- `calculateRewards(address user)`: Calculate the user's current rewards
- `getTotalStaked(address user)`: Check your staked amount
- `getPendingRewards(address user)`: Check pending rewards
- `getWalletBreakdown(address user)`: View your 16-wallet distribution
- `getCurrentAPR()`: View the current APR setting in basis points (2500 = 25%)
- `setAPR(uint256 _newAprBps)`: Set a new APR (admin only, in basis points)

#### Sovereign Functions:
- `getRecipientList()`: Get all registered wallet addresses
- `getRole(address wallet)`: Get the role of a specific wallet
- `getAllocationByRole(string role)`: Get the percentage allocation for a role
- `getAddressByRole(string role)`: Find a wallet address by its role name
- `distributeTokens(uint256 amount)`: Distribute tokens according to allocations

## Deployment

To deploy the Integrated Engine, use the provided deployment script:

```
npx hardhat run scripts/deployIntegratedEngine.js --network polygon
```

This will deploy the contract and grant it the necessary MINTER_ROLE on the SWF token contract (if the deployer has admin rights).

## Testing

Before interacting with the Integrated Engine on mainnet, you can test it on a local Hardhat node:

```
npx hardhat node
npx hardhat run scripts/testIntegratedEngine.js --network localhost
```

This will verify that both the staking and distribution functionalities are working correctly.