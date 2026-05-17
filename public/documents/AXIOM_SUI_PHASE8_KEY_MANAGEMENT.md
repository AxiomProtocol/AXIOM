# Axiom Protocol — Sui Phase 8 Key Management
## Deployer Key, AdminCap, and GuardedTreasury Custody Procedures

**Package:** axiom_sui  
**Network Target:** Sui Testnet → Mainnet  
**Document Date:** 2026-05-17  
**Classification:** Operator-Confidential

---

## Overview

Three key materials control the Axiom Sui campaign system:

| Material | Object Type | Holder | Risk if Compromised |
|---|---|---|---|
| Deployer Keypair | Off-chain Ed25519 | Deployer | Package publish, UpgradeCap |
| AdminCap | Sui object (key+store) | Admin address | Full campaign control |
| GuardedTreasury | Sui object (key+store) | Treasury address | Mint up to MAX_SUPPLY |

---

## 1. Deployer Keypair

### Purpose
Used once to publish the axiom_sui package. After publication, the deployer
keypair is used only to sign the initial `GuardedTreasury` transfer and
to destroy or transfer the `UpgradeCap`.

### Generation
Generate a dedicated deployment keypair using the Sui CLI:

```
sui keytool generate ed25519
```

Store the resulting mnemonic in a hardware security module (HSM) or an
offline cold storage device. Do not import this key into any hot wallet
or browser extension.

### Post-Deployment Procedure
1. Verify no UpgradeCap exists in the deployer's inventory:
   ```
   sui client objects --address <DEPLOYER_ADDRESS> | grep UpgradeCap
   ```
2. If an UpgradeCap exists, destroy it:
   ```
   sui client ptb --move-call <PKG>::<MODULE>::destroy_upgrade_cap \
     --arg <UPGRADE_CAP_ID>
   ```
3. Transfer `GuardedTreasury` to the treasury address (multisig recommended).
4. Archive and rotate the deployer keypair — it has no further function.

---

## 2. AdminCap Custody

### Purpose
Controls campaign activation, pausing, closure, and Merkle root updates.
One `AdminCap` is minted per campaign at `create()` time and transferred
to the admin address.

### Custody Model (Recommended)

**Testnet:** Single operator hot wallet acceptable for development.

**Mainnet:** Multi-party authorization is required. Options:

- **Sui MultiSig address** — Compose a 2-of-3 threshold address from three
  separate Ed25519 keypairs held by different operators. Transfer `AdminCap`
  to this multisig address.
  ```
  sui keytool multi-sig-address \
    --pks <PUB1> <PUB2> <PUB3> \
    --weights 1 1 1 \
    --threshold 2
  ```

- **Programmable Transaction + Timelock** — Wrap AdminCap in a timelock
  contract requiring a 24-hour delay before execution of sensitive operations
  (close_campaign, set_merkle_root).

### AdminCap Lifecycle

| Action | Who Signs | Event Emitted |
|---|---|---|
| activate() | Admin | None |
| pause() | Admin | CampaignPaused |
| unpause() | Admin | CampaignUnpaused |
| close_campaign() | Admin | CampaignClosed |
| set_merkle_root() | Admin | None |
| destroy_admin_cap() | Admin | AdminCapDestroyed |
| transfer_admin_cap() | Admin | AdminCapTransferred |

**Post-campaign closure checklist:**
- [ ] Confirm `is_closed = true` on-chain
- [ ] Call `destroy_admin_cap()` to prevent any future admin operations
- [ ] Verify `AdminCapDestroyed` event indexed off-chain

---

## 3. GuardedTreasury Custody

### Purpose
Wraps `TreasuryCap<AXIOM_TEST_CLAIM>` and enforces `MAX_SUPPLY`.
Required as a mutable argument in every `claim()` call.

### Risk Profile
Whoever holds the `GuardedTreasury` object can call `guarded_treasury::mint`
directly (bypassing the campaign Merkle check) up to `MAX_SUPPLY`. This is the
highest-risk object in the system.

### Custody Procedure (Mainnet)

1. Immediately after deployment, transfer `GuardedTreasury` from the deployer
   to a designated treasury multisig address:
   ```
   sui client ptb \
     --move-call sui::transfer::public_transfer \
     --type-args <PKG>::axiom_test_claim::AXIOM_TEST_CLAIM \
     --args <GUARDED_TREASURY_ID> <TREASURY_MULTISIG_ADDRESS>
   ```

2. The treasury multisig address should require at least 2-of-3 signers for
   any transaction that takes `GuardedTreasury` as a mutable argument.

3. Campaign-level minting flows through `claim_campaign::claim()`, which
   borrows `&mut GuardedTreasury` — the object never leaves the treasury
   address. The `claim()` caller (claimer) does not gain custody.

### Supply Monitoring
Query total minted at any time:
```typescript
const gt = await suiClient.getObject({ id: GUARDED_TREASURY_ID });
const minted = gt.data?.content?.fields?.minted;
const maxSupply = gt.data?.content?.fields?.max_supply;
```

Alert if `minted / max_supply > 0.80` (80% supply consumed).

---

## 4. Environment Variable Security

The following environment variables contain sensitive material and must never
be committed to version control or logged:

| Variable | Sensitivity | Notes |
|---|---|---|
| AXIOM_SUI_ADMIN_CAP_ID | High | Object ID of the AdminCap |
| AXIOM_SUI_GUARDED_TREASURY_ID | High | Object ID of GuardedTreasury |
| AXIOM_SUI_PACKAGE_ID | Medium | Publicly readable on-chain |
| AXIOM_SUI_RPC_URL | Low | Endpoint credential if authenticated |

Store all secrets in Replit Secrets / Vercel Environment Variables. Do not
construct object IDs from public sources in server-side code — always read
from the environment.

---

## 5. Incident Response

### Scenario: AdminCap address compromised

1. Immediately call `destroy_admin_cap()` from any co-signer if using multisig.
2. If single-key, the campaign cannot be administratively closed without the
   key — close the campaign via a governance vote or wait for epoch expiry.
3. Publish a public notice to the community within 24 hours.
4. Deploy a new campaign with a fresh AdminCap at a new multisig address.

### Scenario: GuardedTreasury object transferred to attacker

1. The attacker can mint up to `MAX_SUPPLY` tokens directly.
2. Immediately pause all active campaigns (via AdminCap if still held).
3. Publish a notice marking all ATC tokens as compromised.
4. Deploy a replacement package (new coin type) and new campaigns.
5. Snapshot pre-compromise balances for remediation airdrop.

### Scenario: Deployer key stolen post-deployment

If the package was deployed with no UpgradeCap, the attacker cannot modify
contracts. Risk is limited to any remaining objects in the deployer's inventory.
Ensure deployer inventory is empty after deployment (see Section 1).

---

*Internal operator document. Not for public distribution.*
*Axiom Protocol Engineering — Phase 8 — 2026-05-17*
