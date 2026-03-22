// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AXIOMCreditMarket
 * @notice Permissioned LP pool for the Axiom Protocol Lending Fund (Task #31).
 *
 * Adapted from Wildcat Protocol V2 patterns:
 *   - LP deposits gated by ERC-3643 IdentityRegistry (accredited investors only)
 *   - Pro-rata LP share accounting via share tokens
 *   - Interest distribution pro-rata to LP shares on each repayment
 *   - Borrower capital committed from pool; disbursed via AXIOMFixedLoan
 *   - Configurable reserve ratio and penalty tiers
 *
 * Integration pattern:
 *   - This contract holds AXUSD liquidity.
 *   - Operator calls commitLiquidity() to reserve funds for a specific loan.
 *   - AXIOMFixedLoan.disburseTranche() pulls from this contract via transferFrom.
 *   - On repayment, AXIOMFixedLoan sends AXUSD back here via distributeRepayment().
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
    IERC20           public axusd;
    IIdentityRegistry public identityRegistry;

    // LP shares: tracks each LP's proportional claim on pool assets.
    // shares are minted 1:1 with AXUSD deposited (initial share price = $1).
    // As interest is received, totalPoolValue grows; share price appreciates.
    mapping(address => uint256) public lpShares;
    uint256 public totalLpShares;
    uint256 public totalDeposited;
    uint256 public totalWithdrawn;

    // Capital committed to specific loans (not yet withdrawn from pool)
    mapping(bytes32 => uint256) public loanCommitment; // loanId => AXUSD amount
    uint256 public totalCommitted;

    // Cumulative interest received from loan repayments
    uint256 public totalInterestReceived;

    // LP-level accrued interest tracking (for per-LP distribution)
    // Each LP earns interest pro-rata to their share of the pool.
    mapping(address => uint256) public lpInterestDebt;  // "interest-per-share" baseline
    uint256 public interestPerShare;  // scaled 1e18: cumulative interest per LP share unit

    // Reserve ratio: minimum fraction of deposits kept liquid (basis points)
    uint256 public reserveRatioBps;

    // ─── Events ───────────────────────────────────────────────────────────────
    event LiquidityDeposited(address indexed lp, uint256 amountUsd, uint256 sharesIssued);
    event LiquidityWithdrawn(address indexed lp, uint256 axusdOut, uint256 sharesBurned);
    event LiquidityCommitted(bytes32 indexed loanId, uint256 amount);
    event RepaymentReceived(bytes32 indexed loanId, uint256 principalReturned, uint256 interestReceived);
    event InterestClaimed(address indexed lp, uint256 amount);
    event ReserveRatioUpdated(uint256 newBps);

    // ─── Errors ───────────────────────────────────────────────────────────────
    error LpNotVerified(address lp);
    error InsufficientLiquidity(uint256 available, uint256 requested);
    error InsufficientShares(uint256 held, uint256 requested);
    error ReserveRatioViolation(uint256 available, uint256 minimum);
    error ZeroAmount();

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(address _axusd, address _identityRegistry) {
        axusd = IERC20(_axusd);
        identityRegistry = IIdentityRegistry(_identityRegistry);
        reserveRatioBps  = 1000; // 10% default reserve ratio
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    // ─── LP Deposit ───────────────────────────────────────────────────────────

    /**
     * @notice Deposit AXUSD into the lending pool.
     *         Caller must be verified in the ERC-3643 IdentityRegistry
     *         (accredited investor gate — Reg-D / Wildcat V2 LP permissioning pattern).
     * @param amountUsd AXUSD amount to deposit (18 decimals)
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

        // Set new LP's interest-per-share baseline to current level (no retroactive interest)
        lpInterestDebt[msg.sender] = interestPerShare;

        axusd.safeTransferFrom(msg.sender, address(this), amountUsd);
        emit LiquidityDeposited(msg.sender, amountUsd, shares);
    }

    /**
     * @notice Withdraw AXUSD by burning LP shares.
     *         Respects reserve ratio: withdrawals that breach reserve are rejected.
     * @param sharesToBurn Number of LP shares to redeem
     */
    function withdrawLiquidity(uint256 sharesToBurn) external nonReentrant {
        if (sharesToBurn == 0) revert ZeroAmount();
        if (lpShares[msg.sender] < sharesToBurn) revert InsufficientShares(lpShares[msg.sender], sharesToBurn);

        _settleInterest(msg.sender);

        // AXUSD owed = sharesToBurn × totalPoolValue / totalLpShares
        uint256 axusdOut = (sharesToBurn * _totalPoolValue()) / totalLpShares;
        uint256 liquid   = _liquidBalance();

        // Enforce reserve ratio on remaining deposits after withdrawal
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
     * @notice Commit pool liquidity to a specific loan (reserves funds for disbursement).
     *         Subsequent disburseTranche() calls on AXIOMFixedLoan will pull from this contract.
     *         Operator must approve AXIOMFixedLoan to spend AXUSD from this contract first.
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
     * @notice Record that committed capital has been disbursed for a loan.
     *         Called after AXIOMFixedLoan.disburseTranche() to update accounting.
     */
    function recordDisbursement(bytes32 loanId, uint256 amountUsd) external onlyRole(OPERATOR_ROLE) {
        require(loanCommitment[loanId] >= amountUsd, "Exceeds commitment");
        loanCommitment[loanId] -= amountUsd;
        totalCommitted         -= amountUsd;
    }

    /**
     * @notice Receive a repayment from AXIOMFixedLoan and distribute interest pro-rata.
     *         Called by operator after loan repayment is processed.
     *         The AXUSD must be transferred to this contract separately (via borrower → fixedLoan → here).
     * @param loanId           Loan identifier (informational)
     * @param principalReturned AXUSD principal amount returned
     * @param interestAmount   AXUSD interest earned on this repayment
     */
    function distributeRepayment(
        bytes32 loanId,
        uint256 principalReturned,
        uint256 interestAmount
    ) external onlyRole(OPERATOR_ROLE) nonReentrant {
        uint256 total = principalReturned + interestAmount;
        if (total == 0) return;

        axusd.safeTransferFrom(msg.sender, address(this), total);

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
        // Interest owed is tracked in lpInterestDebt after settlement
        // (settlement sets debt to current level; owed amount transferred in _settleInterest)
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
        if (totalLpShares == 0) return 1e18;
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
        // Pool value = AXUSD on hand + interest accrued on outstanding loans (approximated as on-hand)
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
