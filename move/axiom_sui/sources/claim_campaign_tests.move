/// claim_campaign_tests — 20 unit tests for axiom_sui::claim_campaign.
///
/// Covers: AdminCap creation and lifecycle (A3), campaign state machine
/// (activate / pause / unpause / close), is_closed permanence (A2), merkle
/// claim flow (A1 via merkle module), double-claim guard, GuardedTreasury
/// supply cap (A4/A5), and event-emitting operations (A7).
///
/// TESTNET ONLY. No monetary value.
#[test_only]
module axiom_sui::claim_campaign_tests {
    use sui::test_scenario::{Self};
    use sui::transfer;
    use sui::coin;
    use axiom_sui::claim_campaign::{Self, AdminCap, ClaimCampaign};
    use axiom_sui::guarded_treasury::{Self, GuardedTreasury};
    use axiom_sui::axiom_test_claim::{Self, AXIOM_TEST_CLAIM};
    use axiom_sui::merkle;

    // ── Test addresses ────────────────────────────────────────────────────
    const ADMIN: address = @0x000000000000000000000000000000000000000000000000000000000000ADEF;

    // ── Default test amount ───────────────────────────────────────────────
    const AMOUNT: u64 = 1_000_000;

    // ── Helpers ───────────────────────────────────────────────────────────

    /// Returns (leaf, root) for a single-address single-leaf campaign.
    /// Single-leaf tree: root == leaf, proof == [].
    fun single_leaf_root(addr: address, amount: u64): (vector<u8>, vector<u8>) {
        let leaf = merkle::compute_leaf(addr, amount);
        (leaf, leaf)
    }

    /// Boot GuardedTreasury via test_init. Leaves treasury in ADMIN's inventory.
    fun setup_treasury(scenario: &mut sui::test_scenario::Scenario) {
        test_scenario::next_tx(scenario, ADMIN);
        {
            let ctx = test_scenario::ctx(scenario);
            axiom_test_claim::test_init(ctx);
        };
    }

    /// Create a campaign and activate it. Leaves AdminCap in ADMIN's inventory.
    fun setup_active_campaign(
        scenario: &mut sui::test_scenario::Scenario,
        merkle_root: vector<u8>,
    ) {
        test_scenario::next_tx(scenario, ADMIN);
        {
            let ctx = test_scenario::ctx(scenario);
            let cap = claim_campaign::create(merkle_root, AMOUNT, 0, ctx);
            transfer::public_transfer(cap, ADMIN);
        };
        test_scenario::next_tx(scenario, ADMIN);
        {
            let cap = test_scenario::take_from_sender<AdminCap>(scenario);
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(scenario);
            claim_campaign::activate(&mut campaign, &cap);
            test_scenario::return_to_sender(scenario, cap);
            test_scenario::return_shared(campaign);
        };
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 1: create() returns an AdminCap to the caller.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_create_returns_admin_cap() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let cap = claim_campaign::create(
                x"0000000000000000000000000000000000000000000000000000000000000000",
                AMOUNT, 0, ctx,
            );
            transfer::public_transfer(cap, ADMIN);
        };
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            assert!(test_scenario::has_most_recent_for_sender<AdminCap>(&scenario), 0);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 2: Newly created campaign is inactive.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_campaign_initially_inactive() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let cap = claim_campaign::create(
                x"0000000000000000000000000000000000000000000000000000000000000000",
                AMOUNT, 0, ctx,
            );
            transfer::public_transfer(cap, ADMIN);
        };
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            assert!(!claim_campaign::is_active(&campaign), 0);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 3: activate() sets is_active to true.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_activate_makes_active() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let cap = claim_campaign::create(
                x"0000000000000000000000000000000000000000000000000000000000000000",
                AMOUNT, 0, ctx,
            );
            transfer::public_transfer(cap, ADMIN);
        };
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let cap = test_scenario::take_from_sender<AdminCap>(&scenario);
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            claim_campaign::activate(&mut campaign, &cap);
            assert!(claim_campaign::is_active(&campaign), 0);
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 4: pause() sets is_active to false.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_pause_makes_inactive() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let cap = claim_campaign::create(
                x"0000000000000000000000000000000000000000000000000000000000000000",
                AMOUNT, 0, ctx,
            );
            transfer::public_transfer(cap, ADMIN);
        };
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let cap = test_scenario::take_from_sender<AdminCap>(&scenario);
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            claim_campaign::activate(&mut campaign, &cap);
            claim_campaign::pause(&mut campaign, &cap);
            assert!(!claim_campaign::is_active(&campaign), 0);
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 5: unpause() after pause() restores is_active.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_unpause_restores_active() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let cap = claim_campaign::create(
                x"0000000000000000000000000000000000000000000000000000000000000000",
                AMOUNT, 0, ctx,
            );
            transfer::public_transfer(cap, ADMIN);
        };
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let cap = test_scenario::take_from_sender<AdminCap>(&scenario);
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            claim_campaign::activate(&mut campaign, &cap);
            claim_campaign::pause(&mut campaign, &cap);
            claim_campaign::unpause(&mut campaign, &cap);
            assert!(claim_campaign::is_active(&campaign), 0);
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 6: close_campaign() sets is_closed = true and is_active = false.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_close_makes_closed() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let cap = claim_campaign::create(
                x"0000000000000000000000000000000000000000000000000000000000000000",
                AMOUNT, 0, ctx,
            );
            transfer::public_transfer(cap, ADMIN);
        };
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let cap = test_scenario::take_from_sender<AdminCap>(&scenario);
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            claim_campaign::activate(&mut campaign, &cap);
            claim_campaign::close_campaign(&mut campaign, &cap);
            assert!(claim_campaign::is_closed(&campaign), 0);
            assert!(!claim_campaign::is_active(&campaign), 1);
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 7 (A2): unpause() after close_campaign() must abort.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    #[expected_failure(abort_code = 2)]
    fun test_unpause_after_close_aborts() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let cap = claim_campaign::create(
                x"0000000000000000000000000000000000000000000000000000000000000000",
                AMOUNT, 0, ctx,
            );
            transfer::public_transfer(cap, ADMIN);
        };
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let cap = test_scenario::take_from_sender<AdminCap>(&scenario);
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            claim_campaign::close_campaign(&mut campaign, &cap);
            // Must abort with ECampaignAlreadyClosed = 2
            claim_campaign::unpause(&mut campaign, &cap);
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 8 (A2): is_closed flag is persistent after close.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_is_closed_flag_persists() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let cap = claim_campaign::create(
                x"0000000000000000000000000000000000000000000000000000000000000000",
                AMOUNT, 0, ctx,
            );
            transfer::public_transfer(cap, ADMIN);
        };
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let cap = test_scenario::take_from_sender<AdminCap>(&scenario);
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            assert!(!claim_campaign::is_closed(&campaign), 0);
            claim_campaign::close_campaign(&mut campaign, &cap);
            assert!(claim_campaign::is_closed(&campaign), 1);
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 9: set_merkle_root() updates the stored root.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_set_merkle_root_updates_root() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let cap = claim_campaign::create(
                x"0000000000000000000000000000000000000000000000000000000000000000",
                AMOUNT, 0, ctx,
            );
            transfer::public_transfer(cap, ADMIN);
        };
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let cap = test_scenario::take_from_sender<AdminCap>(&scenario);
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let new_root = x"abababababababababababababababababababababababababababababababababab";
            claim_campaign::set_merkle_root(&mut campaign, &cap, new_root);
            assert!(
                claim_campaign::merkle_root(&campaign)
                    == x"abababababababababababababababababababababababababababababababababab",
                0,
            );
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 10 (A3): destroy_admin_cap() completes without abort.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_destroy_admin_cap() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let cap = claim_campaign::create(
                x"0000000000000000000000000000000000000000000000000000000000000000",
                AMOUNT, 0, ctx,
            );
            transfer::public_transfer(cap, ADMIN);
        };
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let cap = test_scenario::take_from_sender<AdminCap>(&scenario);
            claim_campaign::destroy_admin_cap(cap);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 11 (A3): admin_cap_campaign_id() returns the campaign's ID.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_admin_cap_has_campaign_id() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let cap = claim_campaign::create(
                x"0000000000000000000000000000000000000000000000000000000000000000",
                AMOUNT, 0, ctx,
            );
            transfer::public_transfer(cap, ADMIN);
        };
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let cap = test_scenario::take_from_sender<AdminCap>(&scenario);
            // ID accessor must succeed (non-zero campaign ID assigned)
            let _id = claim_campaign::admin_cap_campaign_id(&cap);
            test_scenario::return_to_sender(&scenario, cap);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 12: Successful claim with single-leaf proof (proof == []).
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_claim_single_leaf_proof() {
        let (_, root) = single_leaf_root(ADMIN, AMOUNT);
        let mut scenario = test_scenario::begin(ADMIN);

        setup_treasury(&mut scenario);
        setup_active_campaign(&mut scenario, root);

        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let mut treasury =
                test_scenario::take_from_sender<GuardedTreasury<AXIOM_TEST_CLAIM>>(&scenario);
            let ctx = test_scenario::ctx(&mut scenario);

            let claimed_coin = claim_campaign::claim<AXIOM_TEST_CLAIM>(
                &mut campaign, &mut treasury, AMOUNT, vector[], ctx,
            );
            // Transfer to zero address (burn-equivalent in tests)
            transfer::public_transfer(claimed_coin, @0x0);
            test_scenario::return_shared(campaign);
            test_scenario::return_to_sender(&scenario, treasury);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 13: After a successful claim, has_claimed() returns true.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_claim_marks_address_claimed() {
        let (_, root) = single_leaf_root(ADMIN, AMOUNT);
        let mut scenario = test_scenario::begin(ADMIN);

        setup_treasury(&mut scenario);
        setup_active_campaign(&mut scenario, root);

        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let mut treasury =
                test_scenario::take_from_sender<GuardedTreasury<AXIOM_TEST_CLAIM>>(&scenario);
            let ctx = test_scenario::ctx(&mut scenario);

            let claimed_coin = claim_campaign::claim<AXIOM_TEST_CLAIM>(
                &mut campaign, &mut treasury, AMOUNT, vector[], ctx,
            );
            transfer::public_transfer(claimed_coin, @0x0);
            assert!(claim_campaign::has_claimed(&campaign, ADMIN), 0);

            test_scenario::return_shared(campaign);
            test_scenario::return_to_sender(&scenario, treasury);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 14: Double claim aborts with EAlreadyClaimed = 0.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    #[expected_failure(abort_code = 0)]
    fun test_double_claim_aborts() {
        let (_, root) = single_leaf_root(ADMIN, AMOUNT);
        let mut scenario = test_scenario::begin(ADMIN);

        setup_treasury(&mut scenario);
        setup_active_campaign(&mut scenario, root);

        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let mut treasury =
                test_scenario::take_from_sender<GuardedTreasury<AXIOM_TEST_CLAIM>>(&scenario);
            let ctx = test_scenario::ctx(&mut scenario);

            let c1 = claim_campaign::claim<AXIOM_TEST_CLAIM>(
                &mut campaign, &mut treasury, AMOUNT, vector[], ctx,
            );
            // Second claim from the same address must abort
            let c2 = claim_campaign::claim<AXIOM_TEST_CLAIM>(
                &mut campaign, &mut treasury, AMOUNT, vector[], ctx,
            );
            transfer::public_transfer(c1, @0x0);
            transfer::public_transfer(c2, @0x0);
            test_scenario::return_shared(campaign);
            test_scenario::return_to_sender(&scenario, treasury);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 15: Claiming from an inactive campaign aborts (ECampaignInactive = 1).
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    #[expected_failure(abort_code = 1)]
    fun test_claim_inactive_campaign_aborts() {
        let (_, root) = single_leaf_root(ADMIN, AMOUNT);
        let mut scenario = test_scenario::begin(ADMIN);

        setup_treasury(&mut scenario);

        // Create but do NOT activate
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let cap = claim_campaign::create(root, AMOUNT, 0, ctx);
            transfer::public_transfer(cap, ADMIN);
        };

        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let mut treasury =
                test_scenario::take_from_sender<GuardedTreasury<AXIOM_TEST_CLAIM>>(&scenario);
            let ctx = test_scenario::ctx(&mut scenario);

            // Campaign is inactive — must abort
            let claimed_coin = claim_campaign::claim<AXIOM_TEST_CLAIM>(
                &mut campaign, &mut treasury, AMOUNT, vector[], ctx,
            );
            transfer::public_transfer(claimed_coin, @0x0);
            test_scenario::return_shared(campaign);
            test_scenario::return_to_sender(&scenario, treasury);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 16: Claiming after close_campaign aborts (ECampaignAlreadyClosed = 2).
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    #[expected_failure(abort_code = 2)]
    fun test_claim_closed_campaign_aborts() {
        let (_, root) = single_leaf_root(ADMIN, AMOUNT);
        let mut scenario = test_scenario::begin(ADMIN);

        setup_treasury(&mut scenario);
        setup_active_campaign(&mut scenario, root);

        // Close the campaign
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let cap = test_scenario::take_from_sender<AdminCap>(&scenario);
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            claim_campaign::close_campaign(&mut campaign, &cap);
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_shared(campaign);
        };

        // Attempt to claim — must abort
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let mut treasury =
                test_scenario::take_from_sender<GuardedTreasury<AXIOM_TEST_CLAIM>>(&scenario);
            let ctx = test_scenario::ctx(&mut scenario);

            let claimed_coin = claim_campaign::claim<AXIOM_TEST_CLAIM>(
                &mut campaign, &mut treasury, AMOUNT, vector[], ctx,
            );
            transfer::public_transfer(claimed_coin, @0x0);
            test_scenario::return_shared(campaign);
            test_scenario::return_to_sender(&scenario, treasury);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 17: Claim with incorrect proof aborts (EInvalidProof = 4).
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    #[expected_failure(abort_code = 4)]
    fun test_claim_invalid_proof_aborts() {
        // Set a root that will NOT match compute_leaf(ADMIN, AMOUNT)
        let bad_root = x"abababababababababababababababababababababababababababababababababab";
        let mut scenario = test_scenario::begin(ADMIN);

        setup_treasury(&mut scenario);
        setup_active_campaign(&mut scenario, bad_root);

        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let mut treasury =
                test_scenario::take_from_sender<GuardedTreasury<AXIOM_TEST_CLAIM>>(&scenario);
            let ctx = test_scenario::ctx(&mut scenario);

            // Proof [] won't verify against bad_root — must abort with EInvalidProof = 4
            let claimed_coin = claim_campaign::claim<AXIOM_TEST_CLAIM>(
                &mut campaign, &mut treasury, AMOUNT, vector[], ctx,
            );
            transfer::public_transfer(claimed_coin, @0x0);
            test_scenario::return_shared(campaign);
            test_scenario::return_to_sender(&scenario, treasury);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 18 (A4/A5): GuardedTreasury starts with minted = 0.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_guarded_treasury_new_state() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup_treasury(&mut scenario);

        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let treasury =
                test_scenario::take_from_sender<GuardedTreasury<AXIOM_TEST_CLAIM>>(&scenario);
            assert!(guarded_treasury::total_minted(&treasury) == 0, 0);
            assert!(guarded_treasury::max_supply(&treasury) == axiom_test_claim::max_supply(), 1);
            test_scenario::return_to_sender(&scenario, treasury);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 19 (A5): Minting within cap succeeds and increments total_minted.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_guarded_treasury_mint_within_cap() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup_treasury(&mut scenario);

        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut treasury =
                test_scenario::take_from_sender<GuardedTreasury<AXIOM_TEST_CLAIM>>(&scenario);
            let ctx = test_scenario::ctx(&mut scenario);
            let minted_coin = guarded_treasury::mint(&mut treasury, AMOUNT, ctx);
            assert!(guarded_treasury::total_minted(&treasury) == AMOUNT, 0);
            transfer::public_transfer(minted_coin, @0x0);
            test_scenario::return_to_sender(&scenario, treasury);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 20 (A5): Minting beyond max_supply aborts (ESupplyCapExceeded = 0).
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    #[expected_failure(abort_code = 0)]
    fun test_guarded_treasury_mint_exceeds_cap_aborts() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup_treasury(&mut scenario);

        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut treasury =
                test_scenario::take_from_sender<GuardedTreasury<AXIOM_TEST_CLAIM>>(&scenario);
            let ctx = test_scenario::ctx(&mut scenario);

            // max_supply + 1 must abort with ESupplyCapExceeded = 0
            let overflow = axiom_test_claim::max_supply() + 1;
            let over_coin = guarded_treasury::mint(&mut treasury, overflow, ctx);
            transfer::public_transfer(over_coin, @0x0);
            test_scenario::return_to_sender(&scenario, treasury);
        };
        test_scenario::end(scenario);
    }
}
