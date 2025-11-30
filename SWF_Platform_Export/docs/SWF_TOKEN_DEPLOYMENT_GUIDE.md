# SWF Token Deployment Guide

## Overview
This guide covers the deployment of the advanced SWF Token contract with real estate tokenization, gold backing, and Merkle airdrop functionality to BSC Mainnet.

## Contract Features
- **ERC20 Standard**: Full ERC20 implementation with burn functionality
- **Merkle Airdrops**: Secure token distribution system
- **Real Estate Tokenization**: Property backing mechanism
- **Gold Certificates**: Kinesis gold integration
- **Owner Controls**: Minting, rescue, and administrative functions

## Prerequisites
- BSC Mainnet RPC access configured
- Private key with sufficient BNB balance (minimum 0.01 BNB)
- BSCScan API key for verification
- Hardhat environment properly configured

## Deployment Steps

### 1. Verify Environment Setup
```bash
# Test network connectivity
npx hardhat run scripts/test-network.js --network bscMainnet

# Expected output:
# Network: bscMainnet
# Chain ID: 56
# Balance: X.XXX BNB
# ✅ Network connection successful!
```

### 2. Compile Contract
```bash
# Compile the SWF Token contract
npx hardhat compile

# Expected output:
# Compiled 5 Solidity files successfully
```

### 3. Deploy to BSC Mainnet
```bash
# Deploy SWF Token to BSC Mainnet
npx hardhat run scripts/deploy-swf-token.js --network bscMainnet
```

### 4. Verify Contract on BSCScan
```bash
# Auto-generated verification command
npx hardhat verify --network bscMainnet <CONTRACT_ADDRESS>
```

## Contract Specifications

### Initial Configuration
- **Name**: Sovran Wealth Fund
- **Symbol**: SWF
- **Decimals**: 18
- **Initial Supply**: 1,000,000 SWF tokens
- **Owner**: Deployer address

### Advanced Features

#### Merkle Airdrop System
```solidity
function claimAirdrop(bytes32[] calldata proof, uint256 amount) external
function setMerkleRoot(bytes32 newRoot) external onlyOwner
```

#### Real Estate Tokenization
```solidity
function tokenizeRealEstate(
    string calldata propertyId,
    string calldata location,
    uint256 valuation,
    uint256 backingAmount
) external onlyOwner
```

#### Gold Certificate Integration
```solidity
function assignGoldBacking(
    address user,
    uint256 grams,
    string calldata certId
) external onlyOwner
```

## Post-Deployment Integration

### Environment Variables
Add to `.env` file:
```
SWF_TOKEN_CONTRACT=<DEPLOYED_CONTRACT_ADDRESS>
CONTRACT_ADDRESS=<DEPLOYED_CONTRACT_ADDRESS>
```

### Frontend Integration
The contract ABI will be automatically generated at:
```
artifacts/contracts/SWFToken.sol/SWFToken.json
```

### Backend Integration
Import the contract in your Node.js backend:
```javascript
const { ethers } = require('ethers');
const contractABI = require('./artifacts/contracts/SWFToken.sol/SWFToken.json');

const contract = new ethers.Contract(
    process.env.SWF_TOKEN_CONTRACT,
    contractABI.abi,
    provider
);
```

## Gas Optimization

### Estimated Gas Costs
- **Deployment**: ~1,200,000 gas
- **Token Transfer**: ~65,000 gas
- **Airdrop Claim**: ~85,000 gas
- **Real Estate Tokenization**: ~120,000 gas
- **Gold Backing Assignment**: ~95,000 gas

### Current BSC Gas Prices
- **Standard**: 3 gwei
- **Fast**: 5 gwei
- **Instant**: 10 gwei

## Security Considerations

### Owner Controls
- Only owner can mint new tokens
- Only owner can set Merkle roots for airdrops
- Only owner can tokenize real estate assets
- Only owner can assign gold backing certificates

### Access Control
- Built on OpenZeppelin's battle-tested Ownable contract
- Proper input validation on all functions
- Reentrancy protection inherent in ERC20 standard

## Verification Guide

### BSCScan Verification
1. Contract will be automatically verified during deployment
2. Source code will be published on BSCScan
3. Contract interactions available through BSCScan interface

### Manual Verification (if needed)
```bash
npx hardhat verify --network bscMainnet <CONTRACT_ADDRESS> \
  --constructor-args arguments.js
```

## Troubleshooting

### Common Issues
1. **Insufficient Balance**: Ensure minimum 0.01 BNB for deployment
2. **Network Timeout**: Try different RPC endpoints
3. **Gas Estimation**: Increase gas limit if deployment fails

### Support
- Check deployment logs for detailed error messages
- Verify network connectivity with test script
- Ensure all environment variables are properly set

## Example Usage

### Basic Token Operations
```javascript
// Get token balance
const balance = await contract.balanceOf(userAddress);

// Transfer tokens
await contract.transfer(recipientAddress, amount);

// Approve spending
await contract.approve(spenderAddress, amount);
```

### Advanced Features
```javascript
// Claim airdrop
await contract.claimAirdrop(merkleProof, amount);

// Check gold backing
const [grams, certId] = await contract.getGoldBacking(userAddress);

// Get real estate asset details
const asset = await contract.getRealEstateAsset(assetId);
```

## Integration with SWF Platform

### Wallet Dashboard
- Display SWF token balances
- Show airdrop eligibility
- Display gold backing information

### Admin Panel
- Mint new tokens
- Set up airdrop campaigns
- Manage real estate tokenization
- Assign gold certificates

### API Endpoints
- `/api/token/balance/:address`
- `/api/airdrop/eligibility/:address`
- `/api/realestate/assets`
- `/api/gold/backing/:address`

## Deployment Checklist

- [ ] BSC Mainnet RPC configured
- [ ] Sufficient BNB balance
- [ ] Contract compiled successfully
- [ ] Test deployment on local network
- [ ] Deploy to BSC Mainnet
- [ ] Verify contract on BSCScan
- [ ] Update environment variables
- [ ] Test contract functions
- [ ] Update frontend integration
- [ ] Document contract address

## Contract Address
After successful deployment, the contract address will be displayed and should be added to all relevant configuration files and documentation.

**Contract Address**: `TBD after deployment`
**BSCScan Link**: `https://bscscan.com/address/TBD`
**Transaction Hash**: `TBD after deployment`