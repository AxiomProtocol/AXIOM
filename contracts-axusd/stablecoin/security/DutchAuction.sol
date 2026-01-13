// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library DutchAuction {
    uint256 public constant AUCTION_DURATION = 1 hours;
    uint256 public constant MAX_DISCOUNT = 2000;
    uint256 public constant BASIS_POINTS = 10000;
    
    struct Auction {
        address owner;
        address collateral;
        uint256 debtAmount;
        uint256 collateralAmount;
        uint256 startTime;
        bool completed;
    }
    
    function getCurrentDiscount(Auction memory auction) internal view returns (uint256) {
        if (auction.completed) return 0;
        if (block.timestamp < auction.startTime) return 0;
        
        uint256 elapsed = block.timestamp - auction.startTime;
        if (elapsed >= AUCTION_DURATION) {
            return MAX_DISCOUNT;
        }
        
        return (MAX_DISCOUNT * elapsed) / AUCTION_DURATION;
    }
    
    function getCurrentPrice(
        Auction memory auction,
        uint256 basePrice
    ) internal view returns (uint256) {
        uint256 discount = getCurrentDiscount(auction);
        return (basePrice * (BASIS_POINTS - discount)) / BASIS_POINTS;
    }
    
    function getCollateralForDebt(
        Auction memory auction,
        uint256 debtToCover,
        uint256 collateralPrice
    ) internal view returns (uint256) {
        uint256 discount = getCurrentDiscount(auction);
        uint256 effectivePrice = (collateralPrice * (BASIS_POINTS - discount)) / BASIS_POINTS;
        
        if (effectivePrice == 0) return auction.collateralAmount;
        
        uint256 collateralNeeded = (debtToCover * 1e18) / effectivePrice;
        
        if (collateralNeeded > auction.collateralAmount) {
            return auction.collateralAmount;
        }
        
        return collateralNeeded;
    }
}
