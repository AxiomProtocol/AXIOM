// =============================================================================
// Axiom Protocol — Sui Phase 8
// claim_campaign.move — Hardened Merkle-gated claim campaign
//
// Hardening applied (A1–A7):
//   A1  MAX_PROOF_DEPTH = 20   Blocks gas-griefing via oversized proof vectors
//   A2  is_closed flag         Permanently irreversible close; double-claim guard
//   A3  expires_at_ms          Clock-checked epoch expiry (0 = no expiry)
//   A4  Pool via Balance<T>    No loose Coin in storage; GuardedTreasury for mint
//   A5  AdminCap separation    Campaign admin ≠ treasury admin (A5 separation)
//   A6  supply_cap             Hard ceiling on total tokens disbursed per campaign
//   A7  pause / unpause        Operator circuit-breaker with audit events
//
// COMMUNITY DISTRIBUTION ONLY. NOT AXUSD, AXAU, AXM, SEED, or KAG.
// No monetary value. Not redeemable. Not backed by any reserve.
// =============================================================================

module claim_campaign::claim_campaign {
    use sui::object::{Self, UID, ID};
    use sui::table::{Self, Table};
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::clock::{Self, Clock};
    use sui::event;
    use sui::hash;
    use std::bcs;
    use sui::address as sui_address;
    use claim_campaign::axiom_test_claim::AXIOM_TEST_CLAIM;
    use claim_campaign::merkle;

    // ── Error codes ───────────────────────────────────────────────────────────
    public const E_ALREADY_CLAIMED: u64      = 1;
    public const E_CAMPAIGN_INACTIVE: u64    = 2;
    public const E_CAMPAIGN_CLOSED: u64      = 3;
    public const E_INVALID_PROOF: u64        = 4;
    public const E_NOT_ADMIN: u64            = 5;
    public const E_CAMPAIGN_EXPIRED: u64     = 6;
    public const E_INSUFFICIENT_POOL: u64    = 7;
    public const E_PAUSED: u64               = 8;
    public const E_PROOF_TOO_DEEP: u64       = 9;
    public const E_SUPPLY_CAP_EXCEEDED: u64  = 10;
    public const E_INVALID_MERKLE_ROOT: u64  = 11;

    // ── Structs ───────────────────────────────────────────────────────────────

    /// Shared campaign object. One per distribution event.
    struct ClaimCampaign has key {
        id: UID,
        admin: address,
        merkle_root: vector<u8>,
        amount_per_claim: u64,
        /// A3: Unix millisecond expiry timestamp. 0 = never expires.
        expires_at_ms: u64,
        /// A2: Active flag — togglable before close.
        is_active: bool,
        /// A2: Permanently closed once set. Irreversible by design.
        is_closed: bool,
        /// A7: Operator circuit-breaker. Pausing halts all claims.
        paused: bool,
        /// A2: Per-address claim tracker. Table<address, bool>.
        claimed: Table<address, bool>,
        /// A4: Pool stored as Balance (no loose Coin in storage).
        pool: Balance<AXIOM_TEST_CLAIM>,
        total_claimed: u64,
        /// A6: Maximum total tokens disbursable from this campaign.
        supply_cap: u64,
    }

    /// Owned capability granted to campaign creator. Required for all admin ops.
    struct AdminCap has key, store {
        id: UID,
        campaign_id: ID,
    }

    // ── Events ────────────────────────────────────────────────────────────────
    struct ClaimEvent has copy, drop {
        campaign_id: ID,
        claimer: address,
        amount: u64,
    }

    struct CampaignCreatedEvent has copy, drop {
        campaign_id: ID,
        admin: address,
        supply_cap: u64,
    }

    struct CampaignClosedEvent has copy, drop {
        campaign_id: ID,
        remaining_refunded: u64,
    }

    struct CampaignPausedEvent has copy, drop {
        campaign_id: ID,
        paused: bool,
        triggered_by: address,
    }

    struct AdminCapTransferredEvent has copy, drop {
        campaign_id: ID,
        from: address,
        to: address,
    }

    struct AdminCapDestroyedEvent has copy, drop {
        campaign_id: ID,
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    /// Create and share a new ClaimCampaign. Returns an AdminCap to the caller.
    /// `merkle_root` must be exactly 32 bytes (keccak256 output).
    /// `expires_at_ms` = 0 means no expiry.
    /// `supply_cap` = hard ceiling on total disbursements (A6).
    public fun create(
        merkle_root: vector<u8>,
        amount_per_claim: u64,
        expires_at_ms: u64,
        supply_cap: u64,
        initial_funds: Coin<AXIOM_TEST_CLAIM>,
        ctx: &mut TxContext,
    ): AdminCap {
        assert!(merkle_root.length() == 32, E_INVALID_MERKLE_ROOT);
        let campaign = ClaimCampaign {
            id: object::new(ctx),
            admin: tx_context::sender(ctx),
            merkle_root,
            amount_per_claim,
            expires_at_ms,
            is_active: true,
            is_closed: false,
            paused: false,
            claimed: table::new(ctx),
            pool: coin::into_balance(initial_funds),
            total_claimed: 0,
            supply_cap,
        };
        let campaign_id = object::id(&campaign);
        event::emit(CampaignCreatedEvent {
            campaign_id,
            admin: tx_context::sender(ctx),
            supply_cap,
        });
        transfer::share_object(campaign);
        AdminCap { id: object::new(ctx), campaign_id }
    }

    // ── Claim (A1–A7) ─────────────────────────────────────────────────────────

    /// Claim tokens from a campaign by presenting a valid Merkle proof.
    ///
    /// Guards enforced in order:
    ///   A7 pause check
    ///   A2 active + closed checks
    ///   A3 epoch expiry
    ///   A1 proof depth
    ///   A6 supply cap
    ///   A2 double-claim (Table lookup)
    ///   Merkle proof verification
    ///   A4 pool balance check
    ///
    /// On success: marks claimed, increments total_claimed, splits and transfers payout.
    public fun claim(
        campaign: &mut ClaimCampaign,
        proof: vector<vector<u8>>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        // A7: Circuit-breaker
        assert!(!campaign.paused, E_PAUSED);
        // A2: State guards
        assert!(campaign.is_active, E_CAMPAIGN_INACTIVE);
        assert!(!campaign.is_closed, E_CAMPAIGN_CLOSED);
        // A3: Expiry (0 = no expiry)
        if (campaign.expires_at_ms > 0) {
            assert!(
                clock::timestamp_ms(clock) <= campaign.expires_at_ms,
                E_CAMPAIGN_EXPIRED,
            );
        };
        // A1: Proof depth guard (redundant with merkle::verify_proof, explicit for clarity)
        assert!(proof.length() <= merkle::MAX_PROOF_DEPTH, E_PROOF_TOO_DEEP);
        // A6: Supply cap
        assert!(
            campaign.total_claimed + campaign.amount_per_claim <= campaign.supply_cap,
            E_SUPPLY_CAP_EXCEEDED,
        );
        let claimer = tx_context::sender(ctx);
        // A2: Double-claim guard
        assert!(!campaign.claimed.contains(claimer), E_ALREADY_CLAIMED);
        // Merkle proof verification
        let leaf = build_leaf(claimer, campaign.amount_per_claim);
        assert!(
            merkle::verify_proof(leaf, proof, campaign.merkle_root),
            E_INVALID_PROOF,
        );
        // A4: Pool balance check
        assert!(
            balance::value(&campaign.pool) >= campaign.amount_per_claim,
            E_INSUFFICIENT_POOL,
        );
        // Mark claimed before transfer (checks-effects-interactions)
        campaign.claimed.add(claimer, true);
        campaign.total_claimed = campaign.total_claimed + campaign.amount_per_claim;
        // Split payout and transfer
        let payout = coin::from_balance(
            balance::split(&mut campaign.pool, campaign.amount_per_claim),
            ctx,
        );
        event::emit(ClaimEvent {
            campaign_id: object::id(campaign),
            claimer,
            amount: campaign.amount_per_claim,
        });
        transfer::public_transfer(payout, claimer);
    }

    // ── Admin operations ──────────────────────────────────────────────────────

    /// A7: Pause all claims. Admin only.
    public fun pause(cap: &AdminCap, campaign: &mut ClaimCampaign, ctx: &TxContext) {
        assert!(object::id(campaign) == cap.campaign_id, E_NOT_ADMIN);
        campaign.paused = true;
        event::emit(CampaignPausedEvent {
            campaign_id: cap.campaign_id,
            paused: true,
            triggered_by: tx_context::sender(ctx),
        });
    }

    /// A7: Resume claims. Cannot unpause a closed campaign.
    public fun unpause(cap: &AdminCap, campaign: &mut ClaimCampaign, ctx: &TxContext) {
        assert!(object::id(campaign) == cap.campaign_id, E_NOT_ADMIN);
        assert!(!campaign.is_closed, E_CAMPAIGN_CLOSED);
        campaign.paused = false;
        event::emit(CampaignPausedEvent {
            campaign_id: cap.campaign_id,
            paused: false,
            triggered_by: tx_context::sender(ctx),
        });
    }

    /// A2: Close campaign permanently. Returns remaining pool balance to admin.
    /// Irreversible — is_closed cannot be set back to false.
    public fun close(cap: &AdminCap, campaign: &mut ClaimCampaign, ctx: &mut TxContext) {
        assert!(object::id(campaign) == cap.campaign_id, E_NOT_ADMIN);
        campaign.is_active = false;
        campaign.is_closed = true;
        let remaining = balance::value(&campaign.pool);
        if (remaining > 0) {
            let refund = coin::from_balance(
                balance::split(&mut campaign.pool, remaining),
                ctx,
            );
            transfer::public_transfer(refund, campaign.admin);
        };
        event::emit(CampaignClosedEvent {
            campaign_id: cap.campaign_id,
            remaining_refunded: remaining,
        });
    }

    /// Deposit additional tokens into the campaign pool.
    public fun fund(cap: &AdminCap, campaign: &mut ClaimCampaign, coin: Coin<AXIOM_TEST_CLAIM>) {
        assert!(object::id(campaign) == cap.campaign_id, E_NOT_ADMIN);
        balance::join(&mut campaign.pool, coin::into_balance(coin));
    }

    /// Toggle active state without closing. Cannot reactivate a closed campaign.
    public fun set_active(cap: &AdminCap, campaign: &mut ClaimCampaign, active: bool) {
        assert!(object::id(campaign) == cap.campaign_id, E_NOT_ADMIN);
        assert!(!campaign.is_closed, E_CAMPAIGN_CLOSED);
        campaign.is_active = active;
    }

    /// Transfer AdminCap to a new address. Emits audit event.
    public fun transfer_admin_cap(cap: AdminCap, to: address, ctx: &TxContext) {
        event::emit(AdminCapTransferredEvent {
            campaign_id: cap.campaign_id,
            from: tx_context::sender(ctx),
            to,
        });
        transfer::public_transfer(cap, to);
    }

    /// Destroy AdminCap permanently. Emits audit event. Campaign remains accessible
    /// (shared object) but no further admin ops are possible.
    public fun destroy_admin_cap(cap: AdminCap) {
        let AdminCap { id, campaign_id } = cap;
        event::emit(AdminCapDestroyedEvent { campaign_id });
        object::delete(id);
    }

    // ── Leaf construction ─────────────────────────────────────────────────────

    /// Compute the Merkle leaf hash for (address, amount).
    /// leaf = keccak256( address::to_bytes(addr)[32] || bcs::to_bytes(amount)[8 LE] )
    /// Must match TypeScript computeLeafHash exactly.
    fun build_leaf(addr: address, amount: u64): vector<u8> {
        let mut preimage = sui_address::to_bytes(addr); // 32 bytes
        let amount_bytes = bcs::to_bytes(&amount);       // 8 bytes LE
        preimage.append(amount_bytes);
        hash::keccak256(&preimage)
    }

    // ── Read-only API ─────────────────────────────────────────────────────────
    public fun is_active(c: &ClaimCampaign): bool     { c.is_active }
    public fun is_closed(c: &ClaimCampaign): bool     { c.is_closed }
    public fun is_paused(c: &ClaimCampaign): bool     { c.paused }
    public fun total_claimed(c: &ClaimCampaign): u64  { c.total_claimed }
    public fun pool_balance(c: &ClaimCampaign): u64   { balance::value(&c.pool) }
    public fun supply_cap(c: &ClaimCampaign): u64     { c.supply_cap }
    public fun amount_per_claim(c: &ClaimCampaign): u64 { c.amount_per_claim }
    public fun has_claimed(c: &ClaimCampaign, addr: address): bool {
        c.claimed.contains(addr)
    }
    public fun expires_at_ms(c: &ClaimCampaign): u64  { c.expires_at_ms }

    // ── Test helpers ──────────────────────────────────────────────────────────
    #[test_only]
    public fun build_leaf_for_testing(addr: address, amount: u64): vector<u8> {
        build_leaf(addr, amount)
    }
}
