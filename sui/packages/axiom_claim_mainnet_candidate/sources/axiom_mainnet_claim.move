// =============================================================================
// AXIOM_MAINNET_CLAIM — Sui mainnet community rewards token
//
// COMMUNITY REWARDS LAYER — NON-FINANCIAL
// No monetary value. Not AXUSD, AXAU, AXM, SEED, or KAG.
// Not backed by any reserve. Not redeemable for any canonical asset.
// Not a financial instrument. Not a security.
//
// Phase 9: Production candidate for Sui community distribution.
// External audit deferred — see AXIOM_SUI_PHASE9_ACCEPTED_RISK_MEMO.md.
//
// Package: axiom_claim_mainnet_candidate
// Phase:   9 — Mainnet Release Candidate
// =============================================================================

module axiom_claim_mainnet_candidate::axiom_mainnet_claim {
    use sui::coin;
    use std::option;
    use axiom_claim_mainnet_candidate::guarded_treasury::{Self, GuardedTreasury};

    public struct AXIOM_MAINNET_CLAIM has drop {}

    fun init(witness: AXIOM_MAINNET_CLAIM, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            6,
            b"AMC",
            b"AXIOM MAINNET CLAIM",
            b"Axiom Protocol community rewards token. COMMUNITY REWARDS ONLY. No monetary value. Not AXUSD, AXAU, AXM, SEED, or KAG. Not backed by any reserve. Not redeemable.",
            option::none(),
            ctx,
        );

        transfer::public_freeze_object(metadata);

        // A4: Wrap TreasuryCap in GuardedTreasury — no loose TreasuryCap.
        let guarded = guarded_treasury::create(treasury_cap, ctx);
        transfer::public_transfer(guarded, tx_context::sender(ctx));
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            AXIOM_MAINNET_CLAIM {},
            6,
            b"AMC",
            b"AXIOM MAINNET CLAIM",
            b"Test only",
            option::none(),
            ctx,
        );
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }

    #[test_only]
    public fun init_for_testing_guarded(ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            AXIOM_MAINNET_CLAIM {},
            6,
            b"AMC",
            b"AXIOM MAINNET CLAIM",
            b"Test only",
            option::none(),
            ctx,
        );
        transfer::public_freeze_object(metadata);
        let guarded = guarded_treasury::create(treasury_cap, ctx);
        transfer::public_transfer(guarded, tx_context::sender(ctx));
    }
}
