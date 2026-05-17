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
npx hardhat run scripts/rescue-vault-usdc.ts --network arbitrum
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
npx hardhat run scripts/rescue-vault-usdc.ts --network arbitrum
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

Verify on Arbiscan: `https://arbiscan.io/tx/0x<hash>`

---

## Step 2 — Deploy the New Vault Stack

### 2a — Set required environment variables (Replit Secrets)

The deploy script reads these at runtime.  All must be set before running.

| Secret name | Value | Notes |
|---|---|---|
| `DEPLOYER_PRIVATE_KEY` | deployer EOA private key | Already set |
| `VAULT_ADMIN_ADDRESS` | deployer EOA address | Receives VAULT_ADMIN role |
| `STRATEGY_ADMIN_ADDRESS` | deployer EOA address | Receives STRATEGY_ADMIN role |
| `SENTINEL_EXECUTOR_ADDRESS` | deployer EOA address | Receives SENTINEL_EXECUTOR role |
| `AXUSD_ADDRESS` | `0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7` | Already set |
| `AXUSD_ATOKEN_ADDRESS` | Leave **unset** for now | AXUSD Aave market not live yet |
| `SENTINEL_EXECUTOR_PRIVATE_KEY` | deployer EOA private key | Required at runtime for `/api/treasury/vault/rebalance` |

If `VAULT_ADMIN_ADDRESS`, `STRATEGY_ADMIN_ADDRESS`, and
`SENTINEL_EXECUTOR_ADDRESS` are all unset, the script defaults all three roles
to the deployer address — acceptable for testnet/initial mainnet.

### 2b — Run the deploy script

```bash
npx hardhat run scripts/deploy-treasury-vault.ts --network arbitrum
```

**Expected output:**

```
Deploying from: 0x<deployer>

[1/5] Deploying StrategyManager...
      StrategyManager: 0x<SM_ADDRESS>

[2/5] Deploying AxiomTreasuryVault...
      AxiomTreasuryVault: 0x<VAULT_ADDRESS>

[3/5] Granting vault STRATEGY_ADMIN on StrategyManager...
      Vault (0x<VAULT_ADDRESS>) granted STRATEGY_ADMIN on SM

[4/5] Deploying AaveV3Strategy instances...
      AaveV3Strategy(USDC): 0x<AAVE_USDC_ADDRESS>
      AaveV3Strategy(AXUSD): SKIPPED — set AXUSD_ATOKEN_ADDRESS to enable

[5/5] Deploying CamelotStrategy and registering strategies...
      CamelotStrategy: 0x<CAMELOT_ADDRESS>
      Registered AaveV3Strategy(USDC)
      Registered CamelotStrategy

══════════════════════════════════════════════════════════════
Deployment complete. Set these environment variables:
══════════════════════════════════════════════════════════════
  AXIOM_TREASURY_VAULT_ADDRESS=0x<VAULT_ADDRESS>
  AXIOM_STRATEGY_MANAGER_ADDRESS=0x<SM_ADDRESS>
  AXIOM_AAVE_V3_STRATEGY_ADDRESS=0x<AAVE_USDC_ADDRESS>
  AXIOM_CAMELOT_STRATEGY_ADDRESS=0x<CAMELOT_ADDRESS>
══════════════════════════════════════════════════════════════
```

**Copy all four addresses from the output — you will need them in Step 3.**

---

## Step 3 — Update Replit Secrets

Go to **Replit → Secrets** and set or update the following five secrets.
Use the addresses printed by the deploy script in Step 2.

| Secret name | Value |
|---|---|
| `AXIOM_TREASURY_VAULT_ADDRESS` | `0x<VAULT_ADDRESS>` from deploy output |
| `NEXT_PUBLIC_AXIOM_TREASURY_VAULT_ADDRESS` | same as above |
| `AXIOM_STRATEGY_MANAGER_ADDRESS` | `0x<SM_ADDRESS>` from deploy output |
| `AXIOM_AAVE_V3_STRATEGY_ADDRESS` | `0x<AAVE_USDC_ADDRESS>` from deploy output |
| `NEXT_PUBLIC_AXIOM_AAVE_V3_STRATEGY_ADDRESS` | same as `AXIOM_AAVE_V3_STRATEGY_ADDRESS` |

After saving, **restart the dev server** from the Replit workflow panel (stop
then start "AXIOM Dev Server") so the new addresses are picked up by the
frontend.

---

## Step 4 — Register the New Vault in ERC-3643

The new vault address must be registered in the on-chain identity + compliance
stack so AXUSD transfers to/from the vault pass the ERC-3643 `isVerified` gate.

### 4a — Dry run

```bash
NEW_VAULT_ADDRESS=0x<VAULT_ADDRESS> \
DRY_RUN=1 \
npx tsx scripts/register-vault-erc3643.ts
```

**Expected output:**
```
[1/5] Checking existing registry state...
  contains(vault):  false
  identity(vault):  0x000...000
  isVerified(vault):false
[2/5] Creating / reusing ONCHAINID for vault...
  [DRY RUN] Would call factory.createIdentity(vault, vault)
  Exiting dry run at identity creation.
```

### 4b — Execute registration

```bash
NEW_VAULT_ADDRESS=0x<VAULT_ADDRESS> \
npx tsx scripts/register-vault-erc3643.ts
```

**Expected output:**
```
[1/5] Checking existing registry state...
  contains(vault): false
[2/5] Creating / reusing ONCHAINID for vault...
  Calling factory.createIdentity(...)
  tx: 0x<hash>  |  https://arbiscan.io/tx/0x<hash>
  Identity created: 0x<IDENTITY_ADDRESS>
[3/5] Registering identity in IdentityRegistry...
  Calling registry.registerIdentity(...)
  tx: 0x<hash>
[4/5] Issuing KYC (topic 1) and Sanctions (topic 3) claims...
  Issuing KYC_VERIFIED (1)...  tx: 0x<hash>
  Issuing SANCTIONS_CLEAR (3)...  tx: 0x<hash>
[5/5] Whitelisting vault on LendingPlatformModule...
  Calling lendingModule.addPlatform(...)  tx: 0x<hash>
[verification]
  contains(vault):   true
  isVerified(vault): true
Vault fully registered and verified.
```

**If `isVerified` remains false after claims are issued**, the
ClaimTopicsRegistry may require claim topics that the ClaimIssuer is not
authorised for.  Run `vault-sprint2-kyc-gate.ts` to diagnose.

> **Note on agent role:** `registry.registerIdentity()` requires the signer to
> be an AGENT on the IdentityRegistry.  If the script throws
> `"NOT an agent"`, call `registry.addAgent(deployer)` from the registry owner
> address via Arbiscan Write Contract before re-running.

---

## Step 5 — Verify Contracts on Arbiscan

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

This submits all four contracts to Arbiscan for source-code verification.
Verification makes Write Contract available directly in the browser for
emergency operations.

---

## Step 6 — Re-deposit $25 USDC into the New Vault

1. Open the operator vault page: `/operator/treasury/vault`
2. Locate **UsdcBackingPanel** (the USDC deposit section).
3. Connect the deployer wallet (MetaMask).
4. Enter `25` USDC and confirm.
5. Confirm the transaction in MetaMask.
6. Verify: `vault.totalAssets()` should show `25000000` (25 USDC, 6 decimals).

---

## Step 7 — Allocate USDC to Aave v3

1. On the same vault page, scroll to **AllocateToAavePanel**.
2. The "pending vault redeploy" banner should now be gone — the panel reads live
   `currentValue` and `principal` from the newly deployed `AaveV3Strategy`.
3. Enter `25` USDC and click **Allocate to Aave v3**.
4. Confirm the transaction in MetaMask.

**On-chain call executed:**
```
vault.allocate(aaveUsdcStrategy, USDC, 25_000000)
  → SM.allocateAsset(aaveUsdcStrategy, USDC, 25_000000)
    → USDC.transfer(aaveUsdcStrategy, 25_000000)
    → AaveV3Strategy.deploy(25_000000)
      → aavePool.supply(USDC, 25_000000, strategy, 0)
```

5. After confirmation, `AllocateToAavePanel` polls every 30 s.  Within one
   poll cycle you should see:
   - **currentValue**: ≥ 25.00 USDC (aUSDC balance, accruing in real time)
   - **principal**: 25.00 USDC
   - **unrealised yield**: > 0 (within minutes on Aave v3 USDC market)

---

## Step 8 — Final Smoke Test

```bash
# Read currentValue directly from the strategy
STRATEGY=0x<AAVE_USDC_ADDRESS> \
npx tsx -e "
const { ethers } = require('ethers');
const p = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
const s = new ethers.Contract(
  process.env.STRATEGY,
  ['function currentValue() view returns (uint256)'],
  p,
);
s.currentValue().then(v => console.log('currentValue:', v.toString()));
"
```

Expected: a value ≥ `25000000` (25 USDC in 6-decimal units), growing over time.

---

## Rollback / Emergency

| Situation | Action |
|---|---|
| Wrong vault address saved | Update Replit Secrets and restart dev server |
| Allocation stuck in strategy | Call `vault.recallFromStrategy(aaveStrategy, 25_000000)` via Arbiscan Write Contract |
| Vault paused | Call `vault.unpause()` from VAULT_ADMIN wallet via Arbiscan |
| ERC-3643 isVerified still false | Run `vault-sprint2-kyc-gate.ts` to diagnose; re-run `register-vault-erc3643.ts` |

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
| ClaimIssuer | `0x579A367eaDa7606edc58f43165B53D2526D1B313` |
| LendingPlatformModule | `0xC0177120Fb5922813031a5857f4dF7F01750Bb6F` |
| Old vault (drained) | `0x0d04742A8b5A8e3351B9273e585E980f6e0F46F8` |
| New vault | set in `AXIOM_TREASURY_VAULT_ADDRESS` after Step 2 |

---

*Last updated: 2026-05 — Task #544 — Axiom Protocol*
