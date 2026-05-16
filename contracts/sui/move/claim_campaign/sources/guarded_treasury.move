// =============================================================================
// Axiom Protocol — Sui Phase 8
// guarded_treasury.move — A4/A5 Access-controlled TreasuryCap wrapper
//
// A4: GuardedTreasury wraps TreasuryCap<T> behind admin access control.
//     The TreasuryCap is never exposed directly — all minting goes through
//     guarded_treasury::mint(), which enforces pause and supply cap checks.
//
// A5: Separation of minting authority from campaign administration.
//     The address that holds the GuardedTreasury admin right is distinct from
//     the ClaimCampaign AdminCap holder. Funding requires minting through
//     GuardedTreasury, then depositing Coin<T> into the campaign separately.
//
// COMMUNITY DISTRIBUTION ONLY. NOT AXUSD, AXAU, AXM, SEED, or KAG.
// =============================================================================

module claim_campaign::guarded_treasury {
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;

    // ── Error codes ───────────────────────────────────────────────────────────
    public const E_SUPPLY_CAP: u64  = 1;
    public const E_PAUSED: u64      = 2;
    public const E_NOT_ADMIN: u64   = 3;

    // ── Structs ───────────────────────────────────────────────────────────────

    /// A4: Shared wrapper around TreasuryCap<T>.
    /// Only the `admin` address (or a delegated minter) may call `mint`.
    /// `paused` halts all minting. `mint_cap` is the absolute supply ceiling (A5).
    struct GuardedTreasury<phantom T> has key {
        id: UID,
        treasury_cap: TreasuryCap<T>,
        admin: address,
        paused: bool,
        total_minted: u64,
        mint_cap: u64,
    }

    // ── Events ────────────────────────────────────────────────────────────────
    struct MintEvent has copy, drop {
        minter: address,
        amount: u64,
        total_minted: u64,
    }

    struct PauseEvent has copy, drop {
        paused: bool,
        triggered_by: address,
    }

    struct AdminTransferEvent has copy, drop {
        from: address,
        to: address,
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    /// Create a GuardedTreasury and share it.
    /// Called from `axiom_test_claim::init` immediately after `create_currency`.
    public fun create<T>(
        treasury_cap: TreasuryCap<T>,
        mint_cap: u64,
        ctx: &mut TxContext,
    ) {
        let treasury = GuardedTreasury<T> {
            id: object::new(ctx),
            treasury_cap,
            admin: tx_context::sender(ctx),
            paused: false,
            total_minted: 0,
            mint_cap,
        };
        transfer::share_object(treasury);
    }

    // ── Minting (A4/A5) ───────────────────────────────────────────────────────

    /// Mint `amount` tokens through the guarded treasury.
    /// Caller must be the `admin` address (A5 separation of mint authority).
    /// Aborts if paused (A4) or if supply cap would be exceeded (A5).
    public fun mint<T>(
        gt: &mut GuardedTreasury<T>,
        amount: u64,
        ctx: &mut TxContext,
    ): Coin<T> {
        assert!(tx_context::sender(ctx) == gt.admin, E_NOT_ADMIN);
        assert!(!gt.paused, E_PAUSED);
        assert!(gt.total_minted + amount <= gt.mint_cap, E_SUPPLY_CAP);
        gt.total_minted = gt.total_minted + amount;
        event::emit(MintEvent {
            minter: tx_context::sender(ctx),
            amount,
            total_minted: gt.total_minted,
        });
        coin::mint(&mut gt.treasury_cap, amount, ctx)
    }

    // ── Admin controls ────────────────────────────────────────────────────────

    /// Pause all minting. Admin only.
    public fun pause<T>(gt: &mut GuardedTreasury<T>, ctx: &TxContext) {
        assert!(tx_context::sender(ctx) == gt.admin, E_NOT_ADMIN);
        gt.paused = true;
        event::emit(PauseEvent { paused: true, triggered_by: tx_context::sender(ctx) });
    }

    /// Resume minting. Admin only.
    public fun unpause<T>(gt: &mut GuardedTreasury<T>, ctx: &TxContext) {
        assert!(tx_context::sender(ctx) == gt.admin, E_NOT_ADMIN);
        gt.paused = false;
        event::emit(PauseEvent { paused: false, triggered_by: tx_context::sender(ctx) });
    }

    /// Transfer treasury admin to a new address. Emits audit event.
    public fun transfer_admin<T>(
        gt: &mut GuardedTreasury<T>,
        new_admin: address,
        ctx: &TxContext,
    ) {
        assert!(tx_context::sender(ctx) == gt.admin, E_NOT_ADMIN);
        event::emit(AdminTransferEvent { from: gt.admin, to: new_admin });
        gt.admin = new_admin;
    }

    // ── Read-only ─────────────────────────────────────────────────────────────
    public fun total_minted<T>(gt: &GuardedTreasury<T>): u64  { gt.total_minted }
    public fun mint_cap<T>(gt: &GuardedTreasury<T>): u64       { gt.mint_cap }
    public fun is_paused<T>(gt: &GuardedTreasury<T>): bool     { gt.paused }
    public fun admin<T>(gt: &GuardedTreasury<T>): address      { gt.admin }
    public fun remaining_supply<T>(gt: &GuardedTreasury<T>): u64 {
        gt.mint_cap - gt.total_minted
    }
}
