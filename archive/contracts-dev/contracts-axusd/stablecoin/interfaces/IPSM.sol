// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPSM {
    event Swap(address indexed user, bool axusdToCollateral, uint256 amountIn, uint256 amountOut, uint256 fee);
    event FeeUpdated(uint256 newMintFee, uint256 newRedeemFee);
    event DebtCeilingUpdated(uint256 newCeiling);
    event CollateralWithdrawn(address indexed recipient, uint256 amount);

    function swapCollateralForAXUSD(uint256 collateralAmount) external returns (uint256 axusdAmount);
    function swapAXUSDForCollateral(uint256 axusdAmount) external returns (uint256 collateralAmount);
    function getSwapQuote(uint256 amountIn, bool axusdToCollateral) external view returns (uint256 amountOut, uint256 fee);
    function getCollateralBalance() external view returns (uint256);
    function getDebtOutstanding() external view returns (uint256);
}
