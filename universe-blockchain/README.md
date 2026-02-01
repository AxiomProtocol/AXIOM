# 🌌 Universe Blockchain

**Axiom Smart City's Sovereign Layer 3 Blockchain Infrastructure**

**⚠️ STATUS: PAUSED - Awaiting $40,000 for Phase 1 production deployment. [See DEPLOYMENT_READINESS.md](./DEPLOYMENT_READINESS.md)**

Universe Blockchain is a custom Arbitrum Orbit L3 chain that powers America's first on-chain sovereign smart city economy. Built with AXM as the native gas token, Universe provides 90% lower transaction costs while maintaining maximum security through Arbitrum's fraud proof system.

**✅ Technical foundation complete. Ready to deploy when funded.**

---

## 🎯 Quick Facts

- **Chain Type:** Arbitrum Orbit Rollup (L3)
- **Parent Chain:** Arbitrum One (L2) → Ethereum (L1)
- **Native Gas Token:** AXM (Axiom Protocol Token)
- **Block Time:** 250ms (4 blocks/second)
- **Target TPS:** 2,000-10,000+
- **Testnet Launch:** February 15, 2026
- **Mainnet Launch:** May 15, 2026

---

## 📁 Project Structure

```
universe-blockchain/
├── config/
│   └── chain-config.json       # Universe chain configuration
├── docs/
│   ├── RAAS_PROVIDER_RFP.md   # RaaS provider request for proposal
│   ├── RAAS_PROVIDER_COMPARISON.md  # Provider evaluation matrix
│   └── UNIVERSE_BLOCKCHAIN_OVERVIEW.md  # Technical overview
├── scripts/
│   ├── 1-deploy-testnet.ts    # Testnet deployment (Arbitrum Sepolia)
│   ├── 2-deploy-mainnet.ts    # Mainnet deployment (Arbitrum One)
│   ├── 3-generate-node-config.ts  # Generate Nitro node config
│   └── 4-deploy-bridge.ts     # Deploy token bridge (L2 ↔ L3)
├── deployments/               # Deployment artifacts (gitignored)
├── .env.example               # Environment variable template
└── package.json               # Dependencies and scripts
```

---

## 🚀 Getting Started

### Prerequisites

1. **Node.js v18+** (check: `node --version`)
2. **Testnet ETH** on Arbitrum Sepolia (1.2 ETH minimum)
   - Get Sepolia ETH: https://sepoliafaucet.com
   - Bridge to Arbitrum Sepolia: https://bridge.arbitrum.io
3. **AXM Test Token** deployed on Arbitrum Sepolia (18 decimals)

### Installation

```bash
# Clone or navigate to project directory
cd universe-blockchain

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Required Environment Variables

```bash
# Deployment
DEPLOYER_PRIVATE_KEY=0x...      # Wallet with 1.2+ ETH on Arbitrum Sepolia
UNIVERSE_OWNER_ADDRESS=0x...    # Multi-sig that will own the chain
VALIDATOR_ADDRESS=0x...         # Validator address
BATCH_POSTER_ADDRESS=0x...      # Batch poster address
AXM_TOKEN_ADDRESS=0x...         # AXM ERC20 on parent chain

# Configuration
UNIVERSE_CHAIN_ID=888777        # Unique chain ID (check chainlist.org)
USE_CUSTOM_GAS_TOKEN=true       # Use AXM as gas (false = ETH for testing)
```

---

## 📝 Deployment Guide

### Step 1: Deploy to Testnet

```bash
npm run deploy:testnet
```

This will:
- ✅ Deploy core Orbit contracts to Arbitrum Sepolia
- ✅ Configure AXM as native gas token
- ✅ Set up validators and batch posters
- ✅ Save deployment info to `deployments/testnet-deployment.json`

**Expected Output:**
```
🌌 Universe Blockchain - Testnet Deployment
============================================================
Chain ID: 888777
Parent Chain: Arbitrum Sepolia
Gas Token: AXM (0x...)
============================================================

✅ Deployer account: 0x...
💰 Deployer balance: 1.5000 ETH

📋 Step 1: Preparing chain configuration...
✅ Chain config prepared

📋 Step 2: Creating deployment parameters...
✅ Deployment params created

🚀 Step 3: Deploying Universe Blockchain contracts...
⏳ This may take 2-5 minutes. Please wait...

✅ Universe Blockchain deployed successfully!
```

### Step 2: Generate Node Configuration

```bash
npm run generate-node-config
```

This creates `nodeConfig.json` for running a Universe Blockchain Nitro node.

### Step 3: Deploy Token Bridge

```bash
npm run deploy-bridge
```

Deploys canonical bridge contracts for AXM, USDC, WETH transfers between Arbitrum One and Universe.

### Step 4: Run Local Node (Optional)

```bash
# Clone Arbitrum Nitro node
git clone https://github.com/OffchainLabs/nitro-testnode.git
cd nitro-testnode

# Copy your nodeConfig.json
cp ../universe-blockchain/deployments/nodeConfig.json ./config/

# Run node
docker-compose up -d
```

---

## 🏗️ Architecture

### Transaction Flow

```
User submits tx with AXM gas
         ↓
Universe Sequencer processes tx (250ms blocks)
         ↓
Batch Poster collects ~500 txs
         ↓
Treasury auto-swaps AXM → ETH (50% burned, 50% converted)
         ↓
Batch posted to Arbitrum One (every 5-15 min)
         ↓
Validators verify fraud proofs (7-day challenge)
         ↓
Final settlement to Ethereum L1
```

### AXM Gas Treasury System

**Problem:** Orbit chains need ETH to post batches to parent chain, but users pay in AXM.

**Solution:** Automated treasury swap mechanism

```typescript
// Pseudo-code flow
1. Collect AXM fees from transactions
2. Split collected AXM:
   - 50% → Burn (deflationary!)
   - 50% → Swap to ETH via DEX
3. Use ETH for batch posting
4. Monitor ETH balance, alert if low
```

**Benefits:**
- ✅ Users only need AXM (no ETH friction)
- ✅ Constant AXM buy pressure on DEX
- ✅ Deflationary burn every block
- ✅ Self-sustaining batch posting

---

## 🛠️ Development Scripts

| Command | Description |
|---------|-------------|
| `npm run deploy:testnet` | Deploy to Arbitrum Sepolia testnet |
| `npm run deploy:mainnet` | Deploy to Arbitrum One mainnet |
| `npm run generate-node-config` | Create Nitro node configuration |
| `npm run deploy-bridge` | Deploy token bridge contracts |
| `npm run test-gas-swap` | Test AXM→ETH swap automation |
| `npm run monitor` | Monitor chain health and treasury |

---

## 📊 Cost Analysis

### One-Time Costs

| Item | Estimated Cost |
|------|----------------|
| Contract deployment (testnet) | 1.2 testnet ETH (~free) |
| Contract deployment (mainnet) | 0.5-2 ETH (~$1,500-6,000) |
| Security audits (2 firms) | $75,000 |
| RaaS setup fee | $50,000 |
| **Total Setup** | **~$150,000** |

### Monthly Operating Costs

| Item | Estimated Cost |
|------|----------------|
| Sequencer operations | $15,000 |
| Batch posting gas | $10,000-20,000 |
| Monitoring & support | $10,000 |
| Liquidity incentives | $5,000-15,000 |
| **Total Monthly** | **$40,000-60,000** |

**Break-Even:** At 1M tx/day × $0.05 gas = $50k/day revenue → **11 days payback!**

---

## 🔒 Security Considerations

### Multi-Sig Ownership
- ✅ Chain owner should be 3-of-5 multi-sig minimum
- ✅ Separate multi-sigs for: Upgrades, Treasury, Validators
- ✅ Time-locks on critical operations (7 days minimum)

### Key Management
- ✅ Batch poster & validator keys in HSM/KMS (not software wallets)
- ✅ Deployer key airgapped after deployment
- ✅ Emergency pause mechanism (fraud detection)

### Audit Requirements
- ✅ Pre-mainnet: 2 independent security audits
- ✅ Bridge contracts: Separate audit focus
- ✅ Treasury auto-swap: MEV protection review

---

## 📖 Documentation

### Technical Docs
- [Universe Blockchain Overview](./docs/UNIVERSE_BLOCKCHAIN_OVERVIEW.md) - Full technical specification
- [RaaS Provider RFP](./docs/RAAS_PROVIDER_RFP.md) - Provider requirements and evaluation
- [Provider Comparison Matrix](./docs/RAAS_PROVIDER_COMPARISON.md) - Scoring framework

### External Resources
- [Arbitrum Orbit Docs](https://docs.arbitrum.io/launch-orbit-chain/orbit-gentle-introduction)
- [Arbitrum Orbit SDK](https://github.com/OffchainLabs/arbitrum-orbit-sdk)
- [Orbit Deployment Portal](https://orbit.arbitrum.io)

---

## 🗓️ Deployment Timeline

| Phase | Date | Milestone |
|-------|------|-----------|
| **RFP Issued** | Nov 23, 2025 | ✅ Complete |
| **RaaS Provider Selected** | Dec 20, 2025 | 🟡 In Progress |
| **AXM TGE (Arbitrum One)** | Jan 1, 2026 | ⏳ Upcoming |
| **Universe Testnet Launch** | Feb 15, 2026 | 📋 Planned |
| **Public Beta Testing** | Mar-Apr 2026 | 📋 Planned |
| **Universe Mainnet Launch** | May 15, 2026 | 📋 Planned |
| **Full Migration Complete** | Sept 2026 | 📋 Planned |

---

## ❓ FAQ

### Why Layer 3 instead of staying on Arbitrum One?

**Benefits of L3:**
- 90% lower transaction costs ($0.01-0.10 vs. $0.10-0.50)
- AXM as native gas (massive utility boost)
- Full governance control (set fees, block times, rules)
- Revenue capture (keep 100% of fees vs. 0%)
- Marketing differentiation (first smart city with own blockchain)

### Is Universe as secure as Arbitrum One?

**Yes!** Universe inherits Arbitrum One's security through fraud proofs:
- All transaction data posted to Arbitrum One
- 7-day challenge period for validators
- Ultimate settlement to Ethereum L1
- Same trust assumptions as Arbitrum One

### How do users get AXM for gas?

**Multiple options:**
1. Bridge AXM from Arbitrum One (instant deposits)
2. Buy AXM on Universe DEXs (once liquidity migrates)
3. Receive AXM from Axiom services (rent, staking rewards, etc.)
4. Faucet for small amounts (testnet only)

### Can I still use my AXM on Arbitrum One?

**Yes!** AXM exists on both chains:
- **Arbitrum One:** Canonical AXM (original token)
- **Universe:** Native AXM (bridged or minted)
- Bridge connects both chains (7-day withdrawal from Universe)

### What if Universe fails or needs shutdown?

**Safety mechanisms:**
- All funds can be withdrawn to Arbitrum One via bridge
- Fraud proof system protects user assets
- Emergency pause mechanism for critical bugs
- Can migrate back to Arbitrum One if needed

---

## 🤝 Contributing

Universe Blockchain is developed by Axiom Smart City. For partnership inquiries:

- **Email:** partnerships@axiomsmartcity.com
- **Discord:** [Axiom Community]
- **GitHub:** [Coming Soon]

---

## 📜 License

MIT License - see LICENSE file for details

---

## 🌟 Why Universe?

> "Bitcoin is digital gold. Ethereum hosts apps. **Universe IS the app** - a complete sovereign smart city economy running on its own blockchain."

**First smart city. First sovereign chain. First to make it real.** 🚀

---

**Built with ❤️ by the Axiom Smart City team**
