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
 *   - Six states: PENDING / APPROVED / ACTIVE / DELINQUENT / DEFAULTED / REPAID
 *   - Configurable grace period (seconds) before delinquency
 *
 * Integration with AXIOMCreditMarket:
 *   - Operator calls commitLiquidity() on CreditMarket, then disburseLoan() which
 *     sends AXUSD directly from CreditMarket to the borrower.
 *   - This contract tracks state only; AXUSD custody lives in CreditMarket.
 *   - On repayment: borrower calls repayLoan() here; AXUSD is collected by this
 *     contract and immediately forwarded to CreditMarket via receiveRepayment().
 *   - CreditMarket.fixedLoan must be set to this contract's address post-deploy.
 *
 * AXUSD uses 6 decimal places.
 * Dust threshold: < 1e4 (= $0.000001 in 6-decimal AXUSD) = fully repaid.
 */

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IAxiomIdentityRegistry {
    function isVerified(address _userAddress) external view returns (bool);
}

interface IAXIOMCreditMarket {
    function receiveRepayment(bytes32 loanId, uint256 principalReturned, uint256 interestAmount) external;
    /// @notice Release a committed-but-written-off principal from the pool's receivables accounting.
    function releaseCommitment(bytes32 loanId, uint256 amount) external;
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
        uint256 amount;      // AXUSD wei (6 decimals)
        uint256 releaseAt;   // earliest disbursement timestamp (0 = immediate)
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
        uint256  totalPrincipal;       // sum of all tranches (6 dec)
        uint256  drawnPrincipal;       // disbursed so far (6 dec)
        uint256  outstandingPrincipal; // remaining unpaid principal (6 dec)
        uint256  pendingInterest;      // accrued-but-unpaid interest (6 dec) — PERSISTED so partial payments cannot erase debt
        uint256  lastAccrualAt;
        uint256  totalInterestPaid;    // cumulative interest collected (6 dec)
        uint256  totalPrincipalPaid;   // cumulative principal collected (6 dec)
        uint8    numTranches;
        DrawTranche tranche0;
        DrawTranche tranche1;
        DrawTranche tranche2;
        string   propertyAddress;
    }

    // ─── Storage ──────────────────────────────────────────────────────────────
    IERC20                  public axusd;
    IAxiomIdentityRegistry  public identityRegistry;
    IAXIOMCreditMarket      public creditMarket; // set post-deploy

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
    event CreditMarketSet(address indexed creditMarket);

    // ─── Errors ───────────────────────────────────────────────────────────────
    error LoanNotFound(bytes32 loanId);
    error InvalidState(uint8 current, string expected);
    error TrancheAlreadyDrawn(uint8 index);
    error TrancheNotReleased(uint8 index, uint256 releaseAt);
    error Overpayment(uint256 maxDue, uint256 attempted);
    error NotAuthorized(address caller);

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(address _axusd, address _identityRegistry) {
        axusd = IERC20(_axusd);
        identityRegistry = IAxiomIdentityRegistry(_identityRegistry);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    // ─── Admin: register CreditMarket ─────────────────────────────────────────

    /**
     * @notice Set the CreditMarket contract that will receive repayments.
     *         Must be called after both contracts are deployed.
     */
    function setCreditMarket(address _creditMarket) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_creditMarket != address(0), "Zero address");
        creditMarket = IAXIOMCreditMarket(_creditMarket);
        emit CreditMarketSet(_creditMarket);
    }

    // ─── Operator: Originate ──────────────────────────────────────────────────

    /**
     * @notice Originate a fixed-term loan (state record only; AXUSD custody in CreditMarket).
     * @param tranchAmts    Array of draw amounts in AXUSD (1-3 elements, 6 decimals)
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
     * @notice Record that a tranche disbursement occurred.
     *         Actual AXUSD transfer is handled by CreditMarket.disburseLoan().
     *         Operator must call CreditMarket.disburseLoan() BEFORE or AFTER this call.
     *         This call updates the loan state machine (starts clock on first tranche).
     */
    function disburseTranche(bytes32 loanId, uint8 ti) external onlyRole(OPERATOR_ROLE) {
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
            _accrueNow(loan);
        }

        emit DrawDisbursed(loanId, ti, t.amount);
    }

    /**
     * @notice Repay — borrower calls directly (interest-first allocation).
     *         Repaid AXUSD is forwarded to CreditMarket for LP distribution.
     * @param loanId     Loan identifier
     * @param paymentAmt AXUSD amount (6 decimals)
     */
    function repayLoan(bytes32 loanId, uint256 paymentAmt) external nonReentrant {
        LoanRecord storage loan = _requireLoan(loanId);
        if (loan.state != STATE_ACTIVE && loan.state != STATE_DELINQUENT) {
            revert InvalidState(loan.state, "ACTIVE or DELINQUENT");
        }
        if (msg.sender != loan.borrower && !hasRole(OPERATOR_ROLE, msg.sender)) {
            revert NotAuthorized(msg.sender);
        }

        // Accrue new interest and persist it to loan.pendingInterest bucket
        _accrueNow(loan);

        // Total debt = persisted unpaid interest + outstanding principal
        uint256 totalInterestDue = loan.pendingInterest;
        uint256 maxDue           = loan.outstandingPrincipal + totalInterestDue;

        if (paymentAmt > maxDue + 1e4) revert Overpayment(maxDue, paymentAmt); // dust: 1e4 = $0.000001

        uint256 payment = paymentAmt > maxDue ? maxDue : paymentAmt;

        // Interest-first allocation: pay pending interest first, then principal
        uint256 interestPortion  = totalInterestDue > payment ? payment : totalInterestDue;
        uint256 principalPortion = payment - interestPortion;

        // EFFECTS — all state updated before any external call (full CEI compliance)
        loan.pendingInterest      = totalInterestDue - interestPortion;
        loan.totalInterestPaid   += interestPortion;
        loan.totalPrincipalPaid  += principalPortion;
        loan.outstandingPrincipal = loan.outstandingPrincipal > principalPortion
            ? loan.outstandingPrincipal - principalPortion : 0;

        // Determine final state BEFORE any interaction — prevents re-entering repayLoan
        // after safeTransferFrom hook fires while loan is still ACTIVE.
        bool fullyRepaid = loan.outstandingPrincipal < 1e4 && loan.pendingInterest < 1e4;
        if (fullyRepaid) {
            loan.outstandingPrincipal = 0;
            loan.pendingInterest      = 0;
            loan.state                = STATE_REPAID;
        }

        // INTERACTIONS — external calls after all state is finalized
        axusd.safeTransferFrom(msg.sender, address(this), payment);

        if (address(creditMarket) != address(0)) {
            axusd.safeTransfer(address(creditMarket), payment);
            creditMarket.receiveRepayment(loanId, principalPortion, interestPortion);
        }

        emit LoanPayment(loanId, msg.sender, payment, interestPortion, principalPortion, loan.outstandingPrincipal);
        if (fullyRepaid) emit LoanRepaid(loanId);
    }

    /**
     * @notice Prepay in full with penalty. Borrower pays principal + accrued + penalty.
     *
     * CEI order:
     *   1. CHECKS  — state, authorization
     *   2. EFFECTS — all storage writes (amounts, state = REPAID)
     *   3. INTERACTIONS — safeTransferFrom, safeTransfer, receiveRepayment
     *
     * This prevents a cross-function reentrancy attack where a hook on the AXUSD token
     * could call repayLoan() between the pull and the state update.
     */
    function prepayLoan(bytes32 loanId) external nonReentrant {
        LoanRecord storage loan = _requireLoan(loanId);
        if (loan.state != STATE_ACTIVE && loan.state != STATE_DELINQUENT) {
            revert InvalidState(loan.state, "ACTIVE or DELINQUENT");
        }
        if (msg.sender != loan.borrower && !hasRole(OPERATOR_ROLE, msg.sender)) {
            revert NotAuthorized(msg.sender);
        }

        // Accrue and persist any new interest into pendingInterest
        _accrueNow(loan);

        uint256 penalty           = (loan.outstandingPrincipal * loan.prepayPenaltyBps) / 10000;
        uint256 principalReturned = loan.outstandingPrincipal;
        uint256 interestTotal     = loan.pendingInterest + penalty;
        // Full payoff: all persisted pending interest + principal + penalty
        uint256 totalDue          = principalReturned + interestTotal;

        // EFFECTS: update all state before any external call (CEI pattern)
        loan.totalInterestPaid   += interestTotal;
        loan.totalPrincipalPaid  += principalReturned;
        loan.outstandingPrincipal = 0;
        loan.pendingInterest      = 0;
        loan.state                = STATE_REPAID;

        // INTERACTIONS: external calls after all state changes
        axusd.safeTransferFrom(msg.sender, address(this), totalDue);

        // Forward to CreditMarket — explicit call (no try/catch); revert on failure
        if (address(creditMarket) != address(0)) {
            axusd.safeTransfer(address(creditMarket), totalDue);
            creditMarket.receiveRepayment(loanId, principalReturned, interestTotal);
        }

        emit LoanPrepaid(loanId, penalty);
        emit LoanRepaid(loanId);
    }

    // ─── Operator: State transitions ──────────────────────────────────────────

    function markDelinquent(bytes32 loanId) external onlyRole(OPERATOR_ROLE) {
        LoanRecord storage loan = _requireLoan(loanId);
        if (loan.state != STATE_ACTIVE) revert InvalidState(loan.state, "ACTIVE");
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
        if (loan.state != STATE_ACTIVE && loan.state != STATE_DELINQUENT) {
            revert InvalidState(loan.state, "ACTIVE or DELINQUENT");
        }
        loan.state = STATE_DEFAULTED;
        emit LoanDefaulted(loanId);
    }

    /**
     * @notice Admin close (reconciliation path — for off-chain settled or written-off loans).
     *         Notifies CreditMarket to release the outstanding principal from committed
     *         receivables accounting. Without this, totalCommitted remains inflated permanently,
     *         causing an artificial share price increase and LP accounting errors.
     */
    function closeLoan(bytes32 loanId) external onlyRole(OPERATOR_ROLE) {
        LoanRecord storage loan = _requireLoan(loanId);
        if (
            loan.state != STATE_ACTIVE &&
            loan.state != STATE_DELINQUENT &&
            loan.state != STATE_APPROVED
        ) revert InvalidState(loan.state, "ACTIVE, DELINQUENT or APPROVED");

        uint256 principalToRelease = loan.outstandingPrincipal;

        // EFFECTS first
        loan.outstandingPrincipal = 0;
        loan.pendingInterest      = 0;
        loan.state                = STATE_REPAID;

        // INTERACTIONS: notify CreditMarket to release receivable / pre-disbursement commitment.
        // Always call even when principalToRelease=0 (APPROVED loan closed before disbursal) so
        // that releaseCommitment can clean up loanCommitment[loanId] and totalCommitted.
        if (address(creditMarket) != address(0)) {
            creditMarket.releaseCommitment(loanId, principalToRelease);
        }

        emit LoanAdminClosed(loanId);
    }

    // ─── View functions ───────────────────────────────────────────────────────

    function getLoan(bytes32 loanId) external view returns (LoanRecord memory) {
        LoanRecord storage loan = _loans[loanId];
        if (loan.loanId == bytes32(0)) revert LoanNotFound(loanId);
        return loan;
    }

    /**
     * @notice Total outstanding interest owed (persisted pendingInterest + newly accrued since last checkpoint).
     *         Read-only view — does not modify state.
     */
    function accruedInterest(bytes32 loanId) external view returns (uint256) {
        LoanRecord storage loan = _loans[loanId];
        if (loan.loanId == bytes32(0)) return 0;
        if (loan.state != STATE_ACTIVE && loan.state != STATE_DELINQUENT) return loan.pendingInterest;
        if (loan.outstandingPrincipal == 0) return loan.pendingInterest;
        // slither-disable-next-line timestamp
        uint256 elapsed = block.timestamp - loan.lastAccrualAt;
        uint256 newlyAccrued = (loan.outstandingPrincipal * loan.interestRateBps * elapsed) / (365 days * 10000);
        // Return persisted interest + not-yet-checkpointed interest
        return loan.pendingInterest + newlyAccrued;
    }

    /**
     * @notice Next payment due amount and due timestamp.
     *         Returns (0, dueAt) for interest-only; full amortized payment for AMORTIZED mode.
     *         Includes persisted pendingInterest in the total.
     */
    function nextPaymentDue(bytes32 loanId)
        external view returns (uint256 amount, uint256 dueTimestamp)
    {
        LoanRecord storage loan = _loans[loanId];
        if (loan.loanId == bytes32(0)) return (0, 0);
        if (loan.state != STATE_ACTIVE && loan.state != STATE_DELINQUENT) return (0, loan.dueAt);

        // slither-disable-next-line timestamp
        uint256 elapsed = block.timestamp - loan.lastAccrualAt;
        uint256 newlyAccrued = (loan.outstandingPrincipal * loan.interestRateBps * elapsed) / (365 days * 10000);
        uint256 totalInterestOwed = loan.pendingInterest + newlyAccrued;

        if (loan.paymentMode == MODE_INTEREST_ONLY) {
            // For interest-only loans the next payment = all currently owed interest.
            // Do NOT add a separate monthlyInterest estimate — totalInterestOwed already
            // includes this period's accrued amount; adding again would double-count.
            return (totalInterestOwed, loan.dueAt);
        } else {
            // Full amortized: total principal + all accrued interest due at maturity
            return (loan.outstandingPrincipal + totalInterestOwed, loan.dueAt);
        }
    }

    /**
     * @notice Simplified monthly amortized payment schedule.
     *         Returns arrays of payment amounts and timestamps.
     */
    function paymentSchedule(bytes32 loanId)
        external view returns (uint256[] memory amounts, uint256[] memory dueDates)
    {
        LoanRecord storage loan = _loans[loanId];
        if (loan.loanId == bytes32(0) || loan.startedAt == 0) {
            return (new uint256[](0), new uint256[](0));
        }

        uint256 termMonths = loan.termSeconds / 30 days;
        if (termMonths == 0) termMonths = 1;

        amounts  = new uint256[](termMonths);
        dueDates = new uint256[](termMonths);

        uint256 monthlyRate = loan.interestRateBps * 1e18 / (12 * 10000);

        if (loan.paymentMode == MODE_INTEREST_ONLY) {
            uint256 monthlyInterest = (loan.totalPrincipal * loan.interestRateBps) / (12 * 10000);
            for (uint256 i = 0; i < termMonths; i++) {
                amounts[i]  = monthlyInterest;
                dueDates[i] = loan.startedAt + (i + 1) * 30 days;
            }
            return (amounts, dueDates);
        }

        // Amortized: M = P × r(1+r)^n / ((1+r)^n − 1)
        uint256 r = monthlyRate;
        uint256 onePlusR = 1e18 + r;
        uint256 n = termMonths;
        uint256 onePlusRn = _powWad(onePlusR, n);
        uint256 monthlyPayment;
        // Standard amortization formula: M = P × r × (1+r)^n / ((1+r)^n − 1)
        // All scalars in WAD (1e18). r is the monthly rate in WAD, onePlusRn = (1+r)^n in WAD.
        if (onePlusRn <= 1e18 || r == 0) {
            // Zero or near-zero rate: equal principal payments per period
            monthlyPayment = loan.totalPrincipal / n;
        } else {
            // M = P * r * (1+r)^n / ((1+r)^n - 1)
            // r and onePlusRn are WAD; totalPrincipal is 6-dec AXUSD.
            // Multiply first by r (WAD), then divide by 1e18 to return to 6-dec scale.
            monthlyPayment = (loan.totalPrincipal * r / 1e18 * onePlusRn / 1e18)
                * 1e18 / (onePlusRn - 1e18);
        }

        for (uint256 i = 0; i < termMonths; i++) {
            amounts[i]  = monthlyPayment;
            dueDates[i] = loan.startedAt + (i + 1) * 30 days;
        }
    }

    /**
     * @notice Days overdue (0 if not delinquent).
     */
    function daysDelinquent(bytes32 loanId) external view returns (uint256) {
        LoanRecord storage loan = _loans[loanId];
        if (loan.loanId == bytes32(0)) return 0;
        if (loan.state != STATE_ACTIVE && loan.state != STATE_DELINQUENT) return 0;
        if (loan.dueAt == 0) return 0;
        // slither-disable-next-line timestamp
        if (block.timestamp <= loan.dueAt) return 0;
        // slither-disable-next-line timestamp
        return (block.timestamp - loan.dueAt) / 1 days;
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _requireLoan(bytes32 loanId) internal view returns (LoanRecord storage loan) {
        loan = _loans[loanId];
        if (loan.loanId == bytes32(0)) revert LoanNotFound(loanId);
    }

    function _tranche(LoanRecord storage loan, uint8 ti) internal view returns (DrawTranche storage) {
        if (ti == 0) return loan.tranche0;
        if (ti == 1) return loan.tranche1;
        return loan.tranche2;
    }

    /**
     * @notice Accrue interest since lastAccrualAt, persist it to pendingInterest,
     *         and advance lastAccrualAt. Returns the newly accrued increment.
     *
     * IMPORTANT: accrued interest is written to loan.pendingInterest so partial
     * payments cannot erase it — the debt bucket persists until paid off.
     */
    function _accrueNow(LoanRecord storage loan) internal returns (uint256 newlyAccrued) {
        if (loan.outstandingPrincipal == 0) {
            // slither-disable-next-line timestamp
            loan.lastAccrualAt = block.timestamp;
            return 0;
        }
        // slither-disable-next-line timestamp
        uint256 elapsed = block.timestamp - loan.lastAccrualAt;
        newlyAccrued = (loan.outstandingPrincipal * loan.interestRateBps * elapsed) / (365 days * 10000);
        // Persist newly accrued interest into pendingInterest bucket
        loan.pendingInterest += newlyAccrued;
        // slither-disable-next-line timestamp
        loan.lastAccrualAt = block.timestamp;
    }

    /**
     * @notice Integer power in wad (1e18) arithmetic for amortized schedule computation.
     */
    function _powWad(uint256 base, uint256 exp) internal pure returns (uint256 result) {
        result = 1e18;
        while (exp > 0) {
            if (exp % 2 == 1) {
                result = result * base / 1e18;
            }
            base = base * base / 1e18;
            exp /= 2;
        }
    }
}
