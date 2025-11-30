// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title SWFBasketVault
 * @notice A vault contract that allows users to deposit SWF tokens and receive basket tokens in return
 * @dev This contract implements a simple 1:1 deposit/withdrawal mechanism
 */
contract SWFBasketVault is ERC20 {
    // Contract administrator
    address public admin;
    
    // SWF token contract reference
    IERC20 public swfToken;

    // Total amount of SWF tokens deposited in the vault
    uint256 public totalDeposited;
    
    // Mapping of user addresses to their deposited amounts
    mapping(address => uint256) public deposits;

    // Events
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);

    /**
     * @notice Initializes the vault contract
     * @param _swfToken Address of the SWF token contract
     */
    constructor(address _swfToken) ERC20("SWF Basket Token", "SWF-BASKET") {
        require(_swfToken != address(0), "Invalid token address");
        admin = msg.sender;
        swfToken = IERC20(_swfToken);
    }

    /**
     * @notice Allows the admin to transfer admin rights to a new address
     * @param newAdmin Address of the new admin
     */
    function changeAdmin(address newAdmin) external {
        require(msg.sender == admin, "Only admin");
        require(newAdmin != address(0), "Invalid address");
        address oldAdmin = admin;
        admin = newAdmin;
        emit AdminChanged(oldAdmin, newAdmin);
    }

    /**
     * @notice Deposits SWF tokens into the vault and mints basket tokens
     * @param amount Amount of SWF tokens to deposit
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transfer SWF tokens from the user to the vault
        swfToken.transferFrom(msg.sender, address(this), amount);

        // Update state
        deposits[msg.sender] += amount;
        totalDeposited += amount;
        
        // Mint basket tokens to the user (1:1 ratio)
        _mint(msg.sender, amount);
        
        emit Deposited(msg.sender, amount);
    }

    /**
     * @notice Withdraws SWF tokens from the vault by burning basket tokens
     * @param amount Amount of basket tokens to burn and SWF tokens to withdraw
     */
    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(balanceOf(msg.sender) >= amount, "Not enough basket tokens");

        // Update state
        deposits[msg.sender] -= amount;
        totalDeposited -= amount;
        
        // Burn basket tokens
        _burn(msg.sender, amount);
        
        // Transfer SWF tokens back to the user
        swfToken.transfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Returns the total supply of basket tokens
     * @return Total supply of basket tokens
     */
    function getTotalSupply() external view returns (uint256) {
        return totalSupply();
    }

    /**
     * @notice Returns the basket token balance of a user
     * @param user Address of the user
     * @return Balance of basket tokens
     */
    function getBasketBalance(address user) external view returns (uint256) {
        return balanceOf(user);
    }

    /**
     * @notice Returns the SWF token balance of the vault
     * @return Balance of SWF tokens in the vault
     */
    function getVaultBalance() external view returns (uint256) {
        return swfToken.balanceOf(address(this));
    }
}