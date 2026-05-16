/// Axiom Protocol — Claim Campaign Hardening Tests
///
/// 18 tests (tests 11–28 of the ≥28 target).
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
}
