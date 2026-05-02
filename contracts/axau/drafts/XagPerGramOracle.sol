// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/* ───────────────────────────────────────────────────────────────────────────────
 *  XAG-PER-GRAM ORACLE WRAPPER — DRAFT, NOT FOR DEPLOYMENT
 *  ─────────────────────────────────────────────────────────
 *  Status:        DRAFT — not deployed, not used in production.
 *  Document path: contracts/axau/drafts/XagPerGramOracle.sol
 *  Source spec:   documents/commodities/AXAG_KINESIS_GO_LIVE_PATH.md § 5.3
 *  Last updated:  2026-05-02 — corrected oracle address + L2 sequencer check
 *
 *  PURPOSE
 *  ───────
 *  Chainlink's XAG/USD feed (Arbitrum One: 0xC56765f04B248394CF1619D20dB8082Edbfa75b1)
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
 *  L2 SEQUENCER UPTIME CHECK
 *  ──────────────────────────
 *  On Arbitrum One, the sequencer can go offline. When it does, Chainlink feeds
 *  can return stale data that appears fresh. Arbitrum mandates an additional
 *  check against the Sequencer Uptime Feed before trusting any price feed.
 *
 *  Sequencer uptime feed (Arbitrum One): 0xFdB631F5EE196F0ed6FAa767959853A9F217697D
 *  Grace period: 3600 seconds (1 hour) after sequencer restart.
 *  If sequencer is down or in grace period, latestRoundData() reverts — the
 *  NAVEngine's own circuit-breaker handles the revert and pauses operations.
 *
 *  VERIFIED FEED ADDRESSES (Arbitrum One)
 *  ───────────────────────────────────────
 *    XAG/USD feed:          0xC56765f04B248394CF1619D20dB8082Edbfa75b1
 *    Sequencer uptime feed: 0xFdB631F5EE196F0ed6FAa767959853A9F217697D
 *    Source: docs.chain.link/data-feeds/price-feeds/addresses?network=arbitrum
 *    Verified: 2026-05-02
 *
 *  DEPLOYMENT PREDICATES (same as AXSilverVault.sol — all must be satisfied):
 *    See contracts/axau/drafts/README.md for the full gate list.
 * ─────────────────────────────────────────────────────────────────────────── */

import "../interfaces/IAXAU.sol";

/**
 * @title XagPerGramOracle
 * @notice Wraps the Chainlink XAG/USD (troy-ounce) feed on Arbitrum One and
 *         exposes it as a per-gram price feed with L2 sequencer uptime safety.
 *         Implements AggregatorV3Interface so the existing NAVEngine requires
 *         no modifications.
 *
 * @dev The wrapped XAG/USD feed address on Arbitrum One is:
 *         0xC56765f04B248394CF1619D20dB8082Edbfa75b1
 *      The L2 sequencer uptime feed on Arbitrum One is:
 *         0xFdB631F5EE196F0ed6FAa767959853A9F217697D
 *      Both addresses must be supplied at deploy time and verified on Arbiscan.
 *
 * @dev Staleness beyond the 24-hour heartbeat is caught by the NAVEngine's
 *      own `oracleStaleSecs` guard, which evaluates the `updatedAt` value
 *      passed through from the underlying feed. This contract does not
 *      duplicate that check.
 */
contract XagPerGramOracle is AggregatorV3Interface {

    // ── Constants ─────────────────────────────────────────────────────────────

    /// @notice Troy ounces per gram × 1e6 for fixed-point integer arithmetic.
    ///         31.1035 g/toz × 1_000_000 = 31_103_500.
    int256 public constant TROY_OZ_PER_GRAM_SCALED = 31_103_500;

    /// @notice Scaling factor applied before integer division to preserve precision.
    int256 public constant SCALE = 1_000_000;

    /// @notice Grace period after sequencer restart before the feed is trusted.
    ///         Arbitrum recommends a minimum of 3600 seconds (1 hour).
    uint256 public constant SEQUENCER_GRACE_PERIOD = 3600;

    // ── Immutables ────────────────────────────────────────────────────────────

    /// @notice The underlying Chainlink XAG/USD (troy-ounce) feed.
    ///         Arbitrum One: 0xC56765f04B248394CF1619D20dB8082Edbfa75b1
    AggregatorV3Interface public immutable underlyingFeed;

    /// @notice Chainlink L2 Sequencer Uptime Feed for Arbitrum One.
    ///         Arbitrum One: 0xFdB631F5EE196F0ed6FAa767959853A9F217697D
    AggregatorV3Interface public immutable sequencerUptimeFeed;

    // ── Errors ────────────────────────────────────────────────────────────────

    error SequencerDown();
    error GracePeriodNotOver(uint256 restartedAt, uint256 gracePeriodEndsAt);

    // ── Events ────────────────────────────────────────────────────────────────

    event UnderlyingFeedSet(address indexed feed);
    event SequencerFeedSet(address indexed feed);

    // ── Constructor ───────────────────────────────────────────────────────────

    /**
     * @param underlyingFeed_     Chainlink XAG/USD AggregatorV3 feed.
     *                            Arbitrum One: 0xC56765f04B248394CF1619D20dB8082Edbfa75b1
     * @param sequencerUptimeFeed_ Chainlink L2 Sequencer Uptime Feed.
     *                            Arbitrum One: 0xFdB631F5EE196F0ed6FAa767959853A9F217697D
     */
    constructor(address underlyingFeed_, address sequencerUptimeFeed_) {
        require(underlyingFeed_ != address(0), "XagPerGramOracle: zero feed");
        require(sequencerUptimeFeed_ != address(0), "XagPerGramOracle: zero sequencer feed");
        underlyingFeed = AggregatorV3Interface(underlyingFeed_);
        sequencerUptimeFeed = AggregatorV3Interface(sequencerUptimeFeed_);
        emit UnderlyingFeedSet(underlyingFeed_);
        emit SequencerFeedSet(sequencerUptimeFeed_);
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    /**
     * @dev Reverts if the Arbitrum sequencer is down or within the grace period.
     *      Must be called before reading any price data.
     *      answer == 0 means sequencer is UP; answer == 1 means sequencer is DOWN.
     */
    function _checkSequencer() internal view {
        (, int256 sequencerAnswer, uint256 startedAt,,) = sequencerUptimeFeed.latestRoundData();
        if (sequencerAnswer != 0) revert SequencerDown();
        uint256 gracePeriodEndsAt = startedAt + SEQUENCER_GRACE_PERIOD;
        if (block.timestamp < gracePeriodEndsAt) {
            revert GracePeriodNotOver(startedAt, gracePeriodEndsAt);
        }
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
     *         Reverts if the Arbitrum sequencer is down or in the grace period.
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
        _checkSequencer();

        int256 troyOzAnswer;
        (roundId, troyOzAnswer, startedAt, updatedAt, answeredInRound) =
            underlyingFeed.latestRoundData();

        if (troyOzAnswer <= 0) {
            answer = troyOzAnswer;
            return (roundId, answer, startedAt, updatedAt, answeredInRound);
        }

        answer = (troyOzAnswer * SCALE) / TROY_OZ_PER_GRAM_SCALED;
    }

    // ── Convenience views ─────────────────────────────────────────────────────

    /**
     * @notice Returns the raw (troy-ounce) price from the underlying Chainlink feed.
     *         Bypasses the sequencer check — diagnostic use only.
     */
    function rawTroyOzPrice() external view returns (int256 troyOzAnswer, uint256 updatedAt) {
        uint80 _r; uint256 _s; uint80 _a;
        (_r, troyOzAnswer, _s, updatedAt, _a) = underlyingFeed.latestRoundData();
    }

    /**
     * @notice Returns the per-gram price (same math as latestRoundData).
     *         Reverts if the sequencer is down or in the grace period.
     */
    function gramPrice() external view returns (int256 usdPerGram8dec) {
        _checkSequencer();
        uint80 _r; int256 troy; uint256 _s; uint256 _u; uint80 _a;
        (_r, troy, _s, _u, _a) = underlyingFeed.latestRoundData();
        if (troy <= 0) return troy;
        return (troy * SCALE) / TROY_OZ_PER_GRAM_SCALED;
    }

    /**
     * @notice Returns true if the sequencer is currently up and past the grace period.
     *         Safe to call any time — does not revert.
     */
    function sequencerIsLive() external view returns (bool) {
        try sequencerUptimeFeed.latestRoundData() returns (
            uint80, int256 seqAnswer, uint256 startedAt, uint256, uint80
        ) {
            return seqAnswer == 0 && block.timestamp >= startedAt + SEQUENCER_GRACE_PERIOD;
        } catch {
            return false;
        }
    }
}
