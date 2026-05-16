/// merkle — Keccak-256 Merkle proof verifier for Axiom Sui claim campaigns.
///
/// Leaf encoding matches lib/sui/proofs/buildMerkleTree.ts exactly:
///   leaf   = keccak256(BCS(address) || BCS(u64_amount))
///   branch = keccak256(lex_min(a, b) || lex_max(a, b))
///
/// A1 hardening: MAX_PROOF_DEPTH = 20 prevents gas-griefing via oversized proofs.
///
/// COMMUNITY DISTRIBUTION ONLY — not a canonical Axiom financial instrument.
module axiom_sui::merkle {
    use sui::hash;
    use std::vector;
    use std::bcs;

    // ── Constants ─────────────────────────────────────────────────────────

    /// A1: Maximum allowed proof depth. Proofs longer than this abort.
    const MAX_PROOF_DEPTH: u64 = 20;

    // ── Error codes ───────────────────────────────────────────────────────

    /// Proof vector exceeds MAX_PROOF_DEPTH. (A1)
    const EProofTooDeep: u64 = 0;
    /// address_bytes must be exactly 32 bytes.
    const EInvalidAddressLength: u64 = 1;
    /// amount_bytes must be exactly 8 bytes.
    const EInvalidAmountLength: u64 = 2;

    // ── Internal helpers ──────────────────────────────────────────────────

    /// Lexicographic less-than-or-equal comparison for two equal-length byte vectors.
    fun bytes_lte(a: &vector<u8>, b: &vector<u8>): bool {
        let a_len = vector::length(a);
        let b_len = vector::length(b);
        let min_len = if (a_len < b_len) { a_len } else { b_len };
        let mut i = 0u64;
        while (i < min_len) {
            let av = *vector::borrow(a, i);
            let bv = *vector::borrow(b, i);
            if (av < bv) return true;
            if (av > bv) return false;
            i = i + 1;
        };
        a_len <= b_len
    }

    /// Sort-lex-then-hash: keccak256(min(a,b) || max(a,b)).
    /// Matches hashPair() in buildMerkleTree.ts.
    fun hash_pair(a: vector<u8>, b: vector<u8>): vector<u8> {
        let (left, right) = if (bytes_lte(&a, &b)) { (a, b) } else { (b, a) };
        let mut preimage = left;
        vector::append(&mut preimage, right);
        hash::keccak256(&preimage)
    }

    // ── Public API ────────────────────────────────────────────────────────

    /// Compute a Merkle leaf from a Sui address and a u64 amount.
    ///
    /// Encoding:
    ///   preimage = BCS(addr)[32 bytes] || BCS(amount)[8 bytes little-endian]
    ///   leaf     = keccak256(preimage)
    ///
    /// Matches computeLeafHash() in buildMerkleTree.ts.
    public fun compute_leaf(addr: address, amount: u64): vector<u8> {
        let addr_bytes = bcs::to_bytes(&addr);   // 32 bytes
        let amount_bytes = bcs::to_bytes(&amount); // 8 bytes little-endian
        assert!(vector::length(&addr_bytes) == 32, EInvalidAddressLength);
        assert!(vector::length(&amount_bytes) == 8, EInvalidAmountLength);
        let mut preimage = addr_bytes;
        vector::append(&mut preimage, amount_bytes);
        hash::keccak256(&preimage)
    }

    /// Verify a Merkle inclusion proof.
    ///
    /// Returns true iff the provided leaf hashes up to `root` via `proof`.
    /// Aborts with EProofTooDeep (A1) if proof.length > MAX_PROOF_DEPTH.
    public fun verify_proof(
        root: vector<u8>,
        leaf: vector<u8>,
        proof: vector<vector<u8>>,
    ): bool {
        // A1: Gas-griefing guard
        assert!(vector::length(&proof) <= MAX_PROOF_DEPTH, EProofTooDeep);

        let mut current = leaf;
        let proof_len = vector::length(&proof);
        let mut i = 0u64;
        while (i < proof_len) {
            let sibling = *vector::borrow(&proof, i);
            current = hash_pair(current, sibling);
            i = i + 1;
        };
        current == root
    }

    /// Returns the compile-time MAX_PROOF_DEPTH constant.
    public fun max_proof_depth(): u64 { MAX_PROOF_DEPTH }

    // ── Test-only helpers ─────────────────────────────────────────────────

    #[test_only]
    public fun test_hash_pair(a: vector<u8>, b: vector<u8>): vector<u8> {
        hash_pair(a, b)
    }

    #[test_only]
    public fun test_bytes_lte(a: &vector<u8>, b: &vector<u8>): bool {
        bytes_lte(a, b)
    }
}
