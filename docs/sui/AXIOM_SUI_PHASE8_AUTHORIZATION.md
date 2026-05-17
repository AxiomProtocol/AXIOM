## AXIOM PROTOCOL — SUI PHASE 8 AUTHORIZATION MODEL

Date: 2026-05-17
Scope: Who can do what in the SUI claim campaign system, and how authorization is enforced at every layer.

---

### AUTHORIZATION ARCHITECTURE

The system enforces authorization at three layers:

1. **On-chain (Move VM)** — capability objects, capability ID validation, state machine guards
2. **API layer (Next.js)** — read-only routes only; no write operations exposed to anonymous callers
3. **Operator UI** — operator dashboard at `/operator/chains/sui-phase8` requires `cap_operator_key` cookie authentication; all write operations display Sui CLI commands for offline signing rather than executing transactions directly

---

### ROLE MATRIX

| Operation | Required Capability | Where Enforced |
|---|---|---|
| Create campaign | None (any caller) | Not restricted on-chain |
| Fund campaign | AdminCap (correct campaign) | `E_WRONG_CAMPAIGN` on mismatch |
| Activate campaign | AdminCap (correct campaign) | `E_WRONG_CAMPAIGN` on mismatch |
| Pause campaign | AdminCap (correct campaign) | `E_WRONG_CAMPAIGN` on mismatch |
| Close campaign | AdminCap (correct campaign) | `E_WRONG_CAMPAIGN` on mismatch |
| Drain pool | AdminCap + campaign must be closed | `E_WRONG_CAMPAIGN`, `E_NOT_ACTIVE` |
| Claim AMC | Valid Merkle proof for sender | `E_INVALID_PROOF` |
| Deposit to treasury | TreasuryOperatorCap (correct treasury) | `E_CAP_MISMATCH` |
| Withdraw from treasury | TreasuryOperatorCap (correct treasury) | `E_CAP_MISMATCH`, `E_INSUFFICIENT_BALANCE` |
| take_balance (treasury) | Package-internal only | `public(package)` visibility |

Note: `create_campaign_entry()` is publicly callable (no capability required). This is intentional — the AdminCap returned to the creator is the privilege mechanism. Anyone can create a campaign, but only the AdminCap holder can fund and activate it. Protocol-owned campaigns should restrict the deployer address via off-chain governance rather than on-chain ACL, which would require contract upgrades.

---

### STATE MACHINE GUARDS

ClaimCampaign transitions:

```
CREATED (is_active=false, is_closed=false)
    → [activate(AdminCap)] → ACTIVE (is_active=true)
    → [pause(AdminCap)]    → PAUSED (is_active=false)
    → [close_campaign(AdminCap)] → CLOSED (is_active=false, is_closed=true) [terminal]
```

Claim eligibility requires ALL of the following simultaneously:
- `is_active == true`
- `is_closed == false`
- `epoch < expires_at_epoch` (if expires_at_epoch > 0)
- `balance::value(&pool) >= amount_per_claim`
- `Merkle proof valid for (sender, amount_per_claim)`

Any single condition failing aborts the transaction with the corresponding error code.

---

### CAPABILITY BINDING

AdminCap binds to its campaign via `campaign_id: ID`. The binding is set at creation and is immutable (no setter exists). The validation is:

```move
assert!(cap.campaign_id == object::id(campaign), E_WRONG_CAMPAIGN);
```

This is checked on every admin operation: fund, activate, pause, close, drain.

TreasuryOperatorCap binds to its treasury via `treasury_id: ID`. Validated by `assert_cap_matches()` on deposit and withdraw:

```move
assert!(cap.treasury_id == object::id(treasury), E_CAP_MISMATCH);
```

These bindings prevent "confused deputy" attacks where a cap for one object is mistakenly (or maliciously) applied to another.

---

### CLAIM AUTHORIZATION — MERKLE PROOF

The claim authorization model is a Merkle-gated allow-list:

1. Off-chain: operator builds a Merkle tree from `(address, amount)` pairs using `buildMerkleTree(entries)`
2. Root is stored on-chain in `ClaimCampaign.merkle_root`
3. Claimant generates proof using `generateProofFromEntries(target, allEntries)`
4. On claim: the contract calls `merkle::verify(leaf, proof, merkle_root)` where `leaf = keccak256(addr ++ amount_le8)`
5. If the proof is valid, the claimant receives `amount_per_claim` AMC tokens regardless of what `amount` they passed

Note: The `amount` parameter in `claim()` must equal `campaign.amount_per_claim` exactly (enforced by `assert!(amount == campaign.amount_per_claim, E_ZERO_AMOUNT)`). The Merkle proof is over the claimant's individual amount, which must also equal amount_per_claim for homogeneous campaigns. Variable-amount campaigns would require a different leaf encoding.

---

### API AUTHORIZATION

All API routes under `/api/sui/` are unauthenticated GET/POST for read operations. No Sui write transactions are initiated server-side.

The operator dashboard at `/operator/chains/sui-phase8` is protected by the `cap_operator_key` middleware (same as all `/operator/*` routes). This page displays campaign state and provides CLI command templates — it does not execute Sui transactions.

Eligibility proof generation (`POST /api/sui/eligibility`) accepts a user-supplied CSV and generates a Merkle proof in memory. The proof is returned to the caller but not stored. The server verifies the proof against the on-chain campaign root before returning it (local verification step), ensuring the returned proof will succeed on-chain.

---

### MULTI-SIGNATURE REQUIREMENTS

**Production recommendation**: All AdminCap and TreasuryOperatorCap operations should require M-of-N multisig:

- Minimum: 2-of-3 (two operators must co-sign every campaign lifecycle change)
- Preferred: 3-of-5 (higher fault tolerance, still operationally practical)

**Current phase status**: Phase 8 is a testnet deployment. Single-signer AdminCap acceptable for testnet. Multisig required before any mainnet deployment.

---

### EXPIRY AND EMERGENCY PAUSE

**Expiry**: Campaign operators can set `expires_at_epoch` at creation time. After the epoch passes, all claims fail with `E_EXPIRED`. The campaign remains open (is_active=true) in the state machine — the expiry is enforced at the claim level, not the campaign level.

**Emergency pause**: Call `pause(campaign, cap)` to immediately halt all claims. This is a non-terminal operation — the campaign can be re-activated after an investigation.

**Emergency close**: Call `close_campaign(campaign, cap)` followed by `drain_pool(campaign, cap, recipient)`. This is terminal — once closed, the campaign cannot be reopened. The remaining pool balance is returned to the designated recipient.

There is no on-chain timelock on these emergency operations. For production, recommend imposing a multisig signature delay (e.g., 24h timelock for close_campaign) via off-chain governance.

---

### ERROR CODES REFERENCE

| Code | Constant | Meaning |
|---|---|---|
| 0 | E_NOT_ACTIVE | Claim attempted on paused/inactive campaign |
| 1 | E_CAMPAIGN_CLOSED | Admin operation attempted on closed campaign |
| 2 | E_ALREADY_CLAIMED | Address has already claimed (ClaimRecord exists) |
| 3 | E_INVALID_PROOF | Merkle proof did not verify against root |
| 4 | E_EXPIRED | Current epoch >= expires_at_epoch |
| 5 | E_ZERO_AMOUNT | amount_per_claim is zero, or amount mismatch |
| 6 | E_POOL_EMPTY | Pool balance < amount_per_claim |
| 7 | E_LABEL_TOO_LONG | Label exceeds 128 bytes |
| 8 | E_WRONG_CAMPAIGN | AdminCap campaign_id does not match campaign |
| 1 (guarded_treasury) | E_CAP_MISMATCH | TreasuryOperatorCap does not match treasury |
| 2 (guarded_treasury) | E_INSUFFICIENT_BALANCE | Withdrawal exceeds pool balance |
| 1 (merkle) | E_PROOF_TOO_DEEP | Proof depth exceeds MAX_PROOF_DEPTH (32) |

---

CLASSIFICATION: INTERNAL OPERATOR DOCUMENT
