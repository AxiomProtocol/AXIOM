# AXIOM SUI PHASE 8 — AUTHORIZATION MODEL

**Package:** `axiom_claim_mainnet_candidate`
**Date:** 2026-05-16
**Classification:** Internal Operations

---

## 1. Authorization Primitive

The `axiom_claim_mainnet_candidate` package uses **capability-based authorization** via Move's linear type system.

**AdminCap** (`axiom_claim_mainnet_candidate::claim_campaign::AdminCap`) is the sole authorization object for campaign administration. It is:
- A **Move object** (`has key, store`) — exists as a unique on-chain object
- **Non-copyable** — cannot be duplicated or forged
- **Transferable** — can be passed to a new address via `transfer_admin_cap`
- **Destroyable** — can be permanently deleted via `destroy_admin_cap`

No role-based or allowlist authorization is used. The AdminCap holder is authorized for all admin operations.

---

## 2. Function Authorization Matrix

### Public Entry Functions

| Function | Authorization Required | Who Can Call |
|---|---|---|
| `create_campaign_entry` | None | Any address |
| `fund_campaign` | `&AdminCap` | AdminCap holder only |
| `activate` | `&AdminCap` | AdminCap holder only |
| `claim` | Merkle proof (caller is leaf) | Any address with valid proof |
| `pause` | `&AdminCap` | AdminCap holder only |
| `unpause` | `&AdminCap` | AdminCap holder only |
| `update_merkle_root` | `&AdminCap` | AdminCap holder only |
| `close_campaign` | `&AdminCap` | AdminCap holder only |

### Public Functions

| Function | Authorization Required | Who Can Call |
|---|---|---|
| `destroy_admin_cap` | Ownership of `AdminCap` (consumes) | AdminCap holder only |
| `transfer_admin_cap` | Ownership of `AdminCap` (consumes) | AdminCap holder only |

### Test-Only Accessors
Read-only; no authorization; `#[test_only]` gated — not accessible in production.

---

## 3. Claim Authorization — Merkle Proof Flow

The `claim` function uses **cryptographic authorization** via Merkle proof:

```
claimant address → BCS(address) || BCS(amount) → keccak256 → leaf hash
proof = [sibling₀, sibling₁, ..., siblingₙ]
verify_proof(proof, campaign.merkle_root, leaf) → true/false
```

The claimant is `tx_context::sender(ctx)` — derived from the transaction signature, not caller-supplied. A valid proof proves that the sender's address and their allocated amount are included in the Merkle tree committed to by the campaign's `merkle_root`.

**Authorization chain:**
1. Campaign operator generates eligibility list (off-chain)
2. `validateEligibilityCsv` validates list format and deduplication
3. `buildMerkleTree` constructs tree; root committed on-chain via `create_campaign` or `update_merkle_root`
4. `generateProof` produces individual proofs for each eligible address
5. Eligible user submits proof in `claim` transaction; on-chain verification in `merkle::verify_proof`

---

## 4. Multi-Party Authorization (Operational Layer)

The smart contract enforces single-key AdminCap control. Operational multi-party authorization is enforced off-chain:

### 4.1 Approval Thresholds

| Operation Risk Level | Minimum Approvers | Method |
|---|---|---|
| Low (fund, activate, pause) | 1 authorized operator | Off-chain sign-off in ops log |
| Medium (unpause, root update) | 2 authorized operators | Dual sign-off; root hash audit trail |
| High (close, destroy/transfer cap) | 2 operators + Protocol Lead | Formal ceremony with audit log |

### 4.2 Merkle Root Commit Authorization
Root update is the highest-risk admin operation because it controls who can claim:

1. **Eligibility author** generates CSV and root hash
2. **Independent verifier** runs `validateEligibilityCsv` and `buildMerkleTree` independently; confirms root hash matches
3. Both parties sign off in ops log with: timestamp, CSV hash (SHA-256), Merkle root hex
4. Root update transaction submitted only after dual sign-off

### 4.3 Multi-Sig Option
For production deployments, transfer AdminCap to a Sui multi-sig address:

```bash
# Example: 2-of-3 Sui multi-sig
sui keytool multi-sig-address \
  --pks <pubkey1> <pubkey2> <pubkey3> \
  --weights 1 1 1 \
  --threshold 2
```

AdminCap can then only be exercised when 2 of 3 keyholders co-sign each transaction. All admin functions accept `&AdminCap` by reference — they work transparently with multi-sig owned caps.

---

## 5. Claim Lifecycle Authorization State Machine

```
[CREATED — not active, not closed]
     │
     │ activate() [AdminCap]
     ▼
[ACTIVE — claims open]
     │                    │
     │ pause() [AdminCap] │ claim() [Merkle proof, sender auth]
     ▼                    ▼
[PAUSED]          [ACTIVE — pool decremented]
     │
     │ unpause() [AdminCap] — only if !is_closed
     │ update_merkle_root() [AdminCap] — only when !is_active
     ▼
[ACTIVE]
     │
     │ close_campaign() [AdminCap]
     ▼
[CLOSED — permanent, irrecoverable]
  Pool drained → returned to AdminCap holder
  unpause() → aborts ECampaignAlreadyClosed (8)
```

---

## 6. Off-Chain Authorization — API Layer

The Axiom API backend (`pages/api/sui/`) is read-only — it queries chain state and generates proofs but does not sign or submit transactions. No private keys are held by the API layer.

| API Route | Authorization | Action |
|---|---|---|
| `GET /api/sui/campaigns` | None (public) | List active campaigns |
| `GET /api/sui/campaigns/[id]` | None (public) | Campaign details + pool |
| `GET /api/sui/eligibility` | None (public) | Proof generation for caller |
| `GET /api/sui/claim-status` | None (public) | Whether address has claimed |

Proof generation is public — knowing your proof does not help a non-eligible address since the on-chain `verify_proof` still gates the actual claim.

---

## 7. Emergency Authorization Procedures

### Immediate Campaign Pause
Any single authorized operator can pause without multi-party approval. Execute immediately upon:
- Suspected merkle root compromise
- Pool funding from unauthorized source
- Any on-chain anomaly

### AdminCap Emergency Transfer
If operator key is suspected compromised and cap is still accessible:
1. Transfer AdminCap to known-safe address immediately
2. Pause campaign using new address
3. Rotate operator key; update ops log

### If AdminCap is inaccessible (key lost):
- Campaign cannot be paused or closed via smart contract
- Claims may continue until pool is exhausted or expiry epoch
- Deploy new campaign in Phase 10 with remaining distribution
