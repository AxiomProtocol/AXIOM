# Sovran Wealth Fund (SWF) Modules Guide

This guide provides an overview of the specialized modules that extend the Sovran Wealth Fund ecosystem's capabilities.

## Overview

The SWF Modules enhance the core functionality of the Sovran Wealth Fund token by providing:

1. Liquidity management for SWF token pairs
2. Governance rewards for SWF token stakers
3. Vault integration for SWF token holders
4. Unified coordination between all modules

These modules are designed to work together through a central integrator contract while maintaining their individual functionality.

## Module 1: Liquidity Vault

The Liquidity Vault module allows users to stake LP (Liquidity Provider) tokens, typically from decentralized exchanges like QuickSwap or Uniswap V2 on Polygon.

### Key Features:
- **LP Token Staking**: Users can deposit LP tokens representing SWF liquidity pairs
- **Individual Tracking**: System maintains records of each user's staked amount
- **Withdrawal Flexibility**: Users can withdraw their LP tokens at any time

### Technical Details:
- Contract: `LiquidityVault.sol`
- Dependencies: OpenZeppelin's `IERC20`, `Ownable`
- State Variables: 
  - `lpToken`: The LP token being staked
  - `staked`: Mapping of user addresses to staked amounts
  - `totalStaked`: Total LP tokens staked in the vault

### Deployment:
This module must be deployed with the LP token address (e.g., SWF-MATIC QuickSwap pair).

## Module 2: Governance Dividend Pool

The Governance Dividend Pool module allows SWF token holders to stake their tokens and earn rewards in the native currency (MATIC on Polygon).

### Key Features:
- **SWF Token Staking**: Users can stake SWF tokens
- **Time-Based Rewards**: Rewards accrue based on stake duration
- **Flexible Withdrawals**: Users can withdraw after claiming rewards
- **Reward Rate Control**: Configurable monthly reward rate (default ~1%)

### Technical Details:
- Contract: `GovernanceDividendPool.sol`
- Dependencies: OpenZeppelin's `IERC20`, `Ownable`
- State Variables:
  - `swfToken`: The SWF token being staked
  - `stakes`: Mapping of user addresses to staked amounts
  - `totalStaked`: Total SWF tokens staked
  - `lastClaim`: Last claim timestamp for each user
  - `rewardRate`: The configured reward rate

### Deployment:
This module must be deployed with the SWF token address and a reward rate (e.g., 1e16 for ~1% monthly).

## Module 3: SWF Vault Adapter

The SWF Vault Adapter module serves as an intermediary between SWF token holders and a designated vault, facilitating controlled transfers to the vault.

### Key Features:
- **Depositing SWF**: Users can deposit SWF tokens into the adapter
- **Withdrawal Flexibility**: Users can withdraw their deposited tokens
- **Forwarding Mechanism**: Owner can forward tokens to the designated vault

### Technical Details:
- Contract: `SWFVaultAdapter.sol`
- Dependencies: OpenZeppelin's `IERC20`, `Ownable`
- State Variables:
  - `swf`: The SWF token
  - `vault`: The designated vault address
  - `deposits`: Mapping of user addresses to deposited amounts
  - `totalDeposits`: Total SWF tokens deposited

### Deployment:
This module must be deployed with the SWF token address and a vault address.

## Integration with SWF Ecosystem

These modules complement the existing SWF ecosystem in the following ways:

1. **Liquidity Incentives**: The Liquidity Vault encourages users to provide liquidity for SWF tokens on decentralized exchanges, improving trading depth and reducing slippage.

2. **Governance Participation**: The Governance Dividend Pool rewards token holders who participate in governance, aligning their interests with the long-term success of the project.

3. **Capital Efficiency**: The SWF Vault Adapter allows for controlled forwarding of tokens to specialized vaults, enabling more efficient capital utilization.

## Deployment Process

To deploy these modules to Polygon Mainnet:

1. Set the required environment variables in `.env`:
   ```
   SWF_ADDRESS=0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7  # SWF token address
   LP_TOKEN_ADDRESS=0x...  # SWF-MATIC LP token address from QuickSwap/Uniswap
   VAULT_ADDRESS=0x...  # Address of the target vault (optional)
   MONTHLY_REWARD_RATE=10000000000000000  # 1% monthly (1e16) (optional)
   ```

2. Run the deployment script:
   ```
   npx hardhat run scripts/deployModules.js --network polygon
   ```

3. Verify the contracts on Polygonscan using the commands provided in the deployment output.

## Security Considerations

- The Governance Dividend Pool requires a source of MATIC to pay rewards
- The owner of each module has special permissions (standard Ownable pattern)
- Users should approve the contracts to spend their tokens before interacting

## Module 4: SWF Module Integrator

The SWF Module Integrator serves as a central coordination contract that connects all individual modules and provides simplified user interactions.

### Key Features:
- **One-Click Operations**: Users can stake or deposit tokens through a single contract
- **Automatic Reward Distribution**: Periodically distributes rewards to stakers
- **Unified Information**: Provides aggregate data across all modules
- **Centralized Administration**: Single point of management for all modules

### Technical Details:
- Contract: `SWFModuleIntegrator.sol`
- Dependencies: All three module contracts plus `ISovranWealthFund` interface
- State Variables:
  - `swfToken`: Reference to the SWF token contract
  - `liquidityVault`: Reference to the Liquidity Vault module
  - `governanceDividendPool`: Reference to the Governance Dividend Pool module
  - `vaultAdapter`: Reference to the SWF Vault Adapter module
  - `treasury`: Address for collecting and distributing rewards
  - `rewardDistributionFrequency`: Time between reward distributions (default 7 days)
  - `rewardsPercentage`: Percentage of treasury funds to distribute (default 50%)

### Deployment:
This integrator must be deployed after all three individual modules, with references to each module's address plus the SWF token and treasury addresses.

## Conclusion

These modules extend the SWF ecosystem with specialized functionality for liquidity management, governance rewards, and vault integration. The module integrator ties everything together, providing a seamless experience for users and administrators while maintaining the flexibility of individual components.

Together, these contracts form a powerful extension to the core SWF token, enabling advanced staking, rewards, and liquidity features that enhance the overall value proposition of the Sovran Wealth Fund.