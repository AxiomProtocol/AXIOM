// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@thirdweb-dev/contracts/base/ERC20Base.sol";
import "@thirdweb-dev/contracts/extension/PermissionsEnumerable.sol";

/**
 * @title Sovran Wealth Fund
 * @dev ERC20 token with permission-based minting capabilities, burn functions, and pausability
 */
contract SovranWealthFund is ERC20Base, PermissionsEnumerable {
    // Define the minter role
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    // Pausable state
    bool private _paused;
    
    // Events for pausing/unpausing
    event Paused(address account);
    event Unpaused(address account);

    /**
     * @dev Constructor initializes the token with name, symbol, and sets up roles
     */
    constructor()
        ERC20Base(msg.sender, "Sovran Wealth Fund", "SWF")
    {
        // Grant the MINTER_ROLE to the contract owner only (msg.sender)
        _setupRole(MINTER_ROLE, msg.sender);
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
     * @dev Mint new tokens
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint
     * Only callable by addresses with the MINTER_ROLE
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /**
     * @dev Burn tokens from the caller's address
     * @param amount The amount of tokens to burn
     * Any token holder can burn their own tokens
     */
    function burn(uint256 amount) public override {
        _burn(msg.sender, amount);
    }

    /**
     * @dev Hook that is called before any token transfer
     * Used to implement the pausable functionality
     */
    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        override
    {
        require(!_paused, "Token transfers are paused");
        super._beforeTokenTransfer(from, to, amount);
    }
}
