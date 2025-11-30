// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SWF Simplified Enhanced Token
 * @dev Streamlined version with core enhanced features for immediate deployment
 */
contract SWFSimplified {
    
    string public name = "Sovran Wealth Fund Enhanced";
    string public symbol = "SWFE";
    uint8 public decimals = 18;
    uint256 public totalSupply = 1000000000 * 10**18; // 1B tokens
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // Enhanced Features
    uint256 public stakingRewardRate = 25; // 25% APR
    uint256 public nftMintPrice = 100 * 10**18; // 100 SWF tokens
    uint256 public nextNFTId = 1;
    uint256 public constant MAX_NFT_SUPPLY = 10000;
    uint256 public constant EDUCATION_REWARD = 500 * 10**18; // 500 SWF
    
    struct StakeInfo {
        uint256 amount;
        uint256 timestamp;
        bool isActive;
    }
    
    struct NFTInfo {
        address owner;
        uint256 rarity; // 0=Common, 1=Rare, 2=Legendary
        bool exists;
    }
    
    mapping(address => StakeInfo) public stakes;
    mapping(address => uint256) public stakingRewards;
    mapping(uint256 => NFTInfo) public nfts;
    mapping(address => uint256) public nftBalance;
    mapping(address => uint256) public coursesCompleted;
    mapping(address => bool) public hasClaimedEducationReward;
    
    uint256 public totalStaked;
    address public owner;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event NFTMinted(address indexed to, uint256 tokenId, uint256 rarity);
    event EducationRewardClaimed(address indexed student, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        balanceOf[address(this)] = totalSupply;
        emit Transfer(address(0), address(this), totalSupply);
    }
    
    function transfer(address to, uint256 value) public returns (bool) {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }
    
    function approve(address spender, uint256 value) public returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(balanceOf[from] >= value, "Insufficient balance");
        require(allowance[from][msg.sender] >= value, "Allowance exceeded");
        balanceOf[from] -= value;
        balanceOf[to] += value;
        allowance[from][msg.sender] -= value;
        emit Transfer(from, to, value);
        return true;
    }
    
    // Enhanced Staking Functions
    function stakeTokens(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        updateStakingRewards(msg.sender);
        
        balanceOf[msg.sender] -= amount;
        balanceOf[address(this)] += amount;
        
        stakes[msg.sender].amount += amount;
        stakes[msg.sender].timestamp = block.timestamp;
        stakes[msg.sender].isActive = true;
        
        totalStaked += amount;
        
        emit Transfer(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }
    
    function unstakeTokens(uint256 amount) external {
        require(stakes[msg.sender].amount >= amount, "Insufficient staked amount");
        
        updateStakingRewards(msg.sender);
        
        stakes[msg.sender].amount -= amount;
        if (stakes[msg.sender].amount == 0) {
            stakes[msg.sender].isActive = false;
        }
        
        totalStaked -= amount;
        
        balanceOf[address(this)] -= amount;
        balanceOf[msg.sender] += amount;
        
        emit Transfer(address(this), msg.sender, amount);
        emit Unstaked(msg.sender, amount);
    }
    
    function claimStakingRewards() external {
        updateStakingRewards(msg.sender);
        
        uint256 reward = stakingRewards[msg.sender];
        require(reward > 0, "No rewards to claim");
        
        stakingRewards[msg.sender] = 0;
        balanceOf[address(this)] -= reward;
        balanceOf[msg.sender] += reward;
        
        emit Transfer(address(this), msg.sender, reward);
        emit RewardsClaimed(msg.sender, reward);
    }
    
    function updateStakingRewards(address user) internal {
        StakeInfo storage stake = stakes[user];
        if (stake.isActive && stake.amount > 0) {
            uint256 timeStaked = block.timestamp - stake.timestamp;
            uint256 reward = (stake.amount * stakingRewardRate * timeStaked) / (365 days * 100);
            stakingRewards[user] += reward;
            stake.timestamp = block.timestamp;
        }
    }
    
    // NFT Functions
    function mintNFT(address to) external {
        require(nextNFTId <= MAX_NFT_SUPPLY, "Max NFT supply reached");
        require(balanceOf[msg.sender] >= nftMintPrice, "Insufficient SWF balance");
        
        balanceOf[msg.sender] -= nftMintPrice;
        balanceOf[address(this)] += nftMintPrice;
        
        uint256 tokenId = nextNFTId++;
        uint256 rarity = determineRarity(tokenId);
        
        nfts[tokenId] = NFTInfo({
            owner: to,
            rarity: rarity,
            exists: true
        });
        
        nftBalance[to]++;
        
        emit Transfer(msg.sender, address(this), nftMintPrice);
        emit NFTMinted(to, tokenId, rarity);
    }
    
    function determineRarity(uint256 tokenId) internal view returns (uint256) {
        uint256 rand = uint256(keccak256(abi.encodePacked(tokenId, block.timestamp, msg.sender))) % 100;
        if (rand < 5) return 2; // Legendary (5%)
        if (rand < 25) return 1; // Rare (20%)
        return 0; // Common (75%)
    }
    
    // Education System
    function claimEducationReward() external {
        require(!hasClaimedEducationReward[msg.sender], "Already claimed");
        require(coursesCompleted[msg.sender] > 0, "No courses completed");
        
        hasClaimedEducationReward[msg.sender] = true;
        balanceOf[address(this)] -= EDUCATION_REWARD;
        balanceOf[msg.sender] += EDUCATION_REWARD;
        
        emit Transfer(address(this), msg.sender, EDUCATION_REWARD);
        emit EducationRewardClaimed(msg.sender, EDUCATION_REWARD);
    }
    
    function markCourseCompleted(address student) external onlyOwner {
        coursesCompleted[student]++;
    }
    
    // View Functions
    function getStakeInfo(address user) external view returns (
        uint256 amount,
        uint256 timestamp,
        uint256 pendingRewards,
        bool isActive
    ) {
        StakeInfo memory stake = stakes[user];
        uint256 timeStaked = block.timestamp - stake.timestamp;
        uint256 pending = (stake.amount * stakingRewardRate * timeStaked) / (365 days * 100);
        
        return (stake.amount, stake.timestamp, pending + stakingRewards[user], stake.isActive);
    }
    
    function getNFTInfo(uint256 tokenId) external view returns (
        address nftOwner,
        uint256 rarity,
        bool exists
    ) {
        NFTInfo memory nft = nfts[tokenId];
        return (nft.owner, nft.rarity, nft.exists);
    }
    
    // Admin Functions
    function updateStakingRewardRate(uint256 newRate) external onlyOwner {
        stakingRewardRate = newRate;
    }
    
    function updateNFTMintPrice(uint256 newPrice) external onlyOwner {
        nftMintPrice = newPrice;
    }
    
    function withdrawBNB() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function distributeTokens(address to, uint256 amount) external onlyOwner {
        require(balanceOf[address(this)] >= amount, "Insufficient contract balance");
        balanceOf[address(this)] -= amount;
        balanceOf[to] += amount;
        emit Transfer(address(this), to, amount);
    }
    
    receive() external payable {}
}