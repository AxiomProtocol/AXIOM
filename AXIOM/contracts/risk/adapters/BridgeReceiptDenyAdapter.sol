// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../ICollateralRisk.sol";

/**
 * @title  BridgeReceiptDenyAdapter
 * @notice Default-deny validity adapter for bridged / wrapped / receipt
 *         tokens. Maintains an explicit allow-list (asset → bool); any
 *         asset not on the list is denied. Use this as the default
 *         adapter for any AssetRiskConfig where bridged/wrapped/receipt
 *         is true.
 *
 *         Doctrine: the protocol does NOT trust bridged or wrapped
 *         representations of value as core collateral. An asset must be
 *         explicitly approved via `setApproved(asset, true)` after a
 *         dual-actor risk review.
 */
contract BridgeReceiptDenyAdapter is IAssetValidityAdapter {

    address public governor;
    mapping(address => bool) public approved;
    mapping(address => string) public reasonOverride;

    event ApprovalSet(address indexed asset, bool approved, string reason);
    event GovernorChanged(address indexed previous, address indexed next);

    error NotGovernor();

    constructor(address governor_) {
        require(governor_ != address(0), "BridgeDeny: zero governor");
        governor = governor_;
    }

    modifier onlyGovernor() {
        if (msg.sender != governor) revert NotGovernor();
        _;
    }

    function setApproved(address asset, bool approved_, string calldata reason_)
        external onlyGovernor
    {
        approved[asset] = approved_;
        reasonOverride[asset] = reason_;
        emit ApprovalSet(asset, approved_, reason_);
    }

    function setGovernor(address governor_) external onlyGovernor {
        require(governor_ != address(0), "BridgeDeny: zero governor");
        emit GovernorChanged(governor, governor_);
        governor = governor_;
    }

    function isValid(bytes32, address asset) external view returns (bool) {
        return approved[asset];
    }

    function reason(bytes32, address asset) external view returns (string memory) {
        if (approved[asset]) {
            bytes memory r = bytes(reasonOverride[asset]);
            return r.length == 0 ? "approved_bridge_receipt" : reasonOverride[asset];
        }
        return "default_deny_bridge_receipt";
    }
}
