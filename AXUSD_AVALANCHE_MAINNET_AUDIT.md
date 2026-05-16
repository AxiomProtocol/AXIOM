# AXUSD Avalanche C-Chain Mainnet — Pre-Deploy Audit Report

**Contract:** `AxiomStable3643` (contracts/avalanche/AxiomStable3643.sol)
**Audited from:** `AxiomStable3643Fuji.sol` (Fuji testnet prototype)
**Audit Date:** 2026-05-16
**Standard:** ERC-3643 (T-REX)
**Target Network:** Avalanche C-Chain (chainId: 43114)
**Status:** CLEARED FOR DEPLOYMENT (post-fix)

---

## 1. Contracts in Scope

| File | Role |
|---|---|
| `contracts/avalanche/AxiomStable3643.sol` | AXUSD token — mainnet hardened |
| `contracts/avalanche/TransferLimitModule.sol` | Per-address daily transfer cap |
| `contracts/avalanche/CountryAllowModule.sol` | Country-code allowlist compliance |
| `contracts/avalanche/AbstractModule.sol` | Shared module base (Ownable) |
| `contracts/avalanche/interfaces/IIdentityRegistry.sol` | KYC registry interface |
| `contracts/avalanche/interfaces/IModularCompliance.sol` | Compliance engine interface |
| `contracts/avalanche/interfaces/IModule.sol` | T-REX module interface |

---

## 2. Audit Findings

### A1 — Missing nonReentrant on forcedTransfer (Medium) — FIXED

**File:** AxiomStable3643Fuji.sol → AxiomStable3643.sol
**Severity:** Medium
**Status:** Fixed in mainnet contract

**Detail:**
`forcedTransfer()` temporarily clears `_frozen[_from] = false` before calling
`_transfer()`, which in turn calls `_compliance.transferred()`. A malicious or
compromised compliance contract could re-enter `forcedTransfer()` during this
callback while the sender's freeze flag is false — allowing a double-transfer
from a frozen account.

**Fix:** Added `nonReentrant` modifier to `forcedTransfer()`.
`recoveryAddress()` already had `nonReentrant` on the Fuji prototype.

---

### A2 — Compliance callback fires with cleared freeze state (Medium) — FIXED

**File:** AxiomStable3643Fuji.sol → AxiomStable3643.sol
**Severity:** Medium (same root as A1)
**Status:** Fixed via same nonReentrant addition

**Detail:**
The `_update()` hook calls `_compliance.transferred(from, to, amount)` after
`super._update()`. If compliance is the attack vector, the cleared `_frozen`
state is visible to the re-entrant call. `nonReentrant` on `forcedTransfer()`
closes this window at the entry point, making the freeze-clear/restore pattern
safe regardless of compliance implementation.

---

### A3 — Constructor grants all roles to deployer EOA (Critical — Operational) — FIXED

**File:** AxiomStable3643Fuji.sol
**Severity:** Critical (operational)
**Status:** Fixed in mainnet contract

**Detail:**
The Fuji constructor granted `MINTER_ROLE`, `BURNER_ROLE`, and `AGENT_ROLE`
to `msg.sender` (deployer EOA) alongside `DEFAULT_ADMIN_ROLE`. This is
acceptable for testnet but unacceptable for mainnet: an EOA holding these
roles is a single point of failure and bypasses multi-party authorization.

**Fix:** Mainnet constructor grants only `DEFAULT_ADMIN_ROLE` to deployer.
`MINTER_ROLE`, `BURNER_ROLE`, and `AGENT_ROLE` are granted post-deploy
exclusively to the protocol multisig via the deploy script's role-transfer
step. Deployer EOA renounces `DEFAULT_ADMIN_ROLE` at the end of the script.

---

### A4 — moduleTransferAction compliance address via msg.sender (Low — By Design)

**File:** TransferLimitModule.sol
**Severity:** Low
**Status:** Accepted — T-REX spec compliance

**Detail:**
`moduleTransferAction()` reads `msg.sender` as the compliance address, which
is correct per the T-REX IModule spec — the ModularCompliance contract calls
this function directly, so `msg.sender IS the compliance`. This is only safe
if the ModularCompliance enforces that only the bound token can trigger
transfer actions (i.e. an `onlyToken` guard in the MC implementation).

**Accepted risk:** The ModularCompliance implementation must enforce this
guard. Review required before deploying a custom MC implementation.

---

### A5 — CountryAllowModule allowAll=true is testnet default (Critical — Operational) — FIXED

**File:** CountryAllowModule.sol
**Severity:** Critical (operational)
**Status:** Fixed in deploy script

**Detail:**
The Fuji deployment used `setAllowAll(compliance, true)` for testnet
convenience, permitting transfers to all country codes. On mainnet this would
allow any receiver regardless of KYC country, bypassing compliance gating.

**Fix:** The mainnet deploy script (`scripts/avalanche/deploy-axusd-mainnet.ts`)
does NOT call `setAllowAll`. The explicit country allowlist must be configured
by the multisig after deployment via `addAllowedCountry()` or
`batchAllowCountries()` before any user transfers are enabled.

---

### A6 — Module Ownable ownership held by deployer EOA (Critical — Operational) — FIXED

**File:** AbstractModule.sol (inherited by TransferLimitModule, CountryAllowModule)
**Severity:** Critical (operational)
**Status:** Fixed in deploy script

**Detail:**
`AbstractModule` inherits `Ownable`. The deployer EOA is `owner` post-deploy,
giving it unilateral control over `setTransferLimit()`, `setExempt()`,
`setAllowAll()`, `addAllowedCountry()` etc. An EOA owner is a single point of
control and failure.

**Fix:** Deploy script calls `transferOwnership(multisig)` on both
`TransferLimitModule` and `CountryAllowModule` before the script exits.
Deployer EOA retains no ownership after script completion.

---

## 3. Findings Not Fixed (Accepted Risks)

| ID | Description | Accepted Reason |
|---|---|---|
| A4 | `moduleTransferAction` reads `msg.sender` as compliance | T-REX spec requires this pattern; guard is MC's responsibility |
| — | Non-upgradeable contract | By design — immutability is the security model |
| — | No emergency pause on modules | Token `pause()` (admin-controlled) stops all transfers; module-level pause not required |

---

## 4. Access Control Matrix — Post-Deploy (Expected)

| Role | Holder | Granted By |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` (token) | Multisig | Deploy script step 11 |
| `MINTER_ROLE` (token) | Multisig | Deploy script step 8 |
| `BURNER_ROLE` (token) | Multisig | Deploy script step 8 |
| `AGENT_ROLE` (token) | Multisig | Deploy script step 8 |
| IdentityRegistry agent | Multisig | Deploy script step 9 |
| TransferLimitModule owner | Multisig | Deploy script step 10 |
| CountryAllowModule owner | Multisig | Deploy script step 10 |
| Deployer EOA | **No roles** | Renounced in step 11 |

---

## 5. Deploy Checklist

- [x] A1/A2: nonReentrant added to forcedTransfer()
- [x] A3: Constructor does not grant MINTER/BURNER/AGENT to deployer
- [x] A5: allowAll not set in deploy script
- [x] A6: Module ownership transferred to multisig in deploy script
- [x] Hardhat network config added: `avalanche` (43114) + `avalancheFuji` (43113)
- [x] Deploy script written: `scripts/avalanche/deploy-axusd-mainnet.ts`
- [ ] Set `AVALANCHE_MULTISIG_ADDRESS` env var before running
- [ ] Set `AVALANCHE_DEPLOYER_PRIVATE_KEY` env var (funded with >= 0.05 AVAX)
- [ ] Set `AVALANCHE_RPC_URL` env var (or use public default)
- [ ] Dry-run on Fuji first: `--network avalancheFuji`
- [ ] Verify all contracts on Snowtrace after deploy
- [ ] Configure CountryAllowModule country allowlist via multisig
- [ ] Set TransferLimitModule daily limit via multisig
- [ ] Update `cap_assets` DB row: chain=avalanche-cchain, chainId=43114, contractAddress=<deployed>
- [ ] Update `AXUSD-FUJI` asset row: status=RETIRED or INACTIVE

---

## 6. How to Deploy

```bash
# 1. Set required env vars (do NOT commit these)
export AVALANCHE_DEPLOYER_PRIVATE_KEY="0x..."   # funded EOA, >= 0.05 AVAX
export AVALANCHE_MULTISIG_ADDRESS="0x..."        # protocol multisig, NOT the deployer
export AVALANCHE_RPC_URL="https://api.avax.network/ext/bc/C/rpc"  # optional, has default

# 2. Dry-run on Fuji first
npx hardhat run scripts/avalanche/deploy-axusd-mainnet.ts --network avalancheFuji

# 3. Deploy to mainnet
npx hardhat run scripts/avalanche/deploy-axusd-mainnet.ts --network avalanche

# 4. Verify on Snowtrace
npx hardhat verify --network avalanche <TOKEN_ADDRESS> \
  <IDENTITY_REGISTRY> <COMPLIANCE> "Axiom USD" "AXUSD" 6 <ONCHAIN_ID>
```
