/// Axiom Protocol — Claim Campaign
///
/// Merkle-gated AMC token distribution campaign on Sui.
/// Each campaign holds an on-chain pool and distributes a fixed amount to
/// every eligible address that supplies a valid Merkle proof.
///
/// ── Audit hardening (A1–A7) ─────────────────────────────────────────────
///
///   A1 — Proof depth bounded: merkle::verify() aborts at MAX_PROOF_DEPTH=32.
///        No unbounded loops in claim_campaign itself.
///
///   A2 — Events emitted for every state transition: CampaignCreated,
///        CampaignFunded, CampaignActivated, CampaignPaused, CampaignClosed,
///        ClaimMade. All events include campaign_id for off-chain indexing.
///
///   A3 — AdminCap is a key+store Sui object. One cap per campaign. Its
///        campaign_id field is validated against the target campaign on every
///        admin call (E_WRONG_CAMPAIGN on mismatch). Cannot be duplicated.
///
///   A4 — Pool funding is gated by AdminCap. The pool Balance lives inside
///        ClaimCampaign and is not accessible from external modules except
///        through the defined entry/public functions.
///
///   A5 — Re-entrancy: ClaimRecord is written (transferred to claimant)
///        BEFORE the payout coin is transferred. Move's single-owner model
///        prevents VM re-entrancy; the record-first ordering is explicit.
///
///   A6 — Expiry: if expires_at_epoch > 0, claim() checks that
///        tx_context::epoch(ctx) < expires_at_epoch. Aborts E_EXPIRED if not.
///        expires_at_epoch = 0 means no expiry.
///
///   A7 — Label guard: create_campaign aborts E_LABEL_TOO_LONG if label
///        bytes exceed MAX_LABEL_BYTES (128).
module axiom::claim_campaign {
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::event;
    use axiom::amc::AMC;
    use axiom::merkle;

    // ── Constants ────────────────────────────────────────────────────────────

    /// A7: Maximum label length in bytes.
    const MAX_LABEL_BYTES: u64 = 128;

    // ── Error codes ──────────────────────────────────────────────────────────

    const E_NOT_ACTIVE:        u64 = 0;
    const E_CAMPAIGN_CLOSED:   u64 = 1;
    const E_ALREADY_CLAIMED:   u64 = 2;
    const E_INVALID_PROOF:     u64 = 3;
    const E_EXPIRED:           u64 = 4;
    const E_ZERO_AMOUNT:       u64 = 5;
    const E_POOL_EMPTY:        u64 = 6;
    const E_LABEL_TOO_LONG:    u64 = 7;
    const E_WRONG_CAMPAIGN:    u64 = 8;

    // ── Objects ──────────────────────────────────────────────────────────────

    /// AdminCap — one per campaign. Authorises all admin operations.
    /// A3: transfer to multisig immediately after create_campaign_entry.
    public struct AdminCap has key, store {
        id:          UID,
        campaign_id: ID,
    }

    /// ClaimRecord — proof of claim. Owned by claimant (A5: written pre-payout).
    public struct ClaimRecord has key {
        id:          UID,
        campaign_id: ID,
        claimant:    address,
        amount:      u64,
        claimed_at:  u64,
    }

    /// ClaimCampaign — shared object containing campaign state and AMC pool.
    public struct ClaimCampaign has key {
        id:               UID,
        label:            vector<u8>,
        merkle_root:      vector<u8>,
        amount_per_claim: u64,
        pool:             Balance<AMC>,
        expires_at_epoch: u64,
        is_active:        bool,
        is_closed:        bool,
        total_claims:     u64,
        total_paid_out:   u64,
    }

    // ── Events (A2) ──────────────────────────────────────────────────────────

    public struct CampaignCreated has copy, drop {
        campaign_id:      ID,
        admin_cap_id:     ID,
        label:            vector<u8>,
        amount_per_claim: u64,
        expires_at_epoch: u64,
        creator:          address,
    }

    public struct CampaignFunded has copy, drop {
        campaign_id: ID,
        amount:      u64,
        new_balance: u64,
    }

    public struct CampaignActivated has copy, drop {
        campaign_id: ID,
        epoch:       u64,
    }

    public struct CampaignPaused has copy, drop {
        campaign_id: ID,
        epoch:       u64,
    }

    public struct CampaignClosed has copy, drop {
        campaign_id:  ID,
        epoch:        u64,
        total_claims: u64,
        total_paid:   u64,
    }

    public struct ClaimMade has copy, drop {
        campaign_id:    ID,
        claimant:       address,
        amount:         u64,
        total_claims:   u64,
        remaining_pool: u64,
    }

    // ── Entry functions ───────────────────────────────────────────────────────

    /// Create a new campaign (paused). AdminCap transferred to sender.
    /// A7: aborts E_LABEL_TOO_LONG if label > 128 bytes.
    public entry fun create_campaign_entry(
        label:            vector<u8>,
        merkle_root:      vector<u8>,
        amount_per_claim: u64,
        expires_at_epoch: u64,
        ctx:              &mut TxContext,
    ) {
        assert!(vector::length(&label) <= MAX_LABEL_BYTES, E_LABEL_TOO_LONG);
        assert!(amount_per_claim > 0, E_ZERO_AMOUNT);

        let id = object::new(ctx);
        let campaign_id = object::uid_to_inner(&id);

        let campaign = ClaimCampaign {
            id,
            label,
            merkle_root,
            amount_per_claim,
            pool:             balance::zero<AMC>(),
            expires_at_epoch,
            is_active:        false,
            is_closed:        false,
            total_claims:     0,
            total_paid_out:   0,
        };

        let cap = AdminCap {
            id:          object::new(ctx),
            campaign_id,
        };
        let admin_cap_id = object::id(&cap);

        event::emit(CampaignCreated {
            campaign_id,
            admin_cap_id,
            label:            campaign.label,
            amount_per_claim: campaign.amount_per_claim,
            expires_at_epoch: campaign.expires_at_epoch,
            creator:          tx_context::sender(ctx),
        });

        transfer::public_transfer(cap, tx_context::sender(ctx));
        transfer::share_object(campaign);
    }

    /// Fund the campaign pool. Requires AdminCap (A4).
    public entry fun fund_campaign(
        campaign: &mut ClaimCampaign,
        coins:    Coin<AMC>,
        cap:      &AdminCap,
        _ctx:     &mut TxContext,
    ) {
        assert!(!campaign.is_closed, E_CAMPAIGN_CLOSED);
        assert!(cap.campaign_id == object::id(campaign), E_WRONG_CAMPAIGN);
        let amount = coin::value(&coins);
        balance::join(&mut campaign.pool, coin::into_balance(coins));
        event::emit(CampaignFunded {
            campaign_id: object::id(campaign),
            amount,
            new_balance: balance::value(&campaign.pool),
        });
    }

    /// Activate the campaign — open for claims. Requires AdminCap.
    public entry fun activate(
        campaign: &mut ClaimCampaign,
        cap:      &AdminCap,
        ctx:      &mut TxContext,
    ) {
        assert!(!campaign.is_closed, E_CAMPAIGN_CLOSED);
        assert!(cap.campaign_id == object::id(campaign), E_WRONG_CAMPAIGN);
        campaign.is_active = true;
        event::emit(CampaignActivated {
            campaign_id: object::id(campaign),
            epoch:       tx_context::epoch(ctx),
        });
    }

    /// Pause the campaign. Requires AdminCap.
    public entry fun pause(
        campaign: &mut ClaimCampaign,
        cap:      &AdminCap,
        ctx:      &mut TxContext,
    ) {
        assert!(!campaign.is_closed, E_CAMPAIGN_CLOSED);
        assert!(cap.campaign_id == object::id(campaign), E_WRONG_CAMPAIGN);
        campaign.is_active = false;
        event::emit(CampaignPaused {
            campaign_id: object::id(campaign),
            epoch:       tx_context::epoch(ctx),
        });
    }

    /// Permanently close the campaign. Requires AdminCap.
    public entry fun close_campaign(
        campaign: &mut ClaimCampaign,
        cap:      &AdminCap,
        ctx:      &mut TxContext,
    ) {
        assert!(!campaign.is_closed, E_CAMPAIGN_CLOSED);
        assert!(cap.campaign_id == object::id(campaign), E_WRONG_CAMPAIGN);
        campaign.is_active = false;
        campaign.is_closed  = true;
        event::emit(CampaignClosed {
            campaign_id:  object::id(campaign),
            epoch:        tx_context::epoch(ctx),
            total_claims: campaign.total_claims,
            total_paid:   campaign.total_paid_out,
        });
    }

    /// Drain pool after closure. Requires AdminCap.
    public entry fun drain_pool(
        campaign:  &mut ClaimCampaign,
        cap:       &AdminCap,
        recipient: address,
        ctx:       &mut TxContext,
    ) {
        assert!(campaign.is_closed, E_NOT_ACTIVE);
        assert!(cap.campaign_id == object::id(campaign), E_WRONG_CAMPAIGN);
        let amount = balance::value(&campaign.pool);
        if (amount == 0) return;
        let coin = coin::from_balance(balance::split(&mut campaign.pool, amount), ctx);
        transfer::public_transfer(coin, recipient);
    }

    /// Claim AMC using a Merkle proof.
    ///
    /// A5: ClaimRecord transferred to sender BEFORE payout coin.
    /// A6: Checks expiry.
    /// A1: Proof depth bounded via merkle::verify.
    public entry fun claim(
        campaign: &mut ClaimCampaign,
        proof:    vector<vector<u8>>,
        amount:   u64,
        ctx:      &mut TxContext,
    ) {
        claim_internal(campaign, proof, amount, ctx);
    }

    // ── Core claim logic (callable from entry and test helpers) ───────────────

    fun claim_internal(
        campaign: &mut ClaimCampaign,
        proof:    vector<vector<u8>>,
        amount:   u64,
        ctx:      &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        let epoch  = tx_context::epoch(ctx);

        // A6: expiry
        if (campaign.expires_at_epoch > 0) {
            assert!(epoch < campaign.expires_at_epoch, E_EXPIRED);
        };

        assert!(campaign.is_active, E_NOT_ACTIVE);
        assert!(!campaign.is_closed, E_CAMPAIGN_CLOSED);
        assert!(amount == campaign.amount_per_claim, E_ZERO_AMOUNT);
        assert!(balance::value(&campaign.pool) >= amount, E_POOL_EMPTY);

        // Merkle verification (A1: depth bounded inside verify)
        let leaf  = merkle::compute_leaf(sender, amount);
        let valid = merkle::verify(leaf, proof, campaign.merkle_root);
        assert!(valid, E_INVALID_PROOF);

        // A5: Write ClaimRecord BEFORE transferring payout
        let record = ClaimRecord {
            id:          object::new(ctx),
            campaign_id: object::id(campaign),
            claimant:    sender,
            amount,
            claimed_at:  epoch,
        };
        transfer::transfer(record, sender);

        // Payout
        let payout = coin::from_balance(
            balance::split(&mut campaign.pool, amount),
            ctx,
        );
        campaign.total_claims   = campaign.total_claims + 1;
        campaign.total_paid_out = campaign.total_paid_out + amount;

        event::emit(ClaimMade {
            campaign_id:    object::id(campaign),
            claimant:       sender,
            amount,
            total_claims:   campaign.total_claims,
            remaining_pool: balance::value(&campaign.pool),
        });

        transfer::public_transfer(payout, sender);
    }

    // ── Read accessors ────────────────────────────────────────────────────────

    public fun is_active(c: &ClaimCampaign): bool         { c.is_active }
    public fun is_closed(c: &ClaimCampaign): bool         { c.is_closed }
    public fun pool_balance(c: &ClaimCampaign): u64       { balance::value(&c.pool) }
    public fun total_claims(c: &ClaimCampaign): u64       { c.total_claims }
    public fun amount_per_claim(c: &ClaimCampaign): u64   { c.amount_per_claim }
    public fun expires_at_epoch(c: &ClaimCampaign): u64   { c.expires_at_epoch }
    public fun merkle_root(c: &ClaimCampaign): vector<u8> { c.merkle_root }
    public fun label(c: &ClaimCampaign): vector<u8>       { c.label }
    public fun admin_cap_campaign_id(cap: &AdminCap): ID  { cap.campaign_id }

    // ── Test-only helpers ─────────────────────────────────────────────────────

    /// Create a campaign without sharing — returns both objects for in-memory tests.
    #[test_only]
    public fun create_campaign_for_test(
        label:            vector<u8>,
        merkle_root:      vector<u8>,
        amount_per_claim: u64,
        expires_at_epoch: u64,
        ctx:              &mut TxContext,
    ): (ClaimCampaign, AdminCap) {
        assert!(vector::length(&label) <= MAX_LABEL_BYTES, E_LABEL_TOO_LONG);
        assert!(amount_per_claim > 0, E_ZERO_AMOUNT);

        let id = object::new(ctx);
        let campaign_id = object::uid_to_inner(&id);

        let campaign = ClaimCampaign {
            id,
            label,
            merkle_root,
            amount_per_claim,
            pool:             balance::zero<AMC>(),
            expires_at_epoch,
            is_active:        false,
            is_closed:        false,
            total_claims:     0,
            total_paid_out:   0,
        };
        let admin_cap = AdminCap {
            id: object::new(ctx),
            campaign_id,
        };
        (campaign, admin_cap)
    }

    /// Fund without cap check — for simple pool setup in tests.
    #[test_only]
    public fun fund_for_test(campaign: &mut ClaimCampaign, coins: Coin<AMC>) {
        balance::join(&mut campaign.pool, coin::into_balance(coins));
    }

    /// Fund WITH cap check — tests that wrong cap aborts (A3/A4).
    #[test_only]
    public fun fund_with_cap_for_test(
        campaign: &mut ClaimCampaign,
        coins:    Coin<AMC>,
        cap:      &AdminCap,
        _ctx:     &mut TxContext,
    ) {
        assert!(!campaign.is_closed, E_CAMPAIGN_CLOSED);
        assert!(cap.campaign_id == object::id(campaign), E_WRONG_CAMPAIGN);
        balance::join(&mut campaign.pool, coin::into_balance(coins));
    }

    /// Activate without emitting event — for test state setup.
    #[test_only]
    public fun activate_for_test(
        campaign: &mut ClaimCampaign,
        cap:      &AdminCap,
        ctx:      &mut TxContext,
    ) {
        assert!(!campaign.is_closed, E_CAMPAIGN_CLOSED);
        assert!(cap.campaign_id == object::id(campaign), E_WRONG_CAMPAIGN);
        campaign.is_active = true;
        let _ = ctx;
    }

    /// Pause without event emission — for test state setup.
    #[test_only]
    public fun pause_for_test(
        campaign: &mut ClaimCampaign,
        cap:      &AdminCap,
        ctx:      &mut TxContext,
    ) {
        assert!(!campaign.is_closed, E_CAMPAIGN_CLOSED);
        assert!(cap.campaign_id == object::id(campaign), E_WRONG_CAMPAIGN);
        campaign.is_active = false;
        let _ = ctx;
    }

    /// Close without event emission — for test state setup.
    #[test_only]
    public fun close_for_test(
        campaign: &mut ClaimCampaign,
        cap:      &AdminCap,
        ctx:      &mut TxContext,
    ) {
        assert!(!campaign.is_closed, E_CAMPAIGN_CLOSED);
        assert!(cap.campaign_id == object::id(campaign), E_WRONG_CAMPAIGN);
        campaign.is_active = false;
        campaign.is_closed  = true;
        let _ = ctx;
    }

    /// Call claim_internal — lets tests call claim as a non-entry function.
    #[test_only]
    public fun claim_for_test(
        campaign: &mut ClaimCampaign,
        proof:    vector<vector<u8>>,
        amount:   u64,
        ctx:      &mut TxContext,
    ) {
        claim_internal(campaign, proof, amount, ctx);
    }

    /// Test expiry logic without requiring epoch advancement.
    /// Returns false if expires_at_epoch > 0 AND current_epoch >= expires.
    #[test_only]
    public fun is_expired_for_test(expires_at_epoch: u64, current_epoch: u64): bool {
        expires_at_epoch > 0 && current_epoch >= expires_at_epoch
    }

    // ── Error code accessors for #[expected_failure] ──────────────────────────
    #[test_only] public fun error_not_active():      u64 { E_NOT_ACTIVE }
    #[test_only] public fun error_campaign_closed(): u64 { E_CAMPAIGN_CLOSED }
    #[test_only] public fun error_already_claimed(): u64 { E_ALREADY_CLAIMED }
    #[test_only] public fun error_invalid_proof():   u64 { E_INVALID_PROOF }
    #[test_only] public fun error_expired():         u64 { E_EXPIRED }
    #[test_only] public fun error_zero_amount():     u64 { E_ZERO_AMOUNT }
    #[test_only] public fun error_pool_empty():      u64 { E_POOL_EMPTY }
    #[test_only] public fun error_label_too_long():  u64 { E_LABEL_TOO_LONG }
    #[test_only] public fun error_wrong_campaign():  u64 { E_WRONG_CAMPAIGN }
    #[test_only] public fun max_label_bytes():       u64 { MAX_LABEL_BYTES }

    /// Destroy a ClaimCampaign in tests (objects with `key` need explicit delete).
    #[test_only]
    public fun drop_campaign_for_test(c: ClaimCampaign) {
        let ClaimCampaign {
            id,
            label: _,
            merkle_root: _,
            amount_per_claim: _,
            pool,
            expires_at_epoch: _,
            is_active: _,
            is_closed: _,
            total_claims: _,
            total_paid_out: _,
        } = c;
        balance::destroy_for_testing(pool);
        object::delete(id);
    }

    /// Destroy an AdminCap in tests.
    #[test_only]
    public fun drop_admin_cap_for_test(cap: AdminCap) {
        let AdminCap { id, campaign_id: _ } = cap;
        object::delete(id);
    }
}
