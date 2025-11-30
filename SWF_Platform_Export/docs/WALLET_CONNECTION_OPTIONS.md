# SWF Wallet Connection Options

This document provides an overview of all the wallet connection options available in the Sovran Wealth Fund (SWF) application.

## Available Connection Methods

The application offers multiple wallet connection methods to ensure maximum compatibility across different devices and wallet applications:

1. **Main Dashboard** (`/`)
   - Standard MetaMask connection with "Add to MetaMask" functionality
   - Polygon Mainnet-specific configuration
   - Automatic network detection and switching
   - Contract address information display

2. **Universal Wallet Dashboard** (`/wallet-dashboard`)
   - Multiple wallet connection options
   - WalletConnect integration for mobile wallets
   - MetaMask direct connection
   - Read-only mode for viewing without wallet connection
   - Comprehensive blockchain information display

3. **MetaMask Test Page** (`/metamask-test`)
   - Minimal testing implementation
   - Detailed diagnostic information
   - User agent detection and display
   - Chain ID verification
   - Debug tools for connection issues

4. **Fixed DeepLink Wallet** (`/fixed-wallet`)
   - Basic implementation with redirect guard
   - Prevents double encoding of deep link URLs
   - Simple codebase for maximum reliability

5. **Full Fixed Wallet** (`/full-wallet`)
   - Comprehensive implementation with all fixes
   - Complete dashboard with staking and liquidity information
   - Enhanced mobile support
   - Robust error handling
   - Specifically designed for MetaMask mobile browser

## MetaMask Mobile Deep Linking

The application implements proper deep linking for MetaMask mobile according to the following methodology:

```javascript
// Get the current hostname and path
const host = window.location.host;
const path = window.location.pathname;

// Format the MetaMask deep link URL directly
const metamaskDeepLink = `https://metamask.app.link/dapp/${host}${path}`;

// Open in a new tab/window
window.open(metamaskDeepLink, '_blank');
```

The key to proper mobile deep linking is to avoid URL encoding that would cause double-encoded URLs. The fixed implementations provide a redirect guard to prevent this issue:

```javascript
// Fix double-encoded deep link redirects
if (window.location.href.includes("https%3A")) {
  const raw = decodeURIComponent(window.location.href.split("https%3A").pop());
  window.location.href = "https://" + raw;
}
```

## Debugging Toolkit

For detailed debugging of wallet connection issues, the application provides:

1. The `metamask-utility.js` library with specialized functions
2. Browser and connection environment detection
3. Detailed error reporting in the console
4. User interface for connection status visibility

## Recommended Connection Approach

For the best user experience:

1. Desktop users should use the main dashboard or universal wallet dashboard
2. Mobile users with MetaMask should use the fixed wallet options
3. Users with other mobile wallets should use the universal wallet dashboard with WalletConnect

## Technical Details

The application uses the following libraries for wallet connectivity:

- ethers.js for Ethereum blockchain interactions
- Web3.js as a fallback
- WalletConnect for non-MetaMask wallet support
- Custom utilities for specialized debugging and connection handling

All connections target Polygon Mainnet (Chain ID: 137) and are configured to interact with the SWF token contract at address `0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7`.