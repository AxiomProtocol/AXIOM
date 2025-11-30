# Polygonscan-Specific Verification Instructions

## Contract Information

- Contract Address: 0xa0b0AaCbf4E7261691689e5F240C278fB295edF7
- Contract Creator: 0xCe36333A88c2EA01f28f63131fA7dfa80AD021F6
- Deployment Transaction: 0xf6d4c55c82faa26c99dbbf1fb3982a10e1a84cc7c3bfc13f184362790d2ef145
- Contract Name: SovranWealthFund
- Compiler Version: v0.8.20+commit.a1b79de6

## Fixed Compilation Issue

- _setupRole is deprecated, use _grantRole instead

## Verification Steps

For Polygonscan verification:

1. Go to https://polygonscan.com/address/0xa0b0AaCbf4E7261691689e5F240C278fB295edF7#code

2. Click 'Verify and Publish'

3. Select 'Solidity (Single file)' as the verification method

4. Enter 'SovranWealthFund' as the Contract Name

5. Choose compiler version v0.8.20+commit.a1b79de6

6. Set optimization to 'Yes' with 200 runs

7. Enter UNLICENSED (1) as license type

8. Use the special fixed source code provided in 'contracts/verified/SovranWealthFund.polygonscan.sol'

9. Submit verification

## Important Notes

- The source code has been modified to fix the `_setupRole` deprecation issue.
- If verification fails, try the Bytecode-Only method as a fallback option.
