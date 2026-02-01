// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRateLimiter {
    function checkMintLimit(address user, uint256 amount) external view returns (bool);
    function recordMint(address user, uint256 amount) external;
    function resetDailyLimits() external;
}
