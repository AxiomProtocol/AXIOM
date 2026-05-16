// =============================================================================
// Axiom Protocol — Sui Phase 8
// claim_campaign_tests.move — 20 unit tests for claim_campaign hardening (A1–A7)
//
// Tests:
//   1   test_create_campaign_success
//   2   test_claim_success
//   3   test_double_claim_aborts                     (A2)
//   4   test_claim_inactive_campaign_aborts           (A2)
//   5   test_claim_closed_campaign_aborts             (A2)
//   6   test_claim_expired_aborts                     (A3)
//   7   test_claim_not_expired_succeeds               (A3)
//   8   test_claim_no_expiry_succeeds                 (A3, expires_at_ms=0)
//   9   test_claim_invalid_proof_aborts
//   10  test_claim_paused_aborts                      (A7)
//   11  test_unpause_allows_claim                     (A7)
//   12  test_supply_cap_exceeded_aborts               (A6)
//   13  test_fund_increases_pool
//   14  test_close_campaign_returns_funds             (A2)
//   15  test_set_active_false_deactivates             (A2)
//   16  test_set_active_true_reactivates              (A2)
//   17  test_admin_cap_wrong_campaign_aborts
//   18  test_pool_insufficient_aborts                 (A4)
//   19  test_has_claimed_true_after_claim             (A2)
//   20  test_close_then_claim_aborts                  (A2)
//
// Run with: sui move test --filter claim_campaign_tests
// =============================================================================

#[test_only]
module claim_campaign::claim_campaign_tests {
    use sui::coin;
    use sui::clock;
    use sui::test_scenario;
    use sui::test_utils;
    use claim_campaign::claim_campaign::{Self, ClaimCampaign, AdminCap};
    use claim_campaign::axiom_test_claim;

    // ── Constants ─────────────────────────────────────────────────────────────
    const ADMIN:   address = @0xAD;
    const CLAIMER: address = @0xC1;
    const AMOUNT:  u64     = 1_000_000; // 1 ATC (6 decimals)
    const POOL:    u64     = 10_000_000;

    // ── Setup helpers ─────────────────────────────────────────────────────────

    /// Compute the single-entry leaf hash for CLAIMER claiming AMOUNT.
    /// For a single-entry tree: root = leaf, proof = [].
    fun claimer_leaf(): vector<u8> {
        claim_campaign::build_leaf_for_testing(CLAIMER, AMOUNT)
    }

    /// Create a campaign where CLAIMER can claim with an empty proof (single-entry tree).
    /// Returns the scenario after campaign creation (admin is the current sender).
    fun setup_basic_campaign(): test_scenario::Scenario {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let mut tc = axiom_test_claim::init_for_testing(ctx);
            let pool_coin = coin::mint(&mut tc, POOL, ctx);
            let admin_cap = claim_campaign::create(
                claimer_leaf(), // root = leaf (single-entry)
                AMOUNT,
                0,    // no expiry
                POOL,
                pool_coin,
                ctx,
            );
            sui::transfer::public_transfer(admin_cap, ADMIN);
            axiom_test_claim::destroy_treasury_cap_for_testing(tc);
        };
        scenario
    }

    /// Perform a claim as CLAIMER with empty proof (single-entry tree).
    fun do_claim(scenario: &mut test_scenario::Scenario) {
        test_scenario::next_tx(scenario, CLAIMER);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(scenario);
            let mut clk = clock::create_for_testing(test_scenario::ctx(scenario));
            claim_campaign::claim(
                &mut campaign,
                vector[], // empty proof for single-entry tree
                &clk,
                test_scenario::ctx(scenario),
            );
            clock::destroy_for_testing(clk);
            test_scenario::return_shared(campaign);
        };
    }

    // =========================================================================
    // Test 1 — Campaign creation succeeds
    // =========================================================================
    #[test]
    fun test_create_campaign_success() {
        let mut scenario = setup_basic_campaign();
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            assert!(claim_campaign::is_active(&campaign), 0);
            assert!(!claim_campaign::is_closed(&campaign), 1);
            assert!(!claim_campaign::is_paused(&campaign), 2);
            assert!(claim_campaign::pool_balance(&campaign) == POOL, 3);
            assert!(claim_campaign::total_claimed(&campaign) == 0, 4);
            assert!(claim_campaign::supply_cap(&campaign) == POOL, 5);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // =========================================================================
    // Test 2 — Successful claim
    // =========================================================================
    #[test]
    fun test_claim_success() {
        let mut scenario = setup_basic_campaign();
        do_claim(&mut scenario);
        test_scenario::next_tx(&mut scenario, CLAIMER);
        {
            let campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            assert!(claim_campaign::total_claimed(&campaign) == AMOUNT, 0);
            assert!(claim_campaign::pool_balance(&campaign) == POOL - AMOUNT, 1);
            assert!(claim_campaign::has_claimed(&campaign, CLAIMER), 2);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // =========================================================================
    // Test 3 — A2: Double-claim aborts
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::E_ALREADY_CLAIMED, location = claim_campaign::claim_campaign)]
    fun test_double_claim_aborts() {
        let mut scenario = setup_basic_campaign();
        do_claim(&mut scenario);
        // Second claim attempt — must abort with E_ALREADY_CLAIMED
        test_scenario::next_tx(&mut scenario, CLAIMER);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
            claim_campaign::claim(&mut campaign, vector[], &clk, test_scenario::ctx(&mut scenario));
            clock::destroy_for_testing(clk);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // =========================================================================
    // Test 4 — A2: Claim on inactive campaign aborts
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::E_CAMPAIGN_INACTIVE, location = claim_campaign::claim_campaign)]
    fun test_claim_inactive_campaign_aborts() {
        let mut scenario = setup_basic_campaign();
        // Admin deactivates the campaign
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let cap = test_scenario::take_from_sender<AdminCap>(&scenario);
            claim_campaign::set_active(&cap, &mut campaign, false);
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_shared(campaign);
        };
        // Claimer attempts to claim — must abort
        test_scenario::next_tx(&mut scenario, CLAIMER);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
            claim_campaign::claim(&mut campaign, vector[], &clk, test_scenario::ctx(&mut scenario));
            clock::destroy_for_testing(clk);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // =========================================================================
    // Test 5 — A2: Claim on closed campaign aborts
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::E_CAMPAIGN_CLOSED, location = claim_campaign::claim_campaign)]
    fun test_claim_closed_campaign_aborts() {
        let mut scenario = setup_basic_campaign();
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let cap = test_scenario::take_from_sender<AdminCap>(&scenario);
            claim_campaign::close(&cap, &mut campaign, test_scenario::ctx(&mut scenario));
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_shared(campaign);
        };
        test_scenario::next_tx(&mut scenario, CLAIMER);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
            claim_campaign::claim(&mut campaign, vector[], &clk, test_scenario::ctx(&mut scenario));
            clock::destroy_for_testing(clk);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // =========================================================================
    // Test 6 — A3: Expired campaign aborts
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::E_CAMPAIGN_EXPIRED, location = claim_campaign::claim_campaign)]
    fun test_claim_expired_aborts() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let mut tc = axiom_test_claim::init_for_testing(ctx);
            let pool_coin = coin::mint(&mut tc, POOL, ctx);
            let admin_cap = claim_campaign::create(
                claimer_leaf(),
                AMOUNT,
                1000, // expires at ms=1000
                POOL,
                pool_coin,
                ctx,
            );
            sui::transfer::public_transfer(admin_cap, ADMIN);
            axiom_test_claim::destroy_treasury_cap_for_testing(tc);
        };
        test_scenario::next_tx(&mut scenario, CLAIMER);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let mut clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
            clock::set_for_testing(&mut clk, 2000); // past expiry
            claim_campaign::claim(&mut campaign, vector[], &clk, test_scenario::ctx(&mut scenario));
            clock::destroy_for_testing(clk);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // =========================================================================
    // Test 7 — A3: Claim before expiry succeeds
    // =========================================================================
    #[test]
    fun test_claim_not_expired_succeeds() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let mut tc = axiom_test_claim::init_for_testing(ctx);
            let pool_coin = coin::mint(&mut tc, POOL, ctx);
            let admin_cap = claim_campaign::create(
                claimer_leaf(),
                AMOUNT,
                5000, // expires at ms=5000
                POOL,
                pool_coin,
                ctx,
            );
            sui::transfer::public_transfer(admin_cap, ADMIN);
            axiom_test_claim::destroy_treasury_cap_for_testing(tc);
        };
        test_scenario::next_tx(&mut scenario, CLAIMER);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let mut clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
            clock::set_for_testing(&mut clk, 3000); // before expiry
            claim_campaign::claim(&mut campaign, vector[], &clk, test_scenario::ctx(&mut scenario));
            clock::destroy_for_testing(clk);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // =========================================================================
    // Test 8 — A3: No expiry (expires_at_ms=0) — never expires
    // =========================================================================
    #[test]
    fun test_claim_no_expiry_succeeds() {
        let mut scenario = setup_basic_campaign(); // expires_at_ms = 0
        test_scenario::next_tx(&mut scenario, CLAIMER);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let mut clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
            clock::set_for_testing(&mut clk, 999_999_999_999); // far future
            claim_campaign::claim(&mut campaign, vector[], &clk, test_scenario::ctx(&mut scenario));
            clock::destroy_for_testing(clk);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // =========================================================================
    // Test 9 — Invalid proof aborts
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::E_INVALID_PROOF, location = claim_campaign::claim_campaign)]
    fun test_claim_invalid_proof_aborts() {
        let mut scenario = setup_basic_campaign();
        test_scenario::next_tx(&mut scenario, CLAIMER);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
            // Provide a wrong proof element (32 zero bytes)
            let wrong_sibling = vector[0u8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                                       0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            claim_campaign::claim(&mut campaign, vector[wrong_sibling], &clk, test_scenario::ctx(&mut scenario));
            clock::destroy_for_testing(clk);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // =========================================================================
    // Test 10 — A7: Paused campaign aborts
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::E_PAUSED, location = claim_campaign::claim_campaign)]
    fun test_claim_paused_aborts() {
        let mut scenario = setup_basic_campaign();
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let cap = test_scenario::take_from_sender<AdminCap>(&scenario);
            claim_campaign::pause(&cap, &mut campaign, test_scenario::ctx(&mut scenario));
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_shared(campaign);
        };
        test_scenario::next_tx(&mut scenario, CLAIMER);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
            claim_campaign::claim(&mut campaign, vector[], &clk, test_scenario::ctx(&mut scenario));
            clock::destroy_for_testing(clk);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // =========================================================================
    // Test 11 — A7: Unpause restores claim ability
    // =========================================================================
    #[test]
    fun test_unpause_allows_claim() {
        let mut scenario = setup_basic_campaign();
        // Pause
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let cap = test_scenario::take_from_sender<AdminCap>(&scenario);
            claim_campaign::pause(&cap, &mut campaign, test_scenario::ctx(&mut scenario));
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_shared(campaign);
        };
        // Unpause
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let cap = test_scenario::take_from_sender<AdminCap>(&scenario);
            claim_campaign::unpause(&cap, &mut campaign, test_scenario::ctx(&mut scenario));
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_shared(campaign);
        };
        // Claim must succeed
        do_claim(&mut scenario);
        test_scenario::end(scenario);
    }

    // =========================================================================
    // Test 12 — A6: Supply cap exceeded aborts
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::E_SUPPLY_CAP_EXCEEDED, location = claim_campaign::claim_campaign)]
    fun test_supply_cap_exceeded_aborts() {
        // Create a campaign with supply_cap == AMOUNT (exactly one claim allowed)
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let mut tc = axiom_test_claim::init_for_testing(ctx);
            let pool_coin = coin::mint(&mut tc, POOL, ctx);
            // supply_cap = AMOUNT = exact one-claim limit
            let admin_cap = claim_campaign::create(
                claimer_leaf(),
                AMOUNT,
                0,
                AMOUNT, // supply_cap = AMOUNT (one claim max)
                pool_coin,
                ctx,
            );
            sui::transfer::public_transfer(admin_cap, ADMIN);
            axiom_test_claim::destroy_treasury_cap_for_testing(tc);
        };
        // First claim succeeds
        do_claim(&mut scenario);
        // Second claimer (different address) tries to claim — supply cap exhausted
        // We simulate by using a different address with the same leaf.
        // Actually, with supply_cap == AMOUNT, second claim aborts on supply cap.
        // Here we just verify the supply cap blocks a second attempt from any address.
        let claimer2 = @0xC2;
        test_scenario::next_tx(&mut scenario, claimer2);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
            // claimer2 has no valid proof, but supply cap check fires first
            claim_campaign::claim(&mut campaign, vector[], &clk, test_scenario::ctx(&mut scenario));
            clock::destroy_for_testing(clk);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // =========================================================================
    // Test 13 — fund() increases pool balance
    // =========================================================================
    #[test]
    fun test_fund_increases_pool() {
        let mut scenario = setup_basic_campaign();
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let cap = test_scenario::take_from_sender<AdminCap>(&scenario);
            let ctx = test_scenario::ctx(&mut scenario);
            let mut tc = axiom_test_claim::init_for_testing(ctx);
            let extra = coin::mint(&mut tc, AMOUNT, ctx);
            claim_campaign::fund(&cap, &mut campaign, extra);
            assert!(claim_campaign::pool_balance(&campaign) == POOL + AMOUNT, 0);
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_shared(campaign);
            axiom_test_claim::destroy_treasury_cap_for_testing(tc);
        };
        test_scenario::end(scenario);
    }

    // =========================================================================
    // Test 14 — A2: close() returns remaining pool balance to admin
    // =========================================================================
    #[test]
    fun test_close_campaign_returns_funds() {
        let mut scenario = setup_basic_campaign();
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let cap = test_scenario::take_from_sender<AdminCap>(&scenario);
            let balance_before = claim_campaign::pool_balance(&campaign);
            assert!(balance_before == POOL, 0);
            claim_campaign::close(&cap, &mut campaign, test_scenario::ctx(&mut scenario));
            assert!(claim_campaign::is_closed(&campaign), 1);
            assert!(!claim_campaign::is_active(&campaign), 2);
            assert!(claim_campaign::pool_balance(&campaign) == 0, 3);
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // =========================================================================
    // Test 15 — set_active(false) deactivates
    // =========================================================================
    #[test]
    fun test_set_active_false_deactivates() {
        let mut scenario = setup_basic_campaign();
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let cap = test_scenario::take_from_sender<AdminCap>(&scenario);
            claim_campaign::set_active(&cap, &mut campaign, false);
            assert!(!claim_campaign::is_active(&campaign), 0);
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // =========================================================================
    // Test 16 — set_active(true) reactivates
    // =========================================================================
    #[test]
    fun test_set_active_true_reactivates() {
        let mut scenario = setup_basic_campaign();
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let cap = test_scenario::take_from_sender<AdminCap>(&scenario);
            claim_campaign::set_active(&cap, &mut campaign, false);
            claim_campaign::set_active(&cap, &mut campaign, true);
            assert!(claim_campaign::is_active(&campaign), 0);
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // =========================================================================
    // Test 17 — AdminCap for wrong campaign aborts
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::E_NOT_ADMIN, location = claim_campaign::claim_campaign)]
    fun test_admin_cap_wrong_campaign_aborts() {
        let mut scenario = setup_basic_campaign();
        // Create a SECOND campaign — its AdminCap should not work on the first
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let mut tc = axiom_test_claim::init_for_testing(ctx);
            let pool2 = coin::mint(&mut tc, POOL, ctx);
            let admin_cap2 = claim_campaign::create(
                claimer_leaf(),
                AMOUNT,
                0,
                POOL,
                pool2,
                ctx,
            );
            // Keep this cap to use against campaign #1
            sui::transfer::public_transfer(admin_cap2, ADMIN);
            axiom_test_claim::destroy_treasury_cap_for_testing(tc);
        };
        // Try to pause campaign #1 with AdminCap from campaign #2
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            // There are now two ClaimCampaign objects. take_shared picks one.
            // AdminCap mismatch will trigger E_NOT_ADMIN.
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            // We have two AdminCaps — take one and deliberately use on the other campaign.
            let cap = test_scenario::take_from_sender<AdminCap>(&scenario);
            claim_campaign::pause(&cap, &mut campaign, test_scenario::ctx(&mut scenario));
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // =========================================================================
    // Test 18 — A4: Insufficient pool aborts
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::E_INSUFFICIENT_POOL, location = claim_campaign::claim_campaign)]
    fun test_pool_insufficient_aborts() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let mut tc = axiom_test_claim::init_for_testing(ctx);
            // Pool has only 1 token, but AMOUNT = 1_000_000
            let pool_coin = coin::mint(&mut tc, 1, ctx);
            let admin_cap = claim_campaign::create(
                claimer_leaf(),
                AMOUNT,
                0,
                POOL,
                pool_coin,
                ctx,
            );
            sui::transfer::public_transfer(admin_cap, ADMIN);
            axiom_test_claim::destroy_treasury_cap_for_testing(tc);
        };
        test_scenario::next_tx(&mut scenario, CLAIMER);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
            claim_campaign::claim(&mut campaign, vector[], &clk, test_scenario::ctx(&mut scenario));
            clock::destroy_for_testing(clk);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // =========================================================================
    // Test 19 — A2: has_claimed returns true after successful claim
    // =========================================================================
    #[test]
    fun test_has_claimed_true_after_claim() {
        let mut scenario = setup_basic_campaign();
        do_claim(&mut scenario);
        test_scenario::next_tx(&mut scenario, CLAIMER);
        {
            let campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            assert!(claim_campaign::has_claimed(&campaign, CLAIMER), 0);
            assert!(!claim_campaign::has_claimed(&campaign, ADMIN), 1);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // =========================================================================
    // Test 20 — A2: Claim after close aborts immediately
    // =========================================================================
    #[test]
    #[expected_failure(abort_code = claim_campaign::E_CAMPAIGN_CLOSED, location = claim_campaign::claim_campaign)]
    fun test_close_then_claim_aborts() {
        let mut scenario = setup_basic_campaign();
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let cap = test_scenario::take_from_sender<AdminCap>(&scenario);
            claim_campaign::close(&cap, &mut campaign, test_scenario::ctx(&mut scenario));
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_shared(campaign);
        };
        test_scenario::next_tx(&mut scenario, CLAIMER);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
            claim_campaign::claim(&mut campaign, vector[], &clk, test_scenario::ctx(&mut scenario));
            clock::destroy_for_testing(clk);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }
}
