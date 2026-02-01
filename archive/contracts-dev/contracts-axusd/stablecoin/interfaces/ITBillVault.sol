// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ITBillVault {
    struct TBillAsset {
        address token;
        string name;
        uint256 balance;
        uint256 yieldRate;
        uint256 maturityDate;
        bool enabled;
    }

    event TBillDeposited(address indexed token, uint256 amount, uint256 axusdMinted);
    event TBillWithdrawn(address indexed token, uint256 amount);
    event YieldHarvested(address indexed token, uint256 yieldAmount);
    event TBillAssetAdded(address indexed token, string name, uint256 maturityDate);
    event TBillAssetRemoved(address indexed token);
    event YieldDistributed(uint256 totalYield, uint256 toFeeBurner, uint256 toInsurance);
    event MaturityEnforcementUpdated(bool enforced, uint256 maxDays);

    function depositTBill(address token, uint256 amount) external;
    function withdrawTBill(address token, uint256 amount) external;
    function harvestYield(address token) external returns (uint256);
    function harvestAllYields() external returns (uint256);
    function getTotalValue() external view returns (uint256);
    function getAssetValue(address token) external view returns (uint256);
    function getSupportedAssets() external view returns (address[] memory);
}
