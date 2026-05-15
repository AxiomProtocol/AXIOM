// =============================================================================
// Merkle Tests — Phase 9 Mainnet Candidate (8 tests)
//
// Sprint 2 original (6):
//   test_merkle_single_leaf, test_merkle_multi_leaf, test_wrong_leaf_fails,
//   test_tampered_proof_fails, test_wrong_root_fails, test_compute_leaf_deterministic
//
// Phase 8/9 additions (2):
//   test_proof_depth_limit_enforced — A1: EProofTooLong (code 7)
//   test_empty_proof_nonmatch       — empty proof, non-matching leaf returns false
// =============================================================================

#[test_only]
module axiom_claim_mainnet_candidate::merkle_tests {
    use axiom_claim_mainnet_candidate::merkle;

    const ADDR_A: address = @0x000000000000000000000000000000000000000000000000000000000000AAA1;
    const ADDR_B: address = @0x000000000000000000000000000000000000000000000000000000000000AAA2;
    const ADDR_C: address = @0x000000000000000000000000000000000000000000000000000000000000CCC3;
    const AMOUNT: u64 = 1_000_000;

    #[test]
    fun test_merkle_single_leaf() {
        let leaf = merkle::compute_leaf(ADDR_A, AMOUNT);
        let root = leaf;
        let proof: vector<vector<u8>> = vector[];
        assert!(merkle::verify_proof(&proof, &root, leaf), 0);
    }

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

    #[test]
    fun test_wrong_leaf_fails() {
        let leaf_a = merkle::compute_leaf(ADDR_A, AMOUNT);
        let root   = leaf_a;
        let leaf_c = merkle::compute_leaf(ADDR_C, AMOUNT);
        let proof: vector<vector<u8>> = vector[];
        assert!(!merkle::verify_proof(&proof, &root, leaf_c), 0);
    }

    #[test]
    fun test_tampered_proof_fails() {
        let leaf_a = merkle::compute_leaf(ADDR_A, AMOUNT);
        let leaf_b = merkle::compute_leaf(ADDR_B, AMOUNT);
        let leaf_c = merkle::compute_leaf(ADDR_C, AMOUNT);
        let root = merkle::hash_pair_for_test(leaf_a, leaf_b);
        let tampered_proof = vector[leaf_c];
        assert!(!merkle::verify_proof(&tampered_proof, &root, leaf_a), 0);
    }

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

    #[test]
    fun test_compute_leaf_deterministic() {
        let leaf_a1 = merkle::compute_leaf(ADDR_A, AMOUNT);
        let leaf_a2 = merkle::compute_leaf(ADDR_A, AMOUNT);
        let leaf_b  = merkle::compute_leaf(ADDR_B, AMOUNT);
        assert!(leaf_a1 == leaf_a2, 0);
        assert!(leaf_a1 != leaf_b, 1);
        let leaf_a_diff = merkle::compute_leaf(ADDR_A, AMOUNT + 1);
        assert!(leaf_a1 != leaf_a_diff, 2);
    }

    #[test]
    #[expected_failure(abort_code = merkle::EProofTooLong)]
    fun test_proof_depth_limit_enforced() {
        let leaf = merkle::compute_leaf(ADDR_A, AMOUNT);
        let root = leaf;
        let dummy: vector<u8> = vector[
            0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8,
            0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8,
            0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8,
            0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8,
        ];
        let mut long_proof: vector<vector<u8>> = vector[];
        let max = merkle::max_proof_depth_for_test();
        let mut i = 0u64;
        while (i <= max) {
            vector::push_back(&mut long_proof, dummy);
            i = i + 1;
        };
        merkle::verify_proof(&long_proof, &root, leaf);
    }

    #[test]
    fun test_empty_proof_nonmatch() {
        let leaf_a = merkle::compute_leaf(ADDR_A, AMOUNT);
        let leaf_b = merkle::compute_leaf(ADDR_B, AMOUNT);
        let root = leaf_a;
        let proof: vector<vector<u8>> = vector[];
        let result = merkle::verify_proof(&proof, &root, leaf_b);
        assert!(!result, 0);
    }
}
