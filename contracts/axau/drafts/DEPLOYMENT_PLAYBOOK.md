# AXAG Silver Sleeve — Deployment Playbook

> For Path A (silver sleeve in AXAU). Complete all gates in README.md before starting.
> This playbook assumes deployment on Arbitrum One (same chain as live AXAU).
> If KAG is not available on Arbitrum One (KIN-02 gate), resolve the bridge/chain
> decision first — all steps below assume a KAG-compatible ERC-20 is live on Arbitrum.

---

## Pre-Deployment Checklist

- [ ] G-01 AXM governance vote passed and timelock elapsed
- [ ] G-02 Legal opinion delivered and reviewed
- [ ] G-03 KMS Labs ToS written confirmation in hand
- [ ] G-04 KAG ERC-20 address on Arbitrum One confirmed
- [ ] G-05 Audit complete, all critical/high findings remediated
- [ ] G-06 Reserve KAG balance staged in deployer wallet (minimum: target initial reserve)
- [ ] G-07 All 18 disclosure surfaces staged and ready to flip (single PR)
- [ ] Deployer wallet has sufficient ETH on Arbitrum for ~6 contract deployments + wiring txs

---

## Step 1 — Deploy XagPerGramOracle

```bash
npx hardhat run scripts/deploy-silver.ts --network arbitrumOne
# or deploy manually with:
#   constructor args:
#     underlyingFeed: 0x66a35534126b4B0845A2Aa03825B95dfaAA88A4F  (Chainlink XAG/USD, Arbitrum)
```

**Verify after deploy:**
- Call `gramPrice()` — should return ~USD per gram × 1e8 (e.g. if XAG=$28.50/toz → gramPrice ≈ 91_634_764)
- Call `decimals()` — must return 8
- Call `rawTroyOzPrice()` — should match Chainlink dashboard XAG/USD

**Record:** `XAGPERGRAM_ORACLE=<address>`

---

## Step 2 — Deploy AXSilverVault

```bash
#   constructor args:
#     governor: <Axiom Gnosis Safe address>
#     reserveAsset: <KAG ERC-20 address on Arbitrum One>
```

**Verify after deploy:**
- Call `reserveAsset()` — must be the KAG address
- Call `totalUnits()` — must be 0 (empty vault)
- Call `vaultFrozen()` — must be false

**Record:** `SILVER_VAULT=<address>`

---

## Step 3 — Register Silver Component in CommodityRegistry

Call `registerComponent()` on the existing live `CommodityRegistry` with:

```
ComponentConfig {
  vault:         <SILVER_VAULT>
  oracle:        <XAGPERGRAM_ORACLE>
  haircutBps:    800          // 8% — Tier 1 liquid commodity per spec
  isLiquid:      true
  symbol:        "XAG"
  oracleDecimals: 8
  assetDecimals:  18          // KAG is 18-decimal ERC-20
  phase:         2
}
```

**Verify after registration:**
- Call `getComponent("XAG")` on CommodityRegistry — returns the config above

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

---

## Step 7 — Flip Disclosure (Coordinated)

Merge the disclosure PR updating all 18 surfaces simultaneously:
- `pages/commodities/kag.tsx` — update Phase 2 roadmap status to ACTIVE
- `pages/axau.tsx` — update Silver Sleeve section status to LIVE
- `lib/axau/spec.ts` — update silver-xag status from GOVERNANCE_VOTE_REQUIRED → ACTIVE
- All other disclosure surfaces inventoried in AXAG research report

---

## Step 8 — Verification and Monitoring

- Verify all 4 new/updated contracts on Arbitrum Blockscout
- Add silver vault address to Axiom Solvency Console monitoring
- Confirm Chainlink XAG/USD oracle heartbeat is active (Arbitrum, 1h heartbeat)
- Alert on: silver vault balance change, oracle staleness, coverage ratio drop

---

## Rollback Plan

If any check fails after Step 5 (KAG deposited):
1. Freeze silver vault: `AXSilverVault.setVaultFrozen(true)`
2. Withdraw KAG from vault via controller: `withdrawToController(treasury, amount)`
3. Remove silver component from registry: `CommodityRegistry.removeComponent("XAG")`
4. Revert disclosure PR

No AXAU token holders are affected at any point — existing gold sleeve is untouched.
Minting and redemption of AXAU continue normally during silver vault rollback.
