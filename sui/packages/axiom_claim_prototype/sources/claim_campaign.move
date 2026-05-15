// =============================================================================
// ClaimCampaign — Sprint 1 allowlist variant
//
// TESTNET ONLY. No monetary value. No canonical Axiom assets.
// No merkle proof in Sprint 1 — eligibility via simple allowlist table.
// Sprint 2 will replace the allowlist with a merkle root commitment.
//
// Object model:
//   AdminCap        — Owned. Required for all privileged operations.
//   ClaimCampaign   — Shared. Holds pool, allowlist, claimed set, active flag.
//
// Entry functions (callable directly via CLI or PTB):
//   create_campaign_entry  — creates campaign + transfers AdminCap to sender
//   fund_campaign          — deposits Coin<AXIOM_TEST_CLAIM> into pool
//   add_to_allowlist       — adds an address to the eligibility list
//   remove_from_allowlist  — removes an address from the eligibility list
//   activate               — sets is_active = true
//   claim                  — eligible address claims their allocation
//   pause                  — sets is_active = false (admin only)
//   unpause                — sets is_active = true (admin only)
//   close_campaign         — deactivates + drains remaining pool to admin
//
// Error codes:
//   ENotActive        = 0  — campaign is paused or closed
//   EAlreadyClaimed   = 1  — address has already claimed
//   ENotEligible      = 2  — address not in allowlist
//   EInsufficientPool = 3  — pool balance < amount_per_claim
//   ECampaignActive   = 4  — operation requires campaign to be inactive
// =============================================================================

module axiom_claim_prototype::claim_campaign {
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::balance::{Self, Balance};
    use sui::table::{Self, Table};
    use sui::event;
    use axiom_claim_prototype::axiom_test_claim::AXIOM_TEST_CLAIM;

    // =========================================================================
    // Error codes
    // =========================================================================
    const ENotActive:        u64 = 0;
    const EAlreadyClaimed:   u64 = 1;
    const ENotEligible:      u64 = 2;
    const EInsufficientPool: u64 = 3;
    const ECampaignActive:   u64 = 4;

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
    //   amount_per_claim  — fixed allocation per eligible address (base units)
    //   pool              — Balance<AXIOM_TEST_CLAIM> available for claims
    //   allowed           — Table<address, bool> — allowlist (Sprint 1)
    //   claimed           — Table<address, bool> — duplicate claim prevention
    //   is_active         — true = open for claims, false = paused/closed
    // =========================================================================
    public struct ClaimCampaign has key {
        id: UID,
        amount_per_claim: u64,
        pool: Balance<AXIOM_TEST_CLAIM>,
        allowed: Table<address, bool>,
        claimed: Table<address, bool>,
        is_active: bool,
    }

    // =========================================================================
    // Events
    // =========================================================================

    public struct CampaignCreated has copy, drop {
        campaign_id: ID,
        amount_per_claim: u64,
    }

    public struct CampaignFunded has copy, drop {
        campaign_id: ID,
        added_amount: u64,
        pool_total: u64,
    }

    public struct AllowlistUpdated has copy, drop {
        campaign_id: ID,
        addr: address,
        added: bool,
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
    // Call fund_campaign + add_to_allowlist + activate before opening claims.
    // Callable from a PTB; return value (AdminCap) is kept by the PTB caller.
    // -------------------------------------------------------------------------
    public fun create_campaign(
        amount_per_claim: u64,
        ctx: &mut TxContext,
    ): AdminCap {
        let campaign_uid = object::new(ctx);
        let campaign_id = object::uid_to_inner(&campaign_uid);

        let campaign = ClaimCampaign {
            id: campaign_uid,
            amount_per_claim,
            pool: balance::zero(),
            allowed: table::new(ctx),
            claimed: table::new(ctx),
            is_active: false,
        };

        transfer::share_object(campaign);
        event::emit(CampaignCreated { campaign_id, amount_per_claim });

        AdminCap { id: object::new(ctx) }
    }

    // -------------------------------------------------------------------------
    // create_campaign_entry — entry wrapper that transfers AdminCap to sender.
    // Use this when calling via CLI (sui client call).
    // -------------------------------------------------------------------------
    public entry fun create_campaign_entry(
        amount_per_claim: u64,
        ctx: &mut TxContext,
    ) {
        let admin_cap = create_campaign(amount_per_claim, ctx);
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
    // add_to_allowlist — adds a single address to the eligibility list.
    // Idempotent: calling twice for the same address is a no-op.
    // Requires AdminCap.
    // -------------------------------------------------------------------------
    public entry fun add_to_allowlist(
        campaign: &mut ClaimCampaign,
        addr: address,
        _admin: &AdminCap,
    ) {
        if (!table::contains(&campaign.allowed, addr)) {
            table::add(&mut campaign.allowed, addr, true);
            let campaign_id = object::uid_to_inner(&campaign.id);
            event::emit(AllowlistUpdated { campaign_id, addr, added: true });
        }
    }

    // -------------------------------------------------------------------------
    // remove_from_allowlist — removes an address from the eligibility list.
    // Idempotent. Requires AdminCap.
    // Note: does not affect already-claimed addresses in the claimed table.
    // -------------------------------------------------------------------------
    public entry fun remove_from_allowlist(
        campaign: &mut ClaimCampaign,
        addr: address,
        _admin: &AdminCap,
    ) {
        if (table::contains(&campaign.allowed, addr)) {
            table::remove(&mut campaign.allowed, addr);
            let campaign_id = object::uid_to_inner(&campaign.id);
            event::emit(AllowlistUpdated { campaign_id, addr, added: false });
        }
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
    }

    // =========================================================================
    // claim — public entry function callable by any eligible address.
    //
    // Requirements (all must hold; aborts with error code if not):
    //   1. Campaign is active (ENotActive)
    //   2. Sender is in allowed table (ENotEligible)
    //   3. Sender has not claimed before (EAlreadyClaimed)
    //   4. Pool has sufficient balance (EInsufficientPool)
    //
    // Duplicate claim prevention:
    //   The sender address is recorded in the `claimed` table BEFORE the
    //   coin transfer. This ensures re-entrancy or concurrent transactions
    //   cannot produce a double-claim.
    // =========================================================================
    public entry fun claim(
        campaign: &mut ClaimCampaign,
        ctx: &mut TxContext,
    ) {
        assert!(campaign.is_active, ENotActive);

        let claimer = tx_context::sender(ctx);
        assert!(table::contains(&campaign.allowed, claimer), ENotEligible);
        assert!(!table::contains(&campaign.claimed, claimer), EAlreadyClaimed);
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
    // close_campaign — permanently closes the campaign.
    //
    // Sets is_active = false. Drains remaining pool balance and transfers
    // it to the transaction sender (admin, who holds AdminCap).
    // After close, all claim attempts abort with ENotActive.
    //
    // Note: The ClaimCampaign shared object remains on-chain (Sui shared
    // objects cannot be easily deleted in Sprint 1). The is_active = false
    // flag is the permanent guard against further claims.
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
    public fun is_in_allowlist(campaign: &ClaimCampaign, addr: address): bool {
        table::contains(&campaign.allowed, addr)
    }

    #[test_only]
    public fun amount_per_claim(campaign: &ClaimCampaign): u64 {
        campaign.amount_per_claim
    }
}
