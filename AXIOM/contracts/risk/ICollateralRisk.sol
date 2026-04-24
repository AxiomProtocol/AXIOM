// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title  ICollateralRisk
 * @notice Shared interfaces for the on-chain Collateral Exploit Prevention
 *         framework. Mirrors the off-chain Collateral Risk Policy
 *         `2026-04-21.1` (documents/policies/collateral-risk-policy.md)
 *         in Solidity so the borrow / mint / collateral admission stack is
 *         fail-closed against:
 *           - invalid or impaired collateral
 *           - bridged or wrapped representations
 *           - synthetic receipts
 *           - staking / restaking derivatives
 *           - oracle manipulation
 *
 *         The framework is intentionally modular: each interface has a
 *         single, narrow responsibility so deployments can swap
 *         implementations (e.g. a dual-actor risk-config manager that
 *         requires a TimelockController + Guardian Safe) without
 *         touching the borrow / mint contracts that consume them.
 */

/// @notice Per-asset risk parameters. All bps fields use BPS = 10_000.
struct AssetRiskConfig {
    bool    enabled;            // master kill-switch; disabled assets fail-closed
    bool    coreCollateral;     // explicitly approved as core collateral
    bool    bridged;            // bridged representation (e.g. wormhole, axelar)
    bool    wrapped;            // wrapped derivative (e.g. wstETH, cbETH)
    bool    syntheticReceipt;   // synthetic / receipt token
    uint16  ltvMaxBps;          // maximum loan-to-value at borrow time
    uint16  liqThresholdBps;    // liquidation trigger threshold
    uint16  deviationCapBps;    // max permitted single-update price deviation
    uint16  haircutBps;         // valuation haircut applied at use
    uint32  oracleStalenessSecs; // max permitted oracle update age
    uint128 capCeiling;         // protocol-wide cap on outstanding exposure
    address validityAdapter;    // optional adapter for on-chain validity gate
}

/// @notice Validity adapter — returns true iff `assetId` is currently
///         eligible to back new exposure. Adapters MUST be view-only.
///         The default-deny adapter `BridgeReceiptDenyAdapter` returns
///         false for any bridged / wrapped / synthetic asset so the
///         framework defaults to "deny on absence of a matching adapter".
interface IAssetValidityAdapter {
    function isValid(bytes32 assetId, address asset) external view returns (bool);
    function reason(bytes32 assetId, address asset) external view returns (string memory);
}

/// @notice Incident controller — global and per-market kill switches.
///         GUARDIAN_ROLE flips trigger immediate fail-closed behaviour
///         in every consumer (borrow, mint, redeem) without waiting on
///         a timelock. Recovery requires an explicit GOVERNOR_ROLE
///         action through the normal governance path.
interface IIncidentController {
    function isGloballyHalted() external view returns (bool);
    function isMarketHalted(bytes32 marketId) external view returns (bool);
    function unwindMode(bytes32 marketId) external view returns (bool);
}

/// @notice Risk-config manager. Stores the per-asset `AssetRiskConfig`
///         and emits version-stamped events for every change. All
///         consumers read this contract directly — there is no in-memory
///         cache so a guardian flip is reflected on the next call.
interface IRiskConfigManager {
    event RiskConfigSet(
        bytes32 indexed assetId,
        address indexed asset,
        uint64 version,
        bool enabled,
        bool coreCollateral
    );
    event RiskConfigDisabled(bytes32 indexed assetId, address actor, string reason);
    event ValidityAdapterSet(bytes32 indexed assetId, address adapter);
    event GuardianSet(address indexed account, bool active);

    function getConfig(bytes32 assetId) external view returns (AssetRiskConfig memory);
    function isEnabled(bytes32 assetId) external view returns (bool);
    function isCoreCollateral(bytes32 assetId) external view returns (bool);
    function configVersion() external view returns (uint64);
}

/// @notice Exposure snapshot — total outstanding principal/notional for
///         a given assetId. Lending markets and mint controllers
///         implement this so the cap ceiling can be enforced at the
///         borrow path before disbursement.
interface IExposureSnapshot {
    function outstandingExposure(bytes32 assetId) external view returns (uint256);
}
