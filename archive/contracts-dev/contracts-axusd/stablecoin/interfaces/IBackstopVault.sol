// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBackstopVault {
    event Deposited(address indexed depositor, uint256 amount);
    event EmergencyWithdrawal(address indexed recipient, uint256 amount, string reason);
    event MarketOpWithdrawal(address indexed operator, uint256 amount);
    event EmergencyModeActivated(address indexed activator);
    event EmergencyModeDeactivated(address indexed deactivator);

    function deposit() external payable;
    function emergencyWithdraw(address recipient, uint256 amount, string calldata reason) external;
    function withdrawForMarketOps(uint256 amount) external;
    function activateEmergencyMode() external;
    function deactivateEmergencyMode() external;
    function getBalance() external view returns (uint256);
    function isEmergencyMode() external view returns (bool);
}
