# SWF Basket Vault Guide

## Overview

The SWF Basket Vault is a component of the Sovran Wealth Fund ecosystem that allows users to deposit their SWF tokens and receive SWF-BASKET tokens in return. This creates a vault-based system that can be used for various DeFi applications, including staking, liquidity provision, and governance.

## Key Features

- **1:1 Token Ratio**: Each SWF token deposited mints exactly 1 SWF-BASKET token
- **Full Redemption**: Users can withdraw their SWF tokens at any time by burning their SWF-BASKET tokens
- **Transparent Accounting**: All deposits are tracked on-chain with full transparency
- **ERC20 Compatibility**: SWF-BASKET tokens are standard ERC20 tokens that can be transferred or used in other DeFi applications

## Smart Contract Architecture

The SWFBasketVault smart contract is built with the following components:

1. **ERC20 Implementation**: SWF-BASKET tokens implement the ERC20 standard for compatibility with wallets and other DeFi protocols
2. **Deposit Tracking**: The contract maintains internal accounting of all user deposits
3. **Admin Controls**: The admin can transfer admin rights to a new address if needed
4. **Event Emission**: All deposits and withdrawals emit events for off-chain tracking

## How It Works

### Depositing SWF Tokens

1. User approves the SWFBasketVault contract to spend their SWF tokens
2. User calls the `deposit` function with the amount of SWF tokens they want to deposit
3. The contract transfers the SWF tokens from the user to the vault
4. The contract mints an equivalent amount of SWF-BASKET tokens to the user
5. The deposit is recorded in the contract's state

### Withdrawing SWF Tokens

1. User calls the `withdraw` function with the amount of SWF-BASKET tokens they want to burn
2. The contract burns the SWF-BASKET tokens
3. The contract transfers the equivalent amount of SWF tokens back to the user
4. The withdrawal is recorded in the contract's state

## Integration with Frontend

The SWFBasketVault can be integrated with a frontend application using the provided React component. The component requires:

- The address of the SWFBasketVault contract
- The address of the SWF token contract
- An ethers.js provider instance

### Example Usage

```jsx
import VaultDeposit from "./VaultDeposit";
import { ethers } from "ethers";

function App() {
  // Setup provider
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  
  // Contract addresses
  const vaultAddress = "0x..."; // SWFBasketVault contract address
  const swfAddress = "0x...";   // SWF token contract address
  
  return (
    <div>
      <h1>Sovran Wealth Fund</h1>
      <VaultDeposit 
        vaultAddress={vaultAddress}
        swfAddress={swfAddress}
        provider={provider}
      />
    </div>
  );
}
```

## Deployment Instructions

To deploy the SWFBasketVault contract, follow these steps:

1. Set the SWF token address in your `.env` file:
   ```
   SWF_TOKEN_ADDRESS=0x...
   ```

2. Run the deployment script:
   ```
   npx hardhat run scripts/deployBasketVault.js --network <network-name>
   ```

3. The deployment script will save the deployment information to:
   - `basket-vault-deployment-<timestamp>.json`
   - `basket-vault-latest.json`

## Testing the Contract

You can test the SWFBasketVault contract using the provided test script:

```
npx hardhat run scripts/testBasketVault.js --network localhost
```

This script will:
1. Deploy a test SWF token
2. Deploy the SWFBasketVault contract
3. Mint test tokens to test users
4. Test deposit and withdrawal functionality
5. Verify balances at each step

## Security Considerations

- The SWFBasketVault contract holds SWF tokens, so its security is paramount
- Admin functionality is limited to transferring admin rights only
- All functions include proper input validation
- Events are emitted for all state changes to enable off-chain monitoring

## Future Extensions

The SWFBasketVault can be extended in the following ways:

1. **Integration with BasketIndex**: Allow the vault to work with the BasketIndex component for multi-asset baskets
2. **Yield Generation**: Add functionality to generate yield on deposited tokens
3. **Governance**: Add governance features for SWF-BASKET token holders
4. **Fee Structure**: Implement fee mechanisms for specific operations
5. **Collateralization**: Enable the use of vault tokens as collateral in lending protocols

## Conclusion

The SWFBasketVault provides a foundational component for the Sovran Wealth Fund ecosystem, enabling users to deposit their tokens in a secure vault and receive tokenized representations of their deposits. This opens up possibilities for more complex DeFi mechanisms within the ecosystem.