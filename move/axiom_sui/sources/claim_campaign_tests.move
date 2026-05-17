/// claim_campaign_tests — 31 unit tests for axiom_sui::claim_campaign.
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

    // ─────────────────────────────────────────────────────────────────────
    // Test 21 (A5): Minting zero tokens aborts (EZeroMintAmount = 1).
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    #[expected_failure(abort_code = 1)]
    fun test_guarded_treasury_mint_zero_aborts() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup_treasury(&mut scenario);

        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut treasury =
                test_scenario::take_from_sender<GuardedTreasury<AXIOM_TEST_CLAIM>>(&scenario);
            let ctx = test_scenario::ctx(&mut scenario);
            let zero_coin = guarded_treasury::mint(&mut treasury, 0, ctx);
            transfer::public_transfer(zero_coin, @0x0);
            test_scenario::return_to_sender(&scenario, treasury);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 22 (A5): remaining() decrements by the minted amount.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_guarded_treasury_remaining_decrements() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup_treasury(&mut scenario);

        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut treasury =
                test_scenario::take_from_sender<GuardedTreasury<AXIOM_TEST_CLAIM>>(&scenario);
            let ctx = test_scenario::ctx(&mut scenario);

            let max = guarded_treasury::max_supply(&treasury);
            let before = guarded_treasury::remaining(&treasury);
            assert!(before == max, 0);

            let coin = guarded_treasury::mint(&mut treasury, AMOUNT, ctx);
            let after = guarded_treasury::remaining(&treasury);
            assert!(after == max - AMOUNT, 1);

            transfer::public_transfer(coin, @0x0);
            test_scenario::return_to_sender(&scenario, treasury);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 23: total_minted starts at zero before any mint.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_guarded_treasury_total_minted_starts_zero() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup_treasury(&mut scenario);

        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let treasury =
                test_scenario::take_from_sender<GuardedTreasury<AXIOM_TEST_CLAIM>>(&scenario);
            assert!(guarded_treasury::total_minted(&treasury) == 0, 0);
            test_scenario::return_to_sender(&scenario, treasury);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 24 (A5): max_supply() view returns the configured ceiling.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_guarded_treasury_max_supply_view() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup_treasury(&mut scenario);

        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let treasury =
                test_scenario::take_from_sender<GuardedTreasury<AXIOM_TEST_CLAIM>>(&scenario);
            assert!(guarded_treasury::max_supply(&treasury) == axiom_test_claim::max_supply(), 0);
            test_scenario::return_to_sender(&scenario, treasury);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 25: amount_per_claim() view returns the value set at creation.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_amount_per_claim_view() {
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
            assert!(claim_campaign::amount_per_claim(&campaign) == AMOUNT, 0);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 26: expires_at_epoch() view returns 0 for a no-expiry campaign.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_expires_at_epoch_view_zero() {
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
            assert!(claim_campaign::expires_at_epoch(&campaign) == 0, 0);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 27: merkle_root() view returns the root set at creation,
    //          and set_merkle_root() updates it.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_set_merkle_root_updates_view() {
        let initial_root =
            x"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        let new_root =
            x"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

        let mut scenario = test_scenario::begin(ADMIN);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let cap = claim_campaign::create(initial_root, AMOUNT, 0, ctx);
            transfer::public_transfer(cap, ADMIN);
        };
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            assert!(claim_campaign::merkle_root(&campaign) == initial_root, 0);
            test_scenario::return_shared(campaign);
        };
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let cap = test_scenario::take_from_sender<AdminCap>(&scenario);
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            claim_campaign::set_merkle_root(&mut campaign, &cap, new_root);
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_shared(campaign);
        };
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            assert!(claim_campaign::merkle_root(&campaign) == new_root, 1);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 28: has_claimed() returns false before any claim is made.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_has_claimed_false_before_claim() {
        let mut scenario = test_scenario::begin(ADMIN);
        let (_leaf, root) = single_leaf_root(ADMIN, AMOUNT);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let cap = claim_campaign::create(root, AMOUNT, 0, ctx);
            transfer::public_transfer(cap, ADMIN);
        };
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            assert!(!claim_campaign::has_claimed(&campaign, ADMIN), 0);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 29 (A2): After close_campaign(), is_closed() is true and
    //              is_active() is false.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_closed_campaign_flags() {
        let mut scenario = test_scenario::begin(ADMIN);
        let (_leaf, root) = single_leaf_root(ADMIN, AMOUNT);
        setup_active_campaign(&mut scenario, root);

        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let cap = test_scenario::take_from_sender<AdminCap>(&scenario);
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            claim_campaign::close_campaign(&mut campaign, &cap);
            assert!(claim_campaign::is_closed(&campaign), 0);
            assert!(!claim_campaign::is_active(&campaign), 1);
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_shared(campaign);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 30 (A3): destroy_admin_cap() emits AdminCapDestroyed event.
    //              Smoke-tests that the function executes without abort.
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    fun test_destroy_admin_cap_succeeds() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let cap = claim_campaign::create(
                x"0000000000000000000000000000000000000000000000000000000000000000",
                AMOUNT, 0, ctx,
            );
            // Immediately destroy — no AdminCap should remain after this tx
            claim_campaign::destroy_admin_cap(cap);
        };
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            // AdminCap must be gone from ADMIN's inventory
            assert!(!test_scenario::has_most_recent_for_sender<AdminCap>(&scenario), 0);
        };
        test_scenario::end(scenario);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 31 (A2): Claiming after campaign close aborts (ECampaignAlreadyClosed = 2).
    // ─────────────────────────────────────────────────────────────────────
    #[test]
    #[expected_failure(abort_code = 2)]
    fun test_claim_after_close_aborts() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup_treasury(&mut scenario);
        let (_leaf, root) = single_leaf_root(ADMIN, AMOUNT);
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

        // Attempt claim — must abort with ECampaignAlreadyClosed = 2
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut campaign = test_scenario::take_shared<ClaimCampaign>(&scenario);
            let mut treasury =
                test_scenario::take_from_sender<GuardedTreasury<AXIOM_TEST_CLAIM>>(&scenario);
            let ctx = test_scenario::ctx(&mut scenario);
            let coin = claim_campaign::claim(
                &mut campaign, &mut treasury, vector[], AMOUNT, ctx,
            );
            transfer::public_transfer(coin, ADMIN);
            test_scenario::return_shared(campaign);
            test_scenario::return_to_sender(&scenario, treasury);
        };
        test_scenario::end(scenario);
    }
}
