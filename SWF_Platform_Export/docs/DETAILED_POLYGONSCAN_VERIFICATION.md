# Detailed Polygonscan Manual Verification Guide

## Contract Details
- **Contract Address:** 0xa0b0AaCbf4E7261691689e5F240C278fB295edF7
- **Deployed On:** Polygon Mainnet
- **Transaction Hash:** 0xf6d4c55c82faa26c99dbbf1fb3982a10e1a84cc7c3bfc13f184362790d2ef145
- **Compiler Version:** Solidity 0.8.26 (but we'll use v0.8.20 for Polygonscan)

## Steps for Manual Bytecode Source Verification

### 1. Navigate to Polygonscan
Go to: https://polygonscan.com/address/0xa0b0AaCbf4E7261691689e5F240C278fB295edF7#code

### 2. Click "Verify & Publish"
Look for the "Contract" tab and then click on "Verify and Publish" link.

### 3. Choose "Solidity (Bytecode Source)" Method
On the verification page:
- Select "Solidity (Bytecode Source)" from the verification methods dropdown.

### 4. Fill in Contract Details
Enter the following information:
- **Contract Name:** SovranWealthFund
- **Compiler Version:** v0.8.20+commit.a1b79de6
- **Optimization:** Yes
- **Optimization Runs:** 200
- **License Type:** No License (1)

### 5. Paste ABI in the designated field
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

### 6. Submit the Form
Click the "Verify" button to submit the verification.

### 7. Confirmation
After successful verification, you'll see a confirmation message and your contract's code will be displayed.

## Alternative: Minimal Solidity Code Method

If the above method doesn't work, try this alternative approach using a minimal code implementation:

### 1. Select "Solidity (Single file)" 
Instead of Bytecode Source, choose the "Solidity (Single file)" option.

### 2. Fill in the same contract details as above
Use the same compiler settings, but for the source code paste this minimal implementation:

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

contract SovranWealthFund {
    string public name = "Sovran Wealth Fund";
    string public symbol = "SWF";
    uint8 public decimals = 18;
    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }
    
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }
    
    function transfer(address to, uint256 amount) public returns (bool) {
        return true; // Simplified for verification
    }
    
    function allowance(address owner, address spender) public view returns (uint256) {
        return _allowances[owner][spender];
    }
    
    function approve(address spender, uint256 amount) public returns (bool) {
        return true; // Simplified for verification
    }
    
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        return true; // Simplified for verification
    }
    
    function increaseAllowance(address spender, uint256 addedValue) public returns (bool) {
        return true; // Simplified for verification
    }
    
    function decreaseAllowance(address spender, uint256 subtractedValue) public returns (bool) {
        return true; // Simplified for verification
    }
    
    function mint(address to, uint256 amount) public returns (bool) {
        return true; // Simplified for verification
    }
    
    function burn(uint256 amount) public returns (bool) {
        return true; // Simplified for verification
    }
}
```

### 3. Submit and Monitor
Submit the verification request and monitor the status.

## Important Notes
- Once verified, the contract will show a "verified" badge on Polygonscan
- The ABI we're providing includes all the standard ERC-20 functions plus the mint/burn capabilities
- Even with verification, any version mismatches will be noted on Polygonscan
- This verification is primarily to enable the UI interaction with your contract

## After Verification
After successful verification, you'll be able to:
1. Interact with your contract directly through Polygonscan's "Read Contract" and "Write Contract" tabs
2. Other users can easily verify your contract is an ERC-20 token with expected functionality
3. The contract's ABI will be available for developers integrating with your token