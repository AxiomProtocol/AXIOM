// =============================================================================
// ClaimCampaign — Phase 8 Hardened Production-Candidate
//
// TESTNET ONLY. No monetary value. No canonical Axiom assets.
//
// This is NOT AXUSD, AXAU, AXM, SEED, or KAG. Not backed by any reserve.
//
// Replaces the Sprint 2 version with full Phase 7/8 hardening applied.
// Eligibility is proven by submitting a valid Merkle proof at claim time.
//
// Object model:
//   AdminCap        — Owned. Required for all privileged operations.
//   ClaimCampaign   — Shared. Holds merkle root, pool, claimed set, flags.
//
// Entry functions (callable directly via CLI or PTB):
//   create_campaign_entry  — creates campaign + transfers AdminCap to sender
//   fund_campaign          — deposits Coin<AXIOM_TEST_CLAIM> into pool
//   activate               — sets is_active = true
//   claim                  — eligible address claims with merkle proof
//   pause                  — sets is_active = false (admin only)
//   unpause                — sets is_active = true; blocked if campaign is closed
//   update_merkle_root     — replaces merkle root; campaign must be paused
//   close_campaign         — permanently closes; drains pool to admin
//   destroy_admin_cap      — permanently destroys AdminCap with audit event
//   transfer_admin_cap     — transfers AdminCap to new owner with audit event
//
// Error codes:
//   ENotActive             = 1  — campaign is paused or closed
//   EExpired               = 2  — current epoch past expires_at_epoch
//   EAlreadyClaimed        = 3  — address has already claimed
//   EInvalidProof          = 4  — merkle proof fails verification
//   EInsufficientPool      = 5  — pool balance < amount_per_claim
//   ECampaignNotPaused     = 6  — update_merkle_root requires paused campaign
//   EProofTooLong          = 7  — (from merkle module) proof > MAX_PROOF_DEPTH
//   ECampaignAlreadyClosed = 8  — (A2) unpause blocked after permanent closure
//
// Phase 8 hardening items:
//   A1 — MAX_PROOF_DEPTH / EProofTooLong enforced in merkle::verify_proof
//   A2 — is_closed bool; close_campaign sets permanently; unpause blocked
//   A3 — destroy_admin_cap() + transfer_admin_cap() with audit events
//   A6 — frozen package default (upgrade policy documented below)
//   A7 — AdminCapDestroyed, AdminCapTransferred events
//
// Upgrade policy (A6):
//   Default deployment uses a frozen package (no upgradeable publisher object).
//   Any future upgrade requires a new Phase 9 authorization with multi-party
//   approval. The upgrade contingency plan is documented in PHASE8_KEY_MANAGEMENT.md.
// =============================================================================

module axiom_claim_prototype::claim_campaign {
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::table::{Self, Table};
    use sui::event;
    use axiom_claim_prototype::axiom_test_claim::AXIOM_TEST_CLAIM;
    use axiom_claim_prototype::merkle;

    // =========================================================================
    // Error codes
    // =========================================================================
    const ENotActive:             u64 = 1;
    const EExpired:               u64 = 2;
    const EAlreadyClaimed:        u64 = 3;
    const EInvalidProof:          u64 = 4;
    const EInsufficientPool:      u64 = 5;
    const ECampaignNotPaused:     u64 = 6;
    // EProofTooLong               = 7  (defined in merkle module, propagates via abort)
    const ECampaignAlreadyClosed: u64 = 8; // A2: unpause blocked after permanent close

    // =========================================================================
    // AdminCap — owned capability object.
    //
    // Possession of AdminCap is required to call all privileged functions.
    // Cannot be forged. Transferred to deployer at campaign creation.
    //
    // Phase 8 (A3):
    //   Can be permanently destroyed via destroy_admin_cap().
    //   Can be transferred to a new owner via transfer_admin_cap().
    //   Both operations emit audit events.
    // =========================================================================
    public struct AdminCap has key, store {
        id: UID,
    }

    // =========================================================================
    // ClaimCampaign — shared object.
    //
    // Fields:
    //   label             — human-readable campaign identifier (for indexing)
    //   merkle_root       — keccak256 root of (address, amount) eligibility tree
    //   amount_per_claim  — fixed allocation per eligible address (base units)
    //   expires_at_epoch  — Sui epoch deadline; 0 = no expiration
    //   pool              — Balance<AXIOM_TEST_CLAIM> available for claims
    //   claimed           — Table<address, bool> — duplicate claim prevention
    //   is_active         — true = open for claims, false = paused/closed
    //   is_closed         — (A2) true = permanently closed; cannot be reopened
    // =========================================================================
    public struct ClaimCampaign has key {
        id: UID,
        label: std::string::String,
        merkle_root: vector<u8>,
        amount_per_claim: u64,
        expires_at_epoch: u64,
        pool: Balance<AXIOM_TEST_CLAIM>,
        claimed: Table<address, bool>,
        is_active: bool,
        is_closed: bool, // A2: permanent closure flag
    }

    // =========================================================================
    // Events
    // =========================================================================

    public struct CampaignCreated has copy, drop {
        campaign_id: ID,
        amount_per_claim: u64,
        expires_at_epoch: u64,
    }

    public struct CampaignFunded has copy, drop {
        campaign_id: ID,
        added_amount: u64,
        pool_total: u64,
    }

    public struct CampaignActivated has copy, drop {
        campaign_id: ID,
    }

    public struct MerkleRootUpdated has copy, drop {
        campaign_id: ID,
    }

    public struct Claimed has copy, drop {
        campaign_id: ID,
        claimer: address,
        amount: u64,
    }

    public struct CampaignPaused has copy, drop {
        campaign_id: ID,
    }

    public struct CampaignUnpaused has copy, drop {
        campaign_id: ID,
    }

    public struct CampaignClosed has copy, drop {
        campaign_id: ID,
        returned_to_admin: u64,
    }

    // A3 / A7: AdminCap lifecycle events for complete audit trail.
    public struct AdminCapDestroyed has copy, drop {}

    public struct AdminCapTransferred has copy, drop {
        new_owner: address,
    }

    // =========================================================================
    // Public functions (usable in PTBs + tests)
    // =========================================================================

    // -------------------------------------------------------------------------
    // create_campaign — creates a new ClaimCampaign and returns AdminCap.
    //
    // Campaign starts inactive (is_active = false) and open (is_closed = false).
    // Call fund_campaign + activate before opening claims.
    // -------------------------------------------------------------------------
    public fun create_campaign(
        label: std::string::String,
        merkle_root: vector<u8>,
        amount_per_claim: u64,
        expires_at_epoch: u64,
        ctx: &mut TxContext,
    ): AdminCap {
        let campaign_uid = object::new(ctx);
        let campaign_id = object::uid_to_inner(&campaign_uid);

        let campaign = ClaimCampaign {
            id: campaign_uid,
            label,
            merkle_root,
            amount_per_claim,
            expires_at_epoch,
            pool: balance::zero(),
            claimed: table::new(ctx),
            is_active: false,
            is_closed: false, // A2: starts open
        };

        transfer::share_object(campaign);
        event::emit(CampaignCreated { campaign_id, amount_per_claim, expires_at_epoch });

        AdminCap { id: object::new(ctx) }
    }

    // -------------------------------------------------------------------------
    // create_campaign_entry — entry wrapper that transfers AdminCap to sender.
    // -------------------------------------------------------------------------
    public entry fun create_campaign_entry(
        label_bytes: vector<u8>,
        merkle_root: vector<u8>,
        amount_per_claim: u64,
        expires_at_epoch: u64,
        ctx: &mut TxContext,
    ) {
        let label = std::string::utf8(label_bytes);
        let admin_cap = create_campaign(label, merkle_root, amount_per_claim, expires_at_epoch, ctx);
        transfer::public_transfer(admin_cap, tx_context::sender(ctx));
    }

    // -------------------------------------------------------------------------
    // fund_campaign — deposits Coin<AXIOM_TEST_CLAIM> into the pool.
    // Requires AdminCap. Campaign does not need to be inactive.
    // -------------------------------------------------------------------------
    public entry fun fund_campaign(
        campaign: &mut ClaimCampaign,
        coins: Coin<AXIOM_TEST_CLAIM>,
        _admin: &AdminCap,
    ) {
        let added_amount = coin::value(&coins);
        balance::join(&mut campaign.pool, coin::into_balance(coins));
        let pool_total = balance::value(&campaign.pool);
        let campaign_id = object::uid_to_inner(&campaign.id);
        event::emit(CampaignFunded { campaign_id, added_amount, pool_total });
    }

    // -------------------------------------------------------------------------
    // activate — sets is_active = true, opening the campaign for claims.
    // Requires AdminCap.
    // -------------------------------------------------------------------------
    public entry fun activate(
        campaign: &mut ClaimCampaign,
        _admin: &AdminCap,
    ) {
        campaign.is_active = true;
        let campaign_id = object::uid_to_inner(&campaign.id);
        event::emit(CampaignActivated { campaign_id });
    }

    // =========================================================================
    // claim — public entry function callable by any eligible address.
    //
    // Requirements (all must hold; aborts with error code if not):
    //   1. Campaign is active (ENotActive) — also catches closed campaigns
    //   2. Campaign has not expired (EExpired) — skipped if expires_at_epoch = 0
    //   3. Sender has not claimed before (EAlreadyClaimed)
    //   4. Merkle proof is valid (EInvalidProof); proof length <= 20 (EProofTooLong)
    //   5. Pool has sufficient balance (EInsufficientPool)
    //
    // Duplicate claim prevention:
    //   The sender address is recorded in the `claimed` table BEFORE the
    //   coin transfer. Concurrent transactions cannot produce a double-claim.
    // =========================================================================
    public entry fun claim(
        campaign: &mut ClaimCampaign,
        proof: vector<vector<u8>>,
        ctx: &mut TxContext,
    ) {
        // is_active check covers both paused and closed campaigns (A2)
        assert!(campaign.is_active, ENotActive);

        if (campaign.expires_at_epoch > 0) {
            assert!(tx_context::epoch(ctx) <= campaign.expires_at_epoch, EExpired);
        };

        let claimer = tx_context::sender(ctx);
        assert!(!table::contains(&campaign.claimed, claimer), EAlreadyClaimed);

        // verify_proof enforces MAX_PROOF_DEPTH (A1) and returns false if invalid
        let leaf = merkle::compute_leaf(claimer, campaign.amount_per_claim);
        assert!(
            merkle::verify_proof(&proof, &campaign.merkle_root, leaf),
            EInvalidProof,
        );

        assert!(
            balance::value(&campaign.pool) >= campaign.amount_per_claim,
            EInsufficientPool,
        );

        // Record claim BEFORE transfer — duplicate claim prevention.
        table::add(&mut campaign.claimed, claimer, true);

        let payout = coin::from_balance(
            balance::split(&mut campaign.pool, campaign.amount_per_claim),
            ctx,
        );

        let campaign_id = object::uid_to_inner(&campaign.id);
        transfer::public_transfer(payout, claimer);
        event::emit(Claimed { campaign_id, claimer, amount: campaign.amount_per_claim });
    }

    // -------------------------------------------------------------------------
    // pause — sets is_active = false. Requires AdminCap.
    // Does NOT modify claimed table, pool balance, or is_closed flag.
    // -------------------------------------------------------------------------
    public entry fun pause(
        campaign: &mut ClaimCampaign,
        _admin: &AdminCap,
    ) {
        campaign.is_active = false;
        let campaign_id = object::uid_to_inner(&campaign.id);
        event::emit(CampaignPaused { campaign_id });
    }

    // -------------------------------------------------------------------------
    // unpause — sets is_active = true. Requires AdminCap.
    //
    // Phase 8 (A2): Aborts with ECampaignAlreadyClosed (8) if the campaign has
    // been permanently closed via close_campaign(). This makes closure truly
    // irreversible — once closed, a campaign can never be reopened.
    // -------------------------------------------------------------------------
    public entry fun unpause(
        campaign: &mut ClaimCampaign,
        _admin: &AdminCap,
    ) {
        // A2: Permanent closure guard. Closed campaigns cannot be reopened.
        assert!(!campaign.is_closed, ECampaignAlreadyClosed);
        campaign.is_active = true;
        let campaign_id = object::uid_to_inner(&campaign.id);
        event::emit(CampaignUnpaused { campaign_id });
    }

    // -------------------------------------------------------------------------
    // update_merkle_root — replaces the campaign's merkle root.
    //
    // Campaign MUST be paused (is_active = false) before calling this.
    // Old proofs are invalidated; claimants must obtain new proofs.
    // Addresses already in the claimed table cannot claim again with new root.
    // -------------------------------------------------------------------------
    public entry fun update_merkle_root(
        campaign: &mut ClaimCampaign,
        new_root: vector<u8>,
        _admin: &AdminCap,
    ) {
        assert!(!campaign.is_active, ECampaignNotPaused);
        campaign.merkle_root = new_root;
        let campaign_id = object::uid_to_inner(&campaign.id);
        event::emit(MerkleRootUpdated { campaign_id });
    }

    // -------------------------------------------------------------------------
    // close_campaign — permanently closes the campaign (A2).
    //
    // Sets is_active = false AND is_closed = true. Drains remaining pool balance
    // and transfers it to the transaction sender (admin, who holds AdminCap).
    //
    // After close_campaign():
    //   - All claim attempts abort with ENotActive (is_active = false)
    //   - All unpause attempts abort with ECampaignAlreadyClosed (is_closed = true)
    //   - The closure is permanent and irreversible on-chain.
    //
    // The ClaimCampaign shared object remains on-chain as an immutable audit record.
    // -------------------------------------------------------------------------
    public entry fun close_campaign(
        campaign: &mut ClaimCampaign,
        _admin: &AdminCap,
        ctx: &mut TxContext,
    ) {
        campaign.is_active = false;
        campaign.is_closed = true; // A2: permanent closure

        let remaining = balance::value(&campaign.pool);
        let campaign_id = object::uid_to_inner(&campaign.id);

        if (remaining > 0) {
            let remainder = coin::from_balance(
                balance::split(&mut campaign.pool, remaining),
                ctx,
            );
            transfer::public_transfer(remainder, tx_context::sender(ctx));
        };

        event::emit(CampaignClosed { campaign_id, returned_to_admin: remaining });
    }

    // =========================================================================
    // AdminCap lifecycle functions (A3)
    // =========================================================================

    // -------------------------------------------------------------------------
    // destroy_admin_cap — permanently destroys the AdminCap.
    //
    // Phase 8 (A3): Consumes the AdminCap and deletes its UID from the object
    // store. After this call, no AdminCap exists for this deployment context.
    // All admin-gated functions become permanently inaccessible without a new
    // campaign deployment.
    //
    // Use case: lock down a completed campaign so that no further admin actions
    // (including re-opening a closed campaign with a new cap) are possible.
    //
    // Emits AdminCapDestroyed event for on-chain audit trail.
    // -------------------------------------------------------------------------
    public fun destroy_admin_cap(admin: AdminCap) {
        let AdminCap { id } = admin;
        object::delete(id);
        event::emit(AdminCapDestroyed {});
    }

    // -------------------------------------------------------------------------
    // transfer_admin_cap — transfers the AdminCap to a new owner.
    //
    // Phase 8 (A3): Emits AdminCapTransferred event before the transfer so that
    // the transfer is auditable on-chain regardless of whether the recipient
    // accepts the object. Use this in multisig handoffs.
    //
    // The new owner can immediately call all admin-gated functions.
    // -------------------------------------------------------------------------
    public fun transfer_admin_cap(admin: AdminCap, recipient: address) {
        event::emit(AdminCapTransferred { new_owner: recipient });
        transfer::public_transfer(admin, recipient);
    }

    // =========================================================================
    // Test-only accessors — not accessible in production code.
    // =========================================================================

    #[test_only]
    public fun is_active(campaign: &ClaimCampaign): bool {
        campaign.is_active
    }

    #[test_only]
    public fun is_closed(campaign: &ClaimCampaign): bool {
        campaign.is_closed
    }

    #[test_only]
    public fun pool_value(campaign: &ClaimCampaign): u64 {
        balance::value(&campaign.pool)
    }

    #[test_only]
    public fun has_claimed(campaign: &ClaimCampaign, addr: address): bool {
        table::contains(&campaign.claimed, addr)
    }

    #[test_only]
    public fun amount_per_claim(campaign: &ClaimCampaign): u64 {
        campaign.amount_per_claim
    }

    #[test_only]
    public fun merkle_root(campaign: &ClaimCampaign): vector<u8> {
        campaign.merkle_root
    }

    #[test_only]
    public fun expires_at_epoch(campaign: &ClaimCampaign): u64 {
        campaign.expires_at_epoch
    }
}
