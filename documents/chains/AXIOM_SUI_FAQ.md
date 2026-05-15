# Axiom Protocol — Sui AMC Distribution FAQ
**Version:** 1.0 | **Phase:** 10 | **Date:** 2026-05-15

---

## General

**What is AMC?**
AMC (AXIOM MAINNET CLAIM) is a community reward token distributed on the Sui blockchain. It is a non-financial token with no monetary value, no reserve backing, and no redemption mechanism.

**Is AMC the same as AXUSD?**
No. AMC is not AXUSD, AXAU, AXM, SEED, or KAG. It has no relationship to any Axiom financial product.

**Does AMC have monetary value?**
No. AMC carries no guaranteed monetary value and is not redeemable for any currency or asset.

**Does AMC give me governance rights?**
Not at this time. AMC carries no governance rights unless explicitly stated in a future protocol amendment.

**Is the smart contract audited?**
An external Move security audit has been deferred temporarily. The remediation deadline is 2026-07-14. This is a formally accepted operational risk disclosed publicly at `/sui/disclosure`.

---

## Eligibility

**How do I know if I am eligible?**
Connect your Sui Mainnet wallet at `/sui/claim` and click "Check Eligibility." The result is determined by a Merkle proof against the fixed eligibility list set at campaign creation.

**Can I be added to the eligibility list after launch?**
No. The eligibility list is fixed at the Merkle root committed to the campaign on launch. Adding new addresses would require closing the current campaign and creating a new one.

**I believe I should be eligible but I am not. What do I do?**
Contact Axiom Protocol via official community channels with your wallet address and the reason you believe you are eligible. Eligibility decisions are reviewed by L3 Protocol Operations.

**Can I claim from multiple wallets?**
Eligibility is per-address. Each eligible address may claim once. There is no mechanism to aggregate claims across wallets.

---

## Claiming

**How do I claim?**
1. Navigate to `/sui/claim`
2. Install a Sui-compatible wallet if you do not have one (Sui Wallet, Martian, Suiet, Phantom Sui)
3. Connect your wallet and ensure it is set to Sui Mainnet
4. Click "Check Eligibility"
5. If eligible, click "Submit Claim" and approve the transaction in your wallet

**How much AMC will I receive?**
Each eligible wallet receives 1,000,000 base units (1 AMC at 6 decimals).

**Can I claim more than once?**
No. Each address may claim exactly once. Duplicate claims are rejected on-chain.

**My claim transaction failed. What happened?**
Check the transaction on suiscan.xyz. Common error codes:
- `ENotActive` — campaign was paused during your submission
- `EAlreadyClaimed` — your address has already claimed
- `EInvalidProof` — refresh the page and retry eligibility check
- `EInsufficientPool` — the campaign pool is depleted

**How long will the campaign stay open?**
The campaign has no expiry date. It will remain open until the operator closes it or the pool is depleted.

---

## Technical

**Which blockchain is this on?**
Sui Mainnet only. This has no connection to Arbitrum, Ethereum, Polygon, or Avalanche.

**What wallet do I need?**
Any Sui Mainnet compatible wallet: Sui Wallet (official), Martian, Suiet, or Phantom (Sui mode).

**Can I use a hardware wallet?**
Yes, if your hardware wallet supports Sui Mainnet (e.g., Ledger with Sui app installed).

**Is the smart contract upgradeable?**
No. The UpgradeCap was destroyed on-chain at deployment. The package is permanently immutable.

**Where can I verify the contract on-chain?**
Package ID: `0xc330a912193feaa7fe545405810732e494b57ece7bc7ecf0e4412e834c33a487`
Explorer: https://suiscan.xyz/mainnet/object/0xc330a912193feaa7fe545405810732e494b57ece7bc7ecf0e4412e834c33a487

**Where can I see the campaign object?**
Campaign ID: `0xa6dea4cc02df669d45744be5ca3a1a740417b63a2f79838e7f01f5e2828b0982`
Explorer: https://suiscan.xyz/mainnet/object/0xa6dea4cc02df669d45744be5ca3a1a740417b63a2f79838e7f01f5e2828b0982

**I claimed but the tokens are not showing in my wallet. How do I add AMC?**
You may need to manually add the token. The coin type is:
`0xc330a912193feaa7fe545405810732e494b57ece7bc7ecf0e4412e834c33a487::axiom_mainnet_claim::AXIOM_MAINNET_CLAIM`

---

## Security

**Who controls the campaign?**
An AdminCap object held by the Axiom Protocol operator wallet. A multisig migration to 2-of-3 custody is planned by 2026-06-14.

**Can the operator take my tokens after I claim?**
No. Once claimed, tokens are transferred to your wallet address on-chain. The operator has no mechanism to retrieve claimed tokens.

**Can the operator change the Merkle root after activation?**
The Merkle root can be updated by the AdminCap holder while the campaign is paused. The campaign must be paused first. This would affect unclaimed positions only.

**What if the operator loses the AdminCap?**
If the AdminCap is lost, the campaign cannot be paused, closed, or modified. Eligible addresses can still claim as long as the campaign is active and the pool has balance.

---

*FAQ version 1.0 · Axiom Protocol Sui Phase 10 · 2026-05-15*
*AMC is a community reward token — NOT AXUSD, AXAU, AXM, SEED, or KAG*
