// =============================================================================
// GuardedTreasury — Phase 9 Mainnet Candidate (A4 + A5)
//
// Community rewards only. No monetary value. Not a canonical Axiom asset.
//
// Wraps TreasuryCap<T> so no loose TreasuryCap is ever exposed.
// All minting flows through guarded_mint(), which enforces MAX_SUPPLY
// and emits TokensMinted event.
//
// Error codes:
//   ESupplyCapExceeded = 9
// =============================================================================

module axiom_claim_mainnet_candidate::guarded_treasury {
    use sui::coin::{Self, TreasuryCap, Coin};
    use sui::event;

    const MAX_SUPPLY: u64 = 1_000_000_000_000_000;
    const ESupplyCapExceeded: u64 = 9;

    public struct GuardedTreasury<phantom T> has key, store {
        id: UID,
        cap: TreasuryCap<T>,
        total_minted: u64,
    }

    public struct TokensMinted has copy, drop {
        amount: u64,
        total_minted_after: u64,
    }

    public fun create<T>(cap: TreasuryCap<T>, ctx: &mut TxContext): GuardedTreasury<T> {
        GuardedTreasury { id: object::new(ctx), cap, total_minted: 0 }
    }

    public fun guarded_mint<T>(
        treasury: &mut GuardedTreasury<T>,
        amount: u64,
        ctx: &mut TxContext,
    ): Coin<T> {
        assert!(treasury.total_minted + amount <= MAX_SUPPLY, ESupplyCapExceeded);
        treasury.total_minted = treasury.total_minted + amount;
        let minted = coin::mint(&mut treasury.cap, amount, ctx);
        event::emit(TokensMinted { amount, total_minted_after: treasury.total_minted });
        minted
    }

    public fun total_minted<T>(treasury: &GuardedTreasury<T>): u64 { treasury.total_minted }
    public fun max_supply(): u64 { MAX_SUPPLY }
}
