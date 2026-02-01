// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVaultEngine {
    struct Vault {
        uint256 collateralAmount;
        uint256 debtAmount;
        uint256 accruedInterest;
        uint256 lastAccrualTimestamp;
    }

    struct CollateralConfig {
        address priceFeed;
        uint256 minCollateralRatio;
        uint256 liquidationThreshold;
        uint256 liquidationPenalty;
        uint256 debtCeiling;
        uint256 stabilityFee;
        uint256 totalDebt;
        bool enabled;
    }

    event CollateralDeposited(address indexed user, address indexed collateral, uint256 amount);
    event CollateralWithdrawn(address indexed user, address indexed collateral, uint256 amount);
    event AXUSDMinted(address indexed user, address indexed collateral, uint256 amount);
    event AXUSDRepaid(address indexed user, address indexed collateral, uint256 amount);
    event VaultLiquidated(address indexed owner, address indexed collateral, address indexed liquidator, uint256 debtCovered, uint256 collateralSeized);
    event InterestAccrued(address indexed user, address indexed collateral, uint256 amount);
    event InterestCollected(address indexed user, address indexed collateral, uint256 amount);

    function depositCollateral(address collateral, uint256 amount) external;
    function withdrawCollateral(address collateral, uint256 amount) external;
    function mintAXUSD(address collateral, uint256 amount) external;
    function repayAXUSD(address collateral, uint256 amount) external;
    function getVault(address user, address collateral) external view returns (Vault memory);
    function getCollateralRatio(address user, address collateral) external view returns (uint256);
    function isLiquidatable(address user, address collateral) external view returns (bool);
    function liquidate(address owner, address collateral, uint256 debtToCover) external;
}
