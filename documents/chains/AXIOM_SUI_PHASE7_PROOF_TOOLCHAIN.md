# AXIOM SUI — PHASE 7 PROOF TOOLCHAIN DESIGN
# Production Merkle Infrastructure for Community Claim Campaigns

Document type:  Design Specification
Phase:          7 — Mainnet Design + Hardening + Authorization
Date:           2026-05-15
Classification: INTERNAL — engineering design
Status:         DESIGN COMPLETE — no implementation yet

---

## Purpose

This document specifies the design of the off-chain Merkle infrastructure
required to operate community claim campaigns on Sui mainnet (Option B).

The toolchain covers:
1. Eligibility data format and validation
2. Merkle tree construction algorithm
3. Proof generation specification
4. Operator upload and root commit workflow
5. Root rotation and old-proof invalidation process
6. Proof verification flow (end-to-end)
7. Claim API contract for future backend implementation

This is a design document. No backend code is deployed or implemented
as part of Phase 7.

---

## Section 1 — Eligibility CSV Schema

The canonical input to the Merkle tree builder is an eligibility CSV file.

### 1.1 File format

```
# Axiom Protocol — Claim Campaign Eligibility List
# Campaign:   <campaign_label>
# Date:       <YYYY-MM-DD>
# Chain:      Sui Mainnet
# Asset:      <coin_type>
# Amount:     <amount_per_claim> base units
# Total:      <total_eligible_count> addresses
# Checksum:   sha256:<hex_of_file_contents_excluding_this_line>

address,amount
0x4917ffea5289fba211976448c50103ba96a86e49a57e4dd1f22222c3b412e5ad,1000000
0x....,1000000
```

### 1.2 Field definitions

| Field | Type | Description |
|---|---|---|
| address | Sui address (0x + 64 hex chars) | Eligible claimant's Sui wallet address |
| amount | u64 (base units) | Tokens eligible to claim (must match campaign amount_per_claim) |

### 1.3 Validation rules

Before tree construction, the tool must validate:

1. All addresses are valid Sui addresses (0x + 64 hex chars, 32 bytes)
2. All amounts are equal to the campaign's `amount_per_claim` (fixed-amount campaigns)
3. No duplicate addresses
4. No more than 2^20 = 1,048,576 entries (MAX_PROOF_DEPTH = 20)
5. File checksum matches header value
6. File is sorted by address (deterministic ordering)

Validation errors are fatal — the CSV must be corrected before tree construction.

### 1.4 Address normalization

All addresses must be lowercase hex with 0x prefix, zero-padded to 64 chars.
Example: `0x0000000000000000000000000000000000000000000000000000000000000001`

---

## Section 2 — Merkle Tree Construction Algorithm

### 2.1 Leaf computation

Each leaf is computed using the same formula as the Move contract:

```
leaf = keccak256(BCS(address 32 bytes) || BCS(u64 amount 8 bytes LE))
```

TypeScript reference implementation:
```typescript
function computeLeaf(addr: string, amount: bigint): Buffer {
  const hex     = addr.startsWith('0x') ? addr.slice(2) : addr;
  const addrBytes = Buffer.from(hex.padStart(64, '0'), 'hex'); // 32 bytes
  const amountBytes = Buffer.alloc(8);
  amountBytes.writeBigUInt64LE(amount, 0);                      //  8 bytes LE
  return Buffer.from(keccak256(Buffer.concat([addrBytes, amountBytes])));
}
```

### 2.2 Tree construction

1. Compute leaves for all entries in the sorted eligibility CSV
2. If leaf count is not a power of 2, pad with zero hashes (0x000...000) to reach next power of 2
   (Alternative: use unpredicated tree; document choice before implementation)
3. Compute tree bottom-up:
   - Layer 0 (leaves): individual leaf hashes
   - Layer k+1: hash_pair(left, right) for each pair of adjacent layer-k nodes
4. Root = single node at the top

### 2.3 Pair hashing (must match Move implementation)

```typescript
function hashPair(a: Buffer, b: Buffer): Buffer {
  // Sort to match Move: smaller byte-value node goes left
  if (Buffer.compare(a, b) <= 0) {
    return Buffer.from(keccak256(Buffer.concat([a, b])));
  } else {
    return Buffer.from(keccak256(Buffer.concat([b, a])));
  }
}
```

This sorted-pair hashing must exactly match `merkle::hash_pair` in the
Move contract. Any deviation causes all proofs to fail.

### 2.4 Tree output

The tree builder outputs a JSON artifact:

```json
{
  "campaign": "axiom-community-q1-2027",
  "generated_at": "2026-05-15T00:00:00Z",
  "entry_count": 1000,
  "leaf_count_padded": 1024,
  "max_proof_depth": 10,
  "merkle_root": "0x34629e7137bdbe0eb05daaf818a6168b3331ef5f0018c4bcd5025a731a816ffa",
  "leaves": [
    {
      "address": "0x4917...",
      "amount": 1000000,
      "leaf_hash": "0x34629e..."
    }
  ],
  "proofs": {
    "0x4917...": ["0xabc123...", "0xdef456..."]
  }
}
```

The `proofs` object maps each eligible address to its Merkle proof array.
Proof elements are hex strings of 32-byte sibling hashes.

---

## Section 3 — Proof Generation Specification

### 3.1 Proof structure

A proof for leaf L in a tree of depth D is an ordered array of D sibling
hashes. Element [0] is the sibling of the leaf; element [D-1] is the
sibling of the root's child.

For the Move contract `verify_proof(proof, root, leaf)`:
- Start with `current = leaf`
- For each `sibling` in `proof`:
  - `current = hash_pair(current, sibling)`
- `return current == root`

### 3.2 Proof serialization for PTB

When submitting to the Move contract, the proof must be serialized as
BCS `vector<vector<u8>>`:

For empty proof (single-leaf tree):
```typescript
const proofBcs = new Uint8Array([0x00]); // ULEB128(0) = empty vector
```

For non-empty proof:
```typescript
function serializeProof(proof: string[]): Uint8Array {
  // proof: array of hex strings, each 32 bytes
  const elements = proof.map(p => Buffer.from(p.replace('0x',''), 'hex'));
  // BCS encode: ULEB128(length) + for each: ULEB128(32) + 32 bytes
  // ... (use encodeUleb128 + encodeVectorU8 helpers from smoke_test.ts)
}
```

### 3.3 Proof validation (off-chain, before submission)

The proof generator must self-verify each proof against the computed root
before the tree artifact is published. A proof is valid if and only if
`computeRootFromProof(proof, leaf) == merkle_root`.

Self-verification failure is a fatal toolchain error.

### 3.4 Proof depth guard

All generated proofs must have length <= MAX_PROOF_DEPTH (20). If any
proof exceeds 20 elements, the eligibility list is too large for the
current contract. Either:
a) Split into multiple campaigns
b) Increase MAX_PROOF_DEPTH (requires contract change + Phase 8 authorization)

---

## Section 4 — Operator Upload Workflow

### 4.1 Pre-launch checklist

```
Step 1: Finalize eligibility CSV
  [ ] All addresses normalized (0x + 64 hex chars)
  [ ] All amounts equal amount_per_claim
  [ ] No duplicates
  [ ] Sorted by address
  [ ] Checksum computed and added to header
  [ ] CSV review by Operations Lead

Step 2: Run Merkle tree builder
  [ ] Builder validates CSV (all rules pass)
  [ ] Tree artifact generated
  [ ] All proofs self-verified against root
  [ ] Root extracted: 0x<64 hex chars>
  [ ] Artifact stored securely (immutable)

Step 3: Publish eligibility data
  [ ] Eligibility CSV published (IPFS / public URL)
  [ ] IPFS CID or URL recorded in campaign record
  [ ] Publication verified (URL accessible)

Step 4: Create campaign on Sui testnet (staging validation)
  [ ] create_campaign_entry called with correct label, root, amount, expiry
  [ ] Campaign ID recorded
  [ ] fund_campaign called with correct pool amount
  [ ] CampaignFunded event verified (pool == eligible_count × amount_per_claim)
  [ ] Random sample of proofs verified on testnet

Step 5: Operations Lead sign-off
  [ ] Root matches builder artifact
  [ ] Pool funding confirmed
  [ ] Sample proofs verified
  [ ] Campaign expiry date confirmed
  [ ] Operations Lead signature on campaign launch record

Step 6: Activate campaign
  [ ] activate() called on AdminCap (via multisig)
  [ ] CampaignActivated event confirmed
  [ ] Campaign state: is_active = true
  [ ] Announcement published
```

### 4.2 Post-launch monitoring

```
Weekly checks during campaign window:
  [ ] Campaign is_active = true (not paused unexpectedly)
  [ ] Pool balance trending down (claims occurring)
  [ ] No anomalous claim patterns (single address claiming repeatedly — impossible; but watch for systematic proof testing)
  [ ] CampaignPaused events: zero (unexpected pause is an incident)
```

---

## Section 5 — Root Rotation Process

Root rotation replaces the eligibility list mid-campaign. This is rare
and should only be used to:
- Correct an error in the original eligibility list
- Add additional eligible addresses (expansion)
- Remove ineligible addresses discovered post-launch

### 5.1 Rotation steps

```
Step 1: Pause campaign (AdminCap multisig)
  - pause() called — CampaignPaused event emitted

Step 2: Build new Merkle tree
  - Include all original eligible addresses not yet claimed
  - Include new/corrected addresses
  - Exclude addresses already claimed (they are in claimed Table — cannot claim again anyway)
  - Compute new root

Step 3: Publish new eligibility list with changelog

Step 4: Update root (AdminCap multisig)
  - update_merkle_root(new_root) called while paused
  - MerkleRootUpdated event emitted

Step 5: Invalidate old proofs
  - Old proofs are automatically invalidated (wrong root)
  - Toolchain must serve new proofs for the new root
  - Communicate to claimants: "Eligibility list updated — fetch new proof"

Step 6: Resume campaign
  - unpause() called — CampaignUnpaused event emitted
```

### 5.2 Root rotation communications

A root rotation must be communicated to claimants before resumption:
- Announcement on protocol channels
- Updated proof fetch endpoint (old proofs rejected)
- Explanation of changes (added/removed addresses, corrections)

---

## Section 6 — Proof Invalidation

Proofs are automatically invalidated when:

1. Campaign root is updated (A2 root rotation)
2. Campaign is closed (A2 permanent closure)
3. Campaign expires (expires_at_epoch reached)
4. The claimant has already claimed (EAlreadyClaimed)

The Move contract handles all these cases — the proof toolchain does not
need to maintain a blacklist. Once a root changes, all old proofs fail
verification automatically.

---

## Section 7 — Claim Verification Flow (End-to-End)

```
Claimant UI / API
  │
  ├── 1. Claimant connects Sui wallet
  │
  ├── 2. Eligibility check (off-chain)
  │      Request: GET /api/sui/claim/eligibility?address=0x...&campaign=<id>
  │      Response: { eligible: true, amount: 1000000, proof: ["0xabc...", ...] }
  │
  ├── 3. Build PTB (programmable transaction block)
  │      tx.moveCall({
  │        target: `${packageId}::claim_campaign::claim`,
  │        arguments: [
  │          tx.object(campaignId),
  │          tx.pure(serializeProof(proof)),
  │        ],
  │      });
  │
  ├── 4. Submit to Sui RPC (wallet signs)
  │
  └── 5. On-chain execution
         claim_campaign::claim:
           a. assert is_active
           b. assert !is_closed
           c. assert !expired
           d. assert !already_claimed
           e. compute_leaf(sender, amount_per_claim)
           f. verify_proof(proof, merkle_root, leaf) → assert true
           g. claimed.add(sender, true)
           h. transfer amount_per_claim to sender
           i. emit Claimed event
```

---

## Section 8 — Proof API Contract (Future Implementation)

The following REST API design supports the claim UI and claimant tooling.
This is a design contract — implementation is deferred to Phase 8.

### GET /api/sui/claim/campaigns

Returns list of active campaigns.

Response:
```json
{
  "campaigns": [
    {
      "campaign_id": "0x113560...",
      "label": "axiom-community-q1-2027",
      "package_id": "0x4c3b15...",
      "amount_per_claim": 1000000,
      "coin_type": "0x4c3b15...::axiom_claim::AXIOM_CLAIM",
      "expires_at_epoch": 500,
      "is_active": true,
      "is_closed": false,
      "pool_remaining": 500000000,
      "claimed_count": 500
    }
  ]
}
```

### GET /api/sui/claim/eligibility

Returns eligibility status and proof for a given address and campaign.

Request parameters: address, campaign_id
Response:
```json
{
  "address": "0x4917...",
  "campaign_id": "0x113560...",
  "eligible": true,
  "already_claimed": false,
  "amount": 1000000,
  "proof": ["0xabc123...", "0xdef456..."],
  "merkle_root": "0x34629e..."
}
```

Error (not eligible):
```json
{
  "address": "0x9999...",
  "campaign_id": "0x113560...",
  "eligible": false,
  "already_claimed": false,
  "amount": 0,
  "proof": null
}
```

### GET /api/sui/claim/status

Returns claim status for a given address and campaign.

Response:
```json
{
  "address": "0x4917...",
  "campaign_id": "0x113560...",
  "claimed": true,
  "claimed_tx": "BUA7aRwsddGQhVdtEDq4YhG7X32uFRj8ri3m19tzHAfc",
  "amount": 1000000
}
```

---

## Section 9 — Toolchain Technology Recommendations

| Component | Recommended Technology |
|---|---|
| Tree builder | TypeScript / Node.js (same stack as existing scripts) |
| keccak256 | @noble/hashes/sha3 keccak_256 (already used in smoke_test.ts) |
| BCS encoding | Manual helpers from smoke_test.ts (no library version skew) |
| Proof storage | IPFS via Pinata (already integrated: PINATA_JWT secret) |
| Proof API | Next.js API route (pages/api/sui/claim/*.ts) |
| Eligibility CSV | Stored in GCS or IPFS |
| Campaign state | Polled from Sui RPC (no persistent DB needed for read) |

All technology choices align with existing Axiom Protocol stack.

---

*End of Phase 7 Proof Toolchain Design*
