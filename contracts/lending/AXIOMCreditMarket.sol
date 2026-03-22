// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AXIOMCreditMarket
 * @notice Permissioned LP pool for the Axiom Protocol Lending Fund (Task #31).
 *
 * Adapted from Wildcat Protocol V2 patterns:
 *   - LP deposits gated by ERC-3643 IdentityRegistry (accredited investors only)
 *   - Pro-rata LP share accounting via interestPerShare (compounding model)
 *   - Interest distribution pro-rata to LP shares on each repayment
 *   - Borrower capital committed from pool; disbursed from here to borrower via FixedLoan
 *   - Configurable reserve ratio
 *
 * Integration flow:
 *   1. Operator calls commitLiquidity(loanId, amount) — marks pool funds for a loan
 *   2. Operator calls disburseLoan(loanId, borrower, trancheAmount) — sends AXUSD to borrower
 *      (CreditMarket holds the funds; FixedLoan authorizes disbursement via OPERATOR_ROLE)
 *   3. Borrower calls AXIOMFixedLoan.repayLoan() — AXUSD goes to FixedLoan
 *   4. FixedLoan calls this.receiveRepayment(loanId, principal, interest) — routes funds here
 *   5. LPs call claimInterest() — withdraw accrued interest
 *
 * FixedLoan address is set post-deploy via setFixedLoan() (admin only).
 * Only the registered FixedLoan contract can call receiveRepayment().
 */

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IIdentityRegistry {
    function isVerified(address _userAddress) external view returns (bool);
}

contract AXIOMCreditMarket is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Roles ───────────────────────────────────────────────────────────────
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // ─── Storage ──────────────────────────────────────────────────────────────
    IERC20            public axusd;
    IIdentityRegistry public identityRegistry;

    // Registered FixedLoan contract — only it may call receiveRepayment()
    address public fixedLoan;

    // LP shares: tracks each LP's proportional claim on pool assets.
    // Shares issued 1:1 with AXUSD on first deposit; price appreciates with interest.
    mapping(address => uint256) public lpShares;
    uint256 public totalLpShares;
    uint256 public totalDeposited;
    uint256 public totalWithdrawn;

    // Capital committed to specific loans (reserve from available liquidity)
    mapping(bytes32 => uint256) public loanCommitment; // loanId => AXUSD amount
    uint256 public totalCommitted;

    // Cumulative interest received from loan repayments
    uint256 public totalInterestReceived;

    // Per-LP interest accounting (scaled 1e18 per share unit)
    mapping(address => uint256) public lpInterestDebt;
    uint256 public interestPerShare;

    // Reserve ratio: minimum fraction of deposits kept liquid (basis points)
    uint256 public reserveRatioBps;

    // ─── Events ───────────────────────────────────────────────────────────────
    event LiquidityDeposited(address indexed lp, uint256 amountUsd, uint256 sharesIssued);
    event LiquidityWithdrawn(address indexed lp, uint256 axusdOut, uint256 sharesBurned);
    event LiquidityCommitted(bytes32 indexed loanId, uint256 amount);
    event LoanDisbursed(bytes32 indexed loanId, address indexed borrower, uint256 amount);
    event RepaymentReceived(bytes32 indexed loanId, uint256 principalReturned, uint256 interestReceived);
    event InterestClaimed(address indexed lp, uint256 amount);
    event ReserveRatioUpdated(uint256 newBps);
    event FixedLoanSet(address indexed fixedLoan);

    // ─── Errors ───────────────────────────────────────────────────────────────
    error LpNotVerified(address lp);
    error InsufficientLiquidity(uint256 available, uint256 requested);
    error InsufficientShares(uint256 held, uint256 requested);
    error ReserveRatioViolation(uint256 available, uint256 minimum);
    error ZeroAmount();
    error OnlyFixedLoan();

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(address _axusd, address _identityRegistry) {
        axusd = IERC20(_axusd);
        identityRegistry = IIdentityRegistry(_identityRegistry);
        reserveRatioBps  = 1000; // 10% default reserve ratio
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    // ─── Admin: register FixedLoan contract ───────────────────────────────────

    /**
     * @notice Register the AXIOMFixedLoan contract address.
     *         Only this address may call receiveRepayment().
     */
    function setFixedLoan(address _fixedLoan) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_fixedLoan != address(0), "Zero address");
        fixedLoan = _fixedLoan;
        emit FixedLoanSet(_fixedLoan);
    }

    // ─── LP Deposit ───────────────────────────────────────────────────────────

    /**
     * @notice Deposit AXUSD into the lending pool.
     *         Caller must be verified in the ERC-3643 IdentityRegistry
     *         (accredited investor gate — Reg-D / Wildcat V2 LP permissioning pattern).
     * @param amountUsd AXUSD amount to deposit (6 decimals, matching AXUSD decimals)
     */
    function depositLiquidity(uint256 amountUsd) external nonReentrant {
        if (amountUsd == 0) revert ZeroAmount();
        if (!identityRegistry.isVerified(msg.sender)) revert LpNotVerified(msg.sender);

        // Settle any pending interest before recalculating shares
        _settleInterest(msg.sender);

        // Share issuance: new shares = deposit × totalLpShares / totalPoolValue
        // First deposit: 1:1 share issuance
        uint256 shares;
        uint256 poolValue = _totalPoolValue();
        if (totalLpShares == 0 || poolValue == 0) {
            shares = amountUsd;
        } else {
            shares = (amountUsd * totalLpShares) / poolValue;
        }

        lpShares[msg.sender] += shares;
        totalLpShares        += shares;
        totalDeposited       += amountUsd;
        lpInterestDebt[msg.sender] = interestPerShare;

        axusd.safeTransferFrom(msg.sender, address(this), amountUsd);
        emit LiquidityDeposited(msg.sender, amountUsd, shares);
    }

    /**
     * @notice Withdraw AXUSD by burning LP shares. Respects reserve ratio.
     * @param sharesToBurn Number of LP shares to redeem
     */
    function withdrawLiquidity(uint256 sharesToBurn) external nonReentrant {
        if (sharesToBurn == 0) revert ZeroAmount();
        if (lpShares[msg.sender] < sharesToBurn) revert InsufficientShares(lpShares[msg.sender], sharesToBurn);

        _settleInterest(msg.sender);

        uint256 axusdOut = (sharesToBurn * _totalPoolValue()) / totalLpShares;
        uint256 liquid   = _liquidBalance();

        uint256 remainingDeposits = totalDeposited > axusdOut ? totalDeposited - axusdOut : 0;
        uint256 minReserve        = (remainingDeposits * reserveRatioBps) / 10000;
        uint256 availableAfter    = liquid > axusdOut ? liquid - axusdOut : 0;
        if (availableAfter < minReserve) revert ReserveRatioViolation(liquid, minReserve + axusdOut);

        lpShares[msg.sender] -= sharesToBurn;
        totalLpShares        -= sharesToBurn;
        totalWithdrawn       += axusdOut;

        axusd.safeTransfer(msg.sender, axusdOut);
        emit LiquidityWithdrawn(msg.sender, axusdOut, sharesToBurn);
    }

    // ─── Operator: Capital management ─────────────────────────────────────────

    /**
     * @notice Reserve pool liquidity for a specific loan.
     *         After committing, call disburseLoan() to send funds to borrower.
     */
    function commitLiquidity(bytes32 loanId, uint256 amountUsd) external onlyRole(OPERATOR_ROLE) {
        if (amountUsd == 0) revert ZeroAmount();
        uint256 liquid = _liquidBalance();
        if (liquid < amountUsd) revert InsufficientLiquidity(liquid, amountUsd);

        loanCommitment[loanId] += amountUsd;
        totalCommitted         += amountUsd;
        emit LiquidityCommitted(loanId, amountUsd);
    }

    /**
     * @notice Disburse committed capital to borrower for a specific loan.
     *         Called by operator after AXIOMFixedLoan.disburseTranche() is authorized.
     *         This contract holds the AXUSD and sends it directly to the borrower.
     * @param loanId   Loan identifier
     * @param borrower Borrower address to receive funds
     * @param amount   AXUSD amount to disburse (must be <= commitment)
     */
    function disburseLoan(
        bytes32 loanId,
        address borrower,
        uint256 amount
    ) external onlyRole(OPERATOR_ROLE) nonReentrant {
        require(loanCommitment[loanId] >= amount, "Exceeds commitment");
        require(borrower != address(0), "Zero borrower");

        loanCommitment[loanId] -= amount;
        totalCommitted         -= amount;

        axusd.safeTransfer(borrower, amount);
        emit LoanDisbursed(loanId, borrower, amount);
    }

    /**
     * @notice Receive a repayment notification from AXIOMFixedLoan and update LP accounting.
     *         ONLY callable by the registered fixedLoan contract.
     *         AXUSD has already been transferred to this contract by FixedLoan prior to this call.
     *         This function ONLY updates accounting — no token transfer occurs here.
     * @param loanId            Loan identifier (for event tracking)
     * @param principalReturned AXUSD principal amount returned (already in this contract's balance)
     * @param interestAmount    AXUSD interest earned on this repayment (already in balance)
     */
    function receiveRepayment(
        bytes32 loanId,
        uint256 principalReturned,
        uint256 interestAmount
    ) external nonReentrant {
        if (msg.sender != fixedLoan) revert OnlyFixedLoan();

        totalInterestReceived += interestAmount;

        // Update interest-per-share: each existing LP share earns proportional interest
        if (totalLpShares > 0 && interestAmount > 0) {
            interestPerShare += (interestAmount * 1e18) / totalLpShares;
        }

        emit RepaymentReceived(loanId, principalReturned, interestAmount);
    }

    /**
     * @notice LP claims their accrued interest.
     */
    function claimInterest() external nonReentrant {
        _settleInterest(msg.sender);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setReserveRatio(uint256 newBps) external onlyRole(OPERATOR_ROLE) {
        require(newBps <= 5000, "Max 50% reserve");
        reserveRatioBps = newBps;
        emit ReserveRatioUpdated(newBps);
    }

    // ─── View functions ───────────────────────────────────────────────────────

    function availableLiquidity() external view returns (uint256) {
        return _liquidBalance();
    }

    function totalPoolValue() external view returns (uint256) {
        return _totalPoolValue();
    }

    function sharePrice() external view returns (uint256) {
        if (totalLpShares == 0) return 1e6; // 1 AXUSD (6 decimals)
        return (_totalPoolValue() * 1e18) / totalLpShares;
    }

    /**
     * @notice Accrued interest available to LP (not yet claimed).
     */
    function pendingInterest(address lp) external view returns (uint256) {
        if (lpShares[lp] == 0) return 0;
        uint256 owed = (lpShares[lp] * (interestPerShare - lpInterestDebt[lp])) / 1e18;
        return owed;
    }

    function isLpVerified(address lp) external view returns (bool) {
        return identityRegistry.isVerified(lp);
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _liquidBalance() internal view returns (uint256) {
        return axusd.balanceOf(address(this));
    }

    function _totalPoolValue() internal view returns (uint256) {
        return _liquidBalance();
    }

    function _settleInterest(address lp) internal {
        if (lpShares[lp] == 0) {
            lpInterestDebt[lp] = interestPerShare;
            return;
        }
        uint256 owed = (lpShares[lp] * (interestPerShare - lpInterestDebt[lp])) / 1e18;
        lpInterestDebt[lp] = interestPerShare;
        if (owed > 0) {
            uint256 liquid = _liquidBalance();
            uint256 transfer = owed > liquid ? liquid : owed;
            if (transfer > 0) {
                axusd.safeTransfer(lp, transfer);
                emit InterestClaimed(lp, transfer);
            }
        }
    }
}
