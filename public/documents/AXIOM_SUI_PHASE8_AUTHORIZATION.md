# Axiom Protocol — Sui Phase 8 Authorization Model
## Campaign Lifecycle, Claim Authorization, and Deployment Checklist

**Package:** axiom_sui  
**Network Target:** Sui Testnet → Mainnet  
**Document Date:** 2026-05-17

---

## 1. Authorization Model Overview

The axiom_sui package uses a **capability-based authorization model**.
Every privileged operation requires presenting a specific Sui object
(a capability) as an argument. Capabilities cannot be forged.

| Operation | Required Capability | Notes |
|---|---|---|
| create() | None | Anyone can create; cap returned to caller |
| activate() | &AdminCap | campaign_id must match |
| pause() | &AdminCap | |
| unpause() | &AdminCap | Blocked if is_closed |
| close_campaign() | &AdminCap | Permanent; irreversible |
| set_merkle_root() | &AdminCap | Blocked if is_closed |
| destroy_admin_cap() | AdminCap (by value) | Consumes the cap |
| transfer_admin_cap() | AdminCap (by value) | Moves cap to new owner |
| claim() | None + valid Merkle proof | Claimer is tx sender |
| guarded_treasury::mint() | &mut GuardedTreasury | Only via claim() in normal flow |

---

## 2. Campaign Lifecycle State Machine

```
         create()
            |
            v
      [INACTIVE / PAUSED]
            |
        activate()
            |
            v
         [ACTIVE] <──────────────────────┐
            |                            │
         pause()                    unpause()
            |                            │
            v                            │
        [PAUSED] ────────────────────────┘
            |
      close_campaign()
            |
            v
         [CLOSED] ── (terminal; no further state changes)
```

### State Transition Rules

- `INACTIVE → ACTIVE`: `activate()` with valid AdminCap
- `ACTIVE → PAUSED`: `pause()` with valid AdminCap
- `PAUSED → ACTIVE`: `unpause()` with valid AdminCap (if not closed)
- `ANY → CLOSED`: `close_campaign()` with valid AdminCap (irreversible)
- Claims accepted: state == ACTIVE and epoch <= expires_at_epoch (or 0)

---

## 3. Claim Authorization Flow

A claim is authorized by the intersection of four independent checks,
all evaluated inside `claim_campaign::claim()`:

```
Request: claim(campaign, treasury, amount, proof, ctx)

Check 1 — Campaign not closed:
  assert!(!campaign.is_closed, ECampaignAlreadyClosed)

Check 2 — Campaign active:
  assert!(campaign.is_active, ECampaignInactive)

Check 3 — Epoch within window:
  assert!(epoch == 0 || current_epoch <= expires_at_epoch, ECampaignExpired)

Check 4 — Zero amount guard:
  assert!(amount > 0, EZeroClaimAmount)

Check 5 — Not already claimed (table lookup):
  assert!(!table::contains(&campaign.claimed, sender), EAlreadyClaimed)

Check 6 — Merkle proof valid (A1 depth guard inside verify_proof):
  leaf = keccak256(BCS(sender) || BCS(amount))
  assert!(merkle::verify_proof(root, leaf, proof), EInvalidProof)

  Mint via GuardedTreasury (A5 supply cap inside mint()):
    assert!(amount > 0, EZeroMintAmount)
    assert!(minted + amount <= max_supply, ESupplyCapExceeded)

table::add(claimed, sender, true)  ← add-before-transfer pattern

Return: Coin<T> to caller
```

The **add-before-transfer** pattern (marking claimed before minting) ensures
that even if the coin transfer somehow re-enters the claim function, the
double-claim check fires first. This is belt-and-suspenders given Move's
linear type system already prevents reentrancy.

---

## 4. Merkle Tree Authorization

### Leaf Encoding

```
leaf = keccak256(BCS(addr)[32 bytes] || BCS(amount_u64)[8 bytes LE])
```

This matches `computeLeaf()` in `lib/sui/proofs/buildMerkleTree.ts` exactly.

### Root Computation

```
branch = keccak256(lex_min(a, b) || lex_max(a, b))
```

Canonical (lexicographic) ordering of siblings ensures the root is
deterministic regardless of the order entries are processed.

### Proof Validation Constraints

- Maximum proof depth: 20 (supports up to 2^20 = 1,048,576 entries)
- Proof elements: 32-byte keccak256 digests
- Empty proof: valid only for single-entry trees (leaf == root)

### CSV Eligibility File Requirements

The eligibility CSV must:
- Have a header row with columns `address` and `amount`
- Contain only valid 64-character hex Sui addresses (0x-prefixed accepted)
- Contain no duplicate addresses
- Have all amounts as positive integers (base units, 6 decimal places for ATC)
- Be validated by `lib/sui/proofs/validateEligibilityCsv.ts` before Merkle
  root generation

**Integrity procedure:**
1. Validate CSV with `validateEligibilityCsv()`
2. Build tree with `buildMerkleTree()`
3. Hash the CSV file contents (SHA-256)
4. Publish CSV hash and Merkle root to IPFS
5. Record IPFS CID in campaign metadata
6. Set Merkle root on-chain via `set_merkle_root()` + `activate()`

---

## 5. Deployment Authorization Checklist

### Pre-Deployment

- [ ] axiom_sui package compiles with `sui move build` (no warnings)
- [ ] All 42 tests pass with `sui move test`
- [ ] Move.toml dependency rev matches target network (testnet-v1.72.1 for testnet)
- [ ] Deployer keypair generated fresh for this deployment
- [ ] Deployer address funded with sufficient SUI for gas
- [ ] Treasury multisig address configured (2-of-3 recommended for mainnet)

### Deployment

```bash
sui client publish \
  --gas-budget 200000000 \
  --with-unpublished-dependencies false \
  move/axiom_sui
```

Record from output:
- `Package ID` → `AXIOM_SUI_PACKAGE_ID`
- `GuardedTreasury ID` → `AXIOM_SUI_GUARDED_TREASURY_ID`
- Verify no `UpgradeCap` in output objects

### Post-Deployment (within 1 hour)

- [ ] Confirm no UpgradeCap in deployer inventory
- [ ] Transfer GuardedTreasury to treasury multisig address
- [ ] Update environment variables: `AXIOM_SUI_PACKAGE_ID`,
  `AXIOM_SUI_GUARDED_TREASURY_ID`, `NEXT_PUBLIC_AXIOM_SUI_PACKAGE_ID`
- [ ] Redeploy API servers with new environment
- [ ] Verify `/api/sui/campaigns` returns empty list (no campaigns yet)

### Campaign Creation

For each distribution:

```bash
# Step 1: Validate eligibility CSV
# (via operator dashboard CSV Auditor or validateEligibilityCsv() API)

# Step 2: Create campaign
sui client ptb \
  --move-call <PKG>::claim_campaign::create \
  --args <MERKLE_ROOT_HEX> <AMOUNT_PER_CLAIM> <EXPIRES_AT_EPOCH> \
  --assign cap

# Step 3: Transfer AdminCap to admin address
sui client ptb \
  --move-call <PKG>::claim_campaign::transfer_admin_cap \
  --args @cap <ADMIN_ADDRESS>

# Step 4: Activate campaign
sui client call \
  --package <PKG> \
  --module claim_campaign \
  --function activate \
  --args <CAMPAIGN_ID> <ADMIN_CAP_ID>
```

- [ ] Verify `CampaignCreated` event indexed
- [ ] Verify campaign appears in `/api/sui/campaigns`
- [ ] Test single claim via claim UI with a known eligible address

### Campaign Closure

```bash
sui client call \
  --package <PKG> \
  --module claim_campaign \
  --function close_campaign \
  --args <CAMPAIGN_ID> <ADMIN_CAP_ID>

sui client call \
  --package <PKG> \
  --module claim_campaign \
  --function destroy_admin_cap \
  --args <ADMIN_CAP_ID>
```

- [ ] Verify `CampaignClosed` + `AdminCapDestroyed` events
- [ ] Verify `is_closed = true` on-chain
- [ ] Update off-chain registry to mark campaign closed

---

## 6. API Authorization

The TypeScript API layer (`pages/api/sui/`) does not perform any on-chain
writes — it is a read-only query layer plus proof generation. Authorization
tiers:

| Endpoint | Auth Required | Operation |
|---|---|---|
| GET /api/sui/campaigns | None (public) | Read active campaigns |
| GET /api/sui/campaigns/[id] | None (public) | Read campaign detail |
| POST /api/sui/eligibility | None (public) | Generate Merkle proof from CSV |
| GET /api/sui/claim-status | None (public) | Check claim status on-chain |

All write operations (claim, admin actions) are executed client-side via
Sui wallet extensions. The API never holds private keys.

---

## 7. Error Code Reference

### merkle.move

| Code | Constant | Condition |
|---|---|---|
| 0 | EProofTooDeep | proof.length > MAX_PROOF_DEPTH (20) |
| 1 | EInvalidAddressLength | address BCS != 32 bytes |
| 2 | EInvalidAmountLength | amount BCS != 8 bytes |

### claim_campaign.move

| Code | Constant | Condition |
|---|---|---|
| 0 | EAlreadyClaimed | sender already in claimed table |
| 1 | ECampaignInactive | is_active == false |
| 2 | ECampaignAlreadyClosed | is_closed == true |
| 3 | ECampaignExpired | current epoch > expires_at_epoch |
| 4 | EInvalidProof | Merkle verify_proof returned false |
| 5 | EZeroClaimAmount | amount == 0 |

### guarded_treasury.move

| Code | Constant | Condition |
|---|---|---|
| 0 | ESupplyCapExceeded | minted + amount > max_supply |
| 1 | EZeroMintAmount | amount == 0 |

---

*Internal operator document. Not for public distribution.*
*Axiom Protocol Engineering — Phase 8 — 2026-05-17*
