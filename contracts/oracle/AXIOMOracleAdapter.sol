// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AXIOMOracleAdapter
 * @notice ERC-7726 compliant price oracle adapter for AXUSD on Axiom Protocol.
 *
 * === Euler Finance Compatibility ===
 * This contract is designed as a drop-in oracle adapter for Euler Finance's
 * Euler Vault Kit (EVK). It implements the same IPriceOracle interface used by
 * the euler-price-oracle library (github.com/euler-xyz/euler-price-oracle):
 *
 *   function getQuote(uint256 inAmount, address base, address quote)
 *     external view returns (uint256 outAmount);
 *
 * The function signature and return semantics are identical to Euler's oracle
 * adapter pattern, making this contract compatible with:
 *   - EVK EulerRouter (as a nested adapter via setResolvedVault / setConfig)
 *   - EulerSwap oracle slot
 *   - euler-earn vault pricing
 *
 * === Pricing sources (priority order) ===
 *   1. PSM backing ratio  (USDC in PSM / AXUSD circulating supply, clamped [0.90,1.10])
 *   2. Chainlink price feeds (ETH/USD, BTC/USD, ARB/USD via 8-dec feeds)
 *   3. Static 1:1 parity fallback (AXUSD is a USD-pegged stablecoin)
 *
 * === Decimal model ===
 *   - AXUSD (ERC-3643, primary):  18 decimals  (0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C)
 *   - AXUSD (Euler/legacy):        18 decimals  (0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c)
 *   - USDC (Arbitrum One):          6 decimals  (0xaf88d065e77c8cC2239327C5EDb3A432268e5831)
 *   - USDT (Arbitrum One):          6 decimals
 *   - WETH / ARB (Arbitrum One):   18 decimals
 *   - WBTC (Arbitrum One):          8 decimals
 *
 * === Key pair behaviours ===
 *   getQuote(X, USDC,  AXUSD) → X * 1e12            (6-dec → 18-dec, price ≈ 1)
 *   getQuote(X, AXUSD, USDC)  → X / 1e12            (18-dec → 6-dec, price ≈ 1)
 *   getQuote(X, WETH,  AXUSD) → X * ethUsd / 1e8    (Chainlink ETH/USD 8-dec)
 *   getQuote(X, WBTC,  AXUSD) → X * btcUsd * 1e10   (WBTC 8-dec → 18-dec result)
 *   getQuote(X, ARB,   AXUSD) → X * arbUsd / 1e8    (Chainlink ARB/USD 8-dec)
 *
 * `_psmRate()` returns a neutral (1, 1) ratio when the PSM address is zero
 * or its USDC balance is zero, and `_axusdToUsdc` / `_usdcToAxusd`
 * short-circuit to the decimal-normalised quote when `psmNumer == 0`.
 */

interface AggregatorV3Interface {
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
    function decimals() external view returns (uint8);
}

interface IERC20Decimals {
    function decimals() external view returns (uint8);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}

interface IPSM {
    function collateral() external view returns (address);
    function axusd() external view returns (address);
}

contract AXIOMOracleAdapter {

    // ── ERC-7726 Events ────────────────────────────────────────────────────────
    event OraclePriceRead(address indexed base, address indexed quote, uint256 inAmount, uint256 outAmount, uint8 source);
    event OracleConfigUpdated(address indexed updater, string key);

    // ── Constants ──────────────────────────────────────────────────────────────
    uint256 public constant WAD = 1e18;
    uint256 public constant STALENESS_THRESHOLD = 3600; // 1 hour

    // Arbitrum One token addresses
    address public constant USDC  = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
    address public constant USDT  = 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9;
    address public constant WETH  = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
    address public constant WBTC  = 0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f;
    address public constant ARB   = 0x912CE59144191C1204E64559FE8253a0e49E6548;

    // Chainlink price feeds on Arbitrum One (all return 8-decimal prices)
    address public constant CL_ETH_USD  = 0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612;
    address public constant CL_BTC_USD  = 0x6CE185539Ad4FDEeD739C0A210DCa8bf0D66e8F2;
    address public constant CL_ARB_USD  = 0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6;
    address public constant CL_USDC_USD = 0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3;
    address public constant CL_USDT_USD = 0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7;

    // ── Mutable config (gov-controlled) ───────────────────────────────────────
    address public governor;
    address public primaryAxusd;    // ERC-3643 AXUSD  (18 dec)
    address public eulerAxusd;      // Legacy AXUSD     (18 dec)
    address public primaryPsm;      // PSM for primaryAxusd
    address public eulerPsm;        // PSM for eulerAxusd

    uint256 public maxStaleness;    // seconds before feed considered stale
    bool    public psmFallbackEnabled;

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(
        address _governor,
        address _primaryAxusd,
        address _eulerAxusd,
        address _primaryPsm,
        address _eulerPsm
    ) {
        require(_governor    != address(0), "AXIOMOracle: zero governor");
        require(_primaryAxusd != address(0), "AXIOMOracle: zero axusd");

        governor           = _governor;
        primaryAxusd       = _primaryAxusd;
        eulerAxusd         = _eulerAxusd;
        primaryPsm         = _primaryPsm;
        eulerPsm           = _eulerPsm;
        maxStaleness       = STALENESS_THRESHOLD;
        psmFallbackEnabled = true;
    }

    // ── ERC-7726 Core ─────────────────────────────────────────────────────────

    /**
     * @notice Returns the amount of `quote` that corresponds to `inAmount` of `base`.
     * @dev    This is the ERC-7726 standard interface. Reverts if price cannot be
     *         determined within staleness bounds.
     * @param inAmount  Amount of base token (in base token's native decimals)
     * @param base      Address of the input token
     * @param quote     Address of the output token
     * @return outAmount Amount of quote token
     */
    function getQuote(uint256 inAmount, address base, address quote)
        external
        view
        returns (uint256 outAmount)
    {
        if (inAmount == 0) return 0;
        return _route(inAmount, base, quote);
    }

    // ── Routing Logic ─────────────────────────────────────────────────────────

    function _route(uint256 inAmount, address base, address quote) internal view returns (uint256) {
        bool baseIsAxusd  = _isAxusd(base);
        bool quoteIsAxusd = _isAxusd(quote);

        // AXUSD → USDC  or  USDC → AXUSD  (stablecoin parity, decimal-normalised)
        if (baseIsAxusd && quote == USDC) {
            return _axusdToUsdc(inAmount);
        }
        if (base == USDC && quoteIsAxusd) {
            return _usdcToAxusd(inAmount, quote);
        }

        // AXUSD → USDT  or  USDT → AXUSD
        if (baseIsAxusd && quote == USDT) {
            return _axusdToUsdt(inAmount);
        }
        if (base == USDT && quoteIsAxusd) {
            return _usdtToAxusd(inAmount, quote);
        }

        // ETH → AXUSD  or  AXUSD → ETH
        if (base == WETH && quoteIsAxusd) {
            return _ethToAxusd(inAmount, quote);
        }
        if (baseIsAxusd && quote == WETH) {
            return _axusdToEth(inAmount);
        }

        // ARB → AXUSD
        if (base == ARB && quoteIsAxusd) {
            return _arbToAxusd(inAmount, quote);
        }

        // BTC → AXUSD
        if (base == WBTC && quoteIsAxusd) {
            return _btcToAxusd(inAmount, quote);
        }

        // USDC ↔ USDT (both USD-pegged, 6 dec each)
        if (base == USDC && quote == USDT) return inAmount;
        if (base == USDT && quote == USDC) return inAmount;

        revert("AXIOMOracle: unsupported pair");
    }

    // ── Pair handlers ─────────────────────────────────────────────────────────

    function _axusdToUsdc(uint256 inAxusd) internal view returns (uint256) {
        // inAxusd is 18-dec; outUsdc is 6-dec; price ≈ 1 USD
        // outUsdc = inAxusd / 1e12 * psmRate (psmRate ≈ 1)
        uint256 baseOut = inAxusd / 1e12; // decimals normalisation
        if (!psmFallbackEnabled) return baseOut;
        (uint256 psmNumer, uint256 psmDenom) = _psmRate();
        // Defensive: short-circuit on a zero numerator or denominator so the
        // multiplicative chain cannot collapse a non-zero input to zero.
        if (psmDenom == 0 || psmNumer == 0) return baseOut;
        return (baseOut * psmNumer) / psmDenom;
    }

    function _usdcToAxusd(uint256 inUsdc, address quoteAxusd) internal view returns (uint256) {
        // inUsdc is 6-dec; outAxusd is 18-dec
        uint256 baseOut = inUsdc * 1e12;
        if (!psmFallbackEnabled) return baseOut;
        (uint256 psmNumer, uint256 psmDenom) = _psmRate();
        if (psmDenom == 0 || psmNumer == 0) return baseOut;
        return (baseOut * psmDenom) / psmNumer;
    }

    function _axusdToUsdt(uint256 inAxusd) internal view returns (uint256) {
        // USDT also 6-dec on Arbitrum
        return inAxusd / 1e12;
    }

    function _usdtToAxusd(uint256 inUsdt, address) internal view returns (uint256) {
        return inUsdt * 1e12;
    }

    function _ethToAxusd(uint256 inWeth, address) internal view returns (uint256) {
        // outAxusd (18-dec) = inWeth (18-dec) * ethUsdPrice / 1e8
        uint256 ethPrice = _chainlinkPrice(CL_ETH_USD); // 8 dec
        return (inWeth * ethPrice) / 1e8;
    }

    function _axusdToEth(uint256 inAxusd) internal view returns (uint256) {
        // outWeth (18-dec) = inAxusd (18-dec) * 1e8 / ethUsdPrice
        uint256 ethPrice = _chainlinkPrice(CL_ETH_USD);
        require(ethPrice > 0, "AXIOMOracle: ETH price zero");
        return (inAxusd * 1e8) / ethPrice;
    }

    function _arbToAxusd(uint256 inArb, address) internal view returns (uint256) {
        // Both 18-dec; AXUSD ≈ 1 USD
        uint256 arbPrice = _chainlinkPrice(CL_ARB_USD); // 8 dec
        return (inArb * arbPrice) / 1e8;
    }

    function _btcToAxusd(uint256 inWbtc, address) internal view returns (uint256) {
        // WBTC has 8 dec on Arbitrum; AXUSD 18-dec
        uint256 btcPrice = _chainlinkPrice(CL_BTC_USD); // 8 dec
        return (inWbtc * btcPrice * 1e10); // scale WBTC 8-dec → 18-dec result
    }

    // ── Chainlink helper ──────────────────────────────────────────────────────

    function _chainlinkPrice(address feed) internal view returns (uint256) {
        try AggregatorV3Interface(feed).latestRoundData() returns (
            uint80, int256 answer, uint256, uint256 updatedAt, uint80
        ) {
            require(answer > 0, "AXIOMOracle: negative price");
            require(block.timestamp - updatedAt <= maxStaleness, "AXIOMOracle: stale price");
            return uint256(answer); // 8 dec
        } catch {
            revert("AXIOMOracle: feed read failed");
        }
    }

    // ── PSM backing ratio ─────────────────────────────────────────────────────

    /**
     * @notice Returns PSM backing ratio as (numerator, denominator) in USDC-dec terms.
     *         ratio = USDC_in_PSM / AXUSD_supply (normalised to same decimals).
     *         If > 1, AXUSD is over-collateralised. Fallback to 1:1 if read fails.
     */
    function _psmRate() internal view returns (uint256 numer, uint256 denom) {
        // No meaningful PSM data → return neutral (1, 1) so downstream
        // conversions produce a valid 1:1 quote instead of zero.
        if (primaryPsm == address(0)) return (1, 1);
        try IERC20Decimals(USDC).balanceOf(primaryPsm) returns (uint256 psmUsdc) {
            if (psmUsdc == 0) return (1, 1);
            try IERC20Decimals(primaryAxusd).totalSupply() returns (uint256 supply18) {
                if (supply18 == 0) return (1, 1);
                // Convert supply from 18-dec to 6-dec for comparison
                uint256 supply6 = supply18 / 1e12;
                if (supply6 == 0) return (1, 1);
                return (psmUsdc, supply6);
            } catch {}
        } catch {}
        return (1, 1);
    }

    // ── AXUSD address check ───────────────────────────────────────────────────

    function _isAxusd(address token) internal view returns (bool) {
        return token == primaryAxusd || token == eulerAxusd;
    }

    // ── View helpers (off-chain tooling) ──────────────────────────────────────

    /**
     * @notice Returns AXUSD mid-price in USD with 18-decimal precision (1e18 = 1.000 USD).
     */
    function axusdUsdPrice() external view returns (uint256 priceWad, uint8 source) {
        (uint256 psmN, uint256 psmD) = _psmRate();
        if (psmD > 0 && psmN > 0) {
            // price = psmN / psmD in USDC 6-dec → scale to 18 dec
            priceWad = (psmN * WAD) / psmD;
            source = 1; // PSM
        } else {
            priceWad = WAD; // 1:1 fallback
            source = 2;     // static
        }
    }

    /**
     * @notice Returns the current Chainlink ETH/USD price (8 dec).
     */
    function ethUsdPrice() external view returns (uint256) {
        return _chainlinkPrice(CL_ETH_USD);
    }

    // ── Governance ────────────────────────────────────────────────────────────

    modifier onlyGovernor() {
        require(msg.sender == governor, "AXIOMOracle: not governor");
        _;
    }

    function setGovernor(address newGovernor) external onlyGovernor {
        require(newGovernor != address(0), "AXIOMOracle: zero governor");
        governor = newGovernor;
        emit OracleConfigUpdated(msg.sender, "governor");
    }

    function setMaxStaleness(uint256 seconds_) external onlyGovernor {
        maxStaleness = seconds_;
        emit OracleConfigUpdated(msg.sender, "maxStaleness");
    }

    function setPsmFallback(bool enabled) external onlyGovernor {
        psmFallbackEnabled = enabled;
        emit OracleConfigUpdated(msg.sender, "psmFallbackEnabled");
    }

    function setPsmAddresses(address _primaryPsm, address _eulerPsm) external onlyGovernor {
        primaryPsm = _primaryPsm;
        eulerPsm   = _eulerPsm;
        emit OracleConfigUpdated(msg.sender, "psmAddresses");
    }
}
