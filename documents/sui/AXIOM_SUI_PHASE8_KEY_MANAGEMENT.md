# Axiom Protocol — Sui Phase 8 Key Management

**Module:** `axiom::claim_campaign`, `axiom::guarded_treasury`
**Date:** 2026-05-16
**Status:** Operational Guidance — Pre-Deployment

---

## Overview

This document defines the key management requirements, object capability lifecycle, and operational procedures for the Axiom Sui Phase 8 deployment. It covers:

- Deployer keypair management
- `AdminCap` post-deployment handling
- `TreasuryOperatorCap` custody
- Multi-party authorization configuration
- Upgrade cap disposition

---

## Capability Objects

### 1. Deployer Keypair

The deployer keypair signs the package publish transaction. After deployment:

- The deployer address receives the `AdminCap` for each campaign created via `create_campaign_entry`.
- The deployer address receives the `TreasuryOperatorCap` when `guarded_treasury::create()` is called.
- **The deployer keypair must be rotated out immediately after deployment.** It should not hold operational caps.

**Recommended storage:** Hardware wallet (Ledger) with Sui app, or Shamir secret sharing across 3-of-5 keyholders.

**Environment variable:** `AXIOM_SUI_DEPLOYER_ADDRESS` (public address only — never store the private key in environment secrets).

---

### 2. AdminCap

`AdminCap` authorizes:
- `fund_campaign` — deposit AMC into the campaign pool
- `activate` — open the campaign for claims
- `pause` — temporarily halt claims
- `close_campaign` — permanently end the campaign
- `drain_pool` — recover remaining pool balance after closure

**Recommended custody:** Transfer to a protocol-controlled multi-party authorization address (on-chain multisig or Sui's native `multisig` key type) immediately after `create_campaign_entry`.

```
sui client transfer --to <MULTISIG_ADDRESS> --object-id <ADMIN_CAP_ID> --gas-budget 10000000
```

**Recovery:** If the AdminCap is transferred to an inaccessible address, the campaign cannot be paused, funded additionally, or closed. Drain is also blocked. Plan the AdminCap transfer carefully.

---

### 3. TreasuryOperatorCap

`TreasuryOperatorCap` authorizes:
- `deposit` — add coins to the `GuardedTreasury` pool
- `withdraw` — remove coins from the treasury to a recipient

**Recommended custody:** Same multisig as the AdminCap, or a separate treasury-specific multisig for larger operations.

**Object ID tracking:** Record `TreasuryOperatorCap` object ID in the deployment manifest. It is emitted in the `TreasuryCreated` event.

---

### 4. Package Upgrade Cap

The Sui framework issues an `UpgradeCap` on every `sui client publish`. For Phase 8:

| Environment | Recommended Action |
|-------------|-------------------|
| Testnet | Retain for iteration |
| Mainnet | Burn the UpgradeCap OR lock behind a 48-hour timelock multisig |

**Burning the UpgradeCap** makes the package immutable — no further upgrades possible. This is the highest-security option but eliminates the ability to patch bugs.

**Timelocked multisig** requires N-of-M signers plus a 48-hour waiting period before any upgrade takes effect, providing an emergency window.

---

## Deployment Procedure

### Pre-Deployment Checklist

- [ ] Hardware wallet configured with Sui app
- [ ] Testnet deployment and 24-hour soak test completed
- [ ] Sui address funded with sufficient SUI for gas (minimum 0.5 SUI recommended)
- [ ] Merkle tree built and root verified against TypeScript `buildMerkleTree.ts`
- [ ] Campaign parameters documented (label, amount_per_claim, expires_at_epoch)
- [ ] Multisig address confirmed and tested on testnet

### Deployment Steps

```bash
# 1. Publish package
sui client publish --gas-budget 100000000 contracts/sui

# 2. Record outputs
#    - Package ID → AXIOM_SUI_PACKAGE_ID
#    - UpgradeCap object ID (to burn or lock)

# 3. Create GuardedTreasury
sui client call \
  --package <PACKAGE_ID> \
  --module guarded_treasury \
  --function create \
  --type-args "<PACKAGE_ID>::amc::AMC" \
  --gas-budget 10000000

# 4. Record TreasuryOperatorCap object ID → AXIOM_SUI_GUARDED_TREASURY_ID

# 5. Transfer TreasuryOperatorCap to multisig
sui client transfer --to <MULTISIG_ADDRESS> --object-id <TREASURY_CAP_ID> --gas-budget 5000000

# 6. Create campaign
sui client call \
  --package <PACKAGE_ID> \
  --module claim_campaign \
  --function create_campaign_entry \
  --args <LABEL_BYTES> <MERKLE_ROOT_BYTES> <AMOUNT_PER_CLAIM> <EXPIRES_AT_EPOCH> \
  --gas-budget 10000000

# 7. Record AdminCap object ID, transfer to multisig
sui client transfer --to <MULTISIG_ADDRESS> --object-id <ADMIN_CAP_ID> --gas-budget 5000000
```

---

## Environment Variables

| Variable | Purpose | Where Set |
|----------|---------|-----------|
| `AXIOM_SUI_PACKAGE_ID` | Deployed package address | Replit secret |
| `AXIOM_SUI_ADMIN_CAP_ID` | AdminCap object ID (multisig-held) | Replit secret |
| `AXIOM_SUI_GUARDED_TREASURY_ID` | GuardedTreasury object ID | Replit secret |
| `AXIOM_SUI_NETWORK` | `mainnet` or `testnet` | Replit secret |
| `AXIOM_SUI_DEPLOYER_ADDRESS` | Deployer public address for indexing | Replit secret |
| `NEXT_PUBLIC_AXIOM_SUI_NETWORK` | Client-side network indicator | Next.js env |

---

## Key Rotation

If any capability object is compromised:

1. **AdminCap compromised:** The campaign cannot be safely paused. Contact Sui Foundation's security team. Future campaigns should use a fresh package deployment.

2. **TreasuryOperatorCap compromised:** Immediately drain the treasury to a cold address (requires the existing cap — if cap is inaccessible, funds are locked). Plan: always keep a quorum of keyholders available.

3. **Deployer keypair compromised:** Rotate the keypair. The deployer address has no on-chain authority after caps are transferred; compromise only affects future deployments signed by that key.

---

## Incident Response

| Scenario | Action |
|----------|--------|
| Suspected unauthorized claim | Query `ClaimMade` events, compare against eligibility list |
| Pool draining anomaly | Pause campaign via AdminCap multisig |
| Merkle root compromise | Close campaign, deploy new campaign with corrected root |
| Smart contract bug discovered | Close campaign, drain pool, redeploy corrected package |
