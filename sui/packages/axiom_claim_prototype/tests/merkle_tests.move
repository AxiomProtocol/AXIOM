// =============================================================================
// Merkle Tests — Phase 8 Expanded Suite
//
// 8 total tests (6 original Sprint 2 + 2 Phase 8 additions):
//
// Sprint 2 original:
//   test_merkle_single_leaf         — single-leaf tree (root == leaf, empty proof)
//   test_merkle_multi_leaf          — two-leaf tree (proof = sibling hash)
//   test_wrong_leaf_fails           — wrong claimant leaf does not verify
//   test_tampered_proof_fails       — corrupted proof element does not verify
//   test_wrong_root_fails           — valid proof against wrong root fails
//   test_compute_leaf_deterministic — same inputs → same output
//
// Phase 8 additions:
//   test_proof_depth_limit_enforced — proof > MAX_PROOF_DEPTH aborts EProofTooLong (A1)
//   test_empty_proof_nonmatch       — empty proof with non-matching leaf returns false
//
// Run with: sui move test
// =============================================================================

#[test_only]
module axiom_claim_prototype::merkle_tests {
    use axiom_claim_prototype::merkle;

    // =========================================================================
    // Test constants
    // =========================================================================
    const ADDR_A: address = @0x000000000000000000000000000000000000000000000000000000000000AAA1;
    const ADDR_B: address = @0x000000000000000000000000000000000000000000000000000000000000AAA2;
    const ADDR_C: address = @0x000000000000000000000000000000000000000000000000000000000000CCC3;

    const AMOUNT: u64 = 1_000_000;

    // =========================================================================
    // Test 1 — test_merkle_single_leaf
    // =========================================================================
    #[test]
    fun test_merkle_single_leaf() {
        let leaf = merkle::compute_leaf(ADDR_A, AMOUNT);
        let root = leaf;

        let proof: vector<vector<u8>> = vector[];
        assert!(merkle::verify_proof(&proof, &root, leaf), 0);
    }

    // =========================================================================
    // Test 2 — test_merkle_multi_leaf
    // =========================================================================
    #[test]
    fun test_merkle_multi_leaf() {
        let leaf_a = merkle::compute_leaf(ADDR_A, AMOUNT);
        let leaf_b = merkle::compute_leaf(ADDR_B, AMOUNT);

        let root = merkle::hash_pair_for_test(leaf_a, leaf_b);

        let proof_a = vector[leaf_b];
        assert!(merkle::verify_proof(&proof_a, &root, leaf_a), 0);

        let proof_b = vector[leaf_a];
        assert!(merkle::verify_proof(&proof_b, &root, leaf_b), 1);
    }

    // =========================================================================
    // Test 3 — test_wrong_leaf_fails
    // =========================================================================
    #[test]
    fun test_wrong_leaf_fails() {
        let leaf_a = merkle::compute_leaf(ADDR_A, AMOUNT);
        let root   = leaf_a;

        let leaf_c = merkle::compute_leaf(ADDR_C, AMOUNT);
        let proof: vector<vector<u8>> = vector[];

        assert!(!merkle::verify_proof(&proof, &root, leaf_c), 0);
    }

    // =========================================================================
    // Test 4 — test_tampered_proof_fails
    // =========================================================================
    #[test]
    fun test_tampered_proof_fails() {
        let leaf_a = merkle::compute_leaf(ADDR_A, AMOUNT);
        let leaf_b = merkle::compute_leaf(ADDR_B, AMOUNT);
        let leaf_c = merkle::compute_leaf(ADDR_C, AMOUNT);

        let root = merkle::hash_pair_for_test(leaf_a, leaf_b);

        let tampered_proof = vector[leaf_c];
        assert!(!merkle::verify_proof(&tampered_proof, &root, leaf_a), 0);
    }

    // =========================================================================
    // Test 5 — test_wrong_root_fails
    // =========================================================================
    #[test]
    fun test_wrong_root_fails() {
        let leaf_a = merkle::compute_leaf(ADDR_A, AMOUNT);
        let leaf_b = merkle::compute_leaf(ADDR_B, AMOUNT);
        let leaf_c = merkle::compute_leaf(ADDR_C, AMOUNT);

        let root_1 = merkle::hash_pair_for_test(leaf_a, leaf_b);
        let root_2 = merkle::hash_pair_for_test(leaf_a, leaf_c);

        let proof_for_tree_1 = vector[leaf_b];

        assert!(!merkle::verify_proof(&proof_for_tree_1, &root_2, leaf_a), 0);
    }

    // =========================================================================
    // Test 6 — test_compute_leaf_deterministic
    // =========================================================================
    #[test]
    fun test_compute_leaf_deterministic() {
        let leaf_a1 = merkle::compute_leaf(ADDR_A, AMOUNT);
        let leaf_a2 = merkle::compute_leaf(ADDR_A, AMOUNT);
        let leaf_b  = merkle::compute_leaf(ADDR_B, AMOUNT);

        assert!(leaf_a1 == leaf_a2, 0);
        assert!(leaf_a1 != leaf_b, 1);

        let leaf_a_diff_amount = merkle::compute_leaf(ADDR_A, AMOUNT + 1);
        assert!(leaf_a1 != leaf_a_diff_amount, 2);
    }

    // =========================================================================
    // Test P8-1 — test_proof_depth_limit_enforced
    //
    // Phase 8 A1: A proof with more than MAX_PROOF_DEPTH (20) elements aborts
    // with EProofTooLong (code 7). Prevents gas griefing via oversized proofs.
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = merkle::EProofTooLong)]
    fun test_proof_depth_limit_enforced() {
        let leaf = merkle::compute_leaf(ADDR_A, AMOUNT);
        let root = leaf; // single-leaf tree

        // Construct a zero-filled 32-byte hash to use as dummy sibling
        let dummy: vector<u8> = vector[
            0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8,
            0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8,
            0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8,
            0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8,
        ];

        // Build a proof of length 21 (MAX_PROOF_DEPTH + 1 = 21)
        let mut long_proof: vector<vector<u8>> = vector[];
        let max = merkle::max_proof_depth_for_test();
        let mut i = 0u64;
        while (i <= max) { // i goes 0..20 inclusive = 21 elements
            vector::push_back(&mut long_proof, dummy);
            i = i + 1;
        };

        // verify_proof aborts with EProofTooLong before any hash operations
        merkle::verify_proof(&long_proof, &root, leaf);
    }

    // =========================================================================
    // Test P8-2 — test_empty_proof_nonmatch
    //
    // An empty proof (single-leaf semantics) where the provided leaf does not
    // equal the root must return false — not panic or abort.
    //
    // Explicitly validates the non-panic path of verify_proof when proof is
    // empty but the leaf doesn't match.
    // =========================================================================
    #[test]
    fun test_empty_proof_nonmatch() {
        let leaf_a = merkle::compute_leaf(ADDR_A, AMOUNT);
        let leaf_b = merkle::compute_leaf(ADDR_B, AMOUNT);

        // root is leaf_a's hash; leaf_b does not match
        let root = leaf_a;
        let proof: vector<vector<u8>> = vector[];

        let result = merkle::verify_proof(&proof, &root, leaf_b);
        assert!(!result, 0);
    }
}
