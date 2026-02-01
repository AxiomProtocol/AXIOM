// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAxiomIdentityComplianceHub
 * @notice Minimal interface for integration (deployed at 0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED)
 */
interface IAxiomIdentityComplianceHub {
    function hasRole(bytes32 role, address account) external view returns (bool);
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
    function getRoleAdmin(bytes32 role) external view returns (bytes32);
}

/**
 * @dev Stub contract for ethers.getContractAt compatibility
 */
contract AxiomIdentityComplianceHub is IAxiomIdentityComplianceHub {
    function hasRole(bytes32, address) external pure override returns (bool) { return false; }
    function grantRole(bytes32, address) external override {}
    function revokeRole(bytes32, address) external override {}
    function getRoleAdmin(bytes32) external pure override returns (bytes32) { return bytes32(0); }
}
