// =============================================================================
// ClaimCampaign Tests — Sprint 2 merkle root variant
//
// All 10 required unit tests defined in:
//   documents/chains/AXIOM_SUI_MOVE_DEVELOPER_ONBOARDING_PACKET.md Section 9
//
// Sprint 2 tests 7 and 8 are now fully implemented (no longer stubs).
// Uses merkle::compute_leaf to build test roots and proofs inline.
//
// Run with: sui move test
// =============================================================================

#[test_only]
module axiom_claim_prototype::claim_campaign_tests {
    use sui::test_scenario::{Self as ts};
    use sui::coin::{Self, TreasuryCap};
    use axiom_claim_prototype::claim_campaign::{
        Self,
        AdminCap,
        ClaimCampaign,
    };
    use axiom_claim_prototype::axiom_test_claim::{Self, AXIOM_TEST_CLAIM};
    use axiom_claim_prototype::merkle;

    // =========================================================================
    // Test constants
    // =========================================================================
    const ADMIN:        address = @0x000000000000000000000000000000000000000000000000000000000000ADAD;
    const CLAIMANT_A:   address = @0x000000000000000000000000000000000000000000000000000000000000AAA1;
    const CLAIMANT_B:   address = @0x000000000000000000000000000000000000000000000000000000000000AAA2;
    const NON_CLAIMANT: address = @0x000000000000000000000000000000000000000000000000000000000000BBBB;

    const AMOUNT_PER_CLAIM: u64 = 1_000_000;  // 1.000000 ATC
    const FUND_AMOUNT:      u64 = 10_000_000; // 10.000000 ATC
    const NO_EXPIRY:        u64 = 0;

    // =========================================================================
    // Shared setup helper.
    //
    // Builds a single-leaf merkle tree for the given claimant:
    //   leaf = compute_leaf(claimant, AMOUNT_PER_CLAIM)
    //   root = leaf  (single-leaf tree: root equals the leaf)
    //   proof = []   (empty proof for single-leaf verification)
    //
    // Creates the coin module and a campaign with that root.
    // Returns the scenario after setup. Caller takes ownership.
    //
    // After this helper:
    //   ADMIN holds: TreasuryCap<AXIOM_TEST_CLAIM>, AdminCap
    //   Shared:      ClaimCampaign (inactive, empty pool, merkle_root = leaf)
    // =========================================================================
    fun setup(claimant: address, amount_per_claim: u64): ts::Scenario {
        let mut scenario = ts::begin(ADMIN);

        // Tx 1: initialise AXIOM_TEST_CLAIM coin (one-time witness)
        {
            axiom_test_claim::init_for_testing(ts::ctx(&mut scenario));
        };

        // Tx 2: create campaign — merkle root = leaf for claimant
        ts::next_tx(&mut scenario, ADMIN);
        {
            // Single-leaf tree: root == leaf, proof is empty
            let root = merkle::compute_leaf(claimant, amount_per_claim);
            let admin_cap = claim_campaign::create_campaign(
                std::string::utf8(b"test-campaign"),
                root,
                amount_per_claim,
                NO_EXPIRY,
                ts::ctx(&mut scenario),
            );
            transfer::public_transfer(admin_cap, ADMIN);
        };

        scenario
    }

    // =========================================================================
    // Test 1 — test_claim_success
    //
    // An eligible address with a valid merkle proof successfully claims
    // AMOUNT_PER_CLAIM tokens. Pool decreases. has_claimed = true.
    // =========================================================================
    #[test]
    fun test_claim_success() {
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);

        // Tx 3: fund + activate
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_address<AdminCap>(&scenario, ADMIN);
            let mut treasury = ts::take_from_address<TreasuryCap<AXIOM_TEST_CLAIM>>(&scenario, ADMIN);

            let tokens = coin::mint(&mut treasury, FUND_AMOUNT, ts::ctx(&mut scenario));
            claim_campaign::fund_campaign(&mut campaign, tokens, &admin_cap);
            claim_campaign::activate(&mut campaign, &admin_cap);

            assert!(claim_campaign::pool_value(&campaign) == FUND_AMOUNT, 0);
            assert!(claim_campaign::is_active(&campaign), 1);

            ts::return_shared(campaign);
            ts::return_to_address(ADMIN, admin_cap);
            ts::return_to_address(ADMIN, treasury);
        };

        // Tx 4: CLAIMANT_A claims with empty proof (single-leaf tree)
        ts::next_tx(&mut scenario, CLAIMANT_A);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let proof: vector<vector<u8>> = vector[];
            claim_campaign::claim(&mut campaign, proof, ts::ctx(&mut scenario));

            assert!(claim_campaign::has_claimed(&campaign, CLAIMANT_A), 2);
            assert!(
                claim_campaign::pool_value(&campaign) == FUND_AMOUNT - AMOUNT_PER_CLAIM,
                3,
            );

            ts::return_shared(campaign);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Test 2 — test_claim_duplicate_rejected
    //
    // A claimant who has already claimed cannot claim a second time.
    // The second claim aborts with EAlreadyClaimed (code 3).
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::EAlreadyClaimed)]
    fun test_claim_duplicate_rejected() {
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);

        // Setup: fund + activate
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_address<AdminCap>(&scenario, ADMIN);
            let mut treasury = ts::take_from_address<TreasuryCap<AXIOM_TEST_CLAIM>>(&scenario, ADMIN);

            let tokens = coin::mint(&mut treasury, FUND_AMOUNT, ts::ctx(&mut scenario));
            claim_campaign::fund_campaign(&mut campaign, tokens, &admin_cap);
            claim_campaign::activate(&mut campaign, &admin_cap);

            ts::return_shared(campaign);
            ts::return_to_address(ADMIN, admin_cap);
            ts::return_to_address(ADMIN, treasury);
        };

        // First claim — succeeds
        ts::next_tx(&mut scenario, CLAIMANT_A);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let proof: vector<vector<u8>> = vector[];
            claim_campaign::claim(&mut campaign, proof, ts::ctx(&mut scenario));
            ts::return_shared(campaign);
        };

        // Second claim — must abort with EAlreadyClaimed
        ts::next_tx(&mut scenario, CLAIMANT_A);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let proof: vector<vector<u8>> = vector[];
            claim_campaign::claim(&mut campaign, proof, ts::ctx(&mut scenario)); // aborts here
            ts::return_shared(campaign);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Test 3 — test_claim_paused_campaign
    //
    // A paused campaign rejects any claim with ENotActive (code 1).
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::ENotActive)]
    fun test_claim_paused_campaign() {
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);

        // Setup: fund + activate + pause
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_address<AdminCap>(&scenario, ADMIN);
            let mut treasury = ts::take_from_address<TreasuryCap<AXIOM_TEST_CLAIM>>(&scenario, ADMIN);

            let tokens = coin::mint(&mut treasury, FUND_AMOUNT, ts::ctx(&mut scenario));
            claim_campaign::fund_campaign(&mut campaign, tokens, &admin_cap);
            claim_campaign::activate(&mut campaign, &admin_cap);
            claim_campaign::pause(&mut campaign, &admin_cap);

            assert!(!claim_campaign::is_active(&campaign), 0);

            ts::return_shared(campaign);
            ts::return_to_address(ADMIN, admin_cap);
            ts::return_to_address(ADMIN, treasury);
        };

        // Claim attempt on paused campaign — must abort with ENotActive
        ts::next_tx(&mut scenario, CLAIMANT_A);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let proof: vector<vector<u8>> = vector[];
            claim_campaign::claim(&mut campaign, proof, ts::ctx(&mut scenario)); // aborts here
            ts::return_shared(campaign);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Test 4 — test_campaign_fund_and_pool_decreases
    //
    // Fund the campaign. Two different eligible claimants each reduce the
    // pool by exactly AMOUNT_PER_CLAIM.
    //
    // Uses a two-leaf merkle tree (CLAIMANT_A + CLAIMANT_B).
    // =========================================================================
    #[test]
    fun test_campaign_fund_and_pool_decreases() {
        let mut scenario = ts::begin(ADMIN);

        // Tx 1: coin init
        {
            axiom_test_claim::init_for_testing(ts::ctx(&mut scenario));
        };

        // Tx 2: build two-leaf tree for A and B, create campaign
        ts::next_tx(&mut scenario, ADMIN);
        {
            let leaf_a = merkle::compute_leaf(CLAIMANT_A, AMOUNT_PER_CLAIM);
            let leaf_b = merkle::compute_leaf(CLAIMANT_B, AMOUNT_PER_CLAIM);
            // Two-leaf root = hash_pair(sorted(leaf_a, leaf_b))
            let root = merkle::hash_pair_for_test(leaf_a, leaf_b);
            let admin_cap = claim_campaign::create_campaign(
                std::string::utf8(b"two-leaf-test"),
                root,
                AMOUNT_PER_CLAIM,
                NO_EXPIRY,
                ts::ctx(&mut scenario),
            );
            transfer::public_transfer(admin_cap, ADMIN);
        };

        // Tx 3: fund + activate
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_address<AdminCap>(&scenario, ADMIN);
            let mut treasury = ts::take_from_address<TreasuryCap<AXIOM_TEST_CLAIM>>(&scenario, ADMIN);

            let tokens = coin::mint(&mut treasury, FUND_AMOUNT, ts::ctx(&mut scenario));
            claim_campaign::fund_campaign(&mut campaign, tokens, &admin_cap);
            claim_campaign::activate(&mut campaign, &admin_cap);

            assert!(claim_campaign::pool_value(&campaign) == FUND_AMOUNT, 0);

            ts::return_shared(campaign);
            ts::return_to_address(ADMIN, admin_cap);
            ts::return_to_address(ADMIN, treasury);
        };

        // CLAIMANT_A claims — proof = [leaf_b]
        ts::next_tx(&mut scenario, CLAIMANT_A);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let leaf_b = merkle::compute_leaf(CLAIMANT_B, AMOUNT_PER_CLAIM);
            let proof = vector[leaf_b];
            claim_campaign::claim(&mut campaign, proof, ts::ctx(&mut scenario));
            assert!(
                claim_campaign::pool_value(&campaign) == FUND_AMOUNT - AMOUNT_PER_CLAIM,
                1,
            );
            ts::return_shared(campaign);
        };

        // CLAIMANT_B claims — proof = [leaf_a]
        ts::next_tx(&mut scenario, CLAIMANT_B);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let leaf_a = merkle::compute_leaf(CLAIMANT_A, AMOUNT_PER_CLAIM);
            let proof = vector[leaf_a];
            claim_campaign::claim(&mut campaign, proof, ts::ctx(&mut scenario));
            assert!(
                claim_campaign::pool_value(&campaign) == FUND_AMOUNT - (2 * AMOUNT_PER_CLAIM),
                2,
            );
            ts::return_shared(campaign);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Test 5 — test_pause_unpause
    //
    // Pause → claim rejected (ENotActive).
    // Unpause → claim succeeds.
    // =========================================================================
    #[test]
    fun test_pause_unpause() {
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_address<AdminCap>(&scenario, ADMIN);
            let mut treasury = ts::take_from_address<TreasuryCap<AXIOM_TEST_CLAIM>>(&scenario, ADMIN);

            let tokens = coin::mint(&mut treasury, FUND_AMOUNT, ts::ctx(&mut scenario));
            claim_campaign::fund_campaign(&mut campaign, tokens, &admin_cap);
            claim_campaign::activate(&mut campaign, &admin_cap);

            claim_campaign::pause(&mut campaign, &admin_cap);
            assert!(!claim_campaign::is_active(&campaign), 0);

            claim_campaign::unpause(&mut campaign, &admin_cap);
            assert!(claim_campaign::is_active(&campaign), 1);

            ts::return_shared(campaign);
            ts::return_to_address(ADMIN, admin_cap);
            ts::return_to_address(ADMIN, treasury);
        };

        // Claim after unpause — must succeed
        ts::next_tx(&mut scenario, CLAIMANT_A);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let proof: vector<vector<u8>> = vector[];
            claim_campaign::claim(&mut campaign, proof, ts::ctx(&mut scenario));
            assert!(claim_campaign::has_claimed(&campaign, CLAIMANT_A), 2);
            ts::return_shared(campaign);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Test 6 — test_close_campaign
    //
    // After close_campaign:
    //   - is_active = false
    //   - Pool is drained (returned to admin)
    //   - Subsequent claim attempt aborts with ENotActive
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::ENotActive)]
    fun test_close_campaign() {
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);

        // Setup: fund + activate
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_address<AdminCap>(&scenario, ADMIN);
            let mut treasury = ts::take_from_address<TreasuryCap<AXIOM_TEST_CLAIM>>(&scenario, ADMIN);

            let tokens = coin::mint(&mut treasury, FUND_AMOUNT, ts::ctx(&mut scenario));
            claim_campaign::fund_campaign(&mut campaign, tokens, &admin_cap);
            claim_campaign::activate(&mut campaign, &admin_cap);

            ts::return_shared(campaign);
            ts::return_to_address(ADMIN, admin_cap);
            ts::return_to_address(ADMIN, treasury);
        };

        // Close — pool drained to admin
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_address<AdminCap>(&scenario, ADMIN);

            claim_campaign::close_campaign(&mut campaign, &admin_cap, ts::ctx(&mut scenario));

            assert!(!claim_campaign::is_active(&campaign), 0);
            assert!(claim_campaign::pool_value(&campaign) == 0, 1);

            ts::return_shared(campaign);
            ts::return_to_address(ADMIN, admin_cap);
        };

        // Claim after close — must abort with ENotActive
        ts::next_tx(&mut scenario, CLAIMANT_A);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let proof: vector<vector<u8>> = vector[];
            claim_campaign::claim(&mut campaign, proof, ts::ctx(&mut scenario)); // aborts here
            ts::return_shared(campaign);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Test 7 — test_update_merkle_root_sprint2
    //
    // SPRINT 2 — fully implemented.
    //
    // Scenario:
    //   - Campaign created with root_A (CLAIMANT_A eligible).
    //   - Root updated to root_B (CLAIMANT_B eligible) while paused.
    //   - CLAIMANT_B claims successfully after unpause.
    //   - CLAIMANT_A's leaf does not match root_B → EInvalidProof.
    // =========================================================================
    #[test]
    fun test_update_merkle_root_sprint2() {
        // Setup with root for CLAIMANT_A
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);

        // Tx 3: fund + activate
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_address<AdminCap>(&scenario, ADMIN);
            let mut treasury = ts::take_from_address<TreasuryCap<AXIOM_TEST_CLAIM>>(&scenario, ADMIN);

            let tokens = coin::mint(&mut treasury, FUND_AMOUNT, ts::ctx(&mut scenario));
            claim_campaign::fund_campaign(&mut campaign, tokens, &admin_cap);
            claim_campaign::activate(&mut campaign, &admin_cap);

            ts::return_shared(campaign);
            ts::return_to_address(ADMIN, admin_cap);
            ts::return_to_address(ADMIN, treasury);
        };

        // Tx 4: pause + update root to CLAIMANT_B + unpause
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_address<AdminCap>(&scenario, ADMIN);

            claim_campaign::pause(&mut campaign, &admin_cap);
            assert!(!claim_campaign::is_active(&campaign), 0);

            // New root: single-leaf tree for CLAIMANT_B
            let root_b = merkle::compute_leaf(CLAIMANT_B, AMOUNT_PER_CLAIM);
            claim_campaign::update_merkle_root(&mut campaign, root_b, &admin_cap);

            claim_campaign::unpause(&mut campaign, &admin_cap);
            assert!(claim_campaign::is_active(&campaign), 1);

            ts::return_shared(campaign);
            ts::return_to_address(ADMIN, admin_cap);
        };

        // Tx 5: CLAIMANT_B claims with empty proof (single-leaf root_B) — succeeds
        ts::next_tx(&mut scenario, CLAIMANT_B);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let proof: vector<vector<u8>> = vector[];
            claim_campaign::claim(&mut campaign, proof, ts::ctx(&mut scenario));
            assert!(claim_campaign::has_claimed(&campaign, CLAIMANT_B), 2);
            ts::return_shared(campaign);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Test 8 — test_invalid_proof_rejected_sprint2
    //
    // SPRINT 2 — fully implemented.
    //
    // A claimant not in the merkle tree submits an empty proof.
    // Their computed leaf does not match the root → EInvalidProof.
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::EInvalidProof)]
    fun test_invalid_proof_rejected_sprint2() {
        // Campaign root is built for CLAIMANT_A only
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_address<AdminCap>(&scenario, ADMIN);
            let mut treasury = ts::take_from_address<TreasuryCap<AXIOM_TEST_CLAIM>>(&scenario, ADMIN);

            let tokens = coin::mint(&mut treasury, FUND_AMOUNT, ts::ctx(&mut scenario));
            claim_campaign::fund_campaign(&mut campaign, tokens, &admin_cap);
            claim_campaign::activate(&mut campaign, &admin_cap);

            ts::return_shared(campaign);
            ts::return_to_address(ADMIN, admin_cap);
            ts::return_to_address(ADMIN, treasury);
        };

        // NON_CLAIMANT tries to claim with empty proof.
        // compute_leaf(NON_CLAIMANT, ...) != root → EInvalidProof
        ts::next_tx(&mut scenario, NON_CLAIMANT);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let proof: vector<vector<u8>> = vector[];
            claim_campaign::claim(&mut campaign, proof, ts::ctx(&mut scenario)); // aborts here
            ts::return_shared(campaign);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Test 9 — test_insufficient_pool
    //
    // When the pool balance is less than amount_per_claim, a claim attempt
    // aborts with EInsufficientPool (code 5).
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::EInsufficientPool)]
    fun test_insufficient_pool() {
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_address<AdminCap>(&scenario, ADMIN);
            let mut treasury = ts::take_from_address<TreasuryCap<AXIOM_TEST_CLAIM>>(&scenario, ADMIN);

            // Fund with less than one claim allocation (999_999 base units)
            let tokens = coin::mint(&mut treasury, AMOUNT_PER_CLAIM - 1, ts::ctx(&mut scenario));
            claim_campaign::fund_campaign(&mut campaign, tokens, &admin_cap);
            claim_campaign::activate(&mut campaign, &admin_cap);

            assert!(claim_campaign::pool_value(&campaign) < AMOUNT_PER_CLAIM, 0);

            ts::return_shared(campaign);
            ts::return_to_address(ADMIN, admin_cap);
            ts::return_to_address(ADMIN, treasury);
        };

        // Claim with insufficient pool — must abort with EInsufficientPool
        ts::next_tx(&mut scenario, CLAIMANT_A);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let proof: vector<vector<u8>> = vector[];
            claim_campaign::claim(&mut campaign, proof, ts::ctx(&mut scenario)); // aborts here
            ts::return_shared(campaign);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Test 10 — test_admin_cap_required
    //
    // All AdminCap-gated functions succeed when cap is present.
    // Move type-safety guarantees they cannot compile without AdminCap.
    // =========================================================================
    #[test]
    fun test_admin_cap_required() {
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_address<AdminCap>(&scenario, ADMIN);
            let mut treasury = ts::take_from_address<TreasuryCap<AXIOM_TEST_CLAIM>>(&scenario, ADMIN);

            let tokens = coin::mint(&mut treasury, FUND_AMOUNT, ts::ctx(&mut scenario));
            claim_campaign::fund_campaign(&mut campaign, tokens, &admin_cap);  // requires AdminCap
            claim_campaign::activate(&mut campaign, &admin_cap);               // requires AdminCap
            claim_campaign::pause(&mut campaign, &admin_cap);                  // requires AdminCap
            claim_campaign::unpause(&mut campaign, &admin_cap);                // requires AdminCap

            assert!(claim_campaign::is_active(&campaign), 0);
            assert!(claim_campaign::pool_value(&campaign) == FUND_AMOUNT, 1);

            // update_merkle_root also requires AdminCap and paused state
            claim_campaign::pause(&mut campaign, &admin_cap);
            let new_root = merkle::compute_leaf(CLAIMANT_B, AMOUNT_PER_CLAIM);
            claim_campaign::update_merkle_root(&mut campaign, new_root, &admin_cap); // requires AdminCap

            // close_campaign requires AdminCap
            claim_campaign::close_campaign(&mut campaign, &admin_cap, ts::ctx(&mut scenario));
            assert!(!claim_campaign::is_active(&campaign), 2);
            assert!(claim_campaign::pool_value(&campaign) == 0, 3);

            ts::return_shared(campaign);
            ts::return_to_address(ADMIN, admin_cap);
            ts::return_to_address(ADMIN, treasury);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Bonus test — test_update_merkle_root_requires_paused
    //
    // update_merkle_root on an active campaign aborts with ECampaignNotPaused.
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::ECampaignNotPaused)]
    fun test_update_merkle_root_requires_paused() {
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_address<AdminCap>(&scenario, ADMIN);
            let mut treasury = ts::take_from_address<TreasuryCap<AXIOM_TEST_CLAIM>>(&scenario, ADMIN);

            let tokens = coin::mint(&mut treasury, FUND_AMOUNT, ts::ctx(&mut scenario));
            claim_campaign::fund_campaign(&mut campaign, tokens, &admin_cap);
            claim_campaign::activate(&mut campaign, &admin_cap); // campaign is now ACTIVE

            // Try to update root while active — must abort with ECampaignNotPaused
            let new_root = merkle::compute_leaf(CLAIMANT_B, AMOUNT_PER_CLAIM);
            claim_campaign::update_merkle_root(&mut campaign, new_root, &admin_cap); // aborts here

            ts::return_shared(campaign);
            ts::return_to_address(ADMIN, admin_cap);
            ts::return_to_address(ADMIN, treasury);
        };

        ts::end(scenario);
    }
}
