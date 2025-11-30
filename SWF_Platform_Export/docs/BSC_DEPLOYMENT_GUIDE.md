# BSC Mainnet Deployment Guide

## Configuration Status ✅

Your Hardhat environment is now fully configured for BSC mainnet deployment with the following verified capabilities:

### Network Configuration
- **BSC Mainnet RPC**: `https://bsc-dataseed.binance.org/`
- **Chain ID**: 56 (verified)
- **Deployer Account**: `0xEcDdb7dFF2f61E1caC7AC767337A38E1aD851eD6`
- **Current Balance**: 0.0397 BNB (sufficient for deployment)
- **Latest Block**: 51,476,506+ (real-time connection verified)

### Contract Compilation
- **71 Solidity contracts compiled successfully**
- **Multiple compiler versions supported**: 0.8.17, 0.8.20, 0.8.21, 0.8.26
- **Primary contract**: `SWFCoreUpgradeable.sol`
- **Optimization enabled**: 200 runs for cost efficiency

## Deployment Commands

### 1. Test Network Connection
```bash
npx hardhat run scripts/test-network.js --network bscMainnet
```

### 2. Deploy to BSC Mainnet
```bash
npx hardhat run scripts/deploy.js --network bscMainnet
```

### 3. Verify Contract on BSCScan
```bash
npx hardhat verify --network bscMainnet <CONTRACT_ADDRESS>
```

## Deployment Process

### Pre-Deployment Checklist
- [x] BSC RPC endpoint configured
- [x] Private key set in environment
- [x] BSCScan API key configured
- [x] Contract compilation successful
- [x] Network connectivity verified
- [x] Deployer balance sufficient (>0.01 BNB)

### Expected Deployment Output
```
Deploying to network: bscMainnet
Chain ID: 56
Deploying with account: 0xEcDdb7dFF2f61E1caC7AC767337A38E1aD851eD6
Account balance: 0.039660315572985507 BNB
Getting contract factory...
Deploying SWFCoreUpgradeable...
SWFCoreUpgradeable deployed to: [CONTRACT_ADDRESS]
View on BSCScan: https://bscscan.com/address/[CONTRACT_ADDRESS]
```

## Configuration Details

### hardhat.config.js Features
- **Multi-version compiler support** for legacy compatibility
- **BSC-optimized gas settings** (5 gwei for mainnet)
- **Automatic BSCScan verification** integration
- **60-second timeout** for network operations
- **3 confirmation blocks** for deployment safety

### Environment Variables Used
```
BSC_MAINNET_RPC=https://bsc-dataseed.binance.org/
PRIVATE_KEY=[Your deployer private key]
BSCSCAN_API_KEY=[Your BSCScan API key]
```

## Contract Verification

Your configuration includes automatic BSCScan verification support. After deployment, verify your contract with:

```bash
npx hardhat verify --network bscMainnet [CONTRACT_ADDRESS] [CONSTRUCTOR_ARGS]
```

## Production Deployment Ready

Your environment is production-ready with:
- ✅ Real BSC mainnet connectivity
- ✅ Sufficient deployer balance  
- ✅ Contract compilation verified
- ✅ BSCScan verification configured
- ✅ Gas optimization enabled
- ✅ Deployment scripts tested

## Next Steps

1. **Deploy to BSC Mainnet**: Run the deployment command when ready
2. **Verify Contract**: Use BSCScan verification after deployment
3. **Update Frontend**: Update contract addresses in your application
4. **Test Integration**: Verify all functionality works with deployed contracts

Your BSC mainnet deployment infrastructure is complete and operational!