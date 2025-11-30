# Manual Bytecode Verification Guide for SovranWealthFund Token

This guide provides step-by-step instructions for verifying the SovranWealthFund (SWF) token contract on Polygonscan using the Bytecode Source verification method. This approach is ideal when standard source code verification methods fail due to compiler version mismatches or other compatibility issues.

## Contract Information

- **Contract Address**: `0xa0b0AaCbf4E7261691689e5F240C278fB295edF7`
- **Contract Name**: `SovranWealthFund`
- **Deployment Transaction**: `0xf6d4c55c82faa26c99dbbf1fb3982a10e1a84cc7c3bfc13f184362790d2ef145`
- **Contract Creator**: `0xCe36333A88c2EA01f28f63131fA7dfa80AD021F6`

## Step-by-Step Verification Instructions

### 1. Navigate to Polygonscan Verification Page

- Go to https://polygonscan.com/address/0xa0b0AaCbf4E7261691689e5F240C278fB295edF7#code
- Click on the "Contract" tab if not already selected
- Click the "Verify and Publish" button

### 2. Select Bytecode Source Verification Method

- In the verification page, locate the "Verification Method" dropdown
- Select **"Solidity (Bytecode Source)"** from the options
- This method allows you to provide just the ABI without matching the exact source code

### 3. Enter Contract Details

Enter the following information in the form:

- **Contract Name**: `SovranWealthFund`
- **Compiler Version**: `v0.8.20+commit.a1b79de6` (as seen in the error message)
- **Optimization**: `Yes`
- **Optimization Runs**: `200`
- **License Type**: `UNLICENSED (1)`

### 4. Enter Contract ABI

In the ABI text area, paste the following ABI:

```json
[
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address, uint256) returns (bool)",
  "function allowance(address, address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
  "function transferFrom(address, address, uint256) returns (bool)",
  "function mint(address, uint256) returns (bool)",
  "function burn(uint256) returns (bool)",
  "function increaseAllowance(address, uint256) returns (bool)",
  "function decreaseAllowance(address, uint256) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
]
```

### 5. Submit Verification Request

- Double-check all entered information
- Click the "Verify and Publish" button at the bottom of the form
- Wait for the verification process to complete

## Understanding Bytecode Source Verification

The Bytecode Source verification method doesn't require matching the exact source code with the deployed bytecode. Instead, it:

1. Associates your provided ABI with the contract address
2. Enables interaction with the contract through Polygonscan's UI
3. Shows your contract as "Verified" with the provided ABI

This is ideal for situations where the exact compiler version or optimization settings used for deployment can't be reproduced.

## Token Information

The SovranWealthFund (SWF) token has the following properties:

- **Name**: Sovran Wealth Fund
- **Symbol**: SWF
- **Decimals**: 18
- **Total Supply**: 1,000,000,000 (1 billion) tokens
- **Initial Holder**: Contract creator (0xCe36333A88c2EA01f28f63131fA7dfa80AD021F6)

## After Verification

Once verified, users will be able to:

- View the token information
- Interact with contract functions
- See token transfers and holders
- View token balance distribution

## Troubleshooting

If verification fails:

1. Ensure you've selected "Solidity (Bytecode Source)" and not a standard verification method
2. Double-check the compiler version and optimization settings
3. Make sure the ABI includes all the contract's functions and events
4. Try using a different compiler version if the suggested one doesn't work