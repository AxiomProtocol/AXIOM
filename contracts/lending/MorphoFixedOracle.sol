// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOracle {
    function price() external view returns (uint256);
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
