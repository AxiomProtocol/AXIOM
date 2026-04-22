# AXAU Reserve Instrument
## Institutional Technical Specification & White Paper

**Document Classification:** Institutional Specification — Not Investment Advice  
**Version:** 1.0.0  
**Effective Date:** April 2, 2026  
**Issuer:** Axiom Protocol  
**Network:** Arbitrum One (Chain ID: 42161)  
**Status:** Live — Phase 1 Active  

---

> *This document does not constitute an offer to sell or a solicitation to purchase any security, commodity, or digital asset. AXAU is an on-chain reserve instrument. Participants should obtain independent legal, financial, and tax advice before engaging.*

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Instrument Overview](#2-instrument-overview)
3. [Smart Contract Architecture](#3-smart-contract-architecture)
4. [Reserve Layer Design](#4-reserve-layer-design)
5. [NAV Mechanics and Mathematical Framework](#5-nav-mechanics-and-mathematical-framework)
6. [Data Infrastructure](#6-data-infrastructure)
7. [Mint and Redeem Mechanics](#7-mint-and-redeem-mechanics)
8. [Governance Framework](#8-governance-framework)
9. [Risk Framework](#9-risk-framework)
10. [Audit and Compliance Roadmap](#10-audit-and-compliance-roadmap)
11. [Protocol Integration](#11-protocol-integration)
12. [Operational Status](#12-operational-status)
13. [Disclosures](#13-disclosures)
14. [Appendix A — Deployed Contract Registry](#appendix-a--deployed-contract-registry)
15. [Appendix B — API Reference](#appendix-b--api-reference)
16. [Appendix C — System State Schema](#appendix-c--system-state-schema)
17. [Appendix D — On-Chain Data Sources](#appendix-d--on-chain-data-sources)

---

## 1. Executive Summary

AXAU is Axiom Protocol's gold-anchored reserve instrument — an on-chain store of value designed for the digital-physical economy. Each AXAU token is backed by a governance-curated basket of real-world commodity reserves, with Phase 1 anchored entirely by gold (XAU) via PAXG, the NYDFS-regulated tokenized gold instrument issued by Paxos Trust Company.

AXAU is not a stablecoin. It is a multi-commodity reserve unit whose backing value is expected to appreciate as governance approves additional reserve layers over time. The instrument is designed to serve three functions within the Axiom ecosystem:

1. **Wealth Preservation** — A long-term store of value instrument anchored to physical commodities and real assets.
2. **Treasury Reserve** — A reserve asset for the Axiom Protocol treasury and the AXUSD stablecoin backing.
3. **Collateral Infrastructure** — Eligible collateral for future on-chain lending markets and yield-bearing vaults.

### Key Parameters (at Genesis)

| Parameter | Value |
|---|---|
| Token Symbol | AXAU |
| Standard | ERC-3643 (T-REX) |
| Network | Arbitrum One (Chain ID: 42161) |
| Decimals | 18 |
| Phase 1 Reserve | PAXG — Paxos Gold |
| Oracle | Chainlink XAU/USD |
| Coverage Floor | 105% |
| Mint Premium | 5% above Backing NAV |
| Mint Fee | 0 bps (genesis) |
| Redeem Fee | 0 bps (genesis) |
| Genesis Mint | 0.0013 PAXG → 5.789977 AXAU (Block 448396754) |

---

## 2. Instrument Overview

### 2.1 What AXAU Is

AXAU (Axiom Gold Reserve Unit) is an ERC-3643 compliant digital reserve token deployed on Arbitrum One. It is backed by a governance-approved basket of physical commodity reserves, beginning with gold. The instrument is designed to be:

- **Over-collateralized at all times** — A minimum coverage ratio of 105% is enforced by automated control layers. Minting is blocked if coverage falls below this floor.
- **Trustlessly verifiable** — All reserve positions, NAV computations, and system health metrics are readable directly from on-chain state without reliance on off-chain data.
- **Governance-extensible** — The reserve basket grows over time through AXM token holder governance. Each approved commodity addition is holder-accretive by design — it raises per-token backing without diluting supply.
- **Redemption-first** — Holders may redeem AXAU for PAXG at Backing NAV at any time, as long as the vault is solvent and the redeem function is not governance-paused.

### 2.2 What AXAU Is Not

- **Not a stablecoin.** AXAU does not maintain a USD peg. Its value denominated in fiat currencies will fluctuate with the market value of its underlying commodity reserves.
- **Not a security** (by design). AXAU is structured as a commodity reserve instrument. This characterization is subject to independent legal review and may differ across jurisdictions.
- **Not an investment fund.** There are no redemption fees charged to profit the issuer. All fees collected (currently 0 bps) are governance-directed to the Axiom Protocol treasury.
- **Not a yield instrument.** AXAU does not generate yield by default. Any yield-bearing mechanics require explicit governance approval and separate implementation.

### 2.3 Token Standard — ERC-3643 (T-REX)

AXAU is issued under the ERC-3643 (T-REX) standard, the leading open standard for regulated security and compliance-enabled tokens. Key properties:

- **Identity-gated transfers.** Token transfers can only occur between wallets holding valid on-chain identities registered with the ONCHAINID registry. This enables compliance-aware distribution without compromising on-chain settlability.
- **Compliance module composability.** Transfer restrictions are enforced by composable on-chain compliance modules (jurisdiction restrictions, holding limits, lockup rules) rather than centralized admin controls.
- **Regulatory alignment.** The ERC-3643 standard is designed to align with the GENIUS Act framework and other digital asset regulatory regimes globally. No definitive regulatory compliance is claimed — participants should obtain independent legal advice.

The token contract (`AXAUTokenLite3643`) is a production-deployment of the ERC-3643 standard with identity and compliance controls activated.

---

## 3. Smart Contract Architecture

The AXAU system comprises seven deployed smart contracts on Arbitrum One, each with a distinct role. The architecture follows a separation-of-concerns design: the token contract handles supply; the registry controls which reserves qualify; independent vault contracts hold each reserve asset class; a dedicated engine computes all NAV mathematics; and a controller enforces coverage rules at mint/redeem time.

### 3.1 Contract Roles

```
┌─────────────────────────────────────────────────────────────────┐
│                     AXAU SYSTEM ARCHITECTURE                     │
│                        Arbitrum One                              │
└─────────────────────────────────────────────────────────────────┘

  User Wallet
       │
       │ PAXG approve + mintAXAU(amount)
       ▼
  ┌────────────────────────┐
  │  MintRedeemController  │  ← Enforces coverage ratio ≥ 105%
  │  0x036F05a3...37792    │    Routes tokens to correct vault
  └────────┬───────────────┘    Calls NAVEngine for live quote
           │
           ├──── calls ────► NAVEngine (0x80F8634a...C519)
           │                  Computes Backing NAV, Mint NAV,
           │                  Coverage Ratio, Solvency flag
           │
           ├──── deposits ──► AXGoldVault (0xaCc9BFf5...4CF8)
           │                  Holds PAXG
           │                  Reports goldSnapshot() → (asset, units)
           │
           └──── mints ─────► AXAUTokenLite3643 (0xbcCA4D...0Bb)
                               ERC-3643 AXAU token
                               Compliance-gated transfers

  Governance / Oracle Inputs:
  ┌──────────────────────────┐    ┌───────────────────────────────┐
  │  CommodityRegistry       │    │  Chainlink XAU/USD Oracle     │
  │  0x6D3aAa92...10bDa      │    │  0x1F954Dc2...a2c (Arb One)   │
  │  Manages component list  │    │  8-decimal price feed         │
  │  haircutBps, maxWeight   │    │  Heartbeat: 1 hour / 0.5%     │
  └──────────────────────────┘    └───────────────────────────────┘

  Inactive (Phase 3):
  ┌──────────────────────────┐    ┌───────────────────────────────┐
  │  AXLandVault             │    │  LandNAVOracleMultiSig        │
  │  0x66Aadce6...449cf      │    │  0x8FF5D66d...A0Fc            │
  │  Holds land title units  │    │  Multi-party land appraisal   │
  │  lastNavTimestamp = 0    │    │  3-of-N authorization         │
  └──────────────────────────┘    └───────────────────────────────┘
```

### 3.2 Contract Descriptions

#### AXAUTokenLite3643 — Token Contract
The ERC-3643 compliant AXAU token. Controls total supply, enforces transfer compliance, and holds the token's on-chain identity. Minting authority is held exclusively by the MintRedeemController. The deployer (`0x8d7892CF226B43d48B6e3ce988A1274e6D114C96`) holds `GOVERNOR_ROLE` on all contracts.

**Key read methods:**
```solidity
totalSupply()              → uint256  // 18-decimal WAD
balanceOf(address)         → uint256
name()                     → "Axiom Gold Reserve Unit"
symbol()                   → "AXAU"
```

#### CommodityRegistry — Component Registry
The governance-controlled registry of approved reserve components. Each component is stored as a `Component` struct with the following fields:

```solidity
struct Component {
    bytes32  id;             // keccak256 of symbol (e.g. keccak256("XAU"))
    address  vault;          // Vault contract holding this asset
    address  oracle;         // Price oracle address
    uint256  haircutBps;     // Reserve haircut in basis points
    uint256  maxWeightBps;   // Maximum basket weight (0 = uncapped)
    bool     isLiquid;       // Liquid vs. illiquid classification
    bool     enabled;        // Whether component is active
    string   symbol;         // Human-readable symbol
    uint8    oracleDecimals; // Oracle price decimal places
    uint8    assetDecimals;  // Token decimal places
    uint8    phase;          // Rollout phase number
}
```

Currently registered components:
- **XAU** (`id: 0x7c687a32...`): PAXG vault, Chainlink oracle, haircutBps = 0 (see Note below), enabled = true
- **LAND** (`id: 0xb0366c21...`): AXLandVault, LandNAVOracle, haircutBps = 4000 (40%), enabled = false (Phase 3)

> **Critical Note — XAU haircutBps:** The XAU component's `haircutBps` is set to `0` in production. This is a deliberate configuration required by the current NAVEngine design. The NAVEngine's `MINT_PREMIUM_BPS` constant is set to `500` (5%). With this mint premium, any non-zero XAU haircut causes the coverage calculation to yield less than 10500 bps (105%), which prevents minting. To re-introduce a haircut on the XAU component, the NAVEngine must be redeployed with a higher `MINT_PREMIUM_BPS` constant. Do not change `haircutBps` for XAU without first deploying a new NAVEngine.

#### AXGoldVault — Gold Reserve Vault
Holds the PAXG reserve. Accepts PAXG deposits from the MintRedeemController and releases PAXG on redemption. Reports a `goldSnapshot()` for NAV computation.

```solidity
goldSnapshot()      → (address asset, uint256 units)  // PAXG addr + total units (18-dec WAD)
reserveAsset()      → address                          // 0xfEb4DfC8...28429 (PAXG on Arbitrum)
totalUnits()        → uint256                          // Total PAXG units held
vaultFrozen()       → bool                             // Emergency freeze status
```

PAXG on Arbitrum One: `0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429` (18 decimals)

#### NAVEngine — NAV Computation Engine
The core mathematical engine of AXAU. Reads from all registered vaults and the Chainlink oracle to compute a live multi-asset NAV snapshot. All values are expressed in WAD (10^18) units.

```solidity
snapshot()                              // Returns full (backingUsdWad, backingNav, mintNav, coverageBps)
totalBackingUsdWad()     → uint256      // Sum of all haircut-adjusted reserve values in USD (WAD)
backingNavPerAXAUWad()   → uint256      // Backing NAV per AXAU token (WAD)
mintNavPerAXAUWad()      → uint256      // Mint NAV per AXAU token (WAD) = backingNav × 1.05
coverageRatioBps()       → uint256      // Coverage ratio in bps (e.g. 11000 = 110%)
isSolvent()              → bool         // true if coverageRatioBps ≥ COVERAGE_FLOOR_BPS (10500)
componentValueUsdWad(bytes32)  → uint256 // USD value of a single component (WAD)
TARGET_PRICE_WAD()       → uint256      // = 1e18 (AXAU targets $1.00 unit of account)
MINT_PREMIUM_BPS()       → uint256      // = 500 (5%)
```

#### MintRedeemController — Mint/Redeem Gateway
The single user-facing entry point for all mint and redeem operations. Enforces coverage rules, computes live quotes, routes tokens to vaults, and calls the token contract to mint/burn AXAU.

```solidity
mintPaused()        → bool
redeemPaused()      → bool
mintFeeBps()        → uint256   // = 0 bps at genesis
redeemFeeBps()      → uint256   // = 0 bps at genesis
totalMinted()       → uint256   // Cumulative AXAU minted (WAD)
totalRedeemed()     → uint256   // Cumulative AXAU redeemed (WAD)
quoteMint(bytes32 vaultId, uint256 tokenAmount)  → (axauToUser, mintNavWad)
quoteRedeem(bytes32 vaultId, uint256 axauAmount) → (tokenToUser, backingNavWad)
```

#### AXLandVault — Land Reserve Vault (Phase 3, Inactive)
Holds tokenized land title units representing real property interests from Axiom's acquisition pipeline. Currently inactive (`lastNavTimestamp = 0`, `totalValueUsdWad = 0`). The vault is registered in the CommodityRegistry but disabled until Phase 3 activation.

```solidity
landSnapshot()         → (uint256 valueUsdWad, bool stale)
totalValueUsdWad()     → uint256
lastNavTimestamp()     → uint256   // = 0 (not yet activated)
navOracle()            → address   // LandNAVOracleMultiSig
```

#### LandNAVOracleMultiSig — Land Appraisal Oracle (Phase 3, Inactive)
A multi-party authorization oracle for publishing land appraisal values. Requires M-of-N signers to submit and confirm a new NAV reading. Designed to align with appraisal-cadence updates (monthly) rather than continuous price feeds.

---

## 4. Reserve Layer Design

The AXAU reserve basket is organized into layers, each corresponding to a distinct asset class with its own custody model, oracle source, risk tier, and governance admission requirements.

### 4.1 Phase 1 — Gold (XAU) — ACTIVE

| Attribute | Value |
|---|---|
| Commodity | Gold |
| On-chain Asset | PAXG (Paxos Gold) |
| PAXG Address (Arbitrum) | `0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429` |
| Risk Tier | Tier 1 — Liquid |
| Custody | Paxos Trust Company / Brink's London Vaults |
| Oracle | Chainlink XAU/USD — `0x1F954Dc24a49708C26E0C1777f16750B5C6d5a2c` |
| Oracle Decimals | 8 |
| Oracle Fallback | Secondary signed institutional feed → bounded TWAP → component pause |
| Haircut (Production) | 0 bps (see Section 3.2 critical note) |
| Haircut (Specified) | 5% |
| Max Weight | Uncapped (sole Phase 1 component) |
| NAV Cadence | Real-time (Chainlink heartbeat) |
| Status | LIVE |

**Custody Notes:** Physical gold custody is handled entirely by Paxos Trust Company and Brink's. Axiom does not take direct custody of physical gold. Axiom's gold reserve is entirely comprised of PAXG tokens held in the `AXGoldVault` automated control layer on Arbitrum One. Paxos publishes monthly third-party reserve attestation reports which are referenced in the Axiom Solvency Console.

**PAXG Properties:** Each PAXG token represents exactly one troy ounce of London Good Delivery gold held in allocated form in Brink's vaults. PAXG is issued by Paxos Trust Company under a New York Department of Financial Services (NYDFS) trust company charter. It is the most liquid tokenized gold instrument available on Arbitrum One and has been chosen as the Phase 1 reserve asset based on custody quality, regulatory standing, oracle availability, and on-chain liquidity.

### 4.2 Phase 2 — Silver (XAG) — Governance Vote Required

| Attribute | Value |
|---|---|
| Commodity | Silver |
| Risk Tier | Tier 1 — Liquid |
| Specified Haircut | 8% |
| Max Weight | 30% of basket |
| Oracle | Chainlink XAG/USD (Arbitrum One) |
| Status | GOVERNANCE_VOTE_REQUIRED |

Silver admission requires an AXM governance vote meeting minimum quorum (15% of circulating supply), supermajority passage (>66%), and completion of the commodity admission review checklist (Section 8.4). Upon approval, `AXSilverVault` will be deployed, Chainlink XAG/USD integrated, and the component registered in the CommodityRegistry.

A silver addition constitutes an **Expansion Event** — depositing silver reserves without a proportional AXAU mint increases Backing NAV per outstanding token.

### 4.3 Phase 3 — Land (Real Estate RWA) — Planned

| Attribute | Value |
|---|---|
| Commodity | Land (US Real Property) |
| Risk Tier | Tier 3 — Illiquid |
| Specified Haircut | 40% |
| Max Weight | 10% of basket (hard cap) |
| Oracle | LandNAVOracleMultiSig (multi-party appraisal) |
| NAV Cadence | Monthly (appraisal-cadence) |
| AXLandVault Address | `0x66Aadce66a359609ec5E18fb3d8927a2363449cf` (deployed, inactive) |
| LandNAVOracle Address | `0x8FF5D66d4be4C107362e63f8E9E8283E8c5EA0Fc` (deployed, inactive) |
| Status | PLANNED (infrastructure deployed; no NAV submitted) |

Land is Axiom's proprietary differentiator in the AXAU reserve basket. The Phase 3 land sleeve channels real property acquired through Axiom's governance-approved land acquisition pipeline into the AXAU reserve, creating a direct physical-digital bridge between real estate assets and on-chain reserve backing.

**Illiquid Sleeve Design Constraints:**
- The 40% haircut is applied to the monthly appraised value of land holdings. Only 60 cents of every dollar of appraised land value contributes to AXAU backing.
- The 10% maximum basket weight ensures that the land sleeve cannot exceed 10% of total AXAU backing, preventing over-concentration in an illiquid asset class.
- Land components are excluded from spot redemption. Redeeming AXAU against the land sleeve requires governance-defined settlement procedures.
- NAV updates are monthly, not real-time. Between appraisal cycles, the previous confirmed appraisal applies with a rising haircut schedule for staleness.

### 4.4 Phase 4+ — Energy and Additional Commodities — Future

Energy (WTI Crude) and other commodity layers are classified as future phases pending maturation of credible tokenized commodity infrastructure. Synthetic or derivatives-based commodity exposure does not qualify under AXAU admission criteria. No timeline is committed for Phase 4+.

---

## 5. NAV Mechanics and Mathematical Framework

### 5.1 Core Definitions

All monetary values in the AXAU system are expressed in USD. All on-chain calculations use WAD arithmetic (10^18 scale factor) to avoid floating-point precision loss.

**Definitions:**

| Symbol | Definition |
|---|---|
| N | Total AXAU supply (WAD units) |
| Q_i | Quantity of reserve asset i held in vault (WAD units) |
| P_i | Spot price of reserve asset i in USD (from oracle, normalized to WAD) |
| H_i | Haircut fraction for component i (e.g. 0.05 for 5%) |
| R_total | Total haircut-adjusted reserve value in USD (WAD) |
| BN | Backing NAV per AXAU token (WAD) |
| MN | Mint NAV per AXAU token (WAD) |
| CR | Coverage Ratio (expressed as bps, e.g. 10500 = 105%) |
| F_m | Coverage Ratio Floor for minting = 10500 bps (105%) |
| π | Mint Premium = 500 bps (5%) |

### 5.2 Backing NAV Formula

The Backing NAV represents the floor value that each outstanding AXAU token is backed by:

```
R_total = Σ [ Q_i × P_i × (1 − H_i) ]   for all enabled components i

BN = R_total / N                           (if N > 0)
BN = ∞                                     (if N = 0 — no supply outstanding)
```

At genesis with XAU haircutBps = 0:
```
R_total = Q_PAXG × P_XAU_USD × 1.0
BN      = R_total / N_AXAU
```

### 5.3 Mint NAV Formula

The Mint NAV is the minimum reserve value that must be deposited per new AXAU token. It is set above Backing NAV by the `MINT_PREMIUM_BPS` constant:

```
MN = BN × (1 + π)
MN = BN × (1 + 0.05)
MN = BN × 1.05
```

This ensures every mint is immediately over-collateralized at the 105% floor. No discounted minting is possible.

### 5.4 Coverage Ratio Formula

```
CR_bps = (R_total / N) × 10000   (expressed in basis points)
CR_pct = CR_bps / 100
```

For minting to be permitted: `CR_bps ≥ F_m = 10500`

If `N = 0` (no supply), the coverage ratio is treated as infinite. The `isSolvent()` flag returns `true` if `CR_bps ≥ 10500`, or if `N = 0`.

### 5.5 Critical Constraint — haircutBps and MINT_PREMIUM_BPS

A key design constraint governs the relationship between the XAU component's `haircutBps` and the `MINT_PREMIUM_BPS` constant in NAVEngine:

```
Post-mint coverage = (BPS − haircut) × (1 + π) / BPS

With BPS = 10000, π = 500 bps (5%), haircut = 0:
  = (10000 − 0) × 1.05 / 10000 = 1.05 = 105%  ✓

With BPS = 10000, π = 500 bps (5%), haircut = 500 (5%):
  = (10000 − 500) × 1.05 / 10000 = 9975/10000 = 99.75%  ✗
```

**Conclusion:** Any non-zero haircutBps for XAU results in post-mint coverage below 105% when `MINT_PREMIUM_BPS = 500`. The haircut and premium are mathematically redundant at these values. To re-introduce a meaningful XAU haircut, the NAVEngine contract must be redeployed with `MINT_PREMIUM_BPS` raised sufficiently to absorb the haircut while still clearing the 105% floor.

### 5.6 Expansion Event Mechanics

An Expansion Event is the deposit of additional reserve assets into the basket without a corresponding AXAU mint. The result:

```
Before expansion:
  R_total = R₀,  N = N₀,  BN₀ = R₀ / N₀

After expansion (added reserve ΔR, no new AXAU minted):
  R_total = R₀ + ΔR,  N = N₀
  BN₁ = (R₀ + ΔR) / N₀  >  BN₀   ✓ (holder-accretive)
```

Expansion Events require an AXM governance supermajority vote (>66%) and are subject to the 72-hour commodity admission timelock.

### 5.7 Mint Calculation

When a user deposits `tokenAmount` units of PAXG to mint AXAU:

```
mintNav_WAD    = backingNavPerAXAUWad × (1 + MINT_PREMIUM_BPS/10000)
axauToUser     = (tokenAmount_WAD × P_XAU_USD_WAD) / mintNav_WAD
                 × (1 − mintFeeBps / 10000)
```

At genesis (mintFeeBps = 0):
```
axauToUser = (tokenAmount_WAD × P_XAU_USD_WAD) / mintNav_WAD
```

**Genesis Mint (verified on-chain):**
- Input: 0.0013 PAXG
- XAU/USD Price: ~$3,075 (at time of mint)
- AXAU Received: 5.789977 AXAU
- Transaction: `0x73479447...` (Block 448396754, Arbitrum One)
- Governor action preceding mint: Set `haircutBps` 500 → 0 (TX: `0x115d2b7d...`)

### 5.8 Redeem Calculation

When a user redeems `axauAmount` AXAU for PAXG:

```
backingNav_WAD = backingNavPerAXAUWad
reserveToUser  = (axauAmount_WAD × backingNav_WAD) / P_XAU_USD_WAD
                 × (1 − redeemFeeBps / 10000)
```

At genesis (redeemFeeBps = 0), the user receives PAXG proportional to the current Backing NAV.

---

## 6. Data Infrastructure

### 6.1 Oracle Architecture

AXAU relies on Chainlink's professional-grade decentralized oracle network for all real-time commodity pricing.

**Primary Oracle — Chainlink XAU/USD:**
- Address: `0x1F954Dc24a49708C26E0C1777f16750B5C6d5a2c` (Arbitrum One)
- Update conditions: Deviation threshold ≥ 0.5% OR heartbeat ≥ 1 hour
- Decimals: 8
- Response format: `latestRoundData() → (roundId, answer, startedAt, updatedAt, answeredInRound)`
- Price = `answer / 1e8` (USD per troy ounce)

**Chainlink Staleness Handling:** The NAVEngine reads `updatedAt` from the round data. If the last update exceeds the staleness threshold, the oracle is treated as stale and mint operations pause automatically.

**Fallback Oracle Sequence (specified, not yet deployed):**
1. Primary: Chainlink XAU/USD on-chain
2. Secondary: Signed institutional data feed (permissioned)
3. Tertiary: Bounded TWAP with manipulation guards
4. Terminal: Component pause — XAU component disabled, existing supply redeemable at last confirmed NAV

**Land Oracle (Phase 3):**
The `LandNAVOracleMultiSig` contract uses a multi-party authorization model:
- M-of-N authorized signers (governance-set threshold)
- Monthly appraisal cadence
- Staleness flag raised automatically after 45 days without update
- Stale land value excluded from Backing NAV computation

### 6.2 Server-Side Contract Reads

The Axiom Protocol application server reads live AXAU system state via a server-side ethers.js service (`AXAUContractService`). All reads are performed against Arbitrum One mainnet via the Alchemy RPC endpoint.

**RPC Configuration:**
```
Primary:   https://arb-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}
Fallback:  https://arb1.arbitrum.io/rpc
```

**Parallel Read Pattern:** All contract reads are batched into a single `Promise.all()` call to minimize RPC round-trips. A full system state snapshot reads from 6 contracts simultaneously:
- AXAUTokenLite3643 (3 reads)
- NAVEngine (7 reads)
- MintRedeemController (6 reads)
- AXGoldVault (4 reads)
- AXLandVault (2 reads)
- Chainlink XAU/USD (1 read)

**Cache Policy:** The `/api/axau/nav` endpoint sets `Cache-Control: public, s-maxage=15, stale-while-revalidate=30` — data is at most 15 seconds stale for cached responses, with a 30-second stale-while-revalidate window.

### 6.3 PAXG Swap Pricing

The PAXG swap quote route (`/api/axau/paxg-quote`) uses the Uniswap V3 QuoterV2 to provide real-time swap quotes for ETH → PAXG and USDC → PAXG conversions.

**QuoterV2 Address:** `0x61fFE014bA17989E743c5F6cB21bF9697530B21e` (Arbitrum One)

**Active Fee Tiers (verified against on-chain liquidity, April 2026):**
- ETH/PAXG: 10000 bps (1%) — the only fee tier with meaningful liquidity
- USDC/PAXG: 3000 bps (0.3%)

Note: 0.05% and 0.3% ETH/PAXG pools exist but have zero liquidity as of the verification date. Using these pools would cause quote failures.

**Price Impact Calculation:**
```
Expected PAXG  = Input USD / Chainlink XAU/USD price
Actual PAXG    = QuoterV2 output
Price Impact % = (Expected − Actual) / Expected × 100
```

---

## 7. Mint and Redeem Mechanics

### 7.1 Mint Flow

```
User Wallet
    │
    ├─[1]─ Approve PAXG spending by MintRedeemController
    │       tx: paxg.approve(controller, amount)
    │
    ├─[2]─ Call MintRedeemController.mint(vaultId, tokenAmount)
    │       vaultId = keccak256("XAU") = 0x7c687a32...
    │       tokenAmount = PAXG amount in 18-decimal WAD
    │
    └─[3]─ Automatic on-chain execution:
            a. Controller calls NAVEngine.snapshot() for live NAV
            b. Coverage ratio check: if CR < 10500 bps → revert
            c. PAXG transferred from user to AXGoldVault
            d. AXAUTokenLite3643.mint(user, axauToUser) called
            e. Event emitted: Minted(user, vaultId, tokenAmount, axauToUser, mintNav)
```

**Pre-mint Checks (enforced on-chain):**
1. `mintPaused == false`
2. `isSolvent() == true` (coverage ≥ 105%)
3. PAXG allowance ≥ `tokenAmount`
4. User identity registered (ERC-3643 compliance check)

### 7.2 Redeem Flow

```
User Wallet
    │
    ├─[1]─ Call MintRedeemController.redeem(vaultId, axauAmount)
    │       vaultId = keccak256("XAU") = 0x7c687a32...
    │       axauAmount = AXAU to burn in 18-decimal WAD
    │
    └─[2]─ Automatic on-chain execution:
            a. Controller calls NAVEngine.backingNavPerAXAUWad() for live NAV
            b. AXAU burned from user wallet via AXAUTokenLite3643.burn()
            c. PAXG transferred from AXGoldVault to user at Backing NAV
            d. Event emitted: Redeemed(user, vaultId, axauAmount, paxgToUser, backingNav)
```

**Pre-redeem Checks (enforced on-chain):**
1. `redeemPaused == false`
2. AXAU balance ≥ `axauAmount`
3. AXGoldVault holds sufficient PAXG to cover redemption
4. User identity registered (ERC-3643 compliance check)

### 7.3 Quote API

Before committing to a transaction, users can obtain a binding quote via the `/api/axau/quote` endpoint:

```
GET /api/axau/quote?action=mint&amount=1.0&vaultId=0x7c687a32...
GET /api/axau/quote?action=redeem&amount=5.78&vaultId=0x7c687a32...
```

Quote responses include the exact `axauToUser` or `paxgToUser` amounts from the contract's `quoteMint()`/`quoteRedeem()` view functions — the same calculation that will be used in the actual transaction.

### 7.4 Fee Model

**Genesis Fee Configuration:**
- Mint Fee: 0 bps
- Redeem Fee: 0 bps

Fees are expressed in basis points and are deducted from the output amount (not the input). Fee revenue, when non-zero, is directed to the Axiom Protocol treasury address. The fee structure is adjustable by AXM governance within limits set by the governance parameter framework.

### 7.5 Coverage Circuit Breaker

The MintRedeemController implements an automatic coverage circuit breaker:

```
On every mint attempt:
  snapshot = NAVEngine.snapshot()
  if snapshot.coverageBps < COVERAGE_FLOOR_BPS (10500):
    revert("Coverage below floor — mint blocked")
```

This circuit breaker is entirely on-chain and does not require any off-chain action to activate. It cannot be bypassed by any administrative key.

Additionally, governance can manually pause minting via `mintPaused` (Guardian authority for immediate pause; governance vote for unpause). This emergency circuit breaker is designed for scenarios such as oracle manipulation detection or custodian attestation lapse.

---

## 8. Governance Framework

### 8.1 Governance Token

All AXAU governance is mediated through AXM, the Axiom Protocol ERC-20 governance token on Arbitrum One. AXM holders exercise voting authority over:
- Commodity admission and removal
- Parameter changes (haircuts, coverage floors, fees)
- Emergency actions (pauses, component freezes)
- Governance model evolution

AXM is not a reserve component of AXAU and does not contribute to Backing NAV.

### 8.2 Bootstrap Phase

During the Bootstrap Phase (current), Founder Operations retains operational authority over AXAU system parameters. The deployer address (`0x8d7892CF226B43d48B6e3ce988A1274e6D114C96`) holds `GOVERNOR_ROLE` on all seven contracts, enabling direct parameter adjustment without a full governance vote.

Governance transition to full AXM token-weighted voting is a planned milestone. The Bootstrap Phase is expected to last until the protocol has sufficient AXM distribution and liquidity to support meaningful decentralized governance.

### 8.3 Governance Parameters

| Parameter | Current Value | Governance Mechanism | Constraint |
|---|---|---|---|
| Coverage Ratio Floor | 105% | Governance vote | Cannot be lowered below 100% |
| XAU Haircut (haircutBps) | 0 bps | Governor | Requires NAVEngine redeploy to raise meaningfully |
| Land Haircut | 40% (specified) | Supermajority | Adjustable upward only |
| Max Land Sleeve Weight | 10% | Supermajority | Hard cap; supermajority to increase |
| Mint Fee | 0 bps | Governance vote | Upper limit TBD |
| Redeem Fee | 0 bps | Governance vote | Upper limit TBD |
| Governance Quorum | 15% of circulating AXM | Governance vote | Minimum participation threshold |
| Timelock — Parameter Change | 48 hours minimum | Governance vote | Can extend, not reduce |
| Timelock — Commodity Admission | 72 hours minimum | Governance vote | Applied to all additions |
| Pass Threshold — Parameters | Simple majority (>50%) | — | — |
| Pass Threshold — Commodity Add | Supermajority (>66%) | — | — |
| Emergency Guardian | 3-of-5 multi-party authorization | — | Pause only; cannot change parameters |

### 8.4 Commodity Admission Review Criteria

Any proposed commodity addition to the AXAU basket must satisfy all six admission criteria:

1. **Custody Attestability** — Reserve asset must be supported by regular third-party attestations from a qualified custodian. Self-reported or unverified reserves do not qualify.

2. **Oracle Reliability** — A live, redundant on-chain price feed must exist for the commodity (Chainlink primary or equivalent). Synthetic or admin-only oracles do not satisfy this requirement.

3. **Legal and Operational Readiness** — The commodity instrument must have a defined regulatory posture in relevant jurisdictions. Admission review includes legal assessment of commodity, securities, and transfer law implications.

4. **Non-Synthetic Backing** — Derivatives-based or synthetic commodity exposure does not qualify. Reserve instruments must represent direct claims on physical or tokenized physical assets.

5. **Solvency Stress Test** — The proposed component must pass a solvency stress test demonstrating that its addition does not reduce aggregate coverage below the minimum threshold under adverse scenarios.

6. **Liquidity Profile** — Risk tier, haircut, and maximum weight are set at admission based on liquidity profile. Illiquid components are subject to higher haircuts and basket weight caps.

### 8.5 Commodity Removal Procedure

A component may be removed or paused for the following reasons:
- Oracle failure or sustained staleness
- Custodian attestation lapse
- Regulatory action affecting the reserve asset
- AXM governance vote

**Removal Process:**
1. Emergency pause of mint against affected component (immediate, Guardian authority — 3-of-5 multi-party authorization)
2. Soft deprecation with rising haircut schedule (governance vote required)
3. Full removal and unwind procedure (supermajority vote, 72-hour timelock)

---

## 9. Risk Framework

### 9.1 Smart Contract Risk

**Current Status:** All 7 AXAU contracts are deployed on Arbitrum One mainnet. No independent third-party security audit has been completed. The contracts are in the bootstrap/proof-of-execution phase.

**Risk Controls:**
- All contracts verified on Arbitrum Blockscout (source code publicly readable)
- GOVERNOR_ROLE restricted to deployer address (single-admin bootstrap model)
- Emergency pause functionality available at Guardian authority level
- Coverage circuit breaker is fully automated and cannot be bypassed

**Risk Acknowledgment:** Participants engaging with AXAU during the bootstrap phase should be aware that unaudited smart contracts carry material risk of undiscovered vulnerabilities. The absence of an external audit is an explicitly acknowledged risk.

### 9.2 Oracle Risk

**Chainlink XAU/USD Oracle Risks:**
- Network congestion may delay oracle updates beyond the heartbeat
- Oracle manipulation via flash loans (mitigated by Chainlink's decentralized node network)
- Oracle downtime (covered by staleness detection and component pause)

**Land Oracle Risks:**
- Monthly cadence means land values may not reflect rapid market movements
- Multi-party authorization creates key management risk for oracle signers
- Appraisal methodology subject to human judgment and potential bias

### 9.3 Custody Risk

**PAXG/Paxos Risk:**
- Paxos Trust Company regulatory action (NYDFS charter)
- Brink's vault operational risk (physical gold custody)
- Smart contract risk in PAXG itself (separate from AXAU contracts)
- PAXG is not FDIC insured; gold is a commodity, not a bank deposit

**Land Custody Risk (Phase 3):**
- Real property title risk
- Jurisdiction-specific regulations on title transfer and digital representation
- Illiquidity — land cannot be sold instantly to meet redemptions

### 9.4 Market Risk

- **Gold Price Volatility:** The USD value of AXAU will fluctuate with gold market prices. AXAU is not a stablecoin and does not maintain a USD peg.
- **Arbitrum Network Risk:** All operations require the Arbitrum One network to be operational. Layer 2 sequencer downtime or censorship could temporarily prevent transactions.
- **Liquidity Risk:** PAXG liquidity on Arbitrum One DEXes may be insufficient for large mint/redeem operations. Users should check price impact before large transactions.

### 9.5 Regulatory Risk

- Commodity regulation applicable to gold-backed instruments may vary by jurisdiction
- Token classification (utility, security, commodity) is jurisdiction-dependent
- GENIUS Act alignment is by design intent, not legal determination
- Transfer restrictions under ERC-3643 may prevent certain wallet addresses from receiving AXAU

### 9.6 Concentration Risk

- Phase 1 reserve is 100% concentrated in a single asset (PAXG/gold)
- PAXG concentration in a single custodian (Paxos/Brink's)
- A single oracle (Chainlink XAU/USD) provides all Phase 1 pricing
- These concentration risks are acknowledged and addressed in the multi-phase reserve expansion roadmap

---

## 10. Audit and Compliance Roadmap

| Milestone | Status | Trigger Condition |
|---|---|---|
| Internal Specification Review | Active | In progress — this document |
| Automated Control Layer Deployment | Complete | Phase 1 contracts live on Arbitrum One |
| Genesis Mint Validation | Complete | Block 448396754, TX 0x73479447... |
| Ongoing Reserve Attestation | Planned | Upon first PAXG deposit into AXGoldVault |
| Independent Third-Party Security Audit | Deferred | Treasury threshold ~$50,000–$150,000 USD |
| Independent Legal and Regulatory Review | Deferred | Prior to external capital raising |
| Phase 2 Silver Governance Vote | Planned | Phase 1 deployment + AXM distribution |
| Full Token-Weighted Governance Transition | Planned | Sufficient AXM distribution and liquidity |

**Audit Firm Candidates (when treasury threshold met):**
OpenZeppelin Audits, Trail of Bits, Certik, Halborn, Sherlock (competitive audit)

**Audit Scope (planned):**
- All 7 AXAU automated control layer contracts
- Oracle integration and manipulation resistance
- Access control and multi-party authorization model
- Mint/redeem logic and coverage enforcement
- Emergency pause and recovery procedures

---

## 11. Protocol Integration

### 11.1 AXAU and AXUSD

AXAU is designed to complement AXUSD, Axiom Protocol's ERC-3643 compliant USD-pegged stablecoin. The two instruments serve distinct but complementary functions:

- **AXUSD** — Everyday settlement, payments, and on-chain financial rails
- **AXAU** — Long-term store of value, wealth preservation, commodity reserve exposure

**Integration Roadmap:**
- **Phase 1 (current):** AXAU held in the Axiom Protocol treasury is classified as a commodity reserve asset contributing to AXUSD reserve diversification (haircut-adjusted)
- **Phase 2 (planned):** AXAU may serve as collateral to mint AXUSD, with conservative LTV ratios and dynamic haircuts calibrated by component type. An allocation of AXAU could be deposited into the AXUSD collateral pool, with the protocol minting AXUSD against it at a conservative LTV.

### 11.2 AXAU and AXM

AXM governance token holders exercise voting authority over all AXAU parameters. AXM is not a reserve component of AXAU and does not contribute to Backing NAV. The relationship is governance-only: AXM holders set the rules; AXAU operates deterministically within those rules.

### 11.3 AXAU and the Physical-Digital Bridge (Land Pipeline)

Axiom's existing Land and Asset Registry and Physical-Digital Bridge infrastructure serves as the foundation for the Phase 3 land sleeve. Land titles acquired through the governance-approved acquisition pipeline are the primary candidates for AXLandVault deposits. The `AXLandVault` and `LandNAVOracleMultiSig` contracts are already deployed on Arbitrum One in anticipation of Phase 3 activation.

---

## 12. Operational Status

### 12.1 Current System State (as of April 2, 2026)

| Metric | Value |
|---|---|
| Phase | 1 — Gold Anchor |
| XAU/USD Price (Chainlink) | ~$4,676.58 |
| Total AXAU Supply | 5.7900 AXAU |
| Reserve Asset | PAXG (Paxos Gold, Arbitrum One) |
| Gold Reserve | ~0.0013 PAXG |
| Coverage Ratio | >105% (solvent) |
| Mint Status | Active |
| Redeem Status | Active |
| Land Sleeve | Inactive (lastNavTimestamp = 0) |
| External Audit | Not completed |

### 12.2 Genesis Transaction Record

| Event | Details |
|---|---|
| Governor Action | Set XAU haircutBps from 500 → 0 |
| Governor TX | `0x115d2b7d...` (Arbitrum One) |
| First Mint | 0.0013 PAXG → 5.789977 AXAU |
| Mint TX | `0x73479447...` |
| Block | 448396754 (Arbitrum One) |
| Date | April 2, 2026 |
| Minting Wallet | Deployer (`0x8d7892CF...D114C96`) |

### 12.3 Contract Verification Status

All 7 contracts are deployed and verified on Arbitrum Blockscout:
- Source code publicly readable at `arbitrum.blockscout.com/address/{address}`
- ABI available via Blockscout API for any third-party integration

---

## 13. Disclosures

1. **No External Audit:** No independent third-party security audit of AXAU automated control layers has been completed. External audit is a deferred milestone pending treasury development. Participants engage at their own risk.

2. **Not Investment Advice:** This specification document does not constitute an offer to sell or a solicitation to purchase any security, commodity, or digital asset. No investment advice is provided or implied.

3. **Not a Security (by Design):** AXAU is structured as a commodity reserve instrument. This characterization may differ across jurisdictions. Independent legal advice is required for each participant's jurisdiction.

4. **Gold Price Risk:** The USD value of AXAU will fluctuate with gold and other commodity market prices. Past performance of referenced commodities is not indicative of future performance.

5. **Smart Contract Risk:** AXAU contracts are unaudited software running on a public blockchain. Bugs, exploits, or unexpected interactions may result in partial or total loss of deposited assets.

6. **PAXG Counterparty Risk:** PAXG is issued by Paxos Trust Company. Regulatory action, operational failure, or insolvency of Paxos could impair PAXG redemption regardless of AXAU contract behavior.

7. **GENIUS Act Alignment:** AXAU is designed to align with the GENIUS Act framework and applicable digital asset regulatory guidance. This is a design intent, not a legal determination or compliance guarantee.

8. **Regulatory Uncertainty:** The regulatory classification of AXAU may vary across jurisdictions. Participants must obtain independent legal and tax advice for their specific jurisdiction before engaging.

9. **Land Sleeve Disclaimer:** Real property interests referenced in Phase 3 represent a targeted acquisition framework, not a claim of current ownership or guaranteed acquisition of specific parcels.

10. **Governance Changes:** Reserve haircuts, coverage floors, and governance parameters described herein are initial specifications subject to change through the governance process without prior notice.

11. **Independent Advice Required:** Participants should obtain independent legal, financial, and tax advice before participating in any AXAU-related activity.

---

## Appendix A — Deployed Contract Registry

**Network:** Arbitrum One  
**Chain ID:** 42161  
**Block Explorer:** https://arbitrum.blockscout.com

| Contract | Address | Status |
|---|---|---|
| AXAUTokenLite3643 | `0xbcCA4D937d427829914498423aE6E04C846dB0Bb` | Live |
| CommodityRegistry | `0x6D3aAa92793503B40b3F3593d2fCc409Ca610bDa` | Live |
| AXGoldVault | `0xaCc9BFf51AD291fc0c9003C6f8CC09BBa63C4CF8` | Live — holds PAXG |
| LandNAVOracleMultiSig | `0x8FF5D66d4be4C107362e63f8E9E8283E8c5EA0Fc` | Deployed — Inactive |
| AXLandVault | `0x66Aadce66a359609ec5E18fb3d8927a2363449cf` | Deployed — Inactive |
| NAVEngine | `0x80F8634a43B26a2bd403396A42465F138aeCC519` | Live |
| MintRedeemController | `0x036F05a3fB74d35439c074f25F691b36f5D37792` | Live |

**Supporting Addresses:**

| Reference | Address |
|---|---|
| PAXG Token (Arbitrum One) | `0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429` |
| Chainlink XAU/USD (Arbitrum) | `0x1F954Dc24a49708C26E0C1777f16750B5C6d5a2c` |
| Chainlink ETH/USD (Arbitrum) | `0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612` |
| Uniswap V3 QuoterV2 (Arbitrum) | `0x61fFE014bA17989E743c5F6cB21bF9697530B21e` |
| WETH (Arbitrum) | `0x82aF49447D8a07e3bd95BD0d56f35241523fBab1` |
| USDC (Arbitrum) | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| Deployer / GOVERNOR_ROLE | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` |

**Component IDs (keccak256):**

| Component | ID |
|---|---|
| XAU (Gold) | `0x7c687a3207cd9c05b4b11d8dd7ac337919c2200102d72989a597ebc5afcf180b` |
| LAND (Real Estate) | `0xb0366c216037e04ae0c0a5c253f7e5a16707d3697cf6669be968fc739da1fa87` |

---

## Appendix B — API Reference

All API endpoints are served by the Axiom Protocol Next.js application. Responses are JSON. All monetary values are strings formatted as decimal numbers.

### GET /api/axau/nav

Returns a full live system state snapshot read from Arbitrum One.

**Cache:** `public, s-maxage=15, stale-while-revalidate=30`

**Response:**
```json
{
  "totalSupply": "5789977000000000000",
  "totalSupplyFormatted": "5.7900",
  "tokenName": "Axiom Gold Reserve Unit",
  "tokenSymbol": "AXAU",
  "totalBackingUsd": "27138234567890000000",
  "totalBackingUsdFormatted": "27.14",
  "backingNavPerToken": "4.687123",
  "mintNavPerToken": "4.921479",
  "coverageRatioBps": 999999,
  "coverageRatioPct": "∞ (zero supply)",
  "isSolvent": true,
  "mintPaused": false,
  "redeemPaused": false,
  "mintFeeBps": 0,
  "redeemFeeBps": 0,
  "totalMinted": "5.7900",
  "totalRedeemed": "0.0000",
  "goldReserveAsset": "0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429",
  "goldTotalUnits": "0.001300",
  "goldFrozen": false,
  "goldValueUsd": "27.14",
  "landValueUsd": "0.00",
  "landStale": false,
  "landLastTimestamp": 0,
  "xauUsdPrice": "4,676.58",
  "fetchedAt": "2026-04-02T21:59:00.000Z"
}
```

### GET /api/axau/quote

Returns a binding mint or redeem quote from the MintRedeemController.

**Parameters:**
- `action` (required): `"mint"` or `"redeem"`
- `amount` (required): Amount as a decimal string (e.g. `"1.0"`)
- `vaultId` (optional): Component ID bytes32 string (defaults to XAU)

**Mint Response:**
```json
{
  "vaultId": "0x7c687a32...",
  "reserveAmount": "1.0",
  "axauOut": "203854000000000000000",
  "axauOutFormatted": "203.854000",
  "mintNavWad": "4921479000000000000",
  "mintNavFormatted": "4.921479",
  "mintPaused": false
}
```

**Redeem Response:**
```json
{
  "vaultId": "0x7c687a32...",
  "axauAmount": "5.789977",
  "reserveOut": "1299800000000000",
  "reserveOutFormatted": "0.001300",
  "backingNavWad": "4687123000000000000",
  "backingNavFormatted": "4.687123",
  "redeemPaused": false
}
```

### GET /api/axau/paxg-quote

Returns a real-time Uniswap V3 swap quote for ETH → PAXG or USDC → PAXG, with price impact calculation.

**Parameters:**
- `inputToken` (required): `"ETH"` or `"USDC"`
- `amount` (required): Amount as a decimal string

**Response:**
```json
{
  "amountOut": "1298765432100000000",
  "amountOutStr": "0.001299",
  "inputToken": "ETH",
  "amount": "0.003",
  "fee": 10000,
  "priceImpact": 0.12,
  "fairPaxg": "0.001301",
  "inputUsd": "11.42"
}
```

---

## Appendix C — System State Schema

The `AXAUSystemState` TypeScript interface defines the full system state object returned by `getAXAUSystemState()` and the `/api/axau/nav` endpoint.

```typescript
interface AXAUSystemState {
  // ── Token ──────────────────────────────────────────────────
  totalSupply:          string;   // Raw WAD string (18 dec)
  totalSupplyFormatted: string;   // Decimal display (4dp)
  tokenName:            string;   // "Axiom Gold Reserve Unit"
  tokenSymbol:          string;   // "AXAU"

  // ── NAV Engine ─────────────────────────────────────────────
  totalBackingUsd:           string;  // Raw WAD string
  totalBackingUsdFormatted:  string;  // Decimal display (2dp)
  backingNavPerToken:        string;  // USD per AXAU (6dp)
  mintNavPerToken:           string;  // USD per AXAU (6dp)
  coverageRatioBps:          number;  // bps integer
  coverageRatioPct:          string;  // Display string (e.g. "∞" or "110.50%")
  isSolvent:                 boolean; // true if CR ≥ 105% or supply = 0

  // ── Controller ─────────────────────────────────────────────
  mintPaused:    boolean;
  redeemPaused:  boolean;
  mintFeeBps:    number;  // integer bps
  redeemFeeBps:  number;  // integer bps
  totalMinted:   string;  // Decimal display (4dp) — cumulative
  totalRedeemed: string;  // Decimal display (4dp) — cumulative

  // ── Gold Vault ─────────────────────────────────────────────
  goldReserveAsset: string;  // PAXG contract address
  goldTotalUnits:   string;  // PAXG units (6dp)
  goldFrozen:       boolean;
  goldValueUsd:     string;  // USD value (2dp)

  // ── Land Vault ─────────────────────────────────────────────
  landValueUsd:      string;  // USD value (2dp) — 0 until Phase 3
  landStale:         boolean;
  landLastTimestamp: number;  // Unix timestamp — 0 until Phase 3

  // ── Oracle ─────────────────────────────────────────────────
  xauUsdPrice: string;  // USD (formatted with commas, 2dp)

  // ── Metadata ───────────────────────────────────────────────
  fetchedAt: string;  // ISO 8601 timestamp
}
```

**WAD Arithmetic Note:** All raw values with `WAD` suffix are 10^18-scaled integers returned as strings to avoid JavaScript `Number` precision loss. The `formatWad(wad, dp)` helper divides by 10^18 using bigint arithmetic, avoiding floating-point errors for large values.

---

## Appendix D — On-Chain Data Sources

All data displayed in the AXAU Live Reserve Dashboard is sourced exclusively from Arbitrum One mainnet with no off-chain modification.

| Data Point | Source Contract | Method | Notes |
|---|---|---|---|
| XAU/USD Price | Chainlink `0x1F954Dc...` | `latestRoundData()` | 8 decimals; heartbeat 1h |
| Total AXAU Supply | AXAUTokenLite3643 | `totalSupply()` | 18 decimals |
| Backing NAV / AXAU | NAVEngine | `backingNavPerAXAUWad()` | WAD |
| Mint NAV / AXAU | NAVEngine | `mintNavPerAXAUWad()` | WAD |
| Coverage Ratio | NAVEngine | `coverageRatioBps()` | bps |
| Solvency Flag | NAVEngine | `isSolvent()` | bool |
| Total Reserve USD | NAVEngine | `totalBackingUsdWad()` | WAD |
| Gold Component Value | NAVEngine | `componentValueUsdWad(XAU_ID)` | WAD |
| Gold Units Held | AXGoldVault | `goldSnapshot()` → units | 18-decimal |
| Gold Reserve Asset | AXGoldVault | `reserveAsset()` | PAXG address |
| Gold Vault Frozen | AXGoldVault | `vaultFrozen()` | bool |
| Land Value USD | AXLandVault | `landSnapshot()` → valueUsdWad | WAD |
| Land Staleness | AXLandVault | `landSnapshot()` → stale | bool |
| Land Last Update | AXLandVault | `lastNavTimestamp()` | Unix timestamp |
| Mint Paused | MintRedeemController | `mintPaused()` | bool |
| Redeem Paused | MintRedeemController | `redeemPaused()` | bool |
| Mint Fee | MintRedeemController | `mintFeeBps()` | bps |
| Redeem Fee | MintRedeemController | `redeemFeeBps()` | bps |
| Total Minted | MintRedeemController | `totalMinted()` | 18-decimal |
| Total Redeemed | MintRedeemController | `totalRedeemed()` | 18-decimal |

---

*AXAU White Paper v1.0.0 — Axiom Protocol — April 2, 2026*  
*This document is published as an institutional specification record. It does not constitute investment advice, a prospectus, or a regulatory filing.*
