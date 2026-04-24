// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../ICollateralRisk.sol";

/**
 * @title  AlwaysValidAdapter
 * @notice Reference validity adapter that always returns true. Suitable
 *         only for assets whose risk config sets coreCollateral=true and
 *         all of bridged/wrapped/syntheticReceipt=false. Provided as a
 *         no-op default so an asset can be wired into the framework
 *         without writing a bespoke adapter.
 */
contract AlwaysValidAdapter is IAssetValidityAdapter {
    function isValid(bytes32, address) external pure returns (bool) { return true; }
    function reason(bytes32, address) external pure returns (string memory) { return "always_valid"; }
}
