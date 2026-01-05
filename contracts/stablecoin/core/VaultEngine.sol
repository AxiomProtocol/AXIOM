// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IAxiomStable.sol";
import "../interfaces/IOracleAdapter.sol";
import "../interfaces/IRateLimiter.sol";
import "../interfaces/IVaultEngine.sol";
import "../lib/VaultMath.sol";

contract VaultEngine is AccessControl, Pausable, ReentrancyGuard, IVaultEngine {
    using SafeERC20 for IERC20;
    using VaultMath for uint256;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant LIQUIDATOR_ROLE = keccak256("LIQUIDATOR_ROLE");

    IAxiomStable public immutable axusd;
    IOracleAdapter public oracleAdapter;
    IRateLimiter public rateLimiter;
    address public feeBurner;

    uint256 public globalDebtCeiling;
    uint256 public totalGlobalDebt;
    uint256 public accruedFees;

    mapping(address => CollateralConfig) public collateralConfigs;
    mapping(address => mapping(address => Vault)) public vaults;
    address[] public collateralList;

    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant PRECISION = 1e18;

    event CollateralAdded(address indexed collateral, uint256 minRatio, uint256 liquidationThreshold, uint256 fee);
    event CollateralUpdated(address indexed collateral);
    event CollateralDisabled(address indexed collateral);
    event GlobalDebtCeilingUpdated(uint256 newCeiling);
    event FeesRouted(address indexed feeBurner, uint256 amount);
    event OracleAdapterUpdated(address indexed newAdapter);
    event RateLimiterUpdated(address indexed newLimiter);
    event FeeBurnerUpdated(address indexed newFeeBurner);

    constructor(
        address _axusd,
        address _oracleAdapter,
        address _rateLimiter,
        uint256 _globalDebtCeiling
    ) {
        require(_axusd != address(0), "VaultEngine: zero axusd");
        require(_oracleAdapter != address(0), "VaultEngine: zero oracle");
        require(_rateLimiter != address(0), "VaultEngine: zero limiter");

        axusd = IAxiomStable(_axusd);
        oracleAdapter = IOracleAdapter(_oracleAdapter);
        rateLimiter = IRateLimiter(_rateLimiter);
        globalDebtCeiling = _globalDebtCeiling;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(GUARDIAN_ROLE, msg.sender);
    }

    function addCollateral(
        address collateral,
        uint256 minCollateralRatio,
        uint256 liquidationThreshold,
        uint256 liquidationPenalty,
        uint256 debtCeiling,
        uint256 stabilityFee
    ) external onlyRole(ADMIN_ROLE) {
        require(collateral != address(0), "VaultEngine: zero collateral");
        require(collateralConfigs[collateral].minCollateralRatio == 0, "VaultEngine: already added");
        require(minCollateralRatio >= 11000, "VaultEngine: ratio too low");
        require(liquidationThreshold < minCollateralRatio, "VaultEngine: invalid threshold");
        require(liquidationThreshold >= 10000, "VaultEngine: threshold below 100%");
        require(liquidationPenalty <= 2000, "VaultEngine: penalty too high");
        require(stabilityFee <= 2000, "VaultEngine: fee too high");
        require(oracleAdapter.isFeedValid(collateral), "VaultEngine: no valid feed");

        collateralConfigs[collateral] = CollateralConfig({
            priceFeed: address(0),
            minCollateralRatio: minCollateralRatio,
            liquidationThreshold: liquidationThreshold,
            liquidationPenalty: liquidationPenalty,
            debtCeiling: debtCeiling,
            stabilityFee: stabilityFee,
            totalDebt: 0,
            enabled: true
        });

        collateralList.push(collateral);
        emit CollateralAdded(collateral, minCollateralRatio, liquidationThreshold, stabilityFee);
    }

    function disableCollateral(address collateral) external onlyRole(GUARDIAN_ROLE) {
        require(collateralConfigs[collateral].minCollateralRatio > 0, "VaultEngine: not added");
        collateralConfigs[collateral].enabled = false;
        emit CollateralDisabled(collateral);
    }

    function depositCollateral(address collateral, uint256 amount) external override nonReentrant whenNotPaused {
        require(amount > 0, "VaultEngine: zero amount");
        CollateralConfig storage config = collateralConfigs[collateral];
        require(config.minCollateralRatio > 0, "VaultEngine: unsupported collateral");
        require(config.enabled, "VaultEngine: collateral disabled");

        IERC20(collateral).safeTransferFrom(msg.sender, address(this), amount);
        
        Vault storage vault = vaults[msg.sender][collateral];
        vault.collateralAmount += amount;
        
        if (vault.lastAccrualTimestamp == 0) {
            vault.lastAccrualTimestamp = block.timestamp;
        }

        emit CollateralDeposited(msg.sender, collateral, amount);
    }

    function withdrawCollateral(address collateral, uint256 amount) external override nonReentrant whenNotPaused {
        require(amount > 0, "VaultEngine: zero amount");
        
        Vault storage vault = vaults[msg.sender][collateral];
        require(vault.collateralAmount >= amount, "VaultEngine: insufficient collateral");

        _accrueInterest(msg.sender, collateral);

        uint256 newCollateralAmount = vault.collateralAmount - amount;
        
        if (vault.debtAmount > 0) {
            uint256 collateralPrice = oracleAdapter.getPrice(collateral);
            uint256 newCollateralValue = (newCollateralAmount * collateralPrice) / PRECISION;
            uint256 newRatio = VaultMath.calculateCollateralRatio(newCollateralValue, vault.debtAmount);
            require(newRatio >= collateralConfigs[collateral].minCollateralRatio, "VaultEngine: below min ratio");
        }

        vault.collateralAmount = newCollateralAmount;
        IERC20(collateral).safeTransfer(msg.sender, amount);

        emit CollateralWithdrawn(msg.sender, collateral, amount);
    }

    function mintAXUSD(address collateral, uint256 amount) external override nonReentrant whenNotPaused {
        require(amount > 0, "VaultEngine: zero amount");
        
        CollateralConfig storage config = collateralConfigs[collateral];
        require(config.minCollateralRatio > 0, "VaultEngine: unsupported collateral");
        require(config.enabled, "VaultEngine: collateral disabled");
        
        Vault storage vault = vaults[msg.sender][collateral];
        require(vault.collateralAmount > 0, "VaultEngine: no collateral");

        _accrueInterest(msg.sender, collateral);

        require(totalGlobalDebt + amount <= globalDebtCeiling, "VaultEngine: global ceiling");
        require(config.totalDebt + amount <= config.debtCeiling, "VaultEngine: collateral ceiling");
        require(rateLimiter.checkMintLimit(msg.sender, amount), "VaultEngine: rate limit");

        uint256 collateralPrice = oracleAdapter.getPrice(collateral);
        uint256 collateralValue = (vault.collateralAmount * collateralPrice) / PRECISION;
        uint256 newDebt = vault.debtAmount + amount;
        uint256 newRatio = VaultMath.calculateCollateralRatio(collateralValue, newDebt);
        require(newRatio >= config.minCollateralRatio, "VaultEngine: below min ratio");

        vault.debtAmount = newDebt;
        config.totalDebt += amount;
        totalGlobalDebt += amount;

        rateLimiter.recordMint(msg.sender, amount);
        axusd.mint(msg.sender, amount);

        emit AXUSDMinted(msg.sender, collateral, amount);
    }

    function repayAXUSD(address collateral, uint256 amount) external override nonReentrant whenNotPaused {
        require(amount > 0, "VaultEngine: zero amount");
        
        Vault storage vault = vaults[msg.sender][collateral];
        require(vault.debtAmount > 0, "VaultEngine: no debt");

        _accrueInterest(msg.sender, collateral);

        uint256 repayAmount = VaultMath.min(amount, vault.debtAmount);
        
        vault.debtAmount -= repayAmount;
        collateralConfigs[collateral].totalDebt -= repayAmount;
        totalGlobalDebt -= repayAmount;

        axusd.burn(msg.sender, repayAmount);

        emit AXUSDRepaid(msg.sender, collateral, repayAmount);
    }

    function _accrueInterest(address user, address collateral) internal {
        Vault storage vault = vaults[user][collateral];
        if (vault.debtAmount == 0 || vault.lastAccrualTimestamp == 0) {
            vault.lastAccrualTimestamp = block.timestamp;
            return;
        }

        uint256 timeElapsed = block.timestamp - vault.lastAccrualTimestamp;
        if (timeElapsed == 0) return;

        uint256 interest = VaultMath.calculateAccruedInterest(
            vault.debtAmount,
            collateralConfigs[collateral].stabilityFee,
            timeElapsed
        );

        if (interest > 0) {
            vault.debtAmount += interest;
            collateralConfigs[collateral].totalDebt += interest;
            totalGlobalDebt += interest;
            accruedFees += interest;
            vault.accruedInterest += interest;
            emit InterestAccrued(user, collateral, interest);
        }

        vault.lastAccrualTimestamp = block.timestamp;
    }

    function liquidate(
        address owner,
        address collateral,
        uint256 debtToCover
    ) external nonReentrant whenNotPaused onlyRole(LIQUIDATOR_ROLE) {
        require(debtToCover > 0, "VaultEngine: zero debt");
        
        Vault storage vault = vaults[owner][collateral];
        require(vault.debtAmount > 0, "VaultEngine: no debt");

        _accrueInterest(owner, collateral);

        uint256 collateralPrice = oracleAdapter.getPrice(collateral);
        uint256 collateralValue = (vault.collateralAmount * collateralPrice) / PRECISION;
        uint256 currentRatio = VaultMath.calculateCollateralRatio(collateralValue, vault.debtAmount);
        
        require(currentRatio < collateralConfigs[collateral].liquidationThreshold, "VaultEngine: not liquidatable");

        uint256 maxDebtToCover = (vault.debtAmount * 5000) / BASIS_POINTS;
        uint256 actualDebtToCover = VaultMath.min(debtToCover, maxDebtToCover);
        actualDebtToCover = VaultMath.min(actualDebtToCover, vault.debtAmount);

        uint256 collateralToSeize = VaultMath.calculateLiquidationAmount(
            actualDebtToCover,
            collateralPrice,
            collateralConfigs[collateral].liquidationPenalty
        );
        collateralToSeize = VaultMath.min(collateralToSeize, vault.collateralAmount);

        vault.collateralAmount -= collateralToSeize;
        vault.debtAmount -= actualDebtToCover;
        collateralConfigs[collateral].totalDebt -= actualDebtToCover;
        totalGlobalDebt -= actualDebtToCover;

        axusd.burn(msg.sender, actualDebtToCover);
        IERC20(collateral).safeTransfer(msg.sender, collateralToSeize);

        emit VaultLiquidated(owner, collateral, msg.sender, actualDebtToCover, collateralToSeize);
    }

    function getAccruedFees() external view returns (uint256) {
        return accruedFees;
    }

    function clearFeeAccounting() external onlyRole(ADMIN_ROLE) {
        require(accruedFees > 0, "VaultEngine: no fees");
        uint256 fees = accruedFees;
        accruedFees = 0;
        emit FeesRouted(feeBurner, fees);
    }

    function getVault(address user, address collateral) external view override returns (Vault memory) {
        return vaults[user][collateral];
    }

    function getCollateralRatio(address user, address collateral) external view override returns (uint256) {
        Vault memory vault = vaults[user][collateral];
        if (vault.collateralAmount == 0) return 0;
        if (vault.debtAmount == 0) return type(uint256).max;

        uint256 collateralPrice = oracleAdapter.getPrice(collateral);
        uint256 collateralValue = (vault.collateralAmount * collateralPrice) / PRECISION;
        return VaultMath.calculateCollateralRatio(collateralValue, vault.debtAmount);
    }

    function isLiquidatable(address user, address collateral) external view override returns (bool) {
        Vault memory vault = vaults[user][collateral];
        if (vault.debtAmount == 0) return false;

        uint256 collateralPrice = oracleAdapter.getPrice(collateral);
        uint256 collateralValue = (vault.collateralAmount * collateralPrice) / PRECISION;
        uint256 ratio = VaultMath.calculateCollateralRatio(collateralValue, vault.debtAmount);
        return ratio < collateralConfigs[collateral].liquidationThreshold;
    }

    function setGlobalDebtCeiling(uint256 newCeiling) external onlyRole(ADMIN_ROLE) {
        globalDebtCeiling = newCeiling;
        emit GlobalDebtCeilingUpdated(newCeiling);
    }

    function setOracleAdapter(address newAdapter) external onlyRole(ADMIN_ROLE) {
        require(newAdapter != address(0), "VaultEngine: zero address");
        oracleAdapter = IOracleAdapter(newAdapter);
        emit OracleAdapterUpdated(newAdapter);
    }

    function setRateLimiter(address newLimiter) external onlyRole(ADMIN_ROLE) {
        require(newLimiter != address(0), "VaultEngine: zero address");
        rateLimiter = IRateLimiter(newLimiter);
        emit RateLimiterUpdated(newLimiter);
    }

    function setFeeBurner(address newFeeBurner) external onlyRole(ADMIN_ROLE) {
        feeBurner = newFeeBurner;
        emit FeeBurnerUpdated(newFeeBurner);
    }

    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function getCollateralConfig(address collateral) external view returns (CollateralConfig memory) {
        return collateralConfigs[collateral];
    }

    function getCollateralList() external view returns (address[] memory) {
        return collateralList;
    }
}
