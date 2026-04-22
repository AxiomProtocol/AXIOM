# Universe Blockchain - Technical Overview

**Version:** 1.0  
**Last Updated:** November 23, 2025  
**Status:** Planning Phase  
**Target Launch:** May 2026

---

## What is Universe Blockchain?

**Universe Blockchain** is Axiom Smart City's custom Layer 3 blockchain built on Arbitrum Orbit technology. It serves as the sovereign economic infrastructure for America's first on-chain smart city, powering real estate tokenization, DePIN services, digital banking, and civic applications.

### Vision Statement

> "Creating a complete sovereign digital-physical economy where every transaction, asset, and service operates on a unified blockchain universe."

---

## Key Specifications

| Specification | Value | Notes |
|---------------|-------|-------|
| **Chain Type** | Arbitrum Orbit Rollup (L3) | Maximum security for banking/real estate |
| **Parent Chain** | Arbitrum One (L2) | Settles to Arbitrum, then Ethereum L1 |
| **Native Gas Token** | **AXM** (custom ERC-20) | First smart city with its own gas currency |
| **Block Time** | 250ms (default) → 100ms (optimized) | 2-second soft finality |
| **Gas Limit** | 64M gas per block | 2x Ethereum mainnet capacity |
| **Target TPS** | 500-2,000 (launch) → 10,000+ (scaled) | Handles peak smart city traffic |
| **Finality** | 2 seconds (soft) / 7 days (fraud proof) | Rollup security model |
| **Data Availability** | On-chain (Rollup mode) | Full transparency for compliance |

---

## Why Universe Blockchain?

### Problem: Limitations of Public Chains

**Axiom currently operates on Arbitrum One with 22 deployed smart contracts:**
- ✅ Excellent security and decentralization
- ❌ Shared gas fees (no control over pricing)
- ❌ No token utility for AXM as gas
- ❌ Generic infrastructure (not optimized for smart cities)
- ❌ Governance limitations (bound by Arbitrum DAO rules)

### Solution: Sovereign L3 Chain

**Universe Blockchain gives Axiom:**
- ✅ **90% lower fees** than Arbitrum One
- ✅ **AXM as native gas** (massive utility boost)
- ✅ **Full governance control** (set rules, fees, block times)
- ✅ **Custom compliance hooks** (KYC/AML at protocol level)
- ✅ **Marketing differentiation** ("First smart city with its own blockchain")
- ✅ **Revenue capture** (keep 100% of transaction fees)

---

## Architecture Overview

### Layered Stack

```
┌─────────────────────────────────────────────────────────┐
│  Users & Applications                                    │
│  (Wallets, dApps, Smart City Services)                  │
└─────────────────────────────────────────────────────────┘
                         ↕ (Transactions)
┌─────────────────────────────────────────────────────────┐
│  Universe Blockchain (L3)                               │
│  - Sequencer (processes txs in 250ms blocks)            │
│  - AXM Gas (native currency)                            │
│  - Custom governance & compliance rules                 │
└─────────────────────────────────────────────────────────┘
                         ↕ (Batch posting every 5-15 min)
┌─────────────────────────────────────────────────────────┐
│  Arbitrum One (L2)                                      │
│  - Receives compressed batches from Universe            │
│  - Validates fraud proofs (7-day challenge period)      │
│  - AXM token bridge (L2 ↔ L3)                           │
└─────────────────────────────────────────────────────────┘
                         ↕ (Rollup data posting)
┌─────────────────────────────────────────────────────────┐
│  Ethereum Mainnet (L1)                                  │
│  - Final settlement layer                               │
│  - Ultimate security guarantees                         │
└─────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. Sequencer (Transaction Ordering)
- **Role:** Receives user transactions, orders them, produces blocks
- **Performance:** 250ms block time (4 blocks/second)
- **Operator:** Initially Axiom-controlled, future: decentralized sequencer set
- **Backup:** Automatic failover sequencer for <60 second recovery

#### 2. Batch Poster (L2 Settlement)
- **Role:** Compresses blocks and posts to Arbitrum One every 5-15 minutes
- **Cost:** Pays gas in ETH on Arbitrum One (funded by treasury)
- **Efficiency:** Batching = 90% cost savings vs. per-transaction posting

#### 3. Validators (Fraud Proof System)
- **Role:** Monitors posted batches, challenges invalid state transitions
- **Economic Security:** Validators stake tokens (slashed if dishonest)
- **Permissionless:** Anyone can run a validator (decentralization)

#### 4. Token Bridge (L2 ↔ L3)
- **Purpose:** Move AXM, USDC, WETH between Arbitrum One and Universe
- **Security:** Canonical Orbit bridge (audited by Offchain Labs)
- **Speed:** Instant L2→L3 deposits, 7-day L3→L2 withdrawals (fraud proof window)

#### 5. AXM Gas Treasury
- **Auto-Swap System:** Collects AXM fees → swaps to ETH → funds batch poster
- **Burn Mechanism:** Excess AXM burned (deflationary pressure)
- **Monitoring:** Alerts if ETH balance <threshold for batch posting

---

## AXM as Native Gas - How It Works

### Traditional Gas Model (Arbitrum One)
```
User pays ETH for gas → Sequencer collects ETH → Axiom has no direct benefit
```

### Universe Gas Model (L3)
```
User pays AXM for gas → Treasury collects AXM
                      ↓
            [Auto-Swap Engine]
                      ↓
        50% burned (deflationary) + 50% swapped to ETH
                      ↓
                ETH funds batch poster → Posts to Arbitrum One
```

### Economic Impact

| Metric | Before (Arbitrum One) | After (Universe L3) |
|--------|-----------------------|---------------------|
| **Gas Token** | ETH | **AXM** |
| **AXM Utility** | Governance only | **Required for every transaction** |
| **Fee Capture** | 0% (goes to Arbitrum) | **100% (kept by Axiom)** |
| **Transaction Cost** | $0.10-0.50 | **$0.01-0.10** (90% cheaper) |
| **AXM Demand Driver** | Staking + speculation | **Staking + gas + speculation** |
| **Burn Rate** | Treasury-triggered only | **Every transaction burns AXM** |

**Example:** If Universe processes 1M transactions/day at $0.05 average gas:
- **Daily AXM collected:** $50,000 worth of AXM
- **Daily burn:** ~$25,000 AXM (deflationary!)
- **Daily ETH purchase:** ~$25,000 (for batch posting)
- **Net effect:** Constant AXM buy pressure + supply reduction

---

## Migration Strategy

### Current State (November 2025)
- **22 smart contracts** deployed on Arbitrum One
- **AXM token:** 15B hard cap, ERC20 on Arbitrum One
- **TGE:** January 1, 2026 (launching on Arbitrum One)

### Phased Migration Plan

#### Phase 1: TGE on Arbitrum One (Jan 2026)
- Launch AXM token sale as planned
- Build community and liquidity on Arbitrum One
- **No disruption** to TGE timeline

#### Phase 2: Universe Testnet (Feb-Mar 2026)
- Deploy Universe Blockchain testnet (Arbitrum Sepolia parent)
- Migrate contracts to testnet environment
- Public testing phase with incentives

#### Phase 3: Mainnet Launch (May 2026)
- **Universe Blockchain mainnet** goes live
- Deploy production smart contracts on L3
- Launch token bridge (Arbitrum One ↔ Universe)

#### Phase 4: Gradual Migration (May-Aug 2026)
- **Dual deployment:** Contracts exist on both Arbitrum One AND Universe
- Incentivize users to bridge AXM to Universe (e.g., lower fees, early staking bonuses)
- Gradually sunset Arbitrum One contracts as liquidity migrates

#### Phase 5: Full Migration (Sept 2026+)
- Universe becomes primary chain
- Arbitrum One remains for bridge access only
- **Marketing:** "Axiom now runs on its own sovereign blockchain"

### Risk Mitigation
- **Keep AXM canonical on Arbitrum One:** Wrapped AXM on L3 initially
- **Reversible migration:** Can move back if critical issues arise
- **User education:** Clear guides, support, gradual incentives (no forced migration)

---

## Technical Benefits

### vs. Staying on Arbitrum One

| Feature | Arbitrum One | Universe L3 | Improvement |
|---------|--------------|-------------|-------------|
| **Transaction Cost** | $0.10-0.50 | $0.01-0.10 | **90% reduction** |
| **Block Time** | 250ms | 100-250ms | **Faster confirmations** |
| **Gas Token** | ETH | AXM | **Token utility** |
| **Governance** | Arbitrum DAO | Axiom DAO | **Full control** |
| **Custom Rules** | Limited | Unlimited | **Compliance hooks** |
| **Fee Revenue** | 0% | 100% | **Infinite % gain** |
| **Branding** | Generic L2 | Custom chain | **Marketing edge** |

### vs. Deploying on Ethereum L1

| Feature | Ethereum L1 | Universe L3 | Improvement |
|---------|-------------|-------------|-------------|
| **Transaction Cost** | $5-50 | $0.01-0.10 | **99.5% reduction** |
| **Finality** | 12 minutes | 2 seconds | **360x faster** |
| **TPS** | 15-30 | 2,000+ | **100x throughput** |
| **Security** | Maximum | Inherited (fraud proofs) | **Nearly identical** |

---

## Governance Model

### Axiom DAO Controls

**As Universe chain owner, Axiom DAO can:**
- Set transaction fee rates (e.g., 0.0001 AXM minimum)
- Adjust block gas limits (32M → 64M)
- Configure burn vs. treasury split (currently 50/50)
- Add/remove validators and batch posters
- Upgrade core contracts (with time delays)
- Whitelist compliance modules (KYC/AML requirements)

**On-Chain Voting:**
- AXM holders vote on proposals (ERC20Votes governance)
- 7-day voting period + 2-day time-lock for critical changes
- Multi-sig execution (3-of-5 council initially)

---

## Compliance & Regulatory

### Built-In Compliance Hooks

**Identity Registry (Optional KYC):**
- Contracts can require verified identity for transfers
- Privacy-preserving: Only "verified" flag on-chain, details off-chain
- Gradual enforcement: Start permissionless, add KYC for regulated assets later

**Transaction Monitoring:**
- All transactions transparent on block explorer
- AML tools can flag suspicious patterns
- Freezing mechanism for court-ordered asset seizures (multi-sig required)

**Securities Law:**
- AXM designed as utility token (not security)
- Real estate tokens may be securities → compliance module enforces transfer restrictions
- Legal opinion: Axiom City DAO LLC structure supports this model

---

## Development Roadmap

### Milestone Timeline

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| **RFP Issued to RaaS Providers** | Nov 23, 2025 | ✅ Complete |
| **RaaS Provider Selected** | Dec 20, 2025 | 🟡 In Progress |
| **Testnet Deployment** | Feb 15, 2026 | ⏳ Upcoming |
| **AXM TGE on Arbitrum One** | Jan 1, 2026 | ⏳ Upcoming |
| **Public Beta Testing** | Mar-Apr 2026 | 📋 Planned |
| **Mainnet Launch** | May 15, 2026 | 📋 Planned |
| **Full Migration Complete** | Sept 2026 | 📋 Planned |

---

## Cost Projections

### Year 1 Budget

**One-Time Costs:**
- RaaS deployment & setup: $50,000
- Security audits (2 firms): $75,000
- Infrastructure build: $25,000
- **Total Setup:** ~$150,000

**Monthly Operating (May-Dec 2026):**
- Sequencer operations: $15,000
- Batch posting gas (ETH): $10,000-20,000
- Monitoring & support: $10,000
- Liquidity incentives: $5,000-15,000
- **Total Monthly:** ~$40,000-60,000

**Year 1 Total:** $150k + ($50k × 8 months) = **~$550,000**

**Break-Even Analysis:**
- At 1M tx/day × $0.05 gas = $50k/day revenue
- **Payback period:** ~11 days 🚀
- **Annual profit potential:** $18M+ (if 50% kept as revenue)

---

## Marketing Positioning

### Competitive Differentiators

**vs. Bitcoin:**
- "Bitcoin is digital gold. Universe is a complete sovereign economy."

**vs. Ethereum:**
- "Ethereum hosts apps. Universe IS the app - a full smart city OS."

**vs. Other L2s (Arbitrum, Optimism, Base):**
- "They rent infrastructure. We OWN ours. First smart city, first sovereign chain."

**vs. Other Smart City Projects:**
- "Talk is cheap. We deployed 22 contracts and now launching our own blockchain."

### Key Messages

1. **"Own Your Economic Future"** - Universe gives Axiom residents their own monetary system
2. **"Gas-Free Banking"** - AXM holders stake to earn gas rebates (future feature)
3. **"Built for Real Estate"** - Protocol-level compliance for tokenized properties
4. **"Energy-Efficient"** - Rollup = 99% less energy than Bitcoin mining
5. **"Wall Street Meets Main Street"** - Institutional-grade DeFi for everyday people

---

## Next Steps

### Immediate Actions (Nov-Dec 2025)

1. **Send RFP to Providers** (Due: Dec 5, 2025)
   - Caldera, Conduit, QuickNode, Gelato, AltLayer
   - Include technical specs, pricing requirements, SLA expectations

2. **Evaluate Proposals** (Dec 6-16, 2025)
   - Score using comparison matrix
   - Conduct finalist interviews
   - Check references

3. **Select Provider & Sign Contract** (Dec 20, 2025)
   - Negotiate pricing and terms
   - Secure deployment timeline
   - Begin technical onboarding

4. **Smart Contract Audit Prep** (Dec 2025-Jan 2026)
   - Identify contract changes for L3
   - Book audit slots (long lead times!)
   - Prepare test suites

### Medium-Term (Q1 2026)

- Deploy Universe testnet (Feb 15)
- Migrate contracts to testnet
- Launch public beta with incentives (Mar-Apr)
- Complete security audits
- Prepare mainnet deployment

### Long-Term (Q2+ 2026)

- Mainnet launch (May 15)
- Gradual user migration
- Marketing campaign ("Own the future")
- International expansion (future L3s in other regions?)

---

## FAQ

**Q: Why not just stay on Arbitrum One?**  
A: We want AXM to be the native gas currency, 90% lower fees, and full governance control. Universe gives us all three.

**Q: Is this safe? What if Universe fails?**  
A: Rollup mode inherits Arbitrum One's security (fraud proofs). Plus, we can always migrate back to Arbitrum One if needed.

**Q: Will my AXM tokens on Arbitrum One still work?**  
A: Yes! You can bridge them to Universe anytime. Arbitrum One AXM remains the canonical token.

**Q: How long does it take to move AXM between chains?**  
A: Arbitrum One → Universe = instant. Universe → Arbitrum One = 7 days (fraud proof window).

**Q: What happens to my staking rewards?**  
A: Staking will be available on BOTH chains initially, then migrate fully to Universe by Sept 2026.

**Q: Can I run a validator?**  
A: Yes! After mainnet launch, anyone can run a Universe validator (requires AXM stake).

---

## Contact & Resources

- **Technical Lead:** CTO, Axiom Smart City
- **Email:** tech@axiomsmartcity.com
- **Documentation:** github.com/axiom-smart-city/universe-blockchain
- **Testnet Explorer:** [Coming Feb 2026]
- **Bridge Interface:** [Coming May 2026]

---

**END OF OVERVIEW**

*Universe Blockchain - Building the sovereign economic operating system for smart cities.*
