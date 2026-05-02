# AXAG Silver Sleeve — Deployment Playbook

> For Path A (silver sleeve in AXAU). Complete all gates in README.md before starting.
> This playbook assumes deployment on Arbitrum One (same chain as live AXAU).
>
> **KAG Bridge Path (active until KMS Labs native Arbitrum deployment):**
> KAG is live on Ethereum mainnet (`0xf94d9B6Dc4Eacd89fE3235d9A3C2465fEA405157`).
> Bridge to Arbitrum One using the official Arbitrum canonical bridge before Step 2.
> The bridged KAG is an arb-mapped ERC-20. When KMS Labs deploys native Arbitrum KAG
> (Kinesis 2.0 EVM expansion, in progress), migrate vault to native KAG at that time.

---

## Pre-Deployment Checklist

- [ ] G-01 Gnosis Safe quorum reached for `addComponent("XAG", ...)` call — replaces AXM token holder vote (waived for silver sleeve; see AXAG-AUDIT-001 § 5)
- [ ] G-02 Internal regulatory interpretation memo reviewed and accepted (AXAG-REG-MEMO-001) ✓ CLOSED
- [ ] G-03 KAG bridged from Ethereum mainnet to Arbitrum One via bridge.arbitrum.io — confirm bridged KAG balance in deployer wallet
- [ ] G-04a KAG arb-mapped ERC-20 address on Arbitrum One recorded (confirm via Arbiscan after bridge)
- [ ] G-04b KAG `decimals()` returns 18 and `transfer()` is not fee-on-transfer — verify on Etherscan source (see AXAG-AUDIT-001 F-05)
- [ ] G-05 Internal audit complete ✓ CLOSED — AXAG-AUDIT-001 (1 blocker remediated in playbook, 1 medium accepted, NatSpec fix applied)
- [ ] G-06 Reserve KAG balance staged in deployer wallet (minimum: target initial reserve)
- [ ] G-07 All disclosure surfaces staged and ready to flip (single PR, 6 items — 5 from AXAG-REG-MEMO-001 § 7 + redemption vault disclosure per AXAG-AUDIT-001 § 4)
- [ ] Deployer wallet has sufficient ETH on Arbitrum for ~6 contract deployments + wiring txs

---

## Step 0 — Bridge KAG from Ethereum to Arbitrum One

This step is required until KMS Labs deploys KAG natively on Arbitrum One.

**Bridge UI (manual):**
1. Go to `bridge.arbitrum.io`
2. Connect wallet holding KAG on Ethereum mainnet
3. Select token: KAG (`0xf94d9B6Dc4Eacd89fE3235d9A3C2465fEA405157`)
4. Enter amount to bridge (your full initial reserve allocation)
5. Confirm — deposit takes ~15–20 minutes to finalize on Arbitrum

**Programmatic bridge (using @arbitrum/sdk):**
```bash
npm install @arbitrum/sdk ethers
```
```js
const { Erc20Bridger, getArbitrumNetwork } = require("@arbitrum/sdk");
const { providers, Wallet, utils } = require("ethers");

const KAG_L1 = "0xf94d9B6Dc4Eacd89fE3235d9A3C2465fEA405157";
const AMOUNT  = utils.parseUnits("100", 18); // adjust to target reserve

const l1Provider = new providers.JsonRpcProvider(process.env.L1_RPC);
const l2Provider = new providers.JsonRpcProvider(process.env.L2_RPC);
const l1Signer   = new Wallet(process.env.PRIVATE_KEY, l1Provider);

const l2Network    = await getArbitrumNetwork(l2Provider);
const erc20Bridger = new Erc20Bridger(l2Network);

const approveTx = await erc20Bridger.approveToken({ l1Signer, erc20L1Address: KAG_L1 });
await approveTx.wait();

const depositTx = await erc20Bridger.deposit({ amount: AMOUNT, erc20L1Address: KAG_L1, l1Signer, l2Provider });
const receipt   = await depositTx.wait();
const l2Result  = await receipt.waitForL2(l2Provider); // ~15 min
console.log("Bridged KAG L2 address:", await erc20Bridger.getL2ERC20Address(KAG_L1, l1Provider));
```

**After bridging:**
- Record the arb-mapped KAG address returned by `getL2ERC20Address` — this is the `reserveAsset` for Step 2
- Verify balance on Arbiscan before proceeding

**Note on withdrawal delay:** Moving KAG back to Ethereum mainnet via the canonical bridge takes
7–8 days due to the Arbitrum challenge period. This must be disclosed in AXAU reserve documentation
(already covered in AXAG-REG-MEMO-001 § 7 item 2).

---

## Step 1 — Deploy XagPerGramOracle

```bash
npx hardhat run scripts/deploy-silver.ts --network arbitrumOne
# or deploy manually with constructor args:
#   underlyingFeed:      0xC56765f04B248394CF1619D20dB8082Edbfa75b1  (Chainlink XAG/USD, Arbitrum One)
#   sequencerUptimeFeed: 0xFdB631F5EE196F0ed6FAa767959853A9F217697D  (L2 Sequencer Uptime, Arbitrum One)
```

**Both addresses verified 2026-05-02 via docs.chain.link/data-feeds/price-feeds/addresses?network=arbitrum**

**Verify after deploy:**
- Call `sequencerIsLive()` — must return `true` before trusting any price
- Call `gramPrice()` — should return ~USD per gram × 1e8 (e.g. if XAG=$32.00/toz → gramPrice ≈ 102_875_000)
- Call `decimals()` — must return 8
- Call `rawTroyOzPrice()` — should match Chainlink dashboard XAG/USD at data.chain.link/feeds/arbitrum/mainnet/xag-usd

**Record:** `XAGPERGRAM_ORACLE=<deployed address>`

---

## Step 2 — Deploy AXSilverVault

```bash
#   constructor args:
#     governor:     <Axiom Gnosis Safe address>
#     reserveAsset: <KAG arb-mapped ERC-20 address from Step 0>
```

**Verify after deploy:**
- Call `reserveAsset()` — must be the bridged KAG address from Step 0
- Call `totalUnits()` — must be 0 (empty vault)
- Call `vaultFrozen()` — must be false

**Record:** `SILVER_VAULT=<deployed address>`

---

## Step 2.5 — Update NAVEngine Oracle Staleness Guard (REQUIRED — audit finding F-01)

**This step must be executed before Step 3. Skipping it will cause all AXAU minting and
redemption to revert after the first ~1 hour following silver component registration.**

**Why:** NAVEngine's global `oracleStaleSecs` is initialized to 3600s (1 hour). The Chainlink
XAG/USD feed has a 24-hour heartbeat. Under normal market conditions, the feed updates at most
once per 24 hours. After the first hour following a feed update, NAVEngine would revert on
every call to `totalBackingUsdWad()`, blocking all mint/redeem operations.

**Fix:** One Gnosis Safe transaction:
```
NAVEngine.setOracleStaleSecs(97200)
```
`97200 seconds = 24 hours + 1 hour buffer = 25 hours` (matches MintRedeemController's existing
`oracleStaleness = 97_200` which was already correctly set for 24h-heartbeat feeds).

**Verify after execution:**
- Call `NAVEngine.oracleStaleSecs()` — must return `97200`
- Call `NAVEngine.totalBackingUsdWad()` — must return a positive value (gold sleeve still priced)
- Confirm gold sleeve is still priced correctly after the staleness window change

**Note:** This change loosens the gold oracle guard from 1h to 25h. The XAU/USD feed has a
1-hour heartbeat and updates continuously — a 25-hour stale guard remains conservative for
a treasury reserve instrument where gold prices cannot move discontinuously for 24 hours
without a Chainlink update. The MintRedeemController already used 27h for this reason.
See AXAG-AUDIT-001 F-01 and F-08 for full analysis.

---

## Step 3 — Register Silver Component in CommodityRegistry

Call `addComponent()` on the existing live `CommodityRegistry`. Function signature:

```solidity
function addComponent(
    string  calldata sym,
    address vault,
    address oracle,
    uint256 haircutBps,
    uint256 maxWeightBps,
    bool    isLiquid,
    uint8   phase
) external onlyGovernor
```

Arguments for the silver sleeve:

```
sym:          "XAG"
vault:        <SILVER_VAULT>
oracle:       <XAGPERGRAM_ORACLE>
haircutBps:   800              // 8% — Tier 1 liquid commodity per spec
maxWeightBps: 3000             // 30% maximum weight per sleeve spec
isLiquid:     true
phase:        2
```

The registry will automatically call:
- `oracle.decimals()` → must return 8 ✓
- `vault.reserveAsset()` → returns bridged KAG address ✓
- `kagErc20.decimals()` → must return 18 (verify per G-04b) ✓

Any of these reverting means a misconfiguration exists — no funds are at risk; fix and retry.

**Verify after registration:**
- Call `getComponent(keccak256("XAG"))` on CommodityRegistry — all fields populated
- Call `componentCount()` — should increase by 1

---

## Step 4 — Grant CONTROLLER_ROLE to MintRedeemController on SilverVault

```solidity
AXSilverVault(SILVER_VAULT).grantRole(
    keccak256("CONTROLLER_ROLE"),
    <EXISTING_MINT_REDEEM_CONTROLLER_ADDRESS>
);
```

**Verify:**
- Call `hasRole(CONTROLLER_ROLE, controller)` on AXSilverVault — must return true

---

## Step 5 — Deposit Initial Reserve KAG

1. Approve MintRedeemController to spend KAG from deployer wallet:
   ```
   KAG.approve(MINT_REDEEM_CONTROLLER, initialReserveAmount)
   ```
2. Call the controller's deposit function — it executes `transferFrom(deployer, vault)`
   then `vault.notifyDeposit(amount)`.
3. Verify: `AXSilverVault.totalUnits()` should now equal `initialReserveAmount`.

---

## Step 6 — Verify NAVEngine Picks Up Silver Sleeve

- Call `NAVEngine.componentValueUsdWad("XAG")` — should return a positive USD value
- Call `NAVEngine.coverageRatio()` — coverage should have increased (more reserves)
- Compare `NAVEngine.backingNavPerToken()` before and after — should be higher
- Confirm silver weight does not exceed 30% of total NAV

---

## Step 7 — Flip Disclosure (Coordinated)

Merge the disclosure PR updating all surfaces simultaneously per AXAG-REG-MEMO-001 § 7:

- `pages/commodities/kag.tsx` — update Phase 2 roadmap status to ACTIVE
- `pages/axau.tsx` — update Silver Sleeve section status to LIVE; add 5 disclosure items
- `lib/axau/spec.ts` — update silver-xag status from IN_DESIGN → ACTIVE
- AXAU reserve documentation — add bridge risk disclosure, Holder's Yield treatment,
  volatility/haircut parameters, and redemption path note

---

## Step 8 — Verification and Monitoring

- Verify `XagPerGramOracle` and `AXSilverVault` on Arbiscan (submit source, check proxy if applicable)
- Add silver vault address to Axiom Solvency Console monitoring
- Confirm Chainlink XAG/USD oracle heartbeat is active — check `updatedAt` within 24h
- Confirm sequencer uptime feed is live — call `sequencerIsLive()` returns true
- Set alerts on: silver vault balance change > 5%, oracle staleness > 20h, coverage ratio drop > 3%, sequencer down event

---

## Rollback Plan

If any check fails after Step 5 (KAG deposited):
1. Freeze silver vault: `AXSilverVault.setVaultFrozen(true)`
2. Withdraw KAG from vault via controller: `withdrawToController(treasury, amount)`
3. Remove silver component from registry: `CommodityRegistry.removeComponent("XAG")`
4. Revert disclosure PR

No AXAU token holders are affected at any point — existing gold sleeve is untouched.
Minting and redemption of AXAU continue normally during silver vault rollback.
The bridged KAG balance remains in the treasury wallet and can be re-bridged to Ethereum
mainnet after the 7–8 day challenge period if needed.
