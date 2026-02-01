# Sovran Wealth Fund Platform - Architecture

## Overview

The Sovran Wealth Fund (SWF) platform is a blockchain-based financial system that manages an ERC20 token on the Polygon network. The platform includes token distribution mechanics, staking functionality, and administrative dashboards.

The system is designed with modularity in mind, consisting of multiple interconnected components:

1. **SWF Token Contract**: Core ERC20 token with extended functionality
2. **Staking System**: Multiple contract modules for staking and rewards
3. **Admin Dashboard**: Administrative interface for token management
4. **Web Dashboard**: User-facing interface for token holders
5. **Wallet Tracker**: Monitoring system for wallet balances and distributions

## System Architecture

The SWF platform uses a multi-tier architecture:

### High-Level Architecture

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  Web Servers  │◄───►│  Blockchain   │◄───►│  Smart        │
│  & Dashboards │     │  Integration  │     │  Contracts    │
└───────────────┘     └───────────────┘     └───────────────┘
        │                                           │
        ▼                                           ▼
┌───────────────┐                         ┌───────────────┐
│  Analytics &  │                         │  Token        │
│  Monitoring   │                         │  Economics    │
└───────────────┘                         └───────────────┘
```

### Technology Stack

- **Frontend**: HTML, CSS, JavaScript (vanilla JS or minimal framework)
- **Backend**: Node.js with Express.js
- **Blockchain**: Ethereum/Polygon via ethers.js
- **Authentication**: Simple session-based authentication
- **Storage**: File-based storage (JSON), with plans for PostgreSQL integration

## Key Components

### 1. Smart Contracts

#### 1.1 SWF Token Contract

The core SWF token is an ERC20-compatible token deployed on the Polygon Mainnet with the following features:

- Role-based access control (minter, pauser roles)
- Pausable functionality for emergency situations
- Burnable capability for token holders
- Metadata support for additional token information

**Contract Address**: `0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7` (Polygon Mainnet)

#### 1.2 Staking Modules

The platform implements a modular staking system:

- **LiquidityVault**: Manages LP token staking for SWF/ETH and SWF/USDC pairs
- **GovernanceDividendPool**: Provides staking rewards to SWF token holders
- **SWFVaultAdapter**: Facilitates deposits to the SWF Treasury
- **SWFBasketVault**: Allows users to deposit SWF tokens and receive SWF-BASKET tokens
- **DynamicAPRController**: Adjusts staking APR based on vault deposits

#### 1.3 SoloMethodEngine

A specialized staking contract with:
- Dynamic APR (10-30%)
- 16-wallet structure for token distribution
- Multiple role types (BUYER, HOLDER, STAKER, LIQUIDITY, TRACKER)
- Minimum stake requirement (50 SWF)

### 2. Server Components

#### 2.1 Main Application Server (Port 5000)

Serves the primary web interface and provides API endpoints for:
- Token information
- Wallet balances
- Token economics data
- Blockchain connectivity via ethers.js

#### 2.2 Admin Dashboard (Port 8080)

Provides administrative interface for:
- Token distribution management
- Token verification functions
- Contract deployment workflows
- Wallet balance monitoring

#### 2.3 Admin Tracker (Port 3000)

Focused on analytics and monitoring:
- Growth simulation
- Financial logging
- Deposit tracking
- Income projections

### 3. Data Management

#### 3.1 Token Distribution System

The platform uses a 16-wallet structure defined in `wallets.json` with predefined allocation percentages:
- Treasury Wallet (20%)
- Development Wallet (10%)
- Marketing Wallet (10%)
- Other wallets with varied allocations

#### 3.2 Storage Strategy

Current implementation uses file-based storage:
- `stakingLogs.json`: Records staking activities
- `liquidity_history.json`: Tracks liquidity pool data
- `wallets.json`: Contains wallet addresses and allocations

Future plans include transitioning to PostgreSQL for more robust data management.

### 4. Authentication

The platform implements a simple username/password authentication system:
- Admin credentials stored in environment variables
- Session-based authentication for dashboard access
- Basic HTTP authentication for sensitive API endpoints

## Data Flow

### 1. Token Distribution Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Main Holder │────►│ Distributor │────►│  16 Role-   │
│   Wallet    │     │   Wallet    │     │ Based Wallets│
└─────────────┘     └─────────────┘     └─────────────┘
```

1. Initial distribution from Main Holder to all wallets according to allocations
2. Bank Wallet Funding for auto-distribution
3. Periodic auto-funding from bank to eligible wallets
4. Token rebalancing based on SOLO plan percentages

### 2. Staking Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  User Staking│────►│SoloMethod   │────►│ Rewards     │
│  Action     │     │Engine       │     │ Distribution │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                          ▼
                    ┌─────────────┐
                    │Dynamic APR  │
                    │Adjustment   │
                    └─────────────┘
```

1. Users stake SWF tokens in the SoloMethodEngine
2. Tokens are distributed across 16 virtual wallets with different roles
3. Rewards accrue based on the current APR
4. DynamicAPRController adjusts the APR based on total deposits

### 3. Admin Dashboard Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Admin      │────►│ Dashboard   │────►│ Blockchain  │
│  Login      │     │ Interface   │     │ Actions     │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                          ▼
                    ┌─────────────┐
                    │ Analytics & │
                    │ Monitoring  │
                    └─────────────┘
```

1. Admin authenticates to access dashboard
2. Interface displays token metrics and wallet balances
3. Admin can initiate blockchain transactions (minting, deployment)
4. Analytics provide insights on token economics and growth

## External Dependencies

### 1. Blockchain Infrastructure

- **Polygon Mainnet**: Primary blockchain for token deployment
- **Alchemy API**: RPC provider for Polygon network access
- **Polygonscan API**: For contract verification and blockchain data

### 2. Libraries and Frameworks

- **ethers.js**: For blockchain interactions
- **express.js**: Web server framework
- **Chart.js**: For data visualization
- **express-session**: For authentication management

### 3. External Services

- **Uniswap/QuickSwap**: For liquidity pool creation and management
- **IPFS**: For token metadata storage
- **Chainlink**: Referenced for future oracle integration

## Deployment Strategy

The SWF platform is designed to be deployed in multiple environments, with specific considerations for each deployment target:

### 1. Development Environment

- **Local Hardhat Network**: For initial smart contract development and testing
- **Replit Integration**: For collaborative development and testing

### 2. Testnet Deployment

- **Polygon Mumbai**: For integration testing before mainnet deployment
- **Test Configuration**: Less strict security measures, test token values

### 3. Mainnet Deployment

- **Polygon Mainnet**: Production environment for the SWF token
- **Multi-Phase Approach**: 
  - Phase 1: Core Components & Wallet Integration
  - Phase 2: Basic Transaction Functionality
  - Phase 3: Enhanced UI Components
  - Phase 4: Advanced User Features
  - Phase 5: Mainnet Deployment & Production Optimizations

### 4. Reliability Considerations

- **Safe Module Loading**: Prevent server crashes from missing modules
- **Graceful Error Handling**: Catch and log unhandled exceptions
- **RPC Endpoint Rotation**: Multiple blockchain RPC endpoints for reliability
- **Static Content Fallback**: When blockchain connectivity is unavailable

## Future Architecture Extensions

### 1. Database Migration

- Plan to transition from file-based storage to PostgreSQL for improved data management
- Preparation for higher user load and more complex data relationships

### 2. Enhanced Security

- Implementation of more robust authentication methods
- Additional contract security audits before mainnet scaling

### 3. Scaling Strategy

- Preparation for increased user base with performance optimizations
- Additional monitoring and analytics capabilities

### 4. Extended Ecosystem

- Integration with additional DeFi protocols
- Cross-chain functionality considerations