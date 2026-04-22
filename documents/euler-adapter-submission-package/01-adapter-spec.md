# 01 — Technical Specification: AXUSDPegOracleAdapter

## Summary

`AXUSDPegOracleAdapter` is a stateless, immutable, single-pair, bidirectional
ERC-7726 price adapter that returns a fixed 1.0 USD per AXUSD quote with
correct decimal conversion between AXUSD (18 decimals) and the USD
pseudo-address (8 decimals, per Euler convention).

It is the AXUSD analogue of `FixedRateOracle` from `euler-xyz/evk-periphery` —
which is the reference adapter used by Euler for USD-pegged stablecoins
whose peg is structural rather than market-derived.

## Source

`contracts/oracle/AXUSDPegOracleAdapter.sol` (105 lines including header).

Compiler: `solc 0.8.24`, optimizer enabled (200 runs), default Hardhat
config in this repository.

## Public surface

```solidity
function getQuote(uint256 inAmount, address base, address quote) external pure returns (uint256);
function getQuotes(uint256 inAmount, address base, address quote) external pure returns (uint256 bid, uint256 ask);
function name() external pure returns (string);          // "AXUSDPegOracleAdapter"
function adapterType() external pure returns (string);   // "FixedRate"
function AXUSD() external pure returns (address);        // 0xD611...Ade7
function USD() external pure returns (address);          // 0x0000...0348
function AXUSD_DECIMALS() external pure returns (uint8); // 18
function USD_DECIMALS() external pure returns (uint8);   // 8
function RATE_WAD() external pure returns (uint256);     // 1e18
```

There are **no other functions**. There are **no setters, no owner, no
governor, no proxy admin, no delegatecall, no fallback**.

## Pricing semantics

Let `BASE` denote AXUSD, `QUOTE` denote USD-pseudo, `RATE = 1.0` USD per
AXUSD.

| Call | Mathematics | Returned value |
|---|---|---|
| `getQuote(0, *, *)` | — | `0` |
| `getQuote(X, AXUSD, USD)` | `X * RATE * 10^(USD_DEC - AXUSD_DEC)` = `X / 1e10` | `X / 1e10` |
| `getQuote(X, USD, AXUSD)` | `X / RATE * 10^(AXUSD_DEC - USD_DEC)` = `X * 1e10` | `X * 1e10` |
| anything else | reverts with `PriceOracle_NotSupported(base, quote)` | — |

`getQuotes` returns `(bidOutAmount, askOutAmount)` where `bid == ask` because
the adapter has no spread.

## Decimal model

| Symbol | Address | Decimals | Note |
|---|---|---|---|
| AXUSD | `0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7` | 18 | ERC-3643 |
| USD pseudo | `0x0000000000000000000000000000000000000348` | 8 | Euler convention; 0x348 = 840 = ISO 4217 USD |

The `1e10` factor is the difference between the two decimal scales (`18 - 8`).

## Round-trip behaviour

`getQuote(getQuote(X, AXUSD, USD), USD, AXUSD)` is exactly equal to
`(X / 1e10) * 1e10 == X - (X mod 1e10)`. For amounts denominated in whole
AXUSD or in micro-USD increments the round-trip is lossless. The only
truncation is below the 8-decimal USD precision floor (`1e10` AXUSD wei =
0.00000001 USD), which is well below any economically meaningful position
size.

The verification harness (`scripts/verify-axusd-peg-adapter.js`) asserts a
lossless round-trip on `1234.56789e18` AXUSD, which is at 5-decimal USD
precision and below the truncation floor.

## Failure modes (exhaustive)

1. **Unsupported pair** — any call with `(base, quote)` not in the set
   `{(AXUSD, USD), (USD, AXUSD)}` reverts with the typed custom error
   `PriceOracle_NotSupported(base, quote)`. This **never silently returns
   zero**, which is the failure mode that caused the `AXIOMOracleAdapter`
   to be unsafe (see [05-why-not-existing-adapter.md](./05-why-not-existing-adapter.md)).
2. **Integer overflow** on the `* 1e10` step in the USD→AXUSD direction
   when `inAmount > type(uint256).max / 1e10 ≈ 1.16e67` USD wei. This
   exceeds USD GDP by ~50 orders of magnitude.
3. **No revert paths exist for staleness, governance, or external-call
   failure** because there are no such surfaces.

## Why fixed rate (and not a Chainlink wrapper)

AXUSD is mintable and redeemable 1:1 against USDC through `CanonicalPSM`
(`contracts/axusd/CanonicalPSM.sol`). The peg is therefore a structural
contract guarantee, not a market-discovered price. A market price oracle
would introduce phantom volatility around the structural peg and would
make the adapter unable to verify because it would need a Chainlink-style
USDC/USD adapter chained underneath, which Euler does not stack onto a
stable-asset adapter for the asset itself.

This mirrors how `crvUSD/USD`, `USDe/USD`, and similar peg adapters are
modeled in `euler-xyz/evk-periphery`.

## Auditability

- **Lines of code:** 105 (including license header, comments, and the
  optional `getQuotes` helper).
- **Storage slots used:** 0.
- **External calls:** 0.
- **Inheritance:** none.
- **Imports:** none.
- **Custom errors:** 1 (`PriceOracle_NotSupported`).

The contract can be reviewed in a single pass by a competent reviewer in
under 5 minutes.

## Out of scope for this adapter

- AXUSD/USDC pricing (must be derived inside `EulerRouter` by chaining
  this adapter with a USDC/USD adapter; that wiring belongs to the vault
  redeploy, not to this submission).
- AXUSD/WETH or any non-USD pair (a router-level concern).
- Staleness detection (not applicable — the rate is constant by design).
- Decimal queries on AXUSD or USD (decimals are encoded as constants).
