// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title CommunitySocialHub
 * @notice Social graph and community engagement platform for Axiom Smart City
 * @dev On-chain social networking with profiles, connections, content, and reputation
 * 
 * Features:
 * - User profiles with metadata (IPFS)
 * - Social connections (follow/unfollow)
 * - Content posting with tags and reactions
 * - Community groups and memberships
 * - Reputation system integration
 * - Content moderation and governance
 * - Privacy controls
 */
contract CommunitySocialHub is AccessControl, ReentrancyGuard, Pausable {

    // ============================================
    // ROLES
    // ============================================
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MODERATOR_ROLE = keccak256("MODERATOR_ROLE");

    // ============================================
    // CONSTANTS
    // ============================================
    uint256 public constant MAX_BIO_LENGTH = 500;
    uint256 public constant MAX_POST_LENGTH = 5000;
    uint256 public constant MAX_TAGS_PER_POST = 10;
    uint256 public constant MAX_FOLLOWERS_PER_QUERY = 100;
    uint256 public constant MAX_FOLLOWERS = 1000;         // CRITICAL FIX: Cap followers to prevent DOS
    uint256 public constant MAX_FOLLOWING = 1000;         // CRITICAL FIX: Cap following to prevent DOS
    uint256 public constant MAX_GROUP_MEMBERS = 500;      // CRITICAL FIX: Reduced from 10k to prevent DOS
    uint256 public constant MAX_POSTS_PER_USER = 10000;   // CRITICAL FIX: Cap posts per user
    uint256 public constant MAX_COMMENTS_PER_POST = 1000; // CRITICAL FIX: Cap comments per post

    // ============================================
    // STATE VARIABLES
    // ============================================
    uint256 public totalProfiles;
    uint256 public totalPosts;
    uint256 public totalGroups;
    uint256 public totalConnections;

    // ============================================
    // ENUMS
    // ============================================
    
    enum PrivacyLevel {
        Public,         // Visible to everyone
        FollowersOnly,  // Visible to followers only
        Private         // Visible only to user
    }
    
    enum ContentType {
        Text,
        Link,
        Image,
        Video,
        Poll
    }
    
    enum ReactionType {
        Like,
        Love,
        Support,
        Celebrate,
        Insightful
    }
    
    // ============================================
    // STRUCTS
    // ============================================
    
    struct Profile {
        address walletAddress;
        string username;
        string displayName;
        string bio;
        string avatarURI;       // IPFS URI
        string metadataURI;     // IPFS URI for additional metadata
        uint256 followerCount;
        uint256 followingCount;
        uint256 postCount;
        uint256 reputationScore;
        bool isVerified;
        bool isActive;
        uint256 createdAt;
    }
    
    struct Post {
        uint256 postId;
        address author;
        ContentType contentType;
        string content;         // Text or IPFS URI
        string[] tags;
        PrivacyLevel privacy;
        uint256 likeCount;
        uint256 commentCount;
        uint256 shareCount;
        bool isPinned;
        bool isHidden;          // Hidden by moderator
        uint256 createdAt;
    }
    
    struct Comment {
        uint256 commentId;
        uint256 postId;
        address author;
        string content;
        uint256 likeCount;
        uint256 createdAt;
    }
    
    struct Group {
        uint256 groupId;
        string name;
        string description;
        string imageURI;
        address creator;
        uint256 memberCount;
        bool isPublic;
        bool isActive;
        uint256 createdAt;
    }
    
    struct Reaction {
        address user;
        ReactionType reactionType;
        uint256 timestamp;
    }
    
    // ============================================
    // MAPPINGS
    // ============================================
    
    // Profile storage
    mapping(address => Profile) public profiles;
    mapping(string => address) public usernameToAddress;
    mapping(address => bool) public hasProfile;
    
    // Social graph
    mapping(address => mapping(address => bool)) public isFollowing;
    mapping(address => address[]) private followers;
    mapping(address => address[]) private following;
    
    // Content storage - CRITICAL FIX: private to prevent bypassing privacy checks via auto-generated getters
    mapping(uint256 => Post) private posts;
    mapping(address => uint256[]) private userPosts;
    mapping(uint256 => Comment[]) private postComments;
    
    // Reactions - CRITICAL FIX: Track if user has reacted to handle enum zero value
    mapping(uint256 => mapping(address => ReactionType)) public postReactions;
    mapping(uint256 => mapping(address => bool)) public hasReacted;  // CRITICAL FIX: Distinguish zero enum from no reaction
    mapping(uint256 => mapping(ReactionType => uint256)) public reactionCounts;
    
    // Groups
    mapping(uint256 => Group) public groups;
    mapping(uint256 => mapping(address => bool)) public groupMembers;
    mapping(uint256 => address[]) private groupMemberList;
    mapping(address => uint256[]) public userGroups;
    
    // Moderation
    mapping(address => bool) public isBanned;
    mapping(uint256 => bool) public isPostReported;
    mapping(uint256 => uint256) public postReportCount;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event ProfileCreated(
        address indexed user,
        string username,
        uint256 timestamp
    );
    
    event ProfileUpdated(
        address indexed user,
        string displayName,
        string bio
    );
    
    event UserFollowed(
        address indexed follower,
        address indexed following
    );
    
    event UserUnfollowed(
        address indexed follower,
        address indexed unfollowing
    );
    
    event PostCreated(
        uint256 indexed postId,
        address indexed author,
        ContentType contentType,
        uint256 timestamp
    );
    
    event PostReacted(
        uint256 indexed postId,
        address indexed user,
        ReactionType reactionType
    );
    
    event PostCommented(
        uint256 indexed postId,
        uint256 commentId,
        address indexed author
    );
    
    event GroupCreated(
        uint256 indexed groupId,
        string name,
        address indexed creator
    );
    
    event GroupJoined(
        uint256 indexed groupId,
        address indexed member
    );
    
    event GroupLeft(
        uint256 indexed groupId,
        address indexed member
    );
    
    event UserBanned(
        address indexed user,
        address indexed moderator
    );
    
    event PostHidden(
        uint256 indexed postId,
        address indexed moderator
    );
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MODERATOR_ROLE, msg.sender);
    }
    
    // ============================================
    // PROFILE MANAGEMENT
    // ============================================
    
    /**
     * @notice Create a user profile
     */
    function createProfile(
        string calldata username,
        string calldata displayName,
        string calldata bio,
        string calldata avatarURI
    ) external nonReentrant whenNotPaused {
        require(!hasProfile[msg.sender], "Profile exists");
        require(!isBanned[msg.sender], "User banned");
        require(bytes(username).length > 0 && bytes(username).length <= 32, "Invalid username");
        require(usernameToAddress[username] == address(0), "Username taken");
        require(bytes(bio).length <= MAX_BIO_LENGTH, "Bio too long");
        
        Profile storage profile = profiles[msg.sender];
        profile.walletAddress = msg.sender;
        profile.username = username;
        profile.displayName = displayName;
        profile.bio = bio;
        profile.avatarURI = avatarURI;
        profile.isActive = true;
        profile.createdAt = block.timestamp;
        
        usernameToAddress[username] = msg.sender;
        hasProfile[msg.sender] = true;
        totalProfiles++;
        
        emit ProfileCreated(msg.sender, username, block.timestamp);
    }
    
    /**
     * @notice Update profile information
     */
    function updateProfile(
        string calldata displayName,
        string calldata bio,
        string calldata avatarURI,
        string calldata metadataURI
    ) external nonReentrant {
        require(hasProfile[msg.sender], "No profile");
        require(bytes(bio).length <= MAX_BIO_LENGTH, "Bio too long");
        
        Profile storage profile = profiles[msg.sender];
        profile.displayName = displayName;
        profile.bio = bio;
        profile.avatarURI = avatarURI;
        profile.metadataURI = metadataURI;
        
        emit ProfileUpdated(msg.sender, displayName, bio);
    }
    
    // ============================================
    // SOCIAL CONNECTIONS
    // ============================================
    
    /**
     * @notice Follow a user (max 1000 following/followers to prevent DOS)
     */
    function followUser(address userToFollow) external nonReentrant {
        require(hasProfile[msg.sender], "No profile");
        require(hasProfile[userToFollow], "Target has no profile");
        require(msg.sender != userToFollow, "Cannot follow self");
        require(!isFollowing[msg.sender][userToFollow], "Already following");
        
        // CRITICAL FIX: Enforce follower/following limits
        require(profiles[msg.sender].followingCount < MAX_FOLLOWING, "Max following reached");
        require(profiles[userToFollow].followerCount < MAX_FOLLOWERS, "Target max followers reached");
        
        isFollowing[msg.sender][userToFollow] = true;
        followers[userToFollow].push(msg.sender);
        following[msg.sender].push(userToFollow);
        
        profiles[msg.sender].followingCount++;
        profiles[userToFollow].followerCount++;
        totalConnections++;
        
        emit UserFollowed(msg.sender, userToFollow);
    }
    
    /**
     * @notice Unfollow a user
     */
    function unfollowUser(address userToUnfollow) external nonReentrant {
        require(isFollowing[msg.sender][userToUnfollow], "Not following");
        
        isFollowing[msg.sender][userToUnfollow] = false;
        
        // Remove from followers array (swap and pop)
        _removeFromArray(followers[userToUnfollow], msg.sender);
        _removeFromArray(following[msg.sender], userToUnfollow);
        
        profiles[msg.sender].followingCount--;
        profiles[userToUnfollow].followerCount--;
        totalConnections--;
        
        emit UserUnfollowed(msg.sender, userToUnfollow);
    }
    
    /**
     * @notice Get user's followers (paginated)
     */
    function getFollowers(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory) {
        require(limit <= MAX_FOLLOWERS_PER_QUERY, "Limit too high");
        
        address[] storage userFollowers = followers[user];
        uint256 total = userFollowers.length;
        
        if (offset >= total) {
            return new address[](0);
        }
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        address[] memory result = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = userFollowers[i];
        }
        
        return result;
    }
    
    /**
     * @notice Get users that a user is following (paginated)
     */
    function getFollowing(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory) {
        require(limit <= MAX_FOLLOWERS_PER_QUERY, "Limit too high");
        
        address[] storage userFollowing = following[user];
        uint256 total = userFollowing.length;
        
        if (offset >= total) {
            return new address[](0);
        }
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        address[] memory result = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = userFollowing[i];
        }
        
        return result;
    }
    
    // ============================================
    // CONTENT CREATION
    // ============================================
    
    /**
     * @notice Create a post (max 10k posts per user to prevent DOS)
     */
    function createPost(
        ContentType contentType,
        string calldata content,
        string[] calldata tags,
        PrivacyLevel privacy
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(hasProfile[msg.sender], "No profile");
        require(!isBanned[msg.sender], "User banned");
        require(bytes(content).length > 0 && bytes(content).length <= MAX_POST_LENGTH, "Invalid content");
        require(tags.length <= MAX_TAGS_PER_POST, "Too many tags");
        
        // CRITICAL FIX: Enforce max posts per user
        require(profiles[msg.sender].postCount < MAX_POSTS_PER_USER, "Max posts reached");
        
        totalPosts++;
        uint256 postId = totalPosts;
        
        Post storage post = posts[postId];
        post.postId = postId;
        post.author = msg.sender;
        post.contentType = contentType;
        post.content = content;
        post.tags = tags;
        post.privacy = privacy;
        post.createdAt = block.timestamp;
        
        userPosts[msg.sender].push(postId);
        profiles[msg.sender].postCount++;
        
        emit PostCreated(postId, msg.sender, contentType, block.timestamp);
        
        return postId;
    }
    
    /**
     * @notice React to a post (with privacy enforcement)
     */
    function reactToPost(
        uint256 postId,
        ReactionType reactionType
    ) external nonReentrant {
        require(hasProfile[msg.sender], "No profile");
        Post storage post = posts[postId];
        require(post.author != address(0), "Post does not exist");
        
        // CRITICAL FIX: Enforce privacy before allowing reactions
        if (post.privacy == PrivacyLevel.Private) {
            require(msg.sender == post.author, "Private post");
        } else if (post.privacy == PrivacyLevel.FollowersOnly) {
            require(
                msg.sender == post.author || isFollowing[msg.sender][post.author],
                "Followers only"
            );
        }
        
        // CRITICAL FIX: Properly handle previous reactions using hasReacted flag
        if (hasReacted[postId][msg.sender]) {
            // Remove previous reaction
            ReactionType previousReaction = postReactions[postId][msg.sender];
            reactionCounts[postId][previousReaction]--;
            post.likeCount--;
        }
        
        // Add new reaction
        postReactions[postId][msg.sender] = reactionType;
        hasReacted[postId][msg.sender] = true;
        reactionCounts[postId][reactionType]++;
        post.likeCount++;
        
        emit PostReacted(postId, msg.sender, reactionType);
    }
    
    /**
     * @notice Comment on a post (max 1000 comments per post to prevent DOS, with privacy enforcement)
     */
    function commentOnPost(
        uint256 postId,
        string calldata content
    ) external nonReentrant returns (uint256) {
        require(hasProfile[msg.sender], "No profile");
        require(!isBanned[msg.sender], "User banned");
        Post storage post = posts[postId];
        require(post.author != address(0), "Post does not exist");
        require(bytes(content).length > 0 && bytes(content).length <= 1000, "Invalid comment");
        
        // CRITICAL FIX: Enforce privacy before allowing comments
        if (post.privacy == PrivacyLevel.Private) {
            require(msg.sender == post.author, "Private post");
        } else if (post.privacy == PrivacyLevel.FollowersOnly) {
            require(
                msg.sender == post.author || isFollowing[msg.sender][post.author],
                "Followers only"
            );
        }
        
        // CRITICAL FIX: Enforce max comments per post
        Comment[] storage comments = postComments[postId];
        require(comments.length < MAX_COMMENTS_PER_POST, "Max comments reached");
        
        uint256 commentId = comments.length;
        
        Comment memory newComment = Comment({
            commentId: commentId,
            postId: postId,
            author: msg.sender,
            content: content,
            likeCount: 0,
            createdAt: block.timestamp
        });
        
        comments.push(newComment);
        post.commentCount++;
        
        emit PostCommented(postId, commentId, msg.sender);
        
        return commentId;
    }
    
    // ============================================
    // GROUPS
    // ============================================
    
    /**
     * @notice Create a community group
     */
    function createGroup(
        string calldata name,
        string calldata description,
        string calldata imageURI,
        bool isPublic
    ) external nonReentrant returns (uint256) {
        require(hasProfile[msg.sender], "No profile");
        require(bytes(name).length > 0 && bytes(name).length <= 100, "Invalid name");
        
        totalGroups++;
        uint256 groupId = totalGroups;
        
        Group storage group = groups[groupId];
        group.groupId = groupId;
        group.name = name;
        group.description = description;
        group.imageURI = imageURI;
        group.creator = msg.sender;
        group.isPublic = isPublic;
        group.isActive = true;
        group.createdAt = block.timestamp;
        
        // Auto-join creator
        groupMembers[groupId][msg.sender] = true;
        groupMemberList[groupId].push(msg.sender);
        userGroups[msg.sender].push(groupId);
        group.memberCount = 1;
        
        emit GroupCreated(groupId, name, msg.sender);
        
        return groupId;
    }
    
    /**
     * @notice Join a group
     */
    function joinGroup(uint256 groupId) external nonReentrant {
        require(hasProfile[msg.sender], "No profile");
        require(groups[groupId].isActive, "Group not active");
        require(groups[groupId].isPublic, "Group is private");
        require(!groupMembers[groupId][msg.sender], "Already member");
        require(groups[groupId].memberCount < MAX_GROUP_MEMBERS, "Group full");
        
        groupMembers[groupId][msg.sender] = true;
        groupMemberList[groupId].push(msg.sender);
        userGroups[msg.sender].push(groupId);
        groups[groupId].memberCount++;
        
        emit GroupJoined(groupId, msg.sender);
    }
    
    /**
     * @notice Leave a group
     */
    function leaveGroup(uint256 groupId) external nonReentrant {
        require(groupMembers[groupId][msg.sender], "Not a member");
        require(groups[groupId].creator != msg.sender, "Creator cannot leave");
        
        groupMembers[groupId][msg.sender] = false;
        _removeFromArray(groupMemberList[groupId], msg.sender);
        _removeFromArray(userGroups[msg.sender], groupId);
        groups[groupId].memberCount--;
        
        emit GroupLeft(groupId, msg.sender);
    }
    
    // ============================================
    // MODERATION
    // ============================================
    
    /**
     * @notice Ban a user (moderator only)
     */
    function banUser(address user) external onlyRole(MODERATOR_ROLE) {
        require(!isBanned[user], "Already banned");
        isBanned[user] = true;
        
        emit UserBanned(user, msg.sender);
    }
    
    /**
     * @notice Unban a user (admin only)
     */
    function unbanUser(address user) external onlyRole(ADMIN_ROLE) {
        isBanned[user] = false;
    }
    
    /**
     * @notice Hide a post (moderator only)
     */
    function hidePost(uint256 postId) external onlyRole(MODERATOR_ROLE) {
        require(posts[postId].author != address(0), "Post does not exist");
        posts[postId].isHidden = true;
        
        emit PostHidden(postId, msg.sender);
    }
    
    /**
     * @notice Verify a user profile (admin only)
     */
    function verifyProfile(address user) external onlyRole(ADMIN_ROLE) {
        require(hasProfile[user], "No profile");
        profiles[user].isVerified = true;
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    function getProfile(address user) external view returns (Profile memory) {
        return profiles[user];
    }
    
    /**
     * @notice Get post with privacy enforcement
     */
    function getPost(uint256 postId) external view returns (Post memory) {
        Post memory post = posts[postId];
        require(post.author != address(0), "Post does not exist");
        
        // CRITICAL FIX: Enforce privacy settings
        if (post.privacy == PrivacyLevel.Private) {
            require(msg.sender == post.author, "Private post");
        } else if (post.privacy == PrivacyLevel.FollowersOnly) {
            require(
                msg.sender == post.author || isFollowing[msg.sender][post.author],
                "Followers only"
            );
        }
        // Public posts visible to all
        
        return post;
    }
    
    /**
     * @notice Get user posts with pagination (CRITICAL FIX: prevent unbounded array return)
     */
    function getUserPosts(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory) {
        require(limit <= 100, "Limit too high");
        
        uint256[] storage userPostsArray = userPosts[user];
        uint256 total = userPostsArray.length;
        
        if (offset >= total) {
            return new uint256[](0);
        }
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        uint256[] memory result = new uint256[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = userPostsArray[i];
        }
        
        return result;
    }
    
    /**
     * @notice Get post comments with privacy enforcement (CRITICAL FIX)
     */
    function getPostComments(uint256 postId) external view returns (Comment[] memory) {
        Post memory post = posts[postId];
        require(post.author != address(0), "Post does not exist");
        
        // CRITICAL FIX: Enforce privacy settings on comments too
        if (post.privacy == PrivacyLevel.Private) {
            require(msg.sender == post.author, "Private post");
        } else if (post.privacy == PrivacyLevel.FollowersOnly) {
            require(
                msg.sender == post.author || isFollowing[msg.sender][post.author],
                "Followers only"
            );
        }
        
        return postComments[postId];
    }
    
    function getGroup(uint256 groupId) external view returns (Group memory) {
        return groups[groupId];
    }
    
    function getUserGroups(address user) external view returns (uint256[] memory) {
        return userGroups[user];
    }
    
    // ============================================
    // INTERNAL FUNCTIONS
    // ============================================
    
    /**
     * @notice Remove element from array (swap and pop)
     */
    function _removeFromArray(address[] storage array, address element) private {
        uint256 length = array.length;
        for (uint256 i = 0; i < length; i++) {
            if (array[i] == element) {
                array[i] = array[length - 1];
                array.pop();
                break;
            }
        }
    }
    
    function _removeFromArray(uint256[] storage array, uint256 element) private {
        uint256 length = array.length;
        for (uint256 i = 0; i < length; i++) {
            if (array[i] == element) {
                array[i] = array[length - 1];
                array.pop();
                break;
            }
        }
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
