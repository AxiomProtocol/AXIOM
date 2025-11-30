# Sovran Wealth Fund - Token Management Guide

This guide details how to manage and interact with the SovranWealthFund (SWF) token, including its special features and administrative functions.

## Token Overview

The SovranWealthFund token is an ERC20 token deployed on the Polygon blockchain with the following enhanced features:

1. **Role-Based Access Control**: Permission system for minting and administrative functions
2. **Pausable Functionality**: Ability to pause token transfers during emergencies
3. **Burnable Capability**: Token holders can burn their tokens
4. **Metadata Support**: Token links to IPFS-hosted metadata for complete information

## Token Details

- **Name**: Sovran Wealth Fund
- **Symbol**: SWF
- **Decimals**: 18
- **Contract Address**: 0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7 (Polygon Mainnet)
- **IPFS Metadata**: ipfs://bafybeieum7kw52qswf4tmnxzaejsmm3orecgq2oewh6mu6y4u7imzrjwy

## CLI Token Manager

The project includes a comprehensive CLI tool (`swf-token-manager.js`) for interacting with the token:

### View Token Information

Get details about the token and your balance:

```
node swf-token-manager.js info
```

This displays:
- Token name, symbol, and total supply
- Your connected wallet address and balance
- Current token state (paused/unpaused)
- Roles information (who has minting permissions)

### Check Any Address Balance

Check the token balance of any address:

```
node swf-token-manager.js balance 0xYourAddressHere
```

### Mint Tokens (Admin Only)

If you have the MINTER_ROLE, you can mint new tokens:

```
node swf-token-manager.js mint 0xRecipientAddress 100
```

This mints 100 SWF tokens to the specified address.

### Toggle Pause State (Admin Only)

If you are the contract admin, you can pause/unpause all token transfers:

```
node swf-token-manager.js toggle-pause
```

This function is designed for emergency situations where token transfers need to be temporarily halted.

### Grant Minter Role (Admin Only)

Grant minting permissions to a new address:

```
node swf-token-manager.js grant-minter 0xNewMinterAddress
```

This allows the specified address to mint new tokens.

### Revoke Minter Role (Admin Only)

Remove minting permissions from an address:

```
node swf-token-manager.js revoke-minter 0xMinterAddress
```

## Token Features Explained

### Role-Based Access Control

The token uses OpenZeppelin's PermissionsEnumerable for granular access control:

1. **DEFAULT_ADMIN_ROLE**: Can grant and revoke all other roles
2. **MINTER_ROLE**: Can mint new tokens
3. **PAUSER_ROLE**: Can pause and unpause token transfers

The deployer address automatically receives all roles, and typically shares admin rights with a Treasury address.

### Pausable Mechanism

The token implements OpenZeppelin's Pausable module:

- When paused, all transfers are blocked
- Only accounts with PAUSER_ROLE can pause/unpause
- Pausing doesn't affect approvals or balance viewing
- Intended for emergency situations only

### Burning Capability

Any token holder can burn their own tokens:

```javascript
// Example code for burning tokens
await swfToken.burn(ethers.utils.parseEther("10"));
```

Once tokens are burned, they are permanently removed from circulation and cannot be recovered.

## Integration with IPFS Metadata

The token metadata is stored on IPFS for decentralized access:

- **IPFS CID**: bafybeieum7kw52qswf4tmnxzaejsmm3orecgq2oewh6mu6y4u7imzrjwy
- **Gateway URL**: https://bafybeieum7kw52qswf4tmnxzaejsmm3orecgq2oewh6mu6y4u7imzrjwy.ipfs.storacha.network

The metadata includes:
- Basic token information (name, symbol, description)
- Contract details and network information
- Attributes including staking parameters
- Information about the modular system components
- Links to relevant resources

## Programming with the Token

### Using ethers.js

```javascript
const { ethers } = require("ethers");
const tokenABI = require("./abis/SovranWealthFund.json");

// Connect to provider
const provider = new ethers.providers.JsonRpcProvider("https://polygon-rpc.com");
const wallet = new ethers.Wallet("PRIVATE_KEY", provider);

// Initialize contract instance
const tokenAddress = "0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7";
const swfToken = new ethers.Contract(tokenAddress, tokenABI, wallet);

// Get token information
const name = await swfToken.name();
const symbol = await swfToken.symbol();
const totalSupply = await swfToken.totalSupply();
const decimals = await swfToken.decimals();
const balance = await swfToken.balanceOf(wallet.address);

console.log(`${name} (${symbol})`);
console.log(`Total Supply: ${ethers.utils.formatEther(totalSupply)} ${symbol}`);
console.log(`Your Balance: ${ethers.utils.formatEther(balance)} ${symbol}`);

// Transfer tokens
const recipient = "0xRecipientAddressHere";
const amount = ethers.utils.parseEther("10"); // 10 SWF
await swfToken.transfer(recipient, amount);

// Check allowances
const spender = "0xSpenderAddressHere";
const allowance = await swfToken.allowance(wallet.address, spender);
console.log(`Allowance for ${spender}: ${ethers.utils.formatEther(allowance)} SWF`);

// Approve spending
await swfToken.approve(spender, ethers.utils.parseEther("50"));

// Check role information (admin only)
const MINTER_ROLE = await swfToken.MINTER_ROLE();
const hasMinterRole = await swfToken.hasRole(MINTER_ROLE, wallet.address);
console.log(`Has minter role: ${hasMinterRole}`);
```

### Events to Monitor

The token contract emits standard ERC20 events plus role management events:

- **Transfer**: When tokens are transferred between addresses
- **Approval**: When spending allowance is granted
- **RoleGranted**: When a role is assigned to an address
- **RoleRevoked**: When a role is removed from an address
- **Paused**: When the token is paused
- **Unpaused**: When the token is unpaused

## Security Considerations

1. **Private Keys**: Never share your private key or expose it in code
2. **Role Management**: Be extremely careful when granting roles, especially admin rights
3. **Gas Fees**: Ensure you have enough POL for gas (recommended 37.5+ gwei for Polygon)
4. **Pausable Impact**: Pausing the token affects ALL transfers, use only in emergencies
5. **Burning is Permanent**: Burned tokens cannot be recovered

## Integration with the Modular System

The SWF token serves as the foundation for the entire modular system:

1. **Staking Component**: SoloMethodEngineV2 requires MINTER_ROLE to distribute staking rewards
2. **BasketIndex**: Can include SWF as one of its underlying assets
3. **RoleRouter**: Distributes SWF tokens according to predefined allocations
4. **ModularEngine**: Acts as the central integration point for token-related functions

Most users will interact with the token through these modular components rather than directly with the token contract.

## Mainnet Deployment Information

The SWF token was deployed to Polygon Mainnet with the following details:

- **Transaction Hash**: 0x0ac75e83b1ddb5261c96d6bf73deded44fe069b96bfec13a0a34ea1c84fcbf73
- **Block Number**: 51289374
- **Deployer Address**: 0xCe36333A88c2EA01f28f63131fA7dfa80AD021F6
- **Contract Address**: 0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7
- **Initial Treasury**: 0x26A8401287cE33CC4aeb5a106cd6D282a9C2f51d

## Troubleshooting

If you encounter issues with the token:

1. **Failed Transfers**: Check if the token is paused or if you have sufficient balance
2. **Minting Problems**: Verify you have the MINTER_ROLE
3. **Role Management**: Only admin can grant/revoke roles
4. **Gas Issues**: Increase gas price to at least 37.5 gwei for Polygon mainnet
5. **Contract Verification**: The contract is verified on Polygonscan for transparency

## Conclusion

The SovranWealthFund token combines standard ERC20 functionality with advanced features for security and flexibility. Through the role-based permission system, it enables a sophisticated ecosystem centered around the modular components while maintaining strong access controls.

For questions or additional assistance, refer to the official documentation or contact the development team.