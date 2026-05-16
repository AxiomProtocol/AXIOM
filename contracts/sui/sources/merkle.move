/// Axiom Protocol — Merkle Proof Verifier
///
/// keccak256-based Merkle proof verification compatible with the TypeScript
/// buildMerkleTree.ts implementation (sorted-pair hashing, little-endian
/// amount encoding).
///
/// Audit hardening:
///   A1 — MAX_PROOF_DEPTH guard prevents unbounded loop execution. Any proof
///        deeper than 32 levels aborts with E_PROOF_TOO_DEEP (code 1).
///
/// Leaf encoding (must match buildMerkleTree.ts exactly):
///   leaf = keccak256(addr_32_bytes_big_endian ++ amount_8_bytes_little_endian)
///
/// Internal node hashing:
///   node = keccak256(sort_lex(left, right) ++ sort_lex_second(left, right))
module axiom::merkle {
    use sui::hash;
    use std::bcs;

    // ── Constants ────────────────────────────────────────────────────────────

    /// A1: Maximum Merkle proof depth. 2^32 leaves far exceeds any realistic
    /// campaign. Enforced to bound loop iteration gas consumption.
    const MAX_PROOF_DEPTH: u64 = 32;

    // ── Error codes ──────────────────────────────────────────────────────────

    const E_PROOF_TOO_DEEP: u64 = 1;

    // ── Public API ───────────────────────────────────────────────────────────

    /// Verify a Merkle inclusion proof.
    ///
    /// Returns true iff `leaf` belongs to the tree with `root`
    /// via the sibling `proof` path (sorted-pair keccak256 hashing).
    ///
    /// Aborts with E_PROOF_TOO_DEEP = 1 if proof.length > MAX_PROOF_DEPTH (A1).
    public fun verify(
        leaf:  vector<u8>,
        proof: vector<vector<u8>>,
        root:  vector<u8>,
    ): bool {
        let depth = vector::length(&proof);
        assert!(depth <= MAX_PROOF_DEPTH, E_PROOF_TOO_DEEP);

        let mut current = leaf;
        let mut i = 0u64;
        while (i < depth) {
            let sibling = *vector::borrow(&proof, i);
            current = hash_pair(current, sibling);
            i = i + 1;
        };
        current == root
    }

    /// Compute the leaf hash for (address, amount).
    /// Encoding: keccak256(addr_32_bytes ++ amount_le_8_bytes)
    /// Matches TypeScript: keccak_256(addrBytes ++ amountLE8bytes)
    public fun compute_leaf(addr: address, amount: u64): vector<u8> {
        let addr_bytes = bcs::to_bytes(&addr); // 32 bytes, big-endian

        let amount_bytes = u64_to_le_bytes(amount); // 8 bytes, little-endian

        let mut preimage = vector::empty<u8>();
        vector::append(&mut preimage, addr_bytes);
        vector::append(&mut preimage, amount_bytes);

        hash::keccak256(&preimage)
    }

    /// Return MAX_PROOF_DEPTH constant for external inspection.
    public fun max_proof_depth(): u64 { MAX_PROOF_DEPTH }

    // ── Internal helpers ─────────────────────────────────────────────────────

    /// Hash two nodes: sort lexicographically, then keccak256(lo ++ hi).
    /// Matches the TypeScript hashPair() function exactly.
    fun hash_pair(a: vector<u8>, b: vector<u8>): vector<u8> {
        let mut combined = vector::empty<u8>();
        if (bytes_lte(&a, &b)) {
            vector::append(&mut combined, a);
            vector::append(&mut combined, b);
        } else {
            vector::append(&mut combined, b);
            vector::append(&mut combined, a);
        };
        hash::keccak256(&combined)
    }

    /// Lexicographic comparison: returns true iff a <= b byte-by-byte.
    fun bytes_lte(a: &vector<u8>, b: &vector<u8>): bool {
        let alen = vector::length(a);
        let blen = vector::length(b);
        let min_len = if (alen < blen) { alen } else { blen };
        let mut i = 0u64;
        while (i < min_len) {
            let av = *vector::borrow(a, i);
            let bv = *vector::borrow(b, i);
            if (av < bv) return true;
            if (av > bv) return false;
            i = i + 1;
        };
        alen <= blen
    }

    /// Encode u64 as 8 bytes, little-endian.
    /// Matches TypeScript: DataView.setUint32(0, lo, true); setUint32(4, hi, true)
    fun u64_to_le_bytes(v: u64): vector<u8> {
        let mut result = vector::empty<u8>();
        let mut remaining = v;
        let mut i = 0u8;
        while (i < 8) {
            vector::push_back(&mut result, ((remaining & 0xff) as u8));
            remaining = remaining >> 8;
            i = i + 1;
        };
        result
    }

    // ── Test-only exports ────────────────────────────────────────────────────

    #[test_only]
    public fun hash_pair_for_test(a: vector<u8>, b: vector<u8>): vector<u8> {
        hash_pair(a, b)
    }

    #[test_only]
    public fun bytes_lte_for_test(a: &vector<u8>, b: &vector<u8>): bool {
        bytes_lte(a, b)
    }

    #[test_only]
    public fun u64_to_le_bytes_for_test(v: u64): vector<u8> {
        u64_to_le_bytes(v)
    }
}
