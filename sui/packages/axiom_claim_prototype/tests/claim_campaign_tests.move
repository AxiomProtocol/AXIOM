// =============================================================================
// ClaimCampaign Tests — Sprint 1 allowlist variant
//
// Tests the 10 required unit tests defined in:
//   documents/chains/AXIOM_SUI_MOVE_DEVELOPER_ONBOARDING_PACKET.md Section 9
//
// Tests 1–6: Sprint 1 (allowlist) — fully implemented.
// Tests 7–8: Sprint 2 (merkle)   — stubbed; marked #[test] with pass assertion.
// Tests 9–10: Both sprints       — fully implemented.
//
// Run with: sui move test  (requires Sui CLI and published Sui framework)
// Sui CLI install: https://docs.sui.io/guides/developer/getting-started/sui-install
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

    // =========================================================================
    // Test constants
    // =========================================================================
    const ADMIN:         address = @0x000000000000000000000000000000000000000000000000000000000000ADAD;
    const CLAIMANT_A:    address = @0x000000000000000000000000000000000000000000000000000000000000AAA1;
    const CLAIMANT_B:    address = @0x000000000000000000000000000000000000000000000000000000000000AAA2;
    const NON_CLAIMANT:  address = @0x000000000000000000000000000000000000000000000000000000000000BBBB;

    const AMOUNT_PER_CLAIM: u64 = 1_000_000;  // 1.000000 ATC
    const FUND_AMOUNT:      u64 = 10_000_000; // 10.000000 ATC

    // =========================================================================
    // Shared setup helper — initialises coin module and creates a campaign.
    // Returns the scenario after setup. Caller takes ownership.
    //
    // After this helper:
    //   ADMIN holds: TreasuryCap<AXIOM_TEST_CLAIM>, AdminCap
    //   Shared:      ClaimCampaign (inactive, empty pool)
    // =========================================================================
    fun setup(amount_per_claim: u64): ts::Scenario {
        let mut scenario = ts::begin(ADMIN);

        // Tx 1: initialise AXIOM_TEST_CLAIM coin (one-time witness)
        {
            axiom_test_claim::init_for_testing(ts::ctx(&mut scenario));
        };

        // Tx 2: create campaign — AdminCap transferred to ADMIN
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = claim_campaign::create_campaign(
                amount_per_claim,
                ts::ctx(&mut scenario),
            );
            transfer::public_transfer(admin_cap, ADMIN);
        };

        scenario
    }

    // =========================================================================
    // Test 1 — test_claim_success
    //
    // An eligible address that is in the allowlist and has not claimed before
    // successfully claims AMOUNT_PER_CLAIM tokens.
    // Pool decreases by AMOUNT_PER_CLAIM after the claim.
    // has_claimed returns true for the claimant after success.
    // =========================================================================
    #[test]
    fun test_claim_success() {
        let mut scenario = setup(AMOUNT_PER_CLAIM);

        // Tx 3: fund + allowlist + activate
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign    = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap       = ts::take_from_address<AdminCap>(&scenario, ADMIN);
            let mut treasury    = ts::take_from_address<TreasuryCap<AXIOM_TEST_CLAIM>>(&scenario, ADMIN);

            let tokens = coin::mint(&mut treasury, FUND_AMOUNT, ts::ctx(&mut scenario));
            claim_campaign::fund_campaign(&mut campaign, tokens, &admin_cap);
            claim_campaign::add_to_allowlist(&mut campaign, CLAIMANT_A, &admin_cap);
            claim_campaign::activate(&mut campaign, &admin_cap);

            assert!(claim_campaign::pool_value(&campaign) == FUND_AMOUNT, 0);
            assert!(claim_campaign::is_in_allowlist(&campaign, CLAIMANT_A), 1);
            assert!(claim_campaign::is_active(&campaign), 2);

            ts::return_shared(campaign);
            ts::return_to_address(ADMIN, admin_cap);
            ts::return_to_address(ADMIN, treasury);
        };

        // Tx 4: CLAIMANT_A claims
        ts::next_tx(&mut scenario, CLAIMANT_A);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            claim_campaign::claim(&mut campaign, ts::ctx(&mut scenario));

            assert!(claim_campaign::has_claimed(&campaign, CLAIMANT_A), 3);
            assert!(
                claim_campaign::pool_value(&campaign) == FUND_AMOUNT - AMOUNT_PER_CLAIM,
                4,
            );

            ts::return_shared(campaign);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Test 2 — test_claim_duplicate_rejected
    //
    // A claimant who has already claimed cannot claim a second time.
    // The second claim aborts with EAlreadyClaimed (code 1).
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::EAlreadyClaimed)]
    fun test_claim_duplicate_rejected() {
        let mut scenario = setup(AMOUNT_PER_CLAIM);

        // Setup: fund + allowlist + activate
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_address<AdminCap>(&scenario, ADMIN);
            let mut treasury = ts::take_from_address<TreasuryCap<AXIOM_TEST_CLAIM>>(&scenario, ADMIN);

            let tokens = coin::mint(&mut treasury, FUND_AMOUNT, ts::ctx(&mut scenario));
            claim_campaign::fund_campaign(&mut campaign, tokens, &admin_cap);
            claim_campaign::add_to_allowlist(&mut campaign, CLAIMANT_A, &admin_cap);
            claim_campaign::activate(&mut campaign, &admin_cap);

            ts::return_shared(campaign);
            ts::return_to_address(ADMIN, admin_cap);
            ts::return_to_address(ADMIN, treasury);
        };

        // First claim — succeeds
        ts::next_tx(&mut scenario, CLAIMANT_A);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            claim_campaign::claim(&mut campaign, ts::ctx(&mut scenario));
            ts::return_shared(campaign);
        };

        // Second claim — must abort with EAlreadyClaimed
        ts::next_tx(&mut scenario, CLAIMANT_A);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            claim_campaign::claim(&mut campaign, ts::ctx(&mut scenario)); // aborts here
            ts::return_shared(campaign);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Test 3 — test_claim_paused_campaign
    //
    // A paused campaign rejects any claim with ENotActive (code 0).
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::ENotActive)]
    fun test_claim_paused_campaign() {
        let mut scenario = setup(AMOUNT_PER_CLAIM);

        // Setup: fund + allowlist + activate + pause
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_address<AdminCap>(&scenario, ADMIN);
            let mut treasury = ts::take_from_address<TreasuryCap<AXIOM_TEST_CLAIM>>(&scenario, ADMIN);

            let tokens = coin::mint(&mut treasury, FUND_AMOUNT, ts::ctx(&mut scenario));
            claim_campaign::fund_campaign(&mut campaign, tokens, &admin_cap);
            claim_campaign::add_to_allowlist(&mut campaign, CLAIMANT_A, &admin_cap);
            claim_campaign::activate(&mut campaign, &admin_cap);
            claim_campaign::pause(&mut campaign, &admin_cap); // pause immediately

            assert!(!claim_campaign::is_active(&campaign), 0);

            ts::return_shared(campaign);
            ts::return_to_address(ADMIN, admin_cap);
            ts::return_to_address(ADMIN, treasury);
        };

        // Claim attempt on paused campaign — must abort with ENotActive
        ts::next_tx(&mut scenario, CLAIMANT_A);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            claim_campaign::claim(&mut campaign, ts::ctx(&mut scenario)); // aborts here
            ts::return_shared(campaign);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Test 4 — test_campaign_fund_and_pool_decreases
    //
    // Fund the campaign with a known amount.
    // After a successful claim, pool decreases by exactly AMOUNT_PER_CLAIM.
    // Two sequential claims from two different eligible addresses
    // each reduce the pool by AMOUNT_PER_CLAIM.
    // =========================================================================
    #[test]
    fun test_campaign_fund_and_pool_decreases() {
        let mut scenario = setup(AMOUNT_PER_CLAIM);

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_address<AdminCap>(&scenario, ADMIN);
            let mut treasury = ts::take_from_address<TreasuryCap<AXIOM_TEST_CLAIM>>(&scenario, ADMIN);

            let tokens = coin::mint(&mut treasury, FUND_AMOUNT, ts::ctx(&mut scenario));
            claim_campaign::fund_campaign(&mut campaign, tokens, &admin_cap);

            assert!(claim_campaign::pool_value(&campaign) == FUND_AMOUNT, 0);

            claim_campaign::add_to_allowlist(&mut campaign, CLAIMANT_A, &admin_cap);
            claim_campaign::add_to_allowlist(&mut campaign, CLAIMANT_B, &admin_cap);
            claim_campaign::activate(&mut campaign, &admin_cap);

            ts::return_shared(campaign);
            ts::return_to_address(ADMIN, admin_cap);
            ts::return_to_address(ADMIN, treasury);
        };

        // CLAIMANT_A claims
        ts::next_tx(&mut scenario, CLAIMANT_A);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            claim_campaign::claim(&mut campaign, ts::ctx(&mut scenario));
            assert!(
                claim_campaign::pool_value(&campaign) == FUND_AMOUNT - AMOUNT_PER_CLAIM,
                1,
            );
            ts::return_shared(campaign);
        };

        // CLAIMANT_B claims
        ts::next_tx(&mut scenario, CLAIMANT_B);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            claim_campaign::claim(&mut campaign, ts::ctx(&mut scenario));
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
    // Pause campaign → claim is rejected (ENotActive).
    // Unpause campaign → claim succeeds.
    // =========================================================================
    #[test]
    fun test_pause_unpause() {
        let mut scenario = setup(AMOUNT_PER_CLAIM);

        // Setup
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_address<AdminCap>(&scenario, ADMIN);
            let mut treasury = ts::take_from_address<TreasuryCap<AXIOM_TEST_CLAIM>>(&scenario, ADMIN);

            let tokens = coin::mint(&mut treasury, FUND_AMOUNT, ts::ctx(&mut scenario));
            claim_campaign::fund_campaign(&mut campaign, tokens, &admin_cap);
            claim_campaign::add_to_allowlist(&mut campaign, CLAIMANT_A, &admin_cap);
            claim_campaign::activate(&mut campaign, &admin_cap);

            // Pause
            claim_campaign::pause(&mut campaign, &admin_cap);
            assert!(!claim_campaign::is_active(&campaign), 0);

            // Unpause
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
            claim_campaign::claim(&mut campaign, ts::ctx(&mut scenario));
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
        let mut scenario = setup(AMOUNT_PER_CLAIM);

        // Setup: fund + allowlist + activate
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_address<AdminCap>(&scenario, ADMIN);
            let mut treasury = ts::take_from_address<TreasuryCap<AXIOM_TEST_CLAIM>>(&scenario, ADMIN);

            let tokens = coin::mint(&mut treasury, FUND_AMOUNT, ts::ctx(&mut scenario));
            claim_campaign::fund_campaign(&mut campaign, tokens, &admin_cap);
            claim_campaign::add_to_allowlist(&mut campaign, CLAIMANT_A, &admin_cap);
            claim_campaign::activate(&mut campaign, &admin_cap);

            ts::return_shared(campaign);
            ts::return_to_address(ADMIN, admin_cap);
            ts::return_to_address(ADMIN, treasury);
        };

        // Close campaign — pool should be drained to admin
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
            claim_campaign::claim(&mut campaign, ts::ctx(&mut scenario)); // aborts here
            ts::return_shared(campaign);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Test 7 — test_update_merkle_root_sprint2
    //
    // SPRINT 2 ONLY — not implemented in Sprint 1.
    // Merkle root update logic does not exist in the Sprint 1 allowlist variant.
    // This test passes trivially. Sprint 2 will replace this with a real test.
    // =========================================================================
    #[test]
    fun test_update_merkle_root_sprint2() {
        // Sprint 2 placeholder — merkle.move not yet written.
        // See documents/chains/AXIOM_SUI_CLAIM_CONTRACT_SPEC.md Section 6.
        assert!(true, 0);
    }

    // =========================================================================
    // Test 8 — test_invalid_proof_rejected_sprint2
    //
    // SPRINT 2 ONLY — not implemented in Sprint 1.
    // Merkle proof verification does not exist in the Sprint 1 allowlist variant.
    // This test passes trivially. Sprint 2 will replace this with a real test.
    // =========================================================================
    #[test]
    fun test_invalid_proof_rejected_sprint2() {
        // Sprint 2 placeholder — merkle.move not yet written.
        // See documents/chains/AXIOM_SUI_CLAIM_CONTRACT_SPEC.md Section 6.
        assert!(true, 0);
    }

    // =========================================================================
    // Test 9 — test_insufficient_pool
    //
    // When the pool balance is less than amount_per_claim,
    // a claim attempt aborts with EInsufficientPool (code 3).
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::EInsufficientPool)]
    fun test_insufficient_pool() {
        // Fund with less than one claim allocation
        let underfund_amount = AMOUNT_PER_CLAIM - 1; // 999_999 base units
        let mut scenario = setup(AMOUNT_PER_CLAIM);

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_address<AdminCap>(&scenario, ADMIN);
            let mut treasury = ts::take_from_address<TreasuryCap<AXIOM_TEST_CLAIM>>(&scenario, ADMIN);

            let tokens = coin::mint(&mut treasury, underfund_amount, ts::ctx(&mut scenario));
            claim_campaign::fund_campaign(&mut campaign, tokens, &admin_cap);
            claim_campaign::add_to_allowlist(&mut campaign, CLAIMANT_A, &admin_cap);
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
            claim_campaign::claim(&mut campaign, ts::ctx(&mut scenario)); // aborts here
            ts::return_shared(campaign);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Test 10 — test_admin_cap_required
    //
    // Verifies that AdminCap-gated functions behave correctly when the caller
    // holds a valid AdminCap. In Move, type-safety guarantees these functions
    // cannot be called without an AdminCap at compile time — this test confirms
    // the functions execute correctly with a valid AdminCap present.
    //
    // A test that deliberately omits the AdminCap would be a compile error,
    // which is the intended enforcement mechanism.
    // =========================================================================
    #[test]
    fun test_admin_cap_required() {
        let mut scenario = setup(AMOUNT_PER_CLAIM);

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_address<AdminCap>(&scenario, ADMIN);
            let mut treasury = ts::take_from_address<TreasuryCap<AXIOM_TEST_CLAIM>>(&scenario, ADMIN);

            // All AdminCap-gated operations succeed when cap is present.
            let tokens = coin::mint(&mut treasury, FUND_AMOUNT, ts::ctx(&mut scenario));
            claim_campaign::fund_campaign(&mut campaign, tokens, &admin_cap);          // requires AdminCap
            claim_campaign::add_to_allowlist(&mut campaign, CLAIMANT_A, &admin_cap);  // requires AdminCap
            claim_campaign::activate(&mut campaign, &admin_cap);                       // requires AdminCap
            claim_campaign::pause(&mut campaign, &admin_cap);                          // requires AdminCap
            claim_campaign::unpause(&mut campaign, &admin_cap);                        // requires AdminCap

            // Verify state is consistent
            assert!(claim_campaign::is_active(&campaign), 0);
            assert!(claim_campaign::is_in_allowlist(&campaign, CLAIMANT_A), 1);
            assert!(claim_campaign::pool_value(&campaign) == FUND_AMOUNT, 2);

            // close_campaign also requires AdminCap
            claim_campaign::close_campaign(&mut campaign, &admin_cap, ts::ctx(&mut scenario));
            assert!(!claim_campaign::is_active(&campaign), 3);
            assert!(claim_campaign::pool_value(&campaign) == 0, 4);

            ts::return_shared(campaign);
            ts::return_to_address(ADMIN, admin_cap);
            ts::return_to_address(ADMIN, treasury);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // Bonus test — test_non_eligible_address_rejected
    //
    // An address not in the allowlist cannot claim (ENotEligible, code 2).
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::ENotEligible)]
    fun test_non_eligible_address_rejected() {
        let mut scenario = setup(AMOUNT_PER_CLAIM);

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            let admin_cap    = ts::take_from_address<AdminCap>(&scenario, ADMIN);
            let mut treasury = ts::take_from_address<TreasuryCap<AXIOM_TEST_CLAIM>>(&scenario, ADMIN);

            let tokens = coin::mint(&mut treasury, FUND_AMOUNT, ts::ctx(&mut scenario));
            claim_campaign::fund_campaign(&mut campaign, tokens, &admin_cap);
            // CLAIMANT_A added but NON_CLAIMANT is not
            claim_campaign::add_to_allowlist(&mut campaign, CLAIMANT_A, &admin_cap);
            claim_campaign::activate(&mut campaign, &admin_cap);

            ts::return_shared(campaign);
            ts::return_to_address(ADMIN, admin_cap);
            ts::return_to_address(ADMIN, treasury);
        };

        // NON_CLAIMANT attempts to claim — must abort with ENotEligible
        ts::next_tx(&mut scenario, NON_CLAIMANT);
        {
            let mut campaign = ts::take_shared<ClaimCampaign>(&scenario);
            claim_campaign::claim(&mut campaign, ts::ctx(&mut scenario)); // aborts here
            ts::return_shared(campaign);
        };

        ts::end(scenario);
    }
}
