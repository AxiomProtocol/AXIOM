# AxiomTreasuryVault — Executive Summary & Technical Reference

**Axiom Protocol — Operator Capital Management**
Network: Arbitrum One (Chain ID 42161)
Classification: Internal — Operator Distribution
Standard: ERC-4626

---

## Executive Summary

The AxiomTreasuryVault is Axiom Protocol's on-chain capital management infrastructure deployed on Arbitrum One. It functions as an ERC-4626 compliant multi-strategy vault that accepts USDC and AXUSD deposits, deploys capital across a curated set of yield-generating strategies, and harvests accumulated yield on an automated 6-hour schedule.

The vault is governed by a role-based access control system (OpenZeppelin AccessControl), operated by the Axiom Protocol team, and observable in real time through the Operator Capital Management console. All strategy adapters implement a common `IStrategy` interface, enabling uniform allocation, withdrawal, and harvest mechanics across heterogeneous protocols.

| | |
|---|---|
| Active Strategies | 5 |
| Harvest Cadence | Every 6 hours UTC |
| Settlement Chain | Arbitrum One |
| Vault Standard | ERC-4626 |
| Identity Standard | ERC-3643 (T-REX) for AXUSD |

---

## System Architecture

The vault stack consists of three coordinated layers:

1. **The Vault** — ERC-4626 share accounting (deposit, withdraw, totalAssets)
2. **The Strategy Manager** — strategy registry and routing (strategyInfo, totalDeployed)
3. **Strategy Adapters** — protocol-specific IStrategy implementations (allocate, withdraw, harvest)

```
Depositor (USDC / AXUSD)
        │
        ▼
┌─────────────────────────────────────────┐
│         AxiomTreasuryVault              │  ERC-4626 · OpenZeppelin AccessControl
│  totalAssets() · deposit() · withdraw() │  Arbitrum One
└────────────────────┬────────────────────┘
                     │ allocate() / withdraw()
                     ▼
┌─────────────────────────────────────────┐
│           StrategyManager               │  Registry · strategyInfo() · totalDeployed()
└──┬──────┬──────┬──────┬────────────────┘
   │      │      │      │            │
   ▼      ▼      ▼      ▼            ▼
 AaveV3  Camelot Euler  Euler       Euler
 Strat   Strat   USDC   thBILL      WETH
                 Strat  Strat       Strat
   │      │      │      │            │
   ▼      ▼      ▼      ▼            ▼
 Aave   Camelot  Euler ERC-4626   Euler ERC-4626
 Pool   AMM      Vaults            Vaults
```

All yield flows upward through `harvest()`. The vault holds idle balances; deployed capital lives in external protocol contracts tracked by the Strategy Manager.

---

## On-Chain Contract Registry

| Contract | Address |
|---|---|
| AxiomTreasuryVault | `0x8c9761D465CB95306266a68FF8935C4690EC6092` |
| StrategyManager | `0x432dFEe1DAb2D7d423690819DC65C033FE266E8e` |
| AXUSD (ERC-3643) | `0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7` |
| USDC (native Arbitrum) | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| Network | Arbitrum One · Chain ID 42161 |
| Role Framework | OpenZeppelin AccessControl v5 |
| Reentrancy Guard | OpenZeppelin ReentrancyGuard v5 |
| Safe Token Transfers | OpenZeppelin SafeERC20 v5 |

Arbiscan: https://arbiscan.io/address/0x8c9761D465CB95306266a68FF8935C4690EC6092

---

## Strategy Stack

Each strategy adapter is a standalone smart contract implementing the `IStrategy` interface. The interface exposes `allocate()`, `withdraw()`, `harvest()`, `currentValue()`, and `emergencyWithdraw()` uniformly across all protocols.

---

### Strategy 1 — Aave V3 USDC Supply Market

| | |
|---|---|
| Protocol | Aave V3 |
| Strategy Contract | `0x7d500015C5765456C16Ce2CF38AAF14075C01DD4` |
| Underlying Asset | USDC |
| APY Estimate | Variable (live on-chain) |
| Status | Active |
| Notes | Primary liquidity reserve. Deepest liquidity on Arbitrum. Governed by Aave DAO. Instant withdrawal up to available pool liquidity. |

---

### Strategy 2 — Camelot AMM Liquidity Position

| | |
|---|---|
| Protocol | Camelot DEX |
| Strategy Contract | `0x511441D31e629d7513004a692c2dB67438151696` |
| Underlying Asset | USDC / AXUSD |
| APY Estimate | Variable (fee-based) |
| Status | Active |
| Notes | Native Arbitrum AMM. Provides AXUSD/USDC liquidity and fee income. Withdrawals subject to slippage. |

---

### Strategy 3 — Euler v2 USDC Theo Market

| | |
|---|---|
| Protocol | Euler Finance v2 |
| Strategy Contract | `0x82cBB154e1684C4720c9f5fF16E685F2de28Bd68` |
| Euler Vault | `0x05d28A86E057364F6ad1a88944297E58Fc6160b3` |
| Underlying Asset | USDC |
| APY Estimate | ~13.11% |
| Status | Active |
| Notes | ERC-4626 Euler vault. Higher base yield on idle USDC relative to Aave. |

---

### Strategy 4 — Euler v2 thBILL Theo Market

| | |
|---|---|
| Protocol | Euler Finance v2 |
| Strategy Contract | `0x6CBF5Bf949166AaDD439bDd410eDF5FC55Ee9215` |
| Euler Vault | `0x79e1F4a1Cde92568D58EB823f81D9c0C7C384e6b` |
| Underlying Asset | thBILL |
| APY Estimate | ~15.31% |
| Status | Active |
| Notes | T-bill backed yield instrument. Combines RWA Treasury bill exposure with on-chain lending premium. |

---

### Strategy 5 — Euler v2 WETH Arbitrum Market

| | |
|---|---|
| Protocol | Euler Finance v2 |
| Strategy Contract | `0x7a4f0A3290e7152779FCf00eB32183Cb1E0E1211` |
| Euler Vault | `0x78E3E051D32157AACD550fBB78458762d8f7edFF` |
| Underlying Asset | WETH |
| APY Estimate | ~15.98% |
| Status | Active |
| Notes | Highest-yield position. ETH-denominated. ETH/USD price exposure — monitor as % of total AUM. |

---

## Accepted Asset Framework

The vault maintains an on-chain `acceptedAssets` mapping. Only assets explicitly approved via `setAcceptedAsset()` by a VAULT_ADMIN may be deposited or allocated. This prevents unauthorized token injection.

| Asset | Decimals | Status | Notes |
|---|---|---|---|
| USDC (native Arbitrum) | 6 | Accepted | Primary settlement asset. Circle-issued. |
| AXUSD (ERC-3643) | 18 | Accepted | Axiom stablecoin. KYC-gated transfers via T-REX. |
| thBILL | 6 | Accepted | T-bill backed token. Accepted for Euler thBILL allocation. |
| WETH | 18 | Accepted | Wrapped ETH. Accepted for Euler WETH market allocation. |

---

## Yield Harvest Mechanics

Yield is realized through the `harvest()` function on each strategy adapter. Harvest calls are gated by a minimum threshold (default $0.50 USDC, configurable via `HARVEST_MIN_USDC`) to prevent uneconomical gas spend.

| | |
|---|---|
| Schedule | Every 6 hours UTC — 00:00 / 06:00 / 12:00 / 18:00 |
| Executor | Cron service holding CRON_HARVESTER role |
| Cron Endpoint | POST /api/cron/harvest-vault (CRON_SECRET gated) |
| Min Threshold | $0.50 USDC per harvest event (env: HARVEST_MIN_USDC) |
| Yield Destination | Returned to vault as idle USDC — increases NAV per share |
| DB Record | treasury_vault_events (type: harvest) + harvest_cron_runs |
| Failure Handling | Cron logs error, sets status=failed in harvest_cron_runs. Non-blocking — next run retries automatically. |

---

## Access Control & Roles

All privileged functions are gated via OpenZeppelin `AccessControl`. No single-owner pattern — role separation enables independent revocation without full admin surrender.

| Role | Current Holder | Capability |
|---|---|---|
| DEFAULT_ADMIN_ROLE | Deployer EOA | Grant / revoke all roles. Upgrade contracts. |
| VAULT_ADMIN | Deployer EOA | Pause vault. Set accepted assets. Update fee parameters. |
| STRATEGY_ADMIN | Deployer EOA | Register strategies. Trigger allocate / withdraw / harvest on each IStrategy adapter. |
| CRON_HARVESTER | Cron service | Call harvest() on a 6-hour UTC schedule. |
| OPERATOR_ROLE | Operator UI | Read-only access to VaultSummary, event history, and income reports. |

> **Role Concentration Note:** DEFAULT_ADMIN_ROLE, VAULT_ADMIN, and STRATEGY_ADMIN are currently held by the same deployer EOA. A multi-party authorization upgrade is planned — distributing these roles across a threshold-signature arrangement (Gnosis Safe or equivalent).

---

## Risk & Custody Framework

### Protocol Risk
Capital deployed to Aave V3, Camelot, and Euler Finance is subject to smart contract risk inherent to those protocols. Aave V3 and Euler Finance v2 are audited, battle-tested protocols. Position limits per strategy are enforceable via STRATEGY_ADMIN allocation caps.

### Asset Risk — thBILL
thBILL is a tokenized T-bill instrument backed by short-duration U.S. Treasury bills. Credit risk is minimal but not zero; liquidity risk exists in stressed redemption scenarios. The Euler thBILL vault adds an additional smart contract layer.

### Asset Risk — WETH
WETH positions introduce ETH/USD price exposure. The Euler WETH market yield is denominated in WETH; USD-equivalent AUM fluctuates with ETH price. Operators should monitor ETH allocation as a percentage of total AUM.

### Custody
All vault assets are held in non-custodial smart contracts on Arbitrum One. No third-party custodian holds assets on behalf of the vault. BitGo CaaS is used for off-chain treasury reserves (outside this vault contract). The vault has no upgradeability proxy — it is an immutable deployment.

### Liquidity Risk
Idle USDC and AXUSD remain immediately withdrawable. Deployed capital is subject to withdrawal mechanics of each underlying protocol. Aave and Euler markets support instant withdrawal up to available liquidity. Camelot AMM withdrawals are subject to slippage.

### Oracle Risk
Vault AUM reporting relies on on-chain `currentValue()` reads from each strategy adapter. These reads query underlying ERC-4626 `convertToAssets()` functions, subject to the pricing logic of each protocol. No external price oracle is used for accounting.

---

## Security & Audit Status

| | |
|---|---|
| SAST Scan | 0 findings on EulerV2Strategy.sol, AaveV3Strategy.sol, AxiomTreasuryVault.sol |
| Dependency Audit | 0 critical CVEs in treasury contract dependency path |
| Reentrancy | OpenZeppelin ReentrancyGuard on all state-changing functions |
| Arithmetic | Solidity 0.8.x built-in overflow protection (no unchecked blocks) |
| Token Safety | SafeERC20.forceApprove() before every external deposit |
| Asset Integrity | Constructor validates eulerVault.asset() == _asset at deploy time |
| Zero-Address Checks | All 4 constructor params validated against address(0) |
| On-Chain Verification | All 3 Euler strategies verified post-deployment: active=true, correct vault, correct asset, registered in StrategyManager |
| External Audit | Pending — scheduled before allocation scale-up |

---

## Operational Procedures

### Allocating Capital to a Strategy
1. Ensure target asset is in the `acceptedAssets` mapping — call `setAcceptedAsset(asset, true)` if not.
2. Verify idle balance is sufficient via `getIdleBalance(asset)`.
3. Call `vault.allocate(strategyAddr, asset, amount)` from a STRATEGY_ADMIN wallet.
4. Confirm via StrategyManager `strategyInfo(strategyAddr).allocatedPrincipal`.

### Emergency Withdrawal
1. Call `vault.pause()` (VAULT_ADMIN) to halt new deposits and allocations.
2. Call `strategy.emergencyWithdraw()` (DEFAULT_ADMIN_ROLE) on each strategy — bypasses threshold checks, returns all assets to vault.
3. Once resolved, call `vault.unpause()` to resume normal operations.

### Adding a New Strategy
1. Deploy a new contract implementing `IStrategy` (use EulerV2Strategy as template for ERC-4626 protocols).
2. Call `vault.addStrategy(strategyAddr)` from STRATEGY_ADMIN — registers in StrategyManager.
3. Call `setAcceptedAsset(asset, true)` for the strategy's underlying asset if not already accepted.
4. Add strategy constants and APY fetch to `lib/treasury/vault/vaultService.ts` and update the operator dashboard.

---

*Axiom Protocol — AxiomTreasuryVault — Arbitrum One*
*`0x8c9761D465CB95306266a68FF8935C4690EC6092`*
