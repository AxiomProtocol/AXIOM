# Trust Wallet Token Listing Guide

## Files Created

1. **Trust Wallet Assets Structure** (`trust-wallet-assets-final.zip`)
   - Path: `/assets/blockchains/smartchain/assets/0x83e17aeb148d9b4b7be0be7c87dd73531a5a5738/`
   - Contains: `logo.png` (256x256, optimized under 100KB) and `info.json` (token metadata)

2. **MetaMask Trusted Domain Submission** (`metamask-trusted-domain.txt`)
   - Domain verification file for MetaMask integration

## Submission Instructions

### Trust Wallet GitHub Submission
1. Fork the Trust Wallet assets repository: https://github.com/trustwallet/assets
2. Upload the folder structure: `/assets/blockchains/smartchain/assets/0x83e17aeb148d9b4b7be0be7c87dd73531a5a5738/`
3. Create pull request with title: "Add Sovran Wealth Fund (SWF) token"
4. Include BSCScan verification link in PR description

### MetaMask Trusted Domain
1. Submit `metamask-trusted-domain.txt` to MetaMask's domain verification process
2. Reference verified contract and OpenZeppelin security standards

### TokenLists.org Submission
- Already completed: `tokenlist.json` available at https://sovranwealthfund.org/tokenlist.json
- Submit URL to TokenLists.org for official listing

## Contract Details

### Main SWF Token (For Token Listings)
- **Address**: 0x83e17aeb148d9b4b7be0be7c87dd73531a5a5738
- **Network**: BSC Mainnet (Chain ID: 56)
- **Standard**: ERC20
- **Purpose**: Platform utility token for staking, governance, access
- **Verification**: BSCScan verified with OpenZeppelin libraries
- **Security**: No backdoors, immutable contract, community governance

### Property Tokenization Contracts (Separate)
- **WRLC Example**: 0x12345678901234567890123456789012345678901234567890
- **Purpose**: Individual real estate asset tokenization
- **Features**: Fractional ownership, dividend distribution, secondary trading

**Note**: Only the main SWF token should be submitted to Trust Wallet and token listing platforms. Property tokens are separate investment vehicles within the ecosystem.

## Benefits After Approval
- SWF token appears in Trust Wallet automatically
- MetaMask shows verified domain badge
- Enhanced user trust and discoverability
- Integration with major DeFi platforms