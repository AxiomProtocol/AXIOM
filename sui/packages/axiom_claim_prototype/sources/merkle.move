// =============================================================================
// merkle — Keccak256 binary Merkle proof verification
//
// TESTNET ONLY. No monetary value. No canonical Axiom assets.
// Used by claim_campaign.move Sprint 2.
//
// Leaf construction:
//   leaf = keccak256(BCS(address) || BCS(u64_amount))
//
//   BCS(address)    = 32 raw bytes (Sui address)
//   BCS(u64_amount) =  8 bytes, little-endian
//
// Proof verification:
//   Standard binary Merkle tree. Sibling pairs are sorted lexicographically
//   before hashing to make proofs position-independent and prevent
//   second-preimage attacks.
//
// Sprint 2: Phase 6 — Testnet Build
// Package: axiom_claim_prototype
// =============================================================================

module axiom_claim_prototype::merkle {
    use sui::hash;

    // =========================================================================
    // compute_leaf — encodes (address, amount) as the Merkle leaf hash.
    //
    // leaf = keccak256(BCS(addr) || BCS(amount))
    //
    // Must match the off-chain leaf construction in the TypeScript SDK:
    //   bcs.address().serialize(addr) ++ bcs.u64().serialize(amount)
    // =========================================================================
    public fun compute_leaf(addr: address, amount: u64): vector<u8> {
        let mut preimage = std::bcs::to_bytes(&addr);   // 32 bytes
        let amount_bytes = std::bcs::to_bytes(&amount); //  8 bytes LE
        vector::append(&mut preimage, amount_bytes);
        hash::keccak256(&preimage)
    }

    // =========================================================================
    // verify_proof — standard binary Merkle tree verification.
    //
    // At each level, the current node hash is combined with its sibling
    // (taken from the proof vector), sorted lexicographically, and hashed
    // with keccak256. After all proof elements are consumed, the result
    // must equal the expected root.
    //
    // Returns true if the proof is valid; false otherwise.
    // A false return causes the caller to abort with EInvalidProof.
    //
    // Empty proof is valid for a single-leaf tree (leaf == root).
    // =========================================================================
    public fun verify_proof(
        proof: &vector<vector<u8>>,
        root: &vector<u8>,
        leaf: vector<u8>,
    ): bool {
        let mut current = leaf;
        let n = vector::length(proof);
        let mut i = 0;
        while (i < n) {
            let sibling = vector::borrow(proof, i);
            // Sort current and sibling to get a canonical ordering
            current = if (bytes_lte(&current, sibling)) {
                hash_pair(current, *sibling)
            } else {
                hash_pair(*sibling, current)
            };
            i = i + 1;
        };
        &current == root
    }

    // =========================================================================
    // hash_pair — keccak256(a || b).
    // Callers are responsible for ensuring a <= b (sorted order).
    // =========================================================================
    fun hash_pair(a: vector<u8>, b: vector<u8>): vector<u8> {
        let mut preimage = a;
        vector::append(&mut preimage, b);
        hash::keccak256(&preimage)
    }

    // =========================================================================
    // bytes_lte — returns true if a <= b, compared lexicographically.
    // Used for deterministic sibling ordering in verify_proof.
    // =========================================================================
    fun bytes_lte(a: &vector<u8>, b: &vector<u8>): bool {
        let len_a = vector::length(a);
        let len_b = vector::length(b);
        let min_len = if (len_a < len_b) { len_a } else { len_b };
        let mut i = 0;
        while (i < min_len) {
            let ba = *vector::borrow(a, i);
            let bb = *vector::borrow(b, i);
            if (ba < bb) return true;
            if (ba > bb) return false;
            i = i + 1;
        };
        len_a <= len_b
    }

    // =========================================================================
    // Test-only helpers — not accessible outside #[test_only] contexts.
    // =========================================================================

    // Exposes sorted hash_pair for use in merkle_tests.move.
    #[test_only]
    public fun hash_pair_for_test(a: vector<u8>, b: vector<u8>): vector<u8> {
        if (bytes_lte(&a, &b)) {
            hash_pair(a, b)
        } else {
            hash_pair(b, a)
        }
    }
}
