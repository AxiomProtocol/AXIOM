/// ClaimCampaign — Axiom Protocol community reward distribution via Merkle proofs.
///
/// Security hardening applied (A1–A7):
///   A1 – MAX_PROOF_DEPTH enforced on-chain (mirrors TypeScript constant 20)
///   A2 – Per-address replay protection via claimed Table<address, bool>
///   A3 – Active/closed state guards on all claim and state-change paths
///   A4 – AdminCap capability gates every admin entry function
///   A5 – Pool sufficiency check before transfer; GuardedTreasury in companion module
///   A6 – Epoch-based expiry respected before any claim is processed
///   A7 – Events emitted on every state transition for off-chain indexing
module axiom_sui::claim_campaign {
    use std::vector;
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::table::{Self, Table};
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::event;
    use axiom_sui::merkle;

    // ─── Error codes ──────────────────────────────────────────────────────────
    const E_CAMPAIGN_NOT_ACTIVE:     u64 = 1;
    const E_CAMPAIGN_CLOSED:         u64 = 2;
    const E_ALREADY_CLAIMED:         u64 = 3;
    const E_INVALID_PROOF:           u64 = 4;
    const E_CAMPAIGN_EXPIRED:        u64 = 5;
    const E_INSUFFICIENT_POOL:       u64 = 6;
    const E_PROOF_TOO_DEEP:          u64 = 7;
    const E_EMPTY_LABEL:             u64 = 8;
    const E_ZERO_AMOUNT:             u64 = 9;
    const E_CAMPAIGN_ALREADY_CLOSED: u64 = 10;
    const E_BAD_ROOT_LENGTH:         u64 = 11;

    // A1: On-chain proof depth cap — mirrors TypeScript MAX_PROOF_DEPTH = 20
    const MAX_PROOF_DEPTH: u64 = 20;

    // ─── Capability (Move 2024: public struct required) ───────────────────────
    /// A4: Owned capability required for all admin operations.
    public struct AdminCap has key { id: UID }

    // ─── Campaign object ──────────────────────────────────────────────────────
    /// Shared object — one per campaign.  Field names match TypeScript reader.
    public struct ClaimCampaign has key {
        id:               UID,
        label:            vector<u8>,
        merkle_root:      vector<u8>,
        amount_per_claim: u64,
        expires_at_epoch: u64,   // 0 = no expiry
        pool:             Balance<SUI>,
        is_active:        bool,
        is_closed:        bool,
        claimed:          Table<address, bool>,
    }

    // ─── Events (A7) — Move 2024: public struct required ─────────────────────
    public struct CampaignCreated has copy, drop {
        campaign_id:      ID,
        label:            vector<u8>,
        merkle_root:      vector<u8>,
        amount_per_claim: u64,
        expires_at_epoch: u64,
    }

    public struct CampaignFunded has copy, drop {
        campaign_id: ID,
        deposited:   u64,
        pool_total:  u64,
    }

    public struct CampaignActivated  has copy, drop { campaign_id: ID }
    public struct CampaignPaused     has copy, drop { campaign_id: ID }
    public struct CampaignClosed     has copy, drop { campaign_id: ID, swept_balance: u64 }
    public struct MerkleRootUpdated  has copy, drop { campaign_id: ID, new_root: vector<u8> }

    public struct TokenClaimed has copy, drop {
        campaign_id: ID,
        claimant:    address,
        amount:      u64,
    }

    // ─── Module initializer ───────────────────────────────────────────────────
    fun init(ctx: &mut TxContext) {
        transfer::transfer(AdminCap { id: object::new(ctx) }, tx_context::sender(ctx));
    }

    // ─── Admin: create ────────────────────────────────────────────────────────
    public entry fun create_campaign_entry(
        _:                &AdminCap,
        label:            vector<u8>,
        merkle_root:      vector<u8>,
        amount_per_claim: u64,
        expires_at_epoch: u64,
        ctx:              &mut TxContext,
    ) {
        assert!(!vector::is_empty(&label), E_EMPTY_LABEL);
        assert!(amount_per_claim > 0, E_ZERO_AMOUNT);
        assert!(vector::length(&merkle_root) == 32, E_BAD_ROOT_LENGTH);

        let uid = object::new(ctx);
        let campaign_id = object::uid_to_inner(&uid);

        event::emit(CampaignCreated {
            campaign_id,
            label,
            merkle_root,
            amount_per_claim,
            expires_at_epoch,
        });

        let campaign = ClaimCampaign {
            id:               uid,
            label,
            merkle_root,
            amount_per_claim,
            expires_at_epoch,
            pool:             balance::zero(),
            is_active:        false,
            is_closed:        false,
            claimed:          table::new(ctx),
        };
        transfer::share_object(campaign);
    }

    // ─── Admin: fund ──────────────────────────────────────────────────────────
    public entry fun fund_campaign(
        _:        &AdminCap,
        campaign: &mut ClaimCampaign,
        payment:  Coin<SUI>,
        _ctx:     &mut TxContext,
    ) {
        assert!(!campaign.is_closed, E_CAMPAIGN_CLOSED);
        let deposited = coin::value(&payment);
        balance::join(&mut campaign.pool, coin::into_balance(payment));
        event::emit(CampaignFunded {
            campaign_id: object::uid_to_inner(&campaign.id),
            deposited,
            pool_total: balance::value(&campaign.pool),
        });
    }

    // ─── Admin: lifecycle ─────────────────────────────────────────────────────
    public entry fun activate(
        _:        &AdminCap,
        campaign: &mut ClaimCampaign,
        _ctx:     &mut TxContext,
    ) {
        assert!(!campaign.is_closed, E_CAMPAIGN_CLOSED);
        campaign.is_active = true;
        event::emit(CampaignActivated { campaign_id: object::uid_to_inner(&campaign.id) });
    }

    public entry fun pause(
        _:        &AdminCap,
        campaign: &mut ClaimCampaign,
        _ctx:     &mut TxContext,
    ) {
        campaign.is_active = false;
        event::emit(CampaignPaused { campaign_id: object::uid_to_inner(&campaign.id) });
    }

    public entry fun unpause(
        _:        &AdminCap,
        campaign: &mut ClaimCampaign,
        _ctx:     &mut TxContext,
    ) {
        assert!(!campaign.is_closed, E_CAMPAIGN_CLOSED);
        campaign.is_active = true;
        event::emit(CampaignActivated { campaign_id: object::uid_to_inner(&campaign.id) });
    }

    public entry fun update_merkle_root(
        _:        &AdminCap,
        campaign: &mut ClaimCampaign,
        new_root: vector<u8>,
        _ctx:     &mut TxContext,
    ) {
        assert!(!campaign.is_closed, E_CAMPAIGN_CLOSED);
        assert!(vector::length(&new_root) == 32, E_BAD_ROOT_LENGTH);
        campaign.merkle_root = new_root;
        event::emit(MerkleRootUpdated {
            campaign_id: object::uid_to_inner(&campaign.id),
            new_root,
        });
    }

    public entry fun close_campaign(
        _:         &AdminCap,
        campaign:  &mut ClaimCampaign,
        recipient: address,
        ctx:       &mut TxContext,
    ) {
        assert!(!campaign.is_closed, E_CAMPAIGN_ALREADY_CLOSED);
        campaign.is_active = false;
        campaign.is_closed = true;

        let swept_balance = balance::value(&campaign.pool);
        if (swept_balance > 0) {
            let remaining = coin::from_balance(
                balance::split(&mut campaign.pool, swept_balance),
                ctx,
            );
            transfer::public_transfer(remaining, recipient);
        };

        event::emit(CampaignClosed {
            campaign_id: object::uid_to_inner(&campaign.id),
            swept_balance,
        });
    }

    public entry fun destroy_admin_cap(cap: AdminCap) {
        let AdminCap { id } = cap;
        object::delete(id);
    }

    public entry fun transfer_admin_cap(cap: AdminCap, recipient: address) {
        transfer::transfer(cap, recipient);
    }

    // ─── Public: claim ────────────────────────────────────────────────────────
    public entry fun claim(
        campaign: &mut ClaimCampaign,
        proof:    vector<vector<u8>>,
        ctx:      &mut TxContext,
    ) {
        // A3 — closed check first (more specific), then active check
        assert!(!campaign.is_closed, E_CAMPAIGN_CLOSED);
        assert!(campaign.is_active, E_CAMPAIGN_NOT_ACTIVE);

        // A6 — epoch expiry
        let epoch = tx_context::epoch(ctx);
        if (campaign.expires_at_epoch > 0) {
            assert!(epoch <= campaign.expires_at_epoch, E_CAMPAIGN_EXPIRED);
        };

        let claimant = tx_context::sender(ctx);

        // A2 — replay protection
        assert!(!table::contains(&campaign.claimed, claimant), E_ALREADY_CLAIMED);

        // A1 — proof depth guard (double-checked; merkle module also enforces it)
        assert!(vector::length(&proof) <= MAX_PROOF_DEPTH, E_PROOF_TOO_DEEP);

        // Verify Merkle proof
        let leaf = merkle::compute_leaf(claimant, campaign.amount_per_claim);
        assert!(
            merkle::verify_proof(&proof, &campaign.merkle_root, leaf),
            E_INVALID_PROOF,
        );

        // A5 — pool sufficiency
        assert!(
            balance::value(&campaign.pool) >= campaign.amount_per_claim,
            E_INSUFFICIENT_POOL,
        );

        // CEI: mark claimed before transferring
        table::add(&mut campaign.claimed, claimant, true);

        let reward = coin::from_balance(
            balance::split(&mut campaign.pool, campaign.amount_per_claim),
            ctx,
        );
        transfer::public_transfer(reward, claimant);

        // A7 — emit event
        event::emit(TokenClaimed {
            campaign_id: object::uid_to_inner(&campaign.id),
            claimant,
            amount: campaign.amount_per_claim,
        });
    }

    // ─── Read-only helpers ────────────────────────────────────────────────────
    public fun pool_balance(campaign: &ClaimCampaign): u64 {
        balance::value(&campaign.pool)
    }

    public fun has_claimed(campaign: &ClaimCampaign, addr: address): bool {
        table::contains(&campaign.claimed, addr)
    }

    public fun is_active(campaign: &ClaimCampaign): bool  { campaign.is_active }
    public fun is_closed(campaign: &ClaimCampaign): bool  { campaign.is_closed }
    public fun amount_per_claim(campaign: &ClaimCampaign): u64 { campaign.amount_per_claim }

    // ─── Test-only helpers ────────────────────────────────────────────────────
    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) { init(ctx) }

    #[test_only]
    public fun max_proof_depth_for_testing(): u64 { MAX_PROOF_DEPTH }
}
