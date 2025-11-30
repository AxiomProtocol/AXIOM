// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title PropertySharesToken
 * @dev ERC20 token representing fractional ownership of real estate properties
 */
contract PropertySharesToken is ERC20, Ownable, ReentrancyGuard {
    uint256 public immutable totalTokens;
    uint256 public immutable tokenPrice;
    uint256 public tokensAvailable;
    string public propertyDescription;
    
    mapping(address => uint256) public dividendsOwed;
    uint256 public totalDividendsDistributed;
    
    event TokensPurchased(address indexed buyer, uint256 amount, uint256 cost);
    event DividendsDistributed(uint256 totalAmount, uint256 perToken);
    event DividendsClaimed(address indexed holder, uint256 amount);
    
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _totalTokens,
        uint256 _tokenPrice,
        string memory _description,
        address _owner
    ) ERC20(_name, _symbol) {
        totalTokens = _totalTokens;
        tokenPrice = _tokenPrice;
        tokensAvailable = _totalTokens;
        propertyDescription = _description;
        _transferOwnership(_owner);
    }
    
    /**
     * @dev Purchase property tokens
     */
    function purchaseTokens(uint256 _amount) external payable nonReentrant {
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount <= tokensAvailable, "Not enough tokens available");
        require(msg.value >= _amount * tokenPrice, "Insufficient payment");
        
        tokensAvailable -= _amount;
        _mint(msg.sender, _amount);
        
        // Refund excess payment
        if (msg.value > _amount * tokenPrice) {
            payable(msg.sender).transfer(msg.value - (_amount * tokenPrice));
        }
        
        emit TokensPurchased(msg.sender, _amount, _amount * tokenPrice);
    }
    
    /**
     * @dev Distribute dividends to all token holders
     */
    function distributeDividends() external payable onlyOwner {
        require(msg.value > 0, "Must send dividends");
        require(totalSupply() > 0, "No tokens issued");
        
        uint256 dividendPerToken = msg.value / totalSupply();
        totalDividendsDistributed += msg.value;
        
        emit DividendsDistributed(msg.value, dividendPerToken);
    }
    
    /**
     * @dev Claim available dividends
     */
    function claimDividends() external nonReentrant {
        uint256 balance = balanceOf(msg.sender);
        require(balance > 0, "No tokens held");
        
        uint256 dividendShare = (totalDividendsDistributed * balance) / totalSupply();
        uint256 owed = dividendShare - dividendsOwed[msg.sender];
        
        require(owed > 0, "No dividends to claim");
        
        dividendsOwed[msg.sender] = dividendShare;
        payable(msg.sender).transfer(owed);
        
        emit DividendsClaimed(msg.sender, owed);
    }
    
    /**
     * @dev Get contract info
     */
    function getPropertyInfo() external view returns (
        uint256 _totalTokens,
        uint256 _tokenPrice,
        uint256 _tokensAvailable,
        uint256 _totalSupply,
        string memory _description
    ) {
        return (totalTokens, tokenPrice, tokensAvailable, totalSupply(), propertyDescription);
    }
    
    /**
     * @dev Emergency withdrawal (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
