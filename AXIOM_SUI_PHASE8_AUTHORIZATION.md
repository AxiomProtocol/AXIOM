# Axiom Protocol — Sui Phase 8 Authorization Model

**Package:** `axiom`
**Date:** 2026-05-16
**Classification:** Internal Operations

---

## Overview

The Phase 8 authorization model uses Sui's native object capability pattern. There are no role-based access control registries, no admin lists, and no oracle-controlled permissions. Authorization is entirely determined by object possession.

---

## Capability Matrix

| Operation | Required Capability | Abort Code |
|---|---|---|
| `create_campaign_entry` | None (anyone can create) | — |
| `fund_campaign` | AdminCap (matching campaign_id) | E_WRONG_CAMPAIGN = 8 |
| `activate` | AdminCap (matching campaign_id) | E_WRONG_CAMPAIGN = 8 |
| `pause` | AdminCap (matching campaign_id) | E_WRONG_CAMPAIGN = 8 |
| `close_campaign` | AdminCap (matching campaign_id) | E_WRONG_CAMPAIGN = 8 |
| `drain_pool` | AdminCap (matching campaign_id) | E_WRONG_CAMPAIGN = 8 |
| `claim` | Valid Merkle proof + active + not expired | E_INVALID_PROOF = 3 |
| `guarded_treasury::deposit` | TreasuryOperatorCap | E_CAP_MISMATCH = 1 |
| `guarded_treasury::withdraw` | TreasuryOperatorCap | E_CAP_MISMATCH = 1 |

---

## Authorization Flow

### Campaign Admin Flow

```
Operator (multisig)
  │
  ├─ holds AdminCap (key, store object)
  │
  ├─ fund_campaign(campaign_mut, coins, &admin_cap)
  │    └─ assert cap.campaign_id == campaign.id ──→ OK or E_WRONG_CAMPAIGN
  │
  ├─ activate(campaign_mut, &admin_cap, ctx)
  │    └─ assert !is_closed ──→ OK or E_CAMPAIGN_CLOSED
  │    └─ assert cap.campaign_id == campaign.id ──→ OK or E_WRONG_CAMPAIGN
  │
  ├─ pause(campaign_mut, &admin_cap, ctx)
  │    └─ (same guards)
  │
  └─ close_campaign(campaign_mut, &admin_cap, ctx)
       └─ Sets is_closed = true (permanent, no reopen)
```

### Claimant Flow

```
Claimant (any address)
  │
  └─ claim(campaign_mut, proof, amount, ctx)
       │
       ├─ Check: expires_at_epoch > 0 → epoch < expires_at_epoch
       │         or abort E_EXPIRED (4)
       │
       ├─ Check: is_active == true or abort E_NOT_ACTIVE (0)
       │
       ├─ Check: !is_closed or abort E_CAMPAIGN_CLOSED (1)
       │
       ├─ Check: amount == amount_per_claim or abort E_ZERO_AMOUNT (5)
       │
       ├─ Check: pool_balance >= amount or abort E_POOL_EMPTY (6)
       │
       ├─ Compute: leaf = keccak256(sender_addr ++ amount_le8)
       │
       ├─ Verify: merkle::verify(leaf, proof, root) or abort E_INVALID_PROOF (3)
       │          (A1: depth <= 32 or abort E_PROOF_TOO_DEEP)
       │
       ├─ Write: ClaimRecord → transfer to sender  (A5: record BEFORE payout)
       │
       └─ Transfer: Coin<AMC>(amount) → sender
```

### GuardedTreasury Flow

```
Treasury Operator (multisig)
  │
  ├─ holds TreasuryOperatorCap (key, store)
  │
  ├─ deposit(treasury_mut, &cap, coins, ctx)
  │    └─ assert cap.treasury_id == treasury.id ──→ OK or E_CAP_MISMATCH
  │
  └─ withdraw(treasury_mut, &cap, amount, recipient, ctx)
       └─ assert cap.treasury_id == treasury.id ──→ OK or E_CAP_MISMATCH
       └─ assert balance >= amount ──→ OK or E_INSUFFICIENT_BALANCE
```

---

## Object Capability Security Properties

### Non-Forgeable
Capabilities are Sui objects with `key` ability. They cannot be forged — only created by the module that defines them. `AdminCap` is created only in `create_campaign_entry`. `TreasuryOperatorCap` is created only in `guarded_treasury::create`.

### Non-Duplicable
Move's type system prevents copying of objects with `key` but not `copy`. `AdminCap` and `TreasuryOperatorCap` cannot be duplicated.

### Bound by Identity
Every authorization check validates `cap.campaign_id == object::id(campaign)`. Capabilities from one campaign cannot authorize operations on another campaign.

### Transferable (Intentional)
Both caps have `store` ability — they can be wrapped in multisig wallets or transferred between authorized parties. This is intentional for multisig management. The risk of unauthorized transfer is mitigated by the identity binding check.

---

## Error Code Reference

| Code | Constant | Trigger |
|---|---|---|
| 0 | E_NOT_ACTIVE | Claim on paused campaign |
| 1 | E_CAMPAIGN_CLOSED | Admin op on closed campaign |
| 2 | E_ALREADY_CLAIMED | (Reserved — not currently enforced on-chain) |
| 3 | E_INVALID_PROOF | Merkle proof verification fails |
| 4 | E_EXPIRED | Claim after expires_at_epoch |
| 5 | E_ZERO_AMOUNT | amount_per_claim = 0, or claim amount mismatch |
| 6 | E_POOL_EMPTY | Pool has insufficient balance for payout |
| 7 | E_LABEL_TOO_LONG | Campaign label > 128 bytes |
| 8 | E_WRONG_CAMPAIGN | AdminCap campaign_id ≠ campaign object ID |

---

## Authorization Gaps and Mitigations

### Gap 1: No On-Chain Claimant Deduplication

**Description:** The contract does not prevent an address from claiming twice if it appears twice in the Merkle tree.

**Mitigation:** The TypeScript `validateEligibilityCsv.ts` tool checks for duplicate addresses and rejects CSVs with duplicates. Merkle tree construction from unique-address CSV prevents duplicate leaves.

**Recommendation for high-value campaigns:** Add `Table<address, bool>` inside `ClaimCampaign` and check/set before payout.

### Gap 2: AdminCap on EOA

**Description:** If `create_campaign_entry` is called from an EOA, AdminCap lands on the EOA. There is no on-chain enforcement requiring immediate multisig transfer.

**Mitigation:** Deploy procedures require multisig transfer in same PTB. Audited via `CampaignCreated` event — monitor `admin_cap_id` transfer destination.

### Gap 3: No Emergency Pause Without AdminCap

**Description:** If AdminCap is lost or the holding address is compromised, there is no emergency pause mechanism.

**Mitigation:** Campaign expiry (`expires_at_epoch`) provides a time-limited backstop. All campaigns must have an expiry set. Incident response: create a new campaign, announce migration.

---

## PTB Construction Guidelines

### Create + Activate in Single PTB (Recommended)

```
PTB:
  1. create_campaign_entry(label, root, amount, expiry)
     → returns AdminCap to sender
  2. activate(campaign_id, AdminCap, ctx)
  3. transfer AdminCap to multisig_address
```

This atomically creates, activates, and secures the cap in one transaction. If step 3 fails (multisig address wrong), the whole PTB reverts.

### Fund Campaign

```
PTB (from multisig):
  1. SplitCoins(Coin<AMC>, [fund_amount])
  2. fund_campaign(campaign_id, split_coin, AdminCap)
```

### Close + Drain

```
PTB (from multisig):
  1. close_campaign(campaign_id, AdminCap)
  2. drain_pool(campaign_id, AdminCap, treasury_address)
```
