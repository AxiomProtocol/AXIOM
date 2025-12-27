// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../interfaces/IAxiomScore.sol";

/**
 * @title AxiomScoreSBT
 * @notice Soulbound Token (ERC-5192 compliant) for on-chain credit scoring
 * @dev Non-transferable tokens representing credit history and repayment behavior
 * 
 * AIP-001 Implementation:
 * - Soulbound Tokens for repayment history (non-transferable)
 * - On-chain credit scoring (Axiom Score 300-850 range)
 * - Integration hook for SUSU V2 credit-gated joining
 * - Privacy-preserving score tiers (no raw data exposed)
 * 
 * Score Calculation:
 * - Base score: 500
 * - Successful SUSU completion: +50 points
 * - On-time payments: +5 points each
 * - Late payments: -10 points each
 * - Defaults: -100 points each
 * - Maximum score: 850, Minimum: 300
 */
contract AxiomScoreSBT is AccessControl, ReentrancyGuard, Pausable, IAxiomScore {

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant SCORE_UPDATER_ROLE = keccak256("SCORE_UPDATER_ROLE");
    bytes32 public constant SUSU_CONTRACT_ROLE = keccak256("SUSU_CONTRACT_ROLE");

    uint256 public constant BASE_SCORE = 500;
    uint256 public constant MIN_SCORE = 300;
    uint256 public constant MAX_SCORE = 850;
    uint256 public constant COMPLETION_BONUS = 50;
    uint256 public constant ONTIME_PAYMENT_BONUS = 5;
    uint256 public constant LATE_PAYMENT_PENALTY = 10;
    uint256 public constant DEFAULT_PENALTY = 100;

    string public name = "Axiom Credit Score";
    string public symbol = "AXMS";

    uint256 public totalTokens;
    uint256 public totalProfiles;

    struct ScoreToken {
        uint256 tokenId;
        address owner;
        uint256 mintedAt;
        bool locked;
    }

    mapping(address => CreditProfile) private profiles;
    mapping(address => ScoreToken) private tokens;
    mapping(uint256 => address) private tokenOwners;
    mapping(address => uint256[]) private paymentHistory;

    event TokenMinted(address indexed owner, uint256 indexed tokenId);
    event Locked(uint256 indexed tokenId);
    event ProfileCreated(address indexed user, uint256 initialScore);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(SCORE_UPDATER_ROLE, msg.sender);
    }

    function locked(uint256 tokenId) external view returns (bool) {
        require(tokenOwners[tokenId] != address(0), "Token does not exist");
        return true;
    }

    function balanceOf(address owner) external view returns (uint256) {
        return tokens[owner].tokenId != 0 ? 1 : 0;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address owner = tokenOwners[tokenId];
        require(owner != address(0), "Token does not exist");
        return owner;
    }

    function initializeProfile(address user) external whenNotPaused nonReentrant returns (uint256) {
        require(profiles[user].lastUpdated == 0, "Profile already exists");
        
        totalProfiles++;
        totalTokens++;
        
        profiles[user] = CreditProfile({
            score: BASE_SCORE,
            totalLoans: 0,
            successfulRepayments: 0,
            defaults: 0,
            lastUpdated: block.timestamp,
            isActive: true
        });

        tokens[user] = ScoreToken({
            tokenId: totalTokens,
            owner: user,
            mintedAt: block.timestamp,
            locked: true
        });
        
        tokenOwners[totalTokens] = user;

        emit ProfileCreated(user, BASE_SCORE);
        emit TokenMinted(user, totalTokens);
        emit Locked(totalTokens);
        emit ScoreTokenMinted(user, totalTokens);

        return totalTokens;
    }

    function getScore(address user) external view override returns (uint256) {
        if (profiles[user].lastUpdated == 0) {
            return 0;
        }
        return profiles[user].score;
    }

    function getProfile(address user) external view override returns (CreditProfile memory) {
        return profiles[user];
    }

    function hasMinimumScore(address user, uint256 minScore) external view override returns (bool) {
        if (profiles[user].lastUpdated == 0) {
            return false;
        }
        return profiles[user].score >= minScore;
    }

    function recordRepayment(
        address user, 
        uint256 amount, 
        uint256 poolId
    ) external override onlyRole(SUSU_CONTRACT_ROLE) whenNotPaused {
        require(profiles[user].lastUpdated > 0, "Profile does not exist");
        
        CreditProfile storage profile = profiles[user];
        uint256 oldScore = profile.score;
        
        profile.successfulRepayments++;
        profile.totalLoans++;
        
        uint256 newScore = oldScore + ONTIME_PAYMENT_BONUS;
        if (newScore > MAX_SCORE) {
            newScore = MAX_SCORE;
        }
        
        profile.score = newScore;
        profile.lastUpdated = block.timestamp;
        
        paymentHistory[user].push(block.timestamp);

        emit RepaymentRecorded(user, amount, poolId);
        emit ScoreUpdated(user, oldScore, newScore, "on_time_payment");
    }

    function recordDefault(
        address user, 
        uint256 amount, 
        uint256 poolId
    ) external override onlyRole(SUSU_CONTRACT_ROLE) whenNotPaused {
        require(profiles[user].lastUpdated > 0, "Profile does not exist");
        
        CreditProfile storage profile = profiles[user];
        uint256 oldScore = profile.score;
        
        profile.defaults++;
        profile.totalLoans++;
        
        uint256 newScore;
        if (oldScore <= MIN_SCORE + DEFAULT_PENALTY) {
            newScore = MIN_SCORE;
        } else {
            newScore = oldScore - DEFAULT_PENALTY;
        }
        
        profile.score = newScore;
        profile.lastUpdated = block.timestamp;

        emit DefaultRecorded(user, amount, poolId);
        emit ScoreUpdated(user, oldScore, newScore, "default");
    }

    function recordSusuCompletion(
        address user, 
        uint256 poolId, 
        uint256 totalContributed
    ) external override onlyRole(SUSU_CONTRACT_ROLE) whenNotPaused {
        require(profiles[user].lastUpdated > 0, "Profile does not exist");
        
        CreditProfile storage profile = profiles[user];
        uint256 oldScore = profile.score;
        
        uint256 newScore = oldScore + COMPLETION_BONUS;
        if (newScore > MAX_SCORE) {
            newScore = MAX_SCORE;
        }
        
        profile.score = newScore;
        profile.lastUpdated = block.timestamp;

        emit ScoreUpdated(user, oldScore, newScore, "susu_completion");
    }

    function recordLatePayment(
        address user, 
        uint256 poolId
    ) external onlyRole(SUSU_CONTRACT_ROLE) whenNotPaused {
        require(profiles[user].lastUpdated > 0, "Profile does not exist");
        
        CreditProfile storage profile = profiles[user];
        uint256 oldScore = profile.score;
        
        uint256 newScore;
        if (oldScore <= MIN_SCORE + LATE_PAYMENT_PENALTY) {
            newScore = MIN_SCORE;
        } else {
            newScore = oldScore - LATE_PAYMENT_PENALTY;
        }
        
        profile.score = newScore;
        profile.lastUpdated = block.timestamp;

        emit ScoreUpdated(user, oldScore, newScore, "late_payment");
    }

    function getScoreTier(address user) external view returns (string memory) {
        uint256 score = profiles[user].score;
        
        if (score == 0) return "UNRATED";
        if (score >= 750) return "EXCELLENT";
        if (score >= 650) return "GOOD";
        if (score >= 550) return "FAIR";
        if (score >= 450) return "POOR";
        return "VERY_POOR";
    }

    function getPaymentCount(address user) external view returns (uint256) {
        return paymentHistory[user].length;
    }

    function grantSusuContractRole(address susuContract) external onlyRole(ADMIN_ROLE) {
        _grantRole(SUSU_CONTRACT_ROLE, susuContract);
    }

    function revokeSusuContractRole(address susuContract) external onlyRole(ADMIN_ROLE) {
        _revokeRole(SUSU_CONTRACT_ROLE, susuContract);
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return 
            interfaceId == 0xb45a3c0e || // ERC-5192
            super.supportsInterface(interfaceId);
    }
}
