// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./Interfaces.sol";

contract LoanReceiptNFT is ERC721Enumerable, AccessControl, Pausable, ILoanReceipt {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    uint256 private _nextLoanId = 1;
    
    mapping(uint256 => LoanData) private _loans;
    mapping(address => uint256[]) private _borrowerLoans;

    uint256 public constant SECONDS_PER_DAY = 86400;
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    constructor() ERC721("Axiom Loan Receipt", "AXLOAN") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
    }

    function mintLoan(
        address borrower,
        uint256 productId,
        uint256 principal,
        uint256 interestRateBps,
        uint256 termDays,
        bytes32 collateralHash
    ) external override onlyRole(MINTER_ROLE) whenNotPaused returns (uint256 loanId) {
        require(borrower != address(0), "LoanReceiptNFT: zero borrower");
        require(principal > 0, "LoanReceiptNFT: zero principal");
        require(termDays > 0, "LoanReceiptNFT: zero term");

        loanId = _nextLoanId++;
        uint256 maturityTs = block.timestamp + (termDays * SECONDS_PER_DAY);

        _loans[loanId] = LoanData({
            loanId: loanId,
            productId: productId,
            borrower: borrower,
            principal: principal,
            interestRateBps: interestRateBps,
            startTimestamp: block.timestamp,
            maturityTimestamp: maturityTs,
            amountRepaid: 0,
            status: LoanStatus.Active,
            collateralHash: collateralHash
        });

        _borrowerLoans[borrower].push(loanId);
        _safeMint(borrower, loanId);

        emit LoanOriginated(loanId, borrower, principal, productId);
    }

    function updateLoanStatus(uint256 loanId, LoanStatus status) external override onlyRole(MANAGER_ROLE) {
        require(_exists(loanId), "LoanReceiptNFT: loan does not exist");
        require(_loans[loanId].status != LoanStatus.Repaid, "LoanReceiptNFT: loan already repaid");
        require(_loans[loanId].status != LoanStatus.Liquidated, "LoanReceiptNFT: loan already liquidated");

        _loans[loanId].status = status;
        emit LoanStatusChanged(loanId, status);

        if (status == LoanStatus.Repaid || status == LoanStatus.Liquidated) {
            emit LoanClosed(loanId);
        }
    }

    function recordPayment(uint256 loanId, uint256 amount) external override onlyRole(MANAGER_ROLE) {
        require(_exists(loanId), "LoanReceiptNFT: loan does not exist");
        require(amount > 0, "LoanReceiptNFT: zero payment");

        LoanData storage loan = _loans[loanId];
        require(loan.status == LoanStatus.Active || loan.status == LoanStatus.Repaying, "LoanReceiptNFT: loan not active");

        loan.amountRepaid += amount;

        if (loan.status == LoanStatus.Active) {
            loan.status = LoanStatus.Repaying;
            emit LoanStatusChanged(loanId, LoanStatus.Repaying);
        }

        emit LoanPayment(loanId, msg.sender, amount);
    }

    function getLoan(uint256 loanId) external view override returns (LoanData memory) {
        require(_exists(loanId), "LoanReceiptNFT: loan does not exist");
        return _loans[loanId];
    }

    function getLoansByBorrower(address borrower) external view override returns (uint256[] memory) {
        return _borrowerLoans[borrower];
    }

    function calculateInterestDue(uint256 loanId) public view override returns (uint256) {
        require(_exists(loanId), "LoanReceiptNFT: loan does not exist");
        LoanData memory loan = _loans[loanId];

        uint256 elapsed = block.timestamp - loan.startTimestamp;
        uint256 interest = (loan.principal * loan.interestRateBps * elapsed) / (BASIS_POINTS * SECONDS_PER_YEAR);
        return interest;
    }

    function calculateTotalDue(uint256 loanId) external view override returns (uint256) {
        require(_exists(loanId), "LoanReceiptNFT: loan does not exist");
        LoanData memory loan = _loans[loanId];

        uint256 interest = calculateInterestDue(loanId);
        uint256 totalDue = loan.principal + interest;

        if (loan.amountRepaid >= totalDue) {
            return 0;
        }
        return totalDue - loan.amountRepaid;
    }

    function isOverdue(uint256 loanId) external view returns (bool) {
        require(_exists(loanId), "LoanReceiptNFT: loan does not exist");
        LoanData memory loan = _loans[loanId];
        return block.timestamp > loan.maturityTimestamp && 
               loan.status != LoanStatus.Repaid && 
               loan.status != LoanStatus.Liquidated;
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
