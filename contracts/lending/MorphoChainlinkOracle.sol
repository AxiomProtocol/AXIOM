// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

interface IOracle {
    function price() external view returns (uint256);
}

contract MorphoChainlinkOracle is IOracle {
    AggregatorV3Interface public immutable collateralFeed;
    AggregatorV3Interface public immutable loanFeed;
    
    uint256 public immutable collateralDecimals;
    uint256 public immutable loanDecimals;
    uint256 public immutable collateralFeedDecimals;
    uint256 public immutable loanFeedDecimals;
    
    uint256 public immutable priceScale;
    
    constructor(
        address _collateralFeed,
        address _loanFeed,
        uint256 _collateralDecimals,
        uint256 _loanDecimals
    ) {
        collateralFeed = AggregatorV3Interface(_collateralFeed);
        
        if (_loanFeed == address(0)) {
            loanFeed = AggregatorV3Interface(address(0));
            loanFeedDecimals = 0;
        } else {
            loanFeed = AggregatorV3Interface(_loanFeed);
            loanFeedDecimals = AggregatorV3Interface(_loanFeed).decimals();
        }
        
        collateralDecimals = _collateralDecimals;
        loanDecimals = _loanDecimals;
        collateralFeedDecimals = AggregatorV3Interface(_collateralFeed).decimals();
        
        priceScale = 10 ** (36 + loanDecimals - collateralDecimals);
    }
    
    function price() external view override returns (uint256) {
        (, int256 collateralPrice,,,) = collateralFeed.latestRoundData();
        require(collateralPrice > 0, "Invalid collateral price");
        
        uint256 collateralPriceNorm = uint256(collateralPrice) * (10 ** (18 - collateralFeedDecimals));
        
        uint256 loanPriceNorm;
        if (address(loanFeed) == address(0)) {
            loanPriceNorm = 1e18;
        } else {
            (, int256 loanPrice,,,) = loanFeed.latestRoundData();
            require(loanPrice > 0, "Invalid loan price");
            loanPriceNorm = uint256(loanPrice) * (10 ** (18 - loanFeedDecimals));
        }
        
        return (collateralPriceNorm * priceScale) / loanPriceNorm;
    }
}

contract MorphoFixedOracle is IOracle {
    uint256 public immutable fixedPrice;
    
    constructor(uint256 _price) {
        fixedPrice = _price;
    }
    
    function price() external view override returns (uint256) {
        return fixedPrice;
    }
}
