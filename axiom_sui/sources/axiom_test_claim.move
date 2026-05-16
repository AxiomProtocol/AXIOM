/// AxiomTestClaim — one-time-witness coin for test and staging environments.
///
/// Creates an AMC (Axiom Community) coin and wraps its TreasuryCap in a
/// GuardedTreasury so that test campaign funding goes through the daily-cap
/// authorization layer (A4/A5).
///
/// NOT for mainnet deployment of the canonical AXM / AXAU tokens.
#[allow(deprecated_usage)]
module axiom_sui::axiom_test_claim {
    use std::option;
    use sui::coin;
    use sui::transfer;
    use sui::tx_context::TxContext;
    use axiom_sui::guarded_treasury;

    // ─── One-time witness (Move 2024: public struct required) ─────────────────
    public struct AXIOM_TEST_CLAIM has drop {}

    // ─── Initializer ──────────────────────────────────────────────────────────
    fun init(witness: AXIOM_TEST_CLAIM, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            6,                          // decimals
            b"AMC",                     // symbol
            b"Axiom Community",         // name
            b"Axiom Protocol community reward token — test / staging only",
            option::none(),             // icon URL
            ctx,
        );

        // Wrap in GuardedTreasury — 1 000 000 AMC (1e12 base units) daily cap
        guarded_treasury::create_from_cap(treasury_cap, 1_000_000_000_000, ctx);

        // Freeze metadata — symbol / name are immutable after publish
        transfer::public_freeze_object(metadata);
    }

    // ─── Test-only helpers ────────────────────────────────────────────────────
    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(AXIOM_TEST_CLAIM {}, ctx)
    }
}
