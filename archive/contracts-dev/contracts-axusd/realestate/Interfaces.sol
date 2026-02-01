// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IPoolVault {
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

    event PoolDeposit(address indexed user, uint256 assets, uint256 shares);
    event PoolWithdraw(address indexed user, uint256 assets, uint256 shares);
    event YieldReported(uint256 amount);
    event FundsLocked(uint256 amount);
    event FundsUnlocked(uint256 amount);
}

interface IRiskConfig {
    struct ProductRisk {
        uint256 productId;
        uint256 maxLtvBps;
        uint256 maxTermDays;
        uint256 maxLoanSize;
        uint256 minLoanSize;
        uint256 originationFeeBps;
        uint256 interestRateBps;
        uint256 lateFeePerDayBps;
        uint256 insuranceReserveBps;
        uint256 protocolFeeBps;
        bool active;
    }

    function getProductRisk(uint256 productId) external view returns (ProductRisk memory);
    function setProductRisk(uint256 productId, ProductRisk calldata config) external;
    function isProductActive(uint256 productId) external view returns (bool);

    event ProductRiskUpdated(uint256 indexed productId, uint256 maxLtvBps, uint256 maxTermDays, uint256 maxLoanSize);
}

interface ILoanReceipt is IERC721 {
    enum LoanStatus { Active, Repaying, Repaid, Defaulted, Liquidated }

    struct LoanData {
        uint256 loanId;
        uint256 productId;
        address borrower;
        uint256 principal;
        uint256 interestRateBps;
        uint256 startTimestamp;
        uint256 maturityTimestamp;
        uint256 amountRepaid;
        LoanStatus status;
        bytes32 collateralHash;
    }

    function mintLoan(
        address borrower,
        uint256 productId,
        uint256 principal,
        uint256 interestRateBps,
        uint256 termDays,
        bytes32 collateralHash
    ) external returns (uint256 loanId);

    function updateLoanStatus(uint256 loanId, LoanStatus status) external;
    function recordPayment(uint256 loanId, uint256 amount) external;
    function getLoan(uint256 loanId) external view returns (LoanData memory);
    function getLoansByBorrower(address borrower) external view returns (uint256[] memory);
    function calculateInterestDue(uint256 loanId) external view returns (uint256);
    function calculateTotalDue(uint256 loanId) external view returns (uint256);

    event LoanOriginated(uint256 indexed loanId, address indexed borrower, uint256 principal, uint256 productId);
    event LoanPayment(uint256 indexed loanId, address indexed payer, uint256 amount);
    event LoanStatusChanged(uint256 indexed loanId, LoanStatus status);
    event LoanClosed(uint256 indexed loanId);
}

interface IRepaymentRouter {
    function routePayment(
        uint256 loanId,
        uint256 amount,
        uint256 principalPortion,
        uint256 interestPortion
    ) external;

    function getRoutingSplit(uint256 productId, uint256 interestAmount) external view returns (
        uint256 toVault,
        uint256 toInsurance,
        uint256 toTreasury
    );

    event PaymentRouted(
        uint256 indexed loanId,
        uint256 principal,
        uint256 yieldToVault,
        uint256 toInsurance,
        uint256 toTreasury
    );
}

interface IUnderwriter {
    struct DealTerms {
        uint256 purchasePrice;
        uint256 afterRepairValue;
        uint256 rehabBudget;
        uint256 termDays;
        bytes32 collateralHash;
    }

    function approveDeal(
        address borrower,
        uint256 productId,
        uint256 principal,
        DealTerms calldata terms
    ) external view returns (bool approved, string memory reason);
}

interface IProductManager {
    function productId() external view returns (uint256);
    function isActive() external view returns (bool);
    function originate(
        address borrower,
        uint256 principal,
        IUnderwriter.DealTerms calldata terms
    ) external returns (uint256 loanId);
    function pay(uint256 loanId, uint256 amount) external;
    function closeLoan(uint256 loanId) external;
}

interface IProductRegistry {
    function registerProduct(uint256 productId, address manager) external;
    function getManager(uint256 productId) external view returns (address);
    function isRegistered(uint256 productId) external view returns (bool);

    event ProductRegistered(uint256 indexed productId, address indexed manager);
}
