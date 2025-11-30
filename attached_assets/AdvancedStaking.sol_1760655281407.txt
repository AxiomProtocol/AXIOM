// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title Advanced Staking for MetalOfTheGods NFTs
 * @dev Multi-tier staking with governance and dynamic rewards
 */
contract AdvancedStaking is ReentrancyGuard, Pausable, AccessControl {
    using Counters for Counters.Counter;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MODERATOR_ROLE = keccak256("MODERATOR_ROLE");

    // Staking tiers
    enum StakingTier { BRONZE, SILVER, GOLD, PLATINUM, DIAMOND }

    struct StakeInfo {
        uint256 tokenId;
        address owner;
        uint256 startTime;
        uint256 lockPeriod;
        StakingTier tier;
        uint256 multiplier;
        uint256 accumulatedRewards;
        bool active;
    }

    struct TierConfig {
        uint256 minLockPeriod;
        uint256 baseMultiplier;
        uint256 bonusMultiplier;
        uint256 governanceWeight;
        bool enabled;
    }

    struct Proposal {
        uint256 id;
        string title;
        string description;
        address proposer;
        uint256 startTime;
        uint256 endTime;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool executed;
        bool active;
        mapping(address => bool) hasVoted;
        mapping(address => uint8) votes; // 0: against, 1: for, 2: abstain
    }

    // Contract addresses
    address public immutable nftContract;
    address public immutable rewardToken;
    
    // Staking data
    mapping(uint256 => StakeInfo) public stakes;
    mapping(address => uint256[]) public userStakes;
    mapping(StakingTier => TierConfig) public tierConfigs;
    
    // Governance data
    Counters.Counter private _proposalIds;
    mapping(uint256 => Proposal) public proposals;
    mapping(address => uint256) public votingPower;
    
    // Reward pools
    uint256 public totalRewardPool;
    uint256 public dailyRewardRate = 100 * 10**18; // 100 tokens per day base
    uint256 public lastRewardUpdate;
    
    // Events
    event Staked(address indexed user, uint256 indexed tokenId, StakingTier tier, uint256 lockPeriod);
    event Unstaked(address indexed user, uint256 indexed tokenId, uint256 rewards);
    event RewardsClaimed(address indexed user, uint256 amount);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title);
    event VoteCast(uint256 indexed proposalId, address indexed voter, uint8 support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);

    constructor(
        address _nftContract,
        address _rewardToken
    ) {
        nftContract = _nftContract;
        rewardToken = _rewardToken;
        lastRewardUpdate = block.timestamp;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        
        // Initialize tier configurations
        _initializeTiers();
    }

    function _initializeTiers() private {
        // Bronze: 30 days, 1x multiplier
        tierConfigs[StakingTier.BRONZE] = TierConfig({
            minLockPeriod: 30 days,
            baseMultiplier: 100,
            bonusMultiplier: 0,
            governanceWeight: 1,
            enabled: true
        });

        // Silver: 90 days, 1.5x multiplier
        tierConfigs[StakingTier.SILVER] = TierConfig({
            minLockPeriod: 90 days,
            baseMultiplier: 100,
            bonusMultiplier: 50,
            governanceWeight: 2,
            enabled: true
        });

        // Gold: 180 days, 2.25x multiplier
        tierConfigs[StakingTier.GOLD] = TierConfig({
            minLockPeriod: 180 days,
            baseMultiplier: 100,
            bonusMultiplier: 125,
            governanceWeight: 3,
            enabled: true
        });

        // Platinum: 365 days, 3.5x multiplier
        tierConfigs[StakingTier.PLATINUM] = TierConfig({
            minLockPeriod: 365 days,
            baseMultiplier: 100,
            bonusMultiplier: 250,
            governanceWeight: 5,
            enabled: true
        });

        // Diamond: 730 days, 5x multiplier
        tierConfigs[StakingTier.DIAMOND] = TierConfig({
            minLockPeriod: 730 days,
            baseMultiplier: 100,
            bonusMultiplier: 400,
            governanceWeight: 10,
            enabled: true
        });
    }

    /**
     * @dev Stake NFT with specified tier
     */
    function stakeNFT(uint256 tokenId, StakingTier tier) external nonReentrant whenNotPaused {
        require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "Not token owner");
        require(IERC721(nftContract).isApprovedForAll(msg.sender, address(this)), "Contract not approved");
        require(tierConfigs[tier].enabled, "Tier not enabled");
        require(!stakes[tokenId].active, "Token already staked");

        // Transfer NFT to contract
        IERC721(nftContract).safeTransferFrom(msg.sender, address(this), tokenId);

        TierConfig memory config = tierConfigs[tier];
        uint256 multiplier = config.baseMultiplier + config.bonusMultiplier;

        stakes[tokenId] = StakeInfo({
            tokenId: tokenId,
            owner: msg.sender,
            startTime: block.timestamp,
            lockPeriod: config.minLockPeriod,
            tier: tier,
            multiplier: multiplier,
            accumulatedRewards: 0,
            active: true
        });

        userStakes[msg.sender].push(tokenId);
        
        // Update voting power
        votingPower[msg.sender] += config.governanceWeight;

        emit Staked(msg.sender, tokenId, tier, config.minLockPeriod);
    }

    /**
     * @dev Batch stake multiple NFTs
     */
    function batchStake(uint256[] calldata tokenIds, StakingTier[] calldata tiers) external nonReentrant whenNotPaused {
        require(tokenIds.length == tiers.length, "Array length mismatch");
        require(tokenIds.length <= 20, "Too many tokens");

        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(IERC721(nftContract).ownerOf(tokenIds[i]) == msg.sender, "Not owner of all tokens");
            require(tierConfigs[tiers[i]].enabled, "Invalid tier");
            require(!stakes[tokenIds[i]].active, "Token already staked");
        }

        require(IERC721(nftContract).isApprovedForAll(msg.sender, address(this)), "Contract not approved");

        for (uint256 i = 0; i < tokenIds.length; i++) {
            IERC721(nftContract).safeTransferFrom(msg.sender, address(this), tokenIds[i]);

            TierConfig memory config = tierConfigs[tiers[i]];
            uint256 multiplier = config.baseMultiplier + config.bonusMultiplier;

            stakes[tokenIds[i]] = StakeInfo({
                tokenId: tokenIds[i],
                owner: msg.sender,
                startTime: block.timestamp,
                lockPeriod: config.minLockPeriod,
                tier: tiers[i],
                multiplier: multiplier,
                accumulatedRewards: 0,
                active: true
            });

            userStakes[msg.sender].push(tokenIds[i]);
            votingPower[msg.sender] += config.governanceWeight;

            emit Staked(msg.sender, tokenIds[i], tiers[i], config.minLockPeriod);
        }
    }

    /**
     * @dev Unstake NFT and claim rewards
     */
    function unstakeNFT(uint256 tokenId) external nonReentrant {
        StakeInfo storage stake = stakes[tokenId];
        require(stake.active, "Token not staked");
        require(stake.owner == msg.sender, "Not stake owner");
        require(block.timestamp >= stake.startTime + stake.lockPeriod, "Lock period not ended");

        // Calculate rewards
        uint256 rewards = calculateRewards(tokenId);
        stake.accumulatedRewards += rewards;

        // Transfer NFT back to owner
        IERC721(nftContract).safeTransferFrom(address(this), msg.sender, tokenId);

        // Transfer rewards
        if (stake.accumulatedRewards > 0) {
            IERC20(rewardToken).transfer(msg.sender, stake.accumulatedRewards);
        }

        // Update voting power
        TierConfig memory config = tierConfigs[stake.tier];
        votingPower[msg.sender] -= config.governanceWeight;

        uint256 totalRewards = stake.accumulatedRewards;
        stake.active = false;
        stake.accumulatedRewards = 0;

        // Remove from user stakes array
        _removeFromUserStakes(msg.sender, tokenId);

        emit Unstaked(msg.sender, tokenId, totalRewards);
    }

    /**
     * @dev Claim accumulated rewards without unstaking
     */
    function claimRewards(uint256 tokenId) external nonReentrant {
        StakeInfo storage stake = stakes[tokenId];
        require(stake.active, "Token not staked");
        require(stake.owner == msg.sender, "Not stake owner");

        uint256 rewards = calculateRewards(tokenId);
        require(rewards > 0, "No rewards to claim");

        stake.accumulatedRewards += rewards;
        stake.startTime = block.timestamp; // Reset reward calculation

        IERC20(rewardToken).transfer(msg.sender, rewards);

        emit RewardsClaimed(msg.sender, rewards);
    }

    /**
     * @dev Calculate current rewards for a staked NFT
     */
    function calculateRewards(uint256 tokenId) public view returns (uint256) {
        StakeInfo memory stake = stakes[tokenId];
        if (!stake.active) return 0;

        uint256 stakingDuration = block.timestamp - stake.startTime;
        uint256 dailyReward = (dailyRewardRate * stake.multiplier) / 100;
        uint256 rewards = (dailyReward * stakingDuration) / 1 days;

        return rewards;
    }

    /**
     * @dev Get user's total staking stats
     */
    function getUserStakingStats(address user) external view returns (
        uint256 totalStaked,
        uint256 totalRewards,
        uint256 votingWeight
    ) {
        uint256[] memory userTokens = userStakes[user];
        
        for (uint256 i = 0; i < userTokens.length; i++) {
            if (stakes[userTokens[i]].active) {
                totalStaked++;
                totalRewards += calculateRewards(userTokens[i]) + stakes[userTokens[i]].accumulatedRewards;
            }
        }
        
        votingWeight = votingPower[user];
    }

    /**
     * @dev Create governance proposal
     */
    function createProposal(
        string calldata title,
        string calldata description,
        uint256 votingPeriod
    ) external returns (uint256) {
        require(votingPower[msg.sender] >= 5, "Insufficient voting power");
        require(votingPeriod >= 1 days && votingPeriod <= 14 days, "Invalid voting period");

        _proposalIds.increment();
        uint256 proposalId = _proposalIds.current();

        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.title = title;
        proposal.description = description;
        proposal.proposer = msg.sender;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + votingPeriod;
        proposal.active = true;

        emit ProposalCreated(proposalId, msg.sender, title);
        return proposalId;
    }

    /**
     * @dev Vote on proposal
     */
    function vote(uint256 proposalId, uint8 support) external {
        require(support <= 2, "Invalid vote type");
        require(votingPower[msg.sender] > 0, "No voting power");

        Proposal storage proposal = proposals[proposalId];
        require(proposal.active, "Proposal not active");
        require(block.timestamp >= proposal.startTime, "Voting not started");
        require(block.timestamp <= proposal.endTime, "Voting ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");

        uint256 weight = votingPower[msg.sender];
        proposal.hasVoted[msg.sender] = true;
        proposal.votes[msg.sender] = support;

        if (support == 0) {
            proposal.againstVotes += weight;
        } else if (support == 1) {
            proposal.forVotes += weight;
        } else {
            proposal.abstainVotes += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    /**
     * @dev Execute proposal if passed
     */
    function executeProposal(uint256 proposalId) external onlyRole(ADMIN_ROLE) {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.active, "Proposal not active");
        require(block.timestamp > proposal.endTime, "Voting not ended");
        require(!proposal.executed, "Already executed");

        uint256 totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        require(totalVotes >= 50, "Quorum not reached"); // Minimum 50 voting power

        bool passed = proposal.forVotes > proposal.againstVotes;
        require(passed, "Proposal did not pass");

        proposal.executed = true;
        proposal.active = false;

        emit ProposalExecuted(proposalId);
    }

    /**
     * @dev Update tier configuration (admin only)
     */
    function updateTierConfig(
        StakingTier tier,
        uint256 minLockPeriod,
        uint256 baseMultiplier,
        uint256 bonusMultiplier,
        uint256 governanceWeight
    ) external onlyRole(ADMIN_ROLE) {
        tierConfigs[tier] = TierConfig({
            minLockPeriod: minLockPeriod,
            baseMultiplier: baseMultiplier,
            bonusMultiplier: bonusMultiplier,
            governanceWeight: governanceWeight,
            enabled: true
        });
    }

    /**
     * @dev Update daily reward rate (admin only)
     */
    function updateDailyRewardRate(uint256 newRate) external onlyRole(ADMIN_ROLE) {
        dailyRewardRate = newRate;
    }

    /**
     * @dev Add rewards to pool (admin only)
     */
    function addRewards(uint256 amount) external onlyRole(ADMIN_ROLE) {
        IERC20(rewardToken).transferFrom(msg.sender, address(this), amount);
        totalRewardPool += amount;
    }

    /**
     * @dev Helper function to remove token from user stakes array
     */
    function _removeFromUserStakes(address user, uint256 tokenId) private {
        uint256[] storage stakes = userStakes[user];
        for (uint256 i = 0; i < stakes.length; i++) {
            if (stakes[i] == tokenId) {
                stakes[i] = stakes[stakes.length - 1];
                stakes.pop();
                break;
            }
        }
    }

    /**
     * @dev Get proposal details
     */
    function getProposal(uint256 proposalId) external view returns (
        string memory title,
        string memory description,
        address proposer,
        uint256 startTime,
        uint256 endTime,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes,
        bool executed,
        bool active
    ) {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.title,
            proposal.description,
            proposal.proposer,
            proposal.startTime,
            proposal.endTime,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.abstainVotes,
            proposal.executed,
            proposal.active
        );
    }

    /**
     * @dev Emergency functions
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Emergency withdrawal (admin only)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyRole(ADMIN_ROLE) {
        IERC20(token).transfer(msg.sender, amount);
    }
}