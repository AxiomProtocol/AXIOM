# Axiom Earn AXUSD Vault — Technical Reference

**Document status:** Living reference. Updated 2026-04-17.
**Audience:** Protocol integrators, allocators, internal engineering.

---

## 0. Vault Status: Bootstrap / Pre-Live

Axiom Earn AXUSD is deployed on Arbitrum One and recognized by the
Euler Earn factory perspective, but it is not yet operating as a fully
live public yield product. At this stage, deposited AXUSD does not
earn active strategy yield. The current legacy strategy path is capped
at zero, and the canonical EVK strategy migration is still pending.

**Current limitations:**

- No active yield is being generated
- Borrow-side functionality is not live
- Strategy verification is still pending
- Oracle adapter registration with Euler governance is still outstanding
- Operational ownership transfer to the AXIOM Risk Council Safe is still pending

This vault may be displayed in the Axiom Protocol interface for visibility,
wallet connection, balance tracking, and controlled testing. It should
not yet be represented as a live yield-bearing product for general
public capital deployment.

**Status target before public launch:**

- [ ] Oracle adapters registered by Euler governance
- [ ] Canonical EVK vault deployed and perspective-verified
- [ ] Earn vault supply queue switched to the canonical EVK strategy
- [ ] Ownership and curator controls transferred to the AXIOM Risk Council Safe

Run the diagnostic at any time to check progress against these targets:

```bash
node scripts/diagnose-axusd-vault-unknown.js
```

---

## 1. Vault Identity

| Field | Value |
|---|---|
| Deployment status | **Bootstrap / Pre-Live** (see §0) |
| Contract name | Axiom Earn AXUSD |
| Symbol | `earnAXUSD` |
| Address (Arbitrum One) | `0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B` |
| Standard | ERC-4626 (Euler Earn wrapper) |
| Underlying asset | AXUSD (`0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7`) |
| Chain | Arbitrum One (chain id 42161) |
| Decimals (shares) | 18 |
| Factory | EulerEarnFactory `0xB9B5d62B9fE9E1B505466e75817aB178A1D2ec9d` |
| Deployed by | Axiom deployer EOA `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` |
| Deploy script | `scripts/deploy-axusd-euler-earn-vault.js` |
| Audit script | `scripts/audit-axusd-euler-earn-vault.js` |
| Diagnostic script | `scripts/diagnose-axusd-vault-unknown.js` |

---

## 2. Role in the Axiom Architecture

The `earnAXUSD` vault is the **yield-routing layer** for AXUSD within
Axiom's Euler V2 integration. It sits in Layer 2 (on-chain financial
rails) of the Axiom seven-layer stack and exposes a single, standardized
ERC-4626 deposit surface to capital that wants to earn yield on AXUSD
balances without managing individual strategy positions.

```
Depositor (wallet / protocol)
        │  deposit(assets)  → shares
        ▼
┌─────────────────────────────────┐
│  earnAXUSD  ERC-4626 wrapper    │  ← this vault
│  0x4359…cB45B  (Euler Earn)    │
│  curator = TBD (Risk Council)   │
└────────────┬────────────────────┘
             │  routes capital into strategy queues
             ▼
┌─────────────────────────────────┐
│  Strategy: eAXUSD-6  (legacy)   │  ← current supply queue [0]
│  0xacdA…09B2  (EVK eVault)     │
│  Status: broken oracle, cap=0   │
└─────────────────────────────────┘
             ↓ (planned)
┌─────────────────────────────────┐
│  Strategy: canonical EVK vault  │  ← Task #92 (pending)
│  perspective-verified, full UoA │
│  USD pseudo, renounced governor │
└─────────────────────────────────┘
```

When the canonical EVK vault is live and the supply queue is repointed
(`scripts/switch-axusd-earn-strategy.js`), the full lending market and
collateral flows governed by the Euler V2 risk engine will be available
to `earnAXUSD` depositors.

---

## 3. On-Chain Configuration (as of 2026-04-17)

### 3.1 Governance roles

| Role | Address | Status |
|---|---|---|
| `owner` | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` | Deployer EOA — pending transfer to Risk Council Safe |
| `curator` | `0x0000000000000000000000000000000000000000` | Not set — pending `setCurator` after Safe deployment |
| `guardian` | `0x0000000000000000000000000000000000000000` | Not set |
| `feeRecipient` | `0xF5d5...Cb94` (AxiomFeeBurner) | Set at deploy |

### 3.2 Fee and timelock

| Parameter | Value |
|---|---|
| Performance fee | 10% (1e17 WAD) |
| Timelock | 0 seconds (no delay on cap/queue changes while in bootstrap) |

### 3.3 Supply and withdraw queues

| Queue | Position | Strategy vault | Cap | Notes |
|---|---|---|---|---|
| Supply | [0] | `eAXUSD-6` `0xacdA…09B2` | 0 | Legacy; cap intentionally zero; oracle broken |
| Withdraw | [0] | `eAXUSD-6` `0xacdA…09B2` | — | Will be evicted when canonical EVK is live |

### 3.4 Share price and TVL

| Metric | Live value |
|---|---|
| `totalAssets` | 0 AXUSD (no capital deposited) |
| `totalSupply` | 0 earnAXUSD |
| Share price (`convertToAssets(1e18)`) | 1.000000 (no yield accrued; 1:1 at genesis) |
| `maxDeposit` | 1,000,000 AXUSD (deposit cap) |

### 3.5 Perspective verification

| Perspective | Address | Verified |
|---|---|---|
| `eulerEarnFactoryPerspective` | `0x12241404ea27FA4BF7ECDAD2Cb13A99860d7d4Ac` | **Yes** |
| `eulerEarnGovernedPerspective` | `0xeE3de4507cFAc8756634dC5272B4A6BB7f00C49E` | No — blocked on strategy verification |
| `eulerUngoverned0xPerspective` | N/A (EVK only) | N/A |

The vault is **recognized by the Euler V2 UI** ("Vault type: Euler Earn")
via the factory perspective. The Governed perspective will pass once the
canonical EVK strategy vault is live and perspective-verified.

---

## 4. ERC-4626 Integration Surface

Standard ERC-4626 interface. Integrators should target the minimal surface
below and treat all other methods as internal Euler Earn extensions.

```solidity
interface IEarnAXUSD {
    // ── ERC-20 (shares) ──────────────────────────────────────────────
    function name()        external view returns (string memory);
    function symbol()      external view returns (string memory);
    function decimals()    external view returns (uint8);       // 18
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);

    // ── ERC-4626 ─────────────────────────────────────────────────────
    function asset()          external view returns (address);  // AXUSD
    function totalAssets()    external view returns (uint256);
    function convertToShares(uint256 assets) external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256);
    function maxDeposit(address receiver)  external view returns (uint256);
    function previewDeposit(uint256 assets) external view returns (uint256);
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function maxMint(address receiver)  external view returns (uint256);
    function previewMint(uint256 shares) external view returns (uint256);
    function mint(uint256 shares, address receiver) external returns (uint256 assets);
    function maxWithdraw(address owner) external view returns (uint256);
    function previewWithdraw(uint256 assets) external view returns (uint256);
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
    function maxRedeem(address owner) external view returns (uint256);
    function previewRedeem(uint256 shares) external view returns (uint256);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);

    // ── Euler Earn extensions ─────────────────────────────────────────
    function curator()       external view returns (address);
    function owner()         external view returns (address);
    function guardian()      external view returns (address);
    function feeRecipient()  external view returns (address);
    function performanceFee()external view returns (uint256); // WAD (1e18 = 100%)
}
```

**Deposit flow (happy path):**

```
1. Approve earnAXUSD to spend AXUSD:
     AXUSD.approve(0x4359...cB45B, amount)

2. Deposit:
     earnAXUSD.deposit(amount, receiverAddress)
     → returns earnAXUSD shares minted

3. Check position:
     earnAXUSD.balanceOf(receiverAddress) → shares
     earnAXUSD.convertToAssets(shares)    → AXUSD value
```

Note: AXUSD is an ERC-3643 (T-REX) compliant token with identity-gated
transfers. Depositors must hold a valid on-chain identity registered by
the Axiom identity registry to receive AXUSD and therefore earnAXUSD
shares. Unregistered addresses will revert at the `AXUSD.transfer` step.

---

## 5. Related Addresses (Arbitrum One)

| Contract | Address | Purpose |
|---|---|---|
| `earnAXUSD` | `0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B` | This vault |
| AXUSD (ERC-3643) | `0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7` | Underlying asset |
| AXAU | `0x2FB3CF5cB6e9E9e3b7d5a9c3b15F1e2e7c4A8F9a` | Senior reserve instrument |
| Legacy EVK vault (`eAXUSD-6`) | `0xacdA87801f6409bB5157BA78aF1BD9631d6609B2` | Current (broken) strategy; will be replaced |
| EulerEarnFactory | `0xB9B5d62B9fE9E1B505466e75817aB178A1D2ec9d` | Factory that deployed this vault |
| EulerEarnFactoryPerspective | `0x12241404ea27FA4BF7ECDAD2Cb13A99860d7d4Ac` | Verifies Earn vault authenticity |
| EulerEarnGovernedPerspective | `0xeE3de4507cFAc8756634dC5272B4A6BB7f00C49E` | Stricter perspective (pending) |
| AXUSD/USD oracle adapter | `0x1862D3c85382c4f4b81a9a9e0d31b289963D70d6` | Prices AXUSD against USD pseudo |
| USDC/USD oracle adapter | `0x49EBE245b8fAC6f9cF70c2Ca415e0749fB602E61` | Wraps Chainlink USDC/USD feed |
| oracleAdapterRegistry | `0x3942A72f87Db5Ad9C22d8826FDe15E23b81b1cBf` | Registry both adapters must be added to |
| Registry owner (multisig) | `0xb3dCA151d92c6e40450e67098444DcF60d99Bc3d` | Euler governance |
| AxiomFeeBurner | `0xF5d5...Cb94` | Fee recipient for vault performance fees |

---

## 6. Risk Disclosures

### 6.1 Operational status

See §0 for the current Bootstrap / Pre-Live status, the full list of
limitations, and the pre-launch checklist. This vault should not be
represented as a live yield-bearing product for general public capital
deployment until all four launch targets in §0 are cleared.

### 6.2 Technical risk details

**Broken strategy oracle (deposit accounting is not affected).**
The legacy `eAXUSD-6` strategy has its `unitOfAccount` set to USDC
rather than the USD pseudo address, and its `governorAdmin` has not
been renounced. This breaks the Euler V2 borrow-side risk engine for
that vault. Deposit accounting inside the Earn wrapper is shielded by
ERC-4626 arithmetic (`convertToAssets` does not touch the oracle), so
AXUSD deposited through `earnAXUSD` is not at risk of mis-pricing. The
limitation is that borrowing against deposited AXUSD is non-functional
until the canonical EVK strategy replaces the legacy one.

**Governance held by a single EOA.** Until the ownership transfer to
the AXIOM Risk Council Safe is complete (runbook at
`documents/euler-axusd-risk-council-safe.md`), all curator and queue
operations require the deployer private key.

**Euler identity constraint for integrators.** The Earn vault does not
itself enforce ERC-3643 compliance, but AXUSD transfers into and out of
the vault call the AXUSD compliance module. Addresses not registered in
the Axiom identity registry will revert at the transfer step.

### 6.3 Terminal risk status

Run the diagnostic at any time to get the current normalized status:

```bash
node scripts/diagnose-axusd-vault-unknown.js
```

Expected output today: `BLOCKED_ON_EULER_GOVERNANCE` (both oracle
adapters unregistered; strategy EVK vault preconditions also violated).

---

## 7. Operational Runbooks

### 7.1 Verify the vault is perspective-recognized

```bash
# Human-readable report
node scripts/diagnose-axusd-vault-unknown.js

# Machine-readable JSON (CI / monitoring)
JSON=1 node scripts/diagnose-axusd-vault-unknown.js
```

Target exit code: `0` (vault verified by at least one perspective).

### 7.2 Switch the supply queue to the canonical EVK vault

Once the canonical EVK vault (Task #92) is deployed and
perspective-verified:

```bash
DEPLOYER_PRIVATE_KEY=<key> \
CANONICAL_EVK_VAULT=0x<new_vault_address> \
node scripts/switch-axusd-earn-strategy.js
```

The script is idempotent. It checks the canonical vault's perspective
status before touching any queues, sets the new cap, waits for
timelock expiry, evicts the legacy strategy, and re-runs the audit
script to confirm both Earn perspectives pass.

### 7.3 Transfer ownership to the AXIOM Risk Council Safe

Full runbook at `documents/euler-axusd-risk-council-safe.md`. Summary:

1. Deploy a Gnosis Safe (if not already live).
2. From the deployer EOA: `vault.transferOwnership(safeAddress)`.
3. From the Safe: `vault.acceptOwnership()`.
4. From the Safe: `vault.setCurator(safeAddress)` (or a separate
   Curator Safe if operational separation is desired).
5. Submit a PR to `euler-xyz/euler-interfaces` adding the Safe address
   under `axiomRiskCouncil` in `addresses/42161/MultisigAddresses.json`.
6. After Euler ships the next bundle, verify the Euler V2 UI shows
   "AXIOM Risk Council" under Owner and Risk Manager.

### 7.4 Register oracle adapters with Euler governance

The governance call must be executed by the owner of
`0x3942A72f87Db5Ad9C22d8826FDe15E23b81b1cBf` (Euler governance
multisig). Full submission packages:

- `documents/euler-adapter-submission-package/`
- `documents/euler-usdc-adapter-submission-package/`

Governance calldata (selector `0xa693686f` = `add(address,address,address)`):

**AXUSD/USD adapter:**
```
to:    0x3942A72f87Db5Ad9C22d8826FDe15E23b81b1cBf
value: 0
data:  0xa693686f
       0000000000000000000000001862d3c85382c4f4b81a9a9e0d31b289963d70d6
       000000000000000000000000d6110f59a978ada6ef5c0e9d6baa04455d46ade7
       0000000000000000000000000000000000000000000000000000000000000348
```

**USDC/USD adapter:**
```
to:    0x3942A72f87Db5Ad9C22d8826FDe15E23b81b1cBf
value: 0
data:  0xa693686f
       00000000000000000000000049ebe245b8fac6f9cf70c2ca415e0749fb602e61
       000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e5831
       0000000000000000000000000000000000000000000000000000000000000348
```

---

## 8. Deployment History

| Date | Event | Transaction / Reference |
|---|---|---|
| 2026 | Vault deployed via `deploy-axusd-euler-earn-vault.js` | See `src/config/activeContracts.generated.ts` |
| 2026 | AXUSD/USD oracle adapter deployed + Blockscout-verified | `0x1862D3c85382c4f4b81a9a9e0d31b289963D70d6` |
| 2026 | USDC/USD oracle adapter deployed + Blockscout-verified | `0x49EBE245b8fAC6f9cF70c2Ca415e0749fB602E61` |
| 2026-04-17 | Audit confirms factory perspective verified; governed perspective pending | `documents/euler-axusd-earn-vault-audit.md` |
| 2026-04-17 | Diagnostic script shipped covering all Unknown-label root causes | `scripts/diagnose-axusd-vault-unknown.js` |
| TBD | Euler governance registers both oracle adapters | Pending submission review |
| TBD | Canonical EVK vault deployed + supply queue repointed | Task #92 |
| TBD | Ownership transferred to AXIOM Risk Council Safe | `documents/euler-axusd-risk-council-safe.md` |

---

## 9. Related Documents

| Document | Purpose |
|---|---|
| `documents/euler-axusd-earn-vault-audit.md` | Full on-chain audit log and secondary findings |
| `documents/euler-axusd-vault-unknown-fix.md` | Root-cause analysis and remediation plan for the "Unknown" labels |
| `documents/euler-axusd-ui-verification-checklist.md` | Step-by-step UI verification and 24h escalation path |
| `documents/euler-axusd-risk-council-safe.md` | Ownership transfer runbook and Safe deployment instructions |
| `documents/euler-adapter-submission-package/` | AXUSD/USD oracle adapter governance submission |
| `documents/euler-usdc-adapter-submission-package/` | USDC/USD oracle adapter governance submission |
| `src/config/activeContracts.generated.ts` | Single source of truth for all deployed contract addresses |
