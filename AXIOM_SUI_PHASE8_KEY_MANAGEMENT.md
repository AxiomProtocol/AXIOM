# AXIOM SUI PHASE 8 — KEY MANAGEMENT DESIGN

**Phase:** 8 — Hardened Staging  
**Date:** 2026-05-16  
**Status:** DESIGN APPROVED — implementation is Phase 9 scope  
**Classification:** INTERNAL — not for public distribution

---

> **COMMUNITY DISTRIBUTION ONLY.** This document covers key management for
> the ATC testnet/community token only. No canonical Axiom assets are affected.

---

## 1. Key Inventory

| Key / Object | Type | Holder (Phase 8) | Target Holder (Phase 9) |
|-------------|------|------------------|------------------------|
| Deployer private key | Ed25519 | Engineering Lead | Retired after Phase 9 handoff |
| `AdminCap` | Sui owned object | Deployer wallet | 2-of-3 multisig |
| `GuardedTreasury<AXIOM_TEST_CLAIM>` | Sui owned object | Deployer wallet | 2-of-3 multisig |
| Move package (frozen) | Immutable | On-chain | On-chain (no change) |

---

## 2. Phase 8 Key Custody (Current State)

### 2.1 Deployer Wallet

- **Address:** `0x4917ffea5289fba211976448c50103ba96a86e49a57e4dd1f22222c3b412e5ad`
- **Network:** Sui Mainnet (Phase 9 candidate) + Sui Testnet (Phase 8 prototype)
- **Holds:** AdminCap, GuardedTreasury
- **Risk:** Single point of failure — mitigated in Phase 9 by multisig transfer

### 2.2 Package Immutability

Both the testnet prototype package (`0x4c3b...`) and the mainnet candidate package (`0xc330...`) are published as **frozen** (no `UpgradeCap` retained). The bytecode is immutable. No key management is required for the package itself — it cannot be changed.

---

## 3. Phase 9 Target: 2-of-3 Multisig Design

### 3.1 Signer Roster

| Signer | Role | Device | Storage |
|--------|------|--------|---------|
| Signer A | Engineering Lead | Hardware wallet (Ledger Nano X) | Offline cold storage |
| Signer B | Operations Lead | Hardware wallet (Ledger Nano X) | Offline cold storage |
| Signer C | Protocol Trustee | Hardware wallet (Trezor Model T) | Geographically separate |

**Threshold:** 2 of 3 signers required for any privileged operation.

### 3.2 Operations Requiring Multisig

| Operation | Reason |
|-----------|--------|
| `fund_campaign(AdminCap, ...)` | Adds tokens to live pool |
| `activate(AdminCap, ...)` | Opens claims to public |
| `pause(AdminCap, ...)` | Halts claims |
| `close_campaign(AdminCap, ...)` | Permanently closes campaign |
| `update_merkle_root(AdminCap, ...)` | Changes eligibility set |
| `destroy_admin_cap(AdminCap)` | Permanent key destruction |
| `transfer_admin_cap(AdminCap, ...)` | Key rotation |
| `guarded_mint(GuardedTreasury, ...)` | Token minting |

### 3.3 Multisig Setup (Sui PTB)

Sui native multisig is constructed as a MultiSig address derived from the three signer public keys and the threshold:

```bash
# Construct multisig address (Sui CLI)
sui keytool multi-sig-address \
  --pks <pubkey_A> <pubkey_B> <pubkey_C> \
  --weights 1 1 1 \
  --threshold 2
```

The resulting multisig address will hold AdminCap and GuardedTreasury after the Phase 9 handoff transaction.

### 3.4 Handoff Transaction (Phase 9)

```
PTB:
  1. claim_campaign::transfer_admin_cap(admin_cap, MULTISIG_ADDR)
  2. transfer::public_transfer(guarded_treasury, MULTISIG_ADDR)
```

Both transfers must occur in a single PTB to prevent partial handoff.

---

## 4. Key Rotation Procedures

### 4.1 Compromised Signer Key

1. Remaining two signers construct a new 2-of-3 multisig with a replacement signer.
2. Transfer AdminCap and GuardedTreasury to the new multisig address via `transfer_admin_cap()`.
3. Emit on-chain `AdminCapTransferred` event — provides verifiable audit trail.
4. Update this document and notify the protocol team.

### 4.2 AdminCap Destruction (Emergency)

If a campaign must be permanently terminated and the AdminCap is at risk of compromise:

1. Quorum (2-of-3) signs a `destroy_admin_cap(admin_cap)` call.
2. This emits `AdminCapDestroyed` and deletes the object permanently.
3. The campaign becomes operator-permanently-read-only — no further privileged calls possible.
4. Any remaining pool funds are lost (no drain is possible without AdminCap).

**Consequence:** Destructive and irreversible. Only use in an active-compromise scenario.

---

## 5. Backup and Recovery

### 5.1 Hardware Wallet Backup

Each signer's key is backed up as a 24-word BIP-39 mnemonic:
- Stored in a tamper-evident sealed envelope.
- Kept in a physically separate secure location from the hardware wallet.
- Tested for recovery at protocol setup.

### 5.2 Quorum Loss Scenario

If two or more signer keys are simultaneously lost:
- AdminCap and GuardedTreasury become permanently inaccessible.
- The campaign cannot be activated, funded, closed, or modified.
- The package is frozen and unaffected.
- All previously claimed tokens remain valid.

**Risk classification:** LOW (requires simultaneous loss of 2 independent hardware wallets with separately stored backups).

---

## 6. Operational Security Checklist

Before any privileged operation (Phase 9):

- [ ] All three hardware wallets verified operational
- [ ] Quorum (2-of-3) physically co-present or confirmed via secure channel
- [ ] Transaction inspected on hardware wallet display before signing
- [ ] On-chain transaction confirmed on Sui Explorer after signing
- [ ] Event log verified to contain expected event
- [ ] This document updated if key roster changes

---

*This is a design document. Actual key generation and storage must follow a supervised ceremony before Phase 9 promotion.*
