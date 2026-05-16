// =============================================================================
// Axiom Protocol — Sui Phase 8
// axiom_test_claim.move — Community-distribution token (ATC / AXIOM TEST CLAIM)
//
// One-time witness coin. Metadata is frozen at deploy.
// TreasuryCap is immediately wrapped in GuardedTreasury (A4/A5) — no loose cap.
//
// COMMUNITY DISTRIBUTION ONLY. NOT AXUSD, AXAU, AXM, SEED, or KAG.
// No monetary value. Not redeemable. Not backed by any reserve.
// =============================================================================

module claim_campaign::axiom_test_claim {
    use std::option;
    use sui::coin::{Self, TreasuryCap, CoinMetadata};
    use sui::transfer;
    use sui::tx_context::TxContext;
    use claim_campaign::guarded_treasury;

    // ── Constants ─────────────────────────────────────────────────────────────
    const DECIMALS: u8  = 6;
    const MAX_SUPPLY: u64 = 1_000_000_000_000_000; // 1 billion ATC (6 decimals)

    // ── One-Time Witness ──────────────────────────────────────────────────────
    struct AXIOM_TEST_CLAIM has drop {}

    // ── init ──────────────────────────────────────────────────────────────────
    /// Called once at package publish. Creates the ATC currency, freezes metadata,
    /// and wraps the TreasuryCap in a GuardedTreasury shared object (A4/A5).
    /// After init, no address holds a loose TreasuryCap — minting goes exclusively
    /// through guarded_treasury::mint().
    fun init(witness: AXIOM_TEST_CLAIM, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            DECIMALS,
            b"ATC",
            b"AXIOM TEST CLAIM",
            b"COMMUNITY REWARDS LAYER. No monetary value. NOT AXUSD, AXAU, AXM, SEED, or KAG.",
            option::none(),
            ctx,
        );
        // Freeze metadata — symbol/name/description are immutable post-deploy.
        transfer::public_freeze_object(metadata);
        // A4/A5: Wrap TreasuryCap in GuardedTreasury with hard supply cap.
        guarded_treasury::create<AXIOM_TEST_CLAIM>(treasury_cap, MAX_SUPPLY, ctx);
    }

    // ── Public constants ──────────────────────────────────────────────────────
    public fun max_supply(): u64  { MAX_SUPPLY }
    public fun decimals(): u8     { DECIMALS }

    // ── Test helpers ──────────────────────────────────────────────────────────
    #[test_only]
    /// Create a TreasuryCap for testing without going through GuardedTreasury.
    /// Used by claim_campaign_tests.move to set up isolated test scenarios.
    public fun init_for_testing(ctx: &mut TxContext): TreasuryCap<AXIOM_TEST_CLAIM> {
        let (treasury_cap, metadata) = coin::create_currency(
            AXIOM_TEST_CLAIM {},
            DECIMALS,
            b"ATC",
            b"AXIOM TEST CLAIM",
            b"Test-only instance",
            option::none(),
            ctx,
        );
        transfer::public_freeze_object(metadata);
        treasury_cap
    }

    #[test_only]
    public fun destroy_treasury_cap_for_testing(cap: TreasuryCap<AXIOM_TEST_CLAIM>) {
        sui::test_utils::destroy(cap);
    }
}
