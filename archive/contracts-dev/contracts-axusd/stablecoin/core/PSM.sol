// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IAxiomStable.sol";
import "../interfaces/IPSM.sol";

contract PSM is AccessControl, ReentrancyGuard, Pausable, IPSM {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    IAxiomStable public immutable axusd;
    IERC20 public immutable collateral;
    uint8 public immutable collateralDecimals;

    uint256 public mintFee;
    uint256 public redeemFee;
    uint256 public debtCeiling;
    uint256 public debtOutstanding;

    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_FEE = 100;

    address public feeRecipient;
    uint256 public collectedFees;

    uint256 public blockMintLimit;
    uint256 public blockRedeemLimit;
    uint256 private _blockMintUsed;
    uint256 private _blockRedeemUsed;
    uint256 private _lastMintBlock;
    uint256 private _lastRedeemBlock;

    mapping(address => uint256) private _lastSwapBlock;

    event FeeRecipientUpdated(address indexed newRecipient);
    event FeesWithdrawn(address indexed recipient, uint256 amount);
    event BlockLimitsUpdated(uint256 mintLimit, uint256 redeemLimit);

    error FlashLoanDetected();
    error BlockLimitExceeded();

    constructor(
        address _axusd,
        address _collateral,
        uint8 _collateralDecimals,
        uint256 _mintFee,
        uint256 _redeemFee,
        uint256 _debtCeiling
    ) {
        require(_axusd != address(0), "PSM: zero axusd");
        require(_collateral != address(0), "PSM: zero collateral");
        require(_mintFee <= MAX_FEE, "PSM: mint fee too high");
        require(_redeemFee <= MAX_FEE, "PSM: redeem fee too high");

        axusd = IAxiomStable(_axusd);
        collateral = IERC20(_collateral);
        collateralDecimals = _collateralDecimals;
        mintFee = _mintFee;
        redeemFee = _redeemFee;
        debtCeiling = _debtCeiling;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(GUARDIAN_ROLE, msg.sender);
    }

    function swapCollateralForAXUSD(uint256 collateralAmount) external override nonReentrant whenNotPaused returns (uint256 axusdAmount) {
        return swapCollateralForAXUSDWithMin(collateralAmount, 0);
    }

    function swapCollateralForAXUSDWithMin(uint256 collateralAmount, uint256 minAxusdOut) public nonReentrant whenNotPaused returns (uint256 axusdAmount) {
        require(collateralAmount > 0, "PSM: zero amount");
        
        if (_lastSwapBlock[msg.sender] == block.number) revert FlashLoanDetected();
        _lastSwapBlock[msg.sender] = block.number;

        uint256 axusdEquivalent = _toAxusdDecimals(collateralAmount);
        uint256 fee = (axusdEquivalent * mintFee) / BASIS_POINTS;
        axusdAmount = axusdEquivalent - fee;

        require(axusdAmount >= minAxusdOut, "PSM: slippage exceeded");
        require(debtOutstanding + axusdAmount <= debtCeiling, "PSM: debt ceiling exceeded");

        if (blockMintLimit > 0) {
            if (block.number > _lastMintBlock) {
                _blockMintUsed = 0;
                _lastMintBlock = block.number;
            }
            if (_blockMintUsed + axusdAmount > blockMintLimit) revert BlockLimitExceeded();
            _blockMintUsed += axusdAmount;
        }

        collateral.safeTransferFrom(msg.sender, address(this), collateralAmount);

        debtOutstanding += axusdAmount;
        collectedFees += fee;

        axusd.mint(msg.sender, axusdAmount);

        emit Swap(msg.sender, false, collateralAmount, axusdAmount, fee);
    }

    function swapAXUSDForCollateral(uint256 axusdAmount) external override nonReentrant whenNotPaused returns (uint256 collateralAmount) {
        return swapAXUSDForCollateralWithMin(axusdAmount, 0);
    }

    function swapAXUSDForCollateralWithMin(uint256 axusdAmount, uint256 minCollateralOut) public nonReentrant whenNotPaused returns (uint256 collateralAmount) {
        require(axusdAmount > 0, "PSM: zero amount");

        if (_lastSwapBlock[msg.sender] == block.number) revert FlashLoanDetected();
        _lastSwapBlock[msg.sender] = block.number;

        uint256 fee = (axusdAmount * redeemFee) / BASIS_POINTS;
        uint256 axusdAfterFee = axusdAmount - fee;
        collateralAmount = _toCollateralDecimals(axusdAfterFee);

        require(collateralAmount >= minCollateralOut, "PSM: slippage exceeded");
        require(collateralAmount <= collateral.balanceOf(address(this)), "PSM: insufficient collateral");

        if (blockRedeemLimit > 0) {
            if (block.number > _lastRedeemBlock) {
                _blockRedeemUsed = 0;
                _lastRedeemBlock = block.number;
            }
            if (_blockRedeemUsed + axusdAmount > blockRedeemLimit) revert BlockLimitExceeded();
            _blockRedeemUsed += axusdAmount;
        }

        axusd.burn(msg.sender, axusdAmount);

        if (debtOutstanding >= axusdAfterFee) {
            debtOutstanding -= axusdAfterFee;
        } else {
            debtOutstanding = 0;
        }
        collectedFees += fee;

        collateral.safeTransfer(msg.sender, collateralAmount);

        emit Swap(msg.sender, true, axusdAmount, collateralAmount, fee);
    }

    function getSwapQuote(
        uint256 amountIn,
        bool axusdToCollateral
    ) external view override returns (uint256 amountOut, uint256 fee) {
        if (axusdToCollateral) {
            fee = (amountIn * redeemFee) / BASIS_POINTS;
            uint256 axusdAfterFee = amountIn - fee;
            amountOut = _toCollateralDecimals(axusdAfterFee);
        } else {
            uint256 axusdEquivalent = _toAxusdDecimals(amountIn);
            fee = (axusdEquivalent * mintFee) / BASIS_POINTS;
            amountOut = axusdEquivalent - fee;
        }
    }

    function _toAxusdDecimals(uint256 collateralAmount) internal view returns (uint256) {
        if (collateralDecimals < 18) {
            return collateralAmount * (10 ** (18 - collateralDecimals));
        } else if (collateralDecimals > 18) {
            return collateralAmount / (10 ** (collateralDecimals - 18));
        }
        return collateralAmount;
    }

    function _toCollateralDecimals(uint256 axusdAmount) internal view returns (uint256) {
        if (collateralDecimals < 18) {
            return axusdAmount / (10 ** (18 - collateralDecimals));
        } else if (collateralDecimals > 18) {
            return axusdAmount * (10 ** (collateralDecimals - 18));
        }
        return axusdAmount;
    }

    function setFees(uint256 _mintFee, uint256 _redeemFee) external onlyRole(ADMIN_ROLE) {
        require(_mintFee <= MAX_FEE, "PSM: mint fee too high");
        require(_redeemFee <= MAX_FEE, "PSM: redeem fee too high");
        mintFee = _mintFee;
        redeemFee = _redeemFee;
        emit FeeUpdated(_mintFee, _redeemFee);
    }

    function setDebtCeiling(uint256 _debtCeiling) external onlyRole(ADMIN_ROLE) {
        debtCeiling = _debtCeiling;
        emit DebtCeilingUpdated(_debtCeiling);
    }

    function setFeeRecipient(address _feeRecipient) external onlyRole(ADMIN_ROLE) {
        require(_feeRecipient != address(0), "PSM: zero recipient");
        feeRecipient = _feeRecipient;
        emit FeeRecipientUpdated(_feeRecipient);
    }

    function withdrawFees() external onlyRole(ADMIN_ROLE) {
        require(feeRecipient != address(0), "PSM: no fee recipient");
        require(collectedFees > 0, "PSM: no fees");

        uint256 feesToWithdraw = collectedFees;
        collectedFees = 0;

        axusd.mint(feeRecipient, feesToWithdraw);
        emit FeesWithdrawn(feeRecipient, feesToWithdraw);
    }

    function withdrawCollateral(address recipient, uint256 amount) external onlyRole(ADMIN_ROLE) {
        require(recipient != address(0), "PSM: zero recipient");
        require(amount <= collateral.balanceOf(address(this)), "PSM: insufficient balance");
        
        collateral.safeTransfer(recipient, amount);
        emit CollateralWithdrawn(recipient, amount);
    }

    function getCollateralBalance() external view override returns (uint256) {
        return collateral.balanceOf(address(this));
    }

    function getDebtOutstanding() external view override returns (uint256) {
        return debtOutstanding;
    }

    function setBlockLimits(uint256 _mintLimit, uint256 _redeemLimit) external onlyRole(ADMIN_ROLE) {
        blockMintLimit = _mintLimit;
        blockRedeemLimit = _redeemLimit;
        emit BlockLimitsUpdated(_mintLimit, _redeemLimit);
    }

    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}
