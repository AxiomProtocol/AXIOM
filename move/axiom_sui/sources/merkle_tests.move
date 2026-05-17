/// merkle_tests — 11 unit tests for axiom_sui::merkle.
///
/// Tests cover: leaf computation, single-leaf proof, two-leaf proofs (both
/// directions), wrong-root / wrong-leaf / wrong-sibling failures, the
/// MAX_PROOF_DEPTH abort (A1), and the max_proof_depth() accessor.
///
/// TESTNET ONLY. No monetary value.
#[test_only]
module axiom_sui::merkle_tests {
    use axiom_sui::merkle;
    use std::vector;

    // ── Helpers ───────────────────────────────────────────────────────────

    /// Build a proof vector of `depth` dummy 32-byte elements.
    /// Used to trigger the MAX_PROOF_DEPTH abort.
    fun make_long_proof(depth: u64): vector<vector<u8>> {
        let mut proof = vector::empty<vector<u8>>();
        // 32 zero bytes as a dummy sibling
        let dummy = x"0000000000000000000000000000000000000000000000000000000000000000";
        let mut i = 0u64;
        while (i < depth) {
            vector::push_back(&mut proof, dummy);
            i = i + 1;
        };
        proof
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 1: A single-leaf tree's root is the leaf itself.
    //         An empty proof against that root must return true.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_single_leaf_is_own_root() {
        let addr: address = @0x1111111111111111111111111111111111111111111111111111111111111111;
        let amount: u64 = 1_000_000;

        let leaf = merkle::compute_leaf(addr, amount);

        // Single-element tree: root == leaf; proof is empty.
        assert!(merkle::verify_proof(leaf, leaf, vector[]), 0);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 2: Two-leaf tree — user1's proof ([leaf2]) verifies correctly.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_two_leaves_user1_proof_valid() {
        let user1: address = @0x1111111111111111111111111111111111111111111111111111111111111111;
        let user2: address = @0x2222222222222222222222222222222222222222222222222222222222222222;
        let amount: u64 = 1_000_000;

        let leaf1 = merkle::compute_leaf(user1, amount);
        let leaf2 = merkle::compute_leaf(user2, amount);

        // Root = hash_pair(leaf1, leaf2)
        let root = merkle::test_hash_pair(leaf1, leaf2);

        // user1 proof = [leaf2]
        assert!(merkle::verify_proof(root, leaf1, vector[leaf2]), 0);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 3: Two-leaf tree — user2's proof ([leaf1]) verifies correctly.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_two_leaves_user2_proof_valid() {
        let user1: address = @0x1111111111111111111111111111111111111111111111111111111111111111;
        let user2: address = @0x2222222222222222222222222222222222222222222222222222222222222222;
        let amount: u64 = 1_000_000;

        let leaf1 = merkle::compute_leaf(user1, amount);
        let leaf2 = merkle::compute_leaf(user2, amount);

        // Root: hash_pair(leaf1, leaf2) — symmetric, same root
        let root = merkle::test_hash_pair(leaf1, leaf2);

        // user2 proof = [leaf1]
        assert!(merkle::verify_proof(root, leaf2, vector[leaf1]), 0);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 4: Wrong root — verify_proof must return false, not abort.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_wrong_root_returns_false() {
        let addr: address = @0x1111111111111111111111111111111111111111111111111111111111111111;
        let leaf = merkle::compute_leaf(addr, 1_000_000);
        // All-zero root — will not match the leaf hash
        let bad_root = x"0000000000000000000000000000000000000000000000000000000000000000";

        assert!(!merkle::verify_proof(bad_root, leaf, vector[]), 0);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 5: Wrong leaf — verify_proof must return false.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_wrong_leaf_returns_false() {
        let addr: address = @0x1111111111111111111111111111111111111111111111111111111111111111;
        let leaf = merkle::compute_leaf(addr, 1_000_000);
        // Root is the real leaf, but we pass a bad leaf
        let bad_leaf = x"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

        assert!(!merkle::verify_proof(leaf, bad_leaf, vector[]), 0);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 6: Wrong sibling in proof — verify_proof must return false.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_wrong_sibling_returns_false() {
        let user1: address = @0x1111111111111111111111111111111111111111111111111111111111111111;
        let user2: address = @0x2222222222222222222222222222222222222222222222222222222222222222;
        let amount: u64 = 1_000_000;

        let leaf1 = merkle::compute_leaf(user1, amount);
        let leaf2 = merkle::compute_leaf(user2, amount);
        let root = merkle::test_hash_pair(leaf1, leaf2);

        // Wrong sibling — all 0xaa bytes instead of leaf2
        let bad_sibling = x"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        assert!(!merkle::verify_proof(root, leaf1, vector[bad_sibling]), 0);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 7 (A1): Proof with depth 21 must abort with EProofTooDeep (0).
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    #[expected_failure(abort_code = 0)]
    fun test_proof_exceeds_max_depth_aborts() {
        let addr: address = @0x1111111111111111111111111111111111111111111111111111111111111111;
        let leaf = merkle::compute_leaf(addr, 1_000_000);
        let root = x"0000000000000000000000000000000000000000000000000000000000000000";

        // 21 siblings — one more than MAX_PROOF_DEPTH = 20
        let proof = make_long_proof(21);
        merkle::verify_proof(root, leaf, proof);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 8: max_proof_depth() must return 20.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_max_proof_depth_is_twenty() {
        assert!(merkle::max_proof_depth() == 20, 0);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 9 (A1): A proof of exactly MAX_PROOF_DEPTH (20) is accepted
    //              — the depth limit is inclusive, not exclusive.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_proof_at_max_depth_does_not_abort() {
        let addr: address = @0x1111111111111111111111111111111111111111111111111111111111111111;
        let leaf = merkle::compute_leaf(addr, 1_000_000);
        // A 20-element proof with dummy siblings will not hash to the root,
        // but verify_proof must return false rather than abort.
        let proof = make_long_proof(20);
        // false is correct; the key assertion is that no abort occurs.
        assert!(!merkle::verify_proof(leaf, leaf, proof), 0);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 10: bytes_lte is reflexive — a vector is <= itself.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_bytes_lte_reflexive() {
        let v = x"aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899";
        assert!(merkle::test_bytes_lte(&v, &v), 0);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 11: Three-leaf tree — first leaf verifies with a two-element proof.
    //
    // Tree layout (leaves sorted lex before pairing):
    //   L = [leaf1, leaf2, leaf3, leaf3]   (odd leaf duplicated)
    //   Layer1 = [hash(leaf1,leaf2), hash(leaf3,leaf3)]
    //   Root   = hash(Layer1[0], Layer1[1])
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_three_leaf_tree_first_leaf_verifies() {
        let user1: address = @0x1111111111111111111111111111111111111111111111111111111111111111;
        let user2: address = @0x2222222222222222222222222222222222222222222222222222222222222222;
        let user3: address = @0x3333333333333333333333333333333333333333333333333333333333333333;
        let amount: u64 = 1_000_000;

        let leaf1 = merkle::compute_leaf(user1, amount);
        let leaf2 = merkle::compute_leaf(user2, amount);
        let leaf3 = merkle::compute_leaf(user3, amount);

        // Pair the odd leaf with itself (standard odd-leaf duplication)
        let pair_01 = merkle::test_hash_pair(leaf1, leaf2);
        let pair_23 = merkle::test_hash_pair(leaf3, leaf3);
        let root    = merkle::test_hash_pair(pair_01, pair_23);

        // user1's proof: [leaf2, pair_23]
        let proof = vector[leaf2, pair_23];
        assert!(merkle::verify_proof(root, leaf1, proof), 0);
    }
}
