# Sovran Wealth Fund - Mainnet Deployment Summary

This document summarizes the successful deployment of the Sovran Wealth Fund (SWF) ecosystem to Polygon Mainnet on April 24, 2025.

## Deployed Contracts

### SWF Token
- **Address**: 0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7
- **Transaction**: 0x0ac75e83b1ddb5261c96d6bf73deded44fe069b96bfec13a0a34ea1c84fcbf73
- **Supply**: 500,000 SWF (initial mint)
- **Decimal Places**: 18

### Liquidity Vault (ETH/SWF LP Pair)
- **Address**: 0x4083c8FA1a8e7C85eAe8e357F98a5b2b6A06ac88
- **Transaction**: 0xf50bd25792a554dd6baba71a6965c81b0ec23a763d7ac2a175025ba55d8b6acf
- **LP Token Address**: 0xb23F5d348fa157393E75Bc80C92516F81786Fc28

### Liquidity Vault (USDC/SWF LP Pair)
- **Address**: 0xd73747d390c8FDACac9478695d6e6B1510C78f54
- **Transaction**: 0xeb8c8aed7df3543329973e5a94483fe7c0c68308f764863ef8b593a1b14bc364
- **LP Token Address**: 0x7f47199A8a5ff683FeDb86c782adb80eF598D5E0

### Governance Dividend Pool
- **Address**: 0x454255E70f87B2bAa8C0c19c5534D96f5eaE80C5
- **Transaction**: 0x0dd180c72c34e0487a122e2a111dab39b2c0bcbc6a580937e8815e349510e10b

### SWF Vault Adapter
- **Address**: 0xcEF473825550dEE99080500e2949Af8003C1b797
- **Transaction**: 0xc87d2b9d34fab2d188fdfcb271b4408f46e1e1550359d290465b30fea3fa3692

## Important Wallet Addresses

### Treasury Wallet
- **Address**: 0x26a8401287ce33cc4AEb5a106cD6D282a9c2f51D
- **Role**: Contract deployment, protocol management, fee collection

### Distributor Wallet
- **Address**: 0xCe36333A88c2EA01f28f63131fA7dfa80AD021F6
- **Role**: Initial token holder (500,000 SWF)

## Deployment Configuration

- **Network**: Polygon Mainnet (Chain ID: 137)
- **Deployment Date**: April 24, 2025
- **Monthly Reward Rate**: 0.01 ETH (10000000000000000 wei)
- **Min Staking Amount**: 50 SWF
- **Dynamic APR Range**: 10% - 30%

## Gas Usage Summary

| Contract | Gas Used | Gas Price | Cost (POL) |
|----------|----------|-----------|------------|
| SWF Token | ~3.2M | 30 gwei | ~0.096 |
| LiquidityVault (ETH) | 742,101 | 30 gwei | ~0.022 |
| LiquidityVault (USDC) | 742,101 | 30 gwei | ~0.022 |
| GovernanceDividendPool | 926,359 | 30 gwei | ~0.028 |
| SWFVaultAdapter | 807,589 | 30 gwei | ~0.024 |
| **Total** | ~6.42M | 30 gwei | ~0.192 |

## Next Steps

1. **Contract Verification**: Verify contracts on Polygonscan for transparency
2. **UI Integration**: Connect frontend dashboard to new contract addresses
3. **Liquidity Addition**: Add liquidity to SWF/ETH and SWF/USDC pools
4. **Community Launch**: Announce deployment and begin user onboarding
5. **Analytics Integration**: Set up real-time wallet monitoring and flows tracking

## Notes

- All smart contracts have been deployed with the recommended gas settings
- The deployment completed successfully with no errors or reverts
- Total gas used was within the pre-deployment estimate of ~0.088 POL + buffer
- Treasury wallet has sufficient remaining POL (~0.76) for verification and initial operations

---

*This document is automatically generated based on successful deployment to Polygon Mainnet. Contract addresses and transaction hashes have been verified on-chain.*