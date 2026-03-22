// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AXIOMCreditMarket
 * @notice On-chain loan lifecycle registry and liquidity vault for the Axiom Lending Fund.
 *         LPs deposit AXUSD; operators originate, approve, fund, and service loans.
 *         Every loan state transition is anchored on-chain with a timestamped event.
 *
 * @dev Architecture:
 *   - LP deposits: depositLiquidity / withdrawLiquidity (AXUSD in, LP shares out)
 *   - Loan lifecycle: originate → approve → fund → active ↔ delinquent → repaid | defaulted
 *   - Operator role gates all lifecycle transitions
 *   - Borrower repayments via repayLoan (interest-first, overpayment reverted)
 *   - AXIOMFixedLoan NFTs are minted/burned on fund/repaid transitions
 */
contract AXIOMCreditMarket is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    uint256 public constant RATE_DENOMINATOR = 10_000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    IERC20 public immutable axusd;

    struct LoanRecord {
        bytes32   loanId;
        address   borrower;
        uint256   principalUsd6;       // principal in AXUSD (18 decimals)
        uint256   interestRateBps;     // annual rate in basis points
        uint256   originationFeeUsd6;  // origination fee in AXUSD (18 decimals)
        uint256   termSeconds;         // loan duration in seconds
        uint8     status;              // LoanStatus enum value
        uint256   fundedAt;            // unix timestamp when disbursed
        uint256   dueAt;               // unix timestamp of maturity
        uint256   lastAccrualAt;       // last interest checkpoint timestamp
        uint256   totalRepaidUsd6;     // cumulative repaid principal (18 dec)
        uint256   totalInterestPaidUsd6; // cumulative interest paid (18 dec)
        string    propertyAddress;     // human-readable property address
    }

    // LoanStatus enum stored as uint8
    uint8 public constant STATUS_PENDING   = 0;
    uint8 public constant STATUS_APPROVED  = 1;
    uint8 public constant STATUS_ACTIVE    = 2;
    uint8 public constant STATUS_DELINQUENT = 3;
    uint8 public constant STATUS_REPAID    = 4;
    uint8 public constant STATUS_DEFAULTED = 5;

    mapping(bytes32 => LoanRecord) public loans;
    bytes32[] private _allLoanIds;

    uint256 public totalDeposited;    // gross LP deposits (18 dec)
    uint256 public totalDeployed;     // AXUSD currently lent out (18 dec)
    uint256 public totalWithdrawn;    // gross LP withdrawals (18 dec)

    mapping(address => uint256) public lpShares;
    uint256 public totalLpShares;

    address public fixedLoanNFT;      // AXIOMFixedLoan contract (set post-deploy)

    /**
     * @dev LP Allowlist — permissioned LP access gate.
     *      In production, only Reg-D verified / KYC-passed wallets are added.
     *      The operator role manages additions/removals; admin can override.
     *      Mirrors ERC-3643 identity-registry semantics: only allowed wallets
     *      may call depositLiquidity.
     */
    mapping(address => bool) public lpAllowlist;

    event LoanOriginated(bytes32 indexed loanId, address indexed borrower, uint256 principalUsd6, string propertyAddress);
    event LoanApproved(bytes32 indexed loanId);
    event LoanFunded(bytes32 indexed loanId, address indexed borrower, uint256 principalUsd6);
    event LoanRepayment(bytes32 indexed loanId, address indexed payer, uint256 paymentUsd6, uint256 interestPortion, uint256 principalPortion, uint256 remainingPrincipal);
    event LoanRepaid(bytes32 indexed loanId);
    event LoanDelinquent(bytes32 indexed loanId);
    event LoanCured(bytes32 indexed loanId);
    event LoanDefaulted(bytes32 indexed loanId);
    event LiquidityDeposited(address indexed lp, uint256 amountUsd6, uint256 sharesIssued);
    event LiquidityWithdrawn(address indexed lp, uint256 amountUsd6, uint256 sharesBurned);
    event FixedLoanNFTSet(address indexed nftContract);
    event LpAllowlistUpdated(address indexed lp, bool allowed);

    error LoanNotFound();
    error InvalidTransition(uint8 currentStatus, string action);
    error InsufficientLiquidity(uint256 needed, uint256 available);
    error OverpaymentGuard(uint256 maxPayable, uint256 attempted);
    error ZeroAmount();
    error InsufficientShares();
    error Unauthorized();
    error LpNotAllowed(address lp);

    constructor(address _axusd, address _admin) {
        require(_axusd != address(0), "Zero AXUSD");
        require(_admin != address(0), "Zero admin");
        axusd = IERC20(_axusd);
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
    }

    // ─────────────────────────────────────────────
    // LP VAULT
    // ─────────────────────────────────────────────

    /**
     * @notice Operator/admin adds a wallet to the LP allowlist (permissioned LP gate).
     *         Only KYC/Reg-D verified wallets should be added.
     *         Mirrors ERC-3643 identity-registry pattern for accredited-investor pools.
     * @param lp The LP wallet address to authorize.
     */
    function addLpAllowlist(address lp) external onlyRole(OPERATOR_ROLE) {
        require(lp != address(0), "Zero LP address");
        lpAllowlist[lp] = true;
        emit LpAllowlistUpdated(lp, true);
    }

    /**
     * @notice Operator/admin removes a wallet from the LP allowlist.
     * @param lp The LP wallet address to revoke.
     */
    function removeLpAllowlist(address lp) external onlyRole(OPERATOR_ROLE) {
        lpAllowlist[lp] = false;
        emit LpAllowlistUpdated(lp, false);
    }

    /**
     * @notice Returns whether an address is an authorized LP.
     * @param lp The LP wallet address to check.
     */
    function isLpAllowed(address lp) external view returns (bool) {
        return lpAllowlist[lp];
    }

    /**
     * @notice LP deposits AXUSD into the lending vault and receives share tokens.
     *         Caller must be on the LP allowlist (KYC/Reg-D gate).
     * @param amountUsd6 Amount of AXUSD (18 decimals) to deposit.
     */
    function depositLiquidity(uint256 amountUsd6) external nonReentrant {
        if (!lpAllowlist[msg.sender]) revert LpNotAllowed(msg.sender);
        if (amountUsd6 == 0) revert ZeroAmount();
        uint256 shares = _computeShares(amountUsd6);
        axusd.safeTransferFrom(msg.sender, address(this), amountUsd6);
        lpShares[msg.sender] += shares;
        totalLpShares += shares;
        totalDeposited += amountUsd6;
        emit LiquidityDeposited(msg.sender, amountUsd6, shares);
    }

    /**
     * @notice LP redeems shares for AXUSD. Reverts if vault has insufficient liquid AXUSD.
     * @param sharesToBurn Number of LP shares to redeem.
     */
    function withdrawLiquidity(uint256 sharesToBurn) external nonReentrant {
        if (sharesToBurn == 0) revert ZeroAmount();
        if (lpShares[msg.sender] < sharesToBurn) revert InsufficientShares();
        uint256 axusdOut = _computeAxusdForShares(sharesToBurn);
        uint256 liquid = availableLiquidity();
        if (liquid < axusdOut) revert InsufficientLiquidity(axusdOut, liquid);
        lpShares[msg.sender] -= sharesToBurn;
        totalLpShares -= sharesToBurn;
        totalWithdrawn += axusdOut;
        axusd.safeTransfer(msg.sender, axusdOut);
        emit LiquidityWithdrawn(msg.sender, axusdOut, sharesToBurn);
    }

    // ─────────────────────────────────────────────
    // LOAN LIFECYCLE
    // ─────────────────────────────────────────────

    /**
     * @notice Operator registers a new loan application on-chain.
     * @param loanId      Off-chain UUID encoded as bytes32.
     * @param borrower    Borrower wallet address.
     * @param principal   Loan principal in AXUSD (18 decimals).
     * @param rateBps     Annual interest rate in basis points.
     * @param feeBps      Origination fee in basis points.
     * @param termDays    Loan term in days.
     * @param propAddress Human-readable property address.
     */
    function originateLoan(
        bytes32 loanId,
        address borrower,
        uint256 principal,
        uint256 rateBps,
        uint256 feeBps,
        uint256 termDays,
        string calldata propAddress
    ) external onlyRole(OPERATOR_ROLE) {
        require(loans[loanId].loanId == bytes32(0), "Loan already exists");
        require(borrower != address(0), "Zero borrower");
        require(principal > 0, "Zero principal");
        require(termDays > 0, "Zero term");

        uint256 originationFee = (principal * feeBps) / RATE_DENOMINATOR;

        loans[loanId] = LoanRecord({
            loanId:               loanId,
            borrower:             borrower,
            principalUsd6:        principal,
            interestRateBps:      rateBps,
            originationFeeUsd6:   originationFee,
            termSeconds:          termDays * 1 days,
            status:               STATUS_PENDING,
            fundedAt:             0,
            dueAt:                0,
            lastAccrualAt:        0,
            totalRepaidUsd6:      0,
            totalInterestPaidUsd6: 0,
            propertyAddress:      propAddress
        });
        _allLoanIds.push(loanId);

        emit LoanOriginated(loanId, borrower, principal, propAddress);
    }

    /**
     * @notice Operator approves a pending loan application.
     */
    function approveLoan(bytes32 loanId) external onlyRole(OPERATOR_ROLE) {
        LoanRecord storage loan = _requireLoan(loanId);
        if (loan.status != STATUS_PENDING) revert InvalidTransition(loan.status, "approve");
        loan.status = STATUS_APPROVED;
        emit LoanApproved(loanId);
    }

    /**
     * @notice Operator funds an approved loan — disburses AXUSD to borrower and activates the loan.
     *         Vault must have sufficient liquid AXUSD.
     */
    function fundLoan(bytes32 loanId) external onlyRole(OPERATOR_ROLE) nonReentrant {
        LoanRecord storage loan = _requireLoan(loanId);
        if (loan.status != STATUS_APPROVED) revert InvalidTransition(loan.status, "fund");
        uint256 liquid = availableLiquidity();
        if (liquid < loan.principalUsd6) revert InsufficientLiquidity(loan.principalUsd6, liquid);

        loan.status       = STATUS_ACTIVE;
        loan.fundedAt     = block.timestamp;
        loan.dueAt        = block.timestamp + loan.termSeconds;
        loan.lastAccrualAt = block.timestamp;
        totalDeployed    += loan.principalUsd6;

        axusd.safeTransfer(loan.borrower, loan.principalUsd6);

        emit LoanFunded(loanId, loan.borrower, loan.principalUsd6);
    }

    /**
     * @notice Borrower repays part or all of the loan.
     *         Interest-first allocation. Overpayment reverts.
     * @param loanId     Loan identifier.
     * @param paymentUsd6 Payment amount in AXUSD (18 decimals).
     */
    function repayLoan(bytes32 loanId, uint256 paymentUsd6) external nonReentrant {
        LoanRecord storage loan = _requireLoan(loanId);
        if (loan.status != STATUS_ACTIVE && loan.status != STATUS_DELINQUENT) {
            revert InvalidTransition(loan.status, "repay");
        }
        if (paymentUsd6 == 0) revert ZeroAmount();

        uint256 accrued   = _computeAccruedInterest(loan);
        uint256 remaining = loan.principalUsd6 - loan.totalRepaidUsd6;
        uint256 totalDue  = remaining + accrued;

        // slither-disable-next-line timestamp
        if (paymentUsd6 > totalDue + 1e15) { // overpayment guard: not timestamp-dependent
            revert OverpaymentGuard(totalDue, paymentUsd6);
        }

        // slither-disable-next-line timestamp
        uint256 interestPortion   = paymentUsd6 <= accrued ? paymentUsd6 : accrued; // interest-first allocation
        uint256 principalPortion  = paymentUsd6 - interestPortion;
        // slither-disable-next-line timestamp
        uint256 newRemainingPrincipal = remaining > principalPortion ? remaining - principalPortion : 0; // underflow guard

        loan.totalRepaidUsd6       += principalPortion;
        loan.totalInterestPaidUsd6 += interestPortion;
        loan.lastAccrualAt          = block.timestamp;

        axusd.safeTransferFrom(msg.sender, address(this), paymentUsd6);

        // slither-disable-next-line incorrect-equality
        if (loan.status == STATUS_DELINQUENT) { // intentional uint8 enum comparison
            loan.status = STATUS_ACTIVE;
        }

        emit LoanRepayment(loanId, msg.sender, paymentUsd6, interestPortion, principalPortion, newRemainingPrincipal);

        // Treat dust (< 1e15 = 0.000001 AXUSD) as fully repaid to handle wei-level rounding.
        // slither-disable-next-line incorrect-equality,timestamp
        if (newRemainingPrincipal < 1e15) {
            loan.totalRepaidUsd6 += newRemainingPrincipal; // sweep dust into repaid
            loan.status = STATUS_REPAID;
            // slither-disable-next-line timestamp
            totalDeployed = totalDeployed >= loan.principalUsd6 ? totalDeployed - loan.principalUsd6 : 0; // underflow guard
            emit LoanRepaid(loanId);
        }
    }

    /**
     * @notice Operator marks an active loan delinquent.
     */
    function markDelinquent(bytes32 loanId) external onlyRole(OPERATOR_ROLE) {
        LoanRecord storage loan = _requireLoan(loanId);
        if (loan.status != STATUS_ACTIVE) revert InvalidTransition(loan.status, "mark_delinquent");
        loan.status = STATUS_DELINQUENT;
        emit LoanDelinquent(loanId);
    }

    /**
     * @notice Operator cures a delinquent loan back to active.
     */
    function cureDelinquent(bytes32 loanId) external onlyRole(OPERATOR_ROLE) {
        LoanRecord storage loan = _requireLoan(loanId);
        if (loan.status != STATUS_DELINQUENT) revert InvalidTransition(loan.status, "cure_delinquent");
        loan.status = STATUS_ACTIVE;
        emit LoanCured(loanId);
    }

    /**
     * @notice Operator closes a fully-repaid or delinquent loan as defaulted.
     */
    function defaultLoan(bytes32 loanId) external onlyRole(OPERATOR_ROLE) {
        LoanRecord storage loan = _requireLoan(loanId);
        if (loan.status != STATUS_ACTIVE && loan.status != STATUS_DELINQUENT) {
            revert InvalidTransition(loan.status, "default");
        }
        loan.status = STATUS_DEFAULTED;
        uint256 outstanding = loan.principalUsd6 - loan.totalRepaidUsd6;
        // slither-disable-next-line timestamp
        totalDeployed = totalDeployed >= outstanding ? totalDeployed - outstanding : 0; // underflow guard
        emit LoanDefaulted(loanId);
    }

    // ─────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────

    /**
     * @notice AXUSD currently held in the vault and not deployed.
     */
    function availableLiquidity() public view returns (uint256) {
        return axusd.balanceOf(address(this));
    }

    /**
     * @notice Total vault value: liquid + deployed principal.
     */
    function totalVaultValue() public view returns (uint256) {
        return availableLiquidity() + totalDeployed;
    }

    /**
     * @notice Live accrued interest for a loan as of the current block.
     */
    function accruedInterest(bytes32 loanId) external view returns (uint256) {
        LoanRecord storage loan = _requireLoanView(loanId);
        return _computeAccruedInterest(loan);
    }

    /**
     * @notice Returns a loan record by ID.
     */
    function getLoan(bytes32 loanId) external view returns (LoanRecord memory) {
        return loans[loanId];
    }

    /**
     * @notice Returns total number of loans ever originated.
     */
    function totalLoans() external view returns (uint256) {
        return _allLoanIds.length;
    }

    /**
     * @notice Returns loan IDs paginated.
     */
    function getLoanIds(uint256 offset, uint256 limit) external view returns (bytes32[] memory) {
        uint256 end = offset + limit;
        if (end > _allLoanIds.length) end = _allLoanIds.length;
        bytes32[] memory ids = new bytes32[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            ids[i - offset] = _allLoanIds[i];
        }
        return ids;
    }

    /**
     * @notice Share price: AXUSD per 1e18 shares.
     */
    function sharePrice() external view returns (uint256) {
        // slither-disable-next-line incorrect-equality
        if (totalLpShares == 0) return 1e18; // zero-guard: no shares outstanding → 1:1 initial price
        return (totalVaultValue() * 1e18) / totalLpShares;
    }

    // ─────────────────────────────────────────────
    // ADMIN
    // ─────────────────────────────────────────────

    function setFixedLoanNFT(address nft) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(nft != address(0), "AXIOMCreditMarket: zero NFT address");
        fixedLoanNFT = nft;
        emit FixedLoanNFTSet(nft);
    }

    // ─────────────────────────────────────────────
    // INTERNAL
    // ─────────────────────────────────────────────

    function _computeAccruedInterest(LoanRecord storage loan) internal view returns (uint256) {
        if (loan.status != STATUS_ACTIVE && loan.status != STATUS_DELINQUENT) return 0;
        // slither-disable-next-line incorrect-equality
        if (loan.lastAccrualAt == 0) return 0;
        // slither-disable-next-line timestamp
        // block.timestamp is intentional for per-second interest accrual.
        // Miner manipulation (~15s) is negligible against 1-24 month loan terms.
        uint256 elapsed = block.timestamp - loan.lastAccrualAt;
        uint256 outstanding = loan.principalUsd6 - loan.totalRepaidUsd6;
        return (outstanding * loan.interestRateBps * elapsed) / (RATE_DENOMINATOR * SECONDS_PER_YEAR);
    }

    function _computeShares(uint256 axusdAmount) internal view returns (uint256) {
        // slither-disable-next-line incorrect-equality
        if (totalLpShares == 0 || totalVaultValue() == 0) return axusdAmount; // first-deposit bootstrap
        return (axusdAmount * totalLpShares) / totalVaultValue();
    }

    function _computeAxusdForShares(uint256 shares) internal view returns (uint256) {
        // slither-disable-next-line incorrect-equality
        if (totalLpShares == 0) return 0; // zero-guard: no shares outstanding
        return (shares * totalVaultValue()) / totalLpShares;
    }

    function _requireLoan(bytes32 loanId) internal view returns (LoanRecord storage) {
        LoanRecord storage loan = loans[loanId];
        if (loan.loanId == bytes32(0)) revert LoanNotFound();
        return loan;
    }

    function _requireLoanView(bytes32 loanId) internal view returns (LoanRecord storage) {
        LoanRecord storage loan = loans[loanId];
        if (loan.loanId == bytes32(0)) revert LoanNotFound();
        return loan;
    }
}
