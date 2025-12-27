// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SusuInsuranceFund
 * @notice Default Insurance Fund for SUSU circles - covers broken circles
 * @dev AIP-001 Implementation: 5% of node rewards diverted to cover defaults
 * 
 * Features:
 * - Receives 5% of DePIN node rewards automatically
 * - Covers defaults when SUSU circles break
 * - Governance-controlled claim approval
 * - Transparent fund accounting
 * - veAXM holder voting on large claims
 */
contract SusuInsuranceFund is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");
    bytes32 public constant CLAIMS_MANAGER_ROLE = keccak256("CLAIMS_MANAGER_ROLE");
    bytes32 public constant NODE_REWARDS_ROLE = keccak256("NODE_REWARDS_ROLE");

    uint256 public constant DIVERSION_RATE_BPS = 500;
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant LARGE_CLAIM_THRESHOLD = 10000 * 10**18;
    uint256 public constant CLAIM_EXPIRY = 30 days;

    IERC20 public axmToken;
    address public treasuryVault;

    uint256 public totalFundBalance;
    uint256 public totalDiverted;
    uint256 public totalClaimsPaid;
    uint256 public totalClaimsCount;
    uint256 public pendingClaimsCount;

    enum ClaimStatus { Pending, Approved, Rejected, Paid, Expired }

    struct Claim {
        uint256 claimId;
        uint256 poolId;
        address claimant;
        uint256 amount;
        string reason;
        uint256 submittedAt;
        uint256 processedAt;
        ClaimStatus status;
        address processedBy;
    }

    struct FundStats {
        uint256 balance;
        uint256 totalDiverted;
        uint256 totalPaid;
        uint256 pendingClaims;
        uint256 coverageRatio;
    }

    mapping(uint256 => Claim) public claims;
    mapping(uint256 => bool) public poolHasClaim;
    mapping(address => uint256[]) public userClaims;

    event FundReceived(address indexed from, uint256 amount, string source);
    event NodeRewardsDiverted(uint256 totalRewards, uint256 divertedAmount);
    event ClaimSubmitted(uint256 indexed claimId, uint256 indexed poolId, address indexed claimant, uint256 amount);
    event ClaimApproved(uint256 indexed claimId, address indexed approver);
    event ClaimRejected(uint256 indexed claimId, address indexed rejector, string reason);
    event ClaimPaid(uint256 indexed claimId, address indexed recipient, uint256 amount);
    event EmergencyWithdrawal(address indexed to, uint256 amount);

    constructor(address _axmToken, address _treasuryVault) {
        require(_axmToken != address(0), "Invalid AXM token");
        require(_treasuryVault != address(0), "Invalid treasury");
        
        axmToken = IERC20(_axmToken);
        treasuryVault = _treasuryVault;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(TREASURY_ROLE, msg.sender);
        _grantRole(CLAIMS_MANAGER_ROLE, msg.sender);
    }

    function divertNodeRewards(uint256 totalRewards) external onlyRole(NODE_REWARDS_ROLE) nonReentrant whenNotPaused {
        require(totalRewards > 0, "No rewards to divert");
        
        uint256 divertAmount = (totalRewards * DIVERSION_RATE_BPS) / BPS_DENOMINATOR;
        
        axmToken.safeTransferFrom(msg.sender, address(this), divertAmount);
        
        totalFundBalance += divertAmount;
        totalDiverted += divertAmount;
        
        emit NodeRewardsDiverted(totalRewards, divertAmount);
        emit FundReceived(msg.sender, divertAmount, "node_rewards_diversion");
    }

    function contributeDirect(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be positive");
        
        axmToken.safeTransferFrom(msg.sender, address(this), amount);
        
        totalFundBalance += amount;
        
        emit FundReceived(msg.sender, amount, "direct_contribution");
    }

    function submitClaim(
        uint256 poolId,
        uint256 amount,
        string calldata reason
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(amount > 0, "Amount must be positive");
        require(amount <= totalFundBalance, "Insufficient fund balance");
        require(!poolHasClaim[poolId], "Pool already has pending claim");
        require(bytes(reason).length > 0, "Reason required");
        
        totalClaimsCount++;
        pendingClaimsCount++;
        
        claims[totalClaimsCount] = Claim({
            claimId: totalClaimsCount,
            poolId: poolId,
            claimant: msg.sender,
            amount: amount,
            reason: reason,
            submittedAt: block.timestamp,
            processedAt: 0,
            status: ClaimStatus.Pending,
            processedBy: address(0)
        });
        
        poolHasClaim[poolId] = true;
        userClaims[msg.sender].push(totalClaimsCount);
        
        emit ClaimSubmitted(totalClaimsCount, poolId, msg.sender, amount);
        
        return totalClaimsCount;
    }

    function approveClaim(uint256 claimId) external onlyRole(CLAIMS_MANAGER_ROLE) nonReentrant whenNotPaused {
        Claim storage claim = claims[claimId];
        require(claim.claimId != 0, "Claim does not exist");
        require(claim.status == ClaimStatus.Pending, "Claim not pending");
        require(block.timestamp <= claim.submittedAt + CLAIM_EXPIRY, "Claim expired");
        
        if (claim.amount >= LARGE_CLAIM_THRESHOLD) {
            require(hasRole(ADMIN_ROLE, msg.sender), "Large claims require admin approval");
        }
        
        claim.status = ClaimStatus.Approved;
        claim.processedAt = block.timestamp;
        claim.processedBy = msg.sender;
        
        emit ClaimApproved(claimId, msg.sender);
    }

    function rejectClaim(uint256 claimId, string calldata rejectionReason) external onlyRole(CLAIMS_MANAGER_ROLE) nonReentrant {
        Claim storage claim = claims[claimId];
        require(claim.claimId != 0, "Claim does not exist");
        require(claim.status == ClaimStatus.Pending, "Claim not pending");
        
        claim.status = ClaimStatus.Rejected;
        claim.processedAt = block.timestamp;
        claim.processedBy = msg.sender;
        
        poolHasClaim[claim.poolId] = false;
        pendingClaimsCount--;
        
        emit ClaimRejected(claimId, msg.sender, rejectionReason);
    }

    function payClaim(uint256 claimId) external onlyRole(TREASURY_ROLE) nonReentrant whenNotPaused {
        Claim storage claim = claims[claimId];
        require(claim.claimId != 0, "Claim does not exist");
        require(claim.status == ClaimStatus.Approved, "Claim not approved");
        require(claim.amount <= totalFundBalance, "Insufficient fund balance");
        
        claim.status = ClaimStatus.Paid;
        
        totalFundBalance -= claim.amount;
        totalClaimsPaid += claim.amount;
        pendingClaimsCount--;
        poolHasClaim[claim.poolId] = false;
        
        axmToken.safeTransfer(claim.claimant, claim.amount);
        
        emit ClaimPaid(claimId, claim.claimant, claim.amount);
    }

    function getClaim(uint256 claimId) external view returns (Claim memory) {
        return claims[claimId];
    }

    function getUserClaims(address user) external view returns (uint256[] memory) {
        return userClaims[user];
    }

    function getFundStats() external view returns (FundStats memory) {
        uint256 coverageRatio = 0;
        if (totalDiverted > 0) {
            coverageRatio = (totalFundBalance * 10000) / totalDiverted;
        }
        
        return FundStats({
            balance: totalFundBalance,
            totalDiverted: totalDiverted,
            totalPaid: totalClaimsPaid,
            pendingClaims: pendingClaimsCount,
            coverageRatio: coverageRatio
        });
    }

    function getCoverageCapacity() external view returns (uint256) {
        return totalFundBalance;
    }

    function grantNodeRewardsRole(address nodeContract) external onlyRole(ADMIN_ROLE) {
        _grantRole(NODE_REWARDS_ROLE, nodeContract);
    }

    function updateTreasuryVault(address newTreasury) external onlyRole(ADMIN_ROLE) {
        require(newTreasury != address(0), "Invalid treasury");
        treasuryVault = newTreasury;
    }

    function emergencyWithdraw(address to, uint256 amount) external onlyRole(ADMIN_ROLE) nonReentrant {
        require(to != address(0), "Invalid recipient");
        require(amount <= totalFundBalance, "Insufficient balance");
        
        totalFundBalance -= amount;
        axmToken.safeTransfer(to, amount);
        
        emit EmergencyWithdrawal(to, amount);
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}
