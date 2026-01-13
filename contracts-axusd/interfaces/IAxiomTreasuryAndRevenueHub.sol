// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAxiomTreasuryAndRevenueHub
 * @notice Minimal interface for integration (deployed at 0x3fD63728288546AC41dAe3bf25ca383061c3A929)
 */
interface IAxiomTreasuryAndRevenueHub {
    function hasRole(bytes32 role, address account) external view returns (bool);
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
    function getRoleAdmin(bytes32 role) external view returns (bytes32);
    function setVault(bytes32 vaultId, address vaultAddress) external;
}

/**
 * @dev Stub contract for ethers.getContractAt compatibility
 */
contract AxiomTreasuryAndRevenueHub is IAxiomTreasuryAndRevenueHub {
    function hasRole(bytes32, address) external pure override returns (bool) { return false; }
    function grantRole(bytes32, address) external override {}
    function revokeRole(bytes32, address) external override {}
    function getRoleAdmin(bytes32) external pure override returns (bytes32) { return bytes32(0); }
    function setVault(bytes32, address) external override {}
}
