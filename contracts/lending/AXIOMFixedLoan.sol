// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AXIOMFixedLoan
 * @notice Fixed-term loan engine for the Axiom Protocol Lending Fund (Task #31).
 *
 * Adapted from Maple Finance `fixed-term-loan` patterns:
 *   - Configurable draw-down schedule (up to 3 tranches)
 *   - Two payment modes: AMORTIZED or INTEREST_ONLY
 *   - Prepayment math: flat penalty on remaining principal
 *   - Four states: Pending / Approved / Active / Delinquent / Defaulted / Repaid
 *   - Configurable grace period (seconds) before delinquency
 *
 * Loan Creation: OPERATOR_ROLE gated.
 * Repayments: called by borrower directly (msg.sender = borrower).
 *
 * Interest accrual: per-second simple interest on drawn principal.
 *   accrued = principal × rateBps × elapsed / (365 days × 10000)
 *
 * Draw schedule: up to 3 tranches, each with an earliest-release timestamp.
 *   trancheAmts[0]: first draw (releases immediately = releaseAt of 0).
 *   Single-disbursement loans use numTranches = 1.
 */

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IAxiomIdentityRegistry {
    function isVerified(address _userAddress) external view returns (bool);
}

contract AXIOMFixedLoan is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Roles ───────────────────────────────────────────────────────────────
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // ─── Payment modes ────────────────────────────────────────────────────────
    uint8 public constant MODE_AMORTIZED     = 0;
    uint8 public constant MODE_INTEREST_ONLY = 1;

    // ─── Loan states ──────────────────────────────────────────────────────────
    uint8 public constant STATE_PENDING    = 0;
    uint8 public constant STATE_APPROVED   = 1;
    uint8 public constant STATE_ACTIVE     = 2;
    uint8 public constant STATE_DELINQUENT = 3;
    uint8 public constant STATE_DEFAULTED  = 4;
    uint8 public constant STATE_REPAID     = 5;

    // ─── Draw tranche ─────────────────────────────────────────────────────────
    struct DrawTranche {
        uint256 amount;      // AXUSD wei
        uint256 releaseAt;   // earliest disbursement timestamp
        bool    drawn;
    }

    // ─── Loan record ──────────────────────────────────────────────────────────
    struct LoanRecord {
        bytes32  loanId;
        address  borrower;
        uint8    paymentMode;
        uint256  interestRateBps;
        uint256  prepayPenaltyBps;
        uint256  gracePeriodSeconds;
        uint256  termSeconds;
        uint256  startedAt;
        uint256  dueAt;
        uint8    state;
        uint256  totalPrincipal;
        uint256  drawnPrincipal;
        uint256  outstandingPrincipal;
        uint256  lastAccrualAt;
        uint256  totalInterestPaid;
        uint256  totalPrincipalPaid;
        uint8    numTranches;
        DrawTranche tranche0;
        DrawTranche tranche1;
        DrawTranche tranche2;
        string   propertyAddress;
    }

    // ─── Storage ──────────────────────────────────────────────────────────────
    IERC20 public axusd;
    IAxiomIdentityRegistry public identityRegistry;

    mapping(bytes32 => LoanRecord) private _loans;
    bytes32[] public allLoanIds;

    // ─── Events ───────────────────────────────────────────────────────────────
    event LoanOriginated(bytes32 indexed loanId, address indexed borrower, uint256 totalPrincipal, string propertyAddress);
    event LoanApproved(bytes32 indexed loanId);
    event DrawDisbursed(bytes32 indexed loanId, uint8 trancheIndex, uint256 amount);
    event LoanPayment(bytes32 indexed loanId, address indexed payer, uint256 paymentAmount, uint256 interestPortion, uint256 principalPortion, uint256 remainingPrincipal);
    event LoanPrepaid(bytes32 indexed loanId, uint256 penaltyAmount);
    event LoanDelinquent(bytes32 indexed loanId);
    event LoanCured(bytes32 indexed loanId);
    event LoanDefaulted(bytes32 indexed loanId);
    event LoanRepaid(bytes32 indexed loanId);
    event LoanAdminClosed(bytes32 indexed loanId);

    // ─── Errors ───────────────────────────────────────────────────────────────
    error LoanNotFound(bytes32 loanId);
    error InvalidState(uint8 current, string expected);
    error TrancheAlreadyDrawn(uint8 index);
    error TrancheNotReleased(uint8 index, uint256 releaseAt);
    error InvalidTranche(uint8 index);
    error Overpayment(uint256 maxDue, uint256 attempted);
    error NotAuthorized(address caller);

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(address _axusd, address _identityRegistry) {
        axusd = IERC20(_axusd);
        identityRegistry = IAxiomIdentityRegistry(_identityRegistry);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    // ─── Operator: Originate ──────────────────────────────────────────────────

    /**
     * @notice Originate a fixed-term loan.
     * @param tranchAmts   Array of draw amounts (1-3 elements)
     * @param tranchRelease Earliest timestamp each tranche can be disbursed (0 = immediate)
     */
    function originateLoan(
        bytes32 loanId,
        address borrower,
        uint8   paymentMode,
        uint256 rateBps,
        uint256 prepayBps,
        uint256 graceSecs,
        uint256 termSecs,
        string calldata propAddress,
        uint256[] calldata tranchAmts,
        uint256[] calldata tranchRelease
    ) external onlyRole(OPERATOR_ROLE) {
        require(_loans[loanId].loanId == bytes32(0), "Loan exists");
        require(tranchAmts.length >= 1 && tranchAmts.length <= 3, "1-3 tranches");
        require(tranchAmts.length == tranchRelease.length, "Mismatched tranche arrays");
        require(paymentMode <= MODE_INTEREST_ONLY, "Invalid payment mode");

        uint256 total = 0;
        for (uint8 i = 0; i < tranchAmts.length; i++) {
            total += tranchAmts[i];
        }
        require(total > 0, "Zero principal");

        LoanRecord storage loan = _loans[loanId];
        loan.loanId             = loanId;
        loan.borrower           = borrower;
        loan.paymentMode        = paymentMode;
        loan.interestRateBps    = rateBps;
        loan.prepayPenaltyBps   = prepayBps;
        loan.gracePeriodSeconds = graceSecs;
        loan.termSeconds        = termSecs;
        loan.state              = STATE_PENDING;
        loan.totalPrincipal     = total;
        loan.numTranches        = uint8(tranchAmts.length);
        loan.propertyAddress    = propAddress;

        // Assign tranches (up to 3, flatten into named fields to avoid nested array issues)
        if (tranchAmts.length >= 1) loan.tranche0 = DrawTranche(tranchAmts[0], tranchRelease[0], false);
        if (tranchAmts.length >= 2) loan.tranche1 = DrawTranche(tranchAmts[1], tranchRelease[1], false);
        if (tranchAmts.length >= 3) loan.tranche2 = DrawTranche(tranchAmts[2], tranchRelease[2], false);

        allLoanIds.push(loanId);
        emit LoanOriginated(loanId, borrower, total, propAddress);
    }

    function approveLoan(bytes32 loanId) external onlyRole(OPERATOR_ROLE) {
        LoanRecord storage loan = _requireLoan(loanId);
        if (loan.state != STATE_PENDING) revert InvalidState(loan.state, "PENDING");
        loan.state = STATE_APPROVED;
        emit LoanApproved(loanId);
    }

    /**
     * @notice Disburse a tranche. Contract must hold enough AXUSD first.
     */
    function disburseTranche(bytes32 loanId, uint8 ti) external onlyRole(OPERATOR_ROLE) nonReentrant {
        LoanRecord storage loan = _requireLoan(loanId);
        if (loan.state != STATE_APPROVED && loan.state != STATE_ACTIVE) {
            revert InvalidState(loan.state, "APPROVED or ACTIVE");
        }
        require(ti < loan.numTranches, "Invalid tranche");

        DrawTranche storage t = _tranche(loan, ti);
        if (t.drawn) revert TrancheAlreadyDrawn(ti);
        // slither-disable-next-line timestamp
        if (t.releaseAt > 0 && block.timestamp < t.releaseAt) revert TrancheNotReleased(ti, t.releaseAt);

        t.drawn = true;
        loan.drawnPrincipal       += t.amount;
        loan.outstandingPrincipal += t.amount;

        if (loan.state == STATE_APPROVED) {
            // First draw: start the clock
            // slither-disable-next-line timestamp
            loan.startedAt     = block.timestamp;
            // slither-disable-next-line timestamp
            loan.dueAt         = block.timestamp + loan.termSeconds;
            // slither-disable-next-line timestamp
            loan.lastAccrualAt = block.timestamp;
            loan.state         = STATE_ACTIVE;
        } else {
            // Subsequent draw: accrue existing balance first
            _accrueNow(loan);
        }

        axusd.safeTransfer(loan.borrower, t.amount);
        emit DrawDisbursed(loanId, ti, t.amount);
    }

    /**
     * @notice Repay — borrower calls directly (interest-first allocation).
     */
    function repayLoan(bytes32 loanId, uint256 paymentAmt) external nonReentrant {
        LoanRecord storage loan = _requireLoan(loanId);
        if (loan.state != STATE_ACTIVE && loan.state != STATE_DELINQUENT) {
            revert InvalidState(loan.state, "ACTIVE or DELINQUENT");
        }
        if (msg.sender != loan.borrower && !hasRole(OPERATOR_ROLE, msg.sender)) {
            revert NotAuthorized(msg.sender);
        }

        uint256 accrued = _accrueNow(loan);
        uint256 maxDue  = loan.outstandingPrincipal + accrued;
        if (paymentAmt > maxDue + 1e15) revert Overpayment(maxDue, paymentAmt);

        uint256 payment = paymentAmt > maxDue ? maxDue : paymentAmt;
        uint256 interestPortion  = accrued > payment ? payment : accrued;
        uint256 principalPortion = payment - interestPortion;

        loan.totalInterestPaid    += interestPortion;
        loan.totalPrincipalPaid   += principalPortion;
        loan.outstandingPrincipal  = loan.outstandingPrincipal > principalPortion
            ? loan.outstandingPrincipal - principalPortion : 0;

        axusd.safeTransferFrom(msg.sender, address(this), payment);
        emit LoanPayment(loanId, msg.sender, payment, interestPortion, principalPortion, loan.outstandingPrincipal);

        if (loan.outstandingPrincipal < 1e15) {
            loan.outstandingPrincipal = 0;
            loan.state = STATE_REPAID;
            emit LoanRepaid(loanId);
        }
    }

    /**
     * @notice Prepay in full with penalty.
     */
    function prepayLoan(bytes32 loanId) external nonReentrant {
        LoanRecord storage loan = _requireLoan(loanId);
        if (loan.state != STATE_ACTIVE && loan.state != STATE_DELINQUENT) {
            revert InvalidState(loan.state, "ACTIVE or DELINQUENT");
        }
        if (msg.sender != loan.borrower && !hasRole(OPERATOR_ROLE, msg.sender)) {
            revert NotAuthorized(msg.sender);
        }

        uint256 accrued = _accrueNow(loan);
        uint256 penalty = (loan.outstandingPrincipal * loan.prepayPenaltyBps) / 10000;
        uint256 totalDue = loan.outstandingPrincipal + accrued + penalty;

        axusd.safeTransferFrom(msg.sender, address(this), totalDue);
        loan.totalInterestPaid   += accrued + penalty;
        loan.totalPrincipalPaid  += loan.outstandingPrincipal;
        loan.outstandingPrincipal = 0;
        loan.state = STATE_REPAID;

        emit LoanPrepaid(loanId, penalty);
        emit LoanRepaid(loanId);
    }

    // ─── Operator: State transitions ──────────────────────────────────────────

    function markDelinquent(bytes32 loanId) external onlyRole(OPERATOR_ROLE) {
        LoanRecord storage loan = _requireLoan(loanId);
        if (loan.state != STATE_ACTIVE) revert InvalidState(loan.state, "ACTIVE");
        // slither-disable-next-line timestamp
        require(block.timestamp > loan.dueAt + loan.gracePeriodSeconds, "Grace period active");
        loan.state = STATE_DELINQUENT;
        emit LoanDelinquent(loanId);
    }

    function cureDelinquent(bytes32 loanId) external onlyRole(OPERATOR_ROLE) {
        LoanRecord storage loan = _requireLoan(loanId);
        if (loan.state != STATE_DELINQUENT) revert InvalidState(loan.state, "DELINQUENT");
        loan.state = STATE_ACTIVE;
        emit LoanCured(loanId);
    }

    function defaultLoan(bytes32 loanId) external onlyRole(OPERATOR_ROLE) {
        LoanRecord storage loan = _requireLoan(loanId);
        if (loan.state != STATE_DELINQUENT) revert InvalidState(loan.state, "DELINQUENT");
        loan.state = STATE_DEFAULTED;
        emit LoanDefaulted(loanId);
    }

    function closeLoan(bytes32 loanId) external onlyRole(OPERATOR_ROLE) {
        LoanRecord storage loan = _requireLoan(loanId);
        if (loan.state != STATE_ACTIVE && loan.state != STATE_DELINQUENT) {
            revert InvalidState(loan.state, "ACTIVE or DELINQUENT");
        }
        uint256 accrued = _accrueNow(loan);
        loan.totalInterestPaid  += accrued;
        loan.totalPrincipalPaid += loan.outstandingPrincipal;
        loan.outstandingPrincipal = 0;
        loan.state = STATE_REPAID;
        emit LoanAdminClosed(loanId);
        emit LoanRepaid(loanId);
    }

    // ─── View functions ────────────────────────────────────────────────────────

    function getLoan(bytes32 loanId) external view returns (LoanRecord memory) {
        return _requireLoanView(loanId);
    }

    function accruedInterest(bytes32 loanId) external view returns (uint256) {
        LoanRecord storage loan = _requireLoanView(loanId);
        if (loan.state != STATE_ACTIVE && loan.state != STATE_DELINQUENT) return 0;
        return _computeInterest(loan.outstandingPrincipal, loan.interestRateBps, loan.lastAccrualAt);
    }

    /**
     * @notice Returns next due payment amount and timestamp.
     */
    function nextPaymentDue(bytes32 loanId) external view returns (uint256 amount, uint256 dueTimestamp) {
        LoanRecord storage loan = _requireLoanView(loanId);
        dueTimestamp = loan.dueAt;
        if (loan.state != STATE_ACTIVE && loan.state != STATE_DELINQUENT) return (0, dueTimestamp);

        uint256 accrued = _computeInterest(loan.outstandingPrincipal, loan.interestRateBps, loan.lastAccrualAt);
        uint256 termMonths = loan.termSeconds / 30 days;
        if (termMonths == 0) termMonths = 1;

        if (loan.paymentMode == MODE_INTEREST_ONLY) {
            amount = accrued;
        } else {
            uint256 rateScaled = (loan.interestRateBps * 1e12) / (10000 * 12);
            uint256 base = 1e12 + rateScaled;
            uint256 powResult = _powFixed(base, termMonths);
            if (powResult <= 1e12) {
                amount = loan.outstandingPrincipal / termMonths;
            } else {
                amount = (loan.outstandingPrincipal * rateScaled * powResult) / ((powResult - 1e12) * 1e12);
            }
        }
    }

    /**
     * @notice Returns the monthly payment schedule (amounts and due timestamps).
     *         Capped at 24 periods.
     */
    function paymentSchedule(bytes32 loanId) external view returns (uint256[] memory amounts, uint256[] memory dueDates) {
        LoanRecord storage loan = _requireLoanView(loanId);
        uint256 termMonths = loan.termSeconds / 30 days;
        if (termMonths == 0) termMonths = 1;
        if (termMonths > 24) termMonths = 24;

        amounts  = new uint256[](termMonths);
        dueDates = new uint256[](termMonths);

        uint256 rateScaled = (loan.interestRateBps * 1e12) / (10000 * 12);
        uint256 base = 1e12 + rateScaled;
        uint256 powResult = _powFixed(base, termMonths);

        uint256 monthlyPayment;
        if (loan.paymentMode == MODE_INTEREST_ONLY) {
            monthlyPayment = (loan.totalPrincipal * rateScaled) / 1e12;
        } else {
            if (powResult <= 1e12) {
                monthlyPayment = loan.totalPrincipal / termMonths;
            } else {
                monthlyPayment = (loan.totalPrincipal * rateScaled * powResult) / ((powResult - 1e12) * 1e12);
            }
        }

        // slither-disable-next-line timestamp
        uint256 startDate = loan.startedAt > 0 ? loan.startedAt : block.timestamp;
        for (uint256 m = 0; m < termMonths; m++) {
            amounts[m]  = monthlyPayment;
            dueDates[m] = startDate + (m + 1) * 30 days;
        }

        // Interest-only: balloon payment in last period
        if (loan.paymentMode == MODE_INTEREST_ONLY && termMonths > 0) {
            amounts[termMonths - 1] += loan.totalPrincipal;
        }
    }

    function daysDelinquent(bytes32 loanId) external view returns (uint256) {
        LoanRecord storage loan = _requireLoanView(loanId);
        if (loan.state != STATE_DELINQUENT && loan.state != STATE_DEFAULTED) return 0;
        // slither-disable-next-line timestamp
        if (block.timestamp <= loan.dueAt + loan.gracePeriodSeconds) return 0;
        // slither-disable-next-line timestamp
        return (block.timestamp - loan.dueAt - loan.gracePeriodSeconds) / 1 days;
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    function _accrueNow(LoanRecord storage loan) internal returns (uint256 accrued) {
        accrued = _computeInterest(loan.outstandingPrincipal, loan.interestRateBps, loan.lastAccrualAt);
        // slither-disable-next-line timestamp
        loan.lastAccrualAt = block.timestamp;
    }

    function _computeInterest(uint256 principal, uint256 rateBps, uint256 lastAccrualAt) internal view returns (uint256) {
        if (principal == 0 || lastAccrualAt == 0) return 0;
        // slither-disable-next-line timestamp
        uint256 elapsed = block.timestamp > lastAccrualAt ? block.timestamp - lastAccrualAt : 0;
        return (principal * rateBps * elapsed) / (365 days * 10000);
    }

    function _powFixed(uint256 base, uint256 exp) internal pure returns (uint256 result) {
        result = 1e12;
        for (uint256 i = 0; i < exp; i++) {
            result = (result * base) / 1e12;
        }
    }

    function _tranche(LoanRecord storage loan, uint8 ti) internal view returns (DrawTranche storage) {
        if (ti == 0) return loan.tranche0;
        if (ti == 1) return loan.tranche1;
        return loan.tranche2;
    }

    function _requireLoan(bytes32 loanId) internal view returns (LoanRecord storage loan) {
        loan = _loans[loanId];
        if (loan.loanId == bytes32(0)) revert LoanNotFound(loanId);
    }

    function _requireLoanView(bytes32 loanId) internal view returns (LoanRecord storage loan) {
        loan = _loans[loanId];
        if (loan.loanId == bytes32(0)) revert LoanNotFound(loanId);
    }
}
