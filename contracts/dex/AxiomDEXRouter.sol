// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IAxiomExchangeHubRouter {
    function swap(uint256 poolId, address tokenIn, uint256 amountIn, uint256 minAmountOut, uint256 deadline) external returns (uint256);
    function getAmountOut(uint256 poolId, address tokenIn, uint256 amountIn) external view returns (uint256);
    function getPoolCore(uint256 poolId) external view returns (
        address tokenA, address tokenB, uint256 reserveA, uint256 reserveB,
        uint256 totalLiquidity, uint256 lockedLiquidity, bool isActive
    );
    function pairToPoolId(address tokenA, address tokenB) external view returns (uint256);
    function totalPools() external view returns (uint256);
}

/**
 * @title AxiomDEXRouter
 * @author Axiom Protocol
 * @notice Multi-hop router with AXUSD priority routing
 * @dev Supports up to 4-hop routes, prioritizes AXUSD as intermediate
 */
contract AxiomDEXRouter is 
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint256 public constant MAX_HOPS = 4;
    uint256 public constant BASIS_POINTS = 10000;

    struct Route {
        uint256[] poolIds;
        address[] path;
        uint256 expectedOutput;
    }

    address public exchangeHub;
    address public treasurySafe;
    address public axusdToken;
    address public wethToken;
    address public axmToken;

    address[] public preferredBases;
    mapping(address => bool) public isPreferredBase;

    event SwapExecuted(
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 hops
    );
    event PreferredBaseAdded(address indexed token);
    event PreferredBaseRemoved(address indexed token);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        address _exchangeHub,
        address _treasurySafe,
        address _axusdToken,
        address _wethToken,
        address _axmToken
    ) public initializer {
        require(_exchangeHub != address(0) && _treasurySafe != address(0), "Zero addr");

        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        exchangeHub = _exchangeHub;
        treasurySafe = _treasurySafe;
        axusdToken = _axusdToken;
        wethToken = _wethToken;
        axmToken = _axmToken;

        _grantRole(DEFAULT_ADMIN_ROLE, _treasurySafe);
        _grantRole(ADMIN_ROLE, _treasurySafe);
        _grantRole(UPGRADER_ROLE, _treasurySafe);
        _grantRole(OPERATOR_ROLE, msg.sender);

        if (_axusdToken != address(0)) {
            preferredBases.push(_axusdToken);
            isPreferredBase[_axusdToken] = true;
        }
        if (_wethToken != address(0)) {
            preferredBases.push(_wethToken);
            isPreferredBase[_wethToken] = true;
        }
        if (_axmToken != address(0)) {
            preferredBases.push(_axmToken);
            isPreferredBase[_axmToken] = true;
        }
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 minAmountOut,
        address[] calldata path,
        uint256 deadline
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(path.length >= 2 && path.length <= MAX_HOPS + 1, "Invalid path");
        require(block.timestamp <= deadline, "Expired");

        IERC20(path[0]).safeTransferFrom(msg.sender, address(this), amountIn);

        uint256 currentAmount = amountIn;
        
        for (uint256 i = 0; i < path.length - 1; i++) {
            address tokenIn = path[i];
            address tokenOut = path[i + 1];
            
            uint256 poolId = IAxiomExchangeHubRouter(exchangeHub).pairToPoolId(tokenIn, tokenOut);
            require(poolId > 0, "Pool not found");

            IERC20(tokenIn).approve(exchangeHub, currentAmount);
            currentAmount = IAxiomExchangeHubRouter(exchangeHub).swap(
                poolId,
                tokenIn,
                currentAmount,
                0,
                deadline
            );
        }

        require(currentAmount >= minAmountOut, "Slippage exceeded");

        IERC20(path[path.length - 1]).safeTransfer(msg.sender, currentAmount);

        emit SwapExecuted(msg.sender, path[0], path[path.length - 1], amountIn, currentAmount, path.length - 1);

        return currentAmount;
    }

    function swapWithAutoRoute(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 deadline
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(tokenIn != tokenOut, "Same tokens");
        require(block.timestamp <= deadline, "Expired");

        Route memory bestRoute = getBestRoute(tokenIn, tokenOut, amountIn);
        require(bestRoute.path.length >= 2, "No route found");
        require(bestRoute.expectedOutput >= minAmountOut, "Output too low");

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        uint256 currentAmount = amountIn;
        
        for (uint256 i = 0; i < bestRoute.path.length - 1; i++) {
            address tIn = bestRoute.path[i];
            address tOut = bestRoute.path[i + 1];
            
            IERC20(tIn).approve(exchangeHub, currentAmount);
            currentAmount = IAxiomExchangeHubRouter(exchangeHub).swap(
                bestRoute.poolIds[i],
                tIn,
                currentAmount,
                0,
                deadline
            );
        }

        require(currentAmount >= minAmountOut, "Slippage exceeded");

        IERC20(tokenOut).safeTransfer(msg.sender, currentAmount);

        emit SwapExecuted(msg.sender, tokenIn, tokenOut, amountIn, currentAmount, bestRoute.path.length - 1);

        return currentAmount;
    }

    function getBestRoute(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) public view returns (Route memory bestRoute) {
        uint256 directPoolId = IAxiomExchangeHubRouter(exchangeHub).pairToPoolId(tokenIn, tokenOut);
        
        if (directPoolId > 0) {
            (,,,,,, bool isActive) = IAxiomExchangeHubRouter(exchangeHub).getPoolCore(directPoolId);
            if (isActive) {
                uint256 directOutput = IAxiomExchangeHubRouter(exchangeHub).getAmountOut(directPoolId, tokenIn, amountIn);
                
                bestRoute.poolIds = new uint256[](1);
                bestRoute.path = new address[](2);
                bestRoute.poolIds[0] = directPoolId;
                bestRoute.path[0] = tokenIn;
                bestRoute.path[1] = tokenOut;
                bestRoute.expectedOutput = directOutput;
            }
        }

        for (uint256 i = 0; i < preferredBases.length; i++) {
            address intermediate = preferredBases[i];
            if (intermediate == tokenIn || intermediate == tokenOut) continue;

            uint256 pool1 = IAxiomExchangeHubRouter(exchangeHub).pairToPoolId(tokenIn, intermediate);
            uint256 pool2 = IAxiomExchangeHubRouter(exchangeHub).pairToPoolId(intermediate, tokenOut);

            if (pool1 > 0 && pool2 > 0) {
                (,,,,,, bool active1) = IAxiomExchangeHubRouter(exchangeHub).getPoolCore(pool1);
                (,,,,,, bool active2) = IAxiomExchangeHubRouter(exchangeHub).getPoolCore(pool2);

                if (active1 && active2) {
                    uint256 midAmount = IAxiomExchangeHubRouter(exchangeHub).getAmountOut(pool1, tokenIn, amountIn);
                    uint256 finalOutput = IAxiomExchangeHubRouter(exchangeHub).getAmountOut(pool2, intermediate, midAmount);

                    if (finalOutput > bestRoute.expectedOutput) {
                        bestRoute.poolIds = new uint256[](2);
                        bestRoute.path = new address[](3);
                        bestRoute.poolIds[0] = pool1;
                        bestRoute.poolIds[1] = pool2;
                        bestRoute.path[0] = tokenIn;
                        bestRoute.path[1] = intermediate;
                        bestRoute.path[2] = tokenOut;
                        bestRoute.expectedOutput = finalOutput;
                    }
                }
            }
        }

        return bestRoute;
    }

    function getAmountsOut(
        uint256 amountIn,
        address[] calldata path
    ) external view returns (uint256[] memory amounts) {
        require(path.length >= 2, "Invalid path");
        
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;

        for (uint256 i = 0; i < path.length - 1; i++) {
            uint256 poolId = IAxiomExchangeHubRouter(exchangeHub).pairToPoolId(path[i], path[i + 1]);
            require(poolId > 0, "Pool not found");
            amounts[i + 1] = IAxiomExchangeHubRouter(exchangeHub).getAmountOut(poolId, path[i], amounts[i]);
        }
    }

    function addPreferredBase(address token) external onlyRole(OPERATOR_ROLE) {
        require(!isPreferredBase[token], "Already preferred");
        preferredBases.push(token);
        isPreferredBase[token] = true;
        emit PreferredBaseAdded(token);
    }

    function removePreferredBase(address token) external onlyRole(OPERATOR_ROLE) {
        require(isPreferredBase[token], "Not preferred");
        isPreferredBase[token] = false;
        
        for (uint256 i = 0; i < preferredBases.length; i++) {
            if (preferredBases[i] == token) {
                preferredBases[i] = preferredBases[preferredBases.length - 1];
                preferredBases.pop();
                break;
            }
        }
        emit PreferredBaseRemoved(token);
    }

    function setExchangeHub(address newHub) external onlyRole(ADMIN_ROLE) {
        require(newHub != address(0), "Zero addr");
        exchangeHub = newHub;
    }

    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    function getPreferredBases() external view returns (address[] memory) {
        return preferredBases;
    }

    function rescueTokens(address token, uint256 amount) external onlyRole(ADMIN_ROLE) {
        IERC20(token).safeTransfer(treasurySafe, amount);
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}

    uint256[40] private __gap;
}
