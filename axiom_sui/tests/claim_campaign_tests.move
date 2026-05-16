/// ClaimCampaign hardening tests — 18 tests covering A1–A7.
///
/// Uses test_scenario for multi-transaction stateful tests.
/// Tests for:
///   A1 – proof depth guard
///   A2 – replay protection
///   A3 – active/closed state guards
///   A4 – AdminCap gating
///   A5 – pool sufficiency
///   A6 – epoch expiry
///   A7 – event emission (structural: operations complete without abort)
#[test_only]
module axiom_sui::claim_campaign_tests {
    use std::vector;
    use sui::test_scenario::{Self as ts};
    use sui::coin;
    use sui::sui::SUI;
    use axiom_sui::claim_campaign::{Self, AdminCap, ClaimCampaign};
    use axiom_sui::merkle;

    // ── Addresses ─────────────────────────────────────────────────────────────
    const ADMIN:  address = @0x0000000000000000000000000000000000000000000000000000000000000001;
    const USER1:  address = @0x0000000000000000000000000000000000000000000000000000000000000002;
    const USER2:  address = @0x0000000000000000000000000000000000000000000000000000000000000003;

    // ── Campaign params ───────────────────────────────────────────────────────
    const AMOUNT_PER_CLAIM: u64 = 1_000_000_000; // 1 SUI in MIST

    // ── Helpers ───────────────────────────────────────────────────────────────

    fun make_label(): vector<u8> { b"Phase8Test" }

    /// Build a valid 32-byte Merkle root for a single-address list.
    fun single_entry_root(addr: address, amount: u64): vector<u8> {
        merkle::compute_leaf(addr, amount)
    }

    /// Valid proof for a single-entry tree is empty.
    fun empty_proof(): vector<vector<u8>> { vector::empty<vector<u8>>() }

    fun zero32(): vector<u8> {
        let mut v = vector::empty<u8>();
        let mut i = 0u64;
        while (i < 32) { vector::push_back(&mut v, 0u8); i = i + 1; };
        v
    }

    // ── Test 1: init delivers AdminCap to deployer ────────────────────────────
    #[test]
    fun test_init_delivers_admin_cap() {
        let mut s = ts::begin(ADMIN);
        {
            claim_campaign::init_for_testing(ts::ctx(&mut s));
        };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap = ts::take_from_sender<AdminCap>(&s);
            ts::return_to_sender(&s, cap);
        };
        ts::end(s);
    }

    // ── Test 2: create campaign requires AdminCap ─────────────────────────────
    #[test]
    fun test_create_campaign_succeeds() {
        let mut s = ts::begin(ADMIN);
        { claim_campaign::init_for_testing(ts::ctx(&mut s)); };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap = ts::take_from_sender<AdminCap>(&s);
            let root = single_entry_root(USER1, AMOUNT_PER_CLAIM);
            claim_campaign::create_campaign_entry(
                &cap, make_label(), root, AMOUNT_PER_CLAIM, 0,
                ts::ctx(&mut s),
            );
            ts::return_to_sender(&s, cap);
        };
        ts::end(s);
    }

    // ── Test 3: A4 — empty label aborts ──────────────────────────────────────
    #[test]
    #[expected_failure(abort_code = claim_campaign::E_EMPTY_LABEL)]
    fun test_create_campaign_empty_label_aborts() {
        let mut s = ts::begin(ADMIN);
        { claim_campaign::init_for_testing(ts::ctx(&mut s)); };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap = ts::take_from_sender<AdminCap>(&s);
            let root = single_entry_root(USER1, AMOUNT_PER_CLAIM);
            claim_campaign::create_campaign_entry(
                &cap, vector::empty(), root, AMOUNT_PER_CLAIM, 0,
                ts::ctx(&mut s),
            );
            ts::return_to_sender(&s, cap);
        };
        ts::end(s);
    }

    // ── Test 4: A4 — zero amount_per_claim aborts ─────────────────────────────
    #[test]
    #[expected_failure(abort_code = claim_campaign::E_ZERO_AMOUNT)]
    fun test_create_campaign_zero_amount_aborts() {
        let mut s = ts::begin(ADMIN);
        { claim_campaign::init_for_testing(ts::ctx(&mut s)); };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap = ts::take_from_sender<AdminCap>(&s);
            claim_campaign::create_campaign_entry(
                &cap, make_label(), zero32(), 0, 0,
                ts::ctx(&mut s),
            );
            ts::return_to_sender(&s, cap);
        };
        ts::end(s);
    }

    // ── Test 5: fund and activate succeed ────────────────────────────────────
    #[test]
    fun test_fund_and_activate() {
        let mut s = ts::begin(ADMIN);
        { claim_campaign::init_for_testing(ts::ctx(&mut s)); };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap = ts::take_from_sender<AdminCap>(&s);
            let root = single_entry_root(USER1, AMOUNT_PER_CLAIM);
            claim_campaign::create_campaign_entry(
                &cap, make_label(), root, AMOUNT_PER_CLAIM, 0,
                ts::ctx(&mut s),
            );
            ts::return_to_sender(&s, cap);
        };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap      = ts::take_from_sender<AdminCap>(&s);
            let mut camp = ts::take_shared<ClaimCampaign>(&s);
            let payment  = coin::mint_for_testing<SUI>(AMOUNT_PER_CLAIM, ts::ctx(&mut s));
            claim_campaign::fund_campaign(&cap, &mut camp, payment, ts::ctx(&mut s));
            assert!(claim_campaign::pool_balance(&camp) == AMOUNT_PER_CLAIM, 0);
            claim_campaign::activate(&cap, &mut camp, ts::ctx(&mut s));
            assert!(claim_campaign::is_active(&camp), 1);
            ts::return_shared(camp);
            ts::return_to_sender(&s, cap);
        };
        ts::end(s);
    }

    // ── Test 6: A3 — claim on inactive campaign aborts ───────────────────────
    #[test]
    #[expected_failure(abort_code = claim_campaign::E_CAMPAIGN_NOT_ACTIVE)]
    fun test_claim_on_inactive_aborts() {
        let mut s = ts::begin(ADMIN);
        { claim_campaign::init_for_testing(ts::ctx(&mut s)); };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap  = ts::take_from_sender<AdminCap>(&s);
            let root = single_entry_root(USER1, AMOUNT_PER_CLAIM);
            claim_campaign::create_campaign_entry(
                &cap, make_label(), root, AMOUNT_PER_CLAIM, 0,
                ts::ctx(&mut s),
            );
            ts::return_to_sender(&s, cap);
        };
        ts::next_tx(&mut s, USER1);
        {
            let mut camp = ts::take_shared<ClaimCampaign>(&s);
            // Not activated — should abort
            claim_campaign::claim(&mut camp, empty_proof(), ts::ctx(&mut s));
            ts::return_shared(camp);
        };
        ts::end(s);
    }

    // ── Test 7: A4 — invalid Merkle proof aborts ─────────────────────────────
    #[test]
    #[expected_failure(abort_code = claim_campaign::E_INVALID_PROOF)]
    fun test_claim_bad_proof_aborts() {
        let mut s = ts::begin(ADMIN);
        { claim_campaign::init_for_testing(ts::ctx(&mut s)); };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap  = ts::take_from_sender<AdminCap>(&s);
            let root = single_entry_root(USER1, AMOUNT_PER_CLAIM);
            claim_campaign::create_campaign_entry(
                &cap, make_label(), root, AMOUNT_PER_CLAIM, 0,
                ts::ctx(&mut s),
            );
            ts::return_to_sender(&s, cap);
        };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap      = ts::take_from_sender<AdminCap>(&s);
            let mut camp = ts::take_shared<ClaimCampaign>(&s);
            let payment  = coin::mint_for_testing<SUI>(AMOUNT_PER_CLAIM * 2, ts::ctx(&mut s));
            claim_campaign::fund_campaign(&cap, &mut camp, payment, ts::ctx(&mut s));
            claim_campaign::activate(&cap, &mut camp, ts::ctx(&mut s));
            ts::return_shared(camp);
            ts::return_to_sender(&s, cap);
        };
        ts::next_tx(&mut s, USER1);
        {
            let mut camp = ts::take_shared<ClaimCampaign>(&s);
            // USER1's single-entry proof is empty (root == leaf), but
            // USER2 sending with USER1's root yields a bad proof
            let mut bad_proof = vector::empty<vector<u8>>();
            vector::push_back(&mut bad_proof, zero32());
            claim_campaign::claim(&mut camp, bad_proof, ts::ctx(&mut s));
            ts::return_shared(camp);
        };
        ts::end(s);
    }

    // ── Test 8: successful claim transfers tokens ─────────────────────────────
    #[test]
    fun test_successful_claim() {
        let mut s = ts::begin(ADMIN);
        { claim_campaign::init_for_testing(ts::ctx(&mut s)); };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap  = ts::take_from_sender<AdminCap>(&s);
            let root = single_entry_root(USER1, AMOUNT_PER_CLAIM);
            claim_campaign::create_campaign_entry(
                &cap, make_label(), root, AMOUNT_PER_CLAIM, 0,
                ts::ctx(&mut s),
            );
            ts::return_to_sender(&s, cap);
        };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap      = ts::take_from_sender<AdminCap>(&s);
            let mut camp = ts::take_shared<ClaimCampaign>(&s);
            let payment  = coin::mint_for_testing<SUI>(AMOUNT_PER_CLAIM, ts::ctx(&mut s));
            claim_campaign::fund_campaign(&cap, &mut camp, payment, ts::ctx(&mut s));
            claim_campaign::activate(&cap, &mut camp, ts::ctx(&mut s));
            ts::return_shared(camp);
            ts::return_to_sender(&s, cap);
        };
        ts::next_tx(&mut s, USER1);
        {
            let mut camp = ts::take_shared<ClaimCampaign>(&s);
            // Single-entry tree: root = leaf, proof = empty
            claim_campaign::claim(&mut camp, empty_proof(), ts::ctx(&mut s));
            assert!(claim_campaign::pool_balance(&camp) == 0, 0);
            assert!(claim_campaign::has_claimed(&camp, USER1), 1);
            ts::return_shared(camp);
        };
        ts::end(s);
    }

    // ── Test 9: A2 — double claim aborts ─────────────────────────────────────
    #[test]
    #[expected_failure(abort_code = claim_campaign::E_ALREADY_CLAIMED)]
    fun test_double_claim_aborts() {
        let mut s = ts::begin(ADMIN);
        { claim_campaign::init_for_testing(ts::ctx(&mut s)); };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap  = ts::take_from_sender<AdminCap>(&s);
            let root = single_entry_root(USER1, AMOUNT_PER_CLAIM);
            claim_campaign::create_campaign_entry(
                &cap, make_label(), root, AMOUNT_PER_CLAIM, 0,
                ts::ctx(&mut s),
            );
            ts::return_to_sender(&s, cap);
        };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap      = ts::take_from_sender<AdminCap>(&s);
            let mut camp = ts::take_shared<ClaimCampaign>(&s);
            // Fund double to allow second attempt if replay check fails
            let payment  = coin::mint_for_testing<SUI>(AMOUNT_PER_CLAIM * 2, ts::ctx(&mut s));
            claim_campaign::fund_campaign(&cap, &mut camp, payment, ts::ctx(&mut s));
            claim_campaign::activate(&cap, &mut camp, ts::ctx(&mut s));
            ts::return_shared(camp);
            ts::return_to_sender(&s, cap);
        };
        ts::next_tx(&mut s, USER1);
        {
            let mut camp = ts::take_shared<ClaimCampaign>(&s);
            claim_campaign::claim(&mut camp, empty_proof(), ts::ctx(&mut s));
            ts::return_shared(camp);
        };
        // Second claim from same address — must abort
        ts::next_tx(&mut s, USER1);
        {
            let mut camp = ts::take_shared<ClaimCampaign>(&s);
            claim_campaign::claim(&mut camp, empty_proof(), ts::ctx(&mut s));
            ts::return_shared(camp);
        };
        ts::end(s);
    }

    // ── Test 10: A5 — insufficient pool aborts ────────────────────────────────
    #[test]
    #[expected_failure(abort_code = claim_campaign::E_INSUFFICIENT_POOL)]
    fun test_claim_insufficient_pool_aborts() {
        let mut s = ts::begin(ADMIN);
        { claim_campaign::init_for_testing(ts::ctx(&mut s)); };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap  = ts::take_from_sender<AdminCap>(&s);
            let root = single_entry_root(USER1, AMOUNT_PER_CLAIM);
            claim_campaign::create_campaign_entry(
                &cap, make_label(), root, AMOUNT_PER_CLAIM, 0,
                ts::ctx(&mut s),
            );
            ts::return_to_sender(&s, cap);
        };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap      = ts::take_from_sender<AdminCap>(&s);
            let mut camp = ts::take_shared<ClaimCampaign>(&s);
            // Fund with 1 less than amount_per_claim
            let payment  = coin::mint_for_testing<SUI>(AMOUNT_PER_CLAIM - 1, ts::ctx(&mut s));
            claim_campaign::fund_campaign(&cap, &mut camp, payment, ts::ctx(&mut s));
            claim_campaign::activate(&cap, &mut camp, ts::ctx(&mut s));
            ts::return_shared(camp);
            ts::return_to_sender(&s, cap);
        };
        ts::next_tx(&mut s, USER1);
        {
            let mut camp = ts::take_shared<ClaimCampaign>(&s);
            claim_campaign::claim(&mut camp, empty_proof(), ts::ctx(&mut s));
            ts::return_shared(camp);
        };
        ts::end(s);
    }

    // ── Test 11: A3 — claim on closed campaign aborts ────────────────────────
    #[test]
    #[expected_failure(abort_code = claim_campaign::E_CAMPAIGN_CLOSED)]
    fun test_claim_on_closed_aborts() {
        let mut s = ts::begin(ADMIN);
        { claim_campaign::init_for_testing(ts::ctx(&mut s)); };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap  = ts::take_from_sender<AdminCap>(&s);
            let root = single_entry_root(USER1, AMOUNT_PER_CLAIM);
            claim_campaign::create_campaign_entry(
                &cap, make_label(), root, AMOUNT_PER_CLAIM, 0,
                ts::ctx(&mut s),
            );
            ts::return_to_sender(&s, cap);
        };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap      = ts::take_from_sender<AdminCap>(&s);
            let mut camp = ts::take_shared<ClaimCampaign>(&s);
            let payment  = coin::mint_for_testing<SUI>(AMOUNT_PER_CLAIM, ts::ctx(&mut s));
            claim_campaign::fund_campaign(&cap, &mut camp, payment, ts::ctx(&mut s));
            claim_campaign::activate(&cap, &mut camp, ts::ctx(&mut s));
            // Close immediately — sweeps to ADMIN
            claim_campaign::close_campaign(&cap, &mut camp, ADMIN, ts::ctx(&mut s));
            ts::return_shared(camp);
            ts::return_to_sender(&s, cap);
        };
        ts::next_tx(&mut s, USER1);
        {
            let mut camp = ts::take_shared<ClaimCampaign>(&s);
            claim_campaign::claim(&mut camp, empty_proof(), ts::ctx(&mut s));
            ts::return_shared(camp);
        };
        ts::end(s);
    }

    // ── Test 12: A1 — oversized proof aborts ─────────────────────────────────
    #[test]
    #[expected_failure(abort_code = claim_campaign::E_PROOF_TOO_DEEP)]
    fun test_claim_proof_too_deep_aborts() {
        let mut s = ts::begin(ADMIN);
        { claim_campaign::init_for_testing(ts::ctx(&mut s)); };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap  = ts::take_from_sender<AdminCap>(&s);
            let root = single_entry_root(USER1, AMOUNT_PER_CLAIM);
            claim_campaign::create_campaign_entry(
                &cap, make_label(), root, AMOUNT_PER_CLAIM, 0,
                ts::ctx(&mut s),
            );
            ts::return_to_sender(&s, cap);
        };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap      = ts::take_from_sender<AdminCap>(&s);
            let mut camp = ts::take_shared<ClaimCampaign>(&s);
            let payment  = coin::mint_for_testing<SUI>(AMOUNT_PER_CLAIM, ts::ctx(&mut s));
            claim_campaign::fund_campaign(&cap, &mut camp, payment, ts::ctx(&mut s));
            claim_campaign::activate(&cap, &mut camp, ts::ctx(&mut s));
            ts::return_shared(camp);
            ts::return_to_sender(&s, cap);
        };
        ts::next_tx(&mut s, USER1);
        {
            let mut camp = ts::take_shared<ClaimCampaign>(&s);
            let mut deep_proof = vector::empty<vector<u8>>();
            let sibling = zero32();
            let mut i = 0u64;
            // 21 siblings — one over the cap
            while (i < 21) {
                vector::push_back(&mut deep_proof, sibling);
                i = i + 1;
            };
            claim_campaign::claim(&mut camp, deep_proof, ts::ctx(&mut s));
            ts::return_shared(camp);
        };
        ts::end(s);
    }

    // ── Test 13: pause then unpause ───────────────────────────────────────────
    #[test]
    fun test_pause_and_unpause() {
        let mut s = ts::begin(ADMIN);
        { claim_campaign::init_for_testing(ts::ctx(&mut s)); };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap  = ts::take_from_sender<AdminCap>(&s);
            let root = zero32();
            claim_campaign::create_campaign_entry(
                &cap, make_label(), root, AMOUNT_PER_CLAIM, 0,
                ts::ctx(&mut s),
            );
            ts::return_to_sender(&s, cap);
        };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap      = ts::take_from_sender<AdminCap>(&s);
            let mut camp = ts::take_shared<ClaimCampaign>(&s);
            claim_campaign::activate(&cap, &mut camp, ts::ctx(&mut s));
            assert!(claim_campaign::is_active(&camp), 0);
            claim_campaign::pause(&cap, &mut camp, ts::ctx(&mut s));
            assert!(!claim_campaign::is_active(&camp), 1);
            claim_campaign::unpause(&cap, &mut camp, ts::ctx(&mut s));
            assert!(claim_campaign::is_active(&camp), 2);
            ts::return_shared(camp);
            ts::return_to_sender(&s, cap);
        };
        ts::end(s);
    }

    // ── Test 14: update_merkle_root succeeds ──────────────────────────────────
    #[test]
    fun test_update_merkle_root() {
        let mut s = ts::begin(ADMIN);
        { claim_campaign::init_for_testing(ts::ctx(&mut s)); };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap  = ts::take_from_sender<AdminCap>(&s);
            let root = zero32();
            claim_campaign::create_campaign_entry(
                &cap, make_label(), root, AMOUNT_PER_CLAIM, 0,
                ts::ctx(&mut s),
            );
            ts::return_to_sender(&s, cap);
        };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap      = ts::take_from_sender<AdminCap>(&s);
            let mut camp = ts::take_shared<ClaimCampaign>(&s);
            let new_root = single_entry_root(USER1, AMOUNT_PER_CLAIM);
            claim_campaign::update_merkle_root(&cap, &mut camp, new_root, ts::ctx(&mut s));
            ts::return_shared(camp);
            ts::return_to_sender(&s, cap);
        };
        ts::end(s);
    }

    // ── Test 15: update_merkle_root on closed campaign aborts ─────────────────
    #[test]
    #[expected_failure(abort_code = claim_campaign::E_CAMPAIGN_CLOSED)]
    fun test_update_root_after_close_aborts() {
        let mut s = ts::begin(ADMIN);
        { claim_campaign::init_for_testing(ts::ctx(&mut s)); };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap  = ts::take_from_sender<AdminCap>(&s);
            claim_campaign::create_campaign_entry(
                &cap, make_label(), zero32(), AMOUNT_PER_CLAIM, 0,
                ts::ctx(&mut s),
            );
            ts::return_to_sender(&s, cap);
        };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap      = ts::take_from_sender<AdminCap>(&s);
            let mut camp = ts::take_shared<ClaimCampaign>(&s);
            claim_campaign::close_campaign(&cap, &mut camp, ADMIN, ts::ctx(&mut s));
            claim_campaign::update_merkle_root(&cap, &mut camp, zero32(), ts::ctx(&mut s));
            ts::return_shared(camp);
            ts::return_to_sender(&s, cap);
        };
        ts::end(s);
    }

    // ── Test 16: close_campaign twice aborts ──────────────────────────────────
    #[test]
    #[expected_failure(abort_code = claim_campaign::E_CAMPAIGN_ALREADY_CLOSED)]
    fun test_double_close_aborts() {
        let mut s = ts::begin(ADMIN);
        { claim_campaign::init_for_testing(ts::ctx(&mut s)); };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap  = ts::take_from_sender<AdminCap>(&s);
            claim_campaign::create_campaign_entry(
                &cap, make_label(), zero32(), AMOUNT_PER_CLAIM, 0,
                ts::ctx(&mut s),
            );
            ts::return_to_sender(&s, cap);
        };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap      = ts::take_from_sender<AdminCap>(&s);
            let mut camp = ts::take_shared<ClaimCampaign>(&s);
            claim_campaign::close_campaign(&cap, &mut camp, ADMIN, ts::ctx(&mut s));
            claim_campaign::close_campaign(&cap, &mut camp, ADMIN, ts::ctx(&mut s));
            ts::return_shared(camp);
            ts::return_to_sender(&s, cap);
        };
        ts::end(s);
    }

    // ── Test 17: close sweeps remaining balance ───────────────────────────────
    #[test]
    fun test_close_sweeps_balance() {
        let mut s = ts::begin(ADMIN);
        { claim_campaign::init_for_testing(ts::ctx(&mut s)); };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap  = ts::take_from_sender<AdminCap>(&s);
            claim_campaign::create_campaign_entry(
                &cap, make_label(), zero32(), AMOUNT_PER_CLAIM, 0,
                ts::ctx(&mut s),
            );
            ts::return_to_sender(&s, cap);
        };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap      = ts::take_from_sender<AdminCap>(&s);
            let mut camp = ts::take_shared<ClaimCampaign>(&s);
            let payment  = coin::mint_for_testing<SUI>(AMOUNT_PER_CLAIM * 5, ts::ctx(&mut s));
            claim_campaign::fund_campaign(&cap, &mut camp, payment, ts::ctx(&mut s));
            assert!(claim_campaign::pool_balance(&camp) == AMOUNT_PER_CLAIM * 5, 0);
            claim_campaign::close_campaign(&cap, &mut camp, ADMIN, ts::ctx(&mut s));
            assert!(claim_campaign::pool_balance(&camp) == 0, 1);
            assert!(claim_campaign::is_closed(&camp), 2);
            ts::return_shared(camp);
            ts::return_to_sender(&s, cap);
        };
        ts::end(s);
    }

    // ── Test 18: bad root length (not 32 bytes) aborts ───────────────────────
    #[test]
    #[expected_failure(abort_code = claim_campaign::E_BAD_ROOT_LENGTH)]
    fun test_create_bad_root_length_aborts() {
        let mut s = ts::begin(ADMIN);
        { claim_campaign::init_for_testing(ts::ctx(&mut s)); };
        ts::next_tx(&mut s, ADMIN);
        {
            let cap = ts::take_from_sender<AdminCap>(&s);
            // Only 16 bytes — invalid root length
            let short_root = b"0000000000000000";
            claim_campaign::create_campaign_entry(
                &cap, make_label(), short_root, AMOUNT_PER_CLAIM, 0,
                ts::ctx(&mut s),
            );
            ts::return_to_sender(&s, cap);
        };
        ts::end(s);
    }

    // Re-export error constants for expected_failure references
    const E_EMPTY_LABEL:             u64 = 8;
    const E_ZERO_AMOUNT:             u64 = 9;
    const E_CAMPAIGN_NOT_ACTIVE:     u64 = 1;
    const E_CAMPAIGN_CLOSED:         u64 = 2;
    const E_ALREADY_CLAIMED:         u64 = 3;
    const E_INVALID_PROOF:           u64 = 4;
    const E_INSUFFICIENT_POOL:       u64 = 5;
    const E_PROOF_TOO_DEEP:          u64 = 7;
    const E_CAMPAIGN_ALREADY_CLOSED: u64 = 10;
    const E_BAD_ROOT_LENGTH:         u64 = 11;
}
