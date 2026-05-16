/// GuardedTreasury — A4/A5 hardening layer over TreasuryCap.
///
/// Wraps a coin TreasuryCap behind:
///   A4 – all mint/burn calls gated by TreasuryAdminCap
///   A5 – per-epoch daily mint cap; resets automatically when epoch advances
module axiom_sui::guarded_treasury {
    use sui::coin::{Self, TreasuryCap};
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;

    // ─── Error codes ──────────────────────────────────────────────────────────
    const E_DAILY_CAP_EXCEEDED: u64 = 1;
    const E_ZERO_AMOUNT:        u64 = 2;
    const E_TREASURY_FROZEN:    u64 = 3;

    // ─── Objects (Move 2024: public struct required) ───────────────────────────
    public struct GuardedTreasury<phantom T> has key {
        id:                UID,
        cap:               TreasuryCap<T>,
        daily_mint_cap:    u64,
        minted_this_epoch: u64,
        last_epoch:        u64,
        frozen:            bool,
    }

    /// Capability required for guarded mint / cap update / freeze.
    public struct TreasuryAdminCap has key { id: UID }

    // ─── Events ───────────────────────────────────────────────────────────────
    public struct GuardedMint has copy, drop {
        amount:          u64,
        recipient:       address,
        epoch:           u64,
        remaining_today: u64,
    }

    public struct DailyCapUpdated has copy, drop {
        old_cap: u64,
        new_cap: u64,
    }

    // ─── Constructor ──────────────────────────────────────────────────────────
    public fun create_from_cap<T>(
        cap:            TreasuryCap<T>,
        daily_mint_cap: u64,
        ctx:            &mut TxContext,
    ) {
        let treasury = GuardedTreasury {
            id:                object::new(ctx),
            cap,
            daily_mint_cap,
            minted_this_epoch: 0,
            last_epoch:        tx_context::epoch(ctx),
            frozen:            false,
        };
        transfer::share_object(treasury);
        transfer::transfer(TreasuryAdminCap { id: object::new(ctx) }, tx_context::sender(ctx));
    }

    // ─── Guarded mint ─────────────────────────────────────────────────────────
    public entry fun guarded_mint<T>(
        _:         &TreasuryAdminCap,
        treasury:  &mut GuardedTreasury<T>,
        amount:    u64,
        recipient: address,
        ctx:       &mut TxContext,
    ) {
        assert!(!treasury.frozen, E_TREASURY_FROZEN);
        assert!(amount > 0, E_ZERO_AMOUNT);

        let current_epoch = tx_context::epoch(ctx);
        if (current_epoch > treasury.last_epoch) {
            treasury.minted_this_epoch = 0;
            treasury.last_epoch = current_epoch;
        };

        assert!(
            treasury.minted_this_epoch + amount <= treasury.daily_mint_cap,
            E_DAILY_CAP_EXCEEDED,
        );
        treasury.minted_this_epoch = treasury.minted_this_epoch + amount;

        let minted = coin::mint(&mut treasury.cap, amount, ctx);
        transfer::public_transfer(minted, recipient);

        event::emit(GuardedMint {
            amount,
            recipient,
            epoch:           current_epoch,
            remaining_today: treasury.daily_mint_cap - treasury.minted_this_epoch,
        });
    }

    // ─── Admin operations ─────────────────────────────────────────────────────
    public entry fun update_daily_cap<T>(
        _:             &TreasuryAdminCap,
        treasury:      &mut GuardedTreasury<T>,
        new_daily_cap: u64,
        _ctx:          &mut TxContext,
    ) {
        assert!(!treasury.frozen, E_TREASURY_FROZEN);
        let old_cap = treasury.daily_mint_cap;
        treasury.daily_mint_cap = new_daily_cap;
        event::emit(DailyCapUpdated { old_cap, new_cap: new_daily_cap });
    }

    public entry fun freeze_treasury<T>(
        _:        &TreasuryAdminCap,
        treasury: &mut GuardedTreasury<T>,
        _ctx:     &mut TxContext,
    ) {
        treasury.frozen = true;
    }

    // ─── Read-only helpers ────────────────────────────────────────────────────
    public fun total_supply<T>(treasury: &GuardedTreasury<T>): u64 {
        coin::total_supply(&treasury.cap)
    }

    public fun daily_mint_cap<T>(treasury: &GuardedTreasury<T>): u64 { treasury.daily_mint_cap }
    public fun minted_this_epoch<T>(treasury: &GuardedTreasury<T>): u64 { treasury.minted_this_epoch }
    public fun is_frozen<T>(treasury: &GuardedTreasury<T>): bool { treasury.frozen }
}
