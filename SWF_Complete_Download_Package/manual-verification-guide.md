# Manual Verification Guide for SovranWealthFund Token

This guide provides instructions for manually verifying the SovranWealthFund (SWF) token contract on Polygonscan.

## Contract Information

- **Contract Address**: 0xa0b0AaCbf4E7261691689e5F240C278fB295edF7
- **Deployed on**: Polygon Mainnet
- **Verification Solidity Version**: 0.8.20
- **Constructor Arguments**: 
  - Name: "Sovran Wealth Fund" 
  - Symbol: "SWF"

## Manual Verification Steps

1. Go to [Polygonscan](https://polygonscan.com/address/0xa0b0AaCbf4E7261691689e5F240C278fB295edF7#code)
2. Click "Verify and Publish"
3. Enter contract details:
   - Compiler Type: Solidity (Single file)
   - Compiler Version: v0.8.20
   - License Type: MIT License (MIT)
   - Optimization: Yes, with 200 runs

4. Copy and paste the contract code from `contracts/compiled-0.8.20/SovranWealthFundFlat.sol`

5. For constructor arguments, use:
   - `"Sovran Wealth Fund", "SWF"`

6. Submit for verification

## Contract Code

If you need to manually extract the contract code, the flatten version is in `contracts/compiled-0.8.20/SovranWealthFundFlat.sol`.

## ABI-encoded Constructor Arguments

If needed, the ABI-encoded constructor arguments are:
```
0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000125365727a616e205765616c74682046756e64000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000035357460000000000000000000000000000000000000000000000000000000000
```

Or use the Solidity ABI Input: `"Sovran Wealth Fund", "SWF"`

## Troubleshooting

If verification fails through automated methods, the manual approach often works better, especially when dealing with complex contracts or interface inheritance.

If you encounter issues:
1. Double-check the compiler version and optimization settings
2. Ensure all OpenZeppelin imports are resolved
3. Make sure constructor arguments are formatted correctly