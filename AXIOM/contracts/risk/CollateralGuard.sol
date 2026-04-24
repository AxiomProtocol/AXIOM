// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./ICollateralRisk.sol";

/**
 * @title  CollateralGuard
 * @notice Single fail-closed entry-point for the borrow / mint / collateral
 *         admission stack. Composes:
 *
 *           1. IncidentController  — global + per-market halt & unwind
 *           2. RiskConfigManager   — per-asset enabled / cap / ltv / haircut
 *           3. ValidityAdapter     — optional per-asset validity check
 *
 *         Consumers (AXIOMFixedLoan, MintRedeemController, future cap-infra
 *         lending markets) call `requireBorrowAllowed(...)` immediately
 *         before disbursement. Reverts must be specific so off-chain
 *         observability can attribute the deny to the correct rule.
 *
 *         The guard is itself a thin contract and holds no value; it
 *         can be upgraded by changing the addresses on each consumer
 *         without redeploying the consumer.
 */
contract CollateralGuard {

    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");

    IRiskConfigManager  public riskConfig;
    IIncidentController public incident;

    address public governor;

    event GuardConfigured(address riskConfig, address incident);
    event BorrowAdmitted(
        bytes32 indexed marketId,
        bytes32 indexed assetId,
        uint256 amount,
        uint256 outstandingAfter,
        uint64  configVersion
    );

    error GuardNotConfigured();
    error GloballyHalted();
    error MarketHaltedErr(bytes32 marketId);
    error MarketInUnwind(bytes32 marketId);
    error AssetDisabled(bytes32 assetId);
    error AssetIneligible(bytes32 assetId, string reason);
    error CapExceeded(bytes32 assetId, uint256 requested, uint256 outstanding, uint256 cap);
    error NotGovernor();

    constructor(address governor_, address riskConfig_, address incident_) {
        require(governor_ != address(0), "Guard: zero governor");
        governor = governor_;
        if (riskConfig_ != address(0)) riskConfig = IRiskConfigManager(riskConfig_);
        if (incident_   != address(0)) incident   = IIncidentController(incident_);
        emit GuardConfigured(riskConfig_, incident_);
    }

    modifier onlyGovernor() {
        if (msg.sender != governor) revert NotGovernor();
        _;
    }

    function setRiskConfig(address riskConfig_) external onlyGovernor {
        riskConfig = IRiskConfigManager(riskConfig_);
        emit GuardConfigured(riskConfig_, address(incident));
    }

    function setIncidentController(address incident_) external onlyGovernor {
        incident = IIncidentController(incident_);
        emit GuardConfigured(address(riskConfig), incident_);
    }

    function setGovernor(address governor_) external onlyGovernor {
        require(governor_ != address(0), "Guard: zero governor");
        governor = governor_;
    }

    /**
     * @notice Fail-closed admission check for a new borrow / mint.
     *
     * @param marketId         bytes32 id of the consuming market (e.g. AXIOMFixedLoan)
     * @param assetId          bytes32 id of the collateral being deposited
     * @param amount           amount of collateral notional being added
     * @param currentOutstanding existing outstanding exposure for assetId
     *                         (caller-provided so the guard does not have to
     *                          know about each consumer's state shape)
     *
     * @dev    Order of checks (each emits a specific error so off-chain
     *         observability can attribute the deny):
     *           1. guard configured (defensive — both deps must be set)
     *           2. global halt
     *           3. market halt
     *           4. market unwind mode (new borrows denied)
     *           5. asset enabled
     *           6. coreCollateral OR validity adapter says yes
     *           7. cap ceiling not exceeded
     */
    function requireBorrowAllowed(
        bytes32 marketId,
        bytes32 assetId,
        address asset,
        uint256 amount,
        uint256 currentOutstanding
    ) external returns (uint64 versionUsed) {
        if (address(riskConfig) == address(0) || address(incident) == address(0)) {
            revert GuardNotConfigured();
        }
        if (incident.isGloballyHalted())            revert GloballyHalted();
        if (incident.isMarketHalted(marketId))      revert MarketHaltedErr(marketId);
        if (incident.unwindMode(marketId))          revert MarketInUnwind(marketId);

        AssetRiskConfig memory c = riskConfig.getConfig(assetId);
        if (!c.enabled) revert AssetDisabled(assetId);

        // Default-deny: bridged/wrapped/synthetic assets MUST also be
        // explicitly approved as core collateral OR pass a validity adapter.
        bool needsAdapter = (c.bridged || c.wrapped || c.syntheticReceipt) && !c.coreCollateral;
        if (needsAdapter) {
            if (c.validityAdapter == address(0)) {
                revert AssetIneligible(assetId, "bridged/wrapped/receipt requires validity adapter");
            }
            try IAssetValidityAdapter(c.validityAdapter).isValid(assetId, asset) returns (bool ok) {
                if (!ok) {
                    string memory why;
                    try IAssetValidityAdapter(c.validityAdapter).reason(assetId, asset) returns (string memory r) {
                        why = r;
                    } catch { why = "validity adapter denied"; }
                    revert AssetIneligible(assetId, why);
                }
            } catch {
                revert AssetIneligible(assetId, "validity adapter reverted");
            }
        } else if (c.validityAdapter != address(0)) {
            // Optional adapter on a non-bridged asset still gets consulted.
            try IAssetValidityAdapter(c.validityAdapter).isValid(assetId, asset) returns (bool ok) {
                if (!ok) revert AssetIneligible(assetId, "validity adapter denied");
            } catch {
                revert AssetIneligible(assetId, "validity adapter reverted");
            }
        }

        // Cap ceiling check — uses caller-supplied outstanding so the
        // guard does not need to know each consumer's state shape.
        if (c.capCeiling > 0) {
            uint256 newOutstanding = currentOutstanding + amount;
            if (newOutstanding > uint256(c.capCeiling)) {
                revert CapExceeded(assetId, amount, currentOutstanding, c.capCeiling);
            }
        }

        versionUsed = riskConfig.configVersion();
        emit BorrowAdmitted(marketId, assetId, amount, currentOutstanding + amount, versionUsed);
    }

    /// @notice View-only mirror of `requireBorrowAllowed` — does not emit
    ///         and never reverts, returns (allowed, reasonCode). Useful
    ///         for off-chain dry-runs and operator console quick checks.
    function checkBorrowAllowed(
        bytes32 marketId,
        bytes32 assetId,
        address asset,
        uint256 amount,
        uint256 currentOutstanding
    ) external view returns (bool allowed, string memory why) {
        if (address(riskConfig) == address(0) || address(incident) == address(0))
            return (false, "guard_not_configured");
        if (incident.isGloballyHalted())          return (false, "global_halt");
        if (incident.isMarketHalted(marketId))    return (false, "market_halt");
        if (incident.unwindMode(marketId))        return (false, "market_unwind");

        AssetRiskConfig memory c = riskConfig.getConfig(assetId);
        if (!c.enabled) return (false, "asset_disabled");

        bool needsAdapter = (c.bridged || c.wrapped || c.syntheticReceipt) && !c.coreCollateral;
        if (needsAdapter && c.validityAdapter == address(0))
            return (false, "needs_validity_adapter");
        if (c.validityAdapter != address(0)) {
            try IAssetValidityAdapter(c.validityAdapter).isValid(assetId, asset) returns (bool ok) {
                if (!ok) return (false, "validity_adapter_denied");
            } catch { return (false, "validity_adapter_reverted"); }
        }
        if (c.capCeiling > 0 && currentOutstanding + amount > uint256(c.capCeiling))
            return (false, "cap_exceeded");
        return (true, "ok");
    }
}
