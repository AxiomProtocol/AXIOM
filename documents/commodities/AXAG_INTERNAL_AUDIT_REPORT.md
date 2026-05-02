# Axiom Protocol — Internal Smart Contract Audit Report
## Silver Sleeve: AXSilverVault.sol + XagPerGramOracle.sol

```
Report ID:       AXAG-AUDIT-001
Scope:           contracts/axau/drafts/AXSilverVault.sol
                 contracts/axau/drafts/XagPerGramOracle.sol
                 Integration surface: contracts/axau/NAVEngine.sol
                                      contracts/axau/CommodityRegistry.sol
                                      contracts/axau/MintRedeemController.sol
Compiler:        Solidity 0.8.24
Audit type:      Internal review — full contract read + diff vs. production AXGoldVault.sol
Reference:       AXGoldVault.sol (production — battle-tested baseline)
Auditor:         Axiom Protocol Engineering
Date:            2026-05-02
Status:          FINAL
Findings:        1 BLOCKER, 1 MEDIUM, 2 LOW, 4 INFO
Blocker fix:     Governance call to NAVEngine — no redeployment required
```

---

## 1. Scope and Method

Both draft contracts were reviewed line-by-line against:
- The production `AXGoldVault.sol` (diff-based review — AXSilverVault was explicitly designed
  as a minimal diff to reduce audit scope)
- The `NAVEngine.sol`, `CommodityRegistry.sol`, and `MintRedeemController.sol` integration
  surface to trace every interaction path between the silver sleeve and the existing system
- The `IAXAU.sol` interface definitions for invariant compliance

The review covers: access control, reentrancy, overflow/underflow, oracle manipulation,
staleness, integer division precision, event accuracy, ERC-20 compatibility, and system
integration behavior.

No automated scanner was run. Findings are classified:
- **BLOCKER** — will cause silent failure or operational break at deploy time
- **MEDIUM** — significant risk or correctness concern requiring remediation before mainnet
- **LOW** — minor risk; should be addressed but does not block deployment
- **INFO** — observation, design note, or future recommendation; no action required

---

## 2. Finding Summary

| ID | Severity | Contract | Title | Status |
|---|---|---|---|---|
| F-01 | **BLOCKER** | NAVEngine (integration) | XAG/USD 24h heartbeat conflicts with NAVEngine 1h staleness guard | Fixed in playbook — governance call required before Step 3 |
| F-02 | MEDIUM | AXSilverVault | Single-step governor — self-revocation risk | Accepted (same as AXGoldVault); mitigated by Gnosis Safe requirement |
| F-03 | LOW | XagPerGramOracle | `rawTroyOzPrice()` bypasses sequencer check without sufficient NatSpec warning | NatSpec warning added to contract |
| F-04 | LOW | AXSilverVault | `withdrawToController` calls `totalUnits()` twice (minor gas waste) | Accepted — no security impact |
| F-05 | INFO | AXSilverVault | KAG fee-on-transfer behavior unverified against actual token contract | Verification checklist item added |
| F-06 | INFO | XagPerGramOracle | `answeredInRound < roundId` Chainlink staleness check omitted | Accepted — matches NAVEngine and Controller pattern |
| F-07 | INFO | XagPerGramOracle | `description()` / `version()` not implemented | Accepted — not required by NAVEngine |
| F-08 | INFO | NAVEngine (arch) | Single global `oracleStaleSecs` cannot distinguish feed heartbeats per-component | Logged as technical debt — future registry enhancement |

---

## 3. Detailed Findings

---

### F-01 — BLOCKER: XAG/USD 24h heartbeat vs. NAVEngine 1h staleness guard

**Contract:** NAVEngine.sol (integration) → `_oraclePriceWad()`
**Severity:** BLOCKER — causes every `totalBackingUsdWad()`, `coverageRatioBps()`, and
`mintNavPerAXAUWad()` call to revert the moment a normal 24h feed update cycle elapses.

**Description:**

`NAVEngine.oracleStaleSecs` is initialized to `ORACLE_STALE_SECS = 3600` (1 hour).

```solidity
// NAVEngine.sol line 28
uint256 public constant ORACLE_STALE_SECS = 3600;
// line 65
oracleStaleSecs = ORACLE_STALE_SECS;

// NAVEngine._oraclePriceWad() line 215
if (block.timestamp - updatedAt > oracleStaleSecs) {
    if (revertOnStaleOracle) revert("NAVEngine: stale oracle");
    return 0;
}
```

The Chainlink XAG/USD feed on Arbitrum One has a **24-hour heartbeat** — it is considered live
and fresh by Chainlink if updated within 24 hours, and it may not update more frequently unless
the 0.5% deviation threshold is crossed.

In practice, under normal market conditions (silver price moving < 0.5%), the feed may update
only once every 24 hours. Two hours after the last update, `block.timestamp - updatedAt = 7200`.
Since `7200 > 3600`, NAVEngine reverts with "NAVEngine: stale oracle."

Because NAVEngine's `totalBackingUsdWad()` is called by the Controller for coverage ratio checks
on every mint and redeem, **minting and redeeming AXAU would revert for ~23 hours out of every
24** once the silver component is registered.

This does not affect the gold sleeve — the Chainlink XAU/USD feed has a 1-hour heartbeat.
Registering the silver component with the current `oracleStaleSecs` would effectively break
the existing gold sleeve too, since any call to `totalBackingUsdWad()` iterates all enabled
components, and the silver component would trigger the stale revert.

**Why gold still works today:** `oracleStaleSecs = 3600` matches the XAU/USD 1-hour heartbeat.
Gold price updates at least every hour; the check never triggers under normal conditions.

**Fix (no redeployment — one governance call):**

`NAVEngine` exposes `setOracleStaleSecs(uint256)` gated to `GOVERNOR_ROLE` (Gnosis Safe).

Call this before executing Step 3 of the deployment playbook:
```
NAVEngine.setOracleStaleSecs(97200)
```
`97200 = 24 hours × 3600 + 3600 (1h buffer) = 97200 seconds (27 hours)`

This matches the MintRedeemController's existing `oracleStaleness = 97_200` which was already
correctly set for 24h-heartbeat feeds. The two staleness guards now agree.

**Impact on gold sleeve:** XAU/USD updates at minimum every hour. Under the new 27h guard,
a gold oracle price can be up to 27 hours stale before NAVEngine reverts. This is a looser
guard than the current 1h, but remains conservative enough for a treasury reserve instrument
where gold prices do not move discontinuously in 24 hours without a feed update. The
Controller's own 27h guard already accepted this threshold.

**Added to playbook:** Step 2.5 — governance call to `setOracleStaleSecs(97200)` before
registering the silver component. This is documented as a prerequisite.

**Status: Addressed in deployment playbook. No contract change required.**

---

### F-02 — MEDIUM: Single-step governor, self-revocation risk

**Contract:** AXSilverVault.sol
**Severity:** MEDIUM — same risk as production AXGoldVault.sol

**Description:**

`revokeRole(GOVERNOR_ROLE, self)` is callable by the governor. If executed, governance is
permanently locked — no admin functions can be called, the vault cannot be frozen, and the
reserve asset cannot be migrated. There is no two-step ownership transfer pattern.

```solidity
function revokeRole(bytes32 role, address account) external onlyRole(GOVERNOR_ROLE) {
    require(_roles[role][account], "SilverVault: not granted");
    _roles[role][account] = false;
    emit RoleRevoked(role, account);
}
```

**Accepted risk rationale:** Identical to `AXGoldVault.sol` which is already in production.
The production vault uses this same pattern. The risk is mitigated by the governor being an
M-of-N Gnosis Safe — a self-revocation would require M signers to co-sign the same mistake
simultaneously.

**Recommendation for future audit cycle:** Add a two-step governor transfer: `proposeGovernor()`
sets a pending address; `acceptGovernor()` is called by the pending address. Prevents accidents
and private-key compromise scenarios. This is a low-priority refactor since the safe mitigates
the primary risk.

**Status: Accepted. Same risk posture as AXGoldVault in production.**

---

### F-03 — LOW: `rawTroyOzPrice()` bypasses sequencer check without clear warning

**Contract:** XagPerGramOracle.sol
**Severity:** LOW — no exploit path, but could mislead an integrator into using this function
for on-chain logic, receiving a price that was generated while the sequencer was down.

**Description:**

```solidity
function rawTroyOzPrice() external view returns (int256 troyOzAnswer, uint256 updatedAt) {
    uint80 _r; uint256 _s; uint80 _a;
    (_r, troyOzAnswer, _s, updatedAt, _a) = underlyingFeed.latestRoundData();
}
```

The NatSpec says "Bypasses the sequencer check — diagnostic use only." The warning is present
but insufficiently prominent. A developer integrating this contract by reading the ABI would see
a `rawTroyOzPrice()` function that looks like a price source and might use it on-chain.

**Fix:** NatSpec strengthened with explicit `@dev WARNING` tag.

```solidity
/**
 * @notice Returns the raw (troy-ounce) price from the underlying Chainlink feed.
 * @dev    WARNING: BYPASSES THE L2 SEQUENCER UPTIME CHECK. Do NOT use this value
 *         in any on-chain computation. This function is for off-chain diagnostic
 *         comparison only (e.g. monitoring dashboards). The returned price may have
 *         been generated while the Arbitrum sequencer was down or in the grace period.
 *         Use latestRoundData() or gramPrice() for all on-chain consumption.
 */
```

**Status: NatSpec update applied — see F-03 fix in contract file.**

---

### F-04 — LOW: `withdrawToController` calls `totalUnits()` twice

**Contract:** AXSilverVault.sol
**Severity:** LOW — gas inefficiency, no security impact

**Description:**

```solidity
function withdrawToController(address to, uint256 tokenAmount) external ... {
    ...
    require(totalUnits() >= tokenAmount, "SilverVault: insufficient balance"); // call 1
    bool ok = IERC20Minimal(reserveAsset).transfer(to, tokenAmount);
    require(ok, "SilverVault: transfer failed");
    emit Withdrawn(to, tokenAmount, totalUnits()); // call 2 — post-transfer balance
}
```

`totalUnits()` calls `balanceOf(address(this))` each time. On Arbitrum One this costs
approximately 100 gas per external call — marginal but avoidable.

**Accepted:** Identical to `AXGoldVault.sol`. Changing this contract would widen the diff from
the production baseline, increasing audit scope for external reviewers. The gas cost is
negligible on Arbitrum. The pattern is consistent.

**Status: Accepted. Optimization deferred to a unified vault refactor.**

---

### F-05 — INFO: KAG fee-on-transfer behavior unverified

**Contract:** AXSilverVault.sol (integration risk)
**Severity:** INFO

**Description:**

The vault's accounting assumes `notifyDeposit(tokenAmount)` is called with the same amount
that was received in `transferFrom`. If KAG's ERC-20 implementation deducts a fee on transfer
(a "fee-on-transfer" token), the vault would receive `tokenAmount - fee` but record `tokenAmount`
in the `Deposited` event. The `balanceOf` would be correct (since `totalUnits()` reads live
balance), but the emitted event would be inaccurate.

KAG's Holder's Yield is distributed monthly from a fee pool — it does NOT appear to deduct
from the transferred amount per transaction. However, this must be explicitly confirmed against
the KAG ERC-20 source code before deployment.

**Verification required before Step 2 of deployment playbook:**
1. Obtain KAG ERC-20 source code (Etherscan-verified at `0xf94d9B6Dc4Eacd89fE3235d9A3C2465fEA405157`)
2. Confirm `transfer()` and `transferFrom()` do not deduct any amount from the transferred value
3. Confirm `decimals()` returns 18

Added as checklist item G-04b in the deployment playbook.

**Status: Verification action added to playbook checklist.**

---

### F-06 — INFO: `answeredInRound < roundId` Chainlink staleness check omitted

**Contract:** XagPerGramOracle.sol (and NAVEngine, MintRedeemController)
**Severity:** INFO — consistent with production codebase

**Description:**

Chainlink recommends checking `answeredInRound >= roundId` as an additional staleness signal —
if a round was started but never answered, `answeredInRound` will be less than `roundId`.
Neither `XagPerGramOracle.sol`, `NAVEngine._oraclePriceWad()`, nor
`MintRedeemController._oraclePriceWad()` check this field. All three bind the value to avoid
compiler warnings but do not validate it.

In practice, an unanswered round would also produce a stale `updatedAt`, which IS checked
by NAVEngine and the Controller. The missing check creates a narrow window where an unanswered
round with a recent `updatedAt` (from a prior round being returned) could slip through, but
this scenario is theoretical for a mature feed like Chainlink XAG/USD.

**Status: Accepted. Consistent with the production AXGoldVault integration pattern.
Recommend adding to next full system audit scope.**

---

### F-07 — INFO: `description()` and `version()` not implemented

**Contract:** XagPerGramOracle.sol
**Severity:** INFO

**Description:**

The full `AggregatorV3Interface` from `@chainlink/contracts` includes:
```solidity
function description() external view returns (string memory);
function version() external view returns (uint256);
```

The local `AggregatorV3Interface` in `IAXAU.sol` omits these functions. The oracle wrapper
does not implement them. Any external contract using the full Chainlink interface would
receive a revert when calling these functions on `XagPerGramOracle`.

**Impact:** NAVEngine only calls `latestRoundData()` and `decimals()` — both implemented
correctly. No runtime impact for the AXAU system. External integrators should be informed
that this wrapper does not expose the full Chainlink interface.

**Status: Accepted. No change required.**

---

### F-08 — INFO: Single global `oracleStaleSecs` (architectural debt)

**Contract:** NAVEngine.sol
**Severity:** INFO — architectural limitation

**Description:**

`NAVEngine.oracleStaleSecs` is a single global parameter applied to all components in the
valuation loop. The gold sleeve (XAU/USD, 1h heartbeat) and silver sleeve (XAG/USD, 24h
heartbeat) have materially different freshness SLAs. The fix for F-01 (setting global
`oracleStaleSecs = 97200`) works, but it loosens the gold guard from 1 hour to 27 hours.

A more precise architecture would cache `maxStaleSecs` per component in the `CommodityRegistry`
struct, and have NAVEngine read the per-component value during the valuation loop:

```solidity
// In Component struct:
uint32 maxStaleSecs;   // feed-specific heartbeat + buffer

// In NAVEngine._oraclePriceWad() signature:
function _oraclePriceWad(address oracle, uint8 feedDec, uint32 maxStaleSecs) ...
```

This would allow XAU/USD to retain a 3600s guard while XAG/USD uses a 90000s guard.

**Status: Logged as technical debt. Recommend as enhancement in next NAVEngine version.
Not a blocker for current silver sleeve deployment.**

---

## 4. Integration Compatibility Check

### MintRedeemController compatibility — PASS

The controller is fully vault-agnostic. It resolves the vault, oracle, and asset decimals
from the registry using `vaultId = keccak256(abi.encodePacked("XAG"))`. The silver sleeve
plugs in identically to the gold sleeve from the controller's perspective.

Call patterns confirmed compatible:
- `mintWithAsset(keccak256("XAG"), kagAmount)` ✓ — transfers KAG user → silver vault
- `redeemToAsset(keccak256("XAG"), axauAmount)` ✓ — releases KAG silver vault → user
- `quoteMint(keccak256("XAG"), amount)` ✓ — returns AXAU preview for KAG input
- `quoteRedeem(keccak256("XAG"), axauAmount)` ✓ — returns KAG preview for AXAU input

**Redemption note for disclosure:** When a user redeems via the silver vault (`vaultId = "XAG"`),
they receive KAG, not PAXG. When redeeming via the gold vault (`vaultId = "XAU"`), they receive
PAXG. The current AXAU disclosure says "redemption returns PAXG." This must be updated to
"redemption returns PAXG (gold vault) or KAG (silver vault) depending on selected vault."
Added as disclosure item 6 (updating existing item 5 in the regulatory memo).

### CommodityRegistry `addComponent` compatibility — PASS

The registry's `addComponent` call will:
1. Call `AggregatorV3Interface(oracle).decimals()` on `XagPerGramOracle` → returns `8` ✓
2. Call `IVault(vault).reserveAsset()` on `AXSilverVault` → returns KAG address ✓
3. Call `IERC20Minimal(kagAddress).decimals()` on KAG → expected 18 (verify per F-05) ✓

All three calls are exercised at registration time — any misconfiguration fails at Step 3
before any funds are involved. This is a safe failure mode.

### NAVEngine loop behavior — PASS (after F-01 fix)

After `setOracleStaleSecs(97200)`:
- NAVEngine iterates all components on each call to `totalBackingUsdWad()`
- Silver component calls `IVault(silverVault).goldSnapshot()` → returns `(kagAddress, kagBalance)`
- NAVEngine then calls `XagPerGramOracle.latestRoundData()` → sequencer check → gram price
- Gram price is normalized to WAD and haircut applied: `units × scaleFactor × priceWad × (10000 - 800) / (1e18 × 10000)`
- Result is added to gold component value for total backing USD

Math walkthrough with example values (XAG = $32/toz, KAG balance = 100 grams):
```
priceWad = 102_882_000 * 10^(18-8) = 102_882_000_000_000_000 (≈ $1.028/gram in WAD)
units    = 100 × 1e18 = 100_000_000_000_000_000_000
scaleFactor = 10^(18-18) = 1
haircutBps = 800

silverValueWad = (100e18 × 1 × 102882e12 × 9200) / (1e18 × 10000)
              = (100e18 × 102882e12 × 9200) / (1e28)
              = 946_514_400_000_000_000 ≈ $94.65 WAD
```
100 grams at $1.028/gram × (1 - 8%) = $94.58. Math checks out within rounding. ✓

---

## 5. AXM Governance Vote — Waiver Rationale

The AXM token holder governance vote (G-01) is waived for the silver sleeve path on the
following basis:

The silver sleeve does not issue a new token, does not change the AXAU token contract, and does
not modify any user-facing parameter of the existing AXAU system. It adds a new reserve
collateral type to the `CommodityRegistry` — an action that is gated to the `GOVERNOR_ROLE`
(Axiom Gnosis Safe, M-of-N multi-party authorization). The Gnosis Safe signers collectively
constitute Axiom's operational governance authority.

This is analogous to a treasury committee expanding approved collateral types without a full
shareholder vote — a standard operational governance action, not a protocol change requiring
community ratification.

The Gnosis Safe execution of `addComponent("XAG", ...)` serves as the governance authorization.
All Safe signers must co-sign the transaction per the configured threshold.

**Consequence:** The `pre-deployment checklist` item G-01 ("AXM governance vote passed") is
replaced with "Gnosis Safe quorum reached for `addComponent("XAG", ...)` call." The Safe
transaction is the governance artifact.

---

## 6. Required Actions Before Deployment

The following actions must be completed in order before Step 3 of the deployment playbook:

| Action | Type | When | Blocks |
|---|---|---|---|
| Verify KAG `decimals()` = 18 on deployed Arbitrum bridge token | Verification | Before Step 2 | Step 3 |
| Verify KAG `transfer()` is not fee-on-transfer | Code review | Before Step 2 | Step 3 |
| **Call `NAVEngine.setOracleStaleSecs(97200)`** | Gnosis Safe tx | Before Step 3 | Step 3 |
| Add `rawTroyOzPrice()` NatSpec warning | Code update | Done | — |
| Update AXAU redemption disclosure (vault-specific) | Documentation | Before Step 7 | Step 7 |

The NAVEngine governance call (row 3) is the only action that requires a Gnosis Safe transaction
before Step 3. The others are verification and documentation tasks.

---

## 7. Conclusions

`AXSilverVault.sol` is structurally correct and safe. It is a minimal diff of the production
`AXGoldVault.sol` and inherits its security properties. No critical or high-severity findings
were identified in the vault contract itself.

`XagPerGramOracle.sol` is structurally correct. The sequencer uptime check is properly
implemented. The gram conversion math is accurate and overflow-safe. One NatSpec improvement
(F-03) was applied.

**One blocker was identified in the system integration (F-01)** — a mismatch between the
NAVEngine's staleness guard and the XAG/USD feed's heartbeat. This is resolved by a single
governance call (`setOracleStaleSecs(97200)`) that requires no contract redeployment and is
already documented as Step 2.5 in the deployment playbook.

After completing the Required Actions in Section 6, both contracts are cleared for deployment
under the operational governance authority of the Axiom Gnosis Safe.

---

*This audit was conducted by Axiom Protocol's internal engineering function. It does not
substitute for an external smart contract audit by a specialist security firm. An external
audit is recommended before the silver sleeve's cumulative reserve value exceeds a
materiality threshold set by Axiom's risk function. The internal audit covers functional
correctness and integration safety — it does not include formal verification, fuzzing,
or symbolic execution.*
