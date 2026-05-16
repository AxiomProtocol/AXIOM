/// Merkle module unit tests — 12 tests total.
///
/// Covers: leaf computation, proof round-trips, sorted-pair hashing,
/// MAX_PROOF_DEPTH guard, invalid-proof rejection, and root-length validation.
#[test_only]
#[allow(deprecated_usage)]
module axiom_sui::merkle_tests {
    use std::vector;
    use axiom_sui::merkle;

    // ─── Error constants (local copies for expected_failure) ──────────────────
    const E_PROOF_TOO_DEEP: u64 = 1;

    // ─── Helpers ──────────────────────────────────────────────────────────────
    fun addr_a(): address { @0x0000000000000000000000000000000000000000000000000000000000000001 }
    fun addr_b(): address { @0x0000000000000000000000000000000000000000000000000000000000000002 }
    fun addr_c(): address { @0x0000000000000000000000000000000000000000000000000000000000000003 }

    fun zero32(): vector<u8> {
        let mut v = vector[];
        let mut i = 0u64;
        while (i < 32) { vector::push_back(&mut v, 0u8); i = i + 1; };
        v
    }

    // ── Test 1: compute_leaf is deterministic ─────────────────────────────────
    #[test]
    fun test_compute_leaf_deterministic() {
        let leaf1 = merkle::compute_leaf(addr_a(), 1_000_000);
        let leaf2 = merkle::compute_leaf(addr_a(), 1_000_000);
        assert!(leaf1 == leaf2, 0);
    }

    // ── Test 2: compute_leaf differs by address ───────────────────────────────
    #[test]
    fun test_compute_leaf_differs_by_address() {
        let la = merkle::compute_leaf(addr_a(), 1_000_000);
        let lb = merkle::compute_leaf(addr_b(), 1_000_000);
        assert!(la != lb, 0);
    }

    // ── Test 3: compute_leaf differs by amount ────────────────────────────────
    #[test]
    fun test_compute_leaf_differs_by_amount() {
        let l1 = merkle::compute_leaf(addr_a(), 1_000_000);
        let l2 = merkle::compute_leaf(addr_a(), 2_000_000);
        assert!(l1 != l2, 0);
    }

    // ── Test 4: compute_leaf produces 32 bytes ────────────────────────────────
    #[test]
    fun test_compute_leaf_length() {
        let leaf = merkle::compute_leaf(addr_a(), 500_000);
        assert!(vector::length(&leaf) == 32, 0);
    }

    // ── Test 5: single-entry tree — empty proof verifies against leaf root ────
    #[test]
    fun test_verify_proof_single_entry() {
        let leaf = merkle::compute_leaf(addr_a(), 1_000_000);
        let root = leaf;
        assert!(merkle::verify_proof(&vector[], &root, leaf), 0);
    }

    // ── Test 6: wrong leaf rejected on single-entry tree ─────────────────────
    #[test]
    fun test_verify_proof_wrong_leaf_rejected() {
        let leaf  = merkle::compute_leaf(addr_a(), 1_000_000);
        let wrong = merkle::compute_leaf(addr_b(), 1_000_000);
        let root  = leaf;
        assert!(!merkle::verify_proof(&vector[], &root, wrong), 0);
    }

    // ── Test 7: two-entry tree — left leaf verifies with right sibling ────────
    #[test]
    fun test_verify_proof_two_entries_left() {
        let la   = merkle::compute_leaf(addr_a(), 1_000_000);
        let lb   = merkle::compute_leaf(addr_b(), 1_000_000);
        let root = merkle::hash_pair_for_test(la, lb);

        let mut proof = vector[];
        vector::push_back(&mut proof, lb);

        assert!(merkle::verify_proof(&proof, &root, la), 0);
    }

    // ── Test 8: two-entry tree — right leaf verifies with left sibling ────────
    #[test]
    fun test_verify_proof_two_entries_right() {
        let la   = merkle::compute_leaf(addr_a(), 1_000_000);
        let lb   = merkle::compute_leaf(addr_b(), 1_000_000);
        let root = merkle::hash_pair_for_test(la, lb);

        let mut proof = vector[];
        vector::push_back(&mut proof, la);

        assert!(merkle::verify_proof(&proof, &root, lb), 0);
    }

    // ── Test 9: wrong sibling yields wrong root — rejected ────────────────────
    #[test]
    fun test_verify_proof_bad_sibling_rejected() {
        let la   = merkle::compute_leaf(addr_a(), 1_000_000);
        let lb   = merkle::compute_leaf(addr_b(), 1_000_000);
        let lc   = merkle::compute_leaf(addr_c(), 1_000_000);
        let root = merkle::hash_pair_for_test(la, lb);

        let mut proof = vector[];
        vector::push_back(&mut proof, lc);

        assert!(!merkle::verify_proof(&proof, &root, la), 0);
    }

    // ── Test 10: max_proof_depth returns 20 ───────────────────────────────────
    #[test]
    fun test_max_proof_depth_value() {
        assert!(merkle::max_proof_depth() == 20, 0);
    }

    // ── Test 11: proof at exactly MAX_PROOF_DEPTH is accepted (no abort) ──────
    #[test]
    fun test_verify_proof_at_max_depth_ok() {
        let leaf    = merkle::compute_leaf(addr_a(), 1_000_000);
        let sibling = zero32();
        let mut proof = vector[];
        let mut i = 0u64;
        while (i < 20) { vector::push_back(&mut proof, sibling); i = i + 1; };
        // Result won't match leaf-as-root, but the call must NOT abort
        let _ = merkle::verify_proof(&proof, &copy leaf, leaf);
    }

    // ── Test 12: proof depth > MAX_PROOF_DEPTH aborts with E_PROOF_TOO_DEEP ───
    #[test]
    #[expected_failure(abort_code = E_PROOF_TOO_DEEP, location = axiom_sui::merkle)]
    fun test_verify_proof_exceeds_max_depth_aborts() {
        let leaf    = merkle::compute_leaf(addr_a(), 1_000_000);
        let sibling = zero32();
        let mut proof = vector[];
        let mut i = 0u64;
        while (i < 21) { vector::push_back(&mut proof, sibling); i = i + 1; };
        merkle::verify_proof(&proof, &copy leaf, leaf);
    }
}
