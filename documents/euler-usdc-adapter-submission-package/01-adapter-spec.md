# 01 — Technical Specification: ChainlinkUSDCOracleAdapter

## Summary

`ChainlinkUSDCOracleAdapter` is a stateless, immutable, single-pair,
bidirectional ERC-7726 price adapter that wraps the Chainlink
`USDC / USD` aggregator on Arbitrum One
(`0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3`) and exposes USDC↔USD
pricing with correct decimal conversion between USDC (6 decimals), the
USD pseudo-address (8 decimals, per Euler convention), and the feed
answer (8 decimals).

It is the USDC analogue of `ChainlinkOracle` from
`euler-xyz/evk-periphery` — distilled down to a single hard-coded pair
so that the deployed bytecode fully describes the adapter's behaviour
and there are no constructor-set knobs to audit.

## Source

`contracts/oracle/ChainlinkUSDCOracleAdapter.sol` (~180 lines including
header and inline `IChainlinkAggregatorV3` interface).

Compiler: `solc 0.8.24`, optimizer enabled (200 runs), default Hardhat
config in this repository.

## Public surface

```solidity
function getQuote(uint256 inAmount, address base, address quote) external view returns (uint256);
function getQuotes(uint256 inAmount, address base, address quote) external view returns (uint256 bid, uint256 ask);
function name() external pure returns (string);            // "ChainlinkUSDCOracleAdapter"
function adapterType() external pure returns (string);     // "Chainlink"
function USDC() external pure returns (address);           // 0xaf88...5831
function USD() external pure returns (address);            // 0x0000...0348
function FEED() external pure returns (address);           // 0x5083...4aD3
function USDC_DECIMALS() external pure returns (uint8);    // 6
function USD_DECIMALS() external pure returns (uint8);     // 8
function FEED_DECIMALS() external pure returns (uint8);    // 8
function MAX_STALENESS() external pure returns (uint256);  // 86400
function SCALE() external pure returns (uint256);          // 1e6
```

There are **no other functions**. There are **no setters, no owner, no
governor, no proxy admin, no delegatecall, no fallback**.

## Pricing semantics

Let `BASE` denote USDC, `QUOTE` denote USD-pseudo, `ANSWER` the latest
Chainlink answer (8 decimals), `SCALE = 10^(USDC_DEC + FEED_DEC -
USD_DEC) = 1e6`.

| Call | Mathematics | Returned value |
|---|---|---|
| `getQuote(0, *, *)` | — | `0` |
| `getQuote(X, USDC, USD)` | `X * ANSWER * 10^(USD_DEC - USDC_DEC - FEED_DEC)` = `X * ANSWER / 1e6` | `X * ANSWER / 1e6` |
| `getQuote(X, USD, USDC)` | `X * 10^(USDC_DEC + FEED_DEC - USD_DEC) / ANSWER` = `X * 1e6 / ANSWER` | `X * 1e6 / ANSWER` |
| anything else | reverts with `PriceOracle_NotSupported(base, quote)` | — |

`getQuotes` returns `(bidOutAmount, askOutAmount)` where `bid == ask`
because the adapter has no spread.

## Decimal model

| Symbol | Address | Decimals | Note |
|---|---|---|---|
| USDC | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` | 6 | Native USDC on Arbitrum |
| USD pseudo | `0x0000000000000000000000000000000000000348` | 8 | Euler convention; 0x348 = 840 = ISO 4217 USD |
| Chainlink USDC/USD feed | `0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3` | 8 | Verified on-chain via `feed.decimals()` |

The `1e6` scaling factor is the difference `USDC_DEC + FEED_DEC -
USD_DEC = 6 + 8 - 8 = 6`.

## Staleness model

The Chainlink USDC/USD feed on Arbitrum One has a 24h heartbeat. We use
`MAX_STALENESS = 86400` so that a stalled feed reverts one heartbeat
after the last legitimate update. This matches the convention used by
`evk-periphery`'s `ChainlinkOracle` for stable feeds.

The adapter reverts (rather than returning the last good value) when:

- `answer <= 0`, with `PriceOracle_InvalidAnswer(answer)`
- `updatedAt == 0`, with `PriceOracle_StaleRound(updatedAt, MAX_STALENESS)`
- `block.timestamp < updatedAt` (round timestamp in the future), same error
- `block.timestamp - updatedAt > MAX_STALENESS`, same error

## Round-trip behaviour

`getQuote(getQuote(X, USDC, USD), USD, USDC)` returns
`((X * ANSWER / 1e6) * 1e6) / ANSWER`. For typical values
(`ANSWER ≈ 1e8`, `X ≥ 1e6`) the round-trip is lossy by at most
1 USDC wei due to the two integer divisions.

The verification harness (`scripts/verify-usdc-usd-chainlink-adapter.js`)
asserts a round-trip on `1000 USDC` with a 2-wei tolerance.

## Failure modes (exhaustive)

1. **Unsupported pair** — any call with `(base, quote)` not in the set
   `{(USDC, USD), (USD, USDC)}` reverts with the typed custom error
   `PriceOracle_NotSupported(base, quote)`. Never silently returns 0.
2. **Stale round** — `block.timestamp - updatedAt > 86400` reverts with
   `PriceOracle_StaleRound(updatedAt, 86400)`.
3. **Invalid answer** — `answer <= 0` reverts with
   `PriceOracle_InvalidAnswer(answer)`.
4. **Future-dated round** — `block.timestamp < updatedAt` reverts with
   `PriceOracle_StaleRound(updatedAt, 86400)`.
5. **Integer overflow** on the `* SCALE` step in the USD→USDC direction
   when `inAmount > type(uint256).max / 1e6 ≈ 1.16e71` USD wei. This
   exceeds USD GDP by ~50 orders of magnitude. The USDC→USD direction
   overflows on `inAmount * answer > 2^256` which requires
   `inAmount > 2^256 / 1e8 ≈ 1.16e69` — also unreachable.
6. **No revert paths exist for governance, fallback, or upgradeability**
   because there are no such surfaces.

## Why a Chainlink wrapper (and not a fixed-rate adapter)

USDC is a centralized stablecoin issued by Circle. Its peg is
market-discoverable rather than contract-guaranteed (the Circle PSM is
off-chain; on-chain there is no automatic 1:1 redemption). A market
oracle is the correct primitive — wrapping a fixed `1.0` rate would
hide a real depeg event from the EVK risk system.

This mirrors how USDC is priced everywhere else in the Euler reference
deployments.

## Why hard-code the feed (and not constructor-inject it)

Euler's perspective and audit model rewards adapters whose deployed
bytecode fully describes their behaviour. A constructor-injected feed
address has the same operational risk as a setter — the deployer can
choose a malicious feed at deploy time, and a reviewer must inspect the
deploy tx to verify. By hard-coding `FEED` as `constant`, the adapter
bytecode itself attests to the feed selection, and verifying the
adapter on Arbiscan also verifies the feed binding.

## Auditability

- **Lines of code:** ~180 (including license header, comments, inline
  Chainlink interface, and the optional `getQuotes` helper).
- **Storage slots used:** 0.
- **External calls:** 1 (`latestRoundData()` on the Chainlink feed).
- **Inheritance:** none.
- **Imports:** none (Chainlink interface is inlined).
- **Custom errors:** 3 (`PriceOracle_NotSupported`,
  `PriceOracle_StaleRound`, `PriceOracle_InvalidAnswer`).

The contract can be reviewed in a single pass by a competent reviewer
in under 10 minutes.

## Out of scope for this adapter

- AXUSD/USD pricing (covered by `AXUSDPegOracleAdapter`).
- USDC/USDT or any non-USD pair (router-level concern).
- Sequencer-uptime checks (Arbitrum Nitro does not currently require an
  L2 sequencer-uptime feed for USDC/USD; if Euler later adds this as a
  registry precondition, a new adapter will be deployed and submitted).
- Decimal queries on USDC or USD (decimals are encoded as constants).
