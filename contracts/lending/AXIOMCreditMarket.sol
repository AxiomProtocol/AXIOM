// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
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

interface IIdentityRegistry {
    function isVerified(address user) external view returns (bool);
}

contract AXIOMCreditMarket is AccessControlLite, ReentrancyGuard {
    using SafeERC20Lite for IERC20;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant SHARE_PRECISION = 1e18;
    uint256 public constant MAX_RESERVE_RATIO_BPS = 5_000;

    IERC20 public immutable axusd;
    IIdentityRegistry public immutable identityRegistry;
    address public fixedLoan;

    mapping(address => uint256) public lpShares;
    uint256 public totalLpShares;

    uint256 public totalDeposited;
    uint256 public totalWithdrawn;

    mapping(bytes32 => uint256) public loanCommitment;
    uint256 public totalCommitted;
    uint256 public totalOutstanding;
    uint256 public totalInterestReceived;
    uint256 public totalPrincipalWrittenDown;

    mapping(address => uint256) public lpInterestDebt;
    mapping(address => uint256) public lpInterestResidual;
    uint256 public interestPerShare;

    uint256 public reserveRatioBps;

    event LiquidityDeposited(address indexed lp, uint256 amountUsd, uint256 sharesIssued);
    event LiquidityWithdrawn(address indexed lp, uint256 axusdOut, uint256 sharesBurned);
    event LiquidityCommitted(bytes32 indexed loanId, uint256 amount);
    event LoanDisbursed(bytes32 indexed loanId, address indexed borrower, uint256 amount);
    event RepaymentReceived(bytes32 indexed loanId, uint256 principalReturned, uint256 interestReceived);
    event UndrawnCommitmentReleased(bytes32 indexed loanId, uint256 amount);
    event OutstandingWrittenDown(bytes32 indexed loanId, uint256 amount);
    event InterestClaimed(address indexed lp, uint256 amount);
    event ReserveRatioUpdated(uint256 newBps);
    event FixedLoanSet(address indexed fixedLoan);

    error ZeroAddress();
    error ZeroAmount();
    error LpNotVerified(address lp);
    error OnlyFixedLoan();
    error FixedLoanNotSet();
    error InsufficientLiquidity(uint256 available, uint256 requested);
    error InsufficientShares(uint256 held, uint256 requested);
    error ReserveRatioViolation(uint256 availableAfter, uint256 minimumRequired);
    error MintedZeroShares(uint256 depositAmount, uint256 poolValue, uint256 totalShares);
    error BurnReturnsZeroAssets(uint256 sharesToBurn, uint256 poolValue, uint256 totalShares);
    error ExceedsCommitment(uint256 committed, uint256 requested);
    error InvalidReserveRatio(uint256 requestedBps);
    error ArithmeticInvariantViolation();

    constructor(address _axusd, address _identityRegistry) {
        if (_axusd == address(0) || _identityRegistry == address(0)) revert ZeroAddress();

        axusd = IERC20(_axusd);
        identityRegistry = IIdentityRegistry(_identityRegistry);
        reserveRatioBps = 1_000;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    modifier onlyFixedLoan() {
        if (fixedLoan == address(0)) revert FixedLoanNotSet();
        if (msg.sender != fixedLoan) revert OnlyFixedLoan();
        _;
    }

    function setFixedLoan(address _fixedLoan) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_fixedLoan == address(0)) revert ZeroAddress();
        fixedLoan = _fixedLoan;
        emit FixedLoanSet(_fixedLoan);
    }

    function depositLiquidity(uint256 amountUsd) external nonReentrant {
        if (amountUsd == 0) revert ZeroAmount();
        if (!identityRegistry.isVerified(msg.sender)) revert LpNotVerified(msg.sender);

        _settleInterest(msg.sender);

        uint256 shares;
        uint256 poolValue = _totalPoolValue();

        if (totalLpShares == 0 || poolValue == 0) {
            shares = amountUsd * SHARE_PRECISION;
        } else {
            shares = (amountUsd * totalLpShares) / poolValue;
            if (shares == 0) revert MintedZeroShares(amountUsd, poolValue, totalLpShares);
        }

        lpShares[msg.sender] += shares;
        totalLpShares += shares;
        totalDeposited += amountUsd;
        lpInterestDebt[msg.sender] = interestPerShare;

        axusd.safeTransferFrom(msg.sender, address(this), amountUsd);
        emit LiquidityDeposited(msg.sender, amountUsd, shares);
    }

    function withdrawLiquidity(uint256 sharesToBurn) external nonReentrant {
        if (sharesToBurn == 0) revert ZeroAmount();

        uint256 held = lpShares[msg.sender];
        if (held < sharesToBurn) revert InsufficientShares(held, sharesToBurn);

        _settleInterest(msg.sender);

        uint256 currentTotalLpShares = totalLpShares;
        uint256 poolValue = _totalPoolValue();
        uint256 axusdOut = (sharesToBurn * poolValue) / currentTotalLpShares;
        if (axusdOut == 0) revert BurnReturnsZeroAssets(sharesToBurn, poolValue, currentTotalLpShares);

        uint256 liquid = _liquidBalance();
        if (axusdOut > liquid) revert InsufficientLiquidity(liquid, axusdOut);

        uint256 remainingPoolValue = poolValue > axusdOut ? poolValue - axusdOut : 0;
        uint256 minReserve = (remainingPoolValue * reserveRatioBps) / BPS_DENOMINATOR;
        uint256 availableAfter = liquid - axusdOut;

        if (availableAfter < minReserve) {
            revert ReserveRatioViolation(availableAfter, minReserve);
        }

        lpShares[msg.sender] = held - sharesToBurn;
        totalLpShares = currentTotalLpShares - sharesToBurn;
        totalWithdrawn += axusdOut;
        lpInterestDebt[msg.sender] = interestPerShare;

        axusd.safeTransfer(msg.sender, axusdOut);
        emit LiquidityWithdrawn(msg.sender, axusdOut, sharesToBurn);
    }

    function commitLiquidity(bytes32 loanId, uint256 amountUsd) external onlyRole(OPERATOR_ROLE) {
        if (amountUsd == 0) revert ZeroAmount();
        require(loanId != bytes32(0), "ZERO_LOAN_ID");

        uint256 available = _availableLiquidity();
        if (available < amountUsd) revert InsufficientLiquidity(available, amountUsd);

        loanCommitment[loanId] += amountUsd;
        totalCommitted += amountUsd;

        emit LiquidityCommitted(loanId, amountUsd);
    }

    /**
     * @notice Disburse committed liquidity to the borrower.
     *         Called exclusively by AXIOMFixedLoan.disburseTranche() — the onlyFixedLoan
     *         modifier enforces this, so no separate OPERATOR_ROLE call is needed.
     *         This eliminates the previous "fund flow fail-open" risk where the operator
     *         could call disburseLoan() independently of a verified loan state.
     */
    function disburseCommittedLiquidity(
        bytes32 loanId,
        address borrower,
        uint256 amount
    ) external onlyFixedLoan nonReentrant {
        if (borrower == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        uint256 committed = loanCommitment[loanId];
        if (committed < amount) revert ExceedsCommitment(committed, amount);

        uint256 liquid = _liquidBalance();
        if (liquid < amount) revert InsufficientLiquidity(liquid, amount);

        loanCommitment[loanId] = committed - amount;
        totalCommitted -= amount;
        totalOutstanding += amount;

        axusd.safeTransfer(borrower, amount);
        emit LoanDisbursed(loanId, borrower, amount);
    }

    /**
     * @notice Receive repayment accounting from AXIOMFixedLoan.
     *         AXUSD must already be transferred into this contract before this call.
     *         Includes an arithmetic invariant check to detect any discrepancy.
     */
    function receiveRepayment(
        bytes32 loanId,
        uint256 principalReturned,
        uint256 interestAmount
    ) external onlyFixedLoan nonReentrant {
        if (principalReturned == 0 && interestAmount == 0) revert ZeroAmount();

        uint256 balanceBefore = _liquidBalance();

        if (totalOutstanding >= principalReturned) {
            totalOutstanding -= principalReturned;
        } else {
            totalOutstanding = 0;
        }

        totalInterestReceived += interestAmount;

        if (totalLpShares > 0 && interestAmount > 0) {
            interestPerShare += (interestAmount * SHARE_PRECISION) / totalLpShares;
        }

        uint256 expectedMinimumIncrease = principalReturned + interestAmount;
        uint256 balanceAfter = _liquidBalance();
        if (balanceAfter < balanceBefore || (balanceAfter - balanceBefore) < expectedMinimumIncrease) {
            revert ArithmeticInvariantViolation();
        }

        emit RepaymentReceived(loanId, principalReturned, interestAmount);
    }

    function releaseUndrawnCommitment(bytes32 loanId, uint256 amount) external onlyFixedLoan nonReentrant {
        if (amount == 0) revert ZeroAmount();

        uint256 committed = loanCommitment[loanId];
        if (committed < amount) revert ExceedsCommitment(committed, amount);

        loanCommitment[loanId] = committed - amount;
        totalCommitted -= amount;

        emit UndrawnCommitmentReleased(loanId, amount);
    }

    function writeDownOutstanding(bytes32 loanId, uint256 amount) external onlyFixedLoan nonReentrant {
        if (amount == 0) revert ZeroAmount();

        if (totalOutstanding >= amount) {
            totalOutstanding -= amount;
        } else {
            amount = totalOutstanding;
            totalOutstanding = 0;
        }

        totalPrincipalWrittenDown += amount;
        emit OutstandingWrittenDown(loanId, amount);
    }

    function claimInterest() external nonReentrant {
        _settleInterest(msg.sender);
    }

    function setReserveRatio(uint256 newBps) external onlyRole(OPERATOR_ROLE) {
        if (newBps > MAX_RESERVE_RATIO_BPS) revert InvalidReserveRatio(newBps);
        reserveRatioBps = newBps;
        emit ReserveRatioUpdated(newBps);
    }

    function availableLiquidity() external view returns (uint256) {
        return _availableLiquidity();
    }

    function totalPoolValue() external view returns (uint256) {
        return _totalPoolValue();
    }

    function sharePrice() external view returns (uint256) {
        if (totalLpShares == 0) return 1e6;
        return (_totalPoolValue() * SHARE_PRECISION) / totalLpShares;
    }

    function pendingInterest(address lp) external view returns (uint256) {
        uint256 residual = lpInterestResidual[lp];
        uint256 shares = lpShares[lp];
        if (shares == 0) return residual;

        uint256 debt = lpInterestDebt[lp];
        if (interestPerShare <= debt) return residual;

        uint256 newInterest = (shares * (interestPerShare - debt)) / SHARE_PRECISION;
        return newInterest + residual;
    }

    function isLpVerified(address lp) external view returns (bool) {
        return identityRegistry.isVerified(lp);
    }

    function _availableLiquidity() internal view returns (uint256) {
        uint256 liquid = _liquidBalance();
        return liquid > totalCommitted ? liquid - totalCommitted : 0;
    }

    function _liquidBalance() internal view returns (uint256) {
        return axusd.balanceOf(address(this));
    }

    function _totalPoolValue() internal view returns (uint256) {
        return _liquidBalance() + totalOutstanding;
    }

    function _settleInterest(address lp) internal {
        uint256 shares = lpShares[lp];
        uint256 debt = lpInterestDebt[lp];
        uint256 residual = lpInterestResidual[lp];

        if (shares == 0) {
            lpInterestDebt[lp] = interestPerShare;

            if (residual > 0) {
                uint256 liquidBalance = _liquidBalance();
                uint256 residualPay = residual > liquidBalance ? liquidBalance : residual;
                if (residualPay > 0) {
                    lpInterestResidual[lp] = residual - residualPay;
                    axusd.safeTransfer(lp, residualPay);
                    emit InterestClaimed(lp, residualPay);
                }
            }
            return;
        }

        uint256 newInterest = 0;
        if (interestPerShare > debt) {
            newInterest = (shares * (interestPerShare - debt)) / SHARE_PRECISION;
        }

        lpInterestDebt[lp] = interestPerShare;

        uint256 totalOwed = newInterest + residual;
        if (totalOwed == 0) return;

        uint256 liquid = _liquidBalance();
        uint256 payout = totalOwed > liquid ? liquid : totalOwed;

        if (payout > 0) {
            lpInterestResidual[lp] = totalOwed - payout;
            axusd.safeTransfer(lp, payout);
            emit InterestClaimed(lp, payout);
        } else {
            lpInterestResidual[lp] = totalOwed;
        }
    }
}
