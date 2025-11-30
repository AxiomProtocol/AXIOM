# Sovran Wealth Fund (SWF) Token

A comprehensive ERC20 token implementation designed for the Sovran Wealth Fund ecosystem. Built with OpenZeppelin contracts and designed for easy verification on Polygonscan.

## Features

- **Multi-Asset Pegging Framework**: Links to 11 different cryptocurrencies including BTC and XRP
- **Advanced Staking System**: 16-wallet structure with 5 role types and dynamic APR
- **Role-Based Access Control**: Fine-grained permission system
- **Module Support**: Compatible with liquidity vaults, governance pools, and other DeFi components
- **Fully Verifiable**: Designed for easy contract verification on Polygonscan

## Technical Components

### Core ERC20 Functionality
- Total supply: 1,000,000,000 SWF tokens
- 18 decimals precision
- Standard transfer, approve, and transferFrom methods

### Role-Based Access Control
- `DEFAULT_ADMIN_ROLE`: Overall contract management
- `MINTER_ROLE`: Ability to mint new tokens (for rewards)
- `PAUSER_ROLE`: Can pause/unpause token transfers
- `PEG_MANAGER_ROLE`: Manages pegged asset configurations
- `RESERVE_MANAGER_ROLE`: Updates reserve balances
- `TRANSFER_ROLE`: Special transfer permissions

### Staking & Rewards
- 16-wallet virtual structure per staker
- 5 role types: BUYER, HOLDER, STAKER, LIQUIDITY, TRACKER
- Dynamic APR system (default: 25%)
- Minimum stake amount: 50 SWF
- Time-based reward calculation for accuracy

### Multi-Asset Pegging
- Dynamic basket of 11 cryptocurrencies
- Special focus on BTC (30% weight) and XRP (15% weight)
- Oracle price feed integration
- Reserve balance tracking

## Getting Started

### Prerequisites
- Node.js v14+ and npm/yarn
- Hardhat development environment
- Polygon RPC endpoint (mainnet or Mumbai testnet)
- Private key for deployment

### Installation

```bash
# Clone the repository
git clone https://github.com/sovranwealthfund/swf-token.git
cd swf-token

# Install dependencies
npm install

# Create .env file from example
cp .env.example .env
```

Edit `.env` and add your environment variables.

### Testing

```bash
# Run all tests
npm test

# Run a specific test file
npx hardhat test test/SovranWealthFund.test.js
```

### Deployment

```bash
# Deploy to Polygon Mainnet
npm run deploy

# Deploy to Mumbai Testnet
npm run deploy:test
```

### Verification

After deployment, use the provided command to verify the contract on Polygonscan:

```bash
npx hardhat verify --network polygon DEPLOYED_CONTRACT_ADDRESS
```

## Multi-Asset Pegging System

The SWF token implements a sophisticated multi-asset pegging system that creates a basket of cryptocurrencies. The basket includes:

1. **Bitcoin (BTC)** - Primary store of value
2. **XRP** - Cross-border payment focus
3. **Ethereum (ETH)** - Smart contract platform
4. **USDC** - Stablecoin component
5. **Polygon (MATIC)** - Host network
6. **Binance Coin (BNB)** - Exchange token
7. **Solana (SOL)** - High-performance blockchain
8. **Cardano (ADA)** - Research-driven platform
9. **Avalanche (AVAX)** - Fast finality blockchain
10. **Polkadot (DOT)** - Interoperability protocol
11. **Chainlink (LINK)** - Oracle network

Each asset has a configurable weight in the basket and a target reserve ratio.

## Staking System

The SWF token includes an integrated staking system with these features:

- **Virtual Wallet Structure**: Each staker gets 16 virtual wallets
- **Role Assignment**: Each wallet is assigned one of 5 role types
- **Even Distribution**: Staked tokens are distributed across wallets
- **Precise Rewards**: Rewards calculated using exact time elapsed
- **Minimum Stake**: 50 SWF minimum stake amount

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Security

This contract has been built using battle-tested OpenZeppelin components following best practices, but should undergo a professional audit before production use.