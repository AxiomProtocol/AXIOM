// =============================================================================
// ClaimCampaign — Phase 9 Mainnet Release Candidate
//
// COMMUNITY REWARDS LAYER — NON-FINANCIAL
// No monetary value. Not AXUSD, AXAU, AXM, SEED, or KAG.
// Not backed by any reserve. Not redeemable for any canonical asset.
//
// All Phase 8 hardening items (A1-A7) carried forward to production.
//
// Error codes:
//   ENotActive             = 1
//   EExpired               = 2
//   EAlreadyClaimed        = 3
//   EInvalidProof          = 4
//   EInsufficientPool      = 5
//   ECampaignNotPaused     = 6
//   EProofTooLong          = 7  (merkle module)
//   ECampaignAlreadyClosed = 8
//
// Upgrade policy:
//   Frozen package — no UpgradeCap retained.
//   Any upgrade requires new multi-party Phase 10 authorization.
// =============================================================================

module axiom_claim_mainnet_candidate::claim_campaign {
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::table::{Self, Table};
    use sui::event;
    use axiom_claim_mainnet_candidate::axiom_mainnet_claim::AXIOM_MAINNET_CLAIM;
    use axiom_claim_mainnet_candidate::merkle;

    const ENotActive:             u64 = 1;
    const EExpired:               u64 = 2;
    const EAlreadyClaimed:        u64 = 3;
    const EInvalidProof:          u64 = 4;
    const EInsufficientPool:      u64 = 5;
    const ECampaignNotPaused:     u64 = 6;
    const ECampaignAlreadyClosed: u64 = 8;

    public struct AdminCap has key, store { id: UID }

    public struct ClaimCampaign has key {
        id: UID,
        label: std::string::String,
        merkle_root: vector<u8>,
        amount_per_claim: u64,
        expires_at_epoch: u64,
        pool: Balance<AXIOM_MAINNET_CLAIM>,
        claimed: Table<address, bool>,
        is_active: bool,
        is_closed: bool,
    }

    // Events
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
    public struct CampaignActivated has copy, drop { campaign_id: ID }
    public struct MerkleRootUpdated has copy, drop { campaign_id: ID }
    public struct Claimed has copy, drop {
        campaign_id: ID,
        claimer: address,
        amount: u64,
    }
    public struct CampaignPaused has copy, drop { campaign_id: ID }
    public struct CampaignUnpaused has copy, drop { campaign_id: ID }
    public struct CampaignClosed has copy, drop {
        campaign_id: ID,
        returned_to_admin: u64,
    }
    public struct AdminCapDestroyed has copy, drop {}
    public struct AdminCapTransferred has copy, drop { new_owner: address }

    // =========================================================================
    // Public functions
    // =========================================================================

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
            is_closed: false,
        };
        transfer::share_object(campaign);
        event::emit(CampaignCreated { campaign_id, amount_per_claim, expires_at_epoch });
        AdminCap { id: object::new(ctx) }
    }

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

    public entry fun fund_campaign(
        campaign: &mut ClaimCampaign,
        coins: Coin<AXIOM_MAINNET_CLAIM>,
        _admin: &AdminCap,
    ) {
        let added_amount = coin::value(&coins);
        balance::join(&mut campaign.pool, coin::into_balance(coins));
        let pool_total = balance::value(&campaign.pool);
        let campaign_id = object::uid_to_inner(&campaign.id);
        event::emit(CampaignFunded { campaign_id, added_amount, pool_total });
    }

    public entry fun activate(campaign: &mut ClaimCampaign, _admin: &AdminCap) {
        campaign.is_active = true;
        let campaign_id = object::uid_to_inner(&campaign.id);
        event::emit(CampaignActivated { campaign_id });
    }

    public entry fun claim(
        campaign: &mut ClaimCampaign,
        proof: vector<vector<u8>>,
        ctx: &mut TxContext,
    ) {
        assert!(campaign.is_active, ENotActive);
        if (campaign.expires_at_epoch > 0) {
            assert!(tx_context::epoch(ctx) <= campaign.expires_at_epoch, EExpired);
        };
        let claimer = tx_context::sender(ctx);
        assert!(!table::contains(&campaign.claimed, claimer), EAlreadyClaimed);
        let leaf = merkle::compute_leaf(claimer, campaign.amount_per_claim);
        assert!(merkle::verify_proof(&proof, &campaign.merkle_root, leaf), EInvalidProof);
        assert!(balance::value(&campaign.pool) >= campaign.amount_per_claim, EInsufficientPool);
        table::add(&mut campaign.claimed, claimer, true);
        let payout = coin::from_balance(
            balance::split(&mut campaign.pool, campaign.amount_per_claim),
            ctx,
        );
        let campaign_id = object::uid_to_inner(&campaign.id);
        transfer::public_transfer(payout, claimer);
        event::emit(Claimed { campaign_id, claimer, amount: campaign.amount_per_claim });
    }

    public entry fun pause(campaign: &mut ClaimCampaign, _admin: &AdminCap) {
        campaign.is_active = false;
        let campaign_id = object::uid_to_inner(&campaign.id);
        event::emit(CampaignPaused { campaign_id });
    }

    public entry fun unpause(campaign: &mut ClaimCampaign, _admin: &AdminCap) {
        assert!(!campaign.is_closed, ECampaignAlreadyClosed);
        campaign.is_active = true;
        let campaign_id = object::uid_to_inner(&campaign.id);
        event::emit(CampaignUnpaused { campaign_id });
    }

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

    public entry fun close_campaign(
        campaign: &mut ClaimCampaign,
        _admin: &AdminCap,
        ctx: &mut TxContext,
    ) {
        campaign.is_active = false;
        campaign.is_closed = true;
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

    public fun destroy_admin_cap(admin: AdminCap) {
        let AdminCap { id } = admin;
        object::delete(id);
        event::emit(AdminCapDestroyed {});
    }

    public fun transfer_admin_cap(admin: AdminCap, recipient: address) {
        event::emit(AdminCapTransferred { new_owner: recipient });
        transfer::public_transfer(admin, recipient);
    }

    // Test-only accessors
    #[test_only] public fun is_active(c: &ClaimCampaign): bool { c.is_active }
    #[test_only] public fun is_closed(c: &ClaimCampaign): bool { c.is_closed }
    #[test_only] public fun pool_value(c: &ClaimCampaign): u64 { balance::value(&c.pool) }
    #[test_only] public fun has_claimed(c: &ClaimCampaign, a: address): bool { table::contains(&c.claimed, a) }
    #[test_only] public fun amount_per_claim(c: &ClaimCampaign): u64 { c.amount_per_claim }
    #[test_only] public fun merkle_root(c: &ClaimCampaign): vector<u8> { c.merkle_root }
    #[test_only] public fun expires_at_epoch(c: &ClaimCampaign): u64 { c.expires_at_epoch }
}
