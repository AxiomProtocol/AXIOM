// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title GamificationHub
 * @notice Gamification and achievement system for Axiom Smart City
 * @dev NFT-based achievements, badges, quests, leaderboards, and rewards
 * 
 * Features:
 * - Achievement NFTs (non-transferable SBTs)
 * - Badge system with tiers
 * - Quest and mission tracking
 * - Leaderboards and rankings
 * - Point and XP system
 * - Reward distribution
 * - Community challenges
 */
contract GamificationHub is AccessControl, ReentrancyGuard, Pausable {

    // ============================================
    // ROLES
    // ============================================
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant QUEST_CREATOR_ROLE = keccak256("QUEST_CREATOR_ROLE");
    bytes32 public constant ACHIEVEMENT_ISSUER_ROLE = keccak256("ACHIEVEMENT_ISSUER_ROLE");

    // ============================================
    // CONSTANTS
    // ============================================
    uint256 public constant MAX_ACHIEVEMENTS_PER_USER = 500;
    uint256 public constant MAX_QUESTS = 1000;
    uint256 public constant MAX_QUESTS_PER_USER = 50;     // CRITICAL FIX: Prevent DOS
    uint256 public constant MAX_QUEST_OBJECTIVES = 20;
    uint256 public constant MAX_LEADERBOARD_SIZE = 1000;
    uint256 public constant MAX_CHALLENGES = 100;

    // ============================================
    // STATE VARIABLES
    // ============================================
    uint256 public totalAchievements;
    uint256 public totalAchievementTypes;
    uint256 public totalQuests;
    uint256 public totalChallenges;
    uint256 public nextAchievementId;

    // ============================================
    // ENUMS
    // ============================================
    
    enum AchievementTier {
        Bronze,
        Silver,
        Gold,
        Platinum,
        Diamond
    }
    
    enum QuestStatus {
        Active,
        Completed,
        Expired,
        Cancelled
    }
    
    enum ChallengeType {
        Individual,
        Team,
        Community
    }
    
    // ============================================
    // STRUCTS
    // ============================================
    
    struct AchievementType {
        uint256 typeId;
        string name;
        string description;
        string imageURI;
        AchievementTier tier;
        uint256 pointsReward;
        uint256 xpReward;
        bool isActive;
        uint256 totalIssued;
    }
    
    struct Achievement {
        uint256 achievementId;
        uint256 typeId;
        address recipient;
        uint256 earnedAt;
        string metadataURI;
    }
    
    struct Quest {
        uint256 questId;
        string name;
        string description;
        address creator;
        uint256 startTime;
        uint256 endTime;
        uint256 pointsReward;
        uint256 xpReward;
        uint256 participantCount;
        uint256 completionCount;
        bool isActive;
    }
    
    struct QuestObjective {
        uint256 objectiveId;
        string description;
        uint256 targetValue;
        bool isRequired;
    }
    
    struct QuestProgress {
        uint256 questId;
        address participant;
        uint256 startedAt;
        uint256 completedAt;
        QuestStatus status;
        mapping(uint256 => uint256) objectiveProgress;
    }
    
    struct UserProfile {
        address userAddress;
        uint256 totalPoints;
        uint256 totalXP;
        uint256 level;
        uint256 achievementCount;
        uint256 questsCompleted;
        uint256 rank;
        uint256 lastActivityAt;
    }
    
    struct Challenge {
        uint256 challengeId;
        string name;
        string description;
        ChallengeType challengeType;
        uint256 startTime;
        uint256 endTime;
        uint256 targetValue;
        uint256 currentValue;
        uint256 participantCount;
        bool isCompleted;
    }
    
    // ============================================
    // MAPPINGS
    // ============================================
    
    // Achievement types
    mapping(uint256 => AchievementType) private achievementTypes;
    mapping(uint256 => bool) public achievementTypeExists;
    
    // User achievements
    mapping(uint256 => Achievement) private achievements;
    mapping(address => uint256[]) private userAchievements;
    mapping(address => mapping(uint256 => bool)) public hasAchievement;
    
    // Quests
    mapping(uint256 => Quest) private quests;
    mapping(uint256 => QuestObjective[]) private questObjectives;
    mapping(address => mapping(uint256 => QuestProgress)) private questProgress;
    mapping(address => uint256[]) private userQuests;
    
    // CRITICAL FIX: Quest progress authority control
    mapping(uint256 => mapping(address => bool)) public questProgressUpdaters;
    
    // User profiles
    mapping(address => UserProfile) private userProfiles;
    mapping(address => bool) public hasProfile;
    
    // Leaderboard
    address[] private leaderboard;
    
    // Challenges
    mapping(uint256 => Challenge) private challenges;
    mapping(uint256 => mapping(address => bool)) public challengeParticipants;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event ProfileCreated(address indexed user, uint256 timestamp);
    
    event AchievementTypeCreated(
        uint256 indexed typeId,
        string name,
        AchievementTier tier
    );
    
    event AchievementEarned(
        uint256 indexed achievementId,
        address indexed recipient,
        uint256 typeId,
        uint256 pointsReward,
        uint256 xpReward
    );
    
    event QuestCreated(
        uint256 indexed questId,
        string name,
        uint256 startTime,
        uint256 endTime
    );
    
    event QuestStarted(
        uint256 indexed questId,
        address indexed participant
    );
    
    event QuestCompleted(
        uint256 indexed questId,
        address indexed participant,
        uint256 pointsReward,
        uint256 xpReward
    );
    
    event ObjectiveCompleted(
        uint256 indexed questId,
        address indexed participant,
        uint256 objectiveId
    );
    
    event PointsAwarded(
        address indexed user,
        uint256 points,
        string reason
    );
    
    event XPAwarded(
        address indexed user,
        uint256 xp,
        string reason
    );
    
    event LevelUp(
        address indexed user,
        uint256 newLevel
    );
    
    event ChallengeCreated(
        uint256 indexed challengeId,
        string name,
        ChallengeType challengeType
    );
    
    event ChallengeJoined(
        uint256 indexed challengeId,
        address indexed participant
    );
    
    event ChallengeCompleted(
        uint256 indexed challengeId,
        uint256 finalValue
    );
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(QUEST_CREATOR_ROLE, msg.sender);
        _grantRole(ACHIEVEMENT_ISSUER_ROLE, msg.sender);
    }
    
    // ============================================
    // USER PROFILE
    // ============================================
    
    /**
     * @notice Create a user profile
     */
    function createProfile() external nonReentrant whenNotPaused {
        require(!hasProfile[msg.sender], "Profile exists");
        
        UserProfile storage profile = userProfiles[msg.sender];
        profile.userAddress = msg.sender;
        profile.lastActivityAt = block.timestamp;
        
        hasProfile[msg.sender] = true;
        
        emit ProfileCreated(msg.sender, block.timestamp);
    }
    
    /**
     * @notice Update user activity
     */
    function _updateActivity(address user) private {
        userProfiles[user].lastActivityAt = block.timestamp;
    }
    
    // ============================================
    // ACHIEVEMENT TYPES
    // ============================================
    
    /**
     * @notice Create a new achievement type
     */
    function createAchievementType(
        string calldata name,
        string calldata description,
        string calldata imageURI,
        AchievementTier tier,
        uint256 pointsReward,
        uint256 xpReward
    ) external onlyRole(ADMIN_ROLE) returns (uint256) {
        require(bytes(name).length > 0 && bytes(name).length <= 100, "Invalid name");
        
        totalAchievementTypes++;
        uint256 typeId = totalAchievementTypes;
        
        AchievementType storage achievementType = achievementTypes[typeId];
        achievementType.typeId = typeId;
        achievementType.name = name;
        achievementType.description = description;
        achievementType.imageURI = imageURI;
        achievementType.tier = tier;
        achievementType.pointsReward = pointsReward;
        achievementType.xpReward = xpReward;
        achievementType.isActive = true;
        
        achievementTypeExists[typeId] = true;
        
        emit AchievementTypeCreated(typeId, name, tier);
        
        return typeId;
    }
    
    // ============================================
    // ACHIEVEMENTS
    // ============================================
    
    /**
     * @notice Award an achievement to a user
     */
    function awardAchievement(
        address recipient,
        uint256 typeId,
        string calldata metadataURI
    ) external onlyRole(ACHIEVEMENT_ISSUER_ROLE) nonReentrant whenNotPaused returns (uint256) {
        require(hasProfile[recipient], "No profile");
        require(achievementTypeExists[typeId], "Achievement type does not exist");
        require(!hasAchievement[recipient][typeId], "Already has achievement");
        require(userAchievements[recipient].length < MAX_ACHIEVEMENTS_PER_USER, "Max achievements reached");
        
        AchievementType storage achievementType = achievementTypes[typeId];
        require(achievementType.isActive, "Achievement type not active");
        
        nextAchievementId++;
        uint256 achievementId = nextAchievementId;
        
        Achievement storage achievement = achievements[achievementId];
        achievement.achievementId = achievementId;
        achievement.typeId = typeId;
        achievement.recipient = recipient;
        achievement.earnedAt = block.timestamp;
        achievement.metadataURI = metadataURI;
        
        userAchievements[recipient].push(achievementId);
        hasAchievement[recipient][typeId] = true;
        
        achievementType.totalIssued++;
        userProfiles[recipient].achievementCount++;
        totalAchievements++;
        
        // Award points and XP
        _awardPoints(recipient, achievementType.pointsReward, "Achievement earned");
        _awardXP(recipient, achievementType.xpReward, "Achievement earned");
        
        _updateActivity(recipient);
        
        emit AchievementEarned(
            achievementId,
            recipient,
            typeId,
            achievementType.pointsReward,
            achievementType.xpReward
        );
        
        return achievementId;
    }
    
    // ============================================
    // QUESTS
    // ============================================
    
    /**
     * @notice Create a new quest
     */
    function createQuest(
        string calldata name,
        string calldata description,
        uint256 duration,
        uint256 pointsReward,
        uint256 xpReward
    ) external onlyRole(QUEST_CREATOR_ROLE) whenNotPaused returns (uint256) {
        require(totalQuests < MAX_QUESTS, "Max quests reached");
        require(bytes(name).length > 0 && bytes(name).length <= 200, "Invalid name");
        require(duration > 0 && duration <= 365 days, "Invalid duration");
        
        totalQuests++;
        uint256 questId = totalQuests;
        
        Quest storage quest = quests[questId];
        quest.questId = questId;
        quest.name = name;
        quest.description = description;
        quest.creator = msg.sender;
        quest.startTime = block.timestamp;
        quest.endTime = block.timestamp + duration;
        quest.pointsReward = pointsReward;
        quest.xpReward = xpReward;
        quest.isActive = true;
        
        // CRITICAL FIX: Quest creator is authorized to update progress
        questProgressUpdaters[questId][msg.sender] = true;
        
        emit QuestCreated(questId, name, quest.startTime, quest.endTime);
        
        return questId;
    }
    
    /**
     * @notice Add an objective to a quest
     */
    function addQuestObjective(
        uint256 questId,
        string calldata description,
        uint256 targetValue,
        bool isRequired
    ) external onlyRole(QUEST_CREATOR_ROLE) whenNotPaused returns (uint256) {  // CRITICAL FIX: Add pause protection
        Quest storage quest = quests[questId];
        require(quest.isActive, "Quest not active");
        require(quest.creator != address(0), "Quest does not exist");
        
        // CRITICAL FIX: Only quest creator can add objectives to their quest
        require(quest.creator == msg.sender, "Not quest creator");
        
        QuestObjective[] storage objectives = questObjectives[questId];
        require(objectives.length < MAX_QUEST_OBJECTIVES, "Max objectives reached");
        
        uint256 objectiveId = objectives.length;
        
        QuestObjective memory objective = QuestObjective({
            objectiveId: objectiveId,
            description: description,
            targetValue: targetValue,
            isRequired: isRequired
        });
        
        objectives.push(objective);
        
        return objectiveId;
    }
    
    /**
     * @notice Start a quest
     */
    function startQuest(uint256 questId) external nonReentrant whenNotPaused {
        require(hasProfile[msg.sender], "No profile");
        Quest storage quest = quests[questId];
        require(quest.isActive, "Quest not active");
        require(block.timestamp <= quest.endTime, "Quest expired");
        
        QuestProgress storage progress = questProgress[msg.sender][questId];
        require(progress.participant == address(0), "Quest already started");  // CRITICAL FIX: Proper check
        
        // CRITICAL FIX: Enforce max quests per user
        require(userQuests[msg.sender].length < MAX_QUESTS_PER_USER, "Max quests per user reached");
        
        progress.questId = questId;
        progress.participant = msg.sender;
        progress.startedAt = block.timestamp;
        progress.status = QuestStatus.Active;
        
        userQuests[msg.sender].push(questId);
        quest.participantCount++;
        
        _updateActivity(msg.sender);
        
        emit QuestStarted(questId, msg.sender);
    }
    
    /**
     * @notice Authorize an address to update quest progress (quest creator only)
     */
    function authorizeQuestUpdater(
        uint256 questId,
        address updater
    ) external onlyRole(QUEST_CREATOR_ROLE) {
        Quest storage quest = quests[questId];
        require(quest.creator == msg.sender, "Not quest creator");
        
        questProgressUpdaters[questId][updater] = true;
    }
    
    /**
     * @notice Submit quest progress for a participant (CRITICAL FIX: Authority-based with delta updates)
     */
    function submitQuestProgress(
        address participant,
        uint256 questId,
        uint256 objectiveId,
        uint256 delta
    ) external nonReentrant whenNotPaused {
        require(hasProfile[participant], "Participant has no profile");
        
        // CRITICAL FIX: Only authorized updaters can submit progress
        require(
            questProgressUpdaters[questId][msg.sender] || 
            quests[questId].creator == msg.sender,
            "Not authorized to update quest"
        );
        
        QuestProgress storage progress = questProgress[participant][questId];
        require(progress.status == QuestStatus.Active, "Quest not active for participant");
        require(progress.participant == participant, "Invalid participant");
        
        QuestObjective[] storage objectives = questObjectives[questId];
        require(objectiveId < objectives.length, "Invalid objective");
        
        // CRITICAL FIX: Monotonic delta-based updates capped at targetValue
        uint256 currentProgress = progress.objectiveProgress[objectiveId];
        uint256 newProgress = currentProgress + delta;
        
        // Cap at target value to prevent over-completion
        if (newProgress > objectives[objectiveId].targetValue) {
            newProgress = objectives[objectiveId].targetValue;
        }
        
        progress.objectiveProgress[objectiveId] = newProgress;
        
        if (newProgress >= objectives[objectiveId].targetValue && 
            currentProgress < objectives[objectiveId].targetValue) {
            emit ObjectiveCompleted(questId, participant, objectiveId);
        }
        
        _updateActivity(participant);
        
        // Check if all required objectives are completed
        _checkQuestCompletion(participant, questId);
    }
    
    /**
     * @notice Check if quest is completed
     */
    function _checkQuestCompletion(address user, uint256 questId) private {
        QuestProgress storage progress = questProgress[user][questId];
        if (progress.status != QuestStatus.Active) return;
        
        QuestObjective[] storage objectives = questObjectives[questId];
        
        for (uint256 i = 0; i < objectives.length; i++) {
            if (objectives[i].isRequired) {
                if (progress.objectiveProgress[i] < objectives[i].targetValue) {
                    return; // Not all required objectives completed
                }
            }
        }
        
        // All required objectives completed
        _completeQuest(user, questId);
    }
    
    /**
     * @notice Complete a quest
     */
    function _completeQuest(address user, uint256 questId) private {
        QuestProgress storage progress = questProgress[user][questId];
        Quest storage quest = quests[questId];
        
        progress.status = QuestStatus.Completed;
        progress.completedAt = block.timestamp;
        
        quest.completionCount++;
        userProfiles[user].questsCompleted++;
        
        // Award rewards
        _awardPoints(user, quest.pointsReward, "Quest completed");
        _awardXP(user, quest.xpReward, "Quest completed");
        
        emit QuestCompleted(questId, user, quest.pointsReward, quest.xpReward);
    }
    
    // ============================================
    // POINTS & XP SYSTEM
    // ============================================
    
    /**
     * @notice Award points to a user
     */
    function _awardPoints(address user, uint256 points, string memory reason) private {
        if (points == 0) return;
        
        userProfiles[user].totalPoints += points;
        
        emit PointsAwarded(user, points, reason);
    }
    
    /**
     * @notice Award XP to a user
     */
    function _awardXP(address user, uint256 xp, string memory reason) private {
        if (xp == 0) return;
        
        UserProfile storage profile = userProfiles[user];
        uint256 oldLevel = profile.level;
        
        profile.totalXP += xp;
        
        // Calculate new level (simple formula: level = sqrt(totalXP / 1000))
        uint256 newLevel = _calculateLevel(profile.totalXP);
        
        if (newLevel > oldLevel) {
            profile.level = newLevel;
            emit LevelUp(user, newLevel);
        }
        
        emit XPAwarded(user, xp, reason);
    }
    
    /**
     * @notice Calculate level from XP
     */
    function _calculateLevel(uint256 totalXP) private pure returns (uint256) {
        if (totalXP == 0) return 0;
        
        // Simple level formula: level = floor(sqrt(totalXP / 100))
        uint256 level = 0;
        uint256 xpThreshold = 100;
        
        while (totalXP >= xpThreshold) {
            level++;
            xpThreshold = (level + 1) * (level + 1) * 100;
        }
        
        return level;
    }
    
    // ============================================
    // CHALLENGES
    // ============================================
    
    /**
     * @notice Create a community challenge
     */
    function createChallenge(
        string calldata name,
        string calldata description,
        ChallengeType challengeType,
        uint256 duration,
        uint256 targetValue
    ) external onlyRole(ADMIN_ROLE) whenNotPaused returns (uint256) {  // CRITICAL FIX: Already has pause protection
        require(totalChallenges < MAX_CHALLENGES, "Max challenges reached");
        require(bytes(name).length > 0 && bytes(name).length <= 200, "Invalid name");
        
        totalChallenges++;
        uint256 challengeId = totalChallenges;
        
        Challenge storage challenge = challenges[challengeId];
        challenge.challengeId = challengeId;
        challenge.name = name;
        challenge.description = description;
        challenge.challengeType = challengeType;
        challenge.startTime = block.timestamp;
        challenge.endTime = block.timestamp + duration;
        challenge.targetValue = targetValue;
        
        emit ChallengeCreated(challengeId, name, challengeType);
        
        return challengeId;
    }
    
    /**
     * @notice Join a challenge
     */
    function joinChallenge(uint256 challengeId) external nonReentrant whenNotPaused {
        require(hasProfile[msg.sender], "No profile");
        Challenge storage challenge = challenges[challengeId];
        require(block.timestamp <= challenge.endTime, "Challenge expired");
        require(!challengeParticipants[challengeId][msg.sender], "Already joined");
        
        challengeParticipants[challengeId][msg.sender] = true;
        challenge.participantCount++;
        
        _updateActivity(msg.sender);
        
        emit ChallengeJoined(challengeId, msg.sender);
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    function getUserProfile(address user) external view returns (UserProfile memory) {
        return userProfiles[user];
    }
    
    function getAchievementType(uint256 typeId) external view returns (AchievementType memory) {
        return achievementTypes[typeId];
    }
    
    function getAchievement(uint256 achievementId) external view returns (Achievement memory) {
        return achievements[achievementId];
    }
    
    function getUserAchievements(address user) external view returns (uint256[] memory) {
        return userAchievements[user];
    }
    
    function getQuest(uint256 questId) external view returns (Quest memory) {
        return quests[questId];
    }
    
    function getQuestObjectives(uint256 questId) external view returns (QuestObjective[] memory) {
        return questObjectives[questId];
    }
    
    function getUserQuests(address user) external view returns (uint256[] memory) {
        return userQuests[user];
    }
    
    function getChallenge(uint256 challengeId) external view returns (Challenge memory) {
        return challenges[challengeId];
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}
