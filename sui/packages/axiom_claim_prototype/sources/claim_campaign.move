// =============================================================================
// ClaimCampaign — Sprint 2 merkle root variant
//
// TESTNET ONLY. No monetary value. No canonical Axiom assets.
//
// Replaces the Sprint 1 allowlist with a keccak256 Merkle root commitment.
// Eligibility is proven by submitting a valid Merkle proof at claim time.
// This is the production-ready pattern for Phase 7+.
//
// Object model:
//   AdminCap        — Owned. Required for all privileged operations.
//   ClaimCampaign   — Shared. Holds merkle root, pool, claimed set, active flag.
//
// Entry functions (callable directly via CLI or PTB):
//   create_campaign_entry  — creates campaign + transfers AdminCap to sender
//   fund_campaign          — deposits Coin<AXIOM_TEST_CLAIM> into pool
//   activate               — sets is_active = true
//   claim                  — eligible address claims with merkle proof
//   pause                  — sets is_active = false (admin only)
//   unpause                — sets is_active = true (admin only)
//   update_merkle_root     — replaces merkle root; campaign must be paused
//   close_campaign         — deactivates + drains remaining pool to admin
//
// Error codes (Sprint 2):
//   ENotActive         = 1  — campaign is paused or closed
//   EExpired           = 2  — current epoch past expires_at_epoch
//   EAlreadyClaimed    = 3  — address has already claimed
//   EInvalidProof      = 4  — merkle proof fails verification
//   EInsufficientPool  = 5  — pool balance < amount_per_claim
//   ECampaignNotPaused = 6  — update_merkle_root requires campaign to be paused
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
    const ENotActive:         u64 = 1;
    const EExpired:           u64 = 2;
    const EAlreadyClaimed:    u64 = 3;
    const EInvalidProof:      u64 = 4;
    const EInsufficientPool:  u64 = 5;
    const ECampaignNotPaused: u64 = 6;

    // =========================================================================
    // AdminCap — owned capability object.
    //
    // Possession of AdminCap is required to call all privileged functions.
    // Cannot be forged. Transferred to deployer at campaign creation.
    // Can be transferred to a new admin via transfer::public_transfer.
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

    // =========================================================================
    // Public functions (usable in PTBs + tests)
    // =========================================================================

    // -------------------------------------------------------------------------
    // create_campaign — creates a new ClaimCampaign and returns AdminCap.
    //
    // Campaign starts inactive (is_active = false).
    // Call fund_campaign + activate before opening claims.
    // Callable from a PTB; return value (AdminCap) is kept by the PTB caller.
    //
    // Parameters:
    //   label            — human-readable name (UTF-8 string bytes)
    //   merkle_root      — keccak256 merkle root of eligibility tree
    //   amount_per_claim — fixed claim amount in base units
    //   expires_at_epoch — Sui epoch deadline; 0 = never expires
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
        };

        transfer::share_object(campaign);
        event::emit(CampaignCreated { campaign_id, amount_per_claim, expires_at_epoch });

        AdminCap { id: object::new(ctx) }
    }

    // -------------------------------------------------------------------------
    // create_campaign_entry — entry wrapper that transfers AdminCap to sender.
    // Use this when calling via CLI (sui client call).
    //
    // label_bytes: raw UTF-8 bytes for the campaign label.
    // Entry functions cannot take String directly; bytes are converted inside.
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
    //   1. Campaign is active (ENotActive)
    //   2. Campaign has not expired (EExpired) — skipped if expires_at_epoch = 0
    //   3. Sender has not claimed before (EAlreadyClaimed)
    //   4. Merkle proof is valid for (sender, amount_per_claim) (EInvalidProof)
    //   5. Pool has sufficient balance (EInsufficientPool)
    //
    // Duplicate claim prevention:
    //   The sender address is recorded in the `claimed` table BEFORE the
    //   coin transfer. This ensures concurrent transactions cannot produce
    //   a double-claim.
    //
    // Merkle proof structure:
    //   proof — vector of sibling hashes from leaf to root (bottom-up).
    //   For a single-address tree (leaf == root), proof is empty.
    // =========================================================================
    public entry fun claim(
        campaign: &mut ClaimCampaign,
        proof: vector<vector<u8>>,
        ctx: &mut TxContext,
    ) {
        assert!(campaign.is_active, ENotActive);

        // Expiration check (skip if expires_at_epoch = 0)
        if (campaign.expires_at_epoch > 0) {
            assert!(tx_context::epoch(ctx) <= campaign.expires_at_epoch, EExpired);
        };

        let claimer = tx_context::sender(ctx);
        assert!(!table::contains(&campaign.claimed, claimer), EAlreadyClaimed);

        // Verify merkle proof for (claimer, amount_per_claim)
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
    // Does NOT modify claimed table or pool balance.
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
    // -------------------------------------------------------------------------
    public entry fun unpause(
        campaign: &mut ClaimCampaign,
        _admin: &AdminCap,
    ) {
        campaign.is_active = true;
        let campaign_id = object::uid_to_inner(&campaign.id);
        event::emit(CampaignUnpaused { campaign_id });
    }

    // -------------------------------------------------------------------------
    // update_merkle_root — replaces the campaign's merkle root.
    //
    // Campaign MUST be paused (is_active = false) before calling this.
    // This prevents claims from being validated against a stale root while
    // the update is in flight.
    //
    // Use case: expand or replace the eligibility set.
    // Old proofs are invalidated; claimants must obtain new proofs.
    //
    // Note: Addresses that already claimed (in the `claimed` table) remain
    // recorded. They cannot claim again even with a new root.
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
    // close_campaign — permanently closes the campaign.
    //
    // Sets is_active = false. Drains remaining pool balance and transfers
    // it to the transaction sender (admin, who holds AdminCap).
    // After close, all claim attempts abort with ENotActive.
    //
    // Note: The ClaimCampaign shared object remains on-chain (Sui shared
    // objects cannot be deleted in Sprint 2). The is_active = false flag
    // is the permanent guard against further claims.
    // -------------------------------------------------------------------------
    public entry fun close_campaign(
        campaign: &mut ClaimCampaign,
        _admin: &AdminCap,
        ctx: &mut TxContext,
    ) {
        campaign.is_active = false;

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
    // Test-only accessors — not accessible in production code.
    // =========================================================================

    #[test_only]
    public fun is_active(campaign: &ClaimCampaign): bool {
        campaign.is_active
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
