# Axiom Treasury Vault — Redeploy & Aave v3 Activation Runbook

**Version:** 2026-05  
**Scope:** Complete on-chain redeploy of the AxiomTreasuryVault stack and first
USDC allocation into Aave v3 yield on Arbitrum One.  
**Executor:** Operator with access to the deployer EOA private key.

---

## Prerequisites

| Requirement | Check |
|---|---|
| Node.js ≥ 18, `pnpm` installed | `node -v && pnpm -v` |
| Hardhat dependencies installed | `pnpm install` |
| Arbitrum ETH in deployer wallet (≥ 0.005 ETH for gas) | Arbiscan explorer |
| `DEPLOYER_PRIVATE_KEY` set in Replit Secrets | Replit Secrets panel |
| `ALCHEMY_API_KEY` set in Replit Secrets | Replit Secrets panel |
| `AXUSD_ADDRESS` set (`0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7`) | `echo $AXUSD_ADDRESS` |

---

## Step 1 — Rescue $25 USDC from the Old Vault

The old vault (`0x0d04742A8b5A8e3351B9273e585E980f6e0F46F8`) holds the test
deposit.  Drain it back to the deployer wallet before redeploying.

### 1a — Dry run (verify role + balance, no transactions)

```bash
OLD_VAULT_ADDRESS=0x0d04742A8b5A8e3351B9273e585E980f6e0F46F8 \
DRY_RUN=1 \
npx hardhat run scripts/rescue-vault-usdc.ts \
  --config hardhat.treasury.config.ts \
  --network arbitrum
```

**Expected output (key lines):**
```
deployer hasRole(VAULT_ADMIN): true
totalAssets():          25.000000 USDC
maxWithdraw(deployer):  25.000000 USDC
[DRY RUN] Would call vault.withdraw(25.000000, deployer, deployer)
```

If `hasRole(VAULT_ADMIN): false` — the wrong wallet is loaded.  Confirm
`DEPLOYER_PRIVATE_KEY` in Replit Secrets matches the wallet that deployed the
old vault.

### 1b — Execute rescue

```bash
OLD_VAULT_ADDRESS=0x0d04742A8b5A8e3351B9273e585E980f6e0F46F8 \
npx hardhat run scripts/rescue-vault-usdc.ts \
  --config hardhat.treasury.config.ts \
  --network arbitrum
```

**Expected output:**
```
[executing] vault.withdraw(25.000000 USDC, 0x<deployer>, 0x<deployer>)
  tx submitted: 0x<hash>
  confirmed in block <N>
USDC rescued: 25.000000 USDC
vault USDC (after): 0.000000 USDC
Vault fully drained. Proceed to deploy-treasury-vault.ts.
```

---

## Step 2 — Deploy the New Vault Stack

### 2a — Set required environment variables (Replit Secrets)

| Secret name | Value | Notes |
|---|---|---|
| `DEPLOYER_PRIVATE_KEY` | deployer EOA private key | Already set |
| `VAULT_ADMIN_ADDRESS` | deployer EOA address | Receives VAULT_ADMIN role |
| `STRATEGY_ADMIN_ADDRESS` | deployer EOA address | Receives STRATEGY_ADMIN role |
| `SENTINEL_EXECUTOR_ADDRESS` | deployer EOA address | Receives SENTINEL_EXECUTOR role |
| `AXUSD_ADDRESS` | `0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7` | Already set |
| `AXUSD_ATOKEN_ADDRESS` | Leave **unset** for now | AXUSD Aave market not live yet |

If `VAULT_ADMIN_ADDRESS`, `STRATEGY_ADMIN_ADDRESS`, and
`SENTINEL_EXECUTOR_ADDRESS` are all unset, the script defaults all three roles
to the deployer address.

### 2b — Run the deploy script

> **Config note:** Use `--config hardhat.treasury.config.ts` for all Hardhat
> invocations in this runbook. This config compiles only the treasury contracts
> (Solidity 0.8.20/0.8.24) and avoids conflicts with other contract sets.

```bash
npx hardhat run scripts/deploy-treasury-vault.ts \
  --config hardhat.treasury.config.ts \
  --network arbitrum
```

**Expected output:**
```
Deploying from: 0x<deployer>
[1/5] Deploying StrategyManager...       StrategyManager: 0x<SM_ADDRESS>
[2/5] Deploying AxiomTreasuryVault...    AxiomTreasuryVault: 0x<VAULT_ADDRESS>
[3/5] Granting vault STRATEGY_ADMIN...   Vault granted STRATEGY_ADMIN on SM
[4/5] Deploying AaveV3Strategy...        AaveV3Strategy(USDC): 0x<AAVE_USDC_ADDRESS>
[5/5] Deploying CamelotStrategy...       CamelotStrategy: 0x<CAMELOT_ADDRESS>
══════════════════════════════════════════════════════════════
Deployment complete. Set these environment variables:
  AXIOM_TREASURY_VAULT_ADDRESS=0x<VAULT_ADDRESS>
  AXIOM_STRATEGY_MANAGER_ADDRESS=0x<SM_ADDRESS>
  AXIOM_AAVE_V3_STRATEGY_ADDRESS=0x<AAVE_USDC_ADDRESS>
  AXIOM_CAMELOT_STRATEGY_ADDRESS=0x<CAMELOT_ADDRESS>
══════════════════════════════════════════════════════════════
```

---

## Step 3 — Update Replit Secrets

Set the following secrets using the addresses from Step 2:

| Secret name | Value |
|---|---|
| `AXIOM_TREASURY_VAULT_ADDRESS` | `0x<VAULT_ADDRESS>` |
| `NEXT_PUBLIC_AXIOM_TREASURY_VAULT_ADDRESS` | same as above |
| `AXIOM_STRATEGY_MANAGER_ADDRESS` | `0x<SM_ADDRESS>` |
| `AXIOM_AAVE_V3_STRATEGY_ADDRESS` | `0x<AAVE_USDC_ADDRESS>` |
| `NEXT_PUBLIC_AXIOM_AAVE_V3_STRATEGY_ADDRESS` | same as `AXIOM_AAVE_V3_STRATEGY_ADDRESS` |

After saving, **restart the dev server** so new addresses are picked up.

---

## Step 4 — Register the New Vault in ERC-3643

The new vault must be registered in the on-chain identity + compliance stack.

### Known behaviour and limitations (2026-05)

**Identity creation:** The script attempts `factory.createIdentity(vault, deployer)` so
the deployer holds MANAGEMENT_KEY (purpose 1) on the resulting ONCHAINID. If
the factory returns `IDENTITY_EXISTS` (vault was previously registered), the
script deploys a fresh EIP-1167 minimal proxy against the ONCHAINID
implementation (`0xD18632586d…`) and initialises it with the deployer as
management key.

**`isVerified()` status:** After claims are issued, `identityRegistry.isVerified(vault)`
may still return `false`. Two root causes are possible:

1. **Encoding mismatch** — fixed in the current script version. The claim hash
   must use `keccak256(abi.encode(identity, topic, data))` (standard ABI encoding),
   not `abi.encodePacked`. The script now validates this locally (ecrecover check)
   and on-chain (`ClaimIssuer.isClaimValid()`) after every `addClaim()` call.
   If `isClaimValid()` returns `true` for each claim, encoding is not the problem.

2. **ClaimIssuer signer key** — the deployer EOA must be registered as a
   `CLAIM_SIGNER_KEY` (purpose 3) on the ClaimIssuer at `0x579A367ead…`. If
   `isClaimValid()` returns `false` despite correct encoding, this is the cause.
   See follow-up #547 for resolution.

The script exits with **code 2** (partial success) and prints detailed
remediation instructions distinguishing which cause applies.

**Impact of `isVerified=false`:** AXUSD-denominated flows through the vault (PSM,
LendingMarket) are gated. **USDC→Aave yield is not affected** — it does not
check ERC-3643 compliance. See follow-up #547 for resolution.

**`LendingPlatformModule.addPlatform`:** May revert with `COMPLIANCE_NOT_BOUND`
if the module's compliance contract is not yet bound to AXUSD. The script
catches this and continues — it does not indicate a registration failure.
Resolved in follow-up #547.

### 4a — Dry run

```bash
NEW_VAULT_ADDRESS=0x<VAULT_ADDRESS> \
DRY_RUN=1 \
npx tsx scripts/register-vault-erc3643.ts
```

**Expected output:**
```
[1/5] Checking existing registry state...
  contains(vault):   false
  identity(vault):   0x000...000
  isVerified(vault): false
[2/5] Resolving ONCHAINID for vault...
  factory.walletToIdentity(vault): (none)
  [DRY RUN] Would call factory.createIdentity(vault, <deployer>)
  [DRY RUN] Would call registry.registerIdentity(vault, identity, 840)
  Dry run complete — no transactions sent.
```

### 4b — Execute registration

```bash
NEW_VAULT_ADDRESS=0x<VAULT_ADDRESS> \
npx tsx scripts/register-vault-erc3643.ts
```

**Expected output — success path (ClaimIssuer signer key configured):**
```
[1/5] Checking existing registry state...   contains: false
[2/5] Resolving ONCHAINID...                Identity created: 0x<IDENTITY>
[3/5] Registering in IdentityRegistry...    tx: 0x<hash>
[4/5] Issuing KYC (1) and Sanctions (3)...  KYC_VERIFIED issued / SANCTIONS_CLEAR issued
[5/5] LendingPlatformModule...              Vault whitelisted
[verification]  isVerified(vault): true
REGISTRATION COMPLETE — vault is fully verified.   (exit 0)
```

**Expected output — partial success path (ClaimIssuer signer key NOT configured, current state as of 2026-05):**
```
[1/5] Checking existing registry state...   contains: false
[2/5] Resolving ONCHAINID...                Identity created / EIP-1167 proxy deployed
[3/5] Registering in IdentityRegistry...    tx: 0x<hash>
[4/5] Issuing KYC (1) and Sanctions (3)...  claims issued on-chain
[5/5] LendingPlatformModule...
  WARNING: LendingPlatformModule.addPlatform() failed — COMPLIANCE_NOT_BOUND
  It does NOT affect USDC→Aave yield which is already active.
[verification]
  contains(vault):          true
  isVerified(vault):        false
  KYC claims on-chain:      1
  Sanctions claims on-chain:1
PARTIAL SUCCESS — vault registered, claims on-chain, isVerified=false.
Action required (follow-up #547): ...    (exit 2)
```

> **Exit codes:**  
> `0` — fully registered and verified  
> `2` — registered + claims present, but `isVerified=false` (ClaimIssuer key issue — follow-up #547)  
> `1` — hard error

> **Agent role check:** `registry.registerIdentity()` requires caller to be an
> AGENT on the IdentityRegistry. If the script throws `"NOT an agent"`, call
> `registry.addAgent(deployer)` from the registry owner first.

---

## Step 5 — Verify Contracts on Arbiscan (Optional)

```bash
AXIOM_TREASURY_VAULT_ADDRESS=0x<VAULT_ADDRESS> \
AXIOM_STRATEGY_MANAGER_ADDRESS=0x<SM_ADDRESS> \
AXIOM_AAVE_V3_STRATEGY_ADDRESS=0x<AAVE_USDC_ADDRESS> \
AXIOM_CAMELOT_STRATEGY_ADDRESS=0x<CAMELOT_ADDRESS> \
VAULT_ADMIN_ADDRESS=0x<deployer> \
STRATEGY_ADMIN_ADDRESS=0x<deployer> \
SENTINEL_EXECUTOR_ADDRESS=0x<deployer> \
AXUSD_ADDRESS=0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7 \
npx hardhat run scripts/verify-treasury-vault.ts --network arbitrum
```

---

## Step 6 — Re-deposit $25 USDC into the New Vault

1. Open the operator vault page: `/operator/treasury/vault`
2. Locate **UsdcBackingPanel** and connect the deployer wallet.
3. Enter `25` USDC and confirm. MetaMask will prompt for `approve` then `deposit`.
4. Verify: `vault.totalAssets()` returns `25000000` (25 USDC, 6 decimals).

---

## Step 7 — Allocate USDC to Aave v3

1. On the same vault page, scroll to **AllocateToAavePanel**.
2. Enter `25` USDC and click **Allocate to Aave v3**.
3. Confirm the transaction in MetaMask.

**On-chain call chain:**
```
vault.allocate(aaveUsdcStrategy, USDC, 25_000000)
  → SM.allocateAsset(aaveUsdcStrategy, USDC, 25_000000)
    → USDC.transfer(aaveUsdcStrategy, 25_000000)
    → AaveV3Strategy.deploy(25_000000)
      → aavePool.supply(USDC, 25_000000, strategy, 0)
```

After confirmation, `AllocateToAavePanel` polls every 30 s. You should see:
- **currentValue**: ≥ 25.00 USDC (aUSDC balance, accruing in real time)
- **principal**: 25.00 USDC
- **unrealised yield**: > 0 within minutes

---

## Step 8 — Final Smoke Test

Run the dedicated smoke-check script to assert all three post-deployment
invariants in one command:

```bash
npx tsx scripts/vault-smoke-check.ts
```

**Expected output (all checks passing):**
```
Axiom Vault Smoke Check
═══════════════════════════════════════════════════════════
  Vault:         0x8c9761D465CB95306266a68FF8935C4690EC6092
  Strategy:      0x7d500015C5765456C16Ce2CF38AAF14075C01DD4
  Registry:      0x58f64a1262d5434d6C7637a2309b0999bB6D1970
  Min principal: 25 USDC
═══════════════════════════════════════════════════════════

  ✓ PASS  vault.totalAssets() >= min          25.000000 USDC
  ✓ PASS  strategy.currentValue() > 0         24.999952 USDC (aUSDC balance)
  ✓ PASS  registry.contains(vault)            true — vault has an ONCHAINID registered
  ·       registry.isVerified(vault) [info]   false — follow-up #547 required (does not affect USDC→Aave yield)

═══════════════════════════════════════════════════════════
SMOKE CHECK PASSED — vault is active and Aave yield is running.
═══════════════════════════════════════════════════════════
```

The script exits `0` if all three checks pass, `1` if any fail. The
`isVerified` line is informational only — it is expected to be `false`
until follow-up #547 is resolved.

Alternatively, run a single-line read:

```bash
npx tsx -e "
import { ethers } from 'ethers';
const p = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
const s = new ethers.Contract(
  '$AXIOM_AAVE_V3_STRATEGY_ADDRESS',
  ['function currentValue() view returns (uint256)'],
  p,
);
s.currentValue().then(v => {
  const usdc = Number(v) / 1e6;
  console.log('currentValue:', usdc.toFixed(6), 'USDC');
  if (usdc <= 0) { console.error('ERROR: currentValue is 0'); process.exit(1); }
  console.log('Aave yield ACTIVE');
});
"
```

Expected: a value ≥ `25.000000 USDC`, growing over time.

---

## Rollback / Emergency

| Situation | Action |
|---|---|
| Wrong vault address saved | Update Replit Secrets and restart dev server |
| Allocation stuck in strategy | Call `vault.recallFromStrategy(aaveStrategy, 25_000000)` via Arbiscan Write Contract |
| Vault paused | Call `vault.unpause()` from VAULT_ADMIN wallet via Arbiscan |
| `isVerified=false` after registration | See follow-up #547; run `vault-sprint2-kyc-gate.ts` to diagnose ClaimIssuer key setup |
| `addPlatform` reverts `COMPLIANCE_NOT_BOUND` | See follow-up #547; does not affect USDC→Aave path |

---

## Addresses Reference

| Contract | Arbitrum One address |
|---|---|
| USDC | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| AXUSD | `0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7` |
| Aave v3 Pool | `0x794a61358D6845594F94dc1DB02A252b5b4814aD` |
| aUSDC (aToken) | `0x724dc807b04555b71ed48a6896b6F41593b8C637` |
| IdentityRegistry | `0x58f64a1262d5434d6C7637a2309b0999bB6D1970` |
| IdentityFactory | `0x1A7c55AC9A4AB318039f8E2BDfA82500332c86B9` |
| ONCHAINID Implementation | `0xD18632586d723234e302B240A65A6eD92E24a0c0` |
| ClaimIssuer | `0x579A367eaDa7606edc58f43165B53D2526D1B313` |
| LendingPlatformModule | `0xC0177120Fb5922813031a5857f4dF7F01750Bb6F` |
| Old vault (drained) | `0x0d04742A8b5A8e3351B9273e585E980f6e0F46F8` |
| New vault | `0x8c9761D465CB95306266a68FF8935C4690EC6092` (AXIOM_TREASURY_VAULT_ADDRESS) |
| New vault identity (ONCHAINID) | `0x8771b290A5976eEc205809149cC3d4e84B2ec729` |
| AaveV3Strategy (USDC) | `0x7d500015C5765456C16Ce2CF38AAF14075C01DD4` (AXIOM_AAVE_V3_STRATEGY_ADDRESS) |
| StrategyManager | `0x432dFEe1DAb2D7d423690819DC65C033FE266E8e` |
| CamelotStrategy | `0x511441D31e629d7513004a692c2dB67438151696` |

---

## Known Limitations (2026-05)

| Issue | Status | Follow-up |
|---|---|---|
| `isVerified(vault) = false` — deployer key not a ClaimIssuer CLAIM_SIGNER_KEY | Open | #547 |
| `LendingPlatformModule.addPlatform` reverts `COMPLIANCE_NOT_BOUND` | Open | #547 |
| `NEXT_PUBLIC_AXIOM_CAMELOT_STRATEGY_ADDRESS` missing (frontend can't read Camelot position) | Open | #548 |
| USDC→Aave yield | **ACTIVE** — `currentValue = 24.9999 USDC` | — |

---

---

## Appendix — Deployment Evidence (2026-05, Task #544)

On-chain confirmation of the completed redeploy. Addresses are authoritative;
tx hashes were printed to console at execution time.

| Item | Value |
|---|---|
| New vault address | `0x8c9761D465CB95306266a68FF8935C4690EC6092` |
| New ONCHAINID proxy | `0x8771b290A5976eEc205809149cC3d4e84B2ec729` |
| AaveV3Strategy | `0x7d500015C5765456C16Ce2CF38AAF14075C01DD4` |
| StrategyManager | `0x432dFEe1DAb2D7d423690819DC65C033FE266E8e` |
| CamelotStrategy | `0x511441D31e629d7513004a692c2dB67438151696` |

**AaveV3Strategy.currentValue() — confirmed live read:**
```
25.000000 USDC  (principal)
24.999952 USDC  (aUSDC balance, accruing — sample at time of verification)
```

**IdentityRegistry state post-registration:**
```
contains(vault):   true
isVerified(vault): false   ← expected; follow-up #547 required
KYC claims:        1 (Topic 1, on ONCHAINID proxy)
Sanctions claims:  1 (Topic 3, on ONCHAINID proxy)
```

**Env vars updated in Replit Secrets:**
- `AXIOM_TREASURY_VAULT_ADDRESS` = `0x8c9761D465CB95306266a68FF8935C4690EC6092`
- `NEXT_PUBLIC_AXIOM_TREASURY_VAULT_ADDRESS` = same
- `AXIOM_STRATEGY_MANAGER_ADDRESS` = `0x432dFEe1DAb2D7d423690819DC65C033FE266E8e`
- `AXIOM_AAVE_V3_STRATEGY_ADDRESS` = `0x7d500015C5765456C16Ce2CF38AAF14075C01DD4`
- `NEXT_PUBLIC_AXIOM_AAVE_V3_STRATEGY_ADDRESS` = same
- `AXIOM_CAMELOT_STRATEGY_ADDRESS` = `0x511441D31e629d7513004a692c2dB67438151696`

**Post-smoke-check command to re-verify at any time:**
```bash
npx tsx scripts/vault-smoke-check.ts
```

---

*Last updated: 2026-05 — Task #544 — Axiom Protocol*
