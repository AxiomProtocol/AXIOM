# ThirdWeb Contract Verification Guide

This guide explains how to verify the SWF Token contract on Polygonscan, which was created using ThirdWeb contracts.

## Contract Address
- SWF Token: `0xa0b0AaCbf4E7261691689e5F240C278fB295edF7`

## Verification Steps for ThirdWeb Contracts

ThirdWeb contracts require a special verification process due to their extension system. Here's how to do it manually:

### 1. Get the Contract Source Code

The contract source is available in `contracts/SovranWealthFundThirdWeb.sol`. This file contains:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@thirdweb-dev/contracts/base/ERC20Base.sol";
import "@thirdweb-dev/contracts/extension/PermissionsEnumerable.sol";
import "@thirdweb-dev/contracts/extension/ContractMetadata.sol";

contract SovranWealthFund is ERC20Base, PermissionsEnumerable, ContractMetadata {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant TRANSFER_ROLE = keccak256("TRANSFER_ROLE");

    constructor()
        ERC20Base(
            "Sovran Wealth Fund",
            "SWF",
            msg.sender
        )
    {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
        _setupRole(TRANSFER_ROLE, msg.sender);
        _setupRole(PAUSER_ROLE, msg.sender);

        // Mint initial supply to deployer
        _mint(msg.sender, 1000000000 * 10**18);
    }

    function _canSetContractURI() internal view virtual override returns (bool) {
        return msg.sender == owner();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC20Base, PermissionsEnumerable)
        returns (bool)
    {
        return
            ERC20Base.supportsInterface(interfaceId) ||
            PermissionsEnumerable.supportsInterface(interfaceId);
    }
}
```

### 2. Manual Verification on Polygonscan

1. Go to [Polygonscan](https://polygonscan.com/) and search for the contract address: `0xa0b0AaCbf4E7261691689e5F240C278fB295edF7`
2. Click on the "Contract" tab
3. Click on "Verify and Publish"
4. Choose the verification method: "Solidity (Single file)"
5. Configure the verification form:
   - Contract Address: `0xa0b0AaCbf4E7261691689e5F240C278fB295edF7`
   - Compiler Type: Solidity
   - Compiler Version: v0.8.20+commit.a1b79de6
   - Open Source License Type: MIT License
   - Optimization: Yes
   - Optimization Runs: 200
   - Enter the Solidity Contract Code: **Use the fully flattened contract code from `contracts/SovranWealthFundThirdWebFlat.sol`**
   - Contract Name: Select "SovranWealthFund" from the dropdown
   - Constructor Arguments: Leave empty (ThirdWeb uses the constructor but doesn't need encoded arguments)

6. Click "Verify and Publish"

#### Using the Flattened Contract

The key to successful verification is using our specially prepared flattened contract that:
1. Includes all ThirdWeb dependencies directly in the file
2. Properly defines the `DEFAULT_ADMIN_ROLE` constant that was missing
3. Implements all interfaces needed by the contract
4. Uses the exact same solidity version as the deployed contract

The flattened contract is available at: `contracts/SovranWealthFundThirdWebFlat.sol`

### 3. Handling Verification Errors

If you encounter the error "Unable to find matching Contract Bytecode and ABI", try these methods:

1. **ThirdWeb Import Paths**: One common issue is that ThirdWeb uses non-standard import paths. If verification fails, you may need to use ThirdWeb's flattened contract versions.

2. **ThirdWeb Verification Tool**: Alternatively, use ThirdWeb's own verification tool:
   ```
   npx thirdweb verify <contract-address> --network polygon
   ```

3. **Through API Server**: Use our API server's specialized verification endpoint:
   ```
   curl -X POST -H "Content-Type: application/json" \
      -d '{"contractAddress":"0xa0b0AaCbf4E7261691689e5F240C278fB295edF7", "contractName":"SovranWealthFund", "verificationMethod":"thirdweb"}' \
      http://localhost:5000/api/admin/contract/verify-contract
   ```

4. **Web Interface**: Use our administrator web interface at:
   ```
   http://localhost:5000/admin/verification.html
   ```
   And select the "ThirdWeb Specialized Verification" method.

## Additional Resources

- [ThirdWeb Contracts Documentation](https://portal.thirdweb.com/contracts)
- [Polygonscan Verification Documentation](https://docs.polygonscan.com/tutorials/verifying-contracts-programmatically)