// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./ICollateralRisk.sol";

/**
 * @title  CollateralRiskConfig
 * @notice Canonical, version-stamped per-asset risk-parameter store.
 *         Implements `IRiskConfigManager` from `ICollateralRisk.sol`.
 *
 *         Roles:
 *           - GOVERNOR_ROLE: full configure/disable/enable. Intended to
 *             be a TimelockController in production.
 *           - GUARDIAN_ROLE: emergency `disable(assetId)` only — no
 *             timelock; can bring the system to a fail-closed state in
 *             a single tx in response to an incident.
 *
 *         Doctrine enforced on-chain:
 *           1. coreCollateral => bridged|wrapped|syntheticReceipt MUST be false
 *              (default-deny on bridged / wrapped / receipt collateral)
 *           2. ltvMaxBps <= liqThresholdBps <= 10_000
 *           3. deviationCapBps <= 5_000 (50% one-update cap is the absolute outer bound)
 *           4. setConfig increments `configVersion` → all decisions can be
 *              cited against the version that produced them
 *           5. disable(assetId) is idempotent and ALWAYS reduces privileges
 *              (never restores), so a guardian cannot accidentally re-enable.
 */
contract CollateralRiskConfig is IRiskConfigManager {

    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    uint16 public constant BPS                = 10_000;
    uint16 public constant MAX_DEVIATION_BPS  = 5_000;

    mapping(bytes32 => mapping(address => bool)) private _roles;
    mapping(bytes32 => AssetRiskConfig) private _configs;
    mapping(bytes32 => address)         private _assetAddrs;
    bytes32[] private _assetIds;
    mapping(bytes32 => bool) private _exists;

    uint64 private _version;

    event RoleGranted(bytes32 indexed role, address indexed account);
    event RoleRevoked(bytes32 indexed role, address indexed account);

    error InvalidConfig(string reason);
    error MissingRole(bytes32 role, address account);

    constructor(address governor, address guardian) {
        require(governor != address(0), "RiskCfg: zero governor");
        require(guardian != address(0), "RiskCfg: zero guardian");
        _grantRole(GOVERNOR_ROLE, governor);
        _grantRole(GUARDIAN_ROLE, guardian);
        _version = 1;
    }

    modifier onlyRole(bytes32 role) {
        if (!_roles[role][msg.sender]) revert MissingRole(role, msg.sender);
        _;
    }

    /// @notice Set or update a per-asset risk config. Reverts on any
    ///         doctrine violation listed in the contract NatSpec.
    function setConfig(
        bytes32 assetId,
        address asset,
        AssetRiskConfig calldata cfg
    ) external onlyRole(GOVERNOR_ROLE) {
        if (assetId == bytes32(0)) revert InvalidConfig("zero assetId");
        if (asset == address(0))   revert InvalidConfig("zero asset");

        // Doctrine 1: coreCollateral cannot be bridged / wrapped / synthetic.
        if (cfg.coreCollateral && (cfg.bridged || cfg.wrapped || cfg.syntheticReceipt)) {
            revert InvalidConfig("coreCollateral cannot be bridged/wrapped/receipt");
        }

        // Doctrine 2: bps bounds.
        if (cfg.ltvMaxBps > cfg.liqThresholdBps) revert InvalidConfig("ltv > liqThreshold");
        if (cfg.liqThresholdBps > BPS)           revert InvalidConfig("liqThreshold > 100%");
        if (cfg.haircutBps > BPS)                revert InvalidConfig("haircut > 100%");

        // Doctrine 3: deviation cap upper bound.
        if (cfg.deviationCapBps > MAX_DEVIATION_BPS) {
            revert InvalidConfig("deviationCap > MAX_DEVIATION_BPS");
        }

        // Doctrine 4: enabled assets MUST have a non-zero oracle staleness
        // window; an asset with zero staleness window is unusable but not
        // unsafe, so we only require it for enabled configs.
        if (cfg.enabled && cfg.oracleStalenessSecs == 0) {
            revert InvalidConfig("enabled requires oracleStalenessSecs > 0");
        }

        if (!_exists[assetId]) {
            _exists[assetId] = true;
            _assetIds.push(assetId);
        }
        _configs[assetId]    = cfg;
        _assetAddrs[assetId] = asset;
        unchecked { _version += 1; }

        emit RiskConfigSet(assetId, asset, _version, cfg.enabled, cfg.coreCollateral);
        if (cfg.validityAdapter != address(0)) {
            emit ValidityAdapterSet(assetId, cfg.validityAdapter);
        }
    }

    /// @notice Emergency disable. Either GOVERNOR_ROLE or GUARDIAN_ROLE
    ///         may invoke; idempotent; never re-enables.
    function disable(bytes32 assetId, string calldata reason) external {
        if (!_roles[GOVERNOR_ROLE][msg.sender] && !_roles[GUARDIAN_ROLE][msg.sender]) {
            revert MissingRole(GUARDIAN_ROLE, msg.sender);
        }
        AssetRiskConfig storage c = _configs[assetId];
        if (!_exists[assetId]) revert InvalidConfig("unknown assetId");
        if (!c.enabled) return; // idempotent
        c.enabled = false;
        unchecked { _version += 1; }
        emit RiskConfigDisabled(assetId, msg.sender, reason);
    }

    /// @notice Re-enable an asset. GOVERNOR_ROLE only.
    function enable(bytes32 assetId) external onlyRole(GOVERNOR_ROLE) {
        if (!_exists[assetId]) revert InvalidConfig("unknown assetId");
        AssetRiskConfig storage c = _configs[assetId];
        if (c.enabled) return;
        if (c.oracleStalenessSecs == 0) revert InvalidConfig("enable requires oracleStalenessSecs > 0");
        c.enabled = true;
        unchecked { _version += 1; }
        emit RiskConfigSet(assetId, _assetAddrs[assetId], _version, true, c.coreCollateral);
    }

    function setValidityAdapter(bytes32 assetId, address adapter)
        external onlyRole(GOVERNOR_ROLE)
    {
        if (!_exists[assetId]) revert InvalidConfig("unknown assetId");
        _configs[assetId].validityAdapter = adapter;
        unchecked { _version += 1; }
        emit ValidityAdapterSet(assetId, adapter);
    }

    function getConfig(bytes32 assetId) external view returns (AssetRiskConfig memory) {
        return _configs[assetId];
    }

    function isEnabled(bytes32 assetId) external view returns (bool) {
        return _configs[assetId].enabled;
    }

    function isCoreCollateral(bytes32 assetId) external view returns (bool) {
        AssetRiskConfig storage c = _configs[assetId];
        return c.enabled && c.coreCollateral;
    }

    function configVersion() external view returns (uint64) {
        return _version;
    }

    function assetCount() external view returns (uint256) {
        return _assetIds.length;
    }

    function assetIdAt(uint256 i) external view returns (bytes32) {
        return _assetIds[i];
    }

    function assetAddress(bytes32 assetId) external view returns (address) {
        return _assetAddrs[assetId];
    }

    // ── Roles ────────────────────────────────────────────────────────────────

    function grantRole(bytes32 role, address account) external onlyRole(GOVERNOR_ROLE) {
        require(account != address(0), "RiskCfg: zero account");
        _grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) external onlyRole(GOVERNOR_ROLE) {
        require(_roles[role][account], "RiskCfg: not granted");
        _roles[role][account] = false;
        emit RoleRevoked(role, account);
    }

    function hasRole(bytes32 role, address account) external view returns (bool) {
        return _roles[role][account];
    }

    function _grantRole(bytes32 role, address account) internal {
        _roles[role][account] = true;
        emit RoleGranted(role, account);
        if (role == GUARDIAN_ROLE) emit GuardianSet(account, true);
    }
}
