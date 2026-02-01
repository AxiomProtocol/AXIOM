// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IDSCRInterfaces.sol";
import "../Interfaces.sol";

contract DSCRLoanManager is AccessControl, Pausable, ReentrancyGuard, IDSCRLoanManager {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant UNDERWRITER_ROLE = keccak256("UNDERWRITER_ROLE");
    bytes32 public constant SERVICER_ROLE = keccak256("SERVICER_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MONTHS_PER_YEAR = 12;
    uint256 public constant PRECISION = 1e18;

    IERC20 public immutable axusd;
    IDSCRPoolVault public dscrVault;
    IDSCRLoanReceipt public loanReceipt;
    IDSCRRiskConfig public riskConfig;
    IRepaymentRouter public repaymentRouter;
    
    IPoolVault public fixFlipVault;
    ILoanReceipt public fixFlipLoanReceipt;

    bool public active;
    bool public cashOutEnabled;
    uint256 public maxCashOutBps;

    uint256 public totalOriginated;
    uint256 public totalRepaid;
    uint256 public activeLoans;
    uint256 public totalInterestCollected;

    mapping(address => uint256) public borrowerExposure;

    event ManagerActivated();
    event ManagerDeactivated();
    event CashOutSettingsUpdated(bool enabled, uint256 maxBps);

    constructor(
        address _axusd,
        address _dscrVault,
        address _loanReceipt,
        address _riskConfig,
        address _repaymentRouter
    ) {
        require(_axusd != address(0), "DSCRLoanManager: invalid axusd");
        require(_dscrVault != address(0), "DSCRLoanManager: invalid vault");
        require(_loanReceipt != address(0), "DSCRLoanManager: invalid loanReceipt");
        require(_riskConfig != address(0), "DSCRLoanManager: invalid riskConfig");
        require(_repaymentRouter != address(0), "DSCRLoanManager: invalid router");

        axusd = IERC20(_axusd);
        dscrVault = IDSCRPoolVault(_dscrVault);
        loanReceipt = IDSCRLoanReceipt(_loanReceipt);
        riskConfig = IDSCRRiskConfig(_riskConfig);
        repaymentRouter = IRepaymentRouter(_repaymentRouter);
        
        active = true;
        cashOutEnabled = false;
        maxCashOutBps = 0;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(UNDERWRITER_ROLE, msg.sender);
        _grantRole(SERVICER_ROLE, msg.sender);
        _grantRole(GUARDIAN_ROLE, msg.sender);
    }

    function originate(
        OriginateParams calldata params
    ) external override onlyRole(UNDERWRITER_ROLE) nonReentrant whenNotPaused returns (uint256) {
        require(active, "DSCRLoanManager: not active");
        require(params.borrower != address(0), "DSCRLoanManager: invalid borrower");
        require(params.principal > 0, "DSCRLoanManager: zero principal");

        IDSCRRiskConfig.DSCRProductRisk memory risk = riskConfig.getDSCRProductRisk(params.productId);
        require(risk.active, "DSCRLoanManager: product not active");

        require(params.principal >= risk.minLoanSize, "DSCRLoanManager: below min loan size");
        require(params.principal <= risk.maxLoanSize, "DSCRLoanManager: exceeds max loan size");

        uint256 newExposure = borrowerExposure[params.borrower] + params.principal;
        require(newExposure <= risk.maxBorrowerExposure, "DSCRLoanManager: exceeds borrower exposure limit");

        uint256 ltvBps = (params.principal * BASIS_POINTS) / params.appraisedValue;
        require(ltvBps <= risk.maxLtvBps, "DSCRLoanManager: exceeds max LTV");

        uint256 monthlyPayment = computeMonthlyPayment(params.principal, risk.interestRateBps, risk.termMonths);
        
        uint256 netRent = params.monthlyRent > params.monthlyExpenses 
            ? params.monthlyRent - params.monthlyExpenses 
            : 0;
        uint256 dscrBps = (netRent * BASIS_POINTS) / monthlyPayment;
        require(dscrBps >= risk.minDscrBps, "DSCRLoanManager: DSCR too low");

        require(
            dscrVault.availableLiquidity() >= params.principal,
            "DSCRLoanManager: insufficient vault liquidity"
        );

        uint256 loanId = loanReceipt.mintDSCRLoan(
            params.borrower,
            params.productId,
            params.principal,
            params.appraisedValue,
            params.monthlyRent,
            monthlyPayment,
            risk.interestRateBps,
            risk.termMonths,
            dscrBps,
            ltvBps,
            params.collateralHash
        );

        dscrVault.lockForLoan(params.principal);
        dscrVault.disburse(params.borrower, params.principal);

        totalOriginated += params.principal;
        activeLoans++;
        borrowerExposure[params.borrower] = newExposure;

        emit DSCRLoanFunded(
            loanId,
            params.borrower,
            params.principal,
            params.productId,
            dscrBps,
            ltvBps
        );

        return loanId;
    }

    function payOnChain(uint256 loanId, uint256 amount) external override nonReentrant whenNotPaused {
        require(amount > 0, "DSCRLoanManager: zero amount");

        (
            uint256 loanId_,
            ,
            address borrower,
            uint256 originalPrincipal,
            uint256 principalOutstanding,
            IDSCRLoanReceipt.DSCRLoanStatus status
        ) = loanReceipt.getDSCRLoanCore(loanId);
        require(loanId_ == loanId, "DSCRLoanManager: loan not found");
        require(
            status == IDSCRLoanReceipt.DSCRLoanStatus.Active ||
            status == IDSCRLoanReceipt.DSCRLoanStatus.Current ||
            status == IDSCRLoanReceipt.DSCRLoanStatus.Delinquent30 ||
            status == IDSCRLoanReceipt.DSCRLoanStatus.Delinquent60 ||
            status == IDSCRLoanReceipt.DSCRLoanStatus.Delinquent90,
            "DSCRLoanManager: loan not payable"
        );

        (
            uint256 interestRateBps,
            uint256 monthlyPayment,
            ,
            ,
            ,
        ) = loanReceipt.getDSCRLoanTerms(loanId);

        (uint256 principalPortion, uint256 interestPortion) = _computePaymentSplitSimple(
            principalOutstanding,
            interestRateBps,
            monthlyPayment,
            amount
        );

        axusd.safeTransferFrom(msg.sender, address(repaymentRouter), amount);
        repaymentRouter.routePayment(loanId, amount, principalPortion, interestPortion);

        loanReceipt.recordDSCRPayment(loanId, principalPortion, interestPortion);

        totalRepaid += principalPortion;
        totalInterestCollected += interestPortion;

        if (principalOutstanding <= principalPortion) {
            activeLoans--;
            borrowerExposure[borrower] -= originalPrincipal;
            dscrVault.unlockFromLoan(originalPrincipal);
        }

        emit PaymentReceived(loanId, amount, principalPortion, interestPortion, true);
    }

    function postOffChainPayment(
        uint256 loanId, 
        uint256 amount, 
        bytes32 referenceHash
    ) external override onlyRole(SERVICER_ROLE) nonReentrant whenNotPaused {
        require(amount > 0, "DSCRLoanManager: zero amount");
        require(referenceHash != bytes32(0), "DSCRLoanManager: invalid reference");

        (
            uint256 loanId_,
            ,
            address borrower,
            uint256 originalPrincipal,
            uint256 principalOutstanding,
            IDSCRLoanReceipt.DSCRLoanStatus status
        ) = loanReceipt.getDSCRLoanCore(loanId);
        require(loanId_ == loanId, "DSCRLoanManager: loan not found");
        require(
            status == IDSCRLoanReceipt.DSCRLoanStatus.Active ||
            status == IDSCRLoanReceipt.DSCRLoanStatus.Current ||
            status == IDSCRLoanReceipt.DSCRLoanStatus.Delinquent30 ||
            status == IDSCRLoanReceipt.DSCRLoanStatus.Delinquent60 ||
            status == IDSCRLoanReceipt.DSCRLoanStatus.Delinquent90,
            "DSCRLoanManager: loan not payable"
        );

        (
            uint256 interestRateBps,
            uint256 monthlyPayment,
            ,
            ,
            ,
        ) = loanReceipt.getDSCRLoanTerms(loanId);

        (uint256 principalPortion, uint256 interestPortion) = _computePaymentSplitSimple(
            principalOutstanding,
            interestRateBps,
            monthlyPayment,
            amount
        );

        loanReceipt.recordDSCRPayment(loanId, principalPortion, interestPortion);

        totalRepaid += principalPortion;
        totalInterestCollected += interestPortion;

        if (principalOutstanding <= principalPortion) {
            activeLoans--;
            borrowerExposure[borrower] -= originalPrincipal;
            dscrVault.unlockFromLoan(originalPrincipal);
        }

        dscrVault.reportYield(interestPortion);

        emit PaymentPosted(loanId, amount, referenceHash, msg.sender);
        emit PaymentReceived(loanId, amount, principalPortion, interestPortion, false);
    }

    function refinanceFromFixFlip(
        uint256 fixFlipLoanId,
        uint256 newProductId,
        uint256 newPrincipal,
        uint256 appraisedValue,
        uint256 monthlyRent,
        uint256 monthlyExpenses,
        bytes32 collateralHash
    ) external override onlyRole(UNDERWRITER_ROLE) nonReentrant whenNotPaused returns (uint256) {
        require(active, "DSCRLoanManager: not active");
        require(address(fixFlipLoanReceipt) != address(0), "DSCRLoanManager: fixflip not configured");
        require(address(fixFlipVault) != address(0), "DSCRLoanManager: fixflip vault not configured");

        ILoanReceipt.LoanData memory fixFlipLoan = fixFlipLoanReceipt.getLoan(fixFlipLoanId);
        require(fixFlipLoan.loanId == fixFlipLoanId, "DSCRLoanManager: fixflip loan not found");
        require(
            fixFlipLoan.status == ILoanReceipt.LoanStatus.Active ||
            fixFlipLoan.status == ILoanReceipt.LoanStatus.Repaying,
            "DSCRLoanManager: fixflip loan not eligible"
        );

        uint256 payoffAmount = fixFlipLoan.principal + fixFlipLoanReceipt.calculateInterestDue(fixFlipLoanId) - fixFlipLoan.amountRepaid;

        require(newPrincipal >= payoffAmount, "DSCRLoanManager: insufficient principal for payoff");

        IDSCRRiskConfig.DSCRProductRisk memory risk = riskConfig.getDSCRProductRisk(newProductId);
        require(risk.active, "DSCRLoanManager: product not active");
        require(newPrincipal >= risk.minLoanSize, "DSCRLoanManager: below min loan size");
        require(newPrincipal <= risk.maxLoanSize, "DSCRLoanManager: exceeds max loan size");

        uint256 ltvBps = (newPrincipal * BASIS_POINTS) / appraisedValue;
        require(ltvBps <= risk.maxLtvBps, "DSCRLoanManager: exceeds max LTV");

        uint256 monthlyPayment = computeMonthlyPayment(newPrincipal, risk.interestRateBps, risk.termMonths);
        uint256 netRent = monthlyRent > monthlyExpenses ? monthlyRent - monthlyExpenses : 0;
        uint256 dscrBps = (netRent * BASIS_POINTS) / monthlyPayment;
        require(dscrBps >= risk.minDscrBps, "DSCRLoanManager: DSCR too low");

        uint256 cashOut = newPrincipal - payoffAmount;
        if (!cashOutEnabled) {
            require(cashOut == 0, "DSCRLoanManager: cash-out disabled");
        } else if (maxCashOutBps > 0) {
            uint256 maxCashOut = (appraisedValue * maxCashOutBps) / BASIS_POINTS;
            require(cashOut <= maxCashOut, "DSCRLoanManager: cash-out exceeds limit");
        }

        require(
            dscrVault.availableLiquidity() >= newPrincipal,
            "DSCRLoanManager: insufficient vault liquidity"
        );

        dscrVault.lockForLoan(newPrincipal);

        dscrVault.disburse(address(fixFlipVault), payoffAmount);
        fixFlipVault.unlockFromLoan(fixFlipLoan.principal);

        if (cashOut > 0) {
            dscrVault.disburse(fixFlipLoan.borrower, cashOut);
        }

        uint256 newLoanId = loanReceipt.mintDSCRLoan(
            fixFlipLoan.borrower,
            newProductId,
            newPrincipal,
            appraisedValue,
            monthlyRent,
            monthlyPayment,
            risk.interestRateBps,
            risk.termMonths,
            dscrBps,
            ltvBps,
            collateralHash
        );

        fixFlipLoanReceipt.updateLoanStatus(fixFlipLoanId, ILoanReceipt.LoanStatus.Repaid);

        totalOriginated += newPrincipal;
        activeLoans++;
        borrowerExposure[fixFlipLoan.borrower] += newPrincipal;

        emit RefinanceCompleted(fixFlipLoanId, newLoanId, payoffAmount, cashOut);
        emit DSCRLoanFunded(
            newLoanId,
            fixFlipLoan.borrower,
            newPrincipal,
            newProductId,
            dscrBps,
            ltvBps
        );

        return newLoanId;
    }

    function computeMonthlyPayment(
        uint256 principal, 
        uint256 aprBps, 
        uint256 termMonths
    ) public pure override returns (uint256) {
        if (aprBps == 0) {
            return principal / termMonths;
        }

        uint256 monthlyRateBps = aprBps / MONTHS_PER_YEAR;
        
        uint256 monthlyRate = (monthlyRateBps * PRECISION) / BASIS_POINTS;
        
        uint256 onePlusR = PRECISION + monthlyRate;
        uint256 onePlusRPowN = PRECISION;
        
        for (uint256 i = 0; i < termMonths; i++) {
            onePlusRPowN = (onePlusRPowN * onePlusR) / PRECISION;
        }
        
        uint256 numerator = (principal * monthlyRate * onePlusRPowN) / PRECISION;
        uint256 denominator = onePlusRPowN - PRECISION;
        
        if (denominator == 0) {
            return principal / termMonths;
        }
        
        return numerator / denominator;
    }

    function _computePaymentSplitSimple(
        uint256 principalOutstanding,
        uint256 interestRateBps,
        uint256 monthlyPayment,
        uint256 amount
    ) internal pure returns (uint256 principalPortion, uint256 interestPortion) {
        uint256 monthlyInterest = (principalOutstanding * interestRateBps) / (BASIS_POINTS * MONTHS_PER_YEAR);
        
        if (amount <= monthlyInterest) {
            interestPortion = amount;
            principalPortion = 0;
        } else {
            interestPortion = monthlyInterest;
            principalPortion = amount - interestPortion;
            
            if (principalPortion > principalOutstanding) {
                principalPortion = principalOutstanding;
            }
        }
    }

    function markDelinquent(
        uint256 loanId, 
        IDSCRLoanReceipt.DSCRLoanStatus newStatus
    ) external override onlyRole(SERVICER_ROLE) {
        require(
            newStatus == IDSCRLoanReceipt.DSCRLoanStatus.Delinquent30 ||
            newStatus == IDSCRLoanReceipt.DSCRLoanStatus.Delinquent60 ||
            newStatus == IDSCRLoanReceipt.DSCRLoanStatus.Delinquent90,
            "DSCRLoanManager: invalid delinquency status"
        );
        
        loanReceipt.updateDSCRLoanStatus(loanId, newStatus);
    }

    function markDefault(uint256 loanId) external override onlyRole(ADMIN_ROLE) {
        (
            uint256 loanId_,
            ,
            ,
            ,
            uint256 principalOutstanding,
            IDSCRLoanReceipt.DSCRLoanStatus status
        ) = loanReceipt.getDSCRLoanCore(loanId);
        require(loanId_ == loanId, "DSCRLoanManager: loan not found");
        require(
            status == IDSCRLoanReceipt.DSCRLoanStatus.Delinquent90,
            "DSCRLoanManager: must be 90+ days delinquent"
        );

        loanReceipt.updateDSCRLoanStatus(loanId, IDSCRLoanReceipt.DSCRLoanStatus.Default);
        activeLoans--;

        emit LoanDefaulted(loanId, principalOutstanding);
    }

    function setFixFlipContracts(
        address _fixFlipVault,
        address _fixFlipLoanReceipt
    ) external onlyRole(ADMIN_ROLE) {
        fixFlipVault = IPoolVault(_fixFlipVault);
        fixFlipLoanReceipt = ILoanReceipt(_fixFlipLoanReceipt);
    }

    function setCashOutSettings(bool _enabled, uint256 _maxBps) external onlyRole(ADMIN_ROLE) {
        require(_maxBps <= 2500, "DSCRLoanManager: max cash-out too high");
        cashOutEnabled = _enabled;
        maxCashOutBps = _maxBps;
        emit CashOutSettingsUpdated(_enabled, _maxBps);
    }

    function getStats() external view returns (
        uint256 _totalOriginated,
        uint256 _totalRepaid,
        uint256 _activeLoans,
        uint256 _availableLiquidity,
        uint256 _totalInterestCollected
    ) {
        return (
            totalOriginated, 
            totalRepaid, 
            activeLoans, 
            dscrVault.availableLiquidity(),
            totalInterestCollected
        );
    }

    function activate() external onlyRole(ADMIN_ROLE) {
        active = true;
        emit ManagerActivated();
    }

    function deactivate() external onlyRole(ADMIN_ROLE) {
        active = false;
        emit ManagerDeactivated();
    }

    function setDSCRVault(address _vault) external onlyRole(ADMIN_ROLE) {
        require(_vault != address(0), "DSCRLoanManager: invalid vault");
        dscrVault = IDSCRPoolVault(_vault);
    }

    function setLoanReceipt(address _loanReceipt) external onlyRole(ADMIN_ROLE) {
        require(_loanReceipt != address(0), "DSCRLoanManager: invalid loanReceipt");
        loanReceipt = IDSCRLoanReceipt(_loanReceipt);
    }

    function setRiskConfig(address _riskConfig) external onlyRole(ADMIN_ROLE) {
        require(_riskConfig != address(0), "DSCRLoanManager: invalid riskConfig");
        riskConfig = IDSCRRiskConfig(_riskConfig);
    }

    function setRepaymentRouter(address _router) external onlyRole(ADMIN_ROLE) {
        require(_router != address(0), "DSCRLoanManager: invalid router");
        repaymentRouter = IRepaymentRouter(_router);
    }

    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}
