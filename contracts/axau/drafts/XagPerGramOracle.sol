// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/* ───────────────────────────────────────────────────────────────────────────────
 *  XAG-PER-GRAM ORACLE WRAPPER — DRAFT, NOT FOR DEPLOYMENT
 *  ─────────────────────────────────────────────────────────
 *  Status:        DRAFT — not deployed, not used in production.
 *  Document path: contracts/axau/drafts/XagPerGramOracle.sol
 *  Source spec:   documents/commodities/AXAG_KINESIS_GO_LIVE_PATH.md § 5.3
 *  Stage:         2 — Technical Diligence (architectural draft only)
 *
 *  PURPOSE
 *  ───────
 *  Chainlink's XAG/USD feed (Arbitrum One: 0x66a35534126b4B0845A2Aa03825B95dfaAA88A4F)
 *  returns USD per troy ounce with 8 decimal places.
 *
 *  KAG (Kinesis Silver) represents 1 GRAM of silver, NOT 1 troy ounce.
 *  The NAVEngine computes reserve value as:
 *      componentValueUsd = (reserveUnits × oraclePrice) / (10^assetDecimals)
 *
 *  If the raw XAG/USD feed is used, the NAVEngine would compute value in
 *  troy-ounce units while the vault holds gram units, overestimating reserve
 *  value by a factor of ~31.1035.
 *
 *  This wrapper converts the troy-ounce price to a per-gram price by dividing
 *  by 31.1035 (the exact LBMA-standard conversion). The NAVEngine treats this
 *  wrapper exactly like any other AggregatorV3Interface — no NAVEngine changes
 *  are required; the gram conversion is encapsulated here.
 *
 *  MATH
 *  ────
 *  troyOzAnswer   (int256, 8 dec) — raw Chainlink XAG/USD
 *  gramAnswer     = troyOzAnswer × 1_000_000 / 31_103_500
 *                 ≡ troyOzAnswer / 31.1035        (6 sig-fig precision)
 *
 *  The 1e6 / 31_103_500 scaling preserves 8 decimal places in the output.
 *  Overflow analysis:
 *    Max plausible XAG/USD: $10,000/toz → answer = 1_000_000_000_000 (1e12 @8dec)
 *    After × 1_000_000:       1e18 — well within int256 (max ≈ 1.15e77) ✓
 *
 *  DEPLOYMENT PREDICATES (same as AXSilverVault.sol — all must be satisfied):
 *    See contracts/axau/drafts/README.md for the full gate list.
 *
 *  FEED ADDRESS TO SUPPLY AT DEPLOYMENT
 *    Arbitrum One: 0x66a35534126b4B0845A2Aa03825B95dfaAA88A4F  (verify at data.chain.link)
 *    Ethereum:     N/A — use Arbitrum feed or bridge-sync approach
 * ─────────────────────────────────────────────────────────────────────────── */

import "../interfaces/IAXAU.sol";

/**
 * @title XagPerGramOracle
 * @notice Wraps a Chainlink XAG/USD (troy-ounce) feed and exposes it as a
 *         per-gram price feed. Implements AggregatorV3Interface so the existing
 *         NAVEngine requires no modifications.
 *
 * @dev The wrapped feed must be a Chainlink AggregatorV3Interface-compatible
 *      feed with 8 decimal places. The wrapper always returns 8 decimal places.
 *
 * @dev IMPORTANT — staleness is NOT re-checked here; the NAVEngine's own
 *      `oracleStaleSecs` guard applies to `updatedAt` returned from this wrapper,
 *      which is passed through unchanged from the underlying feed.
 */
contract XagPerGramOracle is AggregatorV3Interface {

    // ── Constants ─────────────────────────────────────────────────────────────

    /// @notice Troy ounces per gram × 1e6 for fixed-point integer arithmetic.
    ///         31.1035 g/toz × 1_000_000 = 31_103_500.
    int256 public constant TROY_OZ_PER_GRAM_SCALED = 31_103_500;

    /// @notice Scaling factor applied before integer division to preserve precision.
    int256 public constant SCALE = 1_000_000;

    // ── Immutables ────────────────────────────────────────────────────────────

    /// @notice The underlying Chainlink XAG/USD (troy-ounce) feed.
    AggregatorV3Interface public immutable underlyingFeed;

    // ── Events ────────────────────────────────────────────────────────────────
    event UnderlyingFeedSet(address indexed feed);

    // ── Constructor ───────────────────────────────────────────────────────────
    /**
     * @param underlyingFeed_  Address of the Chainlink XAG/USD AggregatorV3 feed.
     *                         On Arbitrum One: 0x66a35534126b4B0845A2Aa03825B95dfaAA88A4F
     */
    constructor(address underlyingFeed_) {
        require(underlyingFeed_ != address(0), "XagPerGramOracle: zero feed");
        underlyingFeed = AggregatorV3Interface(underlyingFeed_);
        emit UnderlyingFeedSet(underlyingFeed_);
    }

    // ── AggregatorV3Interface ─────────────────────────────────────────────────

    /**
     * @notice Returns 8 — the oracle output always has 8 decimal places,
     *         matching the Chainlink standard and the rest of the AXAU oracle stack.
     */
    function decimals() external pure returns (uint8) {
        return 8;
    }

    /**
     * @notice Returns the XAG/USD price in USD per GRAM (8 decimal places).
     *         All fields except `answer` are passed through from the underlying feed.
     *
     * @return roundId         Underlying round ID.
     * @return answer          USD per gram × 1e8 (gram price, not troy-oz price).
     * @return startedAt       Underlying round start timestamp.
     * @return updatedAt       Underlying round last-updated timestamp (NAVEngine uses
     *                         this for staleness check — passed through unchanged).
     * @return answeredInRound Underlying answeredInRound.
     */
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        int256 troyOzAnswer;
        (roundId, troyOzAnswer, startedAt, updatedAt, answeredInRound) =
            underlyingFeed.latestRoundData();

        // Guard: non-positive price from the underlying feed is propagated as-is.
        // The NAVEngine's own non-positive check will handle it.
        if (troyOzAnswer <= 0) {
            answer = troyOzAnswer;
            return (roundId, answer, startedAt, updatedAt, answeredInRound);
        }

        // Convert troy-ounce price to per-gram price.
        // troyOzAnswer × 1_000_000 / 31_103_500 ≡ troyOzAnswer / 31.1035
        answer = (troyOzAnswer * SCALE) / TROY_OZ_PER_GRAM_SCALED;
    }

    // ── Convenience views ─────────────────────────────────────────────────────

    /**
     * @notice Returns the raw (troy-ounce) price from the underlying Chainlink feed.
     *         Use for diagnostic comparison against the converted gram price.
     */
    function rawTroyOzPrice() external view returns (int256 troyOzAnswer, uint256 updatedAt) {
        uint80 _r; uint256 _s; uint80 _a;
        (_r, troyOzAnswer, _s, updatedAt, _a) = underlyingFeed.latestRoundData();
    }

    /**
     * @notice Returns the per-gram price as a convenience read (same math as latestRoundData).
     */
    function gramPrice() external view returns (int256 usdPerGram8dec) {
        uint80 _r; int256 troy; uint256 _s; uint256 _u; uint80 _a;
        (_r, troy, _s, _u, _a) = underlyingFeed.latestRoundData();
        if (troy <= 0) return troy;
        return (troy * SCALE) / TROY_OZ_PER_GRAM_SCALED;
    }
}
