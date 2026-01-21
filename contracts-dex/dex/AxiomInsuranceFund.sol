// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title AxiomInsuranceFund
 * @author Axiom Protocol
 * @notice Protocol insurance fund for black swan events and LP protection
 * @dev Collects protocol fees and provides coverage for extreme scenarios
 */
contract AxiomInsuranceFund is 
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant CLAIMS_MANAGER_ROLE = keccak256("CLAIMS_MANAGER_ROLE");

    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant PRECISION = 1e18;
    uint256 public constant CLAIM_TIMELOCK = 48 hours;

    enum ClaimStatus { PENDING, APPROVED, REJECTED, PAID, CANCELLED }
    enum ClaimType { LP_LOSS, EXPLOIT_RECOVERY, ORACLE_FAILURE, OTHER }

    struct Claim {
        uint256 claimId;
        address claimant;
        address token;
        uint256 amount;
        ClaimType claimType;
        ClaimStatus status;
        string description;
        bytes32 evidenceHash;
        uint256 submittedAt;
        uint256 approvedAt;
        uint256 paidAt;
    }

    struct FundStats {
        uint256 totalDeposited;
        uint256 totalClaimed;
        uint256 totalPending;
        uint256 lastDepositTime;
    }

    address public treasurySafe;
    address public primaryToken;

    uint256 public nextClaimId;
    uint256 public minClaimAmount;
    uint256 public maxClaimPercentage;
    uint256 public cooldownPeriod;

    mapping(address => uint256) public tokenBalances;
    mapping(address => FundStats) public tokenStats;
    mapping(uint256 => Claim) public claims;
    mapping(address => uint256[]) public userClaims;
    mapping(address => uint256) public lastClaimTime;

    address[] public supportedTokens;
    mapping(address => bool) public isSupported;

    event Deposited(address indexed token, address indexed from, uint256 amount);
    event ClaimSubmitted(uint256 indexed claimId, address indexed claimant, address token, uint256 amount, ClaimType claimType);
    event ClaimApproved(uint256 indexed claimId, address indexed approver);
    event ClaimRejected(uint256 indexed claimId, address indexed rejector, string reason);
    event ClaimPaid(uint256 indexed claimId, address indexed claimant, uint256 amount);
    event EmergencyWithdrawal(address indexed token, uint256 amount, address indexed to);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        address _treasurySafe,
        address _primaryToken,
        uint256 _minClaimAmount
    ) public initializer {
        require(_treasurySafe != address(0), "Zero addr");

        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        treasurySafe = _treasurySafe;
        primaryToken = _primaryToken;
        minClaimAmount = _minClaimAmount;
        maxClaimPercentage = 2500;
        cooldownPeriod = 7 days;
        nextClaimId = 1;

        _grantRole(DEFAULT_ADMIN_ROLE, _treasurySafe);
        _grantRole(ADMIN_ROLE, _treasurySafe);
        _grantRole(UPGRADER_ROLE, _treasurySafe);
        _grantRole(OPERATOR_ROLE, msg.sender);
        _grantRole(CLAIMS_MANAGER_ROLE, _treasurySafe);

        if (_primaryToken != address(0)) {
            supportedTokens.push(_primaryToken);
            isSupported[_primaryToken] = true;
        }
    }

    function deposit(address token, uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Zero amount");
        require(isSupported[token], "Token not supported");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        tokenBalances[token] += amount;
        tokenStats[token].totalDeposited += amount;
        tokenStats[token].lastDepositTime = block.timestamp;

        emit Deposited(token, msg.sender, amount);
    }

    function depositFromFees(address token, uint256 amount) external onlyRole(OPERATOR_ROLE) {
        require(amount > 0, "Zero amount");
        
        if (!isSupported[token]) {
            supportedTokens.push(token);
            isSupported[token] = true;
        }

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        tokenBalances[token] += amount;
        tokenStats[token].totalDeposited += amount;
        tokenStats[token].lastDepositTime = block.timestamp;

        emit Deposited(token, msg.sender, amount);
    }

    function submitClaim(
        address token,
        uint256 amount,
        ClaimType claimType,
        string calldata description,
        bytes32 evidenceHash
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(amount >= minClaimAmount, "Below minimum");
        require(isSupported[token], "Token not supported");
        require(block.timestamp >= lastClaimTime[msg.sender] + cooldownPeriod, "Cooldown active");

        uint256 maxClaim = (tokenBalances[token] * maxClaimPercentage) / BASIS_POINTS;
        require(amount <= maxClaim, "Exceeds max claim");

        uint256 claimId = nextClaimId++;

        claims[claimId] = Claim({
            claimId: claimId,
            claimant: msg.sender,
            token: token,
            amount: amount,
            claimType: claimType,
            status: ClaimStatus.PENDING,
            description: description,
            evidenceHash: evidenceHash,
            submittedAt: block.timestamp,
            approvedAt: 0,
            paidAt: 0
        });

        userClaims[msg.sender].push(claimId);
        tokenStats[token].totalPending += amount;
        lastClaimTime[msg.sender] = block.timestamp;

        emit ClaimSubmitted(claimId, msg.sender, token, amount, claimType);

        return claimId;
    }

    function approveClaim(uint256 claimId) external onlyRole(CLAIMS_MANAGER_ROLE) {
        Claim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.PENDING, "Not pending");

        claim.status = ClaimStatus.APPROVED;
        claim.approvedAt = block.timestamp;

        emit ClaimApproved(claimId, msg.sender);
    }

    function rejectClaim(uint256 claimId, string calldata reason) external onlyRole(CLAIMS_MANAGER_ROLE) {
        Claim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.PENDING, "Not pending");

        claim.status = ClaimStatus.REJECTED;
        tokenStats[claim.token].totalPending -= claim.amount;

        emit ClaimRejected(claimId, msg.sender, reason);
    }

    function payClaim(uint256 claimId) external nonReentrant onlyRole(CLAIMS_MANAGER_ROLE) {
        Claim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.APPROVED, "Not approved");
        require(block.timestamp >= claim.approvedAt + CLAIM_TIMELOCK, "Timelock active");
        require(tokenBalances[claim.token] >= claim.amount, "Insufficient funds");

        claim.status = ClaimStatus.PAID;
        claim.paidAt = block.timestamp;

        tokenBalances[claim.token] -= claim.amount;
        tokenStats[claim.token].totalClaimed += claim.amount;
        tokenStats[claim.token].totalPending -= claim.amount;

        IERC20(claim.token).safeTransfer(claim.claimant, claim.amount);

        emit ClaimPaid(claimId, claim.claimant, claim.amount);
    }

    function cancelClaim(uint256 claimId) external {
        Claim storage claim = claims[claimId];
        require(claim.claimant == msg.sender, "Not claimant");
        require(claim.status == ClaimStatus.PENDING, "Not pending");

        claim.status = ClaimStatus.CANCELLED;
        tokenStats[claim.token].totalPending -= claim.amount;
    }

    function emergencyWithdraw(address token, uint256 amount) external onlyRole(ADMIN_ROLE) {
        require(tokenBalances[token] >= amount, "Insufficient");

        tokenBalances[token] -= amount;

        IERC20(token).safeTransfer(treasurySafe, amount);

        emit EmergencyWithdrawal(token, amount, treasurySafe);
    }

    function addSupportedToken(address token) external onlyRole(OPERATOR_ROLE) {
        require(!isSupported[token], "Already supported");
        supportedTokens.push(token);
        isSupported[token] = true;
    }

    function removeSupportedToken(address token) external onlyRole(ADMIN_ROLE) {
        require(isSupported[token], "Not supported");
        require(tokenBalances[token] == 0, "Balance not zero");
        isSupported[token] = false;
    }

    function setMinClaimAmount(uint256 amount) external onlyRole(ADMIN_ROLE) {
        minClaimAmount = amount;
    }

    function setMaxClaimPercentage(uint256 percentage) external onlyRole(ADMIN_ROLE) {
        require(percentage <= BASIS_POINTS, "Too high");
        maxClaimPercentage = percentage;
    }

    function setCooldownPeriod(uint256 period) external onlyRole(ADMIN_ROLE) {
        cooldownPeriod = period;
    }

    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    function getClaim(uint256 claimId) external view returns (Claim memory) {
        return claims[claimId];
    }

    function getUserClaims(address user) external view returns (uint256[] memory) {
        return userClaims[user];
    }

    function getTokenBalance(address token) external view returns (uint256) {
        return tokenBalances[token];
    }

    function getTokenStats(address token) external view returns (FundStats memory) {
        return tokenStats[token];
    }

    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokens;
    }

    function getTotalValue() external view returns (uint256 total) {
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            total += tokenBalances[supportedTokens[i]];
        }
    }

    function getAvailableForClaim(address token) external view returns (uint256) {
        return (tokenBalances[token] * maxClaimPercentage) / BASIS_POINTS;
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}

    uint256[40] private __gap;
}
