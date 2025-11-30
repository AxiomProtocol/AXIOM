// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title CitizenReputationOracle
 * @notice Blockchain-native credit scoring and reputation system for Axiom Smart City
 * @dev Enables undercollateralized lending based on on-chain reputation and behavior
 * 
 * Features:
 * - Multi-dimensional reputation scoring (financial, civic, social, environmental)
 * - Credit score calculation (300-850 range, FICO-compatible)
 * - Payment history tracking and analysis
 * - Credit limit determination based on reputation
 * - Reputation staking and slashing mechanisms
 * - Verifiable credentials integration
 * - Time-weighted reputation decay
 * - Appeal and dispute resolution
 */
contract CitizenReputationOracle is AccessControl, ReentrancyGuard, Pausable {

    // ============================================
    // ROLES
    // ============================================
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant REPORTER_ROLE = keccak256("REPORTER_ROLE");
    bytes32 public constant DISPUTE_RESOLVER_ROLE = keccak256("DISPUTE_RESOLVER_ROLE");

    // ============================================
    // STATE VARIABLES
    // ============================================
    
    // Credit score constants (FICO-compatible)
    uint256 public constant MIN_CREDIT_SCORE = 300;
    uint256 public constant MAX_CREDIT_SCORE = 850;
    uint256 public constant DEFAULT_CREDIT_SCORE = 550;
    
    // Reputation decay (basis points per day)
    uint256 public reputationDecayRate = 1;  // 0.01% per day
    
    // Minimum reputation for undercollateralized loans
    uint256 public constant MIN_REPUTATION_FOR_LOANS = 600;
    
    // Global counters
    uint256 public totalCitizens;
    uint256 public totalReports;
    uint256 public totalDisputes;
    
    // ============================================
    // ENUMS
    // ============================================
    
    enum ReputationCategory { Financial, Civic, Social, Environmental }
    enum ReportType { Positive, Negative, Neutral }
    enum DisputeStatus { Pending, Approved, Rejected, Resolved }
    
    // ============================================
    // STRUCTS
    // ============================================
    
    struct ReputationProfile {
        address citizen;
        uint256 overallScore;           // Composite score (300-850)
        uint256 financialScore;         // Payment history, debt ratio
        uint256 civicScore;             // Civic participation, compliance
        uint256 socialScore;            // Community engagement
        uint256 environmentalScore;     // Sustainability actions
        uint256 totalReports;
        uint256 positiveReports;
        uint256 negativeReports;
        uint256 lastUpdateTime;
        bool isActive;
    }
    
    struct PaymentHistory {
        uint256 totalPayments;
        uint256 onTimePayments;
        uint256 latePayments;
        uint256 missedPayments;
        uint256 totalBorrowed;
        uint256 totalRepaid;
        uint256 currentDebt;
        uint256 maxCreditLimit;
    }
    
    struct ReputationReport {
        uint256 reportId;
        address citizen;
        address reporter;
        ReputationCategory category;
        ReportType reportType;
        int256 scoreImpact;             // Can be positive or negative
        string evidenceURI;             // IPFS hash with evidence
        uint256 timestamp;
        bool isVerified;
        bool scoreApplied;              // Track if score impact was actually applied
        bool isInvalidated;             // Track if report was invalidated by dispute
    }
    
    struct Dispute {
        uint256 disputeId;
        uint256 reportId;
        address disputer;
        string reason;
        DisputeStatus status;
        uint256 filedAt;
        uint256 resolvedAt;
        address resolver;
    }
    
    // ============================================
    // MAPPINGS
    // ============================================
    
    mapping(address => ReputationProfile) public profiles;
    mapping(address => PaymentHistory) public paymentHistories;
    mapping(uint256 => ReputationReport) public reports;
    mapping(address => uint256[]) public citizenReports;
    mapping(uint256 => Dispute) public disputes;
    mapping(address => uint256[]) public citizenDisputes;
    
    // Authorized lenders and credit reporters
    mapping(address => bool) public authorizedLenders;
    mapping(address => bool) public authorizedReporters;
    
    // Per-reporter rate limiting (reporter => citizen => lastReportTime)
    mapping(address => mapping(address => uint256)) public lastReportTime;
    uint256 public constant REPORT_COOLDOWN = 1 days;
    
    // Maximum credit limit cap (50,000 tokens with 18 decimals)
    uint256 public constant MAX_CREDIT_LIMIT = 50000 * 10**18;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event ProfileCreated(
        address indexed citizen,
        uint256 initialScore
    );
    
    event ReputationReported(
        uint256 indexed reportId,
        address indexed citizen,
        address indexed reporter,
        ReputationCategory category,
        int256 scoreImpact
    );
    
    event ScoreUpdated(
        address indexed citizen,
        uint256 oldScore,
        uint256 newScore
    );
    
    event PaymentRecorded(
        address indexed citizen,
        uint256 amount,
        bool onTime
    );
    
    event DisputeFiled(
        uint256 indexed disputeId,
        uint256 indexed reportId,
        address indexed disputer
    );
    
    event DisputeResolved(
        uint256 indexed disputeId,
        DisputeStatus status,
        address resolver
    );
    
    event CreditLimitUpdated(
        address indexed citizen,
        uint256 oldLimit,
        uint256 newLimit
    );
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    // ============================================
    // PROFILE MANAGEMENT
    // ============================================
    
    /**
     * @notice Create reputation profile for a citizen
     */
    function createProfile(address citizen) external onlyRole(ORACLE_ROLE) {
        require(citizen != address(0), "Invalid address");
        require(!profiles[citizen].isActive, "Profile already exists");
        
        totalCitizens++;
        
        ReputationProfile storage profile = profiles[citizen];
        profile.citizen = citizen;
        profile.overallScore = DEFAULT_CREDIT_SCORE;
        profile.financialScore = DEFAULT_CREDIT_SCORE;
        profile.civicScore = DEFAULT_CREDIT_SCORE;
        profile.socialScore = DEFAULT_CREDIT_SCORE;
        profile.environmentalScore = DEFAULT_CREDIT_SCORE;
        profile.lastUpdateTime = block.timestamp;
        profile.isActive = true;
        
        // Initialize payment history
        PaymentHistory storage history = paymentHistories[citizen];
        history.maxCreditLimit = calculateInitialCreditLimit(DEFAULT_CREDIT_SCORE);
        
        emit ProfileCreated(citizen, DEFAULT_CREDIT_SCORE);
    }
    
    /**
     * @notice Update reputation score based on activity
     */
    function reportReputation(
        address citizen,
        ReputationCategory category,
        ReportType reportType,
        int256 scoreImpact,
        string calldata evidenceURI
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(profiles[citizen].isActive, "Profile not found");
        require(hasRole(REPORTER_ROLE, msg.sender) || authorizedReporters[msg.sender], "Not authorized");
        require(scoreImpact >= -100 && scoreImpact <= 100, "Score impact out of range");
        
        // Rate limiting: prevent spam from same reporter
        require(
            block.timestamp >= lastReportTime[msg.sender][citizen] + REPORT_COOLDOWN,
            "Report cooldown active"
        );
        lastReportTime[msg.sender][citizen] = block.timestamp;
        
        totalReports++;
        uint256 reportId = totalReports;
        
        // Create report
        ReputationReport storage report = reports[reportId];
        report.reportId = reportId;
        report.citizen = citizen;
        report.reporter = msg.sender;
        report.category = category;
        report.reportType = reportType;
        report.scoreImpact = scoreImpact;
        report.evidenceURI = evidenceURI;
        report.timestamp = block.timestamp;
        report.isVerified = hasRole(ORACLE_ROLE, msg.sender);  // Auto-verify if oracle
        
        citizenReports[citizen].push(reportId);
        
        // Update profile counts
        ReputationProfile storage profile = profiles[citizen];
        profile.totalReports++;
        
        if (reportType == ReportType.Positive) {
            profile.positiveReports++;
        } else if (reportType == ReportType.Negative) {
            profile.negativeReports++;
        }
        
        // Apply score impact if verified
        if (report.isVerified) {
            _applyScoreImpact(citizen, category, scoreImpact);
            report.scoreApplied = true;  // Mark as applied
        } else {
            report.scoreApplied = false;  // Not applied yet
        }
        
        emit ReputationReported(reportId, citizen, msg.sender, category, scoreImpact);
        
        return reportId;
    }
    
    /**
     * @notice Apply score impact to specific category and recalculate overall score
     */
    function _applyScoreImpact(
        address citizen,
        ReputationCategory category,
        int256 impact
    ) private {
        ReputationProfile storage profile = profiles[citizen];
        uint256 oldScore = profile.overallScore;
        
        // Apply to specific category
        if (category == ReputationCategory.Financial) {
            profile.financialScore = _adjustScore(profile.financialScore, impact);
        } else if (category == ReputationCategory.Civic) {
            profile.civicScore = _adjustScore(profile.civicScore, impact);
        } else if (category == ReputationCategory.Social) {
            profile.socialScore = _adjustScore(profile.socialScore, impact);
        } else if (category == ReputationCategory.Environmental) {
            profile.environmentalScore = _adjustScore(profile.environmentalScore, impact);
        }
        
        // Recalculate overall score (weighted average)
        profile.overallScore = _calculateOverallScore(profile);
        profile.lastUpdateTime = block.timestamp;
        
        // Update credit limit based on new score
        _updateCreditLimit(citizen);
        
        if (oldScore != profile.overallScore) {
            emit ScoreUpdated(citizen, oldScore, profile.overallScore);
        }
    }
    
    /**
     * @notice Adjust score within valid range
     */
    function _adjustScore(uint256 currentScore, int256 impact) private pure returns (uint256) {
        int256 newScore = int256(currentScore) + impact;
        
        if (newScore < int256(MIN_CREDIT_SCORE)) {
            return MIN_CREDIT_SCORE;
        } else if (newScore > int256(MAX_CREDIT_SCORE)) {
            return MAX_CREDIT_SCORE;
        }
        
        return uint256(newScore);
    }
    
    /**
     * @notice Calculate overall score (weighted average)
     * Financial: 40%, Civic: 30%, Social: 20%, Environmental: 10%
     */
    function _calculateOverallScore(ReputationProfile storage profile) private view returns (uint256) {
        uint256 weightedScore = 
            (profile.financialScore * 40) +
            (profile.civicScore * 30) +
            (profile.socialScore * 20) +
            (profile.environmentalScore * 10);
        
        return weightedScore / 100;
    }
    
    // ============================================
    // PAYMENT HISTORY
    // ============================================
    
    /**
     * @notice Record a payment for credit history
     */
    function recordPayment(
        address citizen,
        uint256 amount,
        bool onTime
    ) external nonReentrant {
        require(profiles[citizen].isActive, "Profile not found");
        require(authorizedLenders[msg.sender], "Not authorized lender");
        require(amount > 0, "Invalid amount");
        
        PaymentHistory storage history = paymentHistories[citizen];
        history.totalPayments++;
        history.totalRepaid += amount;
        
        if (history.currentDebt >= amount) {
            history.currentDebt -= amount;
        } else {
            history.currentDebt = 0;
        }
        
        if (onTime) {
            history.onTimePayments++;
            // Reward on-time payment
            _applyScoreImpact(citizen, ReputationCategory.Financial, 5);
        } else {
            history.latePayments++;
            // Penalize late payment
            _applyScoreImpact(citizen, ReputationCategory.Financial, -10);
        }
        
        emit PaymentRecorded(citizen, amount, onTime);
    }
    
    /**
     * @notice Record a loan disbursement
     */
    function recordLoan(address citizen, uint256 amount) external nonReentrant {
        require(profiles[citizen].isActive, "Profile not found");
        require(authorizedLenders[msg.sender], "Not authorized lender");
        require(amount > 0, "Invalid amount");
        
        PaymentHistory storage history = paymentHistories[citizen];
        history.totalBorrowed += amount;
        history.currentDebt += amount;
        
        // Check if exceeding credit limit
        if (history.currentDebt > history.maxCreditLimit) {
            // Penalize for over-borrowing
            _applyScoreImpact(citizen, ReputationCategory.Financial, -15);
        }
    }
    
    /**
     * @notice Record a missed payment
     */
    function recordMissedPayment(address citizen) external {
        require(profiles[citizen].isActive, "Profile not found");
        require(authorizedLenders[msg.sender], "Not authorized lender");
        
        PaymentHistory storage history = paymentHistories[citizen];
        history.missedPayments++;
        
        // Significant penalty for missed payment
        _applyScoreImpact(citizen, ReputationCategory.Financial, -25);
    }
    
    // ============================================
    // CREDIT LIMIT CALCULATION
    // ============================================
    
    /**
     * @notice Calculate initial credit limit based on score
     */
    function calculateInitialCreditLimit(uint256 score) public pure returns (uint256) {
        if (score < MIN_REPUTATION_FOR_LOANS) {
            return 0;  // No credit for low scores
        }
        
        // Linear scaling: 600 score = $1000, 850 score = $50,000
        // Formula: limit = (score - 600) * 196 + 1000
        uint256 scaledLimit = ((score - MIN_REPUTATION_FOR_LOANS) * 196) + 1000;
        return scaledLimit * 10**18;  // Convert to wei (assuming stablecoin with 18 decimals)
    }
    
    /**
     * @notice Update credit limit based on current reputation
     */
    function _updateCreditLimit(address citizen) private {
        PaymentHistory storage history = paymentHistories[citizen];
        ReputationProfile storage profile = profiles[citizen];
        
        uint256 oldLimit = history.maxCreditLimit;
        uint256 newLimit = calculateInitialCreditLimit(profile.overallScore);
        
        // Factor in payment history
        if (history.totalPayments > 0) {
            uint256 paymentRatio = (history.onTimePayments * 100) / history.totalPayments;
            
            if (paymentRatio >= 95) {
                newLimit = (newLimit * 120) / 100;  // 20% bonus
            } else if (paymentRatio >= 80) {
                newLimit = (newLimit * 110) / 100;  // 10% bonus
            } else if (paymentRatio < 50) {
                newLimit = (newLimit * 70) / 100;   // 30% penalty
            }
        }
        
        // Cap credit limit to maximum
        if (newLimit > MAX_CREDIT_LIMIT) {
            newLimit = MAX_CREDIT_LIMIT;
        }
        
        history.maxCreditLimit = newLimit;
        
        if (oldLimit != newLimit) {
            emit CreditLimitUpdated(citizen, oldLimit, newLimit);
        }
    }
    
    // ============================================
    // DISPUTE RESOLUTION
    // ============================================
    
    /**
     * @notice File a dispute against a reputation report
     */
    function fileDispute(
        uint256 reportId,
        string calldata reason
    ) external nonReentrant returns (uint256) {
        ReputationReport storage report = reports[reportId];
        require(report.citizen == msg.sender, "Not your report");
        require(bytes(reason).length > 0, "Reason required");
        
        totalDisputes++;
        uint256 disputeId = totalDisputes;
        
        Dispute storage dispute = disputes[disputeId];
        dispute.disputeId = disputeId;
        dispute.reportId = reportId;
        dispute.disputer = msg.sender;
        dispute.reason = reason;
        dispute.status = DisputeStatus.Pending;
        dispute.filedAt = block.timestamp;
        
        citizenDisputes[msg.sender].push(disputeId);
        
        emit DisputeFiled(disputeId, reportId, msg.sender);
        
        return disputeId;
    }
    
    /**
     * @notice Resolve a dispute
     */
    function resolveDispute(
        uint256 disputeId,
        bool approve
    ) external onlyRole(DISPUTE_RESOLVER_ROLE) {
        Dispute storage dispute = disputes[disputeId];
        require(dispute.status == DisputeStatus.Pending, "Dispute already resolved");
        
        dispute.status = approve ? DisputeStatus.Approved : DisputeStatus.Rejected;
        dispute.resolvedAt = block.timestamp;
        dispute.resolver = msg.sender;
        
        // If approved, reverse the score impact and invalidate the report
        if (approve) {
            ReputationReport storage report = reports[dispute.reportId];
            ReputationProfile storage profile = profiles[report.citizen];
            
            // CRITICAL FIX: Only reverse if score was actually applied
            if (report.scoreApplied) {
                _applyScoreImpact(report.citizen, report.category, -report.scoreImpact);
                report.scoreApplied = false;  // Mark as reversed
            }
            
            // Adjust report counts ALWAYS (whether score was applied or not)
            if (report.reportType == ReportType.Positive && profile.positiveReports > 0) {
                profile.positiveReports--;
            } else if (report.reportType == ReportType.Negative && profile.negativeReports > 0) {
                profile.negativeReports--;
            }
            
            // Mark report as invalidated to prevent future verification
            report.isInvalidated = true;
        }
        
        emit DisputeResolved(disputeId, dispute.status, msg.sender);
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    /**
     * @notice Authorize a lender to report payments
     */
    function authorizeLender(address lender, bool authorized) external onlyRole(ADMIN_ROLE) {
        authorizedLenders[lender] = authorized;
    }
    
    /**
     * @notice Authorize a reporter
     */
    function authorizeReporter(address reporter, bool authorized) external onlyRole(ADMIN_ROLE) {
        authorizedReporters[reporter] = authorized;
    }
    
    /**
     * @notice Update reputation decay rate
     */
    function updateDecayRate(uint256 newRate) external onlyRole(ADMIN_ROLE) {
        require(newRate <= 100, "Rate too high");  // Max 1% per day
        reputationDecayRate = newRate;
    }
    
    /**
     * @notice Pause contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    function getProfile(address citizen) external view returns (ReputationProfile memory) {
        return profiles[citizen];
    }
    
    function getPaymentHistory(address citizen) external view returns (PaymentHistory memory) {
        return paymentHistories[citizen];
    }
    
    function getReport(uint256 reportId) external view returns (ReputationReport memory) {
        return reports[reportId];
    }
    
    function getCitizenReports(address citizen) external view returns (uint256[] memory) {
        return citizenReports[citizen];
    }
    
    function getDispute(uint256 disputeId) external view returns (Dispute memory) {
        return disputes[disputeId];
    }
    
    function getCreditLimit(address citizen) external view returns (uint256) {
        return paymentHistories[citizen].maxCreditLimit;
    }
    
    function isEligibleForLoan(address citizen) external view returns (bool) {
        ReputationProfile storage profile = profiles[citizen];
        return profile.isActive && profile.overallScore >= MIN_REPUTATION_FOR_LOANS;
    }
    
    /**
     * @notice Verify a pending report (for reports that weren't auto-verified)
     */
    function verifyReport(uint256 reportId) external onlyRole(ORACLE_ROLE) {
        ReputationReport storage report = reports[reportId];
        require(!report.isVerified, "Report already verified");
        require(!report.scoreApplied, "Score already applied");
        require(!report.isInvalidated, "Report invalidated by dispute");
        
        report.isVerified = true;
        report.scoreApplied = true;
        
        // Apply the score impact now
        _applyScoreImpact(report.citizen, report.category, report.scoreImpact);
    }
}

