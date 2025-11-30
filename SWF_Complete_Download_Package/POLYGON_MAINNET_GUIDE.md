# Sovran Wealth Fund - Polygon Mainnet Guide

This guide provides comprehensive information about the Sovran Wealth Fund (SWF) deployment on Polygon Mainnet and instructions for interacting with the deployed contracts.

## Deployed Contract Addresses

| Contract | Address | Purpose |
|----------|---------|---------|
| SWF Token | 0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7 | ERC-20 token with role-based permissions |
| LiquidityVault (ETH) | 0x4083c8FA1a8e7C85eAe8e357F98a5b2b6A06ac88 | Manages ETH LP tokens and rewards |
| LiquidityVault (USDC) | 0xd73747d390c8FDACac9478695d6e6B1510C78f54 | Manages USDC LP tokens and rewards |
| GovernanceDividendPool | 0x454255E70f87B2bAa8C0c19c5534D96f5eaE80C5 | Distributes governance rewards |
| SWFVaultAdapter | 0xcEF473825550dEE99080500e2949Af8003C1b797 | Connects staking to the vault system |

### LP Token Addresses

| LP Pair | Address | Exchange |
|---------|---------|----------|
| SWF/ETH | 0xb23F5d348fa157393E75Bc80C92516F81786Fc28 | QuickSwap |
| SWF/USDC | 0x7f47199A8a5ff683FeDb86c782adb80eF598D5E0 | QuickSwap |

## Important Wallets

| Wallet | Address | Role |
|--------|---------|------|
| Treasury | 0x26a8401287ce33cc4AEb5a106cD6D282a9c2f51D | Contract deployment, protocol management |
| Distributor | 0xCe36333A88c2EA01f28f63131fA7dfa80AD021F6 | Initial token holder (500,000 SWF) |

## Contract Verification

All contracts have been deployed with verified source code on Polygonscan. You can view the contracts directly:

- [SWF Token](https://polygonscan.com/token/0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7)
- [LiquidityVault (ETH)](https://polygonscan.com/address/0x4083c8FA1a8e7C85eAe8e357F98a5b2b6A06ac88)
- [LiquidityVault (USDC)](https://polygonscan.com/address/0xd73747d390c8FDACac9478695d6e6B1510C78f54)
- [GovernanceDividendPool](https://polygonscan.com/address/0x454255E70f87B2bAa8C0c19c5534D96f5eaE80C5)
- [SWFVaultAdapter](https://polygonscan.com/address/0xcEF473825550dEE99080500e2949Af8003C1b797)

## Interacting with Contracts

### Adding SWF to MetaMask

1. Open MetaMask and ensure you're connected to Polygon Mainnet
2. Click "Import Token" at the bottom of the assets list
3. Select "Custom Token" and enter the token address: `0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7`
4. The token symbol (SWF) and decimals (18) should load automatically
5. Click "Add Custom Token" and then "Import Tokens" to confirm

### Staking SWF Tokens

1. Approve the SWFVaultAdapter to spend your SWF tokens
2. Call the `stake(uint256 amount)` function on the SWFVaultAdapter contract
3. The minimum staking amount is 50 SWF tokens

### Contributing Liquidity

1. To provide liquidity to the SWF/ETH pair:
   - Visit QuickSwap: https://quickswap.exchange/#/add/ETH/0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7
   - Add liquidity with equal values of ETH and SWF
   - Approve and stake the received LP tokens in the ETH LiquidityVault

2. To provide liquidity to the SWF/USDC pair:
   - Visit QuickSwap: https://quickswap.exchange/#/add/0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174/0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7
   - Add liquidity with equal values of USDC and SWF
   - Approve and stake the received LP tokens in the USDC LiquidityVault

## Dynamic APR System

The SWF staking system implements a dynamic APR mechanism that adjusts based on vault deposit levels:

| Deposit Level | TVL Range | APR |
|---------------|-----------|-----|
| Low | 0 - 100,000 SWF | 30% |
| Medium | 100,000 - 250,000 SWF | 20% |
| High | 250,000+ SWF | 10% |

## API Integration

The SWF API provides programmatic access to the contract ecosystem:

- Base URL: `https://swf-api.example.com/api`
- Status: `GET /status`
- Contracts: `GET /token`, `GET /modules/liquidity`, etc.
- Phase 3 Analytics: `GET /phase3/wallets`, `GET /phase3/income-flow`, etc.

## Transaction Verification

When interacting with SWF contracts, always verify:

1. The transaction is being sent to the correct contract address
2. The function called matches your intended action
3. Gas fees are reasonable (30 gwei is typically sufficient on Polygon)
4. You're connecting to the real SWF contracts (check addresses against this guide)

## Security Considerations

- SWF contracts implement standard security features including reentrancy guards and access controls
- The pause mechanism allows emergency stopping of token transfers if needed
- Only the Treasury wallet has admin/owner permissions on the contracts

## Support and Resources

- Dashboard: [https://dashboard.sovranwealthfund.com](https://dashboard.sovranwealthfund.com)
- Documentation: [https://docs.sovranwealthfund.com](https://docs.sovranwealthfund.com)
- Support: [support@sovranwealthfund.com](mailto:support@sovranwealthfund.com)
- GitHub: [https://github.com/SovranWealthFund](https://github.com/SovranWealthFund)

---

Last Updated: April 24, 2025