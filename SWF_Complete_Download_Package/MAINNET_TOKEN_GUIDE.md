# Sovran Wealth Fund (SWF) Token Management Guide

## Overview

This guide provides detailed instructions for managing your SovranWealthFund (SWF) ERC20 token deployed on the Polygon mainnet.

**Contract Address:** 0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7  
**Polygonscan:** [View on Polygonscan](https://polygonscan.com/address/0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7)

## Token Specifications

- **Name:** Sovran Wealth Fund
- **Symbol:** SWF
- **Decimals:** 18
- **Network:** Polygon (POL) Mainnet
- **Features:** 
  - Role-based minting
  - Pausable transfers
  - Burnable tokens
  - Contract metadata support

## Managing Your Token

### Adding SWF to MetaMask

1. Open MetaMask and ensure you're connected to the Polygon mainnet
2. Click "Import token" at the bottom of the tokens list
3. Select "Custom Token" and enter the contract address: `0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7`
4. The token symbol (SWF) and decimals (18) should auto-fill
5. Click "Add Custom Token" to complete the import process

### Minting New Tokens

Only addresses with the MINTER_ROLE can mint new tokens. The token deployer address and the Treasury address both have this permission.

Run the minting script:

```bash
npx hardhat run scripts/mintMainnet.js --network polygon
```

To modify the mint amount or recipient:

1. Edit `scripts/mintMainnet.js`
2. Adjust the `MINT_AMOUNT` variable (in wei, use `ethers.utils.parseEther("100")` for 100 tokens)
3. Set the `RECIPIENT` variable to the address that should receive the tokens

### Granting Minter Role to New Addresses

To add a new minter:

```javascript
// Example script to grant minter role
const { ethers } = require("hardhat");

async function main() {
  const SWF = await ethers.getContractAt("SovranWealthFund", "0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7");
  
  // This comes from the contract itself
  const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE"));
  
  // Address to receive minting privileges
  const newMinterAddress = "0xYourNewMinterAddressHere";
  
  const tx = await SWF.grantRole(MINTER_ROLE, newMinterAddress);
  await tx.wait();
  
  console.log(`Minter role granted to ${newMinterAddress}`);
}

main().catch(console.error);
```

### Pausing and Unpausing Token Transfers

Only the contract owner can pause/unpause token transfers:

```javascript
// To pause all transfers
const SWF = await ethers.getContractAt("SovranWealthFund", "0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7");
await SWF.pause();

// To resume transfers
await SWF.unpause();
```

### Burning Tokens

Any token holder can burn their own tokens:

```javascript
// To burn tokens (must be called by the token holder)
const SWF = await ethers.getContractAt("SovranWealthFund", "0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7");
const burnAmount = ethers.utils.parseEther("10"); // 10 tokens
await SWF.burn(burnAmount);
```

## Interacting via Polygonscan

You can also interact with your token directly through the Polygonscan interface:

1. Go to [https://polygonscan.com/address/0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7#writeContract](https://polygonscan.com/address/0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7#writeContract)
2. Connect your wallet (must be MetaMask or compatible)
3. Use the contract functions directly:
   - `mintTo`: Mint new tokens to an address (requires MINTER_ROLE)
   - `pause`/`unpause`: Control token transferability (requires owner)
   - `burn`: Destroy tokens (any holder can burn their own tokens)
   - `grantRole`: Assign permissions (requires admin role)

## IPFS Metadata

Your token metadata is stored on IPFS at:  
[https://ipfs.io/ipfs/{CID}/SovranWealthFund.token.json](https://ipfs.io/ipfs/{CID}/SovranWealthFund.token.json)

This metadata includes token details, contract address, and other important information that helps with token discovery and integration.

## Security Best Practices

1. **Private Key Security**: Never share your private key or mnemonic phrase
2. **Multi-sig Implementation**: Consider implementing a multi-signature wallet for increased security
3. **Role Management**: Be cautious when granting minter or admin roles
4. **Gradual Distribution**: Mint tokens gradually rather than all at once
5. **Transparency**: Keep your community informed about token minting and burning activities

## Troubleshooting

If you encounter issues:

1. Check your wallet has sufficient POL for gas
2. Verify you're connected to Polygon mainnet
3. Ensure you have the proper role for restricted actions
4. For complex issues, review the contract on Polygonscan

---

For further assistance, refer to the contract code or contact the development team.