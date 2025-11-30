# Advanced Contract Verification Guide for SWF

This guide explains how to use the enhanced and specialized verification tools to verify your SWF token contract on Polygonscan with **PURE** OpenZeppelin standards (no ThirdWeb code).

## Bytecode Mismatch Issues

When verifying contracts, you may encounter "bytecode mismatch" errors, which can be caused by several factors:

1. Different compiler versions
2. Different optimization settings
3. Library references that need to be properly linked
4. Constructor arguments not properly encoded
5. **ThirdWeb code or extensions** - These can cause verification issues and should be avoided

The SWF verification system now includes specialized tools to help diagnose and fix these issues with a focus on pure OpenZeppelin standards.

## Advanced Verification Interface

The new Advanced Verification interface includes:

1. **Standard Verification**: Basic verification with multiple compiler versions and settings
2. **Enhanced Verification**: Attempts multiple methods and settings automatically
3. **SWF Token Verification**: Specialized for SovranWealthFund token with optimal settings
4. **Bytecode Analysis**: Diagnostic tool to help identify bytecode size and parameters

### Using Bytecode Analysis

Before attempting verification, it's recommended to use the "Check Bytecode" button:

1. Enter the contract address
2. Click "Check Bytecode"
3. Note the bytecode size (e.g., 4176 bytes for SWF token)

This information helps the verification system use the correct parameters.

### SWF Token Specialized Verification

The "Verify SWF Token" button uses parameters specifically optimized for the SovranWealthFund token with the following settings:

- Compiler version: v0.8.17+commit.8df45f5f (standard OpenZeppelin)
- Optimization: Enabled (1)
- Optimization runs: 200
- EVM version: london
- License type: MIT
- No ThirdWeb imports or references

This specialized verification has been calibrated to work with the unique bytecode characteristics of SWF tokens, particularly those with a bytecode size of approximately 4176 bytes.

## Monitoring Verification Progress

After submitting verification:

1. The system will display a progress indicator
2. Verification typically takes 30-60 seconds
3. You can manually check status using the "Check Status Now" button
4. Automatic monitoring continues for up to 10 attempts

## Troubleshooting

If verification fails:

1. Try the "Check Bytecode" button to confirm the bytecode size
2. For SWF tokens with 4176 bytes, use the "Verify SWF Token" button
3. If constructor arguments were used in deployment, ensure they are correctly formatted
4. Try the Enhanced Verification method, which attempts multiple approaches
5. Make sure your contract doesn't depend on ThirdWeb libraries or extensions

### ThirdWeb Dependencies and Verification Issues

We've found that ThirdWeb dependencies can cause verification problems due to:

- Incompatible compiler optimizations
- Complex inheritance patterns
- Custom extensions that are difficult to verify
- Non-standard ERC implementations

Our enhanced verification system now automatically removes ThirdWeb references from source code before submission, but for best results, consider using pure OpenZeppelin contracts for future deployments.

## API Endpoints

For programmatic verification, the following API endpoints are available:

- `/api/contract/advanced-verify`: Standard verification with multiple options
- `/api/contract/enhanced-verify`: Automated multi-approach verification
- `/api/contract/verify-swf-token`: Specialized SWF token verification
- `/api/contract/check-bytecode`: Diagnostic bytecode analysis

## Example Verification Flow

1. Access the verification page at `/admin/advanced-verification.html`
2. Enter the contract address (e.g., 0xa0b0AaCbf4E7261691689e5F240C278fB295edF7)
3. Click "Check Bytecode" to analyze
4. If bytecode is approximately 4176 bytes, click "Verify SWF Token"
5. Monitor the verification progress
6. Once verified, you can view the contract on Polygonscan with verified source code

This enhanced verification system dramatically increases the success rate for contract verification, particularly for complex contracts like the SovranWealthFund token.