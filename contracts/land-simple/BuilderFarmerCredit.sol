// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract BuilderFarmerCredit is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant UNDERWRITER_ROLE = keccak256("UNDERWRITER_ROLE");
    bytes32 public constant SERVICER_ROLE = keccak256("SERVICER_ROLE");

    enum CreditType { Builder, Farmer }
    enum ApplicationStatus { Pending, UnderReview, Approved, Rejected, Funded, Repaying, PaidOff, Defaulted }

    struct CreditApplication {
        uint256 applicationId;
        address borrower;
        CreditType creditType;
        uint256 requestedAmount;
        uint256 approvedAmount;
        uint256 interestRateBps;
        uint256 termMonths;
        uint256 collateralValue;
        ApplicationStatus status;
        uint256 createdAt;
        uint256 approvedAt;
        uint256 fundedAt;
    }

    struct Loan {
        uint256 loanId;
        uint256 applicationId;
        address borrower;
        uint256 principal;
        uint256 interestRateBps;
        uint256 termMonths;
        uint256 monthlyPayment;
        uint256 totalRepaid;
        uint256 paymentsCompleted;
        uint256 nextPaymentDue;
        bool active;
    }

    struct CreditTier {
        uint256 maxLTV;
        uint256 interestRateBps;
        uint256 maxTermMonths;
        uint256 minCollateralValue;
    }

    IERC20 public paymentToken;
    address public treasury;
    address public lendingPool;

    uint256 public nextApplicationId = 1;
    uint256 public nextLoanId = 1;
    uint256 public platformFeeBps = 100;
    uint256 public constant MIN_CREDIT_AMOUNT = 100 * 10**18;
    uint256 public constant MAX_CREDIT_AMOUNT = 500_000 * 10**18;

    mapping(uint256 => CreditApplication) public applications;
    mapping(uint256 => Loan) public loans;
    mapping(address => uint256[]) public borrowerApplications;
    mapping(address => uint256[]) public borrowerLoans;
    mapping(CreditType => CreditTier) public creditTiers;

    event ApplicationSubmitted(uint256 indexed applicationId, address indexed borrower, CreditType creditType, uint256 amount);
    event ApplicationReviewed(uint256 indexed applicationId, ApplicationStatus status, uint256 approvedAmount);
    event LoanFunded(uint256 indexed loanId, uint256 indexed applicationId, address indexed borrower, uint256 amount);
    event PaymentReceived(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 paymentsRemaining);
    event LoanPaidOff(uint256 indexed loanId, address indexed borrower, uint256 totalPaid);

    constructor(
        address _paymentToken,
        address _treasury,
        address _lendingPool
    ) {
        require(_paymentToken != address(0), "Invalid payment token");
        require(_treasury != address(0), "Invalid treasury");
        require(_lendingPool != address(0), "Invalid lending pool");

        paymentToken = IERC20(_paymentToken);
        treasury = _treasury;
        lendingPool = _lendingPool;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(UNDERWRITER_ROLE, msg.sender);
        _grantRole(SERVICER_ROLE, msg.sender);

        // Builder tier: 70% LTV, 12% APR, 24 months max, $50k min collateral
        creditTiers[CreditType.Builder] = CreditTier({
            maxLTV: 7000,
            interestRateBps: 1200,
            maxTermMonths: 24,
            minCollateralValue: 50_000 * 10**18
        });

        // Farmer tier: 65% LTV, 10% APR, 36 months max, $25k min collateral
        creditTiers[CreditType.Farmer] = CreditTier({
            maxLTV: 6500,
            interestRateBps: 1000,
            maxTermMonths: 36,
            minCollateralValue: 25_000 * 10**18
        });
    }

    function submitApplication(
        CreditType creditType,
        uint256 requestedAmount,
        uint256 collateralValue,
        uint256 termMonths
    ) external whenNotPaused returns (uint256) {
        require(requestedAmount >= MIN_CREDIT_AMOUNT, "Below minimum credit amount");
        require(requestedAmount <= MAX_CREDIT_AMOUNT, "Exceeds maximum credit amount");
        
        CreditTier memory tier = creditTiers[creditType];
        require(collateralValue >= tier.minCollateralValue, "Insufficient collateral value");
        require(termMonths <= tier.maxTermMonths, "Term exceeds maximum");

        uint256 maxLoanAmount = (collateralValue * tier.maxLTV) / 10000;
        require(requestedAmount <= maxLoanAmount, "Requested amount exceeds LTV limit");

        uint256 applicationId = nextApplicationId++;

        applications[applicationId] = CreditApplication({
            applicationId: applicationId,
            borrower: msg.sender,
            creditType: creditType,
            requestedAmount: requestedAmount,
            approvedAmount: 0,
            interestRateBps: tier.interestRateBps,
            termMonths: termMonths,
            collateralValue: collateralValue,
            status: ApplicationStatus.Pending,
            createdAt: block.timestamp,
            approvedAt: 0,
            fundedAt: 0
        });

        borrowerApplications[msg.sender].push(applicationId);

        emit ApplicationSubmitted(applicationId, msg.sender, creditType, requestedAmount);
        return applicationId;
    }

    function reviewApplication(
        uint256 applicationId,
        bool approved,
        uint256 approvedAmount
    ) external onlyRole(UNDERWRITER_ROLE) {
        CreditApplication storage app = applications[applicationId];
        require(app.status == ApplicationStatus.Pending || app.status == ApplicationStatus.UnderReview, "Invalid status");

        if (approved) {
            require(approvedAmount > 0 && approvedAmount <= app.requestedAmount, "Invalid approved amount");
            app.status = ApplicationStatus.Approved;
            app.approvedAmount = approvedAmount;
            app.approvedAt = block.timestamp;
        } else {
            app.status = ApplicationStatus.Rejected;
        }

        emit ApplicationReviewed(applicationId, app.status, approvedAmount);
    }

    function fundLoan(uint256 applicationId) external onlyRole(ADMIN_ROLE) nonReentrant {
        CreditApplication storage app = applications[applicationId];
        require(app.status == ApplicationStatus.Approved, "Application not approved");

        uint256 loanId = nextLoanId++;
        uint256 monthlyPayment = calculateMonthlyPayment(
            app.approvedAmount,
            app.interestRateBps,
            app.termMonths
        );

        loans[loanId] = Loan({
            loanId: loanId,
            applicationId: applicationId,
            borrower: app.borrower,
            principal: app.approvedAmount,
            interestRateBps: app.interestRateBps,
            termMonths: app.termMonths,
            monthlyPayment: monthlyPayment,
            totalRepaid: 0,
            paymentsCompleted: 0,
            nextPaymentDue: block.timestamp + 30 days,
            active: true
        });

        app.status = ApplicationStatus.Funded;
        app.fundedAt = block.timestamp;
        borrowerLoans[app.borrower].push(loanId);

        require(paymentToken.transferFrom(lendingPool, app.borrower, app.approvedAmount), "Funding transfer failed");

        emit LoanFunded(loanId, applicationId, app.borrower, app.approvedAmount);
    }

    function makePayment(uint256 loanId) external nonReentrant whenNotPaused {
        Loan storage loan = loans[loanId];
        require(loan.active, "Loan not active");
        require(msg.sender == loan.borrower, "Not borrower");

        uint256 payment = loan.monthlyPayment;
        require(paymentToken.transferFrom(msg.sender, lendingPool, payment), "Payment transfer failed");

        loan.totalRepaid += payment;
        loan.paymentsCompleted++;
        loan.nextPaymentDue = block.timestamp + 30 days;

        uint256 paymentsRemaining = loan.termMonths - loan.paymentsCompleted;

        emit PaymentReceived(loanId, msg.sender, payment, paymentsRemaining);

        if (loan.paymentsCompleted >= loan.termMonths) {
            loan.active = false;
            applications[loan.applicationId].status = ApplicationStatus.PaidOff;
            emit LoanPaidOff(loanId, msg.sender, loan.totalRepaid);
        }
    }

    function calculateMonthlyPayment(
        uint256 principal,
        uint256 annualRateBps,
        uint256 termMonths
    ) public pure returns (uint256) {
        // Simple interest calculation: (principal + total interest) / months
        uint256 totalInterest = (principal * annualRateBps * termMonths) / (10000 * 12);
        return (principal + totalInterest) / termMonths;
    }

    function getApplication(uint256 applicationId) external view returns (CreditApplication memory) {
        return applications[applicationId];
    }

    function getLoan(uint256 loanId) external view returns (Loan memory) {
        return loans[loanId];
    }

    function getBorrowerApplications(address borrower) external view returns (uint256[] memory) {
        return borrowerApplications[borrower];
    }

    function getBorrowerLoans(address borrower) external view returns (uint256[] memory) {
        return borrowerLoans[borrower];
    }

    function getCreditTier(CreditType creditType) external view returns (CreditTier memory) {
        return creditTiers[creditType];
    }

    function updateCreditTier(
        CreditType creditType,
        uint256 maxLTV,
        uint256 interestRateBps,
        uint256 maxTermMonths,
        uint256 minCollateralValue
    ) external onlyRole(ADMIN_ROLE) {
        creditTiers[creditType] = CreditTier({
            maxLTV: maxLTV,
            interestRateBps: interestRateBps,
            maxTermMonths: maxTermMonths,
            minCollateralValue: minCollateralValue
        });
    }

    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }
}
