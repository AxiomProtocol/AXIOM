module axiom_sui::merkle {
    use std::vector;
    use std::bcs;
    use sui::hash;

    // ─── Constants ────────────────────────────────────────────────────────────
    const MAX_PROOF_DEPTH: u64 = 20;

    // ─── Error codes ──────────────────────────────────────────────────────────
    const E_PROOF_TOO_DEEP:  u64 = 1;
    const E_BAD_LEAF_SIZE:   u64 = 2;
    const E_BAD_SIBLING_SIZE: u64 = 3;
    const E_BAD_ROOT_SIZE:   u64 = 4;

    // ─── Public: proof-depth cap ───────────────────────────────────────────────
    public fun max_proof_depth(): u64 { MAX_PROOF_DEPTH }

    // ─── Public: leaf computation ──────────────────────────────────────────────
    /// Compute keccak256(addr_bytes_32 || amount_le8).
    /// Matches TypeScript buildMerkleTree.computeLeaf exactly.
    public fun compute_leaf(addr: address, amount: u64): vector<u8> {
        // BCS encodes a Sui address as its raw 32 bytes.
        let mut preimage = bcs::to_bytes(&addr);
        let mut n = amount;
        let mut i = 0u64;
        while (i < 8) {
            vector::push_back(&mut preimage, ((n & 0xff) as u8));
            n = n >> 8;
            i = i + 1;
        };
        hash::keccak256(&preimage)
    }

    // ─── Public: proof verification ────────────────────────────────────────────
    /// Verify a Merkle inclusion proof.
    /// `proof`  – sibling hashes from leaf to root (max MAX_PROOF_DEPTH)
    /// `root`   – 32-byte expected Merkle root
    /// `leaf`   – 32-byte leaf hash (output of compute_leaf)
    public fun verify_proof(
        proof: &vector<vector<u8>>,
        root:  &vector<u8>,
        leaf:  vector<u8>,
    ): bool {
        let depth = vector::length(proof);
        assert!(depth <= MAX_PROOF_DEPTH, E_PROOF_TOO_DEEP);
        assert!(vector::length(&leaf) == 32, E_BAD_LEAF_SIZE);
        assert!(vector::length(root) == 32, E_BAD_ROOT_SIZE);

        let mut current = leaf;
        let mut i = 0u64;
        while (i < depth) {
            let sibling = vector::borrow(proof, i);
            assert!(vector::length(sibling) == 32, E_BAD_SIBLING_SIZE);
            current = hash_pair(current, *sibling);
            i = i + 1;
        };
        current == *root
    }

    // ─── Internal: sorted-pair hash ───────────────────────────────────────────
    fun hash_pair(a: vector<u8>, b: vector<u8>): vector<u8> {
        let (lo, hi) = if (bytes_lte(&a, &b)) { (a, b) } else { (b, a) };
        let mut preimage = lo;
        vector::append(&mut preimage, hi);
        hash::keccak256(&preimage)
    }

    fun bytes_lte(a: &vector<u8>, b: &vector<u8>): bool {
        let la = vector::length(a);
        let lb = vector::length(b);
        let min_len = if (la < lb) { la } else { lb };
        let mut i = 0u64;
        while (i < min_len) {
            let ai = *vector::borrow(a, i);
            let bi = *vector::borrow(b, i);
            if (ai < bi) return true;
            if (ai > bi) return false;
            i = i + 1;
        };
        la <= lb
    }

    // ─── Test-only helpers ─────────────────────────────────────────────────────
    #[test_only]
    public fun hash_pair_for_test(a: vector<u8>, b: vector<u8>): vector<u8> {
        hash_pair(a, b)
    }
}
