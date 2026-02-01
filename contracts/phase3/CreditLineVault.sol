// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IAxiomScoreSBT {
    function getScore(address user) external view returns (uint256);
    function hasSBT(address user) external view returns (bool);
}

contract CreditLineVault is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant LIQUIDATOR_ROLE = keccak256("LIQUIDATOR_ROLE");

    IERC20 public immutable axusd;
    address public treasury;
    IAxiomScoreSBT public scoreSBT;

    struct CollateralType {
        address token;
        string symbol;
        uint256 maxLTV;           // basis points (5000 = 50%)
        uint256 liquidationThreshold; // basis points (6500 = 65%)
        uint256 interestRateBps;  // annual interest in basis points (850 = 8.5%)
        uint256 minCollateral;    // minimum collateral amount (18 decimals)
        uint256 priceUsd;         // USD price with 8 decimals
        bool active;
    }

    struct Position {
        bytes32 collateralId;
        uint256 collateralAmount;
        uint256 borrowedAmount;
        uint256 lastAccrualTime;
        uint256 accruedInterest;
        bool active;
    }

    mapping(bytes32 => CollateralType) public collateralTypes;
    bytes32[] public collateralIds;
    mapping(address => Position[]) public positions;

    uint256 public totalBorrowed;
    uint256 public totalCollateralValue;
    uint256 public originationFeeBps = 100; // 1%
    uint256 public constant BPS = 10000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    event CollateralTypeAdded(bytes32 indexed id, address token, string symbol, uint256 maxLTV);
    event CollateralDeposited(address indexed user, bytes32 indexed collateralId, uint256 amount, uint256 positionIndex);
    event Borrowed(address indexed user, uint256 positionIndex, uint256 amount);
    event Repaid(address indexed user, uint256 positionIndex, uint256 amount);
    event CollateralWithdrawn(address indexed user, uint256 positionIndex, uint256 amount);
    event Liquidated(address indexed user, uint256 positionIndex, address indexed liquidator, uint256 collateralSeized);
    event PriceUpdated(bytes32 indexed collateralId, uint256 newPrice);

    constructor(
        address _axusd,
        address _treasury,
        address _scoreSBT
    ) {
        require(_axusd != address(0), "Invalid AXUSD address");
        require(_treasury != address(0), "Invalid treasury address");

        axusd = IERC20(_axusd);
        treasury = _treasury;
        scoreSBT = IAxiomScoreSBT(_scoreSBT);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
        _grantRole(LIQUIDATOR_ROLE, msg.sender);
    }

    function addCollateralType(
        bytes32 id,
        address token,
        string calldata symbol,
        uint256 maxLTV,
        uint256 liquidationThreshold,
        uint256 interestRateBps,
        uint256 minCollateral,
        uint256 initialPrice
    ) external onlyRole(ADMIN_ROLE) {
        require(collateralTypes[id].token == address(0), "Collateral type exists");
        require(token != address(0), "Invalid token");
        require(maxLTV < liquidationThreshold, "LTV must be below liquidation threshold");
        require(liquidationThreshold <= 9000, "Threshold too high");

        collateralTypes[id] = CollateralType({
            token: token,
            symbol: symbol,
            maxLTV: maxLTV,
            liquidationThreshold: liquidationThreshold,
            interestRateBps: interestRateBps,
            minCollateral: minCollateral,
            priceUsd: initialPrice,
            active: true
        });

        collateralIds.push(id);
        emit CollateralTypeAdded(id, token, symbol, maxLTV);
    }

    function depositCollateral(bytes32 collateralId, uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
        returns (uint256 positionIndex) 
    {
        CollateralType storage ct = collateralTypes[collateralId];
        require(ct.active, "Collateral type not active");
        require(amount >= ct.minCollateral, "Below minimum collateral");

        IERC20(ct.token).safeTransferFrom(msg.sender, address(this), amount);

        positions[msg.sender].push(Position({
            collateralId: collateralId,
            collateralAmount: amount,
            borrowedAmount: 0,
            lastAccrualTime: block.timestamp,
            accruedInterest: 0,
            active: true
        }));

        positionIndex = positions[msg.sender].length - 1;
        uint256 valueUsd = (amount * ct.priceUsd) / 1e8;
        totalCollateralValue += valueUsd;

        emit CollateralDeposited(msg.sender, collateralId, amount, positionIndex);
    }

    function addCollateral(uint256 positionIndex, uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        Position storage pos = positions[msg.sender][positionIndex];
        require(pos.active, "Position not active");

        CollateralType storage ct = collateralTypes[pos.collateralId];
        IERC20(ct.token).safeTransferFrom(msg.sender, address(this), amount);

        pos.collateralAmount += amount;
        uint256 valueUsd = (amount * ct.priceUsd) / 1e8;
        totalCollateralValue += valueUsd;

        emit CollateralDeposited(msg.sender, pos.collateralId, amount, positionIndex);
    }

    function borrow(uint256 positionIndex, uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        Position storage pos = positions[msg.sender][positionIndex];
        require(pos.active, "Position not active");
        
        _accrueInterest(pos);

        CollateralType storage ct = collateralTypes[pos.collateralId];
        uint256 collateralValueUsd = (pos.collateralAmount * ct.priceUsd) / 1e8;
        uint256 maxBorrow = (collateralValueUsd * ct.maxLTV) / BPS;
        uint256 totalDebt = pos.borrowedAmount + pos.accruedInterest;

        require(totalDebt + amount <= maxBorrow, "Exceeds max LTV");
        require(axusd.balanceOf(address(this)) >= amount, "Insufficient liquidity");

        uint256 originationFee = (amount * originationFeeBps) / BPS;
        uint256 netAmount = amount - originationFee;

        pos.borrowedAmount += amount;
        totalBorrowed += amount;

        if (originationFee > 0) {
            axusd.safeTransfer(treasury, originationFee);
        }
        axusd.safeTransfer(msg.sender, netAmount);

        emit Borrowed(msg.sender, positionIndex, amount);
    }

    function repay(uint256 positionIndex, uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        Position storage pos = positions[msg.sender][positionIndex];
        require(pos.active, "Position not active");

        _accrueInterest(pos);

        uint256 totalDebt = pos.borrowedAmount + pos.accruedInterest;
        uint256 repayAmount = amount > totalDebt ? totalDebt : amount;

        axusd.safeTransferFrom(msg.sender, address(this), repayAmount);

        if (repayAmount >= pos.accruedInterest) {
            uint256 principalRepayment = repayAmount - pos.accruedInterest;
            pos.accruedInterest = 0;
            pos.borrowedAmount -= principalRepayment;
            totalBorrowed -= principalRepayment;
        } else {
            pos.accruedInterest -= repayAmount;
        }

        emit Repaid(msg.sender, positionIndex, repayAmount);
    }

    function withdrawCollateral(uint256 positionIndex, uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        Position storage pos = positions[msg.sender][positionIndex];
        require(pos.active, "Position not active");
        require(pos.collateralAmount >= amount, "Insufficient collateral");

        _accrueInterest(pos);

        CollateralType storage ct = collateralTypes[pos.collateralId];
        uint256 newCollateralValue = ((pos.collateralAmount - amount) * ct.priceUsd) / 1e8;
        uint256 totalDebt = pos.borrowedAmount + pos.accruedInterest;

        if (totalDebt > 0) {
            uint256 requiredCollateral = (totalDebt * BPS) / ct.maxLTV;
            require(newCollateralValue >= requiredCollateral, "Would breach LTV");
        }

        pos.collateralAmount -= amount;
        uint256 valueUsd = (amount * ct.priceUsd) / 1e8;
        totalCollateralValue -= valueUsd;

        IERC20(ct.token).safeTransfer(msg.sender, amount);

        if (pos.collateralAmount == 0 && totalDebt == 0) {
            pos.active = false;
        }

        emit CollateralWithdrawn(msg.sender, positionIndex, amount);
    }

    function liquidate(address user, uint256 positionIndex) 
        external 
        nonReentrant 
        onlyRole(LIQUIDATOR_ROLE) 
    {
        Position storage pos = positions[user][positionIndex];
        require(pos.active, "Position not active");

        _accrueInterest(pos);

        require(_isLiquidatable(pos), "Position is healthy");

        CollateralType storage ct = collateralTypes[pos.collateralId];
        uint256 totalDebt = pos.borrowedAmount + pos.accruedInterest;

        axusd.safeTransferFrom(msg.sender, address(this), totalDebt);

        uint256 collateralSeized = pos.collateralAmount;
        totalBorrowed -= pos.borrowedAmount;
        uint256 valueUsd = (collateralSeized * ct.priceUsd) / 1e8;
        totalCollateralValue -= valueUsd;

        pos.borrowedAmount = 0;
        pos.accruedInterest = 0;
        pos.collateralAmount = 0;
        pos.active = false;

        IERC20(ct.token).safeTransfer(msg.sender, collateralSeized);

        emit Liquidated(user, positionIndex, msg.sender, collateralSeized);
    }

    function updatePrice(bytes32 collateralId, uint256 newPrice) external onlyRole(ORACLE_ROLE) {
        require(collateralTypes[collateralId].token != address(0), "Unknown collateral");
        collateralTypes[collateralId].priceUsd = newPrice;
        emit PriceUpdated(collateralId, newPrice);
    }

    function getHealthFactor(address user, uint256 positionIndex) external view returns (uint256) {
        Position storage pos = positions[user][positionIndex];
        if (!pos.active || pos.borrowedAmount == 0) return type(uint256).max;

        CollateralType storage ct = collateralTypes[pos.collateralId];
        uint256 collateralValueUsd = (pos.collateralAmount * ct.priceUsd) / 1e8;
        uint256 liquidationValue = (collateralValueUsd * ct.liquidationThreshold) / BPS;
        uint256 totalDebt = pos.borrowedAmount + _calculateAccruedInterest(pos);

        return (liquidationValue * 1e18) / totalDebt;
    }

    function getPosition(address user, uint256 positionIndex) 
        external 
        view 
        returns (
            bytes32 collateralId,
            uint256 collateralAmount,
            uint256 borrowedAmount,
            uint256 accruedInterest,
            bool active
        ) 
    {
        Position storage pos = positions[user][positionIndex];
        return (
            pos.collateralId,
            pos.collateralAmount,
            pos.borrowedAmount,
            pos.accruedInterest + _calculateAccruedInterest(pos),
            pos.active
        );
    }

    function getPositionCount(address user) external view returns (uint256) {
        return positions[user].length;
    }

    function getCollateralTypeCount() external view returns (uint256) {
        return collateralIds.length;
    }

    function _accrueInterest(Position storage pos) internal {
        uint256 newInterest = _calculateAccruedInterest(pos);
        pos.accruedInterest += newInterest;
        pos.lastAccrualTime = block.timestamp;
    }

    function _calculateAccruedInterest(Position storage pos) internal view returns (uint256) {
        if (pos.borrowedAmount == 0) return 0;

        CollateralType storage ct = collateralTypes[pos.collateralId];
        uint256 timeElapsed = block.timestamp - pos.lastAccrualTime;
        return (pos.borrowedAmount * ct.interestRateBps * timeElapsed) / (BPS * SECONDS_PER_YEAR);
    }

    function _isLiquidatable(Position storage pos) internal view returns (bool) {
        if (!pos.active || pos.borrowedAmount == 0) return false;

        CollateralType storage ct = collateralTypes[pos.collateralId];
        uint256 collateralValueUsd = (pos.collateralAmount * ct.priceUsd) / 1e8;
        uint256 liquidationValue = (collateralValueUsd * ct.liquidationThreshold) / BPS;
        uint256 totalDebt = pos.borrowedAmount + pos.accruedInterest;

        return totalDebt > liquidationValue;
    }

    function depositLiquidity(uint256 amount) external onlyRole(ADMIN_ROLE) {
        axusd.safeTransferFrom(msg.sender, address(this), amount);
    }

    function withdrawLiquidity(uint256 amount) external onlyRole(ADMIN_ROLE) {
        axusd.safeTransfer(treasury, amount);
    }

    function setOriginationFee(uint256 newFeeBps) external onlyRole(ADMIN_ROLE) {
        require(newFeeBps <= 500, "Fee too high");
        originationFeeBps = newFeeBps;
    }

    function setTreasury(address newTreasury) external onlyRole(ADMIN_ROLE) {
        require(newTreasury != address(0), "Invalid treasury");
        treasury = newTreasury;
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}
