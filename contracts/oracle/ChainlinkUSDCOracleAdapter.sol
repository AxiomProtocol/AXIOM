// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title  ChainlinkUSDCOracleAdapter
 * @notice ERC-7726-conformant USDC/USD price adapter for Arbitrum One,
 *         wrapping the Chainlink `USDC / USD` aggregator at
 *         `0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3`.
 *
 * Designed for acceptance into Euler Finance's `oracleAdapterRegistry`
 * (`0x3942A72f87Db5Ad9C22d8826FDe15E23b81b1cBf` on Arbitrum One) so that the
 * canonical AXUSD eVault — which uses USDC as collateral — can be
 * perspective-verified by:
 *   - eulerUngoverned0xPerspective
 *   - eulerUngovernedNzxPerspective
 *
 * It is the USDC-collateral counterpart to `AXUSDPegOracleAdapter`. The
 * `EulerRouter` deployed by `scripts/deploy-axusd-evk-vault-canonical.js`
 * composes both adapters: AXUSD/USD prices the asset, USDC/USD prices the
 * collateral.
 *
 * === Why a new adapter (and not an existing one) ===
 *
 * Probing the Euler `oracleAdapterRegistry` on Arbitrum One on 2026-04-17
 * confirmed there are NO `Added(...)` events to date — the registry is
 * empty on this chain. There is therefore no pre-existing
 * registry-accepted USDC/USD adapter to reuse, and one must be deployed
 * and submitted alongside the AXUSD/USD adapter.
 *
 * === Design constraints (mirror Euler registry preconditions) ===
 *
 *  - **Single pair.** Only `(USDC, USD-pseudo)` and the reverse direction
 *    are supported. Any other pair reverts (never returns 0).
 *  - **Bidirectional.** Returns a non-zero quote for both
 *    USDC -> USD and USD -> USDC.
 *  - **Immutable.** No governor, no setters, no fallbacks. The Chainlink
 *    feed address, the staleness window, and the decimal scaling are all
 *    `constant` — the deployed bytecode fully describes the adapter's
 *    behaviour.
 *  - **Fail-closed on staleness.** A stale or invalid round reverts; the
 *    adapter never silently returns the last good value.
 *  - **No fallback.** There is no secondary feed and no PSM ratio fallback;
 *    the Chainlink feed is the sole price source.
 *  - **Stateless.** Zero storage slots.
 *
 * === Decimal model ===
 *
 *   USDC:               6 decimals (`0xaf88d065e77c8cC2239327C5EDb3A432268e5831`)
 *   USD pseudo:         8 decimals (`0x0000000000000000000000000000000000000348`)
 *   Chainlink answer:   8 decimals (verified on-chain via `feed.decimals()`)
 *
 *   USDC -> USD: out = inAmount * answer / 10^(USDC_DEC + FEED_DEC - USD_DEC)
 *                    = inAmount * answer / 1e6
 *   USD -> USDC: out = inAmount * 10^(USDC_DEC + FEED_DEC - USD_DEC) / answer
 *                    = inAmount * 1e6 / answer
 *
 * === Staleness window ===
 *
 * The Chainlink USDC/USD feed on Arbitrum One has a 24h heartbeat. We use
 * 86400 seconds (24h) as the maxStaleness so that a stalled feed reverts
 * one heartbeat after the last legitimate update. This is the same
 * convention used by `evk-periphery`'s `ChainlinkOracle` for stable feeds.
 *
 * === Audit notes ===
 *
 *  - Only external surface is the Chainlink feed's `latestRoundData()`.
 *  - Reverts on: stale round, non-positive answer, unsupported pair,
 *    integer overflow on the `* 1e6` step (unreachable in practice — would
 *    require `inAmount > type(uint256).max / 1e6 ≈ 1.16e71` USD wei).
 *  - The pseudo-address `0x0000000000000000000000000000000000000348` is the
 *    ISO 4217 numeric code for USD (840 = 0x348) encoded as an address.
 *    This mirrors `EulerRouter`'s unit-of-account convention and matches
 *    `eulerUngoverned0xPerspective.isRecognizedUnitOfAccount(USD)`.
 */

interface IChainlinkAggregatorV3 {
    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

contract ChainlinkUSDCOracleAdapter {
    /// @notice Native USDC on Arbitrum One.
    address public constant USDC = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;

    /// @notice ISO 4217 USD pseudo-address (numeric code 840 = 0x348).
    address public constant USD = 0x0000000000000000000000000000000000000348;

    /// @notice Chainlink USDC/USD aggregator on Arbitrum One.
    address public constant FEED = 0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3;

    /// @notice USDC decimals.
    uint8 public constant USDC_DECIMALS = 6;

    /// @notice USD pseudo-address decimals (Euler convention).
    uint8 public constant USD_DECIMALS = 8;

    /// @notice Chainlink feed answer decimals (verified on-chain).
    uint8 public constant FEED_DECIMALS = 8;

    /// @notice Maximum acceptable round age in seconds (matches feed heartbeat).
    uint256 public constant MAX_STALENESS = 86400;

    /// @notice Decimal-scaling divisor for USDC→USD direction.
    ///         = 10^(USDC_DECIMALS + FEED_DECIMALS - USD_DECIMALS) = 10^6.
    uint256 public constant SCALE = 1e6;

    /// @notice Human-readable adapter name (consumed by Euler registry tooling).
    string public constant name = "ChainlinkUSDCOracleAdapter";

    /// @notice Adapter category (matches `ChainlinkOracle` taxonomy in evk-periphery).
    string public constant adapterType = "Chainlink";

    /// @notice Reverts on unsupported (base, quote) pairs.
    error PriceOracle_NotSupported(address base, address quote);

    /// @notice Reverts when the Chainlink round is older than `MAX_STALENESS`.
    error PriceOracle_StaleRound(uint256 updatedAt, uint256 maxStaleness);

    /// @notice Reverts when the Chainlink answer is non-positive.
    error PriceOracle_InvalidAnswer(int256 answer);

    /**
     * @notice Read the current Chainlink price, applying staleness and
     *         positivity checks. Returns the unsigned answer.
     */
    function _readFeed() internal view returns (uint256) {
        (, int256 answer, , uint256 updatedAt, ) =
            IChainlinkAggregatorV3(FEED).latestRoundData();
        if (answer <= 0) revert PriceOracle_InvalidAnswer(answer);
        // `block.timestamp - updatedAt` could underflow only if `updatedAt`
        // is in the future, which is itself a fault. Use unchecked-safe math.
        if (updatedAt == 0 || block.timestamp < updatedAt) {
            revert PriceOracle_StaleRound(updatedAt, MAX_STALENESS);
        }
        if (block.timestamp - updatedAt > MAX_STALENESS) {
            revert PriceOracle_StaleRound(updatedAt, MAX_STALENESS);
        }
        return uint256(answer);
    }

    /**
     * @notice ERC-7726 entrypoint. Returns the `quote`-denominated amount
     *         that corresponds to `inAmount` of `base` at the current
     *         Chainlink USDC/USD price.
     *
     * @param inAmount  Amount of `base` in `base`'s native decimals.
     * @param base      Either USDC or USD pseudo-address.
     * @param quote     The other of USDC or USD pseudo-address.
     * @return outAmount Amount of `quote` in `quote`'s native decimals.
     */
    function getQuote(uint256 inAmount, address base, address quote)
        external
        view
        returns (uint256 outAmount)
    {
        if (inAmount == 0) return 0;

        if (base == USDC && quote == USD) {
            uint256 answer = _readFeed();
            return (inAmount * answer) / SCALE;
        }
        if (base == USD && quote == USDC) {
            uint256 answer = _readFeed();
            return (inAmount * SCALE) / answer;
        }

        revert PriceOracle_NotSupported(base, quote);
    }

    /**
     * @notice Convenience two-sided quote, mirroring evk-periphery's
     *         `IPriceOracle.getQuotes`. Returns `(bid, ask)` — both equal
     *         to the spot quote since the adapter has no spread.
     */
    function getQuotes(uint256 inAmount, address base, address quote)
        external
        view
        returns (uint256 bidOutAmount, uint256 askOutAmount)
    {
        if (inAmount == 0) return (0, 0);

        uint256 q;
        if (base == USDC && quote == USD) {
            uint256 answer = _readFeed();
            q = (inAmount * answer) / SCALE;
        } else if (base == USD && quote == USDC) {
            uint256 answer = _readFeed();
            q = (inAmount * SCALE) / answer;
        } else {
            revert PriceOracle_NotSupported(base, quote);
        }
        return (q, q);
    }
}
