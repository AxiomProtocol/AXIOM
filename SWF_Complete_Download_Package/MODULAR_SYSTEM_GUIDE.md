# Sovran Wealth Fund - Modular System Guide

This comprehensive guide explains how to use the new modular system for the Sovran Wealth Fund ecosystem. The modular architecture provides greater flexibility and separation of concerns, allowing each component to focus on its specific functionality.

## System Architecture

The modular system consists of four main components:

1. **SWFModularEngine**: Core controller contract that integrates all components
2. **SoloMethodEngineV2**: Handles staking with 16-wallet role-based distribution and dynamic APR
3. **RoleRouter**: Manages token distribution to wallets based on predefined allocations
4. **BasketIndex**: ERC20 token that represents a weighted basket of underlying assets

## Setup

1. Create a `.env` file with the following environment variables:

```
PRIVATE_KEY=your_wallet_private_key
NETWORK=polygon
SWF_CONTRACT_ADDRESS=0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7
MODULAR_ENGINE_ADDRESS=address_after_deployment
ALCHEMY_API_KEY=your_alchemy_api_key_optional
```

2. Make sure you have the required dependencies installed:

```
npm install ethers dotenv
```

3. After deployment, the script will create a `modular-system-deployment.json` file containing all contract addresses:

```json
{
  "network": "polygon",
  "swfToken": "0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7",
  "basketIndex": "0x...",
  "roleRouter": "0x...",
  "soloMethodEngine": "0x...",
  "modularEngine": "0x...",
  "mainDistributor": "0x...",
  "treasury": "0x...",
  "deploymentTime": "2025-04-23T10:15:30.123Z",
  "deployer": "0x..."
}
```

## CLI Tool: swf-modular-manager.js

The system comes with a comprehensive CLI tool for interacting with all components.

### System Commands

#### View System Information

Get an overview of the entire modular system:

```
node swf-modular-manager.js info
```

This displays:
- Connected wallet address
- Token information and balance
- Component addresses
- Current APR
- Number of registered wallets
- Number of basket assets

### Staking Commands

#### View Staking Information

Check your current staking status, APR rate, pending rewards, and wallet breakdown:

```
node swf-modular-manager.js staking-info
```

#### Approve Token Spending

Before staking, you need to approve the ModularEngine to spend your tokens:

```
node swf-modular-manager.js approve 100
```

This approves 100 SWF tokens to be used by the engine.

#### Stake Tokens

To stake tokens (after approving):

```
node swf-modular-manager.js stake 100
```

This stakes 100 SWF tokens. The minimum staking amount is 50 SWF.

#### Claim Rewards

To claim your accumulated rewards:

```
node swf-modular-manager.js claim
```

#### Withdraw Tokens

To withdraw some or all of your staked tokens:

```
node swf-modular-manager.js withdraw 50
```

This withdraws 50 SWF tokens from your staking position. Any pending rewards will be automatically updated during withdrawal.

#### Set APR (Admin Only)

If you are the admin of the contract, you can adjust the APR (Annual Percentage Rate) for staking rewards:

```
node swf-modular-manager.js set-apr 20
```

This sets the APR to 20%. The APR can be set between 0.01% and 50% (5000 basis points maximum). This action can only be performed by the contract admin.

### Role Router Commands

#### View Role Information

Check the role-based allocation system:

```
node swf-modular-manager.js roles-info
```

This displays:
- Main Distributor and Treasury addresses
- Number of configured wallets
- List of all wallets with their roles and allocation percentages

#### Distribute Tokens

Distribute tokens according to the predefined allocation percentages:

```
node swf-modular-manager.js distribute
```

This will prompt you to enter the amount of tokens to distribute. For example, if you distribute 1000 SWF tokens and the Treasury has a 20% allocation, it will receive 200 SWF tokens.

### Basket Index Commands

#### View Basket Information

Check the content and weights of the basket:

```
node swf-modular-manager.js basket-info
```

This displays:
- Basket name and symbol
- Number of assets in the basket
- List of all assets with their weights

## Component Details

### SWFModularEngine

The SWFModularEngine serves as the central integration point, allowing:

1. **Unified Interface**: Interact with all components through a single contract
2. **Component Management**: Initialize and update component addresses
3. **Function Forwarding**: Forward calls to the appropriate specialized component
4. **State Verification**: Check component status before executing functions

Key functions:
- `initializeBasketIndex(address)`
- `initializeRoleRouter(address)`
- `initializeStakingEngine(address)`
- Functions for interacting with all components

### SoloMethodEngineV2

This enhanced staking engine provides:

1. **Dynamic APR**: Adjustable rewards rate between 0.01% and 50%, set to 25% by default
2. **16-Wallet Structure**: Distributes staked tokens across 16 wallets with 5 role types
3. **Continuous Rewards**: Calculates rewards based on seconds elapsed since last action
4. **Precise Tracking**: Uses reward debt for accurate reward accounting

Key functions:
- `deposit(uint256 amount)`
- `withdraw(uint256 amount)`
- `claimRewards()`
- `setAPR(uint256 _newAprBps)`

### RoleRouter

The RoleRouter manages token distribution:

1. **Role Definitions**: Maps wallet addresses to named roles
2. **Allocation Percentages**: Assigns percentage shares to each role
3. **Reward Distribution**: Distributes tokens according to defined allocations
4. **Configurable Roles**: Allows admin to update roles and allocations

Key functions:
- `setRoles(address[], string[], uint256[])`
- `distributeRewards()`
- `setMainDistributor(address)`
- `setTreasury(address)`

### BasketIndex

The BasketIndex token represents a weighted portfolio:

1. **Asset Diversification**: Holds multiple underlying tokens with specified weights
2. **Portfolio Management**: Allows for rebalancing assets
3. **Tokenized Basket**: Represents the entire portfolio as a single ERC20 token
4. **Mint/Burn Mechanics**: Create or redeem basket tokens by depositing/withdrawing underlying assets

Key functions:
- `setAssets(address[], uint256[])`
- `rebalance()`
- `mint(uint256 amount)`
- `burn(uint256 amount)`

## Deployment

To deploy the modular system, use the provided deployment script:

```
npx hardhat run scripts/deployModularSystem.js --network polygon
```

This will:
1. Deploy all four component contracts
2. Initialize the ModularEngine with component addresses
3. Grant necessary permissions (MINTER_ROLE to SoloMethodEngine)
4. Set up default roles in the RoleRouter
5. Save deployment info to a JSON file

## Testing

Before interacting with the modular system on mainnet, you can test it on a local Hardhat node:

```
npx hardhat node
npx hardhat run scripts/testModularSystem.js --network localhost
```

This comprehensive test script will:
1. Check basic token functionality
2. Test staking with dynamic APR
3. Verify role-based distribution
4. Test basic basket operations
5. Validate component integration through the ModularEngine

## Important Notes

1. **Gas Prices**: The manager automatically sets gas prices to at least 37.5 gwei to ensure transactions are processed on the Polygon network. Adjust this if needed.

2. **Minimum Stake**: You must stake at least 50 SWF tokens.

3. **Dynamic APR**: The staking contract uses a dynamic APR system, initially set to 25%. The contract admin can adjust this rate between 0.01% and 50% to respond to market conditions.

4. **Reward Calculation**: Rewards are calculated continuously based on seconds elapsed since your last action (stake, claim, or withdraw). This provides more accurate reward compounding.

5. **Role Allocations**: The percentage shares for all roles must sum to exactly 100% (10000 basis points).

6. **Component Initialization**: All components must be properly initialized in the ModularEngine before use.

## Troubleshooting

If you encounter issues:

1. **Transaction failures**: Check that you have enough POL for gas fees

2. **Approval errors**: Make sure you approved enough tokens before staking or distributing

3. **Connection issues**: Verify your RPC URL and network configuration

4. **Component initialization**: Ensure all components are properly initialized in the ModularEngine

5. **Missing addresses**: Check that all required environment variables or deployment info is available

6. **Permission errors**: Ensure the appropriate permissions are granted (e.g., MINTER_ROLE)