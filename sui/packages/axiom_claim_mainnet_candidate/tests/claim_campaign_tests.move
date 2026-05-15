// =============================================================================
// ClaimCampaign Tests — Phase 9 Mainnet Candidate (20 tests)
//
// All Phase 8 hardening tests (A1-A7) carried forward.
// Module namespace updated to axiom_claim_mainnet_candidate.
// Token type updated to AXIOM_MAINNET_CLAIM.
// =============================================================================

#[test_only]
module axiom_claim_mainnet_candidate::claim_campaign_tests {
    use sui::test_scenario::{Self as ts};
    use sui::coin::{Self, TreasuryCap};
    use axiom_claim_mainnet_candidate::claim_campaign::{
        Self, AdminCap, ClaimCampaign,
    };
    use axiom_claim_mainnet_candidate::axiom_mainnet_claim::{Self, AXIOM_MAINNET_CLAIM};
    use axiom_claim_mainnet_candidate::merkle;
    use axiom_claim_mainnet_candidate::guarded_treasury::{Self, GuardedTreasury};

    const ADMIN:        address = @0x000000000000000000000000000000000000000000000000000000000000ADAD;
    const CLAIMANT_A:   address = @0x000000000000000000000000000000000000000000000000000000000000AAA1;
    const CLAIMANT_B:   address = @0x000000000000000000000000000000000000000000000000000000000000AAA2;
    const CLAIMANT_C:   address = @0x000000000000000000000000000000000000000000000000000000000000CCC3;
    const CLAIMANT_D:   address = @0x000000000000000000000000000000000000000000000000000000000000DDD4;
    const NON_CLAIMANT: address = @0x000000000000000000000000000000000000000000000000000000000000BBBB;
    const NEW_OWNER:    address = @0x000000000000000000000000000000000000000000000000000000000000EEEE;

    const AMOUNT_PER_CLAIM: u64 = 1_000_000;
    const FUND_AMOUNT:      u64 = 10_000_000;
    const NO_EXPIRY:        u64 = 0;

    // =========================================================================
    // Setup helper: single-leaf merkle tree for claimant.
    // root = leaf (single leaf), proof = [] (empty).
    // =========================================================================
    fun setup(claimant: address, amount_per_claim: u64): ts::Scenario {
        let mut scenario = ts::begin(ADMIN);
        {
            axiom_mainnet_claim::init_for_testing(ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);
        {
            let root = merkle::compute_leaf(claimant, amount_per_claim);
            let admin_cap = claim_campaign::create_campaign(
                std::string::utf8(b"test-campaign"),
                root, amount_per_claim, NO_EXPIRY,
                ts::ctx(&mut scenario),
            );
            transfer::public_transfer(admin_cap, ADMIN);
        };
        scenario
    }

    fun fund_and_activate(scenario: &mut ts::Scenario, amount: u64) {
        ts::next_tx(scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(scenario);
            let admin_cap    = ts::take_from_sender<AdminCap>(scenario);
            let mut treasury = ts::take_from_sender<TreasuryCap<AXIOM_MAINNET_CLAIM>>(scenario);
            let coins = coin::mint(&mut treasury, amount, ts::ctx(scenario));
            claim_campaign::fund_campaign(&mut campaign, coins, &admin_cap);
            claim_campaign::activate(&mut campaign, &admin_cap);
            ts::return_shared(campaign);
            ts::return_to_sender(scenario, admin_cap);
            ts::return_to_sender(scenario, treasury);
        };
    }

    // =========================================================================
    // Test 1 — Eligible claimant receives allocation
    // =========================================================================
    #[test]
    fun test_eligible_claim_succeeds() {
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);
        fund_and_activate(&mut scenario, FUND_AMOUNT);
        ts::next_tx(&mut scenario, CLAIMANT_A);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let proof: vector<vector<u8>> = vector[];
            claim_campaign::claim(&mut campaign, proof, ts::ctx(&mut scenario));
            assert!(claim_campaign::has_claimed(&campaign, CLAIMANT_A), 0);
            assert!(claim_campaign::pool_value(&campaign) == FUND_AMOUNT - AMOUNT_PER_CLAIM, 1);
            ts::return_shared(campaign);
        };
        ts::end(scenario);
    }

    // =========================================================================
    // Test 2 — Duplicate claim rejected (EAlreadyClaimed = 3)
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::EAlreadyClaimed)]
    fun test_duplicate_claim_rejected() {
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);
        fund_and_activate(&mut scenario, FUND_AMOUNT);
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
    // Test 3 — Non-eligible claimant rejected (EInvalidProof = 4)
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::EInvalidProof)]
    fun test_non_eligible_rejected() {
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);
        fund_and_activate(&mut scenario, FUND_AMOUNT);
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
    // Test 4 — Paused campaign blocks claims (ENotActive = 1)
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::ENotActive)]
    fun test_paused_campaign_blocks_claim() {
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);
        fund_and_activate(&mut scenario, FUND_AMOUNT);
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_sender<AdminCap>(&scenario);
            claim_campaign::pause(&mut campaign, &admin_cap);
            ts::return_shared(campaign);
            ts::return_to_sender(&scenario, admin_cap);
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
    // Test 5 — Pause/unpause cycle works
    // =========================================================================
    #[test]
    fun test_pause_unpause_cycle() {
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);
        fund_and_activate(&mut scenario, FUND_AMOUNT);
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_sender<AdminCap>(&scenario);
            claim_campaign::pause(&mut campaign, &admin_cap);
            assert!(!claim_campaign::is_active(&campaign), 0);
            claim_campaign::unpause(&mut campaign, &admin_cap);
            assert!(claim_campaign::is_active(&campaign), 1);
            ts::return_shared(campaign);
            ts::return_to_sender(&scenario, admin_cap);
        };
        ts::end(scenario);
    }

    // =========================================================================
    // Test 6 — Insufficient pool rejects claim (EInsufficientPool = 5)
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::EInsufficientPool)]
    fun test_insufficient_pool_rejects_claim() {
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_sender<AdminCap>(&scenario);
            claim_campaign::activate(&mut campaign, &admin_cap);
            ts::return_shared(campaign);
            ts::return_to_sender(&scenario, admin_cap);
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
    // Test 7 — Update merkle root on paused campaign
    // =========================================================================
    #[test]
    fun test_update_merkle_root_paused() {
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);
        fund_and_activate(&mut scenario, FUND_AMOUNT);
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_sender<AdminCap>(&scenario);
            claim_campaign::pause(&mut campaign, &admin_cap);
            let new_root = merkle::compute_leaf(CLAIMANT_B, AMOUNT_PER_CLAIM);
            claim_campaign::update_merkle_root(&mut campaign, new_root, &admin_cap);
            let stored = claim_campaign::merkle_root(&campaign);
            assert!(stored == new_root, 0);
            ts::return_shared(campaign);
            ts::return_to_sender(&scenario, admin_cap);
        };
        ts::end(scenario);
    }

    // =========================================================================
    // Test 8 — Update merkle root on active campaign aborts (ECampaignNotPaused = 6)
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::ECampaignNotPaused)]
    fun test_update_root_active_aborts() {
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);
        fund_and_activate(&mut scenario, FUND_AMOUNT);
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_sender<AdminCap>(&scenario);
            let new_root = merkle::compute_leaf(CLAIMANT_B, AMOUNT_PER_CLAIM);
            claim_campaign::update_merkle_root(&mut campaign, new_root, &admin_cap);
            ts::return_shared(campaign);
            ts::return_to_sender(&scenario, admin_cap);
        };
        ts::end(scenario);
    }

    // =========================================================================
    // Test 9 — Close campaign drains pool and is permanent
    // =========================================================================
    #[test]
    fun test_close_campaign_drains_pool() {
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);
        fund_and_activate(&mut scenario, FUND_AMOUNT);
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_sender<AdminCap>(&scenario);
            claim_campaign::close_campaign(&mut campaign, &admin_cap, ts::ctx(&mut scenario));
            assert!(claim_campaign::is_closed(&campaign), 0);
            assert!(!claim_campaign::is_active(&campaign), 1);
            assert!(claim_campaign::pool_value(&campaign) == 0, 2);
            ts::return_shared(campaign);
            ts::return_to_sender(&scenario, admin_cap);
        };
        ts::end(scenario);
    }

    // =========================================================================
    // Test 10 — Multi-claimant scenario (Claimant A and B both claim)
    // =========================================================================
    #[test]
    fun test_multi_claimant_both_claim() {
        let mut scenario = ts::begin(ADMIN);
        {
            axiom_mainnet_claim::init_for_testing(ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);
        {
            let leaf_a = merkle::compute_leaf(CLAIMANT_A, AMOUNT_PER_CLAIM);
            let leaf_b = merkle::compute_leaf(CLAIMANT_B, AMOUNT_PER_CLAIM);
            let root   = merkle::hash_pair_for_test(leaf_a, leaf_b);
            let admin_cap = claim_campaign::create_campaign(
                std::string::utf8(b"multi-test"),
                root, AMOUNT_PER_CLAIM, NO_EXPIRY,
                ts::ctx(&mut scenario),
            );
            transfer::public_transfer(admin_cap, ADMIN);
        };
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_sender<AdminCap>(&scenario);
            let mut treasury = ts::take_from_sender<TreasuryCap<AXIOM_MAINNET_CLAIM>>(&scenario);
            let coins = coin::mint(&mut treasury, FUND_AMOUNT, ts::ctx(&mut scenario));
            claim_campaign::fund_campaign(&mut campaign, coins, &admin_cap);
            claim_campaign::activate(&mut campaign, &admin_cap);
            ts::return_shared(campaign);
            ts::return_to_sender(&scenario, admin_cap);
            ts::return_to_sender(&scenario, treasury);
        };
        let leaf_b = merkle::compute_leaf(CLAIMANT_B, AMOUNT_PER_CLAIM);
        ts::next_tx(&mut scenario, CLAIMANT_A);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            claim_campaign::claim(&mut campaign, vector[leaf_b], ts::ctx(&mut scenario));
            assert!(claim_campaign::has_claimed(&campaign, CLAIMANT_A), 0);
            ts::return_shared(campaign);
        };
        let leaf_a = merkle::compute_leaf(CLAIMANT_A, AMOUNT_PER_CLAIM);
        ts::next_tx(&mut scenario, CLAIMANT_B);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            claim_campaign::claim(&mut campaign, vector[leaf_a], ts::ctx(&mut scenario));
            assert!(claim_campaign::has_claimed(&campaign, CLAIMANT_B), 1);
            ts::return_shared(campaign);
        };
        ts::end(scenario);
    }

    // =========================================================================
    // Test N1 — A1: proof > MAX_PROOF_DEPTH aborts with EProofTooLong (7)
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = merkle::EProofTooLong)]
    fun test_proof_too_long_rejects_claim() {
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);
        fund_and_activate(&mut scenario, FUND_AMOUNT);
        ts::next_tx(&mut scenario, CLAIMANT_A);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let dummy: vector<u8> = vector[
                0u8,0u8,0u8,0u8,0u8,0u8,0u8,0u8,0u8,0u8,0u8,0u8,0u8,0u8,0u8,0u8,
                0u8,0u8,0u8,0u8,0u8,0u8,0u8,0u8,0u8,0u8,0u8,0u8,0u8,0u8,0u8,0u8,
            ];
            let mut long_proof: vector<vector<u8>> = vector[];
            let mut i = 0u64;
            while (i <= 20u64) { vector::push_back(&mut long_proof, dummy); i = i + 1; };
            claim_campaign::claim(&mut campaign, long_proof, ts::ctx(&mut scenario));
            ts::return_shared(campaign);
        };
        ts::end(scenario);
    }

    // =========================================================================
    // Test N2 — A2: is_closed flag set on close_campaign
    // =========================================================================
    #[test]
    fun test_campaign_is_closed_flag() {
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);
        fund_and_activate(&mut scenario, FUND_AMOUNT);
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_sender<AdminCap>(&scenario);
            assert!(!claim_campaign::is_closed(&campaign), 0);
            claim_campaign::close_campaign(&mut campaign, &admin_cap, ts::ctx(&mut scenario));
            assert!(claim_campaign::is_closed(&campaign), 1);
            ts::return_shared(campaign);
            ts::return_to_sender(&scenario, admin_cap);
        };
        ts::end(scenario);
    }

    // =========================================================================
    // Test N3 — A2: unpause after close aborts (ECampaignAlreadyClosed = 8)
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::ECampaignAlreadyClosed)]
    fun test_unpause_after_close_aborts() {
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);
        fund_and_activate(&mut scenario, FUND_AMOUNT);
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_sender<AdminCap>(&scenario);
            claim_campaign::close_campaign(&mut campaign, &admin_cap, ts::ctx(&mut scenario));
            claim_campaign::unpause(&mut campaign, &admin_cap);
            ts::return_shared(campaign);
            ts::return_to_sender(&scenario, admin_cap);
        };
        ts::end(scenario);
    }

    // =========================================================================
    // Test N4 — A3: destroy_admin_cap consumes AdminCap permanently
    // =========================================================================
    #[test]
    fun test_destroy_admin_cap() {
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            claim_campaign::destroy_admin_cap(admin_cap);
        };
        ts::end(scenario);
    }

    // =========================================================================
    // Test N5 — A3: transfer_admin_cap to new owner; new owner can pause
    // =========================================================================
    #[test]
    fun test_transfer_admin_cap_to_new_owner() {
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);
        fund_and_activate(&mut scenario, FUND_AMOUNT);
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            claim_campaign::transfer_admin_cap(admin_cap, NEW_OWNER);
        };
        ts::next_tx(&mut scenario, NEW_OWNER);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_sender<AdminCap>(&scenario);
            claim_campaign::pause(&mut campaign, &admin_cap);
            assert!(!claim_campaign::is_active(&campaign), 0);
            ts::return_shared(campaign);
            ts::return_to_sender(&scenario, admin_cap);
        };
        ts::end(scenario);
    }

    // =========================================================================
    // Test N6 — A4: guarded_mint via GuardedTreasury
    // =========================================================================
    #[test]
    fun test_guarded_treasury_mint() {
        let mut scenario = ts::begin(ADMIN);
        {
            axiom_mainnet_claim::init_for_testing_guarded(ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut gt = ts::take_from_sender<GuardedTreasury<AXIOM_MAINNET_CLAIM>>(&scenario);
            assert!(guarded_treasury::total_minted(&gt) == 0, 0);
            let coins = guarded_treasury::guarded_mint(&mut gt, AMOUNT_PER_CLAIM, ts::ctx(&mut scenario));
            assert!(guarded_treasury::total_minted(&gt) == AMOUNT_PER_CLAIM, 1);
            transfer::public_transfer(coins, ADMIN);
            ts::return_to_sender(&scenario, gt);
        };
        ts::end(scenario);
    }

    // =========================================================================
    // Test N7 — A5: ESupplyCapExceeded (9)
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = guarded_treasury::ESupplyCapExceeded)]
    fun test_supply_cap_exceeded() {
        let mut scenario = ts::begin(ADMIN);
        {
            axiom_mainnet_claim::init_for_testing_guarded(ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut gt = ts::take_from_sender<GuardedTreasury<AXIOM_MAINNET_CLAIM>>(&scenario);
            let max = guarded_treasury::max_supply();
            let coins1 = guarded_treasury::guarded_mint(&mut gt, max, ts::ctx(&mut scenario));
            let coins2 = guarded_treasury::guarded_mint(&mut gt, 1, ts::ctx(&mut scenario));
            transfer::public_transfer(coins1, ADMIN);
            transfer::public_transfer(coins2, ADMIN);
            ts::return_to_sender(&scenario, gt);
        };
        ts::end(scenario);
    }

    // =========================================================================
    // Test N8 — A5: Mint exactly at supply cap succeeds
    // =========================================================================
    #[test]
    fun test_double_mint_boundary() {
        let mut scenario = ts::begin(ADMIN);
        {
            axiom_mainnet_claim::init_for_testing_guarded(ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut gt = ts::take_from_sender<GuardedTreasury<AXIOM_MAINNET_CLAIM>>(&scenario);
            let half = guarded_treasury::max_supply() / 2;
            let coins1 = guarded_treasury::guarded_mint(&mut gt, half, ts::ctx(&mut scenario));
            let coins2 = guarded_treasury::guarded_mint(&mut gt, half, ts::ctx(&mut scenario));
            assert!(guarded_treasury::total_minted(&gt) == half + half, 0);
            transfer::public_transfer(coins1, ADMIN);
            transfer::public_transfer(coins2, ADMIN);
            ts::return_to_sender(&scenario, gt);
        };
        ts::end(scenario);
    }

    // =========================================================================
    // Test N9 — 4-leaf Merkle tree (multi-depth proof)
    // =========================================================================
    #[test]
    fun test_four_leaf_claim() {
        let mut scenario = ts::begin(ADMIN);
        {
            axiom_mainnet_claim::init_for_testing(ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);
        {
            let leaf_a = merkle::compute_leaf(CLAIMANT_A, AMOUNT_PER_CLAIM);
            let leaf_b = merkle::compute_leaf(CLAIMANT_B, AMOUNT_PER_CLAIM);
            let leaf_c = merkle::compute_leaf(CLAIMANT_C, AMOUNT_PER_CLAIM);
            let leaf_d = merkle::compute_leaf(CLAIMANT_D, AMOUNT_PER_CLAIM);
            let parent_ab = merkle::hash_pair_for_test(leaf_a, leaf_b);
            let parent_cd = merkle::hash_pair_for_test(leaf_c, leaf_d);
            let root = merkle::hash_pair_for_test(parent_ab, parent_cd);
            let admin_cap = claim_campaign::create_campaign(
                std::string::utf8(b"four-leaf"),
                root, AMOUNT_PER_CLAIM, NO_EXPIRY,
                ts::ctx(&mut scenario),
            );
            transfer::public_transfer(admin_cap, ADMIN);
        };
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_sender<AdminCap>(&scenario);
            let mut treasury = ts::take_from_sender<TreasuryCap<AXIOM_MAINNET_CLAIM>>(&scenario);
            let coins = coin::mint(&mut treasury, FUND_AMOUNT, ts::ctx(&mut scenario));
            claim_campaign::fund_campaign(&mut campaign, coins, &admin_cap);
            claim_campaign::activate(&mut campaign, &admin_cap);
            ts::return_shared(campaign);
            ts::return_to_sender(&scenario, admin_cap);
            ts::return_to_sender(&scenario, treasury);
        };
        ts::next_tx(&mut scenario, CLAIMANT_A);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let leaf_b = merkle::compute_leaf(CLAIMANT_B, AMOUNT_PER_CLAIM);
            let leaf_c = merkle::compute_leaf(CLAIMANT_C, AMOUNT_PER_CLAIM);
            let leaf_d = merkle::compute_leaf(CLAIMANT_D, AMOUNT_PER_CLAIM);
            let parent_cd = merkle::hash_pair_for_test(leaf_c, leaf_d);
            let proof = vector[leaf_b, parent_cd];
            claim_campaign::claim(&mut campaign, proof, ts::ctx(&mut scenario));
            assert!(claim_campaign::has_claimed(&campaign, CLAIMANT_A), 0);
            ts::return_shared(campaign);
        };
        ts::end(scenario);
    }

    // =========================================================================
    // Test N10 — Pool balance accumulates correctly across multiple fund calls
    // =========================================================================
    #[test]
    fun test_pool_balance_accumulates() {
        let mut scenario = setup(CLAIMANT_A, AMOUNT_PER_CLAIM);
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_sender<AdminCap>(&scenario);
            let mut treasury = ts::take_from_sender<TreasuryCap<AXIOM_MAINNET_CLAIM>>(&scenario);
            let coins1 = coin::mint(&mut treasury, AMOUNT_PER_CLAIM, ts::ctx(&mut scenario));
            let coins2 = coin::mint(&mut treasury, AMOUNT_PER_CLAIM, ts::ctx(&mut scenario));
            claim_campaign::fund_campaign(&mut campaign, coins1, &admin_cap);
            assert!(claim_campaign::pool_value(&campaign) == AMOUNT_PER_CLAIM, 0);
            claim_campaign::fund_campaign(&mut campaign, coins2, &admin_cap);
            assert!(claim_campaign::pool_value(&campaign) == AMOUNT_PER_CLAIM * 2, 1);
            ts::return_shared(campaign);
            ts::return_to_sender(&scenario, admin_cap);
            ts::return_to_sender(&scenario, treasury);
        };
        ts::end(scenario);
    }
}
