// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../Interfaces.sol";

contract DSCRPoolVault is ERC4626, AccessControl, Pausable, ReentrancyGuard, IPoolVault {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    uint256 private _lockedLiquidity;
    uint256 private _totalYieldAccumulated;
    uint256 private _totalPrincipalDeployed;

    uint256 public minDeposit;
    uint256 public maxDeposit;
    uint256 public withdrawalCooldown;

    mapping(address => uint256) public lastDepositTime;
    mapping(address => uint256) public depositorShares;

    event ParametersUpdated(uint256 minDeposit, uint256 maxDeposit, uint256 cooldown);
    event PrincipalDeployed(uint256 amount, uint256 totalDeployed);
    event PrincipalReturned(uint256 amount, uint256 totalDeployed);

    constructor(
        IERC20 _axusd,
        string memory name,
        string memory symbol
    ) ERC4626(_axusd) ERC20(name, symbol) {
        minDeposit = 1000e18;
        maxDeposit = 5_000_000e18;
        withdrawalCooldown = 7 days;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
        _grantRole(GUARDIAN_ROLE, msg.sender);
    }

    function deposit(uint256 assets, address receiver) 
        public 
        override(ERC4626, IPoolVault) 
        nonReentrant 
        whenNotPaused 
        returns (uint256) 
    {
        require(assets >= minDeposit, "DSCRPoolVault: below min deposit");
        require(assets <= maxDeposit, "DSCRPoolVault: above max deposit");

        lastDepositTime[receiver] = block.timestamp;
        uint256 shares = super.deposit(assets, receiver);
        depositorShares[receiver] += shares;

        emit PoolDeposit(receiver, assets, shares);
        return shares;
    }

    function withdraw(uint256 assets, address receiver, address owner)
        public
        override(ERC4626, IPoolVault)
        nonReentrant
        whenNotPaused
        returns (uint256)
    {
        require(
            block.timestamp >= lastDepositTime[owner] + withdrawalCooldown,
            "DSCRPoolVault: cooldown not elapsed"
        );
        require(assets <= availableLiquidity(), "DSCRPoolVault: insufficient liquidity");

        uint256 shares = super.withdraw(assets, receiver, owner);
        if (depositorShares[owner] >= shares) {
            depositorShares[owner] -= shares;
        }

        emit PoolWithdraw(receiver, assets, shares);
        return shares;
    }

    function redeem(uint256 shares, address receiver, address owner)
        public
        override(ERC4626, IPoolVault)
        nonReentrant
        whenNotPaused
        returns (uint256)
    {
        require(
            block.timestamp >= lastDepositTime[owner] + withdrawalCooldown,
            "DSCRPoolVault: cooldown not elapsed"
        );

        uint256 assets = previewRedeem(shares);
        require(assets <= availableLiquidity(), "DSCRPoolVault: insufficient liquidity");

        uint256 actualAssets = super.redeem(shares, receiver, owner);
        if (depositorShares[owner] >= shares) {
            depositorShares[owner] -= shares;
        }

        emit PoolWithdraw(receiver, actualAssets, shares);
        return actualAssets;
    }

    function lockForLoan(uint256 amount) external override onlyRole(MANAGER_ROLE) {
        require(amount <= availableLiquidity(), "DSCRPoolVault: insufficient available liquidity");
        _lockedLiquidity += amount;
        _totalPrincipalDeployed += amount;
        emit FundsLocked(amount);
        emit PrincipalDeployed(amount, _totalPrincipalDeployed);
    }

    function unlockFromLoan(uint256 amount) external override onlyRole(MANAGER_ROLE) {
        require(amount <= _lockedLiquidity, "DSCRPoolVault: amount exceeds locked");
        _lockedLiquidity -= amount;
        emit FundsUnlocked(amount);
        emit PrincipalReturned(amount, _totalPrincipalDeployed);
    }

    event FundsDisbursed(address indexed recipient, uint256 amount);

    function disburse(address recipient, uint256 amount) external onlyRole(MANAGER_ROLE) nonReentrant {
        require(recipient != address(0), "DSCRPoolVault: invalid recipient");
        require(amount > 0, "DSCRPoolVault: zero amount");
        require(amount <= IERC20(asset()).balanceOf(address(this)), "DSCRPoolVault: insufficient balance");
        
        IERC20(asset()).safeTransfer(recipient, amount);
        emit FundsDisbursed(recipient, amount);
    }

    function reportYield(uint256 amount) external override onlyRole(MANAGER_ROLE) {
        _totalYieldAccumulated += amount;
        emit YieldReported(amount);
    }

    function totalAssets() public view override(ERC4626, IPoolVault) returns (uint256) {
        return IERC20(asset()).balanceOf(address(this)) + _lockedLiquidity;
    }

    function availableLiquidity() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }

    function lockedLiquidity() public view override returns (uint256) {
        return _lockedLiquidity;
    }

    function totalYieldAccumulated() external view returns (uint256) {
        return _totalYieldAccumulated;
    }

    function totalPrincipalDeployed() external view returns (uint256) {
        return _totalPrincipalDeployed;
    }

    function convertToShares(uint256 assets) public view override(ERC4626, IPoolVault) returns (uint256) {
        return super.convertToShares(assets);
    }

    function convertToAssets(uint256 shares) public view override(ERC4626, IPoolVault) returns (uint256) {
        return super.convertToAssets(shares);
    }

    function setParameters(
        uint256 _minDeposit,
        uint256 _maxDeposit,
        uint256 _cooldown
    ) external onlyRole(ADMIN_ROLE) {
        require(_maxDeposit > _minDeposit, "DSCRPoolVault: invalid deposit range");
        minDeposit = _minDeposit;
        maxDeposit = _maxDeposit;
        withdrawalCooldown = _cooldown;
        emit ParametersUpdated(_minDeposit, _maxDeposit, _cooldown);
    }

    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function emergencyWithdrawToken(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(ADMIN_ROLE) {
        require(token != asset(), "DSCRPoolVault: cannot withdraw base asset");
        IERC20(token).safeTransfer(to, amount);
    }
}
