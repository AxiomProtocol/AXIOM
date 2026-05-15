// =============================================================================
// AXIOM_TEST_CLAIM — Sui testnet claim token
//
// TESTNET ONLY. Has no monetary value.
// Is NOT AXUSD, AXAU, AXM, SEED, KAG, or any canonical Axiom asset.
// Is not backed by any reserve.
// Cannot be redeemed for any canonical asset.
// Will never be deployed to Sui Mainnet without a separate Phase 7 authorization.
//
// Sprint 1 — Simple allowlist claim prototype.
// Package: axiom_claim_prototype
// Phase:   6 — Testnet Build
// =============================================================================

module axiom_claim_prototype::axiom_test_claim {
    use sui::coin;
    use std::option;

    // =========================================================================
    // One-time witness — struct name must exactly match module name in UPPERCASE.
    // The `drop` ability is required by the one-time witness pattern.
    // =========================================================================
    public struct AXIOM_TEST_CLAIM has drop {}

    // =========================================================================
    // init — called once at package publish time.
    //
    // Creates the TreasuryCap<AXIOM_TEST_CLAIM> and transfers it to the
    // deployer (admin). The deployer retains minting authority and uses
    // coin::mint() to fund claim campaigns.
    //
    // CoinMetadata is frozen: supply information is public but immutable.
    // =========================================================================
    fun init(witness: AXIOM_TEST_CLAIM, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            6,                    // decimals — 1 ATC = 1_000_000 base units
            b"ATC",               // symbol
            b"AXIOM TEST CLAIM",  // name
            b"Axiom Protocol testnet claim token. TESTNET ONLY. No monetary value. Not a canonical Axiom asset. Not AXUSD, AXAU, AXM, SEED, or KAG.",
            option::none(),       // no icon URL
            ctx,
        );

        // Freeze metadata — the description is immutable and publicly verifiable.
        transfer::public_freeze_object(metadata);

        // Transfer TreasuryCap to deployer.
        // The admin keeps the TreasuryCap and mints tokens as needed.
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }

    // =========================================================================
    // Test-only initializer — used by claim_campaign_tests.move.
    // Not accessible outside #[test_only] contexts.
    // =========================================================================
    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(AXIOM_TEST_CLAIM {}, ctx);
    }
}
