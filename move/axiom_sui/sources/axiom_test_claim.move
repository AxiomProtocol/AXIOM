/// axiom_test_claim — One-time witness and init() for the ATC coin on testnet.
///
/// Creates the coin currency and immediately wraps the TreasuryCap in a
/// GuardedTreasury (A4 / A5), so no loose TreasuryCap ever exists after init.
///
/// ATC (AXIOM TEST CLAIM):
///   - 6 decimals
///   - MAX_SUPPLY = 1_000_000_000_000_000 (1e15 base units = 1 billion ATC)
///   - Metadata is frozen at init time
///   - GuardedTreasury is transferred to the deployer
///
/// COMMUNITY DISTRIBUTION ONLY — no monetary value.
/// NOT AXUSD. NOT AXAU. NOT AXM. NOT SEED. NOT KAG.
module axiom_sui::axiom_test_claim {
    use sui::coin;
    use sui::tx_context::TxContext;
    use sui::transfer;
    use std::option;
    use std::string;
    use axiom_sui::guarded_treasury::{Self, GuardedTreasury};

    // ── Constants ─────────────────────────────────────────────────────────

    /// 1_000_000_000 ATC × 10^6 = 1_000_000_000_000_000 base units.
    const MAX_SUPPLY: u64 = 1_000_000_000_000_000;

    // ── One-time witness ──────────────────────────────────────────────────

    /// The one-time witness type. Must match the module name (all-caps).
    public struct AXIOM_TEST_CLAIM has drop {}

    // ── Init ──────────────────────────────────────────────────────────────

    /// Called once at publish time. Creates the currency and immediately
    /// wraps the TreasuryCap into a GuardedTreasury. (A4 / A5)
    fun init(witness: AXIOM_TEST_CLAIM, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            6,
            b"ATC",
            b"AXIOM TEST CLAIM",
            b"COMMUNITY REWARDS LAYER - NON-FINANCIAL. No monetary value. NOT AXUSD, AXAU, AXM, SEED, or KAG.",
            option::none(),
            ctx,
        );

        // A4: Wrap TreasuryCap immediately — no loose cap ever exposed
        // A5: Supply ceiling enforced by GuardedTreasury::mint
        let guarded: GuardedTreasury<AXIOM_TEST_CLAIM> =
            guarded_treasury::new(treasury_cap, MAX_SUPPLY, ctx);

        // GuardedTreasury goes to deployer; they control campaign funding.
        transfer::public_transfer(guarded, sui::tx_context::sender(ctx));

        // Freeze metadata so decimals/symbol cannot change post-deploy.
        transfer::public_freeze_object(metadata);
    }

    // ── Test helpers ──────────────────────────────────────────────────────

    /// Expose init() for test_scenario. Calling this in production is a no-op
    /// because the one-time witness can only be obtained at module publish.
    #[test_only]
    public fun test_init(ctx: &mut TxContext) {
        init(AXIOM_TEST_CLAIM {}, ctx);
    }

    /// MAX_SUPPLY accessor for tests.
    #[test_only]
    public fun max_supply(): u64 { MAX_SUPPLY }
}
