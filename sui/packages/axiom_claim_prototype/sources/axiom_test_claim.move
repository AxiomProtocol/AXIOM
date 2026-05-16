// =============================================================================
// AXIOM_TEST_CLAIM — Sui testnet claim token
//
// TESTNET ONLY. Has no monetary value.
// Is NOT AXUSD, AXAU, AXM, SEED, KAG, or any canonical Axiom asset.
// Is not backed by any reserve.
// Cannot be redeemed for any canonical asset.
// Will never be deployed to Sui Mainnet without a separate Phase 9+ authorization.
//
// Phase 8 hardening (A4):
//   init() now wraps TreasuryCap inside GuardedTreasury instead of exposing it
//   directly. No loose TreasuryCap remains after init. All minting is gated
//   through guarded_treasury::guarded_mint().
//
// Package: axiom_claim_prototype
// Phase:   8 — Hardened Staging
// =============================================================================

module axiom_claim_prototype::axiom_test_claim {
    use sui::coin;
    use std::option;
    use axiom_claim_prototype::guarded_treasury::{Self, GuardedTreasury};

    // =========================================================================
    // One-time witness — struct name must exactly match module name in UPPERCASE.
    // The `drop` ability is required by the one-time witness pattern.
    // =========================================================================
    public struct AXIOM_TEST_CLAIM has drop {}

    // =========================================================================
    // init — called once at package publish time.
    //
    // Phase 8 hardening (A4):
    //   Creates a GuardedTreasury<AXIOM_TEST_CLAIM> and transfers it to the
    //   deployer (admin). The TreasuryCap is wrapped inside GuardedTreasury
    //   and never accessible directly. All minting requires guarded_mint().
    //
    // CoinMetadata is frozen: supply information is public but immutable.
    // =========================================================================
    fun init(witness: AXIOM_TEST_CLAIM, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            6,
            b"ATC",
            b"AXIOM TEST CLAIM",
            b"Axiom Protocol testnet claim token. TESTNET ONLY. No monetary value. Not a canonical Axiom asset. Not AXUSD, AXAU, AXM, SEED, or KAG.",
            option::none(),
            ctx,
        );

        // Freeze metadata — the description is immutable and publicly verifiable.
        transfer::public_freeze_object(metadata);

        // A4: Wrap TreasuryCap in GuardedTreasury. No loose TreasuryCap remains.
        let guarded = guarded_treasury::create(treasury_cap, ctx);
        transfer::public_transfer(guarded, tx_context::sender(ctx));
    }

    // =========================================================================
    // Test-only initializers
    //
    // init_for_testing — legacy path: transfers TreasuryCap directly to ADMIN.
    //   Used by existing tests that call coin::mint() directly.
    //   This path is NOT available in production (init() wraps the cap).
    //
    // init_for_testing_guarded — Phase 8 path: transfers GuardedTreasury.
    //   Used by new Phase 8 tests for GuardedTreasury coverage.
    // =========================================================================

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            AXIOM_TEST_CLAIM {},
            6,
            b"ATC",
            b"AXIOM TEST CLAIM",
            b"Test only",
            option::none(),
            ctx,
        );
        transfer::public_freeze_object(metadata);
        // Legacy: transfer TreasuryCap directly so existing tests can call coin::mint().
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }

    #[test_only]
    public fun init_for_testing_guarded(ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            AXIOM_TEST_CLAIM {},
            6,
            b"ATC",
            b"AXIOM TEST CLAIM",
            b"Test only",
            option::none(),
            ctx,
        );
        transfer::public_freeze_object(metadata);
        // Phase 8: wrap in GuardedTreasury.
        let guarded = guarded_treasury::create(treasury_cap, ctx);
        transfer::public_transfer(guarded, tx_context::sender(ctx));
    }
}
