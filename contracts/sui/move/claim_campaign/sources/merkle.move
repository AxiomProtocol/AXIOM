// =============================================================================
// Axiom Protocol — Sui Phase 8
// merkle.move — Keccak-256 Merkle proof verification
//
// A1: MAX_PROOF_DEPTH = 20 enforced. Proofs deeper than 20 abort with
//     E_PROOF_TOO_DEEP to prevent gas-griefing via oversized proof vectors.
//
// Leaf and pair hashing mirrors the TypeScript buildMerkleTree exactly:
//   leaf  = keccak256( BCS(address)[32 bytes] || BCS(u64 amount)[8 bytes LE] )
//   pair  = keccak256( lex_sort(a, b) )  — left=min, right=max lexicographically
//
// COMMUNITY DISTRIBUTION ONLY. NOT AXUSD, AXAU, AXM, SEED, or KAG.
// =============================================================================

module claim_campaign::merkle {
    use sui::hash;

    // ── Constants ─────────────────────────────────────────────────────────────
    /// A1: Maximum allowed Merkle proof depth. Prevents gas-griefing via
    /// oversized proof vectors. Must match MAX_PROOF_DEPTH in verifyProofLocal.ts.
    public const MAX_PROOF_DEPTH: u64 = 20;

    // ── Error codes ───────────────────────────────────────────────────────────
    public const E_PROOF_TOO_DEEP: u64 = 1;

    // ── Public API ────────────────────────────────────────────────────────────

    /// Verify a Merkle proof.
    ///
    /// * `leaf`  — pre-computed leaf hash (32 bytes)
    /// * `proof` — sibling hashes from leaf to root (each 32 bytes)
    /// * `root`  — expected Merkle root (32 bytes)
    ///
    /// Aborts with E_PROOF_TOO_DEEP if proof.length > MAX_PROOF_DEPTH (A1).
    /// Returns true if the proof reduces `leaf` to `root`, false otherwise.
    public fun verify_proof(
        leaf: vector<u8>,
        proof: vector<vector<u8>>,
        root: vector<u8>,
    ): bool {
        let depth = proof.length();
        assert!(depth <= MAX_PROOF_DEPTH, E_PROOF_TOO_DEEP);

        let mut current = leaf;
        let mut i = 0;
        while (i < depth) {
            let sibling = *proof.borrow(i);
            current = hash_pair(current, sibling);
            i = i + 1;
        };
        current == root
    }

    /// Returns the configured MAX_PROOF_DEPTH constant.
    public fun max_proof_depth(): u64 { MAX_PROOF_DEPTH }

    // ── Internal helpers ──────────────────────────────────────────────────────

    /// Hash a pair of nodes in sorted lexicographic order.
    /// Matches TypeScript hashPair: keccak256(min(a,b) || max(a,b)).
    fun hash_pair(a: vector<u8>, b: vector<u8>): vector<u8> {
        let (left, right) = if (lex_lte(&a, &b)) { (a, b) } else { (b, a) };
        let mut preimage = left;
        preimage.append(right);
        hash::keccak256(&preimage)
    }

    /// Lexicographic less-than-or-equal comparison for byte vectors.
    fun lex_lte(a: &vector<u8>, b: &vector<u8>): bool {
        let len_a = a.length();
        let len_b = b.length();
        let min_len = if (len_a < len_b) { len_a } else { len_b };
        let mut i = 0;
        while (i < min_len) {
            let a_byte = *a.borrow(i);
            let b_byte = *b.borrow(i);
            if (a_byte < b_byte) return true;
            if (a_byte > b_byte) return false;
            i = i + 1;
        };
        len_a <= len_b
    }
}
