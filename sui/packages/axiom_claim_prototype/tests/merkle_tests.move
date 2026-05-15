// =============================================================================
// Merkle Tests — Sprint 2
//
// Unit tests for merkle::compute_leaf and merkle::verify_proof.
//
// Tests:
//   test_merkle_single_leaf  — single-leaf tree (root == leaf, empty proof)
//   test_merkle_multi_leaf   — two-leaf tree (proof = sibling hash)
//   test_wrong_leaf_fails    — wrong claimant leaf does not verify against root
//   test_tampered_proof_fails — corrupted proof element does not verify
//   test_wrong_root_fails    — valid leaf + valid proof does not verify against wrong root
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
    // test_merkle_single_leaf
    //
    // For a single-leaf tree:
    //   root  = leaf = compute_leaf(ADDR_A, AMOUNT)
    //   proof = []  (empty — no siblings)
    //
    // verify_proof([], root, leaf) must return true.
    // =========================================================================
    #[test]
    fun test_merkle_single_leaf() {
        let leaf = merkle::compute_leaf(ADDR_A, AMOUNT);
        let root = leaf; // single-leaf: root equals the leaf

        let proof: vector<vector<u8>> = vector[];
        assert!(merkle::verify_proof(&proof, &root, leaf), 0);
    }

    // =========================================================================
    // test_merkle_multi_leaf
    //
    // For a two-leaf tree:
    //   leaf_a = compute_leaf(ADDR_A, AMOUNT)
    //   leaf_b = compute_leaf(ADDR_B, AMOUNT)
    //   root   = hash_pair_for_test(leaf_a, leaf_b)  [sorted pair]
    //
    //   Proof for leaf_a: [leaf_b]
    //   Proof for leaf_b: [leaf_a]
    //
    // Both must verify against root.
    // =========================================================================
    #[test]
    fun test_merkle_multi_leaf() {
        let leaf_a = merkle::compute_leaf(ADDR_A, AMOUNT);
        let leaf_b = merkle::compute_leaf(ADDR_B, AMOUNT);

        // Root of the two-leaf tree
        let root = merkle::hash_pair_for_test(leaf_a, leaf_b);

        // Proof for leaf_a: sibling is leaf_b
        let proof_a = vector[leaf_b];
        assert!(merkle::verify_proof(&proof_a, &root, leaf_a), 0);

        // Proof for leaf_b: sibling is leaf_a
        let proof_b = vector[leaf_a];
        assert!(merkle::verify_proof(&proof_b, &root, leaf_b), 1);
    }

    // =========================================================================
    // test_wrong_leaf_fails
    //
    // A leaf for ADDR_C is not in the tree (root built for ADDR_A only).
    // Empty proof with wrong leaf must return false.
    // =========================================================================
    #[test]
    fun test_wrong_leaf_fails() {
        let leaf_a = merkle::compute_leaf(ADDR_A, AMOUNT);
        let root   = leaf_a; // single-leaf tree for ADDR_A

        let leaf_c = merkle::compute_leaf(ADDR_C, AMOUNT);
        let proof: vector<vector<u8>> = vector[];

        // ADDR_C's leaf does not match root — must return false
        assert!(!merkle::verify_proof(&proof, &root, leaf_c), 0);
    }

    // =========================================================================
    // test_tampered_proof_fails
    //
    // A valid leaf with a corrupted proof element does not verify.
    //
    // Tree: leaf_a and leaf_b; proof for leaf_a should be [leaf_b].
    // Tampered proof: replace leaf_b with leaf_c (a non-member).
    // =========================================================================
    #[test]
    fun test_tampered_proof_fails() {
        let leaf_a = merkle::compute_leaf(ADDR_A, AMOUNT);
        let leaf_b = merkle::compute_leaf(ADDR_B, AMOUNT);
        let leaf_c = merkle::compute_leaf(ADDR_C, AMOUNT);

        let root = merkle::hash_pair_for_test(leaf_a, leaf_b);

        // Tampered: wrong sibling (leaf_c instead of leaf_b)
        let tampered_proof = vector[leaf_c];
        assert!(!merkle::verify_proof(&tampered_proof, &root, leaf_a), 0);
    }

    // =========================================================================
    // test_wrong_root_fails
    //
    // A valid leaf + valid proof verified against the wrong root returns false.
    //
    // Tree_1: root_1 built from (ADDR_A, ADDR_B)
    // Tree_2: root_2 built from (ADDR_A, ADDR_C)
    //
    // Proof for ADDR_A in Tree_1 does not verify against root_2.
    // =========================================================================
    #[test]
    fun test_wrong_root_fails() {
        let leaf_a = merkle::compute_leaf(ADDR_A, AMOUNT);
        let leaf_b = merkle::compute_leaf(ADDR_B, AMOUNT);
        let leaf_c = merkle::compute_leaf(ADDR_C, AMOUNT);

        let root_1 = merkle::hash_pair_for_test(leaf_a, leaf_b);
        let root_2 = merkle::hash_pair_for_test(leaf_a, leaf_c);

        // Proof for leaf_a in tree_1
        let proof_for_tree_1 = vector[leaf_b];

        // Valid proof for root_1, but checked against root_2 — must fail
        assert!(!merkle::verify_proof(&proof_for_tree_1, &root_2, leaf_a), 0);
    }

    // =========================================================================
    // test_compute_leaf_deterministic
    //
    // compute_leaf is deterministic: same inputs always produce same output.
    // Different inputs produce different outputs.
    // =========================================================================
    #[test]
    fun test_compute_leaf_deterministic() {
        let leaf_a1 = merkle::compute_leaf(ADDR_A, AMOUNT);
        let leaf_a2 = merkle::compute_leaf(ADDR_A, AMOUNT);
        let leaf_b  = merkle::compute_leaf(ADDR_B, AMOUNT);

        // Same inputs → same output
        assert!(leaf_a1 == leaf_a2, 0);

        // Different address → different leaf
        assert!(leaf_a1 != leaf_b, 1);

        // Different amount → different leaf
        let leaf_a_diff_amount = merkle::compute_leaf(ADDR_A, AMOUNT + 1);
        assert!(leaf_a1 != leaf_a_diff_amount, 2);
    }
}
