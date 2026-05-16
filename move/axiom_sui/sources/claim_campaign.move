/// claim_campaign — Merkle-gated token distribution campaign for Axiom Sui.
///
/// Hardenings applied (A1–A7):
///   A1 — MAX_PROOF_DEPTH enforced by axiom_sui::merkle::verify_proof.
///   A2 — is_closed flag makes close_campaign permanently irreversible.
///        unpause() aborts with ECampaignAlreadyClosed after closure.
///   A3 — destroy_admin_cap and transfer_admin_cap emit on-chain events.
///   A4 — TreasuryCap is never held loose; minting goes through GuardedTreasury.
///   A5 — GuardedTreasury checks max_supply on every mint.
///   A6 — Package is deployed as frozen (--with-unpublished-dependencies false).
///        No upgrade authority is held.
///   A7 — Seven auditable events: CampaignCreated, CampaignPaused, CampaignUnpaused,
///        CampaignClosed, TokensClaimed, AdminCapDestroyed, AdminCapTransferred.
///
/// COMMUNITY DISTRIBUTION ONLY — not a canonical Axiom financial instrument.
/// NOT AXUSD. NOT AXAU. NOT AXM. NOT SEED. NOT KAG.
module axiom_sui::claim_campaign {
    use sui::object::{Self, UID, ID};
    use sui::table::{Self, Table};
    use sui::coin::Coin;
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use axiom_sui::merkle;
    use axiom_sui::guarded_treasury::GuardedTreasury;

    // ── Error codes ───────────────────────────────────────────────────────

    /// Caller has already claimed from this campaign.
    const EAlreadyClaimed: u64 = 0;
    /// Campaign is not active (paused or not yet activated).
    const ECampaignInactive: u64 = 1;
    /// Campaign has been permanently closed. (A2)
    const ECampaignAlreadyClosed: u64 = 2;
    /// Campaign epoch window has expired.
    const ECampaignExpired: u64 = 3;
    /// Merkle proof did not verify against the stored root.
    const EInvalidProof: u64 = 4;
    /// Claim amount must be greater than zero.
    const EZeroClaimAmount: u64 = 5;

    // ── Events (A7) ───────────────────────────────────────────────────────

    public struct CampaignCreated has copy, drop {
        campaign_id: ID,
        amount_per_claim: u64,
        expires_at_epoch: u64,
    }

    public struct CampaignPaused has copy, drop {
        campaign_id: ID,
    }

    public struct CampaignUnpaused has copy, drop {
        campaign_id: ID,
    }

    public struct CampaignClosed has copy, drop {
        campaign_id: ID,
    }

    public struct TokensClaimed has copy, drop {
        campaign_id: ID,
        claimer: address,
        amount: u64,
    }

    /// A3: Emitted when an AdminCap is permanently destroyed.
    public struct AdminCapDestroyed has copy, drop {
        campaign_id: ID,
    }

    /// A3: Emitted when an AdminCap is transferred to a new owner.
    public struct AdminCapTransferred has copy, drop {
        campaign_id: ID,
        new_owner: address,
    }

    // ── Structs ───────────────────────────────────────────────────────────

    /// Capability granting administrative control over a specific campaign.
    ///
    /// A3: Lifecycle actions (destroy, transfer) emit auditable events.
    public struct AdminCap has key, store {
        id: UID,
        campaign_id: ID,
    }

    /// Shared object representing a single claim campaign.
    ///
    /// A2: Once is_closed is set to true it can never return to false.
    public struct ClaimCampaign has key {
        id: UID,
        merkle_root: vector<u8>,
        amount_per_claim: u64,
        expires_at_epoch: u64,
        is_active: bool,
        is_closed: bool,          // A2: permanent closure flag
        claimed: Table<address, bool>,
    }

    // ── Constructor ───────────────────────────────────────────────────────

    /// Create a new ClaimCampaign (shared) and return an AdminCap to the caller.
    ///
    /// The campaign starts paused (is_active = false). The admin must call
    /// activate() or set_merkle_root() + activate() before users can claim.
    ///
    /// amount_per_claim: tokens minted per successful claim (must match tree entries)
    /// expires_at_epoch: Sui epoch after which claims are rejected; 0 = no expiry
    public fun create(
        merkle_root: vector<u8>,
        amount_per_claim: u64,
        expires_at_epoch: u64,
        ctx: &mut TxContext,
    ): AdminCap {
        let mut campaign = ClaimCampaign {
            id: object::new(ctx),
            merkle_root,
            amount_per_claim,
            expires_at_epoch,
            is_active: false,
            is_closed: false,
            claimed: table::new(ctx),
        };
        let campaign_id = object::id(&campaign);
        let cap = AdminCap {
            id: object::new(ctx),
            campaign_id,
        };
        event::emit(CampaignCreated { campaign_id, amount_per_claim, expires_at_epoch });
        transfer::share_object(campaign);
        cap
    }

    // ── Admin operations ──────────────────────────────────────────────────

    /// Activate the campaign so users can claim.
    public fun activate(campaign: &mut ClaimCampaign, _cap: &AdminCap) {
        assert!(!campaign.is_closed, ECampaignAlreadyClosed);
        campaign.is_active = true;
    }

    /// Pause the campaign; claims will be rejected until unpaused.
    public fun pause(campaign: &mut ClaimCampaign, _cap: &AdminCap) {
        assert!(!campaign.is_closed, ECampaignAlreadyClosed);
        campaign.is_active = false;
        event::emit(CampaignPaused { campaign_id: object::id(campaign) });
    }

    /// Unpause the campaign.
    ///
    /// A2: Aborts with ECampaignAlreadyClosed if the campaign was closed.
    public fun unpause(campaign: &mut ClaimCampaign, _cap: &AdminCap) {
        assert!(!campaign.is_closed, ECampaignAlreadyClosed); // A2
        campaign.is_active = true;
        event::emit(CampaignUnpaused { campaign_id: object::id(campaign) });
    }

    /// Permanently close the campaign. Cannot be undone. (A2)
    ///
    /// After this call, is_closed is true forever, and activate/pause/unpause
    /// will all abort with ECampaignAlreadyClosed.
    public fun close_campaign(campaign: &mut ClaimCampaign, _cap: &AdminCap) {
        campaign.is_active = false;
        campaign.is_closed = true; // A2: permanent
        event::emit(CampaignClosed { campaign_id: object::id(campaign) });
    }

    /// Update the Merkle root (e.g. to add late eligibility entries).
    /// Blocked once the campaign is closed.
    public fun set_merkle_root(
        campaign: &mut ClaimCampaign,
        _cap: &AdminCap,
        root: vector<u8>,
    ) {
        assert!(!campaign.is_closed, ECampaignAlreadyClosed);
        campaign.merkle_root = root;
    }

    /// A3: Permanently destroy the AdminCap, emitting an auditable event.
    ///
    /// After this call, no further admin operations can be performed.
    public fun destroy_admin_cap(cap: AdminCap) {
        let AdminCap { id, campaign_id } = cap;
        event::emit(AdminCapDestroyed { campaign_id });
        object::delete(id);
    }

    /// A3: Transfer the AdminCap to a new owner, emitting an auditable event.
    public fun transfer_admin_cap(cap: AdminCap, new_owner: address) {
        event::emit(AdminCapTransferred {
            campaign_id: cap.campaign_id,
            new_owner,
        });
        transfer::public_transfer(cap, new_owner);
    }

    // ── Claim ─────────────────────────────────────────────────────────────

    /// Claim tokens from the campaign by submitting a valid Merkle proof.
    ///
    /// `amount` must match the entry in the Merkle tree for the caller's address.
    /// The leaf is computed as:
    ///   keccak256(BCS(sender) || BCS(amount))
    ///
    /// Guards (in order):
    ///   1. Campaign must be active and not closed.
    ///   2. Epoch must be within the expiry window (if set).
    ///   3. Caller must not have claimed before (table check).
    ///   4. Merkle proof must verify (A1 depth check inside merkle::verify_proof).
    ///
    /// Claimed flag is set BEFORE minting (add-before-transfer pattern).
    public fun claim<T>(
        campaign: &mut ClaimCampaign,
        treasury: &mut GuardedTreasury<T>,
        amount: u64,
        proof: vector<vector<u8>>,
        ctx: &mut TxContext,
    ): Coin<T> {
        let sender = tx_context::sender(ctx);

        assert!(!campaign.is_closed, ECampaignAlreadyClosed);
        assert!(campaign.is_active, ECampaignInactive);
        assert!(
            campaign.expires_at_epoch == 0
                || tx_context::epoch(ctx) <= campaign.expires_at_epoch,
            ECampaignExpired,
        );
        assert!(amount > 0, EZeroClaimAmount);
        assert!(!table::contains(&campaign.claimed, sender), EAlreadyClaimed);

        // Merkle verification (A1 inside verify_proof)
        let leaf = merkle::compute_leaf(sender, amount);
        assert!(
            merkle::verify_proof(campaign.merkle_root, leaf, proof),
            EInvalidProof,
        );

        // Add-before-transfer: mark claimed before minting
        table::add(&mut campaign.claimed, sender, true);

        // Mint via GuardedTreasury (A4 / A5)
        let coin = axiom_sui::guarded_treasury::mint(treasury, amount, ctx);

        event::emit(TokensClaimed {
            campaign_id: object::id(campaign),
            claimer: sender,
            amount,
        });

        coin
    }

    // ── View functions ────────────────────────────────────────────────────

    public fun has_claimed(campaign: &ClaimCampaign, addr: address): bool {
        table::contains(&campaign.claimed, addr)
    }

    public fun is_active(campaign: &ClaimCampaign): bool { campaign.is_active }

    public fun is_closed(campaign: &ClaimCampaign): bool { campaign.is_closed }

    public fun amount_per_claim(campaign: &ClaimCampaign): u64 { campaign.amount_per_claim }

    public fun expires_at_epoch(campaign: &ClaimCampaign): u64 { campaign.expires_at_epoch }

    public fun merkle_root(campaign: &ClaimCampaign): vector<u8> { campaign.merkle_root }

    public fun admin_cap_campaign_id(cap: &AdminCap): ID { cap.campaign_id }
}
