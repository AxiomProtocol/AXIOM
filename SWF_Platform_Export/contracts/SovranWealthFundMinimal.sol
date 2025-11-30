// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SovranWealthFundMinimal
 * @dev A simplified ERC20 token with minting capabilities for testing purposes
 */
contract SovranWealthFundMinimal is ERC20, Ownable {
    // Address with minting permission
    mapping(address => bool) public minters;
    
    // Pausable state variable
    bool private _paused;
    
    // Events for pause functionality
    event Paused(address account);
    event Unpaused(address account);
    
    /**
     * @dev Constructor initializes the token with name, symbol, and sets up permissions
     */
    constructor() 
        ERC20("Sovran Wealth Fund", "SWF") 
        Ownable(msg.sender)
    {
        // Grant minting permission to the deployer
        minters[msg.sender] = true;
        _paused = false;
    }
    
    /**
     * @dev Returns true if the contract is paused, and false otherwise.
     */
    function paused() public view returns (bool) {
        return _paused;
    }
    
    /**
     * @dev Pauses all token transfers
     * Only callable by the contract owner
     */
    function pause() public onlyOwner {
        _paused = true;
        emit Paused(msg.sender);
    }
    
    /**
     * @dev Unpauses all token transfers
     * Only callable by the contract owner
     */
    function unpause() public onlyOwner {
        _paused = false;
        emit Unpaused(msg.sender);
    }
    
    /**
     * @dev Modifier to check if an address has minting permission
     */
    modifier onlyMinter() {
        require(minters[msg.sender], "Caller is not a minter");
        _;
    }
    
    /**
     * @dev Grant minting permission to an address
     * @param minter The address to grant minting permission to
     */
    function grantMinterRole(address minter) public onlyOwner {
        minters[minter] = true;
    }
    
    /**
     * @dev Revoke minting permission from an address
     * @param minter The address to revoke minting permission from
     */
    function revokeMinterRole(address minter) public onlyOwner {
        minters[minter] = false;
    }
    
    /**
     * @dev Mint new tokens
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint
     * Only callable by addresses with minting permission
     */
    function mint(address to, uint256 amount) public onlyMinter {
        _mint(to, amount);
    }
    
    /**
     * @dev Burn tokens from the caller's address
     * @param amount The amount of tokens to burn
     * Any token holder can burn their own tokens
     */
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
    
    /**
     * @dev Hook that is called before any token transfer
     * Used to implement the pausable functionality
     */
    function _update(address from, address to, uint256 amount)
        internal
        override
    {
        require(!_paused, "Token transfers are paused");
        super._update(from, to, amount);
    }
}