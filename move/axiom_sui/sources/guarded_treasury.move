/// guarded_treasury — Wraps TreasuryCap to enforce MAX_SUPPLY (A4 / A5).
///
/// A4: No loose TreasuryCap. The cap is consumed on creation and can only
///     be accessed via GuardedTreasury::mint.
/// A5: Every mint checks minted + amount <= max_supply before proceeding.
/// A7: Emits TokensMinted event on every successful mint.
///
/// COMMUNITY DISTRIBUTION ONLY — not a canonical Axiom financial instrument.
module axiom_sui::guarded_treasury {
    use sui::object::{Self, UID};
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::tx_context::TxContext;
    use sui::event;

    // ── Error codes ───────────────────────────────────────────────────────

    /// Minting amount would push total supply past max_supply. (A5)
    const ESupplyCapExceeded: u64 = 0;
    /// Cannot mint zero tokens.
    const EZeroMintAmount: u64 = 1;

    // ── Structs ───────────────────────────────────────────────────────────

    /// Wraps a TreasuryCap and enforces a hard supply ceiling. (A4)
    public struct GuardedTreasury<phantom T> has key, store {
        id: UID,
        cap: TreasuryCap<T>,
        minted: u64,
        max_supply: u64,
    }

    // ── Events ────────────────────────────────────────────────────────────

    /// A7: Emitted on every successful mint.
    public struct TokensMinted has copy, drop {
        amount: u64,
        total_minted: u64,
        max_supply: u64,
    }

    // ── Public API ────────────────────────────────────────────────────────

    /// Wrap a TreasuryCap into a GuardedTreasury.
    ///
    /// The TreasuryCap is consumed; future minting must go through this wrapper.
    public fun new<T>(
        cap: TreasuryCap<T>,
        max_supply: u64,
        ctx: &mut TxContext,
    ): GuardedTreasury<T> {
        GuardedTreasury {
            id: object::new(ctx),
            cap,
            minted: 0,
            max_supply,
        }
    }

    /// Mint `amount` tokens, enforcing the supply cap. (A5)
    ///
    /// Aborts with EZeroMintAmount if amount == 0.
    /// Aborts with ESupplyCapExceeded if minted + amount > max_supply.
    /// Emits TokensMinted. (A7)
    public fun mint<T>(
        treasury: &mut GuardedTreasury<T>,
        amount: u64,
        ctx: &mut TxContext,
    ): Coin<T> {
        assert!(amount > 0, EZeroMintAmount);
        assert!(treasury.minted + amount <= treasury.max_supply, ESupplyCapExceeded);
        treasury.minted = treasury.minted + amount;
        event::emit(TokensMinted {
            amount,
            total_minted: treasury.minted,
            max_supply: treasury.max_supply,
        });
        coin::mint(&mut treasury.cap, amount, ctx)
    }

    /// Total tokens minted so far.
    public fun total_minted<T>(treasury: &GuardedTreasury<T>): u64 {
        treasury.minted
    }

    /// Hard supply ceiling.
    public fun max_supply<T>(treasury: &GuardedTreasury<T>): u64 {
        treasury.max_supply
    }

    /// Remaining mintable supply.
    public fun remaining<T>(treasury: &GuardedTreasury<T>): u64 {
        treasury.max_supply - treasury.minted
    }
}
