// =============================================================================
// ClaimCampaign Tests — Phase 8 Hardened Suite
//
// Target: >= 28 total tests across this file + merkle_tests.move.
// This file: 20 tests (11 original Sprint 2 + 9 Phase 8 hardening tests).
//
// Phase 8 new tests cover:
//   N1  test_proof_too_long_rejects_claim      — A1: EProofTooLong (code 7)
//   N2  test_campaign_is_closed_flag           — A2: is_closed set on close_campaign
//   N3  test_unpause_after_close_aborts        — A2: ECampaignAlreadyClosed (code 8)
//   N4  test_destroy_admin_cap                 — A3: destroy_admin_cap consumes cap
//   N5  test_transfer_admin_cap_to_new_owner   — A3: transfer_admin_cap + new owner operates
//   N6  test_guarded_treasury_mint             — A4: guarded_mint via GuardedTreasury
//   N7  test_supply_cap_exceeded               — A5: ESupplyCapExceeded (code 9)
//   N8  test_double_mint_boundary              — A5: minting exactly at supply cap succeeds
//   N9  test_four_leaf_claim                   — multi-depth proof (4 leaves, 2 levels)
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
    use axiom_claim_prototype::guarded_treasury::{Self, GuardedTreasury};

    // =========================================================================
    // Test constants
    // =========================================================================
    const ADMIN:        address = @0x000000000000000000000000000000000000000000000000000000000000ADAD;
    const CLAIMANT_A:   address = @0x000000000000000000000000000000000000000000000000000000000000AAA1;
    const CLAIMANT_B:   address = @0x000000000000000000000000000000000000000000000000000000000000AAA2;
    const CLAIMANT_C:   address = @0x000000000000000000000000000000000000000000000000000000000000CCC3;
    const CLAIMANT_D:   address = @0x000000000000000000000000000000000000000000000000000000000000DDD4;
    const NON_CLAIMANT: address = @0x000000000000000000000000000000000000000000000000000000000000BBBB;
    const NEW_OWNER:    address = @0x000000000000000000000000000000000000000000000000000000000000EEEE;

    const AMOUNT_PER_CLAIM: u64 = 1_000_000;  // 1.000000 ATC
    const FUND_AMOUNT:      u64 = 10_000_000; // 10.000000 ATC
    const NO_EXPIRY:        u64 = 0;

    // =========================================================================
    // Shared setup helper.
    //
    // Builds a single-leaf merkle tree for the given claimant:
    //   leaf = compute_leaf(claimant, amount_per_claim)
    //   root = leaf  (single-leaf tree: root equals the leaf)
    //   proof = []   (empty proof for single-leaf verification)
    //
    // Creates the coin module (legacy TreasuryCap path) and a campaign.
    // Returns the scenario after setup. Caller takes ownership.
    //
    // After this helper:
    //   ADMIN holds: TreasuryCap<AXIOM_TEST_CLAIM>, AdminCap
    //   Shared:      ClaimCampaign (inactive, empty pool, merkle_root = leaf)
    // =========================================================================
    fun setup(claimant: address, amount_per_claim: u64): ts::Scenario {
        let mut scenario = ts::begin(ADMIN);

        // Tx 1: initialise AXIOM_TEST_CLAIM coin (legacy TreasuryCap path for existing tests)
        {
            axiom_test_claim::init_for_testing(ts::ctx(&mut scenario));
        };

        // Tx 2: create campaign — merkle root = leaf for claimant
        ts::next_tx(&mut scenario, ADMIN);
        {
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
    // =========================================================================
    #[test]
    fun test_claim_success() {
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);

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
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::EAlreadyClaimed)]
    fun test_claim_duplicate_rejected() {
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

        ts::next_tx(&mut scenario, CLAIMANT_A);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let proof: vector<vector<u8>> = vector[];
            claim_campaign::claim(&mut campaign, proof, ts::ctx(&mut scenario));
            ts::return_shared(campaign);
        };

        ts::next_tx(&mut scenario, CLAIMANT_A);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let proof: vector<vector<u8>> = vector[];
            claim_campaign::claim(&mut campaign, proof, ts::ctx(&mut scenario));
            ts::return_shared(campaign);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Test 3 — test_claim_paused_campaign
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::ENotActive)]
    fun test_claim_paused_campaign() {
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

            ts::return_shared(campaign);
            ts::return_to_address(ADMIN, admin_cap);
            ts::return_to_address(ADMIN, treasury);
        };

        ts::next_tx(&mut scenario, CLAIMANT_A);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let proof: vector<vector<u8>> = vector[];
            claim_campaign::claim(&mut campaign, proof, ts::ctx(&mut scenario));
            ts::return_shared(campaign);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Test 4 — test_campaign_fund_and_pool_decreases (two-leaf tree)
    // =========================================================================
    #[test]
    fun test_campaign_fund_and_pool_decreases() {
        let mut scenario = ts::begin(ADMIN);

        {
            axiom_test_claim::init_for_testing(ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let leaf_a = merkle::compute_leaf(CLAIMANT_A, AMOUNT_PER_CLAIM);
            let leaf_b = merkle::compute_leaf(CLAIMANT_B, AMOUNT_PER_CLAIM);
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
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::ENotActive)]
    fun test_close_campaign() {
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

        ts::next_tx(&mut scenario, CLAIMANT_A);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let proof: vector<vector<u8>> = vector[];
            claim_campaign::claim(&mut campaign, proof, ts::ctx(&mut scenario));
            ts::return_shared(campaign);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Test 7 — test_update_merkle_root_sprint2
    // =========================================================================
    #[test]
    fun test_update_merkle_root_sprint2() {
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

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_address<AdminCap>(&scenario, ADMIN);

            claim_campaign::pause(&mut campaign, &admin_cap);
            assert!(!claim_campaign::is_active(&campaign), 0);

            let root_b = merkle::compute_leaf(CLAIMANT_B, AMOUNT_PER_CLAIM);
            claim_campaign::update_merkle_root(&mut campaign, root_b, &admin_cap);

            claim_campaign::unpause(&mut campaign, &admin_cap);
            assert!(claim_campaign::is_active(&campaign), 1);

            ts::return_shared(campaign);
            ts::return_to_address(ADMIN, admin_cap);
        };

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
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::EInvalidProof)]
    fun test_invalid_proof_rejected_sprint2() {
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

        ts::next_tx(&mut scenario, NON_CLAIMANT);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let proof: vector<vector<u8>> = vector[];
            claim_campaign::claim(&mut campaign, proof, ts::ctx(&mut scenario));
            ts::return_shared(campaign);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Test 9 — test_insufficient_pool
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

            let tokens = coin::mint(&mut treasury, AMOUNT_PER_CLAIM - 1, ts::ctx(&mut scenario));
            claim_campaign::fund_campaign(&mut campaign, tokens, &admin_cap);
            claim_campaign::activate(&mut campaign, &admin_cap);

            assert!(claim_campaign::pool_value(&campaign) < AMOUNT_PER_CLAIM, 0);

            ts::return_shared(campaign);
            ts::return_to_address(ADMIN, admin_cap);
            ts::return_to_address(ADMIN, treasury);
        };

        ts::next_tx(&mut scenario, CLAIMANT_A);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let proof: vector<vector<u8>> = vector[];
            claim_campaign::claim(&mut campaign, proof, ts::ctx(&mut scenario));
            ts::return_shared(campaign);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Test 10 — test_admin_cap_required
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
            claim_campaign::fund_campaign(&mut campaign, tokens, &admin_cap);
            claim_campaign::activate(&mut campaign, &admin_cap);
            claim_campaign::pause(&mut campaign, &admin_cap);
            claim_campaign::unpause(&mut campaign, &admin_cap);

            assert!(claim_campaign::is_active(&campaign), 0);
            assert!(claim_campaign::pool_value(&campaign) == FUND_AMOUNT, 1);

            claim_campaign::pause(&mut campaign, &admin_cap);
            let new_root = merkle::compute_leaf(CLAIMANT_B, AMOUNT_PER_CLAIM);
            claim_campaign::update_merkle_root(&mut campaign, new_root, &admin_cap);

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
    // Test 11 — test_update_merkle_root_requires_paused
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
            claim_campaign::activate(&mut campaign, &admin_cap);

            let new_root = merkle::compute_leaf(CLAIMANT_B, AMOUNT_PER_CLAIM);
            claim_campaign::update_merkle_root(&mut campaign, new_root, &admin_cap);

            ts::return_shared(campaign);
            ts::return_to_address(ADMIN, admin_cap);
            ts::return_to_address(ADMIN, treasury);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Test N1 — test_proof_too_long_rejects_claim
    //
    // Phase 8 A1: A proof vector with more than MAX_PROOF_DEPTH (20) elements
    // aborts with EProofTooLong (code 7) via merkle::verify_proof.
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = merkle::EProofTooLong)]
    fun test_proof_too_long_rejects_claim() {
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

        // Construct a proof with 21 elements (> MAX_PROOF_DEPTH = 20).
        // Each element is a 32-byte zero vector. The actual content doesn't matter —
        // the proof is rejected at length check before any hash comparison.
        ts::next_tx(&mut scenario, CLAIMANT_A);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);

            let dummy_hash = vector[
                0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8,
                0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8,
                0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8,
                0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8,
            ];

            // Build 21-element proof (exceeds MAX_PROOF_DEPTH = 20)
            let mut long_proof: vector<vector<u8>> = vector[];
            let mut i = 0u64;
            while (i < 21) {
                vector::push_back(&mut long_proof, dummy_hash);
                i = i + 1;
            };

            claim_campaign::claim(&mut campaign, long_proof, ts::ctx(&mut scenario));
            ts::return_shared(campaign);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Test N2 — test_campaign_is_closed_flag
    //
    // Phase 8 A2: close_campaign() sets is_closed = true. This is a permanent
    // flag that persists and can be inspected via the test accessor.
    // =========================================================================
    #[test]
    fun test_campaign_is_closed_flag() {
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_address<AdminCap>(&scenario, ADMIN);

            // Before close: is_closed = false
            assert!(!claim_campaign::is_closed(&campaign), 0);

            claim_campaign::close_campaign(&mut campaign, &admin_cap, ts::ctx(&mut scenario));

            // After close: is_closed = true AND is_active = false
            assert!(claim_campaign::is_closed(&campaign), 1);
            assert!(!claim_campaign::is_active(&campaign), 2);

            ts::return_shared(campaign);
            ts::return_to_address(ADMIN, admin_cap);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Test N3 — test_unpause_after_close_aborts
    //
    // Phase 8 A2: After close_campaign(), calling unpause() aborts with
    // ECampaignAlreadyClosed (code 8). Closure is permanent and irreversible.
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::ECampaignAlreadyClosed)]
    fun test_unpause_after_close_aborts() {
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_address<AdminCap>(&scenario, ADMIN);

            claim_campaign::close_campaign(&mut campaign, &admin_cap, ts::ctx(&mut scenario));
            assert!(claim_campaign::is_closed(&campaign), 0);

            // Attempt to reopen — must abort with ECampaignAlreadyClosed
            claim_campaign::unpause(&mut campaign, &admin_cap);

            ts::return_shared(campaign);
            ts::return_to_address(ADMIN, admin_cap);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Test N4 — test_destroy_admin_cap
    //
    // Phase 8 A3: destroy_admin_cap() consumes the AdminCap (deletes its UID).
    // The cap object no longer exists after the call — Move's ownership model
    // guarantees it cannot be used again.
    // =========================================================================
    #[test]
    fun test_destroy_admin_cap() {
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);

        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_address<AdminCap>(&scenario, ADMIN);
            // Consume the AdminCap permanently. If this returns, the cap is gone.
            claim_campaign::destroy_admin_cap(admin_cap);
            // No return needed — AdminCap has been deleted from the object store.
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Test N5 — test_transfer_admin_cap_to_new_owner
    //
    // Phase 8 A3: transfer_admin_cap() moves the AdminCap to a new address.
    // The new owner can immediately call admin-gated functions.
    // =========================================================================
    #[test]
    fun test_transfer_admin_cap_to_new_owner() {
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);

        // Transfer AdminCap from ADMIN to NEW_OWNER
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_address<AdminCap>(&scenario, ADMIN);
            claim_campaign::transfer_admin_cap(admin_cap, NEW_OWNER);
        };

        // NEW_OWNER can now call admin-gated functions
        ts::next_tx(&mut scenario, NEW_OWNER);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_address<AdminCap>(&scenario, NEW_OWNER);
            let mut treasury = ts::take_from_address<TreasuryCap<AXIOM_TEST_CLAIM>>(&scenario, ADMIN);

            // NEW_OWNER successfully funds and activates with their AdminCap
            let tokens = coin::mint(&mut treasury, FUND_AMOUNT, ts::ctx(&mut scenario));
            claim_campaign::fund_campaign(&mut campaign, tokens, &admin_cap);
            claim_campaign::activate(&mut campaign, &admin_cap);

            assert!(claim_campaign::is_active(&campaign), 0);
            assert!(claim_campaign::pool_value(&campaign) == FUND_AMOUNT, 1);

            ts::return_shared(campaign);
            ts::return_to_address(NEW_OWNER, admin_cap);
            ts::return_to_address(ADMIN, treasury);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Test N6 — test_guarded_treasury_mint
    //
    // Phase 8 A4: guarded_mint() via GuardedTreasury produces coins of correct
    // value and increments total_minted. No loose TreasuryCap is involved.
    // =========================================================================
    #[test]
    fun test_guarded_treasury_mint() {
        let mut scenario = ts::begin(ADMIN);

        // Tx 1: init with GuardedTreasury (A4 path)
        {
            axiom_test_claim::init_for_testing_guarded(ts::ctx(&mut scenario));
        };

        // Tx 2: mint via guarded treasury
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut g_treasury = ts::take_from_address<GuardedTreasury<AXIOM_TEST_CLAIM>>(&scenario, ADMIN);

            let coins = guarded_treasury::guarded_mint(
                &mut g_treasury,
                FUND_AMOUNT,
                ts::ctx(&mut scenario),
            );

            // Verify minted amount and total_minted tracking
            assert!(coin::value(&coins) == FUND_AMOUNT, 0);
            assert!(guarded_treasury::total_minted(&g_treasury) == FUND_AMOUNT, 1);

            transfer::public_transfer(coins, ADMIN);
            ts::return_to_address(ADMIN, g_treasury);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Test N7 — test_supply_cap_exceeded
    //
    // Phase 8 A5: Attempting to mint more than MAX_SUPPLY in a single call
    // aborts with ESupplyCapExceeded (code 9).
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = guarded_treasury::ESupplyCapExceeded)]
    fun test_supply_cap_exceeded() {
        let mut scenario = ts::begin(ADMIN);

        {
            axiom_test_claim::init_for_testing_guarded(ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut g_treasury = ts::take_from_address<GuardedTreasury<AXIOM_TEST_CLAIM>>(&scenario, ADMIN);

            // Attempt to mint MAX_SUPPLY + 1 — must abort with ESupplyCapExceeded
            let overflow_amount = guarded_treasury::max_supply() + 1;
            let coins = guarded_treasury::guarded_mint(
                &mut g_treasury,
                overflow_amount,
                ts::ctx(&mut scenario),
            );

            transfer::public_transfer(coins, ADMIN);
            ts::return_to_address(ADMIN, g_treasury);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Test N8 — test_double_mint_boundary
    //
    // Phase 8 A5: Two sequential mints that sum to exactly MAX_SUPPLY both
    // succeed. Verifies that the boundary (==) is accepted, not just (<).
    // =========================================================================
    #[test]
    fun test_double_mint_boundary() {
        let mut scenario = ts::begin(ADMIN);

        {
            axiom_test_claim::init_for_testing_guarded(ts::ctx(&mut scenario));
        };

        // Tx 2: first mint — MAX_SUPPLY - FUND_AMOUNT
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut g_treasury = ts::take_from_address<GuardedTreasury<AXIOM_TEST_CLAIM>>(&scenario, ADMIN);

            let first_amount = guarded_treasury::max_supply() - FUND_AMOUNT;
            let coins = guarded_treasury::guarded_mint(
                &mut g_treasury,
                first_amount,
                ts::ctx(&mut scenario),
            );
            assert!(guarded_treasury::total_minted(&g_treasury) == first_amount, 0);

            transfer::public_transfer(coins, ADMIN);
            ts::return_to_address(ADMIN, g_treasury);
        };

        // Tx 3: second mint — exactly FUND_AMOUNT (total == MAX_SUPPLY, at boundary)
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut g_treasury = ts::take_from_address<GuardedTreasury<AXIOM_TEST_CLAIM>>(&scenario, ADMIN);

            let coins = guarded_treasury::guarded_mint(
                &mut g_treasury,
                FUND_AMOUNT,
                ts::ctx(&mut scenario),
            );
            // At exact boundary — total_minted == MAX_SUPPLY
            assert!(guarded_treasury::total_minted(&g_treasury) == guarded_treasury::max_supply(), 1);

            transfer::public_transfer(coins, ADMIN);
            ts::return_to_address(ADMIN, g_treasury);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Test N9 — test_four_leaf_claim
    //
    // Multi-depth proof: 4-leaf tree with 2 proof levels.
    //
    // Tree structure:
    //   Leaves:  [LA, LB, LC, LD]
    //   Level 1: [I_AB = hash(sort(LA,LB)),  I_CD = hash(sort(LC,LD))]
    //   Root:     hash(sort(I_AB, I_CD))
    //
    // Proof for LA: [LB, I_CD]    (sibling at level 0, then sibling at level 1)
    // Proof for LC: [LD, I_AB]
    //
    // Verifies that claim() correctly traverses a 2-level proof.
    // =========================================================================
    #[test]
    fun test_four_leaf_claim() {
        let mut scenario = ts::begin(ADMIN);

        {
            axiom_test_claim::init_for_testing(ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let la = merkle::compute_leaf(CLAIMANT_A, AMOUNT_PER_CLAIM);
            let lb = merkle::compute_leaf(CLAIMANT_B, AMOUNT_PER_CLAIM);
            let lc = merkle::compute_leaf(CLAIMANT_C, AMOUNT_PER_CLAIM);
            let ld = merkle::compute_leaf(CLAIMANT_D, AMOUNT_PER_CLAIM);

            let i_ab = merkle::hash_pair_for_test(la, lb);
            let i_cd = merkle::hash_pair_for_test(lc, ld);
            let root = merkle::hash_pair_for_test(i_ab, i_cd);

            let admin_cap = claim_campaign::create_campaign(
                std::string::utf8(b"four-leaf-test"),
                root,
                AMOUNT_PER_CLAIM,
                NO_EXPIRY,
                ts::ctx(&mut scenario),
            );
            transfer::public_transfer(admin_cap, ADMIN);
        };

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

        // CLAIMANT_A claims with proof [LB, I_CD]
        ts::next_tx(&mut scenario, CLAIMANT_A);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);

            let lb   = merkle::compute_leaf(CLAIMANT_B, AMOUNT_PER_CLAIM);
            let lc   = merkle::compute_leaf(CLAIMANT_C, AMOUNT_PER_CLAIM);
            let ld   = merkle::compute_leaf(CLAIMANT_D, AMOUNT_PER_CLAIM);
            let i_cd = merkle::hash_pair_for_test(lc, ld);

            let proof = vector[lb, i_cd];
            claim_campaign::claim(&mut campaign, proof, ts::ctx(&mut scenario));
            assert!(claim_campaign::has_claimed(&campaign, CLAIMANT_A), 0);

            ts::return_shared(campaign);
        };

        // CLAIMANT_C claims with proof [LD, I_AB]
        ts::next_tx(&mut scenario, CLAIMANT_C);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);

            let la   = merkle::compute_leaf(CLAIMANT_A, AMOUNT_PER_CLAIM);
            let lb   = merkle::compute_leaf(CLAIMANT_B, AMOUNT_PER_CLAIM);
            let ld   = merkle::compute_leaf(CLAIMANT_D, AMOUNT_PER_CLAIM);
            let i_ab = merkle::hash_pair_for_test(la, lb);

            let proof = vector[ld, i_ab];
            claim_campaign::claim(&mut campaign, proof, ts::ctx(&mut scenario));
            assert!(claim_campaign::has_claimed(&campaign, CLAIMANT_C), 1);

            ts::return_shared(campaign);
        };

        ts::end(scenario);
    }
}
