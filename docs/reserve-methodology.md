# Axiom Protocol — AXUSD Reserve Methodology

**Version:** 1.0  
**Effective Date:** 2026-03-30  
**Maintained By:** Axiom Protocol Founder Operations  
**Document Status:** Canonical Reference

---

## 1. Purpose

This document describes the methodology used to compute, report, and audit AXUSD reserves. It defines how reserve pools are categorized, how the reserve ratio (RR) is calculated, what stress scenarios are modeled, and what on-chain sources of truth are used for each figure.

All solvency snapshots, treasury health panels, and disclosure documents derive their figures from the logic described here.

---

## 2. The AXUSD Reserve Hierarchy

AXUSD is a fully-backed, identity-gated stablecoin. Reserves are held across three segregated pools, each with a distinct role and risk profile.

| Pool | Address | Role | Status |
|------|---------|------|--------|
| Canonical PSM (ERC-3643) | `0xDB669bb6cA07215C5B055B62072AAED2F821E53F` | Primary reserve pool for Unified AXUSD. Identity-gated (ERC-3643). 10 bps mint/redeem fee. 1M AXUSD ceiling. | Live |
| Legacy GENIUS PSM | `0x5db58d9c21369d1532a48Bdd658E4Fe415404922` | USDC reserves from legacy GENIUS AXUSD epoch. Paired with deprecated GENIUS AXUSD. Still valid for solvency accounting. | Configured-Inactive |
| Backstop Vault (USDC) | `0x54438249457694eB5431811f3f19444Af0a01B29` | Emergency USDC reserve. 24h timelock on withdrawals. Covers tail redemption risk. | Live |

---

## 3. Reserve Ratio Formula

```
Reserve Ratio (RR) = Total USDC Reserves / Canonical AXUSD Total Supply × 100
```

Where:

```
Total USDC Reserves = Canonical PSM USDC Balance
                    + Legacy GENIUS PSM USDC Balance
                    + Backstop Vault USDC Balance
```

**Canonical AXUSD Total Supply** is read from the `totalSupply()` function on the ERC-3643 Unified AXUSD token at `0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7`.

Legacy GENIUS AXUSD and Euler AXUSD supplies are NOT included in the canonical supply figure. Those tokens are deprecated and their legacy PSM USDC reserves are retained as supplementary backstop.

---

## 4. PSM Utilization

The Canonical PSM tracks two utilization metrics:

```
Debt Outstanding (DO) = total AXUSD minted via Canonical PSM
Debt Ceiling (DC)     = 1,000,000 AXUSD (current cap)
Utilization (%)       = DO / DC × 100
Available Capacity    = DC - DO  (AXUSD units, 18 decimals)
Available Liquidity   = USDC balance held in Canonical PSM (6 decimals)
```

If `Utilization > 95%`, a ceiling increase must be proposed through Governance Safe (3-of-5) with a 24h Timelock delay.

---

## 5. Fees Accrued

The Canonical PSM charges symmetric fees on both mint and redeem:

- **Mint Fee:** 10 basis points (0.10%) applied to the USDC input amount
- **Redeem Fee:** 10 basis points (0.10%) applied to the AXUSD burn amount

All fees are denominated in USDC and accumulate in `feesAccrued`. The owner (Governance Safe) may call `sweepFees(recipient)` to transfer accrued fees. The `sweepFees` function is CEI-safe: state is cleared before the USDC transfer is executed.

---

## 6. Coverage Ratio (CR)

The Coverage Ratio is distinct from the Reserve Ratio and is used in solvency snapshots:

```
Coverage Ratio (CR) = Treasury Total Assets / Total Protocol Liabilities
```

Where:
- **Treasury Total Assets** = on-chain treasury USD value (computed by `/api/solvency/latest`)
- **Total Protocol Liabilities** = AXUSD outstanding + any off-chain obligations

A CR ≥ 1.0 (100%) indicates full coverage. The protocol targets CR ≥ 1.05 under normal operations.

---

## 7. Stress Testing Scenarios

Three canonical stress scenarios are modeled in `/api/axusd/treasury-health`:

| Scenario | Redemption Wave | Coverage Test |
|----------|----------------|---------------|
| S1 | 10% of AXUSD supply redeemed simultaneously | Reserves ≥ S1 redemption amount |
| S2 | 25% of AXUSD supply redeemed simultaneously | Reserves ≥ S2 redemption amount |
| S3 | 50% of AXUSD supply redeemed simultaneously | Reserves ≥ S3 redemption amount |

Post-scenario reserve ratios are computed assuming a pro-rata burn of AXUSD supply.

---

## 8. On-Chain Data Sources

All reserve figures are fetched live from Arbitrum One (Chain ID 42161) via Alchemy RPC.

| Metric | Contract | Function |
|--------|---------|---------|
| AXUSD Total Supply | `0xD6110F59...` | `totalSupply()` (18 decimals) |
| Canonical PSM USDC Balance | `0xDB669bb6...` | `balanceOf(CANONICAL_PSM)` on USDC (6 decimals) |
| Canonical PSM Liquidity | `0xDB669bb6...` | `availableLiquidity()` (6 decimals) |
| Canonical PSM Debt | `0xDB669bb6...` | `debtOutstanding()` (18 decimals) |
| Canonical PSM Fees | `0xDB669bb6...` | `feesAccrued()` (6 decimals) |
| Legacy PSM USDC Balance | `0x5db58d9c...` | `balanceOf(ACTIVE_PSM)` on USDC (6 decimals) |
| Backstop USDC Balance | `0x54438249...` | `balanceOf(BACKSTOP_VAULT)` on USDC (6 decimals) |

USDC on Arbitrum One: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`

---

## 9. Governance and Controls

| Control | Mechanism |
|---------|----------|
| Ceiling increase | Governance Safe (3-of-5) + 24h Timelock |
| Fee parameter changes | Governance Safe (3-of-5) + 24h Timelock |
| Pausing PSM | Governance Safe (3-of-5) `pause()` |
| Fee sweeps | Governance Safe `sweepFees(recipient)` |
| PSM ownership | Governance Safe `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d` |

The Canonical PSM uses an `owner`-only access model (OpenZeppelin `Ownable2Step`). Ownership transfer requires two transactions: `transferOwnership()` by current owner, then `acceptOwnership()` by the new owner. This prevents accidental ownership loss.

---

## 10. Identity Gating (ERC-3643)

The Canonical PSM enforces identity verification through the ERC-3643 Identity Registry before allowing any mint or redeem:

```solidity
require(identityRegistry.isVerified(msg.sender), "PSM: identity not verified");
```

Required claims:
- Topic 1: `KYC_VERIFIED`
- Topic 3: `SANCTIONS_CLEAR`

Wallets without a registered on-chain identity (ONCHAINID) will be rejected at the PSM level regardless of USDC balance.

---

## 11. Post-Deploy Steps Required

The following Governance Safe transactions must be executed before the Canonical PSM processes live volume:

1. **`axusd.addAgent(CANONICAL_PSM)`** — grants the PSM mint and burn authority on the ERC-3643 token
2. **`LendingPlatformModule.addPlatform(AXUSD, CANONICAL_PSM)`** — whitelists the PSM in the compliance module so PSM-to-wallet transfers pass the compliance check

Until these are executed, the PSM is deployed but cannot process mint or redeem operations.

---

## 12. Revision History

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-03-30 | Initial document. Canonical PSM deployed at `0xDB669bb6`. Slither audit: 0 findings on v2. |
