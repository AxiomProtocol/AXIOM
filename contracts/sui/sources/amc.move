/// Axiom Move Coin — AMC
///
/// One-time-witness fungible coin for the Axiom Protocol governance and
/// claim distribution system on Sui.
///
/// The TreasuryCap is transferred to the deployer on publish. For production
/// the TreasuryCap must be immediately transferred to the protocol multisig
/// or wrapped in the GuardedTreasury module.
///
/// Decimals: 6 (1 AMC = 1_000_000 base units — matches USDC convention)
/// Symbol:   AMC
/// Name:     Axiom Move Coin
module axiom::amc {
    use sui::coin;
    use sui::url;

    public struct AMC has drop {}

    fun init(witness: AMC, ctx: &mut TxContext) {
        let icon_url = url::new_unsafe_from_bytes(
            b"https://axiomprotocol.xyz/icons/amc.png"
        );
        let (treasury_cap, coin_metadata) = coin::create_currency<AMC>(
            witness,
            6,
            b"AMC",
            b"Axiom Move Coin",
            b"Axiom Protocol governance and community distribution token.",
            option::some(icon_url),
            ctx,
        );
        transfer::public_freeze_object(coin_metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(AMC {}, ctx);
    }
}
