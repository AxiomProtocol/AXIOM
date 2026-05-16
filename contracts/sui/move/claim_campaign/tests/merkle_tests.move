// =============================================================================
// Axiom Protocol — Sui Phase 8
// merkle_tests.move — 8 unit tests for merkle::verify_proof
//
// Tests:
//   1  test_verify_single_entry_empty_proof
//   2  test_verify_valid_two_entry_tree_left_leaf
//   3  test_verify_valid_two_entry_tree_right_leaf
//   4  test_verify_invalid_wrong_root_fails
//   5  test_verify_invalid_wrong_leaf_fails
//   6  test_proof_too_deep_aborts                   (A1)
//   7  test_proof_exactly_max_depth_passes           (A1 boundary)
//   8  test_verify_wrong_sibling_fails
//
// Run with: sui move test --filter merkle_tests
// =============================================================================

#[test_only]
module claim_campaign::merkle_tests {
    use sui::hash;
    use claim_campaign::merkle;

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// Compute keccak256(a || b) where a and b are sorted lexicographically.
    fun hash_pair_test(a: vector<u8>, b: vector<u8>): vector<u8> {
        let (left, right) = if (lex_lte(&a, &b)) { (a, b) } else { (b, a) };
        let mut pre = left;
        pre.append(right);
        hash::keccak256(&pre)
    }

    fun lex_lte(a: &vector<u8>, b: &vector<u8>): bool {
        let la = a.length();
        let lb = b.length();
        let min_l = if (la < lb) { la } else { lb };
        let mut i = 0;
        while (i < min_l) {
            let ab = *a.borrow(i);
            let bb = *b.borrow(i);
            if (ab < bb) return true;
            if (ab > bb) return false;
            i = i + 1;
        };
        la <= lb
    }

    /// Build a simple leaf (just raw bytes for test purposes).
    fun make_test_leaf(seed: u8): vector<u8> {
        let mut v = vector::empty<u8>();
        let mut i = 0u8;
        while (i < 32) {
            v.push_back(if (i == 0) { seed } else { 0u8 });
            i = i + 1;
        };
        hash::keccak256(&v)
    }

    // ── Test 1: Single-entry tree — empty proof, root == leaf ─────────────────
    #[test]
    fun test_verify_single_entry_empty_proof() {
        let leaf = make_test_leaf(0x01);
        let root = leaf; // single-entry: root IS the leaf
        let proof = vector[];
        assert!(merkle::verify_proof(leaf, proof, root), 0);
    }

    // ── Test 2: Two-entry tree — verify left leaf ─────────────────────────────
    #[test]
    fun test_verify_valid_two_entry_tree_left_leaf() {
        let leaf0 = make_test_leaf(0x01);
        let leaf1 = make_test_leaf(0x02);
        let root  = hash_pair_test(leaf0, leaf1);
        // Proof for leaf0: sibling is leaf1
        let proof = vector[leaf1];
        assert!(merkle::verify_proof(leaf0, proof, root), 1);
    }

    // ── Test 3: Two-entry tree — verify right leaf ────────────────────────────
    #[test]
    fun test_verify_valid_two_entry_tree_right_leaf() {
        let leaf0 = make_test_leaf(0x01);
        let leaf1 = make_test_leaf(0x02);
        let root  = hash_pair_test(leaf0, leaf1);
        // Proof for leaf1: sibling is leaf0
        let proof = vector[leaf0];
        assert!(merkle::verify_proof(leaf1, proof, root), 2);
    }

    // ── Test 4: Wrong root — valid proof, but root is altered ─────────────────
    #[test]
    fun test_verify_invalid_wrong_root_fails() {
        let leaf = make_test_leaf(0x01);
        let proof = vector[];
        let wrong_root = make_test_leaf(0xFF); // different from leaf
        assert!(!merkle::verify_proof(leaf, proof, wrong_root), 3);
    }

    // ── Test 5: Wrong leaf — valid root, leaf tampered ────────────────────────
    #[test]
    fun test_verify_invalid_wrong_leaf_fails() {
        let leaf0 = make_test_leaf(0x01);
        let leaf1 = make_test_leaf(0x02);
        let root  = hash_pair_test(leaf0, leaf1);
        let tampered_leaf = make_test_leaf(0xAA);
        let proof = vector[leaf1];
        assert!(!merkle::verify_proof(tampered_leaf, proof, root), 4);
    }

    // ── Test 6: A1 — Proof depth > 20 aborts ─────────────────────────────────
    #[test]
    #[expected_failure(abort_code = merkle::E_PROOF_TOO_DEEP, location = claim_campaign::merkle)]
    fun test_proof_too_deep_aborts() {
        let leaf = make_test_leaf(0x01);
        let root = make_test_leaf(0x02);
        // Construct 21-element proof (one beyond MAX_PROOF_DEPTH = 20)
        let mut proof = vector[];
        let mut i = 0u64;
        while (i < 21) {
            proof.push_back(make_test_leaf(0x00));
            i = i + 1;
        };
        // Aborts here
        merkle::verify_proof(leaf, proof, root);
    }

    // ── Test 7: A1 boundary — exactly 20 elements, should NOT abort ───────────
    #[test]
    fun test_proof_exactly_max_depth_accepted() {
        // 20-element proof of all-zero siblings on a leaf equal to the root
        // won't verify (wrong proof), but must not abort with E_PROOF_TOO_DEEP.
        let leaf = make_test_leaf(0x01);
        let root = make_test_leaf(0x02); // intentionally wrong — we just check no abort
        let mut proof = vector[];
        let mut i = 0u64;
        while (i < 20) {
            proof.push_back(make_test_leaf(0x00));
            i = i + 1;
        };
        // Returns false (invalid proof) but does not abort
        let result = merkle::verify_proof(leaf, proof, root);
        assert!(!result, 5); // false is expected — just confirming no abort
    }

    // ── Test 8: Wrong sibling — correct length, wrong sibling hash ───────────
    #[test]
    fun test_verify_wrong_sibling_fails() {
        let leaf0 = make_test_leaf(0x01);
        let leaf1 = make_test_leaf(0x02);
        let root  = hash_pair_test(leaf0, leaf1);
        let wrong_sibling = make_test_leaf(0xBB); // should be leaf1
        let proof = vector[wrong_sibling];
        assert!(!merkle::verify_proof(leaf0, proof, root), 6);
    }
}
