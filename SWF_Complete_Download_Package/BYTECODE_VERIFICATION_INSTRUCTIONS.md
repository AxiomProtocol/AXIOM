# Bytecode-Only Verification Instructions

## Contract Information

- Contract Address: 0xa0b0AaCbf4E7261691689e5F240C278fB295edF7
- Deployment Transaction: 0xf6d4c55c82faa26c99dbbf1fb3982a10e1a84cc7c3bfc13f184362790d2ef145
- Contract Name: SovranWealthFund

## Verification Steps

For bytecode verification on Polygonscan:

1. Go to https://polygonscan.com/address/0xa0b0AaCbf4E7261691689e5F240C278fB295edF7#code

2. Click 'Verify and Publish'

3. Select 'Solidity (Bytecode Source)' as the verification method

4. Enter 'SovranWealthFund' as the Contract Name

5. Choose compiler version v0.8.17+commit.8df45f5f

6. Set optimization to 'Yes' with 200 runs

7. Enter UNLICENSED (1) as license type

8. Paste the ABI below in the ABI section

9. Submit verification

## ABI for Verification

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
