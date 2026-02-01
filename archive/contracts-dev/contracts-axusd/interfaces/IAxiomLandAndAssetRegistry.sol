// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAxiomLandAndAssetRegistry
 * @notice Minimal interface for integration (deployed at 0xaB15907b124620E165aB6E464eE45b178d8a6591)
 */
interface IAxiomLandAndAssetRegistry {
    function hasRole(bytes32 role, address account) external view returns (bool);
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
}

/**
 * @dev Stub contract for ethers.getContractAt compatibility
 */
contract AxiomLandAndAssetRegistry is IAxiomLandAndAssetRegistry {
    function hasRole(bytes32, address) external pure override returns (bool) { return false; }
    function grantRole(bytes32, address) external override {}
    function revokeRole(bytes32, address) external override {}
}
