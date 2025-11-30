# SWF Contract Verification Process Guide

This guide documents the enhanced contract verification process implemented for the Sovran Wealth Fund (SWF) token on Polygon mainnet.

## Verification System Overview

The system implements multiple verification methods to provide flexibility when verifying contracts on Polygonscan:

1. **Standard Method**: Uses the traditional Polygonscan API verification method
2. **Advanced Method**: Enhanced approach using flattened source code that reduces OpenZeppelin dependency issues

## Verification APIs

The following API endpoints are available:

### Token Information APIs

- `GET /api/token/artifact?contract=SovranWealthFund` - Retrieve contract artifacts (ABI, address, etc.)
- `GET /api/token/source?contract=SovranWealthFund` - Retrieve contract source code

### Verification APIs

- `POST /api/contract/verify` - Traditional verification endpoint
- `POST /api/contract/advanced-verify` - Enhanced verification with multiple methods
- `GET /api/contract/verification-status/:guid` - Check status of a verification request

## Common Verification Issues

### 1. Function Override Issues

**Issue**: `Function has override specified but does not override anything`

**Solution**: When using flattened contracts, sometimes OpenZeppelin functions like `_beforeTokenTransfer` need to be modified to remove the `override` keyword if the parent function isn't properly included in the flattened file.

```solidity
// Fix:
// From:
function _beforeTokenTransfer(address from, address to, uint256 amount) internal whenNotPaused override {
    super._beforeTokenTransfer(from, to, amount);
}

// To:
function _beforeTokenTransfer(address from, address to, uint256 amount) internal whenNotPaused {
    // Override keyword removed for flattened verification
}
```

### 2. Bytecode Mismatch

**Issue**: `Compiled contract deployment bytecode does NOT match the transaction deployment bytecode`

**Solution**: This error occurs when the source code being verified doesn't exactly match what was deployed. To fix:

1. Ensure Solidity compiler version matches exactly (patch versions matter)
2. Ensure all constructor arguments are correctly provided
3. Use the exact source code that was used for deployment
4. Try different optimization settings if applicable

## Verification UI

The system now includes an enhanced verification UI:

1. **Basic Verification**: `/admin/verification` - Standard verification page
2. **Advanced Verification**: `/admin/advanced-verification` - Advanced verification with real-time status monitoring

## Best Practices

1. **Always use Source Control**: Maintain the exact version of the contract used during deployment
2. **Document Constructor Arguments**: Save ABI-encoded constructor arguments for future verification
3. **Store Flattened Versions**: Keep flattened versions of contracts for easier verification
4. **Use Multiple Methods**: If one verification method fails, try an alternative approach

## Troubleshooting Steps

1. Verify using the advanced system with flattened source code
2. Check that Solidity compiler version matches exactly
3. Inspect constructor arguments to ensure they're correctly ABI-encoded
4. Review OpenZeppelin import versions for compatibility
5. Try Standard JSON Input method if direct verification fails

## Future Improvements

1. **Automatic Constructor Detection**: Automatically detect and encode constructor arguments
2. **Multi-network Support**: Extend verification to support other EVM-compatible networks
3. **Verification Templates**: Pre-configured verification templates for common contract patterns
4. **Verification History**: Track and manage verification attempts for auditing purposes