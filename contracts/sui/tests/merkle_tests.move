/// Axiom Protocol — Merkle Verification Unit Tests
///
/// 11 tests (tests 1–11 of the ≥28 target):
///   - Single-leaf trees (empty proof)
///   - Two-leaf trees (sibling proof)
///   - Sorted-pair hash symmetry
///   - bytes_lte ordering
///   - compute_leaf output size
///   - A1: MAX_PROOF_DEPTH=32 boundary (passes at 32, aborts at 33)
///
/// All tests are pure (no TxContext, no Sui objects).
#[test_only]
module axiom::merkle_tests {
    use axiom::merkle;

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// Build a 32-byte vector filled with `byte` — used as fake leaf hashes.
    fun fill_32(byte: u8): vector<u8> {
        let mut v = vector::empty<u8>();
        let mut i = 0u8;
        while (i < 32) {
            vector::push_back(&mut v, byte);
            i = i + 1;
        };
        v
    }

    // ─── Test 1 ───────────────────────────────────────────────────────────────
    // Single leaf: empty proof, leaf == root → verify returns true.
    #[test]
    fun test_01_single_leaf_empty_proof_returns_true() {
        let leaf = fill_32(0x01);
        let root = leaf;
        let proof: vector<vector<u8>> = vector::empty();
        assert!(merkle::verify(leaf, proof, root), 0);
    }

    // ─── Test 2 ───────────────────────────────────────────────────────────────
    // Single leaf: empty proof, wrong root → verify returns false.
    #[test]
    fun test_02_single_leaf_wrong_root_returns_false() {
        let leaf  = fill_32(0x01);
        let wrong = fill_32(0x02);
        let proof: vector<vector<u8>> = vector::empty();
        assert!(!merkle::verify(leaf, proof, wrong), 0);
    }

    // ─── Test 3 ───────────────────────────────────────────────────────────────
    // Two-leaf tree: prove the "left" leaf using "right" sibling.
    #[test]
    fun test_03_two_leaf_prove_left() {
        let leaf_a = fill_32(0xAA);
        let leaf_b = fill_32(0xBB);
        let root   = merkle::hash_pair_for_test(leaf_a, leaf_b);

        let mut proof = vector::empty<vector<u8>>();
        vector::push_back(&mut proof, leaf_b);

        assert!(merkle::verify(leaf_a, proof, root), 0);
    }

    // ─── Test 4 ───────────────────────────────────────────────────────────────
    // Two-leaf tree: prove the "right" leaf using "left" sibling.
    #[test]
    fun test_04_two_leaf_prove_right() {
        let leaf_a = fill_32(0xAA);
        let leaf_b = fill_32(0xBB);
        let root   = merkle::hash_pair_for_test(leaf_a, leaf_b);

        let mut proof = vector::empty<vector<u8>>();
        vector::push_back(&mut proof, leaf_a);

        assert!(merkle::verify(leaf_b, proof, root), 0);
    }

    // ─── Test 5 ───────────────────────────────────────────────────────────────
    // Wrong sibling → verify returns false.
    #[test]
    fun test_05_wrong_sibling_returns_false() {
        let leaf_a    = fill_32(0xAA);
        let leaf_b    = fill_32(0xBB);
        let wrong_sib = fill_32(0xCC);
        let root      = merkle::hash_pair_for_test(leaf_a, leaf_b);

        let mut proof = vector::empty<vector<u8>>();
        vector::push_back(&mut proof, wrong_sib);

        // Computed hash will differ from root
        assert!(!merkle::verify(leaf_a, proof, root), 0);
    }

    // ─── Test 6 ───────────────────────────────────────────────────────────────
    // hashPair is symmetric: hash_pair(a,b) == hash_pair(b,a).
    #[test]
    fun test_06_pair_hash_symmetric() {
        let a = fill_32(0xAA);
        let b = fill_32(0xBB);
        let hash_ab = merkle::hash_pair_for_test(a, b);
        let hash_ba = merkle::hash_pair_for_test(b, a);
        assert!(hash_ab == hash_ba, 0);
    }

    // ─── Test 7 ───────────────────────────────────────────────────────────────
    // bytes_lte: lexicographic ordering is correct.
    #[test]
    fun test_07_bytes_lte_ordering() {
        let small = vector[0x01u8, 0x00u8];
        let large = vector[0x02u8, 0x00u8];
        let equal = vector[0x01u8, 0x00u8];

        assert!(merkle::bytes_lte_for_test(&small, &large), 0);  // 0x01 < 0x02
        assert!(!merkle::bytes_lte_for_test(&large, &small), 1); // 0x02 > 0x01
        assert!(merkle::bytes_lte_for_test(&small, &equal), 2);  // equal
    }

    // ─── Test 8 ───────────────────────────────────────────────────────────────
    // compute_leaf always returns exactly 32 bytes (keccak256 output).
    #[test]
    fun test_08_compute_leaf_is_32_bytes() {
        let leaf = merkle::compute_leaf(@0x1, 1_000_000);
        assert!(vector::length(&leaf) == 32, 0);
    }

    // ─── Test 9 ───────────────────────────────────────────────────────────────
    // Proof at MAX_PROOF_DEPTH (32) does NOT abort — just returns false.
    #[test]
    fun test_09_proof_at_max_depth_no_abort() {
        let leaf      = fill_32(0x01);
        let fake_root = fill_32(0xFF);
        let mut proof = vector::empty<vector<u8>>();

        let mut depth = 0u64;
        while (depth < 32) {
            vector::push_back(&mut proof, fill_32(0x00));
            depth = depth + 1;
        };

        // Should NOT abort with depth == MAX_PROOF_DEPTH; result is false
        let result = merkle::verify(leaf, proof, fake_root);
        assert!(!result, 0); // wrong hashes → false, but no abort
    }

    // ─── Test 10 ──────────────────────────────────────────────────────────────
    // Proof depth = 33 (one over MAX) MUST abort with E_PROOF_TOO_DEEP = 1.
    #[test]
    #[expected_failure(abort_code = 1)] // E_PROOF_TOO_DEEP
    fun test_10_proof_depth_exceeds_max_aborts() {
        let leaf      = fill_32(0x01);
        let fake_root = fill_32(0xFF);
        let mut proof = vector::empty<vector<u8>>();

        let mut depth = 0u64;
        while (depth < 33) {   // ONE over MAX_PROOF_DEPTH
            vector::push_back(&mut proof, fill_32(0x00));
            depth = depth + 1;
        };

        // Must abort (expected_failure annotation)
        merkle::verify(leaf, proof, fake_root);
    }

    // ─── Test 11 ──────────────────────────────────────────────────────────────
    // Three-leaf tree with odd-leaf duplication (right-padding) verifies correctly.
    //
    // Standard Merkle construction for an odd number of leaves duplicates the
    // last leaf when building interior nodes: [A, B, C] → root = hash(hash(A,B), hash(C,C)).
    // bytes_lte sort ensures hash_pair is symmetric (test_06), so hash(C,C) = hash(C,C).
    #[test]
    fun test_11_three_leaf_odd_duplication_verifies() {
        let leaf_a = fill_32(0xAA);
        let leaf_b = fill_32(0xBB);
        let leaf_c = fill_32(0xCC);

        // Level 1: interior nodes
        let node_ab = merkle::hash_pair_for_test(leaf_a, leaf_b);
        let node_cc = merkle::hash_pair_for_test(leaf_c, leaf_c); // odd duplication
        // Root
        let root = merkle::hash_pair_for_test(node_ab, node_cc);

        // Prove leaf_c: proof = [leaf_c (sibling), node_ab (uncle)]
        let mut proof = vector::empty<vector<u8>>();
        vector::push_back(&mut proof, leaf_c);   // sibling at level 0 (duplicated)
        vector::push_back(&mut proof, node_ab);  // sibling at level 1

        assert!(merkle::verify(leaf_c, proof, root), 0);
    }
}
