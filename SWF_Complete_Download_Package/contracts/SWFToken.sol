//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SWFToken is ERC20, Ownable {
    address public constant initialHolder = 0xEcDdb7dFF2f61E1caC7AC767337A38E1aD851eD6;
    uint256 private constant TOTAL_SUPPLY = 10_000_000_000 * 10**18;

    constructor() ERC20("Sovran Wealth Fund", "SWF") Ownable(initialHolder) {
        _mint(initialHolder, TOTAL_SUPPLY);
    }
}