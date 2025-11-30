// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ISovranWealthFund
 * @dev Interface for SovranWealthFund contract to avoid import conflicts
 * Includes both ERC20 and custom SWF functionality
 */
interface ISovranWealthFund is IERC20 {
    // ERC20 functions are inherited from IERC20
    
    // SWF-specific functions
    function mint(address to, uint256 amount) external;
    function burn(uint256 amount) external;
    function paused() external view returns (bool);
    function pause() external;
    function unpause() external;
    function hasRole(bytes32 role, address account) external view returns (bool);
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;

    // Role constants
    function DEFAULT_ADMIN_ROLE() external view returns (bytes32);
    function MINTER_ROLE() external view returns (bytes32);
    function PAUSER_ROLE() external view returns (bytes32);
}

/**
 * @title SovranWealthFund
 * @dev Type casting for using SovranWealthFund as ISovranWealthFund
 */
abstract contract SovranWealthFund is ISovranWealthFund {
}