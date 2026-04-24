# 05 — Why the existing AXIOMOracleAdapter cannot be submitted

The pre-existing AXIOM adapter is deployed at
`0xc894d1500CB1FBf8F045e87bd357A51345197c4e` (Arbitrum One). The original
task title (#90) asks for "the AXUSD price oracle accepted into Euler's
official adapter list" with that adapter's address explicitly named.

This document explains why submitting that exact adapter would (a) fail
Euler's review, (b) endanger users if accepted, and (c) why a new
adapter (`AXUSDPegOracleAdapter`) is the correct path.

## Summary table

| Registry requirement | `AXIOMOracleAdapter` (`0xc894...7c4e`) | `AXUSDPegOracleAdapter` (this submission) |
|---|---|---|
| Single-pair `(base, quote)` | ❌ Multi-pair router (5+ pairs) | ✅ AXUSD/USD only |
| Bidirectional pricing | ❌ AXUSD→USDC returns 0; AXUSD→USD reverts | ✅ Both directions return non-zero |
| Immutable | ❌ Has `setGovernor`, `setMaxStaleness`, `setPsmFallback`, `setPsmAddresses` | ✅ Zero setters, zero storage |
| External calls | ❌ Reads Chainlink + PSM `balanceOf` + `totalSupply` | ✅ None |
| Failure on unsupported pair | ❌ Some pairs silently return 0 | ✅ Reverts with typed error |
| Reverts on staleness | ⚠ `_chainlinkPrice` reverts on stale Chainlink read | ✅ N/A (no external feeds) |
| Quotes USD pseudo (`0x...0348`) | ❌ No code path for USD pseudo-address | ✅ Native pair |
| Lines of code | 339 | 105 |
| Storage slots | 7 (governor, primaryAxusd, eulerAxusd, primaryPsm, eulerPsm, maxStaleness, psmFallbackEnabled) | 0 |

## On-chain evidence

The following calls were executed against the existing adapter during
the Task #88 audit (preserved verbatim in
`documents/euler-axusd-vault-unknown-fix.md` §7b):

| Call | Result | Comment |
|---|---|---|
| `getQuote(1e18, AXUSD, USDC)` | `0` | AXUSD priced at zero — unsafe collateral pricing |
| `getQuote(1e18, AXUSD, USD)`  | revert | USD pseudo-address path absent |
| `getQuote(1e6,  USDC,  AXUSD)` | `1e18` | Reverse direction works |

The first row is the critical defect. A vault whose asset is AXUSD and
whose UoA is USDC or USD will value all borrows at zero, regardless of
which perspective is targeted, because perspectives use the same
`getQuote` path. Accepting this adapter into the registry would not just
fail to fix the "Unknown" label — it would actively make the registry
endorse a broken pricing function, which Euler reviewers will catch
immediately.

## Structural mismatches with the registry model

### One adapter per pair

Euler's `oracleAdapterRegistry` stores entries keyed by
`(adapter, base, quote)`. Each entry asserts that the adapter is a
correct price source for **that specific pair**. A multi-pair router
violates this model — registering it for AXUSD/USD would say nothing
about whether the router's AXUSD/USDC, AXUSD/WETH, AXUSD/WBTC, or
AXUSD/ARB code paths are correct.

### Mutable governance

The existing adapter has `setMaxStaleness`, `setPsmFallback`,
`setPsmAddresses`, and `setGovernor`. The Ungoverned perspective's
philosophy is that the entire pricing stack of an Ungoverned vault must
be free of mutable governance below the vault itself. An adapter whose
governor can change pricing inputs at any time fails this invariant.

### Composition concerns

The existing adapter mixes a Chainlink-derived ETH/USD reading with a
PSM-derived USDC/AXUSD ratio inside a single contract. Euler's review
model treats each price source as an independent adapter, then composes
them in `EulerRouter`. Co-locating sources defeats that model.

## Implication for Task #90

Task #90 was defined assuming the existing adapter could be submitted
as-is. Task #88's audit and on-chain probes invalidated that assumption
**after** Task #90 was scoped. The honest deliverable is therefore:

- **Build a new, registry-compatible adapter** (`AXUSDPegOracleAdapter`,
  this submission package).
- **Document why the original target adapter cannot be submitted** (this
  document).
- **Leave the existing `AXIOMOracleAdapter` deployed and untouched** — it
  is still used by AXIOM-internal tooling for AXUSD/ETH and PSM ratio
  reads in non-Euler contexts. The defect identified above only affects
  the AXUSD-as-asset / USDC-or-USD-as-UoA configuration that Euler vaults
  require.

## Future cleanup

A separate follow-up should evaluate whether `AXIOMOracleAdapter` itself
needs a fix for the AXUSD→USDC zero-pricing branch (`_axusdToUsdc`), or
whether all AXIOM-internal callers of that branch should migrate to a
USDC-side query. That analysis is out of scope for the registry
submission task.
