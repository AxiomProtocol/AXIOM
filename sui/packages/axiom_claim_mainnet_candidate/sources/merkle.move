// =============================================================================
// merkle — Keccak256 binary Merkle proof verification
//
// Community rewards only. No monetary value. Not a canonical Axiom asset.
// Used by claim_campaign.move Phase 9 mainnet candidate.
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
// Phase 8 hardening items carried forward:
//   A1 — MAX_PROOF_DEPTH = 20; EProofTooLong = 7 enforced in verify_proof.
//
// Error codes:
//   EProofTooLong = 7 — proof vector length > MAX_PROOF_DEPTH
// =============================================================================

module axiom_claim_mainnet_candidate::merkle {
    use sui::hash;

    // =========================================================================
    // Constants (A1)
    // =========================================================================

    // Maximum Merkle proof depth. A tree of depth 20 supports up to 2^20 ≈ 1M leaves.
    // Proofs longer than this are rejected to prevent gas griefing attacks.
    const MAX_PROOF_DEPTH: u64 = 20;

    // Error code 7: submitted proof exceeds MAX_PROOF_DEPTH.
    const EProofTooLong: u64 = 7;

    // =========================================================================
    // compute_leaf — encodes (address, amount) as the Merkle leaf hash.
    //
    // leaf = keccak256(BCS(addr) || BCS(amount))
    // =========================================================================
    public fun compute_leaf(addr: address, amount: u64): vector<u8> {
        let mut preimage = std::bcs::to_bytes(&addr);
        let amount_bytes = std::bcs::to_bytes(&amount);
        vector::append(&mut preimage, amount_bytes);
        hash::keccak256(&preimage)
    }

    // =========================================================================
    // verify_proof — standard binary Merkle tree verification.
    //
    // A1: Aborts with EProofTooLong (7) if proof length > MAX_PROOF_DEPTH.
    // Returns true if valid; false otherwise.
    // =========================================================================
    public fun verify_proof(
        proof: &vector<vector<u8>>,
        root: &vector<u8>,
        leaf: vector<u8>,
    ): bool {
        let proof_len = vector::length(proof);
        assert!(proof_len <= MAX_PROOF_DEPTH, EProofTooLong);

        let mut current = leaf;
        let mut i = 0;
        while (i < proof_len) {
            let sibling = vector::borrow(proof, i);
            current = if (bytes_lte(&current, sibling)) {
                hash_pair(current, *sibling)
            } else {
                hash_pair(*sibling, current)
            };
            i = i + 1;
        };
        &current == root
    }

    fun hash_pair(a: vector<u8>, b: vector<u8>): vector<u8> {
        let mut preimage = a;
        vector::append(&mut preimage, b);
        hash::keccak256(&preimage)
    }

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

    #[test_only]
    public fun hash_pair_for_test(a: vector<u8>, b: vector<u8>): vector<u8> {
        if (bytes_lte(&a, &b)) { hash_pair(a, b) } else { hash_pair(b, a) }
    }

    #[test_only]
    public fun max_proof_depth_for_test(): u64 { MAX_PROOF_DEPTH }
}
