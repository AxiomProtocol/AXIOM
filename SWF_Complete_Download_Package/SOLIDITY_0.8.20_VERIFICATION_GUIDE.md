# Solidity 0.8.20 Verification Guide for SWF Token

This guide provides step-by-step instructions for verifying the SovranWealthFund (SWF) token contract on Polygonscan using Solidity 0.8.20.

## Contract Information

- **Contract Address**: 0xa0b0AaCbf4E7261691689e5F240C278fB295edF7
- **Deployed on**: Polygon Mainnet
- **Original Solidity Version**: 0.8.26
- **Verification Solidity Version**: 0.8.20
- **Constructor Arguments**: 
  - Name: "Sovran Wealth Fund" 
  - Symbol: "SWF"

## Why Use Solidity 0.8.20?

The contract was originally compiled with Solidity 0.8.26, but Polygonscan only supports verification up to Solidity 0.8.20. To ensure successful verification, we've adapted the code to be compatible with 0.8.20.

## Modifications Made for 0.8.20 Compatibility

1. Removed interface inheritance to avoid duplicate function declarations
2. Removed `override` keywords from functions that no longer override interface methods
3. Updated function documentation to be standalone (not referring to interface)
4. Fixed Ownable implementation to work with OpenZeppelin 0.8.20 contracts
5. Modified events and removed duplicates

## Verification Process

### Automated Verification (Recommended)

We've prepared a script that automates the verification process:

```bash
# Make the script executable (if needed)
chmod +x verify-using-0.8.20.sh

# Run the verification script
./verify-using-0.8.20.sh
```

This script uses Hardhat's verify functionality with our adapted 0.8.20 contract.

### Manual Verification on Polygonscan

If you prefer to verify manually:

1. Go to [Polygonscan](https://polygonscan.com/address/0xa0b0AaCbf4E7261691689e5F240C278fB295edF7#code)
2. Click "Verify and Publish"
3. Select "Solidity (Single file)" for Compiler Type
4. Choose "0.8.20" for Compiler Version
5. Set optimization to "Yes" with 200 runs
6. Copy the content from `contracts/compiled-0.8.20/SovranWealthFundFlat.sol`
7. Enter constructor arguments:
   - For encoded input: `0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000125365727a616e205765616c74682046756e64000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000035357460000000000000000000000000000000000000000000000000000000000`
   - Or, use the Solidity ABI Input: `"Sovran Wealth Fund", "SWF"`
8. Click "Verify and Publish"

## Troubleshooting

If verification fails, try these steps:

1. Check that you're using the modified 0.8.20 contract version, not the original 0.8.26 version
2. Ensure constructor arguments are correctly specified
3. Verify that all OpenZeppelin imports are from the correct paths
4. Make sure optimization settings match (enabled with 200 runs)

## Files Reference

- `contracts/compiled-0.8.20/SovranWealthFund.sol`: Adapted contract source code
- `contracts/compiled-0.8.20/SovranWealthFundFlat.sol`: Flattened version for manual verification
- `hardhat-0.8.20.config.js`: Hardhat configuration specific for 0.8.20
- `scripts/verify-0.8.20.js`: Verification script
- `verify-using-0.8.20.sh`: Shell script to run verification

## Post-Verification

After successful verification:

1. The contract will show as "Verified" on Polygonscan
2. All functions and their documentation will be visible
3. Users can interact with the contract directly through Polygonscan

## Support

If you encounter any issues, please refer to the detailed error messages in the verification output and adjust your approach accordingly.