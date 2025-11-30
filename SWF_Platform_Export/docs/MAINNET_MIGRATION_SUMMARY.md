# Sovran Wealth Fund (SWF) - Mainnet Migration Summary

This document summarizes the migration of the Sovran Wealth Fund (SWF) token ecosystem to Polygon Mainnet.

## Migration Overview

The SWF ecosystem has been deployed to Polygon Mainnet with the following components:

1. **SWF Token**: An ERC-20 token with governance, staking, and rewards functionality
2. **Staking Modules**:
   - **LiquidityVault**: Manages LP token staking for SWF/ETH and SWF/USDC pairs
   - **GovernanceDividendPool**: Provides staking rewards to SWF token holders
   - **SWFVaultAdapter**: Facilitates deposits to the SWF Treasury
3. **Module Integrator**: Central contract that integrates all modules for simplified user interaction

## Deployed Contract Addresses

| Contract                  | Address                                    | Notes                                |
|---------------------------|-----------------------------------------------|--------------------------------------|
| SWF Token                 | 0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7   | Already deployed                     |
| LiquidityVault (ETH)      | *To be updated after deployment*             | Manages SWF/ETH LP tokens            |
| LiquidityVault (USDC)     | *To be updated after deployment*             | Manages SWF/USDC LP tokens           |
| GovernanceDividendPool    | *To be updated after deployment*             | Provides staking rewards             |
| SWFVaultAdapter           | *To be updated after deployment*             | Treasury interface                   |
| ModuleIntegrator          | *To be updated after deployment*             | Optional integration contract        |

## Liquidity Pair Information

| LP Pair     | LP Token Address                            | DEX           |
|-------------|---------------------------------------------|---------------|
| SWF/ETH     | 0xb23F5d348fa157393E75Bc80C92516F81786Fc28 | QuickSwap     |
| SWF/USDC    | 0x7f47199A8a5ff683FeDb86c782adb80eF598D5E0 | QuickSwap     |

## Treasury and Management Addresses

| Purpose               | Address                                    | Notes                                |
|-----------------------|-----------------------------------------------|--------------------------------------|
| Treasury Wallet       | 0x26a8401287ce33cc4AEb5a106cD6D282a9c2f51D   | Receives and manages ecosystem funds |
| Main Distributor      | 0xCe36333A88c2EA01f28f63131fA7dfa80AD021F6   | Distributes SWF tokens               |

## Migration Steps Completed

1. ✓ SWF token contract deployed to Polygon Mainnet
2. ✓ 500,000 SWF tokens minted to distribution wallet
3. ✓ LP pairs created on QuickSwap for SWF/ETH and SWF/USDC
4. ✓ Staking contracts upgraded to use OpenZeppelin v5 Ownable
5. ✓ Modified contracts to support multiple LP pairs
6. ✓ Created deployment scripts for mainnet deployment
7. ✓ Created APIs to fetch contract information and status
8. ✓ Updated environment variables for mainnet configuration

## Migration Steps Remaining

1. Deploy staking contracts to Polygon Mainnet
   - Deployment package created (SWF_Polygon_Deployment_Package.zip)
   - Contract artifact issues identified and resolved using fully qualified paths
   - Added optimized deployment script with proper contract resolution
   - Created verification scripts for PolygonScan integration
2. Verify contracts on PolygonScan
3. Deploy Module Integrator (optional)
4. Initialize contracts with initial liquidity
5. Test full ecosystem functionality
6. Transition users to the new system

## Technical Details

### Contract Features

- **SWF Token**:
  - Role-based permissions for minting (MINTER_ROLE)
  - Pausable functionality for emergencies
  - Burn capability for token holders

- **LiquidityVault**:
  - Supports staking multiple LP token types
  - Tracks user contributions
  - Calculates rewards

- **GovernanceDividendPool**:
  - Time-based rewards for stakers
  - Configurable reward rate
  - Automatic reward claiming during withdrawals

- **SWFVaultAdapter**:
  - Treasury deposit interface
  - Owner-controlled fund management
  - Total deposits tracking

### Environment Setup

The ecosystem requires the following environment variables to be set:

```
# API Keys
ALCHEMY_API_KEY=...
POLYGONSCAN_API_KEY=...

# Contract Addresses
SWF_TOKEN_ADDRESS=...
LIQUIDITY_VAULT_ETH=...
LIQUIDITY_VAULT_USDC=...
GOVERNANCE_POOL=...
VAULT_ADAPTER=...
MODULE_INTEGRATOR_ADDRESS=...

# LP Token Addresses
LP_TOKEN_ADDRESS=...
LP_TOKEN_ADDRESS_USDC=...

# Treasury and Management
TREASURY_WALLET=...
MAIN_DISTRIBUTOR_ADDRESS=...
```

## Next Steps and Recommendations

1. **Security Monitoring**:
   - Continuously monitor contract interactions
   - Set up alerts for large transactions

2. **Community Engagement**:
   - Communicate deployment details to community
   - Create guides for users to interact with the new system

3. **Future Enhancements**:
   - Consider implementing governance voting
   - Plan for potential contract upgrades

## Additional Resources

- [MAINNET_DEPLOYMENT_GUIDE.md](./MAINNET_DEPLOYMENT_GUIDE.md): Detailed deployment instructions
- [SWF_STAKING_GUIDE.md](./SWF_STAKING_GUIDE.md): Guide to staking modules
- [SWF_MODULES_GUIDE.md](./SWF_MODULES_GUIDE.md): Documentation of the modular system

---

*Last Updated: April 24, 2025 - 19:34 UTC*