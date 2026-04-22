# 02 — Adapter Audit Checklist

Standard questions Euler Labs and reviewers ask before accepting an oracle
adapter into the registry, with answers specific to `AXUSDPegOracleAdapter`.

## Adapter classification

**Q1. What category does this adapter fall into?**
`FixedRate`. It returns a constant 1.0 ratio between AXUSD and the USD
pseudo-address. This matches the `FixedRateOracle` taxonomy in
`evk-periphery`.

**Q2. Why is a fixed rate appropriate for AXUSD?**
AXUSD is mintable and redeemable 1:1 against USDC via `CanonicalPSM`. The
peg is a contract guarantee, not a market-discovered price. Wrapping a
market feed would introduce phantom volatility around a price that the
issuing protocol contractually maintains.

**Q3. What are the conditions under which the peg could break?**
The peg is enforced by `CanonicalPSM.sol`, which mints AXUSD only against
1:1 USDC deposits and burns AXUSD only against 1:1 USDC redemptions. The
peg can only break if (a) `CanonicalPSM` is paused or rugged, or (b) USDC
itself depegs. Both events are out of scope for an oracle and would
require a protocol-level response (not a price update).

## Code review

**Q4. Is the contract immutable?**
Yes. There is no constructor that takes parameters, no storage slots, no
setters, no owner, no proxy admin, no delegatecall, no fallback function,
no receive function. Every public function is `pure`.

**Q5. Are there any external calls?**
No. The contract performs pure arithmetic only.

**Q6. Are there any reentrancy vectors?**
No. There is no state to corrupt and no external call surface.

**Q7. What are the failure modes?**
1. Unsupported `(base, quote)` reverts with `PriceOracle_NotSupported(base, quote)`.
2. Integer overflow on the USD→AXUSD direction when `inAmount > type(uint256).max / 1e10 ≈ 1.16e67`.
   This is ~50 orders of magnitude above USD GDP and is not reachable in practice.
3. There are no other failure modes.

**Q8. Does the adapter ever silently return 0?**
Only when called with `inAmount == 0`, by ERC-7726 convention. For
unsupported pairs the adapter **reverts** rather than returning 0. This
is explicitly a fix relative to the prior AXIOM adapter (`0xc894...7c4e`)
which silently returned 0 for `getQuote(*, AXUSD, USDC)`.

## Conformance

**Q9. Does it implement ERC-7726?**
Yes. `function getQuote(uint256 inAmount, address base, address quote)
external view returns (uint256)`. The `view` mutability requirement is
satisfied — in fact the function is the stricter `pure`.

**Q10. Does it implement the optional `getQuotes(...)` two-sided variant
used by `evk-periphery`?**
Yes. Returns `(bid, ask)` with `bid == ask` (no spread).

**Q11. Are decimals consistent with Euler's USD pseudo-address convention?**
Yes. USD pseudo (`0x...0348`) is treated as 8-decimal, mirroring Chainlink
USD feed convention and matching `EulerRouter`'s unit-of-account semantics.

## Operational

**Q12. Who can update the adapter?**
No one. The adapter is immutable by construction.

**Q13. What happens if AXUSD is paused or upgraded?**
This adapter is independent of AXUSD's runtime state. AXUSD can be paused,
upgraded, or have its compliance settings changed without affecting this
adapter's behaviour. The peg quote is hardcoded.

**Q14. What is the upgrade plan?**
There is none. If the AXUSD peg model changes (e.g., a new asset is added
to the PSM backing), Axiom will deploy a new adapter and submit it as a
new registry entry, leaving this adapter intact for backward
compatibility.

**Q15. Who is responsible for monitoring the peg?**
Axiom Protocol via `CanonicalPSM` invariants and the proof-of-solvency
console. Oracle-level monitoring is not applicable because the adapter
returns a constant.

## Deployment integrity

**Q16. Will the deployed bytecode match this source?**
Yes. The deploy script (`scripts/deploy-axusd-peg-adapter.js`) compiles
this exact source via Hardhat and submits an `npx hardhat verify` command
in its post-deploy printout, allowing public bytecode verification on
Blockscout immediately after deployment.

**Q17. Is the deployer EOA or a multisig?**
EOA (`DEPLOYER_PRIVATE_KEY`). This is acceptable because the adapter is
immutable — the deployer has no privileged role after the constructor
runs.

## Cross-references

**Q18. What vault will use this adapter?**
The new canonical AXUSD eVault deployed via
`scripts/deploy-axusd-evk-vault-canonical.js`. The vault uses an
`EulerRouter` instance as its `oracle` immutable; the router holds the
mapping `AXUSD/USD -> AXUSDPegOracleAdapter` (this contract) plus a
separate `USDC/USD -> ChainlinkOracle` mapping for the collateral asset.

**Q19. Why is USDC/USD pricing a separate adapter?**
Because the adapter registry's contract model is one adapter per
`(base, quote)` pair. The vault router composes them.

## Submission completeness

This package includes:

- [x] Source code (`contracts/oracle/AXUSDPegOracleAdapter.sol`)
- [x] Deploy script (`scripts/deploy-axusd-peg-adapter.js`)
- [x] Conformance verification harness (`scripts/verify-axusd-peg-adapter.js`)
- [x] Technical spec (`01-adapter-spec.md`)
- [x] This audit checklist (`02-audit-checklist.md`)
- [x] PR payload template (`03-registry-pr-payload.md`)
- [x] Outreach templates (`04-outreach-template.md`)
- [x] Rejection rationale for the prior adapter (`05-why-not-existing-adapter.md`)
