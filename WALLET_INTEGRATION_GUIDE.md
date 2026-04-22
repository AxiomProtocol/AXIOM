# Wallet Integration Guide - Axiom Smart City Platform

**Last Updated:** November 23, 2025  
**Network:** Arbitrum One (Chain ID: 42161)  
**Token:** AXM

---

## 📦 Currently Installed Wallet SDKs

Your Axiom platform already has these wallet packages installed:

✅ **MetaMask:**
- `@metamask/sdk` - MetaMask SDK for universal wallet connection
- `@metamask/delegation-toolkit` - Advanced delegation & account abstraction features

✅ **WalletConnect:**
- `@walletconnect/qrcode-modal` - QR code modal for mobile wallet connection
- `@walletconnect/web3-provider` - Legacy WalletConnect v1 provider

---

## 🔥 MetaMask SDK (Recommended for Primary Integration)

### **Why MetaMask for Axiom?**

✅ **Native Arbitrum One Support** - Works seamlessly with Chain ID 42161  
✅ **100M+ Active Users** - Largest wallet user base  
✅ **Desktop + Mobile** - Single SDK for all platforms  
✅ **Production-Ready** - Battle-tested across DeFi, NFTs, gaming  
✅ **Delegation Framework** - Perfect for smart city governance features  

### **Latest Features (2025)**

1. **Account Abstraction Support** - Using `@metamask/delegation-toolkit`
2. **Social Login Integration** - Embedded wallets with Web3Auth
3. **Perpetual Futures Trading** - Built-in trading features
4. **EIP-5792 Methods** - `wallet_sendCalls`, batch transactions
5. **Solana Support** - First non-EVM blockchain (July 2025)

---

## 🌐 WalletConnect (Recommended for Multi-Wallet Support)

### **Why WalletConnect for Axiom?**

✅ **500+ Wallet Integrations** - Connect to any Web3 wallet  
✅ **Cross-Platform** - Desktop, mobile, browser extensions  
✅ **QR Code + Deeplinks** - Seamless mobile experience  
✅ **TON Integration** - Access to Telegram's 1B+ users  
✅ **One-Click Auth** - CAIP-222 standard  

### **Latest Features (2025)**

1. **AppKit** - All-in-one toolkit for dApp developers
2. **700+ Supported Wallets** - Trust, Rainbow, Coinbase, Binance Web3, SafePal
3. **Multi-Chain Sessions** - Work across chains simultaneously
4. **In-App Swaps & On-Ramps** - Fiat-to-crypto purchases
5. **Push Notifications** - Web3Inbox for user engagement

### **🚨 Important: Upgrade to WalletConnect 2.0**

Your current package `@walletconnect/web3-provider` is **WalletConnect v1** (deprecated).

**Recommended Upgrade:**
```bash
npm uninstall @walletconnect/qrcode-modal @walletconnect/web3-provider
npm install @web3modal/ethereum @web3modal/react
```

---

## 🏗️ Implementation Strategy for Axiom

### **Recommended Dual-Wallet Approach**

**Primary:** MetaMask SDK (best user experience)  
**Secondary:** WalletConnect 2.0 (multi-wallet support)  

This covers:
- 100M+ MetaMask users directly
- 500+ other wallets via WalletConnect
- Desktop + mobile seamlessly
- Social login options

---

## 💻 Quick Integration Code

### **Option 1: MetaMask SDK (React/Next.js)**

```javascript
// Install: npm install @metamask/sdk

import MetaMaskSDK from '@metamask/sdk';

// Initialize with Arbitrum One configuration
const MMSDK = new MetaMaskSDK({
  dappMetadata: {
    name: "Axiom Smart City",
    url: "https://yourapp.com",
    iconUrl: "https://yourapp.com/logo.png"
  },
  infuraAPIKey: process.env.INFURA_API_KEY, // For Arbitrum RPC
  checkInstallationImmediately: false,
  enableAnalytics: true,
  // Custom RPC for Arbitrum One
  rpcMap: {
    '42161': 'https://arb1.arbitrum.io/rpc'
  }
});

const provider = MMSDK.getProvider();

// Connect wallet
async function connectWallet() {
  try {
    const accounts = await provider.request({
      method: 'eth_requestAccounts'
    });

    // Switch to Arbitrum One
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0xa4b1' }] // 42161 in hex
    });

    console.log('Connected to Arbitrum One:', accounts[0]);
    return accounts[0];
  } catch (error) {
    if (error.code === 4902) {
      // Chain not added, add it
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0xa4b1',
          chainName: 'Arbitrum One',
          nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
          },
          rpcUrls: ['https://arb1.arbitrum.io/rpc'],
          blockExplorerUrls: ['https://arbiscan.io']
        }]
      });
    }
  }
}

// Interact with AXM Token
async function getAXMBalance(userAddress) {
  const AXM_CONTRACT = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D';
  const balance = await provider.request({
    method: 'eth_call',
    params: [{
      to: AXM_CONTRACT,
      data: '0x70a08231000000000000000000000000' + userAddress.slice(2)
    }, 'latest']
  });
  return parseInt(balance, 16) / 1e18; // Convert from wei
}
```

---

### **Option 2: WalletConnect AppKit (React)**

```javascript
// Install: npm install @web3modal/ethereum @web3modal/react wagmi viem

import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi/react';
import { WagmiConfig } from 'wagmi';
import { arbitrum } from 'viem/chains';

// 1. Get projectId from https://cloud.walletconnect.com
const projectId = 'YOUR_WALLETCONNECT_PROJECT_ID';

// 2. Create wagmiConfig
const metadata = {
  name: 'Axiom Smart City',
  description: 'America\'s First On-Chain Smart City',
  url: 'https://yourapp.com',
  icons: ['https://yourapp.com/logo.png']
};

const chains = [arbitrum];
const wagmiConfig = defaultWagmiConfig({ chains, projectId, metadata });

// 3. Create modal
createWeb3Modal({ wagmiConfig, projectId, chains });

function App() {
  return (
    <WagmiConfig config={wagmiConfig}>
      <w3m-button />
      {/* Your app components */}
    </WagmiConfig>
  );
}
```

---

### **Option 3: Dual Wallet Integration (Best)**

Combine both for maximum reach:

```javascript
import { useEffect, useState } from 'react';
import MetaMaskSDK from '@metamask/sdk';
import { createWeb3Modal } from '@web3modal/wagmi/react';

function WalletConnector() {
  const [walletType, setWalletType] = useState(null);
  const [address, setAddress] = useState(null);

  // MetaMask SDK
  const connectMetaMask = async () => {
    const MMSDK = new MetaMaskSDK({
      dappMetadata: {
        name: "Axiom Smart City",
        url: window.location.href
      }
    });
    
    const provider = MMSDK.getProvider();
    const accounts = await provider.request({ 
      method: 'eth_requestAccounts' 
    });
    
    setWalletType('MetaMask');
    setAddress(accounts[0]);
  };

  // WalletConnect
  const connectWalletConnect = async () => {
    // Open WalletConnect modal
    // Automatically handles 500+ wallets
    setWalletType('WalletConnect');
  };

  return (
    <div>
      <button onClick={connectMetaMask}>
        🦊 Connect MetaMask
      </button>
      <button onClick={connectWalletConnect}>
        🔗 Connect Other Wallets
      </button>
      
      {address && (
        <div>
          Connected via {walletType}: {address}
        </div>
      )}
    </div>
  );
}
```

---

## 🔐 Account Abstraction with MetaMask Delegation

Your installed `@metamask/delegation-toolkit` enables advanced features:

```javascript
import { DelegationFramework } from '@metamask/delegation-toolkit';

// Enable delegated transactions for smart city governance
const framework = new DelegationFramework({
  chainId: 42161, // Arbitrum One
  bundlerUrl: 'YOUR_BUNDLER_URL',
  paymasterUrl: 'YOUR_PAYMASTER_URL'
});

// Allow users to delegate voting power
async function delegateGovernance(delegatorAddress, delegateeAddress) {
  const delegation = await framework.createDelegation({
    delegator: delegatorAddress,
    delegatee: delegateeAddress,
    contract: 'YOUR_AXM_GOVERNANCE_CONTRACT'
  });
  
  return delegation;
}
```

---

## 📊 Comparison: MetaMask vs WalletConnect

| Feature | MetaMask SDK | WalletConnect 2.0 |
|---------|--------------|-------------------|
| **User Base** | 100M+ users | 500+ wallets |
| **Integration Complexity** | Simple | Medium |
| **Mobile Support** | ✅ Excellent | ✅ Excellent |
| **Desktop Support** | ✅ Excellent | ✅ Good |
| **QR Code Connection** | ✅ Yes | ✅ Yes |
| **Account Abstraction** | ✅ Yes (Delegation) | ⚠️ Limited |
| **Social Login** | ✅ Yes (Embedded) | ✅ Yes (AppKit) |
| **Multi-Wallet** | ❌ MetaMask only | ✅ 500+ wallets |
| **Arbitrum Support** | ✅ Native | ✅ Native |
| **Best For** | Primary wallet | Fallback/Multi-wallet |

---

## 🚀 Recommended Action Plan for Axiom

### **Phase 1: Upgrade WalletConnect (Now)**

```bash
# Remove legacy WalletConnect v1
npm uninstall @walletconnect/qrcode-modal @walletconnect/web3-provider

# Install WalletConnect 2.0 (AppKit)
npm install @web3modal/ethereum @web3modal/react wagmi viem
```

### **Phase 2: Implement Dual Wallet (This Week)**

1. **Primary Button:** "Connect with MetaMask" (using existing `@metamask/sdk`)
2. **Secondary Button:** "Connect Other Wallets" (using new WalletConnect AppKit)
3. **Auto-detect:** If MetaMask is installed, show it first
4. **Fallback:** If no MetaMask, show WalletConnect for 500+ other wallets

### **Phase 3: Add Advanced Features (Post-TGE)**

1. **Delegation Framework** - Use `@metamask/delegation-toolkit` for governance
2. **Social Login** - MetaMask embedded wallets for non-crypto users
3. **Gasless Transactions** - Paymaster integration for AXM token operations
4. **Push Notifications** - WalletConnect Web3Inbox for user alerts

---

## 🔧 Environment Variables Needed

Add these to your `.env`:

```bash
# MetaMask (Optional but recommended)
INFURA_API_KEY=your_infura_key_here

# WalletConnect (Required)
WALLETCONNECT_PROJECT_ID=your_project_id_here
# Get free project ID: https://cloud.walletconnect.com

# Arbitrum RPC (Optional - fallback)
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
```

---

## 📚 Official Resources

### **MetaMask**
- 📖 Docs: https://docs.metamask.io/sdk/
- 🔗 GitHub: https://github.com/MetaMask/metamask-sdk
- 🎯 Delegation: https://github.com/MetaMask/delegation-framework
- 📦 NPM: `npm install @metamask/sdk`

### **WalletConnect**
- 📖 Docs: https://docs.reown.com/appkit/overview
- 🔗 GitHub: https://github.com/WalletConnect/walletconnect-monorepo
- ☁️ Dashboard: https://cloud.reown.com (get project ID)
- 📦 NPM: `npm install @web3modal/ethereum @web3modal/react`

---

## ✅ Current Status for Axiom

**Installed:** ✅ MetaMask SDK, MetaMask Delegation Toolkit  
**Needs Upgrade:** ⚠️ WalletConnect v1 → v2  
**Network:** ✅ Arbitrum One (42161) fully supported  
**AXM Token:** ✅ 0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D  
**22 Contracts:** ✅ All deployed on Arbitrum One  

---

## 🎯 Next Steps

1. **Get WalletConnect Project ID:** Visit https://cloud.walletconnect.com
2. **Upgrade to WalletConnect 2.0:** Run the upgrade commands above
3. **Implement wallet connection UI:** Use the dual-wallet code example
4. **Test on Arbitrum One:** Verify chain switching works correctly
5. **Add AXM token to wallets:** Enable automatic token detection

---

**Ready to implement wallet connectivity? Let me know if you'd like me to:**
- Update your WalletConnect packages to v2.0
- Create a complete wallet connection component
- Implement the delegation framework for governance
- Set up gasless transactions for AXM operations
