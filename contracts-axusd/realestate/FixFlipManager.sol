// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./Interfaces.sol";

contract FixFlipManager is AccessControl, Pausable, ReentrancyGuard, IProductManager {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant UNDERWRITER_ROLE = keccak256("UNDERWRITER_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    uint256 public constant PRODUCT_ID = 1; // Fix & Flip = Product 1

    IERC20 public immutable axusd;
    IPoolVault public vault;
    ILoanReceipt public loanReceipt;
    IRiskConfig public riskConfig;
    IRepaymentRouter public repaymentRouter;

    bool public active;
    uint256 public totalOriginated;
    uint256 public totalRepaid;
    uint256 public activeLoans;

    mapping(uint256 => LoanDetails) public loanDetails;

    struct LoanDetails {
        uint256 purchasePrice;
        uint256 afterRepairValue;
        uint256 rehabBudget;
        address approvedBy;
        uint256 approvedAt;
        uint256 fundedAt;
        uint256 closedAt;
    }

    event LoanFunded(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 principal,
        uint256 purchasePrice,
        uint256 arv
    );
    event LoanPaymentReceived(uint256 indexed loanId, uint256 amount, uint256 remaining);
    event LoanFullyRepaid(uint256 indexed loanId, uint256 totalPaid);
    event LoanDefaulted(uint256 indexed loanId);
    event ManagerActivated();
    event ManagerDeactivated();

    constructor(
        address _axusd,
        address _vault,
        address _loanReceipt,
        address _riskConfig,
        address _repaymentRouter
    ) {
        require(_axusd != address(0), "FixFlipManager: invalid axusd");
        require(_vault != address(0), "FixFlipManager: invalid vault");
        require(_loanReceipt != address(0), "FixFlipManager: invalid loanReceipt");
        require(_riskConfig != address(0), "FixFlipManager: invalid riskConfig");
        require(_repaymentRouter != address(0), "FixFlipManager: invalid router");

        axusd = IERC20(_axusd);
        vault = IPoolVault(_vault);
        loanReceipt = ILoanReceipt(_loanReceipt);
        riskConfig = IRiskConfig(_riskConfig);
        repaymentRouter = IRepaymentRouter(_repaymentRouter);
        active = true;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(UNDERWRITER_ROLE, msg.sender);
        _grantRole(GUARDIAN_ROLE, msg.sender);
    }

    function productId() external pure override returns (uint256) {
        return PRODUCT_ID;
    }

    function isActive() external view override returns (bool) {
        return active && !paused();
    }

    function originate(
        address borrower,
        uint256 principal,
        IUnderwriter.DealTerms calldata terms
    ) external override onlyRole(UNDERWRITER_ROLE) nonReentrant whenNotPaused returns (uint256) {
        require(active, "FixFlipManager: not active");
        require(borrower != address(0), "FixFlipManager: invalid borrower");
        require(principal > 0, "FixFlipManager: zero principal");

        IRiskConfig.ProductRisk memory risk = riskConfig.getProductRisk(PRODUCT_ID);
        require(risk.active, "FixFlipManager: product not active");

        require(principal >= risk.minLoanSize, "FixFlipManager: below min loan size");
        require(principal <= risk.maxLoanSize, "FixFlipManager: exceeds max loan size");
        require(terms.termDays <= risk.maxTermDays, "FixFlipManager: term too long");

        uint256 maxLoan = (terms.afterRepairValue * risk.maxLtvBps) / 10000;
        require(principal <= maxLoan, "FixFlipManager: exceeds max LTV");

        require(
            vault.availableLiquidity() >= principal,
            "FixFlipManager: insufficient vault liquidity"
        );

        uint256 loanId = loanReceipt.mintLoan(
            borrower,
            PRODUCT_ID,
            principal,
            risk.interestRateBps,
            terms.termDays,
            terms.collateralHash
        );

        loanDetails[loanId] = LoanDetails({
            purchasePrice: terms.purchasePrice,
            afterRepairValue: terms.afterRepairValue,
            rehabBudget: terms.rehabBudget,
            approvedBy: msg.sender,
            approvedAt: block.timestamp,
            fundedAt: block.timestamp,
            closedAt: 0
        });

        vault.lockForLoan(principal);
        axusd.safeTransferFrom(address(vault), borrower, principal);

        totalOriginated += principal;
        activeLoans++;

        emit LoanFunded(
            loanId,
            borrower,
            principal,
            terms.purchasePrice,
            terms.afterRepairValue
        );

        return loanId;
    }

    function pay(uint256 loanId, uint256 amount) external override nonReentrant whenNotPaused {
        require(amount > 0, "FixFlipManager: zero amount");

        ILoanReceipt.LoanData memory loan = loanReceipt.getLoan(loanId);
        require(loan.loanId == loanId, "FixFlipManager: loan not found");
        require(
            loan.status == ILoanReceipt.LoanStatus.Active ||
            loan.status == ILoanReceipt.LoanStatus.Repaying,
            "FixFlipManager: loan not payable"
        );

        uint256 totalDue = loanReceipt.calculateTotalDue(loanId);
        uint256 interestDue = loanReceipt.calculateInterestDue(loanId);
        uint256 principalRemaining = loan.principal - loan.amountRepaid;

        uint256 interestPortion;
        uint256 principalPortion;

        if (amount >= totalDue) {
            amount = totalDue;
            interestPortion = interestDue;
            principalPortion = amount - interestPortion;
        } else if (amount <= interestDue) {
            interestPortion = amount;
            principalPortion = 0;
        } else {
            interestPortion = interestDue;
            principalPortion = amount - interestPortion;
        }

        axusd.safeTransferFrom(msg.sender, address(repaymentRouter), amount);
        repaymentRouter.routePayment(loanId, amount, principalPortion, interestPortion);

        uint256 newAmountRepaid = loan.amountRepaid + principalPortion;
        totalRepaid += principalPortion;

        if (newAmountRepaid >= loan.principal) {
            loanReceipt.updateLoanStatus(loanId, ILoanReceipt.LoanStatus.Repaid);
            loanDetails[loanId].closedAt = block.timestamp;
            activeLoans--;
            emit LoanFullyRepaid(loanId, newAmountRepaid);
        } else {
            loanReceipt.updateLoanStatus(loanId, ILoanReceipt.LoanStatus.Repaying);
            emit LoanPaymentReceived(loanId, amount, loan.principal - newAmountRepaid);
        }
    }

    function closeLoan(uint256 loanId) external override onlyRole(ADMIN_ROLE) {
        ILoanReceipt.LoanData memory loan = loanReceipt.getLoan(loanId);
        require(loan.loanId == loanId, "FixFlipManager: loan not found");
        require(
            loan.status == ILoanReceipt.LoanStatus.Repaid,
            "FixFlipManager: loan not fully repaid"
        );

        if (loanDetails[loanId].closedAt == 0) {
            loanDetails[loanId].closedAt = block.timestamp;
        }
    }

    function markDefaulted(uint256 loanId) external onlyRole(ADMIN_ROLE) {
        ILoanReceipt.LoanData memory loan = loanReceipt.getLoan(loanId);
        require(loan.loanId == loanId, "FixFlipManager: loan not found");
        require(
            loan.status == ILoanReceipt.LoanStatus.Active ||
            loan.status == ILoanReceipt.LoanStatus.Repaying,
            "FixFlipManager: invalid status for default"
        );
        require(
            block.timestamp > loan.maturityTimestamp + 30 days,
            "FixFlipManager: grace period not elapsed"
        );

        loanReceipt.updateLoanStatus(loanId, ILoanReceipt.LoanStatus.Defaulted);
        loanDetails[loanId].closedAt = block.timestamp;
        activeLoans--;

        emit LoanDefaulted(loanId);
    }

    function getLoanDetails(uint256 loanId) external view returns (
        ILoanReceipt.LoanData memory loan,
        LoanDetails memory details
    ) {
        loan = loanReceipt.getLoan(loanId);
        details = loanDetails[loanId];
    }

    function getStats() external view returns (
        uint256 _totalOriginated,
        uint256 _totalRepaid,
        uint256 _activeLoans,
        uint256 _availableLiquidity
    ) {
        return (totalOriginated, totalRepaid, activeLoans, vault.availableLiquidity());
    }

    function activate() external onlyRole(ADMIN_ROLE) {
        active = true;
        emit ManagerActivated();
    }

    function deactivate() external onlyRole(ADMIN_ROLE) {
        active = false;
        emit ManagerDeactivated();
    }

    function setVault(address _vault) external onlyRole(ADMIN_ROLE) {
        require(_vault != address(0), "FixFlipManager: invalid vault");
        vault = IPoolVault(_vault);
    }

    function setLoanReceipt(address _loanReceipt) external onlyRole(ADMIN_ROLE) {
        require(_loanReceipt != address(0), "FixFlipManager: invalid loanReceipt");
        loanReceipt = ILoanReceipt(_loanReceipt);
    }

    function setRiskConfig(address _riskConfig) external onlyRole(ADMIN_ROLE) {
        require(_riskConfig != address(0), "FixFlipManager: invalid riskConfig");
        riskConfig = IRiskConfig(_riskConfig);
    }

    function setRepaymentRouter(address _router) external onlyRole(ADMIN_ROLE) {
        require(_router != address(0), "FixFlipManager: invalid router");
        repaymentRouter = IRepaymentRouter(_router);
    }

    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}
