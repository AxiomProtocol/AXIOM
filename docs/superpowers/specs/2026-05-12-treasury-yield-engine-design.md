# Axiom Protocol — Treasury Yield Engine
**Autonomous Multi-Chain Reserve Deployment Strategy**
Spec Version: 1.0 | Date: 2026-05-12

---

## Overview

This document defines the architecture, rules, and implementation scope for the Axiom Protocol Autonomous Treasury Yield Engine — a system that deploys idle reserve assets across four chains to generate income for the Treasury and AXM stakers, without relying on member activity or manual authorization.

Income flows two ways: back into reserves to compound backing strength, and into the AXM staking rewards pool to give the governance token real, sustained utility.

---

## Reserve Assets in Scope

| Asset | Type | Deployment Role |
|---|---|---|
| USDC | Stablecoin | Primary conservative deployment asset |
| PAXG | Gold-backed token | Deployed into gold lending markets |
| XAUT | Gold-backed token | Deployed alongside PAXG |
| WBTC | Wrapped Bitcoin | Moderate-risk lending and liquidity |
| cbETH | Liquid staked ETH | Earns base staking yield passively |

---

## Chain Deployment Map

| Chain | Protocols | Assets |
|---|---|---|
| Arbitrum One | Aave V3, Camelot POL | USDC, WBTC, cbETH |
| Avalanche | Benqi, gold lending | USDC, WBTC, PAXG, XAUT |
| Polygon | Aave V3 | USDC, WBTC |
| Sui | Aftermath Finance | USDC, WBTC, PAXG, XAUT |

Each chain runs an independent rebalancer contract. A master Treasury Ledger aggregates all positions into a single view.

```
Treasury Reserves
       │
       ├── Arbitrum One ── Aave V3 + Camelot POL
       ├── Avalanche    ── Benqi + gold lending
       ├── Polygon      ── Aave V3
       └── Sui          ── Aftermath Finance
                │
         Yield Harvester (per chain)
                │
         ┌──────┴──────┐
      X% Reserves   Y% AXM Staking Pool
```

---

## Risk Tiers

| Tier | Assets / Protocols |
|---|---|
| Conservative | USDC lending on Aave V3 (Arbitrum, Polygon), Benqi (Avalanche) |
| Moderate | WBTC lending, cbETH Camelot POL, Aftermath USDC/WBTC |
| Aggressive | PAXG/XAUT gold lending, Aftermath PAXG/XAUT pools |

---

## AXM Staking Reward Mechanic

- AXM must be staked to receive yield. Unstaked AXM earns nothing.
- Minimum staking period: **30 days** (revisable by governance vote)
- Yield accumulates in a reward pool contract on Arbitrum One
- Stakers claim at any time — unclaimed yield stays in pool and compounds
- Reward rate = (Y% of total harvested yield) ÷ (total AXM staked) per epoch
- Staking reduces circulating supply and aligns holders with protocol health
- Staking contract: to be deployed on Arbitrum One alongside existing AXM token

---

## Reserve Ratio Floor + Regime Gates

The rebalancer checks the coverage ratio before every action.

| Coverage Ratio | State | Action |
|---|---|---|
| Above 150% | DEPLOY | Full yield engine active. All three risk tiers running. |
| 120%–150% | CONSERVE | Conservative tier only. Moderate and aggressive tiers paused. |
| Below 120% | LOCKDOWN | All deployment paused. Yield stays in reserves. AXM rewards halted. |

**Sentinel Override:** If regime state = STRESS or CRISIS, LOCKDOWN triggers automatically regardless of coverage ratio. Sentinel regime overrides all coverage gates.

---

## Gas-Thrifty Rebalancer Rules

The rebalancer executes only when **all three** conditions are true:

1. Rate differential between current and target protocol exceeds **0.75%** annualized
2. Projected yield gain from the move exceeds estimated gas cost by at least **3x**
3. Minimum **72 hours** have elapsed since the last rebalance on that chain

These rules prevent thrashing, protect against gas cost erosion, and ensure every rebalance is a net positive for the Treasury. All rebalancer actions are logged on-chain and surfaced in the `/solvency` dashboard.

---

## Counterparty Risk Caps

Hard caps enforced by the rebalancer contract on every deployment:

- Maximum **30%** of any single asset into one protocol
- Maximum **40%** of total reserves on any single chain
- Maximum **20%** of total reserves on Sui (early chain cap, revisable by governance)

If a cap would be breached, the rebalancer deploys the remainder to the next protocol in the priority queue rather than skipping the action.

**Priority queue per chain (highest to lowest):**

| Chain | Priority Order |
|---|---|
| Arbitrum | Aave V3 → Camelot POL |
| Avalanche | Benqi → gold lending market |
| Polygon | Aave V3 |
| Sui | Aftermath Finance |

---

## Insurance Coverage

| Parameter | Value |
|---|---|
| Provider | Nexus Mutual (smart contract cover) |
| Funding | 2–3% of gross yield, routed automatically before split |
| Scope | All active positions: Aave V3, Benqi, Aftermath, Camelot |
| Renewal | Rolling — renewed automatically from yield before distribution |
| Payout destination | Reserves only (not AXM pool) |

Insurance is treated as a cost of operations, not discretionary. It executes before the X%/Y% yield split is calculated.

---

## Yield Flow — Step by Step

```
Step 1   Yield harvested from each chain on configurable epoch schedule
Step 2   2–3% of gross yield routed to Nexus Mutual insurance renewal
Step 3   Remaining yield split: X% to reserves, Y% to AXM staking pool
Step 4   X% added to reserve backing — increases coverage ratio
Step 5   Y% deposited into AXM staking reward pool on Arbitrum One
Step 6   Stakers claim from pool at any time
```

**Default split (adjustable by governance):**

| Regime | Reserves | AXM Pool |
|---|---|---|
| DEPLOY (normal) | 60% | 40% |
| CONSERVE | 80% | 20% |
| LOCKDOWN | 100% | 0% |

---

## /solvency Page Redesign

The current page shows a static coverage snapshot. The redesign adds a live Treasury Intelligence layer beneath it.

### Existing Sections (retained, moved to top as summary strip)
- Coverage Ratio
- Regime State (STABLE / CAUTION / STRESS / CRISIS)
- Reserve Composition
- Liabilities
- Policy Mode + Gate Status

### New Sections Added

**Deployed Positions**
Table of all active yield positions across 4 chains.
Columns: Chain | Protocol | Asset | Amount | Current Rate | Unrealized Yield
Updates on each page load via on-chain reads.

**Yield Accrued (Current Epoch)**
Total harvested this epoch with breakdown:
Gross yield → Insurance cost → Reserves share → AXM pool share
Epoch start/end timestamps shown.

**Rebalancer Log**
Last 10 rebalancer actions.
Columns: Date | Chain | From Protocol | To Protocol | Gas Cost | Net Gain
Confirms every action was a net positive.

**Insurance Coverage**
Active Nexus Mutual positions.
Columns: Protocol | Asset | Coverage Amount | Expiry | Premium Paid
Status: Active / Renewing / Lapsed

**AXM Reward Pool**
Current pool balance (AXUSD or ETH equivalent)
Epoch yield rate (annualized estimate — labeled Variable)
Total AXM staked
Wallet-connected view: your staked balance + claimable rewards

---

## Implementation Phases

### Phase 1 — Arbitrum One (Foundation)
- Deploy AXM staking contract
- Integrate Aave V3 for USDC + WBTC
- Integrate Camelot POL for cbETH
- Deploy rebalancer contract with gas rules and coverage gates
- Redesign `/solvency` with new Treasury Intelligence sections
- Integrate Nexus Mutual cover for Aave V3

### Phase 2 — Avalanche + Polygon
- Integrate Benqi on Avalanche
- Integrate Aave V3 on Polygon
- Extend rebalancer to cover both chains
- Add Avalanche and Polygon positions to `/solvency` dashboard
- Add Nexus Mutual cover for new protocols

### Phase 3 — Sui + Aftermath Finance
- Integrate Aftermath Finance SDK
- Deploy Sui-native rebalancer
- Add Sui positions to `/solvency` dashboard
- Apply 20% Sui cap in master rebalancer logic
- Extend AXM reward pool to accept Sui yield (bridged or converted)

### Phase 4 — Governance Controls
- AXM holder vote to adjust X%/Y% yield split
- AXM holder vote to adjust Sui allocation cap
- AXM holder vote to adjust minimum staking period
- Sentinel integration for automatic LOCKDOWN override

---

## Constraints + Guardrails

- No cross-chain rebalancing. Each chain rebalances within itself only.
- Cross-chain reserve moves require governance vote + time-lock.
- Rebalancer cannot exceed counterparty caps under any condition.
- Sentinel STRESS or CRISIS always overrides coverage ratio gates.
- Insurance renewal is non-discretionary — always funded before yield split.
- All rates labeled Variable. No APY guarantees in any user-facing copy.
- Sui allocation capped at 20% until TVL depth is governance-reviewed.

---

## Success Metrics

| Metric | Target |
|---|---|
| Treasury yield per epoch | Increasing quarter over quarter |
| Coverage ratio trend | Increasing over time |
| Total AXM staked | Growing as % of circulating supply |
| Rebalancer efficiency | Net gain per action after gas |
| Insurance coverage | % of deployed capital covered |
| Gas costs as % of gross yield | Below 5% |

---

## Glossary (Institutional Vocabulary)

| Term | Definition |
|---|---|
| Yield Engine | Automated capital deployment system |
| Rebalancer | Automated control layer for position management |
| Deployed Position | Capital allocated to an on-chain financial rail |
| Staking Pool | Participation lockup contract for AXM rewards |
| Coverage Ratio | Reserve backing as a percentage of liabilities |
| Regime State | Protocol health classification (STABLE to CRISIS) |
| Epoch | Defined yield harvest and distribution interval |
| Insurance Renewal | Automated premium payment from gross yield |
