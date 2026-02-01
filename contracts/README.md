# Axiom Protocol Token (AXM)

## 🎯 Quick Info

**Contract Address:** `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D`  
**Network:** Arbitrum One (Chain ID 42161)  
**Status:** ✅ Deployed and Verified  
**Verified:** Nov 19, 2025

## 📋 Files

- `AxiomV2.sol` - Full Solidity source code (553 lines)
- `AxiomV2.abi.json` - Complete ABI for frontend integration
- `deployment-info.json` - Deployment metadata and network info

## 🔗 Links

- **Blockscout Explorer:** https://arbitrum.blockscout.com/address/0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D
- **Arbitrum RPC:** https://arb1.arbitrum.io/rpc
- **Chain ID:** 42161

## 🔑 Key Features

- **15 Billion Max Supply** with 18 decimals
- **ERC20 + Extensions:** Burnable, Permit, Votes
- **Dynamic Fee Routing** to 6 different vaults
- **Role-Based Access Control** (7 roles)
- **Compliance & KYC Integration** (optional)
- **Anti-Whale Protection** (configurable)
- **Governance Voting Power** delegation
- **Real-World Revenue** integration (rent & trucking)
- **Demurrage System** for economic policy

## 👥 Roles

| Role | Description |
|------|-------------|
| `DEFAULT_ADMIN_ROLE` | Full administrative control |
| `PAUSER_ROLE` | Emergency pause/unpause |
| `MINTER_ROLE` | Mint tokens (up to MAX_SUPPLY) |
| `COMPLIANCE_ROLE` | Manage compliance settings |
| `RESCUER_ROLE` | Rescue stuck tokens |
| `FEE_MANAGER_ROLE` | Configure fee parameters |
| `ORACLE_MANAGER_ROLE` | Update reserve oracle |
| `TREASURY_ROLE` | Manage demurrage |

## 📦 Integration Example

```javascript
// Import the ABI
import abi from './contracts/AxiomV2.abi.json';
import { ethers } from 'ethers';

// Connect to Arbitrum network
const provider = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');

// Initialize contract
const contractAddress = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D';
const axmToken = new ethers.Contract(contractAddress, abi, provider);

// Read token info
const name = await axmToken.name();        // "Axiom Protocol Token"
const symbol = await axmToken.symbol();    // "AXM"
const decimals = await axmToken.decimals(); // 18
const totalSupply = await axmToken.totalSupply();

// Check balance
const balance = await axmToken.balanceOf(walletAddress);
console.log(`Balance: ${ethers.formatEther(balance)} AXM`);
```

## 🏗️ Constructor Parameters

The contract was deployed with 7 vault addresses:
1. Admin address
2. Distribution Vault
3. Burn Vault
4. Staking Vault
5. Liquidity Vault
6. Dividend Vault
7. Treasury Vault

All vaults are configured and operational.

## 🔐 Security Features

- ✅ Pausable in emergency
- ✅ Reentrancy guard on sensitive functions
- ✅ OpenZeppelin v5 security standards
- ✅ Role-based access control
- ✅ Supply cap enforcement
- ✅ Already deployed and verified on-chain
