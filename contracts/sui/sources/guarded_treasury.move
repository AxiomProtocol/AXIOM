/// Axiom Protocol — Guarded Treasury
///
/// A cap-gated treasury wrapper for AMC used by ClaimCampaign.
///
/// Audit hardening applied:
///   A4 — Privilege separation: treasury pool management is a distinct
///        object capability from campaign admin operations. Draining the
///        treasury requires the TreasuryCap (owner authority), not just
///        any AdminCap. Campaign funding flows through deposit(), which
///        requires explicit operator action with TreasuryCap held.
///   A5 — No shared mutable state beyond the Balance inside this object.
///        The GuardedTreasury is a shared object; operations on it require
///        both the treasury object reference and the explicit cap argument.
///        This prevents unauthorized mints or balance manipulation.
///
/// Design:
///   - GuardedTreasury<T> is a shared object holding Balance<T>
///   - TreasuryOperatorCap is a unique one-per-treasury capability
///   - Only the holder of TreasuryOperatorCap can deposit or withdraw
///   - ClaimCampaign references the treasury by ID; the treasury ID is
///     recorded on campaign creation for auditability
module axiom::guarded_treasury {
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::event;

    // ── Capability ──────────────────────────────────────────────────────────

    /// One-of capability that authorises treasury deposits and withdrawals.
    /// Transfer this to the protocol multisig after deployment.
    public struct TreasuryOperatorCap has key, store {
        id: UID,
        /// ID of the GuardedTreasury this cap controls.
        treasury_id: ID,
    }

    /// Shared treasury object — holds pool balance and tracks total flows.
    public struct GuardedTreasury<phantom T> has key {
        id: UID,
        /// Liquid pool available for campaign payouts.
        pool: Balance<T>,
        /// Cumulative deposited (informational — not authoritative).
        total_deposited: u64,
        /// Cumulative withdrawn (informational — not authoritative).
        total_withdrawn: u64,
    }

    // ── Events ──────────────────────────────────────────────────────────────

    public struct TreasuryCreated has copy, drop {
        treasury_id: ID,
        operator_cap_id: ID,
    }

    public struct TreasuryDeposit has copy, drop {
        treasury_id: ID,
        amount:      u64,
        new_balance: u64,
    }

    public struct TreasuryWithdrawal has copy, drop {
        treasury_id:  ID,
        amount:       u64,
        new_balance:  u64,
        recipient:    address,
    }

    // ── Error codes ──────────────────────────────────────────────────────────

    const E_CAP_MISMATCH:         u64 = 1;
    const E_INSUFFICIENT_BALANCE: u64 = 2;

    // ── Public API ───────────────────────────────────────────────────────────

    /// Create a new GuardedTreasury (shared) and return the operator cap.
    /// The caller receives TreasuryOperatorCap — transfer to multisig.
    public fun create<T>(ctx: &mut TxContext): TreasuryOperatorCap {
        let treasury = GuardedTreasury<T> {
            id:               object::new(ctx),
            pool:             balance::zero<T>(),
            total_deposited:  0,
            total_withdrawn:  0,
        };
        let treasury_id = object::id(&treasury);

        let cap = TreasuryOperatorCap {
            id:          object::new(ctx),
            treasury_id,
        };
        let cap_id = object::id(&cap);

        event::emit(TreasuryCreated { treasury_id, operator_cap_id: cap_id });

        transfer::share_object(treasury);
        cap
    }

    /// Deposit coins into the treasury pool.
    /// Requires TreasuryOperatorCap bound to this treasury (A4).
    public fun deposit<T>(
        treasury: &mut GuardedTreasury<T>,
        cap:      &TreasuryOperatorCap,
        coins:    Coin<T>,
        ctx:      &TxContext,
    ) {
        assert_cap_matches(cap, treasury);
        let _ = ctx;
        let amount = coin::value(&coins);
        balance::join(&mut treasury.pool, coin::into_balance(coins));
        treasury.total_deposited = treasury.total_deposited + amount;
        let new_balance = balance::value(&treasury.pool);
        event::emit(TreasuryDeposit {
            treasury_id: object::id(treasury),
            amount,
            new_balance,
        });
    }

    /// Withdraw `amount` from the treasury to `recipient`.
    /// Requires TreasuryOperatorCap (A4). Aborts if balance insufficient (A5).
    public fun withdraw<T>(
        treasury:  &mut GuardedTreasury<T>,
        cap:       &TreasuryOperatorCap,
        amount:    u64,
        recipient: address,
        ctx:       &mut TxContext,
    ) {
        assert_cap_matches(cap, treasury);
        assert!(balance::value(&treasury.pool) >= amount, E_INSUFFICIENT_BALANCE);

        let withdrawn = coin::from_balance(
            balance::split(&mut treasury.pool, amount),
            ctx,
        );
        treasury.total_withdrawn = treasury.total_withdrawn + amount;

        let new_balance = balance::value(&treasury.pool);
        event::emit(TreasuryWithdrawal {
            treasury_id: object::id(treasury),
            amount,
            new_balance,
            recipient,
        });
        transfer::public_transfer(withdrawn, recipient);
    }

    /// Read the current pool balance without withdrawing.
    public fun pool_balance<T>(treasury: &GuardedTreasury<T>): u64 {
        balance::value(&treasury.pool)
    }

    /// Return the treasury_id this cap is bound to.
    public fun cap_treasury_id(cap: &TreasuryOperatorCap): ID {
        cap.treasury_id
    }

    /// Internal: take `amount` from the pool into a Balance (used by
    /// ClaimCampaign's payout path, called only via friend access).
    /// Returns the split Balance for the caller to convert to Coin.
    public(package) fun take_balance<T>(
        treasury: &mut GuardedTreasury<T>,
        amount:   u64,
    ): Balance<T> {
        assert!(balance::value(&treasury.pool) >= amount, E_INSUFFICIENT_BALANCE);
        treasury.total_withdrawn = treasury.total_withdrawn + amount;
        balance::split(&mut treasury.pool, amount)
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    fun assert_cap_matches<T>(cap: &TreasuryOperatorCap, treasury: &GuardedTreasury<T>) {
        assert!(cap.treasury_id == object::id(treasury), E_CAP_MISMATCH);
    }

    // ── Test-only helpers ─────────────────────────────────────────────────────

    #[test_only]
    public fun create_for_testing<T>(ctx: &mut TxContext): TreasuryOperatorCap {
        create<T>(ctx)
    }

    #[test_only]
    public fun take_balance_for_test<T>(
        treasury: &mut GuardedTreasury<T>,
        amount:   u64,
    ): Balance<T> {
        take_balance<T>(treasury, amount)
    }
}
