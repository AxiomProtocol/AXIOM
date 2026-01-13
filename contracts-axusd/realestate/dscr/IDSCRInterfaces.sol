// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../Interfaces.sol";

interface IDSCRPoolVault {
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
    function lockForLoan(uint256 amount) external;
    function unlockFromLoan(uint256 amount) external;
    function reportYield(uint256 amount) external;
    function disburse(address recipient, uint256 amount) external;
    function totalAssets() external view returns (uint256);
    function availableLiquidity() external view returns (uint256);
    function lockedLiquidity() external view returns (uint256);
    function convertToShares(uint256 assets) external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256);
}

interface IDSCRRiskConfig {
    struct DSCRProductRisk {
        uint256 productId;
        uint256 maxLtvBps;
        uint256 minDscrBps;
        uint256 interestRateBps;
        uint256 originationFeeBps;
        uint256 termMonths;
        uint256 minLoanSize;
        uint256 maxLoanSize;
        uint256 maxBorrowerExposure;
        uint256 insuranceReserveBps;
        uint256 protocolFeeBps;
        bool active;
    }

    function getDSCRProductRisk(uint256 productId) external view returns (DSCRProductRisk memory);
    function setDSCRProductRisk(uint256 productId, DSCRProductRisk calldata config) external;
    function isDSCRProductActive(uint256 productId) external view returns (bool);

    event DSCRProductRiskUpdated(
        uint256 indexed productId,
        uint256 maxLtvBps,
        uint256 minDscrBps,
        uint256 interestRateBps,
        uint256 termMonths
    );
}

interface IDSCRLoanReceipt is IERC721 {
    enum DSCRLoanStatus { 
        Active, 
        Current, 
        Delinquent30, 
        Delinquent60, 
        Delinquent90, 
        Default, 
        PaidOff, 
        RefinancedOut 
    }

    struct DSCRLoanData {
        uint256 loanId;
        uint256 productId;
        address borrower;
        uint256 originalPrincipal;
        uint256 principalOutstanding;
        uint256 interestRateBps;
        uint256 monthlyPayment;
        uint256 termMonths;
        uint256 paymentsRemaining;
        uint256 startTimestamp;
        uint256 lastPaymentTimestamp;
        uint256 totalInterestPaid;
        uint256 totalPrincipalPaid;
        uint256 appraisedValue;
        uint256 monthlyRent;
        uint256 dscrBps;
        uint256 ltvBps;
        DSCRLoanStatus status;
        bytes32 collateralHash;
    }

    function mintDSCRLoan(
        address borrower,
        uint256 productId,
        uint256 principal,
        uint256 appraisedValue,
        uint256 monthlyRent,
        uint256 monthlyPayment,
        uint256 interestRateBps,
        uint256 termMonths,
        uint256 dscrBps,
        uint256 ltvBps,
        bytes32 collateralHash
    ) external returns (uint256 loanId);

    function recordDSCRPayment(
        uint256 loanId,
        uint256 principalPortion,
        uint256 interestPortion
    ) external;

    function updateDSCRLoanStatus(uint256 loanId, DSCRLoanStatus status) external;
    function getDSCRLoansByBorrower(address borrower) external view returns (uint256[] memory);
    function setRefinancedOut(uint256 loanId, uint256 newLoanId) external;
    
    function getDSCRLoanCore(uint256 loanId) external view returns (
        uint256 loanId_,
        uint256 productId,
        address borrower,
        uint256 originalPrincipal,
        uint256 principalOutstanding,
        DSCRLoanStatus status
    );
    
    function getDSCRLoanTerms(uint256 loanId) external view returns (
        uint256 interestRateBps,
        uint256 monthlyPayment,
        uint256 termMonths,
        uint256 paymentsRemaining,
        uint256 dscrBps,
        uint256 ltvBps
    );
    
    function getDSCRLoanPayments(uint256 loanId) external view returns (
        uint256 startTimestamp,
        uint256 lastPaymentTimestamp,
        uint256 totalInterestPaid,
        uint256 totalPrincipalPaid
    );
    
    function getDSCRLoanProperty(uint256 loanId) external view returns (
        uint256 appraisedValue,
        uint256 monthlyRent,
        bytes32 collateralHash
    );

    event DSCRLoanOriginated(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 principal,
        uint256 productId,
        uint256 dscrBps,
        uint256 ltvBps,
        uint256 monthlyPayment
    );
    event DSCRLoanPayment(
        uint256 indexed loanId,
        address indexed payer,
        uint256 principalPortion,
        uint256 interestPortion,
        uint256 principalRemaining
    );
    event DSCRLoanStatusChanged(uint256 indexed loanId, DSCRLoanStatus oldStatus, DSCRLoanStatus newStatus);
    event DSCRLoanRefinanced(uint256 indexed oldLoanId, uint256 indexed newLoanId);
}

interface IDSCRLoanManager {
    struct OriginateParams {
        address borrower;
        uint256 productId;
        uint256 principal;
        uint256 appraisedValue;
        uint256 monthlyRent;
        uint256 monthlyExpenses;
        bytes32 collateralHash;
    }

    function originate(OriginateParams calldata params) external returns (uint256 loanId);
    function payOnChain(uint256 loanId, uint256 amount) external;
    function postOffChainPayment(uint256 loanId, uint256 amount, bytes32 referenceHash) external;
    function refinanceFromFixFlip(
        uint256 fixFlipLoanId,
        uint256 newProductId,
        uint256 newPrincipal,
        uint256 appraisedValue,
        uint256 monthlyRent,
        uint256 monthlyExpenses,
        bytes32 collateralHash
    ) external returns (uint256 newLoanId);
    function computeMonthlyPayment(uint256 principal, uint256 aprBps, uint256 termMonths) external pure returns (uint256);
    function markDelinquent(uint256 loanId, IDSCRLoanReceipt.DSCRLoanStatus newStatus) external;
    function markDefault(uint256 loanId) external;

    event DSCRLoanFunded(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 principal,
        uint256 productId,
        uint256 dscrBps,
        uint256 ltvBps
    );
    event PaymentReceived(
        uint256 indexed loanId,
        uint256 amount,
        uint256 principalPortion,
        uint256 interestPortion,
        bool isOnChain
    );
    event PaymentPosted(
        uint256 indexed loanId,
        uint256 amount,
        bytes32 indexed referenceHash,
        address indexed postedBy
    );
    event RefinanceCompleted(
        uint256 indexed oldLoanId,
        uint256 indexed newLoanId,
        uint256 payoffAmount,
        uint256 cashOut
    );
    event LoanDefaulted(uint256 indexed loanId, uint256 outstandingBalance);
}
