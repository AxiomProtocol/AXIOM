// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMarketOperations {
    event PegDefenseExecuted(uint256 axusdAmount, uint256 collateralReceived, uint256 newPrice);
    event LiquidityProvided(address indexed pool, uint256 axusdAmount, uint256 collateralAmount);
    event LiquidityRemoved(address indexed pool, uint256 lpTokens);
    event PriceThresholdUpdated(uint256 lowerBound, uint256 upperBound);

    function defendPegBuy(uint256 axusdAmount, uint256 minCollateralOut) external;
    function defendPegSell(uint256 collateralAmount, uint256 minAxusdOut) external;
    function provideLiquidity(uint256 axusdAmount, uint256 collateralAmount, uint256 minLpTokens) external;
    function removeLiquidity(uint256 lpTokens, uint256 minAxusd, uint256 minCollateral) external;
    function getCurrentPrice() external view returns (uint256);
    function isPegDefenseNeeded() external view returns (bool);
}
