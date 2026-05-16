/// Axiom Protocol — Test Claim Helper
///
/// Convenience module used only in test environments.
/// Provides a one-shot mint + claim helper so integration tests can exercise
/// the full fund → activate → claim path without wiring the full protocol stack.
///
/// NOT deployed to mainnet or testnet — #[test_only] module.
#[test_only]
module axiom::axiom_test_claim {
    use sui::coin;
    use axiom::amc::AMC;
    use axiom::claim_campaign::{Self, ClaimCampaign, AdminCap};
    use axiom::guarded_treasury::{Self, GuardedTreasury};

    /// Mint `amount` AMC for testing (minting from thin air — test only).
    public fun mint_amc(amount: u64, ctx: &mut TxContext): sui::coin::Coin<AMC> {
        coin::mint_for_testing<AMC>(amount, ctx)
    }

    /// Full campaign setup for tests: create, fund, activate.
    /// Returns (ClaimCampaign, AdminCap) ready for claiming.
    public fun setup_active_campaign(
        label:            vector<u8>,
        merkle_root:      vector<u8>,
        amount_per_claim: u64,
        pool_amount:      u64,
        expires_at_epoch: u64,
        ctx:              &mut TxContext,
    ): (ClaimCampaign, AdminCap) {
        let (mut campaign, admin_cap) = claim_campaign::create_campaign_for_test(
            label,
            merkle_root,
            amount_per_claim,
            expires_at_epoch,
            ctx,
        );

        // Fund
        let coins = mint_amc(pool_amount, ctx);
        claim_campaign::fund_for_test(&mut campaign, coins);

        (campaign, admin_cap)
    }

    /// Minimal leaf for test proof: just keccak256(addr ++ amount_le)
    /// The actual hashing uses the merkle module.
    public fun single_leaf_root(addr: address, amount: u64): vector<u8> {
        axiom::merkle::compute_leaf(addr, amount)
    }

    /// Assert that a GuardedTreasury has the expected pool balance.
    public fun assert_treasury_balance<T>(
        treasury: &GuardedTreasury<T>,
        expected: u64,
    ) {
        assert!(guarded_treasury::pool_balance(treasury) == expected, 999);
    }
}
