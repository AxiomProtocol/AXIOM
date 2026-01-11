// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOracleAdapter {
    function getPrice(address collateral) external view returns (uint256);
    function setFeed(address collateral, address feed, uint256 staleThreshold) external;
    function isFeedValid(address collateral) external view returns (bool);
}
