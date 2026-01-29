# AXM-LEND-001: AXUSD Lending Markets Specification

**Document ID:** AXM-LEND-001  
**Version:** 1.1.0  
**Created:** 2026-01-29  
**Updated:** 2026-01-29  
**Status:** DEPLOYED  
**Network:** Arbitrum One (Chain ID: 42161)

---

## Deployed Markets

### Euler V2 Vault (LIVE - SUPPLY ENABLED)

| Vault | Asset | Liquidity | Address | Status |
|-------|-------|-----------|---------|--------|
| **AXUSD Lending Vault V3** | AXUSD | 56.5 AXUSD | [`0xCf00A6FA6f5bAc1f224Cee029DacF3b8CCC79429`](https://arbiscan.io/address/0xCf00A6FA6f5bAc1f224Cee029DacF3b8CCC79429) | ✅ SUPPLY LIVE |

**View on Euler:** [app.euler.finance/vault/0xCf00A6FA6f5bAc1f224Cee029DacF3b8CCC79429?network=arbitrumone](https://app.euler.finance/vault/0xCf00A6FA6f5bAc1f224Cee029DacF3b8CCC79429?network=arbitrumone)

**Current Status:**
- ✅ Supply/Deposit: ENABLED - LPs can deposit AXUSD to earn yield
- ⏸️ Borrowing: PENDING - Requires Euler governance setup (see notes below)

**Vault Configuration:**
- Oracle: `0x1045B6c70AC7b491bf724B5Aa4D89F542D955E15` (Axiom Price Oracle V2 - decimal-corrected)
- IRM: `0xd726F97adA1dD330D3C5e479A79c47Dc63dCA770` (Adaptive Curve)
- Unit of Account: USDC
- Governor: `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96`
- Creation TX: [`0x3f794eba26b2125989fb4cd1a6cb0ad018a019bab5d44f7778da3c53aba9e81f`](https://arbiscan.io/tx/0x3f794eba26b2125989fb4cd1a6cb0ad018a019bab5d44f7778da3c53aba9e81f)

**Axiom Price Oracle V2 Features:**
- Uses Chainlink feeds for WETH/USD and ARB/USD pricing
- Correct decimal handling (USDC 6 decimals, AXUSD 18 decimals)
- 1:1 pricing for stablecoins (USDC, USDT, AXUSD)
- 1.03:1 pricing for USDY (includes yield premium)
- Contract: [`0x1045B6c70AC7b491bf724B5Aa4D89F542D955E15`](https://arbiscan.io/address/0x1045B6c70AC7b491bf724B5Aa4D89F542D955E15)

**Accepted Collateral (5 types configured):**

| Collateral | Address | Borrow LTV | Liquidation LTV |
|------------|---------|------------|-----------------|
| **USDC** | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` | 90% | 95% |
| **USDY** | `0x35e050d3C0eC2d29D269a8EcEa763a183bDF9A9D` | 85% | 90% |
| **USDT** | `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9` | 90% | 95% |
| **WETH** | `0x82aF49447D8a07e3bd95BD0d56f35241523fBab1` | 80% | 85% |
| **ARB** | `0x912CE59144191C1204E64559FE8253a0e49E6548` | 70% | 75% |

**Borrowing Status: ENABLED**

Supply and borrow caps are now configured:
- Supply Cap: 1,000,000 AXUSD (encoded: 64005)
- Borrow Cap: 500,000 AXUSD (encoded: 32005)

**Governor Contract:**
- AxiomVaultGovernorV2: `0xE742Ee9b946043ecc75bFc71B47216C1f8248316`

**Technical Note - Euler AmountCap Encoding:**
Euler V2 uses 16-bit decimal floating point for caps (see `AmountCap.sol`):
- Bits 0-5: exponent (0-63)
- Bits 6-15: mantissa (0-1023), scaled by 100
- Value = 10^exponent * mantissa / 100
- Raw 0 = unlimited (no cap)

Example encoding: 1,000,000 = mantissa 1000, exp 5 = (1000 << 6) | 5 = 64005

**Previous Vault Iterations (Deprecated):**
- V2 (`0xf8ff43f8b75c3a630e5e331613f9bdb133a49d13`): Oracle decimal issue
- V1 (`0xFc7145A213833222Eb0e616fDcb95D1746a8c40C`): No oracle set

### Note on Morpho Markets

Morpho Blue core contract is **NOT deployed on Arbitrum One** (only infrastructure contracts exist). The markets listed below were created on Morpho infrastructure but require Morpho Blue mainnet deployment:

| Market | Collateral | LLTV | Market ID | Status |
|--------|------------|------|-----------|--------|
| AXUSD/USDY | USDY | 90% | `0xe0bd68...873ac` | ⏸️ Pending Morpho L2 |
| AXUSD/USDC | USDC | 92% | `0x9be349...cc364` | ⏸️ Pending Morpho L2 |
| AXUSD/USTBL | USTBL | 90% | `0x77c76d...02715` | ⏸️ Pending Morpho L2 |

**Deployer:** `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96`

---

## Executive Summary

This document specifies the deployment of AXUSD lending markets on Morpho and Euler Finance, enabling external liquidity providers to earn yield while AXUSD holders can borrow against their collateral.

### Value Proposition

| Stakeholder | Benefit |
|-------------|---------|
| **Axiom Protocol** | Protocol fees, AXUSD utility, external liquidity |
| **Liquidity Providers** | 5-15% APY on AXUSD deposits |
| **Borrowers** | Access liquidity while holding yield-bearing collateral |
| **AXUSD Holders** | More use cases = more demand = stability |

---

## Contract Addresses

### Axiom Contracts

| Contract | Address | Network |
|----------|---------|---------|
| **AXUSD (Stablecoin)** | `0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c` | Arbitrum One |
| **AXUSD GENIUS** | `0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C` | Arbitrum One |
| **AXM Token** | `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D` | Arbitrum One |

### Collateral Assets (RWA Treasury Products)

| Asset | Address | APY | Provider |
|-------|---------|-----|----------|
| **USDY** | `0x35e050d3c0ec2d29d269a8ecea763a183bdf9a9d` | 5.35% | Ondo Finance |
| **USTBL** | `0x3096e7bfd0878cc65be71f8899bc4cfb57187ba3` | 4.9% | Spiko |
| **USDC** | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` | 0% | Circle |

### Protocol Contracts (Arbitrum One)

| Protocol | Contract | Address | Status |
|----------|----------|---------|--------|
| **Euler V2** | EVK Factory | `0x78Df1CF5bf06a7f27f2ACc580B934238C1b80D50` | ✅ Deployed |
| **Euler V2** | EVC | `0x6302ef0F34100CDDFb5489fbcB6eE1AA95CD1066` | ✅ Deployed |
| **Euler V2** | Protocol Config | `0x06c1Ab0A1672E8FC7F7D10BD7B869B4116D18a2c` | ✅ Deployed |
| **Morpho** | Morpho Blue | `0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb` | ❌ Not on Arbitrum |
| **Morpho** | Public Allocator | `0x769583af5e9d03589f159ebec31cc2c23e8c355e` | ✅ Infrastructure only |

---

## Market Specifications

### Market 1: AXUSD/USDY (Morpho)

**Purpose:** Borrow AXUSD using yield-bearing USDY as collateral

```
Market Parameters:
├── Loan Token: AXUSD (0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c)
├── Collateral Token: USDY (0x35e050d3c0ec2d29d269a8ecea763a183bdf9a9d)
├── Oracle: Chainlink USDY/USD
├── LLTV (Liquidation LTV): 90% (0.9e18)
├── Interest Rate Model: Adaptive Curve IRM
└── Governance: Axiom DAO controlled
```

**Risk Parameters:**
- Borrow LTV: 85%
- Liquidation LTV: 90%
- Liquidation Penalty: 5%
- Bad Debt Buffer: 2%

### Market 2: AXUSD/USDC (Morpho)

**Purpose:** Standard stablecoin borrowing market

```
Market Parameters:
├── Loan Token: AXUSD (0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c)
├── Collateral Token: USDC (0xaf88d065e77c8cC2239327C5EDb3A432268e5831)
├── Oracle: Chainlink USDC/USD
├── LLTV: 92% (0.92e18)
├── Interest Rate Model: Adaptive Curve IRM
└── Governance: Axiom DAO controlled
```

### Market 3: AXUSD Lending Vault (Euler)

**Purpose:** Full-featured lending vault with cross-vault collateral

```
Vault Parameters:
├── Asset: AXUSD (0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c)
├── Unit of Account: USD
├── Vault Type: Governed (upgradeable)
├── Governor: Axiom Multisig
├── Accepted Collateral:
│   ├── USDY (90% LTV)
│   ├── USDC (92% LTV)
│   └── USTBL (90% LTV)
├── Interest Rate Model: Kink-based reactive
└── Hooks: None (standard vault)
```

---

## Deployment Process

### Phase 1: Pre-Deployment (During Observation)

- [x] Document market specifications
- [x] Create deployment services
- [x] Build monitoring infrastructure
- [ ] Audit market parameters
- [ ] Test on Arbitrum Sepolia

### Phase 2: Morpho Market Deployment

```typescript
// Deploy AXUSD/USDY market on Morpho
const morphoMarketParams = {
  loanToken: AXUSD_ADDRESS,
  collateralToken: USDY_ADDRESS,
  oracle: USDY_ORACLE_ADDRESS,
  irm: ADAPTIVE_CURVE_IRM,
  lltv: ethers.parseUnits('0.9', 18)
};

const marketId = await morpho.createMarket(morphoMarketParams);
```

### Phase 3: Euler Vault Deployment

```typescript
// Deploy AXUSD vault on Euler via EVK Factory
const eulerVaultParams = {
  asset: AXUSD_ADDRESS,
  oracle: AXUSD_ORACLE_ADDRESS,
  unitOfAccount: USDC_ADDRESS,
  upgradeable: true,
  governor: AXIOM_MULTISIG
};

const vaultAddress = await evkFactory.createProxy(eulerVaultParams);
```

---

## Oracle Configuration

### Chainlink Price Feeds (Arbitrum One)

| Asset | Feed Address | Heartbeat |
|-------|--------------|-----------|
| USDY/USD | `0x0A0C6C5C78d0A6C70D58AE5a79e9B2E0F6f4C3D1` | 24h |
| USDC/USD | `0x50834F3163758fcC1Df9973b6e91f0F0F0370aD1` | 1h |
| ETH/USD | `0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612` | 1h |

### Custom AXUSD Oracle

```solidity
// AXUSD maintains 1:1 USD peg via PSM
// Oracle returns fixed 1e8 with PSM health check
contract AXUSDOracle {
    function latestRoundData() external view returns (
        uint80, int256 answer, uint256, uint256, uint80
    ) {
        // Check PSM reserves are healthy
        require(psmReserveRatio() >= 0.95e18, "PSM undercollateralized");
        return (0, 1e8, 0, block.timestamp, 0);
    }
}
```

---

## Interest Rate Model

### Morpho Adaptive Curve IRM

```
Parameters:
├── Target Utilization: 90%
├── Base Rate: 0.5% APY
├── Rate at Target: 4% APY
├── Rate at 100% Util: 50% APY
└── Speed: 4% per hour
```

### Euler Reactive IRM

```
Parameters:
├── Kink 1: 80% utilization → 5% APY
├── Kink 2: 90% utilization → 10% APY
├── Max Rate: 100% APY at 100% utilization
└── Adjustment Speed: 2% per hour
```

---

## Revenue Model

### Protocol Fees

| Fee Type | Rate | Recipient |
|----------|------|-----------|
| **Origination Fee** | 0.05% | Axiom Treasury |
| **Interest Spread** | 10% of interest | Axiom Treasury |
| **Liquidation Fee** | 0.5% | Axiom Treasury |

### Projected Revenue (Based on TVL)

| TVL | Annual Interest | Protocol Revenue |
|-----|-----------------|------------------|
| $100K | $8,000 | $800 |
| $1M | $80,000 | $8,000 |
| $10M | $800,000 | $80,000 |

---

## Security Considerations

### Risk Mitigation

1. **Oracle Manipulation**
   - Use Chainlink decentralized oracles
   - Implement price deviation checks
   - Add staleness protection

2. **Liquidation Cascades**
   - Conservative LTV ratios (85-90%)
   - Gradual liquidation (Dutch auction)
   - Bad debt socialization mechanism

3. **Smart Contract Risk**
   - Deploy on battle-tested protocols (Morpho, Euler)
   - Use governed vaults with timelock
   - Emergency pause capability

### Audit Requirements

- [ ] Internal security review
- [ ] External audit (recommended: Spearbit, Trail of Bits)
- [ ] Formal verification of oracle logic

---

## Governance

### Market Parameter Changes

All parameter changes require:
1. Governance proposal (48h voting period)
2. Timelock execution (24h delay)
3. On-chain verification

### Emergency Actions

Axiom Security Council can:
- Pause markets (immediate)
- Adjust LTV downward (immediate)
- Halt new borrows (immediate)

Cannot:
- Increase LTV (requires governance)
- Access user funds (non-custodial)
- Change oracle without timelock

---

## Monitoring & Alerts

### Key Metrics

| Metric | Alert Threshold |
|--------|-----------------|
| Utilization Rate | > 95% |
| Bad Debt Ratio | > 0.1% |
| Oracle Deviation | > 5% |
| Liquidation Queue | > 10 positions |

### Dashboard Integration

Markets will be visible in:
- Axiom Observer Dashboard (`/observer/lending`)
- Morpho App (`app.morpho.org`)
- Euler App (`app.euler.finance`)

---

## Timeline

| Phase | Target Date | Status |
|-------|-------------|--------|
| Specification Complete | 2026-01-29 | ✅ Complete |
| Service Implementation | 2026-01-29 | ✅ Complete |
| Testnet Deployment | 2026-02-15 | Pending |
| Security Audit | 2026-03-01 | Pending |
| Mainnet Deployment | 2026-03-26+ | Post-Observation |

---

## Appendix

### A. Backend Services

The following services provide market management functionality:

**MorphoMarketService** (`server/services/lending/MorphoMarketService.ts`):
- `getProposedMarkets()` - List all proposed AXUSD markets
- `getMarketInfo(marketId)` - Query live market data from chain
- `computeMarketId(params)` - Calculate market ID from parameters
- `generateDeploymentTx(params)` - Generate unsigned transaction for market creation
- `getDeploymentGuide()` - Step-by-step deployment instructions
- `getIntegrationStatus()` - Current integration and observation status

**EulerVaultService** (`server/services/lending/EulerVaultService.ts`):
- `getProposedVaults()` - List all proposed AXUSD vaults
- `getVaultInfo(vaultAddress)` - Query live vault data from chain
- `generateDeploymentParams(vault)` - Generate deployment parameters
- `getDeploymentGuide()` - Step-by-step deployment instructions
- `compareWithMorpho()` - Protocol comparison table
- `getIntegrationStatus()` - Current integration and observation status

### B. API Endpoints

- `GET /api/lending/overview` - Full status of all markets and vaults
- `GET /api/lending/morpho` - Morpho-specific integration
- `GET /api/lending/morpho?action=proposed` - List proposed Morpho markets
- `GET /api/lending/morpho?action=guide` - Deployment guide
- `GET /api/lending/euler` - Euler-specific integration
- `GET /api/lending/euler?action=proposed` - List proposed Euler vaults
- `GET /api/lending/euler?action=compare` - Protocol comparison

### C. Related Documents

- AXM-GOV-001: Observation Window Rationale (`/docs/governance/AXM-GOV-001-observation-window-rationale.md`)
- AXM-INT-001: Arbitrum 2026 Integration Plan (`/docs/integrations/arbitrum-2026-integration-plan.md`)
- AXUSD Stablecoin System (`/contracts/stablecoin/`)

### D. External Resources

- Morpho Documentation: https://docs.morpho.org/
- Euler EVK Documentation: https://docs.euler.finance/creator-tools/vaults/evk/introduction/
- Morpho Arbitrum App: https://app.morpho.org/arbitrum/
- Euler App: https://app.euler.finance/
