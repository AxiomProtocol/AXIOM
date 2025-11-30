// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MetalOfTheGods Secure NFT Contract
 * @dev Enhanced security implementation with multi-sig, timelock, and emergency controls
 * @author SWF Development Team
 * @notice This contract implements comprehensive security measures for the MetalOfTheGods NFT collection
 */
contract MetalOfTheGodsSecure is 
    Initializable,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant MULTISIG_ROLE = keccak256("MULTISIG_ROLE");

    // Contract state variables
    uint256 public constant MAX_SUPPLY = 10000;
    uint256 public constant TIMELOCK_DELAY = 24 hours;
    
    IERC20 public swfToken;
    address public multiSigWallet;
    address public treasuryWallet;
    
    // Staking variables
    mapping(uint256 => bool) public stakedTokens;
    mapping(uint256 => uint256) public stakingStartTime;
    mapping(uint256 => uint256) public stakingLockPeriod;
    mapping(address => uint256[]) public userStakedTokens;
    mapping(uint256 => uint256) public tokenRarity; // 1=common, 2=rare, 3=epic, 4=legendary
    
    // Security and governance
    mapping(bytes32 => uint256) public timelockProposals;
    mapping(bytes32 => bool) public executedProposals;
    mapping(address => bool) public emergencyStoppers;
    
    // Events
    event TokenStaked(uint256 indexed tokenId, address indexed owner, uint256 lockPeriod);
    event TokenUnstaked(uint256 indexed tokenId, address indexed owner, uint256 rewards);
    event RewardsDistributed(address indexed user, uint256 amount);
    event ProposalQueued(bytes32 indexed proposalId, uint256 executeTime);
    event ProposalExecuted(bytes32 indexed proposalId);
    event EmergencyStop(address indexed stopper, string reason);
    event MultiSigWalletUpdated(address indexed oldWallet, address indexed newWallet);

    // Custom errors for gas optimization
    error MaxSupplyExceeded();
    error TokenNotExists();
    error NotTokenOwner();
    error TokenAlreadyStaked();
    error TokenNotStaked();
    error StakingLockActive();
    error ProposalNotReady();
    error ProposalAlreadyExecuted();
    error InsufficientStakingPeriod();
    error UnauthorizedAccess();
    error InvalidMultiSigWallet();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the contract with security parameters
     * @param _multiSigWallet Multi-signature wallet address for treasury operations
     * @param _swfToken SWF token contract address for rewards
     * @param _treasuryWallet Treasury wallet for reward distribution
     */
    function initialize(
        address _multiSigWallet,
        address _swfToken,
        address _treasuryWallet
    ) initializer public {
        __ERC721_init("MetalOfTheGods", "MOTG");
        __ERC721Enumerable_init();
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        require(_multiSigWallet != address(0), "Invalid multisig wallet");
        require(_swfToken != address(0), "Invalid SWF token");
        require(_treasuryWallet != address(0), "Invalid treasury wallet");

        multiSigWallet = _multiSigWallet;
        swfToken = IERC20(_swfToken);
        treasuryWallet = _treasuryWallet;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, _multiSigWallet);
        _grantRole(MULTISIG_ROLE, _multiSigWallet);

        // Set emergency stoppers
        emergencyStoppers[msg.sender] = true;
        emergencyStoppers[_multiSigWallet] = true;
    }

    /**
     * @dev Secure minting function with supply checks
     * @param to Address to mint NFT to
     * @param tokenId Token ID to mint
     * @param rarity Rarity level (1-4)
     */
    function safeMint(
        address to,
        uint256 tokenId,
        uint256 rarity
    ) public onlyRole(MINTER_ROLE) whenNotPaused {
        if (totalSupply() >= MAX_SUPPLY) revert MaxSupplyExceeded();
        require(rarity >= 1 && rarity <= 4, "Invalid rarity");
        
        _safeMint(to, tokenId);
        tokenRarity[tokenId] = rarity;
    }

    /**
     * @dev Stake NFT with lock period for enhanced rewards
     * @param tokenId Token ID to stake
     * @param lockPeriod Lock period in seconds (0 for flexible, 30/60/90/180 days for fixed)
     */
    function stakeToken(uint256 tokenId, uint256 lockPeriod) 
        external 
        whenNotPaused 
        nonReentrant 
    {
        if (!_exists(tokenId)) revert TokenNotExists();
        if (ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        if (stakedTokens[tokenId]) revert TokenAlreadyStaked();

        // Validate lock periods (0, 30, 60, 90, 180 days)
        require(
            lockPeriod == 0 || 
            lockPeriod == 30 days || 
            lockPeriod == 60 days || 
            lockPeriod == 90 days || 
            lockPeriod == 180 days,
            "Invalid lock period"
        );

        stakedTokens[tokenId] = true;
        stakingStartTime[tokenId] = block.timestamp;
        stakingLockPeriod[tokenId] = lockPeriod;
        userStakedTokens[msg.sender].push(tokenId);

        emit TokenStaked(tokenId, msg.sender, lockPeriod);
    }

    /**
     * @dev Unstake NFT and claim rewards
     * @param tokenId Token ID to unstake
     */
    function unstakeToken(uint256 tokenId) 
        external 
        whenNotPaused 
        nonReentrant 
    {
        if (!_exists(tokenId)) revert TokenNotExists();
        if (ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        if (!stakedTokens[tokenId]) revert TokenNotStaked();

        // Check if lock period has passed
        uint256 lockUntil = stakingStartTime[tokenId] + stakingLockPeriod[tokenId];
        if (block.timestamp < lockUntil) revert StakingLockActive();

        // Calculate rewards
        uint256 rewards = calculateStakingRewards(tokenId);
        
        // Update state
        stakedTokens[tokenId] = false;
        stakingStartTime[tokenId] = 0;
        stakingLockPeriod[tokenId] = 0;
        
        // Remove from user's staked tokens array
        _removeFromUserStakedTokens(msg.sender, tokenId);

        // Distribute rewards from treasury
        if (rewards > 0) {
            require(
                swfToken.transferFrom(treasuryWallet, msg.sender, rewards),
                "Reward transfer failed"
            );
            emit RewardsDistributed(msg.sender, rewards);
        }

        emit TokenUnstaked(tokenId, msg.sender, rewards);
    }

    /**
     * @dev Calculate staking rewards based on time, rarity, and lock period
     * @param tokenId Token ID to calculate rewards for
     * @return rewards Amount of SWF tokens earned
     */
    function calculateStakingRewards(uint256 tokenId) public view returns (uint256) {
        if (!stakedTokens[tokenId]) return 0;

        uint256 stakingDuration = block.timestamp - stakingStartTime[tokenId];
        uint256 rarity = tokenRarity[tokenId];
        uint256 lockPeriod = stakingLockPeriod[tokenId];

        // Base reward: 50 SWF per day
        uint256 baseReward = 50 * 1e18; // 50 SWF in wei
        uint256 dailyReward = (baseReward * stakingDuration) / 1 days;

        // Rarity multipliers: 1x, 2x, 3x, 5x
        uint256 rarityMultiplier = rarity == 4 ? 5 : rarity;
        dailyReward = dailyReward * rarityMultiplier;

        // Lock period bonuses
        if (lockPeriod == 30 days) dailyReward = (dailyReward * 110) / 100; // 10% bonus
        else if (lockPeriod == 60 days) dailyReward = (dailyReward * 125) / 100; // 25% bonus
        else if (lockPeriod == 90 days) dailyReward = (dailyReward * 150) / 100; // 50% bonus
        else if (lockPeriod == 180 days) dailyReward = (dailyReward * 200) / 100; // 100% bonus

        return dailyReward;
    }

    /**
     * @dev Queue a proposal with timelock delay
     * @param proposalId Unique identifier for the proposal
     * @param data Encoded function call data
     */
    function queueProposal(bytes32 proposalId, bytes calldata data) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(timelockProposals[proposalId] == 0, "Proposal already queued");
        
        uint256 executeTime = block.timestamp + TIMELOCK_DELAY;
        timelockProposals[proposalId] = executeTime;
        
        emit ProposalQueued(proposalId, executeTime);
    }

    /**
     * @dev Execute a queued proposal after timelock delay
     * @param proposalId Proposal identifier
     * @param target Target contract address
     * @param data Function call data
     */
    function executeProposal(
        bytes32 proposalId,
        address target,
        bytes calldata data
    ) external onlyRole(MULTISIG_ROLE) {
        uint256 executeTime = timelockProposals[proposalId];
        if (executeTime == 0) revert ProposalNotReady();
        if (block.timestamp < executeTime) revert ProposalNotReady();
        if (executedProposals[proposalId]) revert ProposalAlreadyExecuted();

        executedProposals[proposalId] = true;
        
        (bool success, ) = target.call(data);
        require(success, "Proposal execution failed");
        
        emit ProposalExecuted(proposalId);
    }

    /**
     * @dev Emergency pause function for security incidents
     * @param reason Reason for emergency stop
     */
    function emergencyStop(string calldata reason) external {
        if (!emergencyStoppers[msg.sender]) revert UnauthorizedAccess();
        
        _pause();
        emit EmergencyStop(msg.sender, reason);
    }

    /**
     * @dev Update multi-signature wallet (requires current multisig approval)
     * @param newMultiSigWallet New multi-signature wallet address
     */
    function updateMultiSigWallet(address newMultiSigWallet) 
        external 
        onlyRole(MULTISIG_ROLE) 
    {
        if (newMultiSigWallet == address(0)) revert InvalidMultiSigWallet();
        
        address oldWallet = multiSigWallet;
        multiSigWallet = newMultiSigWallet;
        
        // Transfer roles to new multisig
        _grantRole(UPGRADER_ROLE, newMultiSigWallet);
        _grantRole(MULTISIG_ROLE, newMultiSigWallet);
        _revokeRole(UPGRADER_ROLE, oldWallet);
        _revokeRole(MULTISIG_ROLE, oldWallet);
        
        emergencyStoppers[newMultiSigWallet] = true;
        emergencyStoppers[oldWallet] = false;
        
        emit MultiSigWalletUpdated(oldWallet, newMultiSigWallet);
    }

    /**
     * @dev Get user's staked tokens
     * @param user User address
     * @return Array of staked token IDs
     */
    function getUserStakedTokens(address user) external view returns (uint256[] memory) {
        return userStakedTokens[user];
    }

    /**
     * @dev Get staking info for a token
     * @param tokenId Token ID
     * @return isStaked Whether token is staked
     * @return startTime Staking start timestamp
     * @return lockPeriod Lock period in seconds
     * @return pendingRewards Calculated pending rewards
     */
    function getStakingInfo(uint256 tokenId) 
        external 
        view 
        returns (
            bool isStaked,
            uint256 startTime,
            uint256 lockPeriod,
            uint256 pendingRewards
        ) 
    {
        isStaked = stakedTokens[tokenId];
        startTime = stakingStartTime[tokenId];
        lockPeriod = stakingLockPeriod[tokenId];
        pendingRewards = calculateStakingRewards(tokenId);
    }

    // Internal functions
    function _removeFromUserStakedTokens(address user, uint256 tokenId) internal {
        uint256[] storage userTokens = userStakedTokens[user];
        for (uint256 i = 0; i < userTokens.length; i++) {
            if (userTokens[i] == tokenId) {
                userTokens[i] = userTokens[userTokens.length - 1];
                userTokens.pop();
                break;
            }
        }
    }

    // Administrative functions
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {}

    // Override required functions
    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        whenNotPaused
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
    {
        // Prevent transfer of staked tokens
        require(!stakedTokens[tokenId], "Cannot transfer staked token");
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}