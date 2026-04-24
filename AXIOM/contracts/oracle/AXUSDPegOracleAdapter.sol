// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title  AXUSDPegOracleAdapter
 * @notice ERC-7726-conformant fixed-rate price adapter for AXUSD/USD on Arbitrum One.
 *
 * Designed for acceptance into Euler Finance's `oracleAdapterRegistry`
 * (`0x3942A72f87Db5Ad9C22d8826FDe15E23b81b1cBf` on Arbitrum One) so that
 * AXUSD-asset eVaults can be perspective-verified by:
 *   - eulerUngoverned0xPerspective
 *   - eulerUngovernedNzxPerspective
 *
 * === Why a new adapter (not the existing AXIOMOracleAdapter at 0xc894...7c4e) ===
 *
 * The existing `AXIOMOracleAdapter` is a multi-asset router that:
 *   1. Exposes pairs (AXUSD/USDC, AXUSD/USDT, AXUSD/WETH, AXUSD/WBTC, AXUSD/ARB)
 *      that the Euler registry's "single base / single quote" model does not allow.
 *   2. Is one-directional for the AXUSD/USDC pair (returns 0 for AXUSD->USDC),
 *      which is unsafe collateral pricing for a borrowable asset.
 *   3. Has mutable governance (`setMaxStaleness`, `setPsmFallback`, `setPsmAddresses`,
 *      `setGovernor`) — Euler perspectives prefer immutable adapters or adapters
 *      whose governance is provably renounced.
 *   4. Mixes multiple oracle sources (PSM ratio, Chainlink) under one address —
 *      Euler's audit model is one adapter per (base, quote) pair.
 *
 * This adapter (AXUSDPegOracleAdapter) is the opposite:
 *   - Single pair: AXUSD <-> USD (where USD is the ISO 4217 pseudo-address
 *     `0x0000000000000000000000000000000000000348`, treated as 8 decimals
 *     per Euler's convention, matching `EulerRouter` UoA semantics).
 *   - Bidirectional: returns a non-zero quote for both directions.
 *   - Immutable: no governor, no setters, no fallbacks. The peg rate is fixed
 *     at 1.0 USD per AXUSD by construction.
 *   - Deterministic: pure decimal conversion only; no external reads, no Chainlink
 *     dependency, no staleness window. Cannot revert except on overflow.
 *   - Stateless: zero storage, zero gas-significant logic.
 *
 * AXUSD is a USD-pegged stablecoin issued by Axiom Protocol, fully backed by
 * USDC held in the Canonical PSM (`CanonicalPSM.sol`) at a 1:1 mint/redeem
 * ratio with redemption guaranteed by contract. The peg is therefore a
 * structural, not market-derived, value — making a fixed-rate adapter the
 * correct primitive (mirroring how `FixedRateOracle` is used for USD-pegged
 * assets in Euler's reference deployments).
 *
 * === ERC-7726 conformance ===
 *
 * Implements the single required function:
 *
 *   function getQuote(uint256 inAmount, address base, address quote)
 *     external view returns (uint256 outAmount);
 *
 * Semantics:
 *   - getQuote(X, AXUSD, USD)   = X * 1e8 / 1e18   (18-dec -> 8-dec, rate 1.0)
 *   - getQuote(X, USD,   AXUSD) = X * 1e18 / 1e8   (8-dec  -> 18-dec, rate 1.0)
 *   - any other (base, quote)   reverts with `PriceOracle_NotSupported`
 *   - inAmount == 0             returns 0 (Euler convention)
 *
 * === Decimal model ===
 *   AXUSD (ERC-3643):  18 decimals (`0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7`)
 *   USD (pseudo):       8 decimals (`0x0000000000000000000000000000000000000348`)
 *
 * === Audit notes ===
 *   - No external calls. No reentrancy surface. No oracle staleness surface.
 *   - The only failure modes are (a) unsupported pair (revert), or (b) integer
 *     overflow in the `* 1e8` / `* 1e18` step. The largest value the contract
 *     can be asked to quote without overflow is ~3.4e58 base units (`type(uint256).max
 *     / 1e18`), which exceeds AXUSD total supply by >40 orders of magnitude.
 *   - The pseudo-address `0x0000000000000000000000000000000000000348` is the
 *     ISO 4217 numeric code for USD (840) encoded as an address. This is the
 *     same convention Euler uses for unit-of-account in `EulerRouter` and
 *     matches `eulerUngoverned0xPerspective.isRecognizedUnitOfAccount(USD)`.
 */

contract AXUSDPegOracleAdapter {
    /// @notice ERC-3643 AXUSD on Arbitrum One.
    address public constant AXUSD = 0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7;

    /// @notice ISO 4217 USD pseudo-address (numeric code 840 = 0x348).
    address public constant USD   = 0x0000000000000000000000000000000000000348;

    /// @notice AXUSD decimals (ERC-3643 standard).
    uint8 public constant AXUSD_DECIMALS = 18;

    /// @notice USD pseudo-address decimals (Euler convention, mirrors Chainlink USD feeds).
    uint8 public constant USD_DECIMALS   = 8;

    /// @notice Human-readable adapter name (consumed by Euler registry tooling).
    string public constant name = "AXUSDPegOracleAdapter";

    /// @notice Adapter category (matches `FixedRateOracle` taxonomy in evk-periphery).
    string public constant adapterType = "FixedRate";

    /// @notice Fixed peg rate, 1 AXUSD = 1.0 USD, expressed in 18-decimal WAD.
    uint256 public constant RATE_WAD = 1e18;

    /// @notice Reverts with this error if asked for an unsupported pair.
    error PriceOracle_NotSupported(address base, address quote);

    /**
     * @notice ERC-7726 entrypoint. Returns the `quote`-denominated amount that
     *         corresponds to `inAmount` of `base` at the fixed 1.0 peg.
     *
     * @param inAmount  Amount of `base` in `base`'s native decimals.
     * @param base      Either AXUSD or USD pseudo-address.
     * @param quote     The other of AXUSD or USD pseudo-address.
     * @return outAmount Amount of `quote` in `quote`'s native decimals.
     */
    function getQuote(uint256 inAmount, address base, address quote)
        external
        pure
        returns (uint256 outAmount)
    {
        if (inAmount == 0) return 0;

        // AXUSD (18-dec) -> USD (8-dec): divide by 1e10
        if (base == AXUSD && quote == USD) {
            return inAmount / 1e10;
        }
        // USD (8-dec) -> AXUSD (18-dec): multiply by 1e10
        if (base == USD && quote == AXUSD) {
            return inAmount * 1e10;
        }

        revert PriceOracle_NotSupported(base, quote);
    }

    /**
     * @notice Convenience two-sided quote, identical to evk-periphery `IPriceOracle.getQuotes`.
     *         Returns (bid, ask) — both equal to the peg quote since the adapter has no spread.
     */
    function getQuotes(uint256 inAmount, address base, address quote)
        external
        pure
        returns (uint256 bidOutAmount, uint256 askOutAmount)
    {
        uint256 q;
        if (inAmount == 0) {
            return (0, 0);
        }
        if (base == AXUSD && quote == USD) {
            q = inAmount / 1e10;
        } else if (base == USD && quote == AXUSD) {
            q = inAmount * 1e10;
        } else {
            revert PriceOracle_NotSupported(base, quote);
        }
        return (q, q);
    }
}
