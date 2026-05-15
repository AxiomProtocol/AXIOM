# AXIOM SUI PHASE 8 — KEY MANAGEMENT DESIGN

**Document type:** Key management architecture  
**Scope:** Axiom Sui Community Distribution Layer — AdminCap custody and multisig design  
**Date:** 2026-05-15  
**Status:** DESIGN COMPLETE — Key ceremony pending  
**Classification:** Internal / Operator — Handle with care

---

> **COMMUNITY DISTRIBUTION ONLY.** These key management procedures apply
> exclusively to the ATC community rewards token. No canonical Axiom assets
> (AXUSD, AXAU, AXM, SEED, KAG) are controlled by this key architecture.

---

## 1. Overview

The Axiom Sui distribution layer uses a single `AdminCap` object to control a `ClaimCampaign` shared object. The AdminCap:

- Is the sole authorization for `activate`, `pause`, `unpause`, `close_campaign`, `set_merkle_root`, `destroy_admin_cap`, and `transfer_admin_cap`
- Is a Sui object (not a cryptographic key) — it must be held in a wallet
- Cannot be duplicated or forged by design (Sui Move object model)

Because Sui does not natively support M-of-N multisig at the object level, this document describes a **2-of-3 off-chain coordination protocol** for AdminCap operations.

---

## 2. Key Holders

| Role | Designation | Responsibility |
|------|------------|----------------|
| Engineering Lead | Key Holder A | Deployment, contract operations, technical actions |
| Operations Lead | Key Holder B | Campaign activation, pause/unpause decisions |
| Emergency Recovery | Key Holder C | Break-glass: use only if A or B key is compromised |

**AdminCap wallet:** A dedicated Sui hot wallet controlled by Engineering Lead (Key Holder A) for routine operations. Operations Lead maintains a signing co-authorization record for all non-emergency operations.

---

## 3. 2-of-3 Off-Chain Coordination Protocol

Since the AdminCap is held in a single Sui address, a 2-of-3 multisig is implemented at the **process layer**:

### 3.1 Standard Operations (activate, pause, unpause, set_merkle_root)

1. **Proposal:** Engineering Lead drafts the intended action with a rationale document and timestamp.
2. **Co-authorization:** Operations Lead reviews and signs a co-authorization record (see Appendix A).
3. **Execution:** Engineering Lead executes the on-chain transaction.
4. **Audit log:** Both the proposal and co-authorization record are filed with the hash of the transaction.

**Minimum signers required for standard operations: 2 (Engineering Lead + Operations Lead)**

### 3.2 Emergency Operations (close_campaign, destroy_admin_cap, transfer_admin_cap)

Emergency operations require **all three** Key Holders to co-authorize before execution:

1. Engineering Lead + Operations Lead both sign the co-authorization record.
2. Emergency Recovery independently verifies the on-chain state matches the record.
3. Engineering Lead executes the transaction within 1 hour of the third co-authorization.

### 3.3 Break-Glass (Key Holder A compromised)

If Engineering Lead's wallet is suspected compromised:

1. Operations Lead immediately contacts Emergency Recovery.
2. Emergency Recovery verifies the AdminCap has not been moved (query Sui RPC).
3. If AdminCap is still at the registered address: Operations Lead and Emergency Recovery co-authorize an emergency `transfer_admin_cap` to a new wallet.
4. Engineering Lead is formally removed; replacement is appointed.
5. All three signers co-authorize the replacement appointment.

---

## 4. Key Generation Requirements

### AdminCap Wallet

- Generated on an air-gapped device or hardware security module (HSM)
- Sui address recorded in the deployment manifest
- Private key **never** stored in plaintext, version control, or environment variables
- Recommended: Ledger hardware wallet with Sui app

### Co-Authorization Record Storage

- Stored in the Axiom internal document vault (access-controlled)
- Each record is date-stamped, action-specific, and references the Sui transaction hash post-execution

---

## 5. Key Ceremony Procedure

The key ceremony establishes initial trust between the three Key Holders.

### Steps

1. **Preparation (T-7 days):** Each Key Holder generates or confirms their Sui address independently. No private key is shared.

2. **Ceremony meeting (T-0):** Engineering Lead, Operations Lead, and Emergency Recovery meet (in-person or secure video call).
   - Each Key Holder verbally confirms their Sui address.
   - Each Key Holder signs the Key Ceremony Attestation (see Appendix B) with their Sui wallet.
   - The AdminCap wallet address is recorded in the deployment manifest.

3. **Test operation (T+1 hour):** Engineering Lead executes a test `pause()` + `unpause()` cycle with Operations Lead co-authorization. All three Key Holders verify the events appeared on-chain.

4. **Ceremony record:** The attestations, Sui addresses, and test transaction hashes are filed in the Axiom document vault.

---

## 6. AdminCap Rotation Procedure

If a new campaign requires a different AdminCap holder:

1. All three Key Holders co-authorize the transfer.
2. Engineering Lead calls `transfer_admin_cap(cap, new_owner)`.
3. `AdminCapTransferred { campaign_id, new_owner }` event is emitted on-chain.
4. New Key Holder acknowledges receipt via a signed test transaction.
5. Deployment manifest is updated.

---

## 7. Operational Security Requirements

| Requirement | Status |
|-------------|--------|
| AdminCap wallet on hardware device | REQUIRED — Key ceremony pending |
| Private keys never in version control | ENFORCED — `.gitignore` and repo scanning active |
| Private keys never in environment variables | ENFORCED — No Sui private keys in `.env` or secrets |
| Co-authorization record before every admin action | REQUIRED — Process design complete |
| On-chain event verification after every action | REQUIRED — Operator dashboard at `/operator/chains/sui-phase8` |
| Quarterly key holder review | REQUIRED — Calendar pending |

---

## 8. Incident Response

| Incident | Response |
|----------|---------|
| AdminCap wallet private key suspected leaked | Immediately initiate break-glass procedure (§3.3) |
| AdminCap transferred without co-authorization | On-chain event `AdminCapTransferred` observed — immediately close campaign via emergency procedure |
| Campaign re-opened after intended close | Impossible — `is_closed` is permanent (A2) |
| Sui RPC unavailable | Campaign operations paused until RPC restored — `is_active` cannot be changed without on-chain tx |

---

## Appendix A — Co-Authorization Record Template

```
AXIOM SUI ADMIN ACTION CO-AUTHORIZATION
========================================
Date:               YYYY-MM-DD HH:MM UTC
Campaign ID:        0x...
Proposed action:    [activate | pause | unpause | set_merkle_root | close_campaign | transfer_admin_cap | destroy_admin_cap]
Rationale:          [plain language reason]

Engineering Lead (Key Holder A):
  Sui address:      0x...
  Signature:        [Ed25519 signature over SHA-256(this document)]
  Date:             YYYY-MM-DD HH:MM UTC

Operations Lead (Key Holder B):
  Sui address:      0x...
  Signature:        [Ed25519 signature over SHA-256(this document)]
  Date:             YYYY-MM-DD HH:MM UTC

Post-execution:
  Transaction hash: 0x...
  Block/epoch:      [epoch number]
  Verified by:      [name, date]
```

---

## Appendix B — Key Ceremony Attestation Template

```
AXIOM SUI KEY CEREMONY ATTESTATION
====================================
Date:               YYYY-MM-DD
Package ID:         0x...

I, [Full Name], acting as [Role], confirm that:
1. I have generated my Sui address independently on a secure device.
2. My Sui address is: 0x...
3. I have not shared my private key with any other party.
4. I understand my responsibilities as described in AXIOM_SUI_PHASE8_KEY_MANAGEMENT.md.
5. I acknowledge that all AdminCap operations require co-authorization from at least 2 of 3 Key Holders.

Signature (Sui):    [Sui transaction or message signature]
Date:               YYYY-MM-DD
```

---

*Axiom Protocol — Internal Operator Document — Phase 8 Staging*  
*Generated: 2026-05-15 — Not legal advice — Community distribution only*  
*Handle with care — Contains key management procedures*
