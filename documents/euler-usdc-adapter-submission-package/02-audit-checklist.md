# 02 — Adapter Audit Checklist

Standard questions Euler Labs and reviewers ask before accepting an
oracle adapter into the registry, with answers specific to
`ChainlinkUSDCOracleAdapter`.

## Adapter classification

**Q1. What category does this adapter fall into?**
`Chainlink`. It returns the latest USDC/USD price from the Chainlink
aggregator on Arbitrum One with decimal scaling. This matches the
`ChainlinkOracle` taxonomy in `evk-periphery`.

**Q2. Why a Chainlink wrapper for USDC?**
USDC is a centralized stablecoin whose peg is market-discoverable
(off-chain redemption only). A market oracle is required so that the
EVK risk system can observe a real depeg if one occurs. A fixed-rate
adapter would hide depeg events.

**Q3. What are the conditions under which the price could become
inaccurate?**
1. Chainlink stops updating the feed for >24h — the adapter reverts
   (fail-closed).
2. Chainlink reports a non-positive answer — the adapter reverts.
3. The off-chain Circle PSM is suspended — the on-chain Chainlink
   answer reflects the new market price; the adapter reports it.
4. Chainlink itself is compromised — out of scope; this is the
   trust assumption shared by every Chainlink-priced market on the L2.

## Code review

**Q4. Is the contract immutable?**
Yes. There is no constructor that takes parameters, no storage slots,
no setters, no owner, no proxy admin, no delegatecall, no fallback
function, no receive function. `getQuote` and `getQuotes` are `view`
(they read the Chainlink feed). All metadata functions are `pure`.

**Q5. Are there any external calls?**
One: `latestRoundData()` on the Chainlink aggregator at
`0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3`. No other contract is
called.

**Q6. Are there any reentrancy vectors?**
No. The contract has no state to corrupt and the single external call
is to a known-immutable Chainlink aggregator. Even if the call were
malicious, there is no state to manipulate on re-entry.

**Q7. What are the failure modes?**
1. Unsupported `(base, quote)` reverts with
   `PriceOracle_NotSupported(base, quote)`.
2. Stale round (`block.timestamp - updatedAt > 86400`) reverts with
   `PriceOracle_StaleRound(updatedAt, 86400)`.
3. Non-positive answer reverts with
   `PriceOracle_InvalidAnswer(answer)`.
4. Future-dated round (`block.timestamp < updatedAt`) reverts with
   `PriceOracle_StaleRound`.
5. Integer overflow on the multiplication step at unreachable input
   sizes (~1.16e69 USDC wei or ~1.16e71 USD wei).

**Q8. Does the adapter ever silently return 0?**
Only when called with `inAmount == 0`, by ERC-7726 convention. For
unsupported pairs and for stale/invalid feed state the adapter
**reverts** rather than returning 0. This is the same defensive
posture as the AXUSD adapter and explicitly addresses the failure mode
that made our prior multi-pair AXIOM adapter unsuitable.

## Conformance

**Q9. Does it implement ERC-7726?**
Yes. `function getQuote(uint256 inAmount, address base, address quote)
external view returns (uint256)`. The `view` mutability matches the
ERC-7726 requirement (the function reads the Chainlink feed).

**Q10. Does it implement the optional `getQuotes(...)` two-sided
variant used by `evk-periphery`?**
Yes. Returns `(bid, ask)` with `bid == ask` (no spread).

**Q11. Are decimals consistent with Euler's USD pseudo-address
convention?**
Yes. USD pseudo (`0x...0348`) is treated as 8-decimal, mirroring
Chainlink USD feed convention and matching `EulerRouter`'s
unit-of-account semantics. Output amounts are scaled into the quote
asset's native decimals.

## Operational

**Q12. Who can update the adapter?**
No one. The adapter is immutable by construction, and the Chainlink
feed address is a `constant` baked into bytecode.

**Q13. What happens if the Chainlink feed is migrated?**
The adapter would start reverting with `PriceOracle_StaleRound` 24h
after the migration. Axiom would deploy a new adapter pointing at the
new feed address and submit it as a new registry entry. The old
adapter would be revoked from the registry. There is no upgrade path
on the existing adapter — that is the point.

**Q14. What is the maximum staleness window?**
`MAX_STALENESS = 86400` seconds (24h). This matches the Chainlink
USDC/USD feed heartbeat on Arbitrum One. It is a `constant` and
cannot be changed post-deploy.

**Q15. Who is responsible for monitoring the feed?**
Chainlink for the underlying feed liveness; Axiom for any vault-level
reaction to a sustained depeg via the `EulerRouter` and EVK governance
of the AXUSD vault (during the `SKIP_RENOUNCE`-gated period before
governance is renounced — see
`scripts/deploy-axusd-evk-vault-canonical.js`).

## Deployment integrity

**Q16. Will the deployed bytecode match this source?**
Yes. The deploy script (`scripts/deploy-usdc-usd-chainlink-adapter.js`)
compiles this exact source via Hardhat and prints an
`npx hardhat verify` command in its post-deploy printout, allowing
public bytecode verification on Blockscout immediately after deployment.

**Q17. Is the deployer EOA or a multisig?**
EOA (`DEPLOYER_PRIVATE_KEY`). This is acceptable because the adapter
is immutable — the deployer has no privileged role after deployment.

## Cross-references

**Q18. What vault will use this adapter?**
The new canonical AXUSD eVault deployed via
`scripts/deploy-axusd-evk-vault-canonical.js`. The vault uses an
`EulerRouter` instance as its `oracle` immutable; the router holds the
mapping `USDC/USD → ChainlinkUSDCOracleAdapter` (this contract) plus a
separate `AXUSD/USD → AXUSDPegOracleAdapter` mapping for the asset.

**Q19. Why is AXUSD/USD pricing a separate adapter?**
Because the adapter registry's contract model is one adapter per
`(base, quote)` pair. The vault router composes them. See the AXUSD
submission package at `documents/euler-adapter-submission-package/`.

**Q20. Should this submission and the AXUSD submission be reviewed
together?**
Yes — neither vault path can be perspective-verified until both
adapters are in the registry. We respectfully request that the two PRs
be batched into a single Euler governance transaction.

## Submission completeness

This package includes:

- [x] Source code (`contracts/oracle/ChainlinkUSDCOracleAdapter.sol`)
- [x] Deploy script (`scripts/deploy-usdc-usd-chainlink-adapter.js`)
- [x] Conformance verification harness (`scripts/verify-usdc-usd-chainlink-adapter.js`)
- [x] Pre-submission registry-reuse check (`scripts/check-usdc-usd-adapter-registry.js`)
- [x] Technical spec (`01-adapter-spec.md`)
- [x] This audit checklist (`02-audit-checklist.md`)
- [x] PR payload template (`03-registry-pr-payload.md`)
- [x] Outreach templates (`04-outreach-template.md`)
