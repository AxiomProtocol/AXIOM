// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface AggregatorV3Interface {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
    function decimals() external view returns (uint8);
}

contract AxiomPriceOracle {
    string public constant name = "Axiom Price Oracle";
    
    address public constant USDC = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
    address public constant USDT = 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9;
    address public constant USDY = 0x35e050d3C0eC2d29D269a8EcEa763a183bDF9A9D;
    address public constant WETH = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
    address public constant ARB = 0x912CE59144191C1204E64559FE8253a0e49E6548;
    address public constant AXUSD = 0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c;
    
    AggregatorV3Interface public constant ETH_USD_FEED = AggregatorV3Interface(0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612);
    AggregatorV3Interface public constant ARB_USD_FEED = AggregatorV3Interface(0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6);
    AggregatorV3Interface public constant USDC_USD_FEED = AggregatorV3Interface(0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3);
    AggregatorV3Interface public constant USDT_USD_FEED = AggregatorV3Interface(0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7);
    
    function getQuote(
        uint256 inAmount,
        address base,
        address quote
    ) external view returns (uint256 outAmount) {
        if (base == quote) {
            return inAmount;
        }
        
        uint256 basePrice = _getPrice(base);
        uint256 quotePrice = _getPrice(quote);
        
        outAmount = (inAmount * basePrice) / quotePrice;
    }
    
    function getQuotes(
        uint256 inAmount,
        address base,
        address quote
    ) external view returns (uint256 bidOutAmount, uint256 askOutAmount) {
        uint256 outAmount = this.getQuote(inAmount, base, quote);
        bidOutAmount = outAmount;
        askOutAmount = outAmount;
    }
    
    function _getPrice(address token) internal view returns (uint256) {
        if (token == USDC || token == USDT || token == AXUSD) {
            return 1e8;
        }
        
        if (token == USDY) {
            return 103e6;
        }
        
        if (token == WETH) {
            (, int256 answer,,,) = ETH_USD_FEED.latestRoundData();
            return uint256(answer);
        }
        
        if (token == ARB) {
            (, int256 answer,,,) = ARB_USD_FEED.latestRoundData();
            return uint256(answer);
        }
        
        revert("Unsupported token");
    }
}
