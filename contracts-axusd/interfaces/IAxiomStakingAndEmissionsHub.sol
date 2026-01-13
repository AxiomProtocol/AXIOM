// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAxiomStakingAndEmissionsHub
 * @notice Minimal interface for integration (deployed at 0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885)
 */
interface IAxiomStakingAndEmissionsHub {
    function hasRole(bytes32 role, address account) external view returns (bool);
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
    function getRoleAdmin(bytes32 role) external view returns (bytes32);
    function fundRewards(uint256 poolId, uint256 amount) external;
}

/**
 * @dev Stub contract for ethers.getContractAt compatibility
 */
contract AxiomStakingAndEmissionsHub is IAxiomStakingAndEmissionsHub {
    function hasRole(bytes32, address) external pure override returns (bool) { return false; }
    function grantRole(bytes32, address) external override {}
    function revokeRole(bytes32, address) external override {}
    function getRoleAdmin(bytes32) external pure override returns (bytes32) { return bytes32(0); }
    function fundRewards(uint256, uint256) external override {}
}
