// =============================================================================
// GuardedTreasury — Phase 8 Hardening A4 + A5
//
// TESTNET ONLY. No monetary value. Not a canonical Axiom asset.
//
// Purpose:
//   Wraps TreasuryCap<T> so that no loose TreasuryCap object is ever exposed
//   in an admin wallet. All minting flows through guarded_mint(), which enforces
//   a hard supply cap (MAX_SUPPLY) and emits a TokensMinted event.
//
// Object model:
//   GuardedTreasury<T> — Shared or owned depending on deployment preference.
//     For testnet, created in axiom_test_claim::init() and transferred to admin.
//
// Phase 8 hardening items covered:
//   A4 — TreasuryCap wrapped; no loose TreasuryCap ownership after init
//   A5 — MAX_SUPPLY enforced; ESupplyCapExceeded = 9 on violation
//   A7 — TokensMinted event on every guarded_mint call
//
// Error codes:
//   ESupplyCapExceeded = 9
// =============================================================================

module axiom_claim_prototype::guarded_treasury {
    use sui::coin::{Self, TreasuryCap, Coin};
    use sui::event;

    // =========================================================================
    // Constants
    // =========================================================================

    // Hard supply cap: 1,000,000,000 tokens at 6 decimals = 1_000_000_000_000_000 base units.
    const MAX_SUPPLY: u64 = 1_000_000_000_000_000;

    const ESupplyCapExceeded: u64 = 9;

    // =========================================================================
    // GuardedTreasury<T> — wraps TreasuryCap, tracks total_minted.
    //
    // Invariant: total_minted <= MAX_SUPPLY at all times.
    // =========================================================================
    public struct GuardedTreasury<phantom T> has key, store {
        id: UID,
        cap: TreasuryCap<T>,
        total_minted: u64,
    }

    // =========================================================================
    // Events
    // =========================================================================

    public struct TokensMinted has copy, drop {
        amount: u64,
        total_minted_after: u64,
    }

    // =========================================================================
    // create — wraps a TreasuryCap into a GuardedTreasury.
    //
    // Called from axiom_test_claim::init(). The TreasuryCap is consumed here
    // and never accessible again directly. No loose TreasuryCap remains.
    //
    // Returns the GuardedTreasury; caller decides ownership (transfer/share).
    // =========================================================================
    public fun create<T>(cap: TreasuryCap<T>, ctx: &mut TxContext): GuardedTreasury<T> {
        GuardedTreasury {
            id: object::new(ctx),
            cap,
            total_minted: 0,
        }
    }

    // =========================================================================
    // guarded_mint — mints amount tokens after supply cap check.
    //
    // Aborts with ESupplyCapExceeded (9) if total_minted + amount > MAX_SUPPLY.
    // Emits TokensMinted event.
    //
    // The caller is responsible for ensuring they have appropriate authority
    // to call this function (e.g. they hold AdminCap at a higher level).
    // =========================================================================
    public fun guarded_mint<T>(
        treasury: &mut GuardedTreasury<T>,
        amount: u64,
        ctx: &mut TxContext,
    ): Coin<T> {
        assert!(
            treasury.total_minted + amount <= MAX_SUPPLY,
            ESupplyCapExceeded,
        );
        treasury.total_minted = treasury.total_minted + amount;
        let minted = coin::mint(&mut treasury.cap, amount, ctx);
        event::emit(TokensMinted {
            amount,
            total_minted_after: treasury.total_minted,
        });
        minted
    }

    // =========================================================================
    // Read-only accessors
    // =========================================================================

    public fun total_minted<T>(treasury: &GuardedTreasury<T>): u64 {
        treasury.total_minted
    }

    public fun max_supply(): u64 {
        MAX_SUPPLY
    }
}
