// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title IAXAU — Central interface definitions for the AXAU Reserve Unit suite.
 *         All contracts in contracts/axau/ import from this file.
 */

// ── Token ─────────────────────────────────────────────────────────────────────

interface IAXAU {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function isVerified(address account) external view returns (bool);
}

// ── NAV Engine ────────────────────────────────────────────────────────────────

interface INAVEngine {
    function totalBackingUsdWad() external view returns (uint256);
    function backingNavPerAXAUWad() external view returns (uint256);
    function mintNavPerAXAUWad() external view returns (uint256);
    function coverageRatioBps() external view returns (uint256);
}

// ── Commodity Registry ────────────────────────────────────────────────────────

interface ICommodityRegistry {
    struct Component {
        bytes32 id;
        address vault;
        address oracle;
        uint256 haircutBps;
        uint256 maxWeightBps;
        bool    isLiquid;
        bool    enabled;
        string  symbol;
        uint8   oracleDecimals;
        uint8   assetDecimals;  // cached from vault.reserveAsset().decimals(); 0 for land
        uint8   phase;
    }
    function getComponent(bytes32 id) external view returns (Component memory);
    function getAllComponentIds() external view returns (bytes32[] memory);
    function getAllComponents() external view returns (Component[] memory);
}

// ── Vault ─────────────────────────────────────────────────────────────────────

interface IVault {
    function reserveAsset() external view returns (address);
    function totalUnits() external view returns (uint256);
    /// @notice Called AFTER the controller has already transferred tokens to the vault.
    function notifyDeposit(uint256 tokenAmount) external;
    function withdrawToController(address to, uint256 tokenAmount) external;
    /// @notice Batch snapshot: (reserveAsset, totalUnits). Reduces calls-in-loop.
    function goldSnapshot() external view returns (address asset, uint256 units);
}

// ── Land Vault ────────────────────────────────────────────────────────────────

interface IAXLandVault {
    function totalValueUsdWad() external view returns (uint256);
    function isNavStale() external view returns (bool);
    /// @notice Batch snapshot: (totalValueUsdWad, isNavStale). Reduces calls-in-loop.
    function landSnapshot() external view returns (uint256 valueUsdWad, bool stale);
}

// ── Land NAV Oracle ───────────────────────────────────────────────────────────

interface ILandNAVOracle {
    /// @notice View: returns approved NAV if proposal is ready; 0 otherwise.
    function getApprovedNAV() external view returns (uint256 navUsdWad);
    /// @notice State change: marks the current proposal as consumed. Must be
    ///         called AFTER the caller has applied the NAV (CEI pattern).
    function markConsumed() external;
}

// ── Oracle ────────────────────────────────────────────────────────────────────

interface IOracle {
    function getQuote(uint256 inAmount, address base, address quote)
        external view returns (uint256 outAmount);
}

// ── Chainlink ─────────────────────────────────────────────────────────────────

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

// ── Minimal ERC-20 ────────────────────────────────────────────────────────────

interface IERC20Minimal {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

// ── Identity Registry ─────────────────────────────────────────────────────────

interface IIdentityRegistry {
    function isVerified(address userAddress) external view returns (bool);
}
