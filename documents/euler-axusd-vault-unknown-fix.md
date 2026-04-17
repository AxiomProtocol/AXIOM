# AXUSD Euler V2 Vault — "Unknown" Metadata Fix

**Vault:** `eAXUSD-6` at `0xacdA87801f6409bB5157BA78aF1BD9631d6609B2` (Arbitrum One)
**Status (audit, 2026-04-17):** Vault type **Unknown**, Risk manager **Unknown**.
**Fix path:** Redeploy with the new canonical script.  No on-chain transactions
were executed against the existing vault during this task.

---

## 1. Root cause (in plain English)

The Euler V2 UI labels each vault by walking a fixed set of "perspective"
contracts and asking each one `isVerified(vault)`.  Whichever perspective says
yes determines the vault's **type** label ("Governed", "Ungoverned 0x",
"Ungoverned Nzx", or "Escrowed").  When **no** perspective verifies a vault,
the UI shows **Vault type: Unknown** and **Risk manager: Unknown**.

Our audit confirms the existing AXUSD vault is not verified by any
perspective and **cannot be retrofitted to qualify** without redeployment,
because the canonical Ungoverned/Governed perspectives all require:

```solidity
testProperty(vaultFactory.getProxyConfig(vault).upgradeable, ERROR__UPGRADABILITY);
```

i.e. the vault must have been created with `upgradeable=true`.  The legacy
deployment script (`scripts/deploy-axusd-evk-vault.js`) calls
`factory.createProxy(impl, false, trailingData)` — the `false` makes the
vault a non-upgradeable MetaProxy, and the `upgradeable` flag is **stored at
proxy creation time** and cannot be mutated afterwards.

The original task brief assumed the only fixes needed were:
1. clear hooks (already clear ✓),
2. renounce governor, and
3. call `perspectiveVerify`.

The on-chain audit invalidated that assumption.  Static-call simulation of
`perspectiveVerify` on each candidate perspective, with `governorAdmin`
overridden to `0x0`, returned `PerspectiveError(perspective, vault, codes=4)`
where `4 = ERROR__UPGRADABILITY` (bit 2).  Renouncing governance now would be
**irreversible and useless** — the vault would still be Unknown, and we'd
lose the ability to fix anything else.

Other latent blockers (masked by `failEarly=true`) that any redeployed vault
must also resolve to be perspective-verified:

| Blocker | Source check | Fix |
|---|---|---|
| `ERROR__INTEREST_RATE_MODEL` | `irmFactory.isValidDeployment(irm) \|\| irmRegistry.isValid(irm, ts)` | Deploy IRM via official `kinkIRMFactory` (canonical script does this). |
| `ERROR__ORACLE_INVALID_ROUTER` | `routerFactory.isValidDeployment(oracle)` | Use `EulerRouter` (deployed via `oracleRouterFactory`) as the vault's `oracle`, not a custom adapter directly. |
| `ERROR__ORACLE_GOVERNED_ROUTER` | `EulerRouter(oracle).governor() == 0x0` | Renounce router governance after configuring the AXUSD/USDC adapter. |
| `ERROR__ORACLE_INVALID_ADAPTER` | `oracleAdapterRegistry.isValid(adapter, ts)` | **Off-chain step:** submit a PR to `euler-xyz/euler-interfaces` and request Euler governance to add the AXUSD adapter to the registry. |

---

## 2. On-chain calls executed during this task

**None.**  The task constraints explicitly say *"if redeploy is required,
stop and report — do not redeploy automatically."*  The audit proved redeploy
is required, so no transactions were broadcast against the existing vault.

What was added to the repo:

| File | Purpose |
|---|---|
| `scripts/audit-axusd-evk-vault.js` | Read-only on-chain audit (run anytime).  Decodes `PerspectiveError` codes and emits a green/red verdict + remediation path. |
| `scripts/fix-axusd-evk-vault-metadata.js` | Idempotent post-deployment fix script.  Per-flight static-call gate prevents irreversible writes when the vault cannot be verified.  Safe to run; will refuse to renounce on the existing eAXUSD-6 because static call shows it would still fail. |
| `scripts/deploy-axusd-evk-vault-canonical.js` | New canonical deployment.  Uses `upgradeable=true`, deploys IRM via `kinkIRMFactory`, uses `EulerRouter` as the oracle, renounces both router and vault governance, and calls `perspectiveVerify` at the end. |
| `scripts/_legacy/deploy-axusd-evk-vault.legacy.js` | Verbatim copy of the prior deploy script for historical reproducibility (per task constraint). |

The legacy script (`scripts/deploy-axusd-evk-vault.js`) was **not modified**.

---

## 3. Before / after audit output

### Before (existing eAXUSD-6 vault, snapshot 2026-04-17)

```
[Factory recognition]
  factory.isProxy:        true
  proxy.upgradeable:      false       ← root blocker (immutable)
  impl matches factory?:  YES ✓

[Vault identity]
  symbol:                 eAXUSD-6
  asset:                  0xD611...Ade7  (AXUSD ERC-3643)
  oracle:                 0xc894...7c4e  (custom adapter, not in registry)
  unitOfAccount:          0xaf88...5831  (USDC)
  governorAdmin:          0x8d78...4C96  (deployer EOA)
  hookConfig:             target=0x0, hookedOps=0   ✓
  maxDeposit(0x0):        9.99e30        ✓ deposits open
  IRM:                    0x13B4...1662  (custom, not factory-deployed)
  caps:                   1,000,000 supply / 500,000 borrow
  USDC LTV:               90% borrow / 95% liq

[Perspective verification]
  governedPerspective                not verified
  escrowedCollateralPerspective      not verified  failing: UPGRADABILITY(4)
  eulerUngoverned0xPerspective       not verified  failing: UPGRADABILITY(4)
  eulerUngovernedNzxPerspective      not verified  failing: UPGRADABILITY(4)

VERDICT: REDEPLOY REQUIRED
```

### After (no transactions sent)

The existing vault remains in the same state.  No on-chain mutation was
performed because doing so would not have produced a recognized type and
would have permanently bricked governance.

---

## 4. Remediation path (recommended sequence)

1. **Run the canonical deploy script** in a coordinated maintenance window:

   ```bash
   DEPLOYER_PRIVATE_KEY=... node scripts/deploy-axusd-evk-vault-canonical.js
   ```

   This produces a new vault address that:
   - is `upgradeable=true` (passes `ERROR__UPGRADABILITY`)
   - uses an IRM from the official `kinkIRMFactory`
   - uses an `EulerRouter` (governance renounced) as `oracle`
   - has `governorAdmin=0x0`

2. **Submit the AXUSD oracle adapter to Euler's adapter registry** (off-chain).

   Open a PR against
   [euler-xyz/euler-interfaces](https://github.com/euler-xyz/euler-interfaces)
   adding the AXUSD adapter `0xc894d1500CB1FBf8F045e87bd357A51345197c4e` to
   `addresses/42161/SnapshotRegistry/oracleAdapterRegistry`.  Once Euler
   governance executes the registration tx (calls
   `oracleAdapterRegistry.add(adapter, base, quote)`), re-run:

   ```bash
   node scripts/fix-axusd-evk-vault-metadata.js   # idempotent re-verify
   ```

   This is the only step that requires Euler governance cooperation; the
   vault works fully (deposits, withdrawals, borrows) without it — the only
   visible difference is the UI label.

3. **Update the AXIOM contract registry** to point at the new vault:

   - `src/config/activeContracts.generated.ts` → `EVK_OPEN_MARKET_VAULT_ADDRESS`
   - `shared/contracts.ts` → matching constant
   - LPM whitelist of the new vault address (canonical script does this)

4. **Migrate any existing positions** from the legacy eAXUSD-6 vault to the
   new canonical vault before deprecating the legacy one.  (This is a normal
   user-facing migration: withdraw + redeposit; positions are not transferable
   atomically.)

5. **Optional — labeled risk manager.** If we want the UI to show a named
   risk manager (e.g. "AXIOM Multisig") instead of "None", deploy a Safe
   multisig, transfer `governorAdmin` to it, then submit a PR to
   `euler-xyz/euler-interfaces/addresses/42161/labels.json` mapping the
   multisig address to the human-readable name.  Once merged and Euler
   re-deploys their UI bundle, the label will appear.  This must be done
   **instead of** the renounce in step 1 — the two paths are mutually
   exclusive.

---

## 5. Manual UI verification checklist

After step 1 + step 2 above, verify in the Euler V2 app
(<https://app.euler.finance/>):

- [ ] Open the new vault page (`/vault/<NEW_ADDRESS>?network=arbitrum`).
- [ ] Confirm **Vault type** displays "Ungoverned 0x" (or "Ungoverned nzx" if
      we fall back to that perspective).
- [ ] Confirm **Risk manager** displays "None" (renounced) or a named entity.
- [ ] Confirm a deposit, a withdrawal, and a USDC-collateralized borrow each
      render the normal flow (no "vault not recognized" warning).
- [ ] Re-run `node scripts/audit-axusd-evk-vault.js VAULT=<NEW_ADDRESS>` and
      confirm the verdict block shows `Vault type recognized: YES ✓`.

---

## 6. Follow-ups (out of scope for this task)

- Submit AXUSD oracle adapter to `oracleAdapterRegistry` (Euler governance).
- Decide whether to deploy a labeled Safe multisig as risk manager rather
  than renouncing to `0x0`.
- Audit the Euler Earn vault `0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B` — if
  its UI also shows Unknown, run an analogous audit + canonical redeploy.
- Once the new canonical AXUSD vault is in use, deprecate the legacy
  eAXUSD-6 (`0xacdA87...09B2`) and remove it from the AXIOM frontend's
  vault list to avoid user confusion.

---

## 7. Addendum (2026-04-17, post-redeploy preflight)

When the user authorized broadcast of the canonical redeploy, a final
on-chain preflight surfaced **two additional blockers** that block any
useful redeploy in this session:

### 7a. Unit of account: USDC is not recognized

Both Ungoverned perspectives (`0x068789…AC26`, `0xfbB90d…c816D`) return
`isRecognizedUnitOfAccount(USDC) == false`.  The only recognized UoAs on
Arbitrum are the ISO 4217 USD pseudo-address `0x0000…0348` and WETH.

Implication: the vault's `unitOfAccount` immutable parameter must be the
USD pseudo, **not** USDC.  This is a strict change from the legacy vault.

### 7b. Existing AXUSD oracle adapter is one-directional and broken

Direct probing of the adapter at `0xc894…7c4e`:

| Call | Result |
|---|---|
| `getQuote(1e18, AXUSD, USDC)` | `0`  ← AXUSD priced at zero |
| `getQuote(1e18, AXUSD, USD)`  | revert |
| `getQuote(1e6,  USDC,  AXUSD)` | `1e18` ← 1:1 peg, this direction only |

The adapter only prices USDC→AXUSD.  Any vault whose **asset is AXUSD** and
whose UoA is USDC or USD will value all borrows at zero, regardless of
which perspective is targeted.  This is also a latent bug on the existing
`eAXUSD-6` vault (borrows are unpriced; positions appear infinitely
collateralized to the risk engine) — see follow-up below.

### 7c. Why broadcast was held

To produce a perspective-eligible vault we need:

1. A new **AXUSD/USD peg adapter** (1 AXUSD = 1 USD, both directions, ERC-7726).
2. A working **USDC/USD adapter** (deploy a Chainlink wrapper using the
   USDC/USD feed at `0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3`, or reuse
   an Euler-deployed one if any can be located).
3. Both adapters added to `oracleAdapterRegistry` by Euler governance.

Steps 1–2 are codeable but require new contracts, audit, and deploy.
Step 3 is off-chain governance and gates the perspective verification
regardless of when steps 1–2 land.

Redeploying the vault **without** completing 1–3 would either ship the
zero-borrow-pricing bug forward to a new address (Option 3 in the user
dialog — explicitly rejected) or leave the new vault with an incomplete
oracle config (functionally non-operational).  Either path requires a
later redeploy + frontend cutover anyway, so the correct sequencing is to
build the oracle layer first and deploy the vault once.

### 7d. Recommended new follow-ups (proposed as tasks)

- **Build AXUSD/USD peg adapter** — small ERC-7726 contract, identity peg
  with proper decimal conversion (AXUSD has 18 decimals, USD pseudo treated
  as 8 decimals per Chainlink convention).  Deploy from our deployer.
- **Build / wire USDC/USD adapter** — deploy `ChainlinkOracle` (Euler's
  standard adapter from `evk-periphery`) wrapping the Chainlink USDC/USD
  feed on Arbitrum.
- **Fix the latent zero-borrow-pricing bug on legacy eAXUSD-6** — assess
  whether any user borrowed against the broken adapter; if so, this is a
  risk incident that needs disclosure + freeze + migration.  If no
  borrows exist, deprecate the vault directly via the new canonical path.

---

## 8. Earn-vault switch attempt (2026-04-17, status check)

`scripts/switch-axusd-earn-strategy.js` was scheduled to run once the
canonical safe replacement vault was live.  Status check today:

| Prerequisite | State |
|---|---|
| AXUSD/USD peg adapter built | **Not yet** (§7d follow-up still open) |
| USDC/USD adapter wired | **Not yet** (§7d follow-up still open) |
| Both adapters registered in `oracleAdapterRegistry` | **Not yet** (Euler governance gate) |
| Canonical EVK vault deployed (`scripts/deploy-axusd-evk-vault-canonical.js`) | **Not run** — no `.local/canonical-deploy-state.json` present |
| Canonical vault perspective-verified | **N/A** (no vault to verify) |

`DRY_RUN=1 node scripts/switch-axusd-earn-strategy.js` was executed and
exited at the input-validation step exactly as designed:

```
✗ CANONICAL_EVK_VAULT not set and could not be loaded from STATE_FILE.
```

Even if a canonical address were forced via env, the script's step-[1]
sanity check would still refuse to proceed because no Ungoverned
perspective can verify a vault until the AXUSD/USD + USDC/USD adapters
are added to the adapter registry by Euler governance.

**Conclusion:** the switch is still blocked on upstream work.  No
on-chain transactions were broadcast.  The script remains correct and
idempotent; re-run it (without `DRY_RUN`) once the prerequisite chain in
the table above is fully green and the canonical address is in
`.local/canonical-deploy-state.json` (or supplied via `CANONICAL_EVK_VAULT`).

