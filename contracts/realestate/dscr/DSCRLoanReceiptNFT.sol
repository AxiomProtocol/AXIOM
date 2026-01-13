// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./IDSCRInterfaces.sol";

contract DSCRLoanReceiptNFT is ERC721Enumerable, AccessControl, Pausable, IDSCRLoanReceipt {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    uint256 private _nextLoanId = 1;
    
    mapping(uint256 => DSCRLoanData) private _loans;
    mapping(address => uint256[]) private _borrowerLoans;
    mapping(uint256 => uint256) private _refinancedTo;

    constructor() ERC721("AXUSD DSCR Loan Receipt", "AXDSCR") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
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
    ) external override onlyRole(MINTER_ROLE) whenNotPaused returns (uint256) {
        require(borrower != address(0), "DSCRLoanReceiptNFT: invalid borrower");
        require(principal > 0, "DSCRLoanReceiptNFT: zero principal");

        uint256 loanId = _nextLoanId++;

        _loans[loanId] = DSCRLoanData({
            loanId: loanId,
            productId: productId,
            borrower: borrower,
            originalPrincipal: principal,
            principalOutstanding: principal,
            interestRateBps: interestRateBps,
            monthlyPayment: monthlyPayment,
            termMonths: termMonths,
            paymentsRemaining: termMonths,
            startTimestamp: block.timestamp,
            lastPaymentTimestamp: 0,
            totalInterestPaid: 0,
            totalPrincipalPaid: 0,
            appraisedValue: appraisedValue,
            monthlyRent: monthlyRent,
            dscrBps: dscrBps,
            ltvBps: ltvBps,
            status: DSCRLoanStatus.Active,
            collateralHash: collateralHash
        });

        _borrowerLoans[borrower].push(loanId);
        _safeMint(borrower, loanId);

        emit DSCRLoanOriginated(
            loanId,
            borrower,
            principal,
            productId,
            dscrBps,
            ltvBps,
            monthlyPayment
        );

        return loanId;
    }

    function recordDSCRPayment(
        uint256 loanId,
        uint256 principalPortion,
        uint256 interestPortion
    ) external override onlyRole(MANAGER_ROLE) {
        require(_exists(loanId), "DSCRLoanReceiptNFT: loan does not exist");

        DSCRLoanData storage loan = _loans[loanId];
        require(
            loan.status == DSCRLoanStatus.Active || 
            loan.status == DSCRLoanStatus.Current ||
            loan.status == DSCRLoanStatus.Delinquent30 ||
            loan.status == DSCRLoanStatus.Delinquent60 ||
            loan.status == DSCRLoanStatus.Delinquent90,
            "DSCRLoanReceiptNFT: loan not payable"
        );

        DSCRLoanStatus oldStatus = loan.status;

        loan.totalPrincipalPaid += principalPortion;
        loan.totalInterestPaid += interestPortion;
        loan.principalOutstanding = loan.principalOutstanding > principalPortion 
            ? loan.principalOutstanding - principalPortion 
            : 0;
        loan.lastPaymentTimestamp = block.timestamp;

        if (loan.paymentsRemaining > 0) {
            loan.paymentsRemaining--;
        }

        if (loan.principalOutstanding == 0) {
            loan.status = DSCRLoanStatus.PaidOff;
            emit DSCRLoanStatusChanged(loanId, oldStatus, DSCRLoanStatus.PaidOff);
        } else if (loan.status != DSCRLoanStatus.Current && loan.status != DSCRLoanStatus.Active) {
            loan.status = DSCRLoanStatus.Current;
            emit DSCRLoanStatusChanged(loanId, oldStatus, DSCRLoanStatus.Current);
        }

        emit DSCRLoanPayment(
            loanId,
            loan.borrower,
            principalPortion,
            interestPortion,
            loan.principalOutstanding
        );
    }

    function updateDSCRLoanStatus(uint256 loanId, DSCRLoanStatus newStatus) external override onlyRole(MANAGER_ROLE) {
        require(_exists(loanId), "DSCRLoanReceiptNFT: loan does not exist");
        
        DSCRLoanData storage loan = _loans[loanId];
        DSCRLoanStatus oldStatus = loan.status;
        loan.status = newStatus;

        emit DSCRLoanStatusChanged(loanId, oldStatus, newStatus);
    }

    function setRefinancedOut(uint256 loanId, uint256 newLoanId) external override onlyRole(MANAGER_ROLE) {
        require(_exists(loanId), "DSCRLoanReceiptNFT: loan does not exist");
        
        DSCRLoanData storage loan = _loans[loanId];
        DSCRLoanStatus oldStatus = loan.status;
        loan.status = DSCRLoanStatus.RefinancedOut;
        _refinancedTo[loanId] = newLoanId;

        emit DSCRLoanStatusChanged(loanId, oldStatus, DSCRLoanStatus.RefinancedOut);
        emit DSCRLoanRefinanced(loanId, newLoanId);
    }

    function getDSCRLoan(uint256 loanId) external view override returns (DSCRLoanData memory) {
        require(_exists(loanId), "DSCRLoanReceiptNFT: loan does not exist");
        return _loans[loanId];
    }

    function getDSCRLoansByBorrower(address borrower) external view override returns (uint256[] memory) {
        return _borrowerLoans[borrower];
    }

    function getRefinancedTo(uint256 loanId) external view returns (uint256) {
        return _refinancedTo[loanId];
    }

    function getNextLoanId() external view returns (uint256) {
        return _nextLoanId;
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        return tokenId > 0 && tokenId < _nextLoanId;
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Enumerable, AccessControl, IERC165)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
