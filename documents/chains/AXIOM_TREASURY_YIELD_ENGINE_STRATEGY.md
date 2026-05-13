# AXIOM PROTOCOL - TREASURY YIELD ENGINE

**Autonomous Multi-Chain Reserve Deployment Strategy**  
**Spec Version:** 1.0  
**Date:** 2026-05-12  
**Status:** Reference strategy document

## Overview

This document defines the architecture, rules, and implementation scope for the
Axiom Protocol Autonomous Treasury Yield Engine: a system that deploys idle
reserve assets across four chains to generate income for the Treasury and AXM
stakers, without relying on member activity or manual authorization.

Income flows two ways: back into reserves to compound backing strength, and into
the AXM staking rewards pool to give the governance token real, sustained
utility.

## Reserve assets in scope

- **USDC** - Stablecoin. Primary conservative deployment asset.
- **PAXG** - Gold-backed token. Deployed into gold lending markets.
- **XAUT** - Gold-backed token. Deployed alongside PAXG.
- **WBTC** - Wrapped Bitcoin. Moderate-risk lending and liquidity.
- **cbETH** - Liquid staked ETH. Already earns base staking yield passively.

## Chain deployment map

- **Arbitrum One** - Aave V3 (USDC, WBTC) + Camelot POL (cbETH)
- **Avalanche** - Benqi (USDC, WBTC) + gold lending (PAXG, XAUT)
- **Polygon** - Aave V3 (USDC, WBTC)
- **Sui** - Aftermath Finance (USDC, WBTC, PAXG, XAUT)

Each chain runs an independent rebalancer contract. A master Treasury Ledger
aggregates all positions into one view.

```text
Treasury Reserves
       |
       |-- Arbitrum One -- Aave V3 + Camelot POL
       |-- Avalanche    -- Benqi + gold lending
       |-- Polygon      -- Aave V3
       `-- Sui          -- Aftermath Finance
                |
         Yield Harvester (per chain)
                |
         +------+------+
      X% Reserves   Y% AXM Staking Pool
```

## Risk tiers

- **Conservative** - USDC lending on Aave V3 (Arbitrum, Polygon), Benqi
  (Avalanche)
- **Moderate** - WBTC lending, cbETH Camelot POL, Aftermath USDC/WBTC
- **Aggressive** - PAXG/XAUT gold lending, Aftermath PAXG/XAUT pools

## AXM staking reward mechanic

- AXM must be staked to receive yield. Unstaked AXM earns nothing.
- Minimum staking period: 30 days, revisable by governance vote.
- Yield accumulates in a reward pool contract on Arbitrum One.
- Stakers claim at any time; unclaimed yield stays in pool and compounds.
- Reward rate equals `(Y% of total harvested yield) / (total AXM staked)` per
  epoch.
- Staking reduces circulating supply and aligns holders with protocol health.
- Staking contract: to be deployed on Arbitrum One alongside the existing AXM
  token.

## Reserve ratio floor and regime gates

The rebalancer checks the coverage ratio before every action.

| Coverage / regime | Mode | Behavior |
| --- | --- | --- |
| Coverage above 150% | DEPLOY | Full yield engine active. All three risk tiers running. |
| Coverage 120%-150% | CONSERVE | Conservative tier only (USDC lending). Moderate and aggressive tiers paused. |
| Coverage below 120% | LOCKDOWN | All deployment paused. Yield stays in reserves. AXM staking rewards halted. |

### Sentinel override

If regime state is `STRESS` or `CRISIS`, `LOCKDOWN` triggers automatically
regardless of coverage ratio. Sentinel regime overrides coverage gates.

## Gas-thrifty rebalancer rules

The rebalancer executes only when all three conditions are true:

1. Rate differential between current and target protocol exceeds 0.75%
   annualized.
2. Projected yield gain from the move exceeds estimated gas cost by at least 3x.
3. Minimum 72 hours have elapsed since last rebalance on that chain.

These rules prevent thrashing, protect against gas cost erosion, and ensure every
rebalance is a net positive for the Treasury.

Rebalancer actions are logged on-chain and surfaced in the `/solvency` dashboard
for full transparency.

## Counterparty risk caps

Hard caps enforced by the rebalancer contract on every deployment:

- Max 30% of any single asset into one protocol.
- Max 40% of total reserves on any single chain.
- Max 20% of total reserves on Sui, as an early chain cap revisable by
  governance.

If a cap would be breached, the rebalancer deploys the remainder to the next
protocol in the priority queue rather than skipping the action.

Priority queue per chain, highest to lowest:

- **Arbitrum** - Aave V3, Camelot POL
- **Avalanche** - Benqi, gold lending market
- **Polygon** - Aave V3
- **Sui** - Aftermath Finance

## Insurance coverage

- **Provider:** Nexus Mutual smart contract cover
- **Funding:** 2%-3% of gross yield automatically routed before split
- **Scope:** All active protocol positions: Aave V3, Benqi, Aftermath, Camelot
- **Renewal:** Rolling, renewed automatically from yield before distribution
- **Payout:** If a covered protocol is exploited, claim payout routes directly
  to reserves, not to the AXM pool

Insurance is treated as a cost of operations, not discretionary. It executes
before the X%/Y% yield split is calculated.

## Yield flow

1. Yield harvested from each chain on configurable epoch schedule.
2. 2%-3% of gross yield routed to Nexus Mutual insurance renewal.
3. Remaining yield split: X% to reserves, Y% to AXM staking pool.
4. X% added to reserve backing, increasing coverage ratio.
5. Y% deposited into AXM staking reward pool on Arbitrum One.
6. Stakers claim from pool at any time.

Default split, adjustable by governance: 60% reserves / 40% AXM pool.

- During `CONSERVE`: 80% reserves / 20% AXM pool.
- During `LOCKDOWN`: 100% reserves / 0% AXM pool.

## `/solvency` page redesign

The current page shows a static coverage snapshot. The redesign adds a live
Treasury Intelligence layer beneath it.

### Existing sections retained

These move to the top as a summary strip:

- Coverage Ratio
- Regime State (`STABLE` / `CAUTION` / `STRESS` / `CRISIS`)
- Reserve Composition
- Liabilities
- Policy Mode + Gate Status

### New sections added

#### Deployed Positions

Table of all active yield positions across four chains.

Columns:

- Chain
- Protocol
- Asset
- Amount
- Current Rate
- Unrealized Yield

Updates on each page load via on-chain reads.

#### Yield Accrued (Current Epoch)

- Total harvested this epoch
- Breakdown: gross yield -> insurance cost -> reserves share -> AXM pool share
- Epoch start/end timestamps

#### Rebalancer Log

Last 10 rebalancer actions.

Columns:

- Date
- Chain
- From Protocol
- To Protocol
- Gas Cost
- Net Gain

Confirms every action was a net positive.

#### Insurance Coverage

Active Nexus Mutual positions.

Columns:

- Protocol
- Asset
- Coverage Amount
- Expiry
- Premium Paid

Status:

- Active
- Renewing
- Lapsed

#### AXM Reward Pool

- Current pool balance (AXUSD or ETH equivalent)
- Epoch yield rate, annualized estimate and labeled variable
- Total AXM staked
- Wallet-connected view: user's staked balance and claimable rewards

## Implementation phases

### Phase 1 - Arbitrum One foundation

- Deploy AXM staking contract.
- Integrate Aave V3 for USDC and WBTC.
- Integrate Camelot POL for cbETH.
- Deploy rebalancer contract with gas rules and coverage gates.
- Redesign `/solvency` with new Treasury Intelligence sections.
- Integrate Nexus Mutual cover for Aave V3.

### Phase 2 - Avalanche + Polygon

- Integrate Benqi on Avalanche.
- Integrate Aave V3 on Polygon.
- Extend rebalancer to cover both chains.
- Add Avalanche and Polygon positions to `/solvency` dashboard.
- Add Nexus Mutual cover for new protocols.

### Phase 3 - Sui + Aftermath Finance

- Integrate Aftermath Finance SDK.
- Deploy Sui-native rebalancer.
- Add Sui positions to `/solvency` dashboard.
- Apply 20% Sui cap in master rebalancer logic.
- Extend AXM reward pool to accept Sui yield, bridged or converted.

### Phase 4 - Governance Controls

- AXM holder vote to adjust X%/Y% yield split.
- AXM holder vote to adjust Sui allocation cap.
- AXM holder vote to adjust minimum staking period.
- Sentinel integration for automatic `LOCKDOWN` override.

## Constraints and guardrails

- No cross-chain rebalancing. Each chain rebalances within itself only.
- Cross-chain reserve moves require governance vote and time-lock.
- Rebalancer cannot exceed counterparty caps under any condition.
- Sentinel `STRESS` or `CRISIS` always overrides coverage ratio gates.
- Insurance renewal is non-discretionary and always funded before split.
- All rates are labeled variable. No APY guarantees in any user-facing copy.
- Sui allocation is capped at 20% until TVL depth is governance-reviewed.

## Success metrics

- Treasury yield earned per epoch, USD equivalent.
- Coverage ratio trend, increasing over time.
- Total AXM staked as percentage of circulating supply.
- Rebalancer efficiency: net gain per action after gas.
- Insurance coverage as percentage of deployed capital.
- Gas costs as percentage of gross yield, target below 5%.

## Glossary

| Term | Definition |
| --- | --- |
| Yield Engine | Automated capital deployment system |
| Rebalancer | Automated control layer for position management |
| Deployed Position | Capital allocated to an on-chain financial rail |
| Staking Pool | Participation lockup contract for AXM rewards |
| Coverage Ratio | Reserve backing as a percentage of liabilities |
| Regime State | Protocol health classification from `STABLE` to `CRISIS` |
| Epoch | Defined yield harvest and distribution interval |
| Insurance Renewal | Automated premium payment from gross yield |
