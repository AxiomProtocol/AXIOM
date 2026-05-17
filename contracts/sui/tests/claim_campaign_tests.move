/// Axiom Protocol — Claim Campaign Hardening Tests
///
/// 29 tests (tests 11–39 of the ≥28 target).
/// Covers A1–A7 audit hardening from claim_campaign.move.
///
/// Uses tx_context::dummy() for in-process test context (sender = @0x0).
/// For claim tests, Merkle root is built from @0x0 (dummy sender).
#[test_only]
module axiom::claim_campaign_tests {
    use sui::coin;
    use sui::tx_context;
    use axiom::amc::AMC;
    use axiom::claim_campaign::{Self, ClaimCampaign, AdminCap};
    use axiom::merkle;

    const DUMMY_SENDER: address = @0x0;
    const OTHER:        address = @0xC1;

    fun mint_amc(amount: u64, ctx: &mut TxContext): coin::Coin<AMC> {
        coin::mint_for_testing<AMC>(amount, ctx)
    }

    fun root_for(addr: address, amount: u64): vector<u8> {
        merkle::compute_leaf(addr, amount)
    }

    fun new_ctx(): TxContext { tx_context::dummy() }

    #[test]
    fun test_11_create_campaign_happy_path() {
        let mut ctx = new_ctx();
        let (campaign, admin_cap) = claim_campaign::create_campaign_for_test(
            b"Axiom Genesis", root_for(DUMMY_SENDER, 1_000_000), 1_000_000, 0, &mut ctx,
        );
        assert!(!claim_campaign::is_active(&campaign), 0);
        assert!(!claim_campaign::is_closed(&campaign), 1);
        assert!(claim_campaign::pool_balance(&campaign) == 0, 2);
        assert!(claim_campaign::amount_per_claim(&campaign) == 1_000_000, 3);
        assert!(claim_campaign::total_claims(&campaign) == 0, 4);
        claim_campaign::drop_campaign_for_test(campaign);
        claim_campaign::drop_admin_cap_for_test(admin_cap);
    }

    #[test]
    #[expected_failure(abort_code = 7)]
    fun test_12_label_too_long_aborts() {
        let mut ctx = new_ctx();
        let mut long_label = vector::empty<u8>();
        let mut i = 0u64;
        while (i < 129) { vector::push_back(&mut long_label, 0x78u8); i = i + 1; };
        let (campaign, admin_cap) = claim_campaign::create_campaign_for_test(
            long_label, root_for(DUMMY_SENDER, 1_000_000), 1_000_000, 0, &mut ctx,
        );
        claim_campaign::drop_campaign_for_test(campaign);
        claim_campaign::drop_admin_cap_for_test(admin_cap);
    }

    #[test]
    fun test_13_label_at_max_bytes_succeeds() {
        let mut ctx = new_ctx();
        let mut max_label = vector::empty<u8>();
        let mut i = 0u64;
        while (i < 128) { vector::push_back(&mut max_label, 0x41u8); i = i + 1; };
        let (campaign, admin_cap) = claim_campaign::create_campaign_for_test(
            max_label, root_for(DUMMY_SENDER, 1_000_000), 1_000_000, 0, &mut ctx,
        );
        assert!(vector::length(&claim_campaign::label(&campaign)) == 128, 0);
        claim_campaign::drop_campaign_for_test(campaign);
        claim_campaign::drop_admin_cap_for_test(admin_cap);
    }

    #[test]
    #[expected_failure(abort_code = 5)]
    fun test_14_zero_amount_per_claim_aborts() {
        let mut ctx = new_ctx();
        let (campaign, admin_cap) = claim_campaign::create_campaign_for_test(
            b"Test", root_for(DUMMY_SENDER, 0), 0, 0, &mut ctx,
        );
        claim_campaign::drop_campaign_for_test(campaign);
        claim_campaign::drop_admin_cap_for_test(admin_cap);
    }

    #[test]
    fun test_15_fund_increases_pool_balance() {
        let mut ctx = new_ctx();
        let (mut campaign, admin_cap) = claim_campaign::create_campaign_for_test(
            b"Test", root_for(DUMMY_SENDER, 1_000_000), 1_000_000, 0, &mut ctx,
        );
        let coins = mint_amc(5_000_000, &mut ctx);
        claim_campaign::fund_for_test(&mut campaign, coins);
        assert!(claim_campaign::pool_balance(&campaign) == 5_000_000, 0);
        claim_campaign::drop_campaign_for_test(campaign);
        claim_campaign::drop_admin_cap_for_test(admin_cap);
    }

    #[test]
    fun test_16_activate_sets_is_active() {
        let mut ctx = new_ctx();
        let (mut campaign, admin_cap) = claim_campaign::create_campaign_for_test(
            b"Test", root_for(DUMMY_SENDER, 1_000_000), 1_000_000, 0, &mut ctx,
        );
        assert!(!claim_campaign::is_active(&campaign), 0);
        claim_campaign::activate_for_test(&mut campaign, &admin_cap, &mut ctx);
        assert!(claim_campaign::is_active(&campaign), 1);
        claim_campaign::drop_campaign_for_test(campaign);
        claim_campaign::drop_admin_cap_for_test(admin_cap);
    }

    #[test]
    fun test_17_pause_unsets_is_active() {
        let mut ctx = new_ctx();
        let (mut campaign, admin_cap) = claim_campaign::create_campaign_for_test(
            b"Test", root_for(DUMMY_SENDER, 1_000_000), 1_000_000, 0, &mut ctx,
        );
        claim_campaign::activate_for_test(&mut campaign, &admin_cap, &mut ctx);
        assert!(claim_campaign::is_active(&campaign), 0);
        claim_campaign::pause_for_test(&mut campaign, &admin_cap, &mut ctx);
        assert!(!claim_campaign::is_active(&campaign), 1);
        claim_campaign::drop_campaign_for_test(campaign);
        claim_campaign::drop_admin_cap_for_test(admin_cap);
    }

    #[test]
    fun test_18_close_sets_is_closed() {
        let mut ctx = new_ctx();
        let (mut campaign, admin_cap) = claim_campaign::create_campaign_for_test(
            b"Test", root_for(DUMMY_SENDER, 1_000_000), 1_000_000, 0, &mut ctx,
        );
        claim_campaign::close_for_test(&mut campaign, &admin_cap, &mut ctx);
        assert!(claim_campaign::is_closed(&campaign), 0);
        assert!(!claim_campaign::is_active(&campaign), 1);
        claim_campaign::drop_campaign_for_test(campaign);
        claim_campaign::drop_admin_cap_for_test(admin_cap);
    }

    #[test]
    #[expected_failure(abort_code = 1)]
    fun test_19_cannot_activate_closed_campaign() {
        let mut ctx = new_ctx();
        let (mut campaign, admin_cap) = claim_campaign::create_campaign_for_test(
            b"Test", root_for(DUMMY_SENDER, 1_000_000), 1_000_000, 0, &mut ctx,
        );
        claim_campaign::close_for_test(&mut campaign, &admin_cap, &mut ctx);
        claim_campaign::activate_for_test(&mut campaign, &admin_cap, &mut ctx);
        claim_campaign::drop_campaign_for_test(campaign);
        claim_campaign::drop_admin_cap_for_test(admin_cap);
    }

    #[test]
    #[expected_failure(abort_code = 1)]
    fun test_20_cannot_fund_closed_campaign() {
        let mut ctx = new_ctx();
        let (mut campaign, admin_cap) = claim_campaign::create_campaign_for_test(
            b"Test", root_for(DUMMY_SENDER, 1_000_000), 1_000_000, 0, &mut ctx,
        );
        claim_campaign::close_for_test(&mut campaign, &admin_cap, &mut ctx);
        let coins = mint_amc(1_000_000, &mut ctx);
        claim_campaign::fund_with_cap_for_test(&mut campaign, coins, &admin_cap, &mut ctx);
        claim_campaign::drop_campaign_for_test(campaign);
        claim_campaign::drop_admin_cap_for_test(admin_cap);
    }

    #[test]
    fun test_21_valid_single_leaf_claim_succeeds() {
        let mut ctx = new_ctx();
        let (mut campaign, admin_cap) = claim_campaign::create_campaign_for_test(
            b"Test", root_for(DUMMY_SENDER, 1_000_000), 1_000_000, 0, &mut ctx,
        );
        let coins = mint_amc(5_000_000, &mut ctx);
        claim_campaign::fund_for_test(&mut campaign, coins);
        claim_campaign::activate_for_test(&mut campaign, &admin_cap, &mut ctx);
        assert!(claim_campaign::total_claims(&campaign) == 0, 0);
        assert!(claim_campaign::pool_balance(&campaign) == 5_000_000, 1);
        let empty_proof: vector<vector<u8>> = vector::empty();
        claim_campaign::claim_for_test(&mut campaign, empty_proof, 1_000_000, &mut ctx);
        assert!(claim_campaign::total_claims(&campaign) == 1, 2);
        assert!(claim_campaign::pool_balance(&campaign) == 4_000_000, 3);
        claim_campaign::drop_campaign_for_test(campaign);
        claim_campaign::drop_admin_cap_for_test(admin_cap);
    }

    #[test]
    #[expected_failure(abort_code = 3)]
    fun test_22_invalid_proof_aborts() {
        let mut ctx = new_ctx();
        let (mut campaign, admin_cap) = claim_campaign::create_campaign_for_test(
            b"Test", root_for(OTHER, 1_000_000), 1_000_000, 0, &mut ctx,
        );
        let coins = mint_amc(5_000_000, &mut ctx);
        claim_campaign::fund_for_test(&mut campaign, coins);
        claim_campaign::activate_for_test(&mut campaign, &admin_cap, &mut ctx);
        let empty_proof: vector<vector<u8>> = vector::empty();
        claim_campaign::claim_for_test(&mut campaign, empty_proof, 1_000_000, &mut ctx);
        claim_campaign::drop_campaign_for_test(campaign);
        claim_campaign::drop_admin_cap_for_test(admin_cap);
    }

    #[test]
    #[expected_failure(abort_code = 0)]
    fun test_23_claim_when_paused_aborts() {
        let mut ctx = new_ctx();
        let (mut campaign, admin_cap) = claim_campaign::create_campaign_for_test(
            b"Test", root_for(DUMMY_SENDER, 1_000_000), 1_000_000, 0, &mut ctx,
        );
        let coins = mint_amc(5_000_000, &mut ctx);
        claim_campaign::fund_for_test(&mut campaign, coins);
        let empty_proof: vector<vector<u8>> = vector::empty();
        claim_campaign::claim_for_test(&mut campaign, empty_proof, 1_000_000, &mut ctx);
        claim_campaign::drop_campaign_for_test(campaign);
        claim_campaign::drop_admin_cap_for_test(admin_cap);
    }

    #[test]
    #[expected_failure(abort_code = 6)]
    fun test_24_pool_empty_aborts() {
        let mut ctx = new_ctx();
        let (mut campaign, admin_cap) = claim_campaign::create_campaign_for_test(
            b"Test", root_for(DUMMY_SENDER, 1_000_000), 1_000_000, 0, &mut ctx,
        );
        claim_campaign::activate_for_test(&mut campaign, &admin_cap, &mut ctx);
        let empty_proof: vector<vector<u8>> = vector::empty();
        claim_campaign::claim_for_test(&mut campaign, empty_proof, 1_000_000, &mut ctx);
        claim_campaign::drop_campaign_for_test(campaign);
        claim_campaign::drop_admin_cap_for_test(admin_cap);
    }

    #[test]
    fun test_25_admin_cap_bound_to_correct_campaign() {
        let mut ctx = new_ctx();
        let (mut campaign, admin_cap) = claim_campaign::create_campaign_for_test(
            b"Test", root_for(DUMMY_SENDER, 1_000_000), 1_000_000, 0, &mut ctx,
        );
        claim_campaign::activate_for_test(&mut campaign, &admin_cap, &mut ctx);
        assert!(claim_campaign::is_active(&campaign), 0);
        claim_campaign::drop_campaign_for_test(campaign);
        claim_campaign::drop_admin_cap_for_test(admin_cap);
    }

    #[test]
    #[expected_failure(abort_code = 8)]
    fun test_26_wrong_admin_cap_aborts_fund() {
        let mut ctx = new_ctx();
        let (mut campaign_a, admin_cap_a) = claim_campaign::create_campaign_for_test(
            b"Campaign A", root_for(DUMMY_SENDER, 1_000_000), 1_000_000, 0, &mut ctx,
        );
        let (campaign_b, admin_cap_b) = claim_campaign::create_campaign_for_test(
            b"Campaign B", root_for(OTHER, 1_000_000), 1_000_000, 0, &mut ctx,
        );
        let coins = mint_amc(1_000_000, &mut ctx);
        claim_campaign::fund_with_cap_for_test(&mut campaign_a, coins, &admin_cap_b, &mut ctx);
        claim_campaign::drop_campaign_for_test(campaign_a);
        claim_campaign::drop_campaign_for_test(campaign_b);
        claim_campaign::drop_admin_cap_for_test(admin_cap_a);
        claim_campaign::drop_admin_cap_for_test(admin_cap_b);
    }

    #[test]
    fun test_27_expiry_logic_not_expired() {
        assert!(!claim_campaign::is_expired_for_test(10, 5), 0);
        assert!(!claim_campaign::is_expired_for_test(0, 999), 1);
        assert!(!claim_campaign::is_expired_for_test(1, 0), 2);
    }

    #[test]
    fun test_28_expiry_logic_expired() {
        assert!(claim_campaign::is_expired_for_test(5, 5), 0);
        assert!(claim_campaign::is_expired_for_test(1, 100), 1);
        assert!(claim_campaign::is_expired_for_test(10, 10), 2);
    }

    // ── Session 11 hardening additions (tests 29–39) ───────────────────────

    /// Test 29: Double-claim aborts E_ALREADY_CLAIMED (abort_code=2).
    /// A5: ClaimRecord written before payout prevents reuse of same address/amount.
    #[test]
    #[expected_failure(abort_code = 2)]
    fun test_29_double_claim_aborts() {
        let mut ctx = new_ctx();
        let (mut campaign, admin_cap) = claim_campaign::create_campaign_for_test(
            b"Test", root_for(DUMMY_SENDER, 1_000_000), 1_000_000, 0, &mut ctx,
        );
        let coins = mint_amc(10_000_000, &mut ctx);
        claim_campaign::fund_for_test(&mut campaign, coins);
        claim_campaign::activate_for_test(&mut campaign, &admin_cap, &mut ctx);
        let empty_proof: vector<vector<u8>> = vector::empty();
        // First claim succeeds
        claim_campaign::claim_for_test(&mut campaign, empty_proof, 1_000_000, &mut ctx);
        // Second claim must abort
        let empty_proof2: vector<vector<u8>> = vector::empty();
        claim_campaign::claim_for_test(&mut campaign, empty_proof2, 1_000_000, &mut ctx);
        claim_campaign::drop_campaign_for_test(campaign);
        claim_campaign::drop_admin_cap_for_test(admin_cap);
    }

    /// Test 30: total_claims() starts at 0 on a freshly created campaign.
    #[test]
    fun test_30_total_claims_starts_at_zero() {
        let mut ctx = new_ctx();
        let (campaign, admin_cap) = claim_campaign::create_campaign_for_test(
            b"Test", root_for(DUMMY_SENDER, 1_000_000), 1_000_000, 0, &mut ctx,
        );
        assert!(claim_campaign::total_claims(&campaign) == 0, 0);
        claim_campaign::drop_campaign_for_test(campaign);
        claim_campaign::drop_admin_cap_for_test(admin_cap);
    }

    /// Test 31: Claim against a closed campaign aborts (is_active=false → E_NOT_ACTIVE=0).
    /// A2: Closed campaigns cannot be reactivated; claim requires is_active=true.
    #[test]
    #[expected_failure(abort_code = 0)]
    fun test_31_claim_after_close_aborts() {
        let mut ctx = new_ctx();
        let (mut campaign, admin_cap) = claim_campaign::create_campaign_for_test(
            b"Test", root_for(DUMMY_SENDER, 1_000_000), 1_000_000, 0, &mut ctx,
        );
        let coins = mint_amc(5_000_000, &mut ctx);
        claim_campaign::fund_for_test(&mut campaign, coins);
        // Close without activating → is_active=false, is_closed=true
        claim_campaign::close_for_test(&mut campaign, &admin_cap, &mut ctx);
        let empty_proof: vector<vector<u8>> = vector::empty();
        claim_campaign::claim_for_test(&mut campaign, empty_proof, 1_000_000, &mut ctx);
        claim_campaign::drop_campaign_for_test(campaign);
        claim_campaign::drop_admin_cap_for_test(admin_cap);
    }

    /// Test 32: pool_balance accumulates across multiple fund() calls.
    #[test]
    fun test_32_pool_balance_accumulates() {
        let mut ctx = new_ctx();
        let (mut campaign, admin_cap) = claim_campaign::create_campaign_for_test(
            b"Test", root_for(DUMMY_SENDER, 1_000_000), 1_000_000, 0, &mut ctx,
        );
        claim_campaign::fund_for_test(&mut campaign, mint_amc(1_000_000, &mut ctx));
        assert!(claim_campaign::pool_balance(&campaign) == 1_000_000, 0);
        claim_campaign::fund_for_test(&mut campaign, mint_amc(4_000_000, &mut ctx));
        assert!(claim_campaign::pool_balance(&campaign) == 5_000_000, 1);
        claim_campaign::drop_campaign_for_test(campaign);
        claim_campaign::drop_admin_cap_for_test(admin_cap);
    }

    /// Test 33: label() accessor returns the exact bytes passed to create_campaign.
    #[test]
    fun test_33_label_accessor_returns_expected_bytes() {
        let mut ctx = new_ctx();
        let expected_label = b"Genesis Airdrop";
        let (campaign, admin_cap) = claim_campaign::create_campaign_for_test(
            expected_label, root_for(DUMMY_SENDER, 500_000), 500_000, 0, &mut ctx,
        );
        assert!(claim_campaign::label(&campaign) == expected_label, 0);
        claim_campaign::drop_campaign_for_test(campaign);
        claim_campaign::drop_admin_cap_for_test(admin_cap);
    }

    /// Test 34: amount_per_claim() accessor returns the value set at creation.
    #[test]
    fun test_34_amount_per_claim_accessor() {
        let mut ctx = new_ctx();
        let (campaign, admin_cap) = claim_campaign::create_campaign_for_test(
            b"Test", root_for(DUMMY_SENDER, 250_000), 250_000, 0, &mut ctx,
        );
        assert!(claim_campaign::amount_per_claim(&campaign) == 250_000, 0);
        claim_campaign::drop_campaign_for_test(campaign);
        claim_campaign::drop_admin_cap_for_test(admin_cap);
    }

    /// Test 35: expires_at_epoch=0 → is_expired_for_test returns false for any epoch.
    /// A6: Zero expiry means campaign never expires.
    #[test]
    fun test_35_zero_expiry_never_expires() {
        assert!(!claim_campaign::is_expired_for_test(0, 0),   0);
        assert!(!claim_campaign::is_expired_for_test(0, 1),   1);
        assert!(!claim_campaign::is_expired_for_test(0, 999), 2);
    }

    /// Test 36: Activate → pause → activate is valid (not a closed transition).
    #[test]
    fun test_36_pause_then_reactivate() {
        let mut ctx = new_ctx();
        let (mut campaign, admin_cap) = claim_campaign::create_campaign_for_test(
            b"Test", root_for(DUMMY_SENDER, 1_000_000), 1_000_000, 0, &mut ctx,
        );
        claim_campaign::activate_for_test(&mut campaign, &admin_cap, &mut ctx);
        assert!(claim_campaign::is_active(&campaign), 0);
        claim_campaign::pause_for_test(&mut campaign, &admin_cap, &mut ctx);
        assert!(!claim_campaign::is_active(&campaign), 1);
        claim_campaign::activate_for_test(&mut campaign, &admin_cap, &mut ctx);
        assert!(claim_campaign::is_active(&campaign), 2);
        claim_campaign::drop_campaign_for_test(campaign);
        claim_campaign::drop_admin_cap_for_test(admin_cap);
    }

    /// Test 37: Wrong AdminCap aborts activate() — E_WRONG_CAMPAIGN (abort_code=8).
    /// A3/A4: Cap bound to campaign ID; cross-campaign ops are rejected.
    #[test]
    #[expected_failure(abort_code = 8)]
    fun test_37_wrong_cap_aborts_activate() {
        let mut ctx = new_ctx();
        let (mut campaign_a, admin_cap_a) = claim_campaign::create_campaign_for_test(
            b"Campaign A", root_for(DUMMY_SENDER, 1_000_000), 1_000_000, 0, &mut ctx,
        );
        let (campaign_b, admin_cap_b) = claim_campaign::create_campaign_for_test(
            b"Campaign B", root_for(OTHER, 1_000_000), 1_000_000, 0, &mut ctx,
        );
        // Use cap_b to activate campaign_a — must abort
        claim_campaign::activate_for_test(&mut campaign_a, &admin_cap_b, &mut ctx);
        claim_campaign::drop_campaign_for_test(campaign_a);
        claim_campaign::drop_campaign_for_test(campaign_b);
        claim_campaign::drop_admin_cap_for_test(admin_cap_a);
        claim_campaign::drop_admin_cap_for_test(admin_cap_b);
    }

    /// Test 38: Wrong AdminCap aborts pause() — E_WRONG_CAMPAIGN (abort_code=8).
    #[test]
    #[expected_failure(abort_code = 8)]
    fun test_38_wrong_cap_aborts_pause() {
        let mut ctx = new_ctx();
        let (mut campaign_a, admin_cap_a) = claim_campaign::create_campaign_for_test(
            b"Campaign A", root_for(DUMMY_SENDER, 1_000_000), 1_000_000, 0, &mut ctx,
        );
        let (campaign_b, admin_cap_b) = claim_campaign::create_campaign_for_test(
            b"Campaign B", root_for(OTHER, 1_000_000), 1_000_000, 0, &mut ctx,
        );
        // Activate with correct cap first, then try to pause with wrong cap
        claim_campaign::activate_for_test(&mut campaign_a, &admin_cap_a, &mut ctx);
        claim_campaign::pause_for_test(&mut campaign_a, &admin_cap_b, &mut ctx);
        claim_campaign::drop_campaign_for_test(campaign_a);
        claim_campaign::drop_campaign_for_test(campaign_b);
        claim_campaign::drop_admin_cap_for_test(admin_cap_a);
        claim_campaign::drop_admin_cap_for_test(admin_cap_b);
    }

    /// Test 39: Wrong AdminCap aborts close() — E_WRONG_CAMPAIGN (abort_code=8).
    #[test]
    #[expected_failure(abort_code = 8)]
    fun test_39_wrong_cap_aborts_close() {
        let mut ctx = new_ctx();
        let (mut campaign_a, admin_cap_a) = claim_campaign::create_campaign_for_test(
            b"Campaign A", root_for(DUMMY_SENDER, 1_000_000), 1_000_000, 0, &mut ctx,
        );
        let (campaign_b, admin_cap_b) = claim_campaign::create_campaign_for_test(
            b"Campaign B", root_for(OTHER, 1_000_000), 1_000_000, 0, &mut ctx,
        );
        claim_campaign::close_for_test(&mut campaign_a, &admin_cap_b, &mut ctx);
        claim_campaign::drop_campaign_for_test(campaign_a);
        claim_campaign::drop_campaign_for_test(campaign_b);
        claim_campaign::drop_admin_cap_for_test(admin_cap_a);
        claim_campaign::drop_admin_cap_for_test(admin_cap_b);
    }
}
