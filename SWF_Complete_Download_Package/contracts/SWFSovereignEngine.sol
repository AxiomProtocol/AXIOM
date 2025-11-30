// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SWFSovereignEngine {
    // Admin and role management
    address public admin;
    mapping(address => string) public roleRegistry;
    mapping(string => uint256) public roleAllocations;
    address[] public recipients;

    // APR and rewards management
    IERC20 public swfToken;
    uint256 public aprBasisPoints = 2500; // 25% APR (in basis points)
    uint256 public constant BPS_DIVISOR = 10000;
    uint256 public constant SECONDS_IN_YEAR = 31536000;
    
    // Staking tracking
    mapping(address => uint256) public staked;
    mapping(address => uint256) public lastRewardTime;
    mapping(address => uint256) public rewardDebt;
    
    event APRUpdated(uint256 oldAPR, uint256 newAPR);
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);

    constructor(address _swfTokenAddress) {
        admin = msg.sender;
        swfToken = IERC20(_swfTokenAddress);

        // Initialize with a single role to avoid checksum issues
        _register(msg.sender, "Main Distributor", 100);
    }

    // Role management functions
    function _register(address wallet, string memory role, uint256 percentage) internal {
        roleRegistry[wallet] = role;
        roleAllocations[role] = percentage;
        recipients.push(wallet);
    }

    function getRecipientList() external view returns (address[] memory) {
        return recipients;
    }

    function getRole(address wallet) public view returns (string memory) {
        return roleRegistry[wallet];
    }

    function getAllocationByRole(string memory role) public view returns (uint256) {
        return roleAllocations[role];
    }

    // Modifier for admin-only functions
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call");
        _;
    }

    // Dynamic APR functions
    function setAPR(uint256 _newAprBps) external onlyAdmin {
        require(_newAprBps <= 5000, "APR too high (max 50%)");
        uint256 oldApr = aprBasisPoints;
        aprBasisPoints = _newAprBps;
        emit APRUpdated(oldApr, _newAprBps);
    }

    function getCurrentAPR() external view returns (uint256) {
        return aprBasisPoints;
    }

    // Staking functions
    function stake(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        
        // Update rewards before changing stake
        _updateRewards(msg.sender);

        // Transfer tokens to this contract
        require(swfToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        // Update staking data
        staked[msg.sender] += amount;
        lastRewardTime[msg.sender] = block.timestamp;
        
        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(staked[msg.sender] >= amount, "Insufficient staked balance");
        
        // Update rewards before changing stake
        _updateRewards(msg.sender);
        
        // Update staked amount
        staked[msg.sender] -= amount;
        
        // Transfer tokens back to user
        require(swfToken.transfer(msg.sender, amount), "Transfer failed");
        
        emit Withdrawn(msg.sender, amount);
    }

    // Reward functions
    function _updateRewards(address user) internal {
        uint256 pending = calculateRewards(user);
        rewardDebt[user] = pending;
        lastRewardTime[user] = block.timestamp;
    }

    function calculateRewards(address user) public view returns (uint256) {
        if (staked[user] == 0 || lastRewardTime[user] == 0) {
            return rewardDebt[user];
        }
        
        uint256 timeElapsed = block.timestamp - lastRewardTime[user];
        uint256 reward = (staked[user] * aprBasisPoints * timeElapsed) / 
                        BPS_DIVISOR / SECONDS_IN_YEAR;
        
        return reward + rewardDebt[user];
    }

    function claimRewards() external {
        _updateRewards(msg.sender);
        uint256 reward = rewardDebt[msg.sender];
        
        if (reward > 0) {
            rewardDebt[msg.sender] = 0;
            
            // Transfer rewards from treasury to the user
            address treasury = getAddressByRole("Treasury");
            require(treasury != address(0), "Treasury not found");
            
            // This requires the Treasury to have approved this contract to spend SWF
            require(swfToken.transferFrom(treasury, msg.sender, reward), "Reward transfer failed");
            
            emit RewardsClaimed(msg.sender, reward);
        }
    }

    // Helper functions
    function getAddressByRole(string memory role) public view returns (address) {
        for (uint i = 0; i < recipients.length; i++) {
            if (keccak256(bytes(roleRegistry[recipients[i]])) == keccak256(bytes(role))) {
                return recipients[i];
            }
        }
        return address(0);
    }
    
    function getTotalStaked(address user) external view returns (uint256) {
        return staked[user];
    }
    
    function getPendingRewards(address user) external view returns (uint256) {
        return calculateRewards(user);
    }
}