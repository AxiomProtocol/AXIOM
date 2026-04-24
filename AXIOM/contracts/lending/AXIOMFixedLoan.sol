// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

library SafeERC20Lite {
    function safeTransfer(IERC20 token, address to, uint256 amount) internal {
        require(token.transfer(to, amount), "TRANSFER_FAILED");
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint256 amount) internal {
        require(token.transferFrom(from, to, amount), "TRANSFER_FROM_FAILED");
    }
}

abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status = _NOT_ENTERED;

    modifier nonReentrant() {
        require(_status != _ENTERED, "REENTRANCY");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

abstract contract AccessControlLite {
    mapping(bytes32 => mapping(address => bool)) private _roles;
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    modifier onlyRole(bytes32 role) {
        require(hasRole(role, msg.sender), "MISSING_ROLE");
        _;
    }

    function hasRole(bytes32 role, address account) public view returns (bool) {
        return _roles[role][account];
    }

    function grantRole(bytes32 role, address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!_roles[role][account]) {
            _roles[role][account] = true;
            emit RoleGranted(role, account, msg.sender);
        }
    }

    function revokeRole(bytes32 role, address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_roles[role][account]) {
            _roles[role][account] = false;
            emit RoleRevoked(role, account, msg.sender);
        }
    }

    function _grantRole(bytes32 role, address account) internal {
        if (!_roles[role][account]) {
            _roles[role][account] = true;
            emit RoleGranted(role, account, msg.sender);
        }
    }
}

interface IAxiomIdentityRegistry {
    function isVerified(address user) external view returns (bool);
}

interface IAXIOMCreditMarket {
    function receiveRepayment(bytes32 loanId, uint256 principalReturned, uint256 interestAmount) external;
    function releaseUndrawnCommitment(bytes32 loanId, uint256 amount) external;
    function writeDownOutstanding(bytes32 loanId, uint256 amount) external;
    function disburseCommittedLiquidity(bytes32 loanId, address borrower, uint256 amount) external;
}

/// @notice Minimal local view of `risk/CollateralGuard.sol` to keep this
///         file's existing pragma (0.8.20). Wired in by Task #210
///         (Collateral Exploit Prevention Framework). When the guard is
///         unset, behaviour is unchanged from the pre-#210 contract.
interface ICollateralGuard {
    function requireBorrowAllowed(
        bytes32 marketId,
        bytes32 assetId,
        address asset,
        uint256 amount,
        uint256 currentOutstanding
    ) external returns (uint64 versionUsed);
}

contract AXIOMFixedLoan is AccessControlLite, ReentrancyGuard {
    using SafeERC20Lite for IERC20;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    uint8 public constant MODE_AMORTIZED = 0;
    uint8 public constant MODE_INTEREST_ONLY = 1;

    uint8 public constant STATE_PENDING = 0;
    uint8 public constant STATE_APPROVED = 1;
    uint8 public constant STATE_ACTIVE = 2;
    uint8 public constant STATE_DELINQUENT = 3;
    uint8 public constant STATE_DEFAULTED = 4;
    uint8 public constant STATE_REPAID = 5;
    uint8 public constant STATE_CLOSED = 6;
    uint8 public constant STATE_CHARGED_OFF = 7;

    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant YEAR_SECONDS = 365 days;
    uint256 public constant PAYMENT_INTERVAL = 30 days;
    uint256 public constant DUST_THRESHOLD = 1;
    uint256 public constant MAX_RATE_BPS = 5_000;
    uint256 public constant MAX_PREPAY_BPS = 10_000;

    IERC20 public immutable axusd;
    IAxiomIdentityRegistry public immutable identityRegistry;
    IAXIOMCreditMarket public creditMarket;

    bool public immutable accrueAfterMaturity;

    struct DrawTranche {
        uint256 amount;
        uint256 releaseAt;
        bool drawn;
    }

    struct LoanRecord {
        bytes32 loanId;
        address borrower;
        uint8 paymentMode;
        uint256 interestRateBps;
        uint256 prepayPenaltyBps;
        uint256 gracePeriodSeconds;
        uint256 termSeconds;
        uint256 startedAt;
        uint256 dueAt;
        uint8 state;

        uint256 totalPrincipal;
        uint256 drawnPrincipal;
        uint256 outstandingPrincipal;

        uint256 pendingInterest;
        uint256 lastAccrualAt;

        uint256 totalInterestPaid;
        uint256 totalPrincipalPaid;

        uint8 numTranches;
        DrawTranche tranche0;
        DrawTranche tranche1;
        DrawTranche tranche2;

        string propertyAddress;

        uint256 delinquentAt;

        uint256 totalInstallments;
        uint256 installmentIntervalSeconds;
        uint256 installmentAmount;
        uint256 nextInstallmentDueAt;
        uint256 currentInstallmentPaid;
        uint256 installmentsSatisfied;
    }

    mapping(bytes32 => LoanRecord) private _loans;
    bytes32[] public allLoanIds;

    // ── Task #210 — optional CollateralGuard wiring ─────────────────────────
    /// @notice Optional fail-closed guard called on every disbursement.
    ///         When unset (address(0)), pre-#210 behaviour is preserved.
    ICollateralGuard public collateralGuard;
    /// @notice Stable market identifier passed to the guard. Set once.
    bytes32 public marketId;
    /// @notice Per-loan collateral mapping (loanId → assetId, asset).
    mapping(bytes32 => bytes32) public loanCollateralAssetId;
    mapping(bytes32 => address) public loanCollateralAsset;
    /// @notice Outstanding exposure aggregated per collateral assetId.
    mapping(bytes32 => uint256) public outstandingByCollateral;

    event CollateralGuardSet(address indexed guard, bytes32 marketId);
    event LoanCollateralSet(bytes32 indexed loanId, bytes32 indexed assetId, address asset);

    event CreditMarketSet(address indexed creditMarket);
    event LoanOriginated(bytes32 indexed loanId, address indexed borrower, uint256 totalPrincipal, string propertyAddress);
    event LoanApproved(bytes32 indexed loanId);
    event DrawDisbursed(bytes32 indexed loanId, uint8 trancheIndex, uint256 amount);
    event LoanPayment(
        bytes32 indexed loanId,
        address indexed payer,
        uint256 paymentAmount,
        uint256 interestPortion,
        uint256 principalPortion,
        uint256 remainingPrincipal
    );
    event LoanPrepaid(bytes32 indexed loanId, uint256 penaltyAmount);
    event LoanDelinquent(bytes32 indexed loanId, uint256 delinquentAt);
    event LoanCured(bytes32 indexed loanId);
    event LoanDefaulted(bytes32 indexed loanId);
    event LoanRepaid(bytes32 indexed loanId);
    event LoanClosed(bytes32 indexed loanId, uint256 releasedCommitment);
    event LoanChargedOff(bytes32 indexed loanId, uint256 principalWrittenOff, uint256 interestCleared);
    event LoanAdminClosed(bytes32 indexed loanId);
    event RepaymentAccountingFailed(bytes32 indexed loanId, uint256 principalReturned, uint256 interestAmount);

    error LoanNotFound(bytes32 loanId);
    error InvalidState(uint8 current, string expected);
    error InvalidConfig(string reason);
    error TrancheAlreadyDrawn(uint8 index);
    error TrancheNotReleased(uint8 index, uint256 releaseAt);
    error Overpayment(uint256 maxDue, uint256 attempted);
    error NotAuthorized(address caller);
    error CreditMarketNotSet();
    error UnverifiedBorrower(address borrower);
    error InstallmentNotDue();
    error InsufficientInstallmentPayment(uint256 requiredMinimum, uint256 actualPayment);
    error PastDueInstallment(uint256 dueTimestamp);

    constructor(address _axusd, address _identityRegistry, bool _accrueAfterMaturity) {
        require(_axusd != address(0), "ZERO_AXUSD");
        require(_identityRegistry != address(0), "ZERO_IDENTITY");

        axusd = IERC20(_axusd);
        identityRegistry = IAxiomIdentityRegistry(_identityRegistry);
        accrueAfterMaturity = _accrueAfterMaturity;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    function setCreditMarket(address _creditMarket) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_creditMarket != address(0), "ZERO_CREDIT_MARKET");
        creditMarket = IAXIOMCreditMarket(_creditMarket);
        emit CreditMarketSet(_creditMarket);
    }

    /// @notice Wire the CollateralGuard (Task #210). Pass `address(0)` to
    ///         disable guard checks. `_marketId` is the stable identifier
    ///         used by the IncidentController for per-market halts.
    function setCollateralGuard(address _guard, bytes32 _marketId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        collateralGuard = ICollateralGuard(_guard);
        marketId = _marketId;
        emit CollateralGuardSet(_guard, _marketId);
    }

    /// @notice Tag a loan with its collateral asset. MUST be called after
    ///         origination but before first disbursement when the
    ///         CollateralGuard is wired.
    function setLoanCollateral(bytes32 loanId, bytes32 assetId, address asset)
        external onlyRole(OPERATOR_ROLE)
    {
        LoanRecord storage loan = _requireLoan(loanId);
        require(loan.state == STATE_PENDING || loan.state == STATE_APPROVED, "LOAN_ALREADY_ACTIVE");
        require(assetId != bytes32(0), "ZERO_ASSET_ID");
        require(asset != address(0), "ZERO_ASSET_ADDR");
        loanCollateralAssetId[loanId] = assetId;
        loanCollateralAsset[loanId]   = asset;
        emit LoanCollateralSet(loanId, assetId, asset);
    }

    function originateLoan(
        bytes32 loanId,
        address borrower,
        uint8 paymentMode,
        uint256 rateBps,
        uint256 prepayBps,
        uint256 graceSecs,
        uint256 termSecs,
        string calldata propAddress,
        uint256[] calldata trancheAmounts,
        uint256[] calldata trancheRelease
    ) external onlyRole(OPERATOR_ROLE) {
        _validateOriginationArgs(
            loanId,
            borrower,
            paymentMode,
            rateBps,
            prepayBps,
            termSecs,
            trancheAmounts,
            trancheRelease
        );

        uint256 total = _sumTranches(trancheAmounts);

        LoanRecord storage loan = _loans[loanId];
        loan.loanId = loanId;
        loan.borrower = borrower;
        loan.paymentMode = paymentMode;
        loan.interestRateBps = rateBps;
        loan.prepayPenaltyBps = prepayBps;
        loan.gracePeriodSeconds = graceSecs;
        loan.termSeconds = termSecs;
        loan.state = STATE_PENDING;
        loan.totalPrincipal = total;
        loan.numTranches = uint8(trancheAmounts.length);
        loan.propertyAddress = propAddress;

        if (loan.numTranches >= 1) loan.tranche0 = DrawTranche(trancheAmounts[0], trancheRelease[0], false);
        if (loan.numTranches >= 2) loan.tranche1 = DrawTranche(trancheAmounts[1], trancheRelease[1], false);
        if (loan.numTranches >= 3) loan.tranche2 = DrawTranche(trancheAmounts[2], trancheRelease[2], false);

        if (paymentMode == MODE_AMORTIZED) {
            require(loan.numTranches == 1, "AMORTIZED_ONE_TRANCHE_ONLY");
            loan.installmentIntervalSeconds = PAYMENT_INTERVAL;
            loan.totalInstallments = _ceilDiv(termSecs, PAYMENT_INTERVAL);
            loan.installmentAmount = _computeInstallmentAmount(total, rateBps, loan.totalInstallments);
        }

        allLoanIds.push(loanId);
        emit LoanOriginated(loanId, borrower, total, propAddress);
    }

    function approveLoan(bytes32 loanId) external onlyRole(OPERATOR_ROLE) {
        LoanRecord storage loan = _requireLoan(loanId);
        if (loan.state != STATE_PENDING) revert InvalidState(loan.state, "PENDING");
        if (address(creditMarket) == address(0)) revert CreditMarketNotSet();
        if (!identityRegistry.isVerified(loan.borrower)) revert UnverifiedBorrower(loan.borrower);

        loan.state = STATE_APPROVED;
        emit LoanApproved(loanId);
    }

    function disburseTranche(bytes32 loanId, uint8 trancheIndex) external onlyRole(OPERATOR_ROLE) nonReentrant {
        LoanRecord storage loan = _requireLoan(loanId);
        if (address(creditMarket) == address(0)) revert CreditMarketNotSet();
        if (loan.state != STATE_APPROVED && loan.state != STATE_ACTIVE) {
            revert InvalidState(loan.state, "APPROVED or ACTIVE");
        }
        require(trancheIndex < loan.numTranches, "INVALID_TRANCHE");

        DrawTranche storage tranche = _tranche(loan, trancheIndex);
        if (tranche.drawn) revert TrancheAlreadyDrawn(trancheIndex);
        if (tranche.releaseAt != 0 && block.timestamp < tranche.releaseAt) {
            revert TrancheNotReleased(trancheIndex, tranche.releaseAt);
        }

        if (loan.state == STATE_ACTIVE) {
            _accrueNow(loan);
        }

        // ── Task #210: fail-closed collateral admission check ───────────
        // Once the CollateralGuard is wired, the guard call is MANDATORY
        // for every disbursement — every loan MUST have its collateral
        // tagged via `setLoanCollateral` before the first draw. The
        // earlier "skip if untagged" bypass is closed.
        // When the guard is NOT yet wired (address(0)), behaviour is
        // unchanged from the pre-#210 contract (used by environments
        // mid-migration).
        if (address(collateralGuard) != address(0)) {
            bytes32 assetId = loanCollateralAssetId[loanId];
            address asset   = loanCollateralAsset[loanId];
            require(assetId != bytes32(0) && asset != address(0), "LOAN_COLLATERAL_NOT_TAGGED");
            uint256 currentOutstanding = outstandingByCollateral[assetId];
            collateralGuard.requireBorrowAllowed(
                marketId,
                assetId,
                asset,
                tranche.amount,
                currentOutstanding
            );
            outstandingByCollateral[assetId] = currentOutstanding + tranche.amount;
        }

        tranche.drawn = true;
        loan.drawnPrincipal += tranche.amount;
        loan.outstandingPrincipal += tranche.amount;

        if (loan.state == STATE_APPROVED) {
            loan.startedAt = block.timestamp;
            loan.dueAt = block.timestamp + loan.termSeconds;
            loan.lastAccrualAt = block.timestamp;
            loan.state = STATE_ACTIVE;

            if (loan.paymentMode == MODE_AMORTIZED) {
                loan.nextInstallmentDueAt = block.timestamp + loan.installmentIntervalSeconds;
            }
        }

        creditMarket.disburseCommittedLiquidity(loanId, loan.borrower, tranche.amount);
        emit DrawDisbursed(loanId, trancheIndex, tranche.amount);
    }

    function repayLoan(bytes32 loanId, uint256 paymentAmount) external nonReentrant {
        LoanRecord storage loan = _requireLoan(loanId);
        if (address(creditMarket) == address(0)) revert CreditMarketNotSet();
        if (loan.state != STATE_ACTIVE && loan.state != STATE_DELINQUENT) {
            revert InvalidState(loan.state, "ACTIVE or DELINQUENT");
        }
        if (msg.sender != loan.borrower && !hasRole(OPERATOR_ROLE, msg.sender)) {
            revert NotAuthorized(msg.sender);
        }

        _accrueNow(loan);

        if (loan.paymentMode == MODE_AMORTIZED) {
            _enforceAmortizedPastDueRules(loan);

            if (loan.nextInstallmentDueAt != 0 && block.timestamp >= loan.nextInstallmentDueAt) {
                uint256 dueNow = _currentInstallmentDue(loan);
                if (dueNow > DUST_THRESHOLD && paymentAmount + DUST_THRESHOLD < dueNow) {
                    revert InsufficientInstallmentPayment(dueNow, paymentAmount);
                }
            }
        }

        uint256 totalInterestDue = loan.pendingInterest;
        uint256 maxDue = loan.outstandingPrincipal + totalInterestDue;

        if (paymentAmount > maxDue + DUST_THRESHOLD) revert Overpayment(maxDue, paymentAmount);
        uint256 payment = paymentAmount > maxDue ? maxDue : paymentAmount;

        uint256 interestPortion = totalInterestDue > payment ? payment : totalInterestDue;
        uint256 principalPortion = payment - interestPortion;

        loan.pendingInterest = totalInterestDue - interestPortion;
        loan.totalInterestPaid += interestPortion;
        loan.totalPrincipalPaid += principalPortion;
        loan.outstandingPrincipal = loan.outstandingPrincipal > principalPortion
            ? loan.outstandingPrincipal - principalPortion
            : 0;

        if (loan.paymentMode == MODE_AMORTIZED) {
            loan.currentInstallmentPaid += payment;
            _advanceInstallmentsIfSatisfied(loan);
        }

        bool fullyRepaid = loan.outstandingPrincipal <= DUST_THRESHOLD && loan.pendingInterest <= DUST_THRESHOLD;
        if (fullyRepaid) {
            loan.outstandingPrincipal = 0;
            loan.pendingInterest = 0;
            loan.currentInstallmentPaid = 0;
            loan.nextInstallmentDueAt = 0;
            loan.state = STATE_REPAID;
        }

        axusd.safeTransferFrom(msg.sender, address(this), payment);
        axusd.safeTransfer(address(creditMarket), payment);
        try creditMarket.receiveRepayment(loanId, principalPortion, interestPortion) {
        } catch {
            emit RepaymentAccountingFailed(loanId, principalPortion, interestPortion);
        }

        emit LoanPayment(loanId, msg.sender, payment, interestPortion, principalPortion, loan.outstandingPrincipal);
        if (fullyRepaid) emit LoanRepaid(loanId);
    }

    function prepayLoan(bytes32 loanId) external nonReentrant {
        LoanRecord storage loan = _requireLoan(loanId);
        if (address(creditMarket) == address(0)) revert CreditMarketNotSet();
        if (loan.state != STATE_ACTIVE && loan.state != STATE_DELINQUENT) {
            revert InvalidState(loan.state, "ACTIVE or DELINQUENT");
        }
        if (msg.sender != loan.borrower && !hasRole(OPERATOR_ROLE, msg.sender)) {
            revert NotAuthorized(msg.sender);
        }

        _accrueNow(loan);

        uint256 penalty = (loan.outstandingPrincipal * loan.prepayPenaltyBps) / BPS_DENOMINATOR;
        uint256 principalReturned = loan.outstandingPrincipal;
        uint256 interestTotal = loan.pendingInterest + penalty;
        uint256 totalDue = principalReturned + interestTotal;

        loan.totalInterestPaid += interestTotal;
        loan.totalPrincipalPaid += principalReturned;
        loan.outstandingPrincipal = 0;
        loan.pendingInterest = 0;
        loan.currentInstallmentPaid = 0;
        loan.nextInstallmentDueAt = 0;
        loan.state = STATE_REPAID;

        axusd.safeTransferFrom(msg.sender, address(this), totalDue);
        axusd.safeTransfer(address(creditMarket), totalDue);
        try creditMarket.receiveRepayment(loanId, principalReturned, interestTotal) {
        } catch {
            emit RepaymentAccountingFailed(loanId, principalReturned, interestTotal);
        }

        emit LoanPrepaid(loanId, penalty);
        emit LoanRepaid(loanId);
    }

    function markDelinquent(bytes32 loanId) external onlyRole(OPERATOR_ROLE) {
        LoanRecord storage loan = _requireLoan(loanId);
        if (loan.state != STATE_ACTIVE) revert InvalidState(loan.state, "ACTIVE");
        _accrueNow(loan);

        bool maturePastGrace = block.timestamp >= loan.dueAt + loan.gracePeriodSeconds;
        bool installmentPastGrace = false;

        if (loan.paymentMode == MODE_AMORTIZED && loan.nextInstallmentDueAt != 0) {
            uint256 dueNow = _currentInstallmentDue(loan);
            installmentPastGrace =
                dueNow > DUST_THRESHOLD &&
                block.timestamp > loan.nextInstallmentDueAt + loan.gracePeriodSeconds;
        }

        require(maturePastGrace || installmentPastGrace, "NOT_DELINQUENT_YET");

        loan.state = STATE_DELINQUENT;
        loan.delinquentAt = block.timestamp;
        emit LoanDelinquent(loanId, loan.delinquentAt);
    }

    function cureDelinquent(bytes32 loanId) external onlyRole(OPERATOR_ROLE) {
        LoanRecord storage loan = _requireLoan(loanId);
        if (loan.state != STATE_DELINQUENT) revert InvalidState(loan.state, "DELINQUENT");
        _accrueNow(loan);

        if (loan.paymentMode == MODE_AMORTIZED && loan.nextInstallmentDueAt != 0) {
            uint256 dueNow = _currentInstallmentDue(loan);
            require(dueNow <= DUST_THRESHOLD, "INSTALLMENT_STILL_DUE");
        }

        loan.state = STATE_ACTIVE;
        loan.delinquentAt = 0;
        emit LoanCured(loanId);
    }

    function defaultLoan(bytes32 loanId) external onlyRole(OPERATOR_ROLE) {
        LoanRecord storage loan = _requireLoan(loanId);
        if (loan.state != STATE_DELINQUENT) revert InvalidState(loan.state, "DELINQUENT");
        require(loan.delinquentAt != 0, "MISSING_DELINQUENT_AT");
        require(block.timestamp >= loan.delinquentAt + loan.gracePeriodSeconds, "POST_DELINQUENT_GRACE_ACTIVE");

        loan.state = STATE_DEFAULTED;
        emit LoanDefaulted(loanId);
    }

    function resolveDefault(bytes32 loanId) external onlyRole(OPERATOR_ROLE) nonReentrant {
        LoanRecord storage loan = _requireLoan(loanId);
        if (loan.state != STATE_DEFAULTED) revert InvalidState(loan.state, "DEFAULTED");
        if (address(creditMarket) == address(0)) revert CreditMarketNotSet();

        uint256 undrawnCommitment = loan.totalPrincipal > loan.drawnPrincipal
            ? loan.totalPrincipal - loan.drawnPrincipal
            : 0;
        uint256 principalWrittenOff = loan.outstandingPrincipal;

        loan.outstandingPrincipal = 0;
        loan.pendingInterest = 0;
        loan.currentInstallmentPaid = 0;
        loan.nextInstallmentDueAt = 0;
        loan.state = STATE_REPAID;

        if (undrawnCommitment > 0) {
            creditMarket.releaseUndrawnCommitment(loanId, undrawnCommitment);
        }
        if (principalWrittenOff > 0) {
            creditMarket.writeDownOutstanding(loanId, principalWrittenOff);
        }

        emit LoanAdminClosed(loanId);
    }

    function closeUndrawnApprovedLoan(bytes32 loanId) external onlyRole(OPERATOR_ROLE) nonReentrant {
        LoanRecord storage loan = _requireLoan(loanId);
        if (loan.state != STATE_APPROVED) revert InvalidState(loan.state, "APPROVED");
        if (address(creditMarket) == address(0)) revert CreditMarketNotSet();

        uint256 undrawnCommitment = loan.totalPrincipal > loan.drawnPrincipal
            ? loan.totalPrincipal - loan.drawnPrincipal
            : 0;

        loan.state = STATE_CLOSED;
        creditMarket.releaseUndrawnCommitment(loanId, undrawnCommitment);

        emit LoanClosed(loanId, undrawnCommitment);
    }

    function chargeOffLoan(bytes32 loanId) external onlyRole(OPERATOR_ROLE) nonReentrant {
        LoanRecord storage loan = _requireLoan(loanId);
        if (loan.state != STATE_DEFAULTED && loan.state != STATE_DELINQUENT) {
            revert InvalidState(loan.state, "DEFAULTED or DELINQUENT");
        }
        if (address(creditMarket) == address(0)) revert CreditMarketNotSet();

        uint256 undrawnCommitment = loan.totalPrincipal > loan.drawnPrincipal
            ? loan.totalPrincipal - loan.drawnPrincipal
            : 0;

        uint256 principalWrittenOff = loan.outstandingPrincipal;
        uint256 interestCleared = loan.pendingInterest;

        loan.outstandingPrincipal = 0;
        loan.pendingInterest = 0;
        loan.currentInstallmentPaid = 0;
        loan.nextInstallmentDueAt = 0;
        loan.state = STATE_CHARGED_OFF;

        if (undrawnCommitment > 0) {
            creditMarket.releaseUndrawnCommitment(loanId, undrawnCommitment);
        }
        if (principalWrittenOff > 0) {
            creditMarket.writeDownOutstanding(loanId, principalWrittenOff);
        }

        emit LoanChargedOff(loanId, principalWrittenOff, interestCleared);
    }

    function getLoan(bytes32 loanId) external view returns (LoanRecord memory) {
        LoanRecord storage loan = _loans[loanId];
        if (loan.loanId == bytes32(0)) revert LoanNotFound(loanId);
        return loan;
    }

    function loanCount() external view returns (uint256) {
        return allLoanIds.length;
    }

    function accruedInterest(bytes32 loanId) external view returns (uint256) {
        LoanRecord storage loan = _loans[loanId];
        if (loan.loanId == bytes32(0)) return 0;
        return _accruedInterestView(loan);
    }

    function nextPaymentDue(bytes32 loanId) external view returns (uint256 amount, uint256 dueTimestamp) {
        LoanRecord storage loan = _loans[loanId];
        if (loan.loanId == bytes32(0)) return (0, 0);
        if (loan.state != STATE_ACTIVE && loan.state != STATE_DELINQUENT) return (0, loan.dueAt);

        uint256 interestOwed = _accruedInterestView(loan);

        if (loan.paymentMode == MODE_INTEREST_ONLY) {
            return (interestOwed, loan.dueAt);
        }

        if (loan.nextInstallmentDueAt == 0) return (0, 0);
        return (_currentInstallmentDueView(loan, interestOwed), loan.nextInstallmentDueAt);
    }

    function paymentSchedule(bytes32 loanId)
        external
        view
        returns (uint256[] memory amounts, uint256[] memory dueDates)
    {
        LoanRecord storage loan = _loans[loanId];

        if (loan.loanId == bytes32(0) || loan.startedAt == 0) {
            return (new uint256[](0), new uint256[](0));
        }

        if (loan.paymentMode == MODE_INTEREST_ONLY) {
            amounts = new uint256[](1);
            dueDates = new uint256[](1);
            amounts[0] = loan.outstandingPrincipal + _accruedInterestView(loan);
            dueDates[0] = loan.dueAt;
            return (amounts, dueDates);
        }

        uint256 n = loan.totalInstallments;
        amounts = new uint256[](n);
        dueDates = new uint256[](n);

        for (uint256 i = 0; i < n; i++) {
            amounts[i] = loan.installmentAmount;
            dueDates[i] = loan.startedAt + ((i + 1) * loan.installmentIntervalSeconds);
        }
    }

    function daysDelinquent(bytes32 loanId) external view returns (uint256) {
        LoanRecord storage loan = _loans[loanId];
        if (loan.loanId == bytes32(0)) return 0;
        if ((loan.state != STATE_DELINQUENT && loan.state != STATE_DEFAULTED) || loan.delinquentAt == 0) return 0;
        return (block.timestamp - loan.delinquentAt) / 1 days;
    }

    function _validateOriginationArgs(
        bytes32 loanId,
        address borrower,
        uint8 paymentMode,
        uint256 rateBps,
        uint256 prepayBps,
        uint256 termSecs,
        uint256[] calldata trancheAmounts,
        uint256[] calldata trancheRelease
    ) internal view {
        require(loanId != bytes32(0), "ZERO_LOAN_ID");
        require(_loans[loanId].loanId == bytes32(0), "LOAN_EXISTS");
        require(borrower != address(0), "ZERO_BORROWER");
        if (!identityRegistry.isVerified(borrower)) revert UnverifiedBorrower(borrower);
        require(paymentMode <= MODE_INTEREST_ONLY, "INVALID_PAYMENT_MODE");
        require(rateBps <= MAX_RATE_BPS, "RATE_TOO_HIGH");
        require(prepayBps <= MAX_PREPAY_BPS, "PREPAY_TOO_HIGH");
        require(termSecs > 0, "ZERO_TERM");
        require(trancheAmounts.length >= 1 && trancheAmounts.length <= 3, "TRANCHE_COUNT");
        require(trancheAmounts.length == trancheRelease.length, "TRANCHE_ARRAY_MISMATCH");

        uint256 prevRelease;
        uint256 total;
        for (uint256 i = 0; i < trancheAmounts.length; i++) {
            require(trancheAmounts[i] > 0, "ZERO_TRANCHE_AMOUNT");
            if (i > 0) require(trancheRelease[i] >= prevRelease, "UNSORTED_RELEASE");
            prevRelease = trancheRelease[i];
            total += trancheAmounts[i];
        }
        require(total > 0, "ZERO_PRINCIPAL");

        if (paymentMode == MODE_AMORTIZED && trancheAmounts.length != 1) {
            revert InvalidConfig("AMORTIZED_ONE_TRANCHE_ONLY");
        }
    }

    function _sumTranches(uint256[] calldata amounts) internal pure returns (uint256 total) {
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }
    }

    function _requireLoan(bytes32 loanId) internal view returns (LoanRecord storage loan) {
        loan = _loans[loanId];
        if (loan.loanId == bytes32(0)) revert LoanNotFound(loanId);
    }

    function _tranche(LoanRecord storage loan, uint8 index) internal view returns (DrawTranche storage) {
        if (index == 0) return loan.tranche0;
        if (index == 1) return loan.tranche1;
        return loan.tranche2;
    }

    function _accrualEnd(LoanRecord storage loan) internal view returns (uint256) {
        if (accrueAfterMaturity) return block.timestamp;
        return block.timestamp < loan.dueAt ? block.timestamp : loan.dueAt;
    }

    function _accruedInterestView(LoanRecord storage loan) internal view returns (uint256) {
        if ((loan.state != STATE_ACTIVE && loan.state != STATE_DELINQUENT) || loan.outstandingPrincipal == 0) {
            return loan.pendingInterest;
        }

        uint256 accrualEnd = _accrualEnd(loan);
        if (accrualEnd <= loan.lastAccrualAt) return loan.pendingInterest;

        uint256 elapsed = accrualEnd - loan.lastAccrualAt;
        uint256 newlyAccrued = (loan.outstandingPrincipal * loan.interestRateBps * elapsed)
            / (YEAR_SECONDS * BPS_DENOMINATOR);

        return loan.pendingInterest + newlyAccrued;
    }

    function _accrueNow(LoanRecord storage loan) internal {
        if (loan.outstandingPrincipal == 0) {
            loan.lastAccrualAt = block.timestamp;
            return;
        }

        uint256 accrualEnd = _accrualEnd(loan);
        if (accrualEnd <= loan.lastAccrualAt) return;

        uint256 elapsed = accrualEnd - loan.lastAccrualAt;
        uint256 newlyAccrued = (loan.outstandingPrincipal * loan.interestRateBps * elapsed)
            / (YEAR_SECONDS * BPS_DENOMINATOR);

        loan.pendingInterest += newlyAccrued;
        loan.lastAccrualAt = accrualEnd;
    }

    function _computeInstallmentAmount(
        uint256 principal,
        uint256 annualRateBps,
        uint256 periods
    ) internal pure returns (uint256) {
        if (periods == 0) revert InvalidConfig("ZERO_INSTALLMENTS");
        if (annualRateBps == 0) return _ceilDiv(principal, periods);

        uint256 monthlyRateRay = (annualRateBps * 1e18) / (12 * BPS_DENOMINATOR);
        uint256 onePlusR = 1e18 + monthlyRateRay;
        uint256 powN = _pow18(onePlusR, periods);
        uint256 numerator = principal * ((monthlyRateRay * powN) / 1e18);
        uint256 denominator = powN - 1e18;

        return _ceilDiv(numerator, denominator);
    }

    function _pow18(uint256 base, uint256 exp) internal pure returns (uint256 result) {
        result = 1e18;
        while (exp > 0) {
            if ((exp & 1) == 1) {
                result = (result * base) / 1e18;
            }
            base = (base * base) / 1e18;
            exp >>= 1;
        }
    }

    function _ceilDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        return a == 0 ? 0 : ((a - 1) / b) + 1;
    }

    function _currentInstallmentDue(LoanRecord storage loan) internal view returns (uint256) {
        return _currentInstallmentDueView(loan, _accruedInterestView(loan));
    }

    function _currentInstallmentDueView(
        LoanRecord storage loan,
        uint256 interestOwed
    ) internal view returns (uint256) {
        if (loan.paymentMode != MODE_AMORTIZED || loan.nextInstallmentDueAt == 0) return 0;

        uint256 scheduled = loan.installmentAmount;
        uint256 remainingForThisInstallment = scheduled > loan.currentInstallmentPaid
            ? scheduled - loan.currentInstallmentPaid
            : 0;

        uint256 totalOutstandingDebt = loan.outstandingPrincipal + interestOwed;
        if (remainingForThisInstallment > totalOutstandingDebt) {
            remainingForThisInstallment = totalOutstandingDebt;
        }

        return remainingForThisInstallment;
    }

    function _enforceAmortizedPastDueRules(LoanRecord storage loan) internal view {
        if (loan.paymentMode != MODE_AMORTIZED || loan.nextInstallmentDueAt == 0) return;

        uint256 dueNow = _currentInstallmentDue(loan);
        if (
            dueNow > DUST_THRESHOLD &&
            block.timestamp > loan.nextInstallmentDueAt + loan.gracePeriodSeconds
        ) {
            revert PastDueInstallment(loan.nextInstallmentDueAt);
        }
    }

    function _advanceInstallmentsIfSatisfied(LoanRecord storage loan) internal {
        if (loan.paymentMode != MODE_AMORTIZED || loan.nextInstallmentDueAt == 0) return;

        while (loan.currentInstallmentPaid + DUST_THRESHOLD >= loan.installmentAmount) {
            if (loan.installmentsSatisfied >= loan.totalInstallments) {
                loan.currentInstallmentPaid = 0;
                loan.nextInstallmentDueAt = 0;
                return;
            }

            loan.currentInstallmentPaid -= loan.installmentAmount;
            loan.installmentsSatisfied += 1;

            if (loan.installmentsSatisfied >= loan.totalInstallments || loan.outstandingPrincipal == 0) {
                loan.currentInstallmentPaid = 0;
                loan.nextInstallmentDueAt = 0;
                return;
            } else {
                loan.nextInstallmentDueAt += loan.installmentIntervalSeconds;
            }
        }
    }
}
