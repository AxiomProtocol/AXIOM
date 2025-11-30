// SPDX-License-Identifier: No License
pragma solidity 0.8.25;

/*
    Sovran Wealth Fund (SWF)
    Verified Token Smart Contract
    Ethereum Mainnet Only
    Integrated with Solo Plan v2.0 Development
*/

import {IERC20, ERC20} from "./ERC20.sol";
import {ERC20Burnable} from "./ERC20Burnable.sol";
import {Ownable, Ownable2Step} from "./Ownable2Step.sol";
import {Mintable} from "./Mintable.sol";
import {Pausable} from "./Pausable.sol";
import {SafeERC20Remastered} from "./SafeERC20Remastered.sol";
import {ERC20Permit} from "./ERC20Permit.sol";
import {DividendTrackerFunctions} from "./CoinDividendTracker.sol";

import {Initializable} from "./Initializable.sol";
import "./IUniswapV2Factory.sol";
import "./IUniswapV2Pair.sol";
import "./IUniswapV2Router01.sol";
import "./IUniswapV2Router02.sol";

/*
    SOLO PLAN v2.0 Pre-Setup
    Wallets and Treasury Planning
    16 Wallets Hard-Defined Below
*/

address constant SOLO_TREASURY          = 0x000000000000000000000000000000000000dEaD; // Replace after deployment
address constant SOLO_WALLET_1          = 0x000000000000000000000000000000000000dEaD;
address constant SOLO_WALLET_2          = 0x000000000000000000000000000000000000dEaD;
address constant SOLO_WALLET_3          = 0x000000000000000000000000000000000000dEaD;
address constant SOLO_WALLET_4          = 0x000000000000000000000000000000000000dEaD;
address constant SOLO_WALLET_5          = 0x000000000000000000000000000000000000dEaD;
address constant SOLO_WALLET_6          = 0x000000000000000000000000000000000000dEaD;
address constant SOLO_WALLET_7          = 0x000000000000000000000000000000000000dEaD;
address constant SOLO_WALLET_8          = 0x000000000000000000000000000000000000dEaD;
address constant SOLO_WALLET_9          = 0x000000000000000000000000000000000000dEaD;
address constant SOLO_WALLET_10         = 0x000000000000000000000000000000000000dEaD;
address constant SOLO_WALLET_11         = 0x000000000000000000000000000000000000dEaD;
address constant SOLO_WALLET_12         = 0x000000000000000000000000000000000000dEaD;
address constant SOLO_WALLET_13         = 0x000000000000000000000000000000000000dEaD;
address constant SOLO_WALLET_14         = 0x000000000000000000000000000000000000dEaD;
address constant SOLO_WALLET_15         = 0x000000000000000000000000000000000000dEaD;
address constant SOLO_WALLET_16         = 0x000000000000000000000000000000000000dEaD;

// Sovran Wealth Fund Contract

contract Sovran_Wealth_Fund is
    ERC20,
    ERC20Burnable,
    Ownable2Step,
    Mintable,
    Pausable,
    ERC20Permit,
    DividendTrackerFunctions,
    Initializable
{
    using SafeERC20Remastered for IERC20;

    uint16 public swapThresholdRatio;
    uint256 private _liquidityPending;
    uint256 private _rewardsPending;

    uint16[3] public liquidityFees;
    uint16[3] public rewardsFees;
    uint16[3] public totalFees;

    bool private _swapping;
    bool public tradingEnabled;

    IUniswapV2Router02 public routerV2;
    address public pairV2;

    mapping(address => bool) public isExcludedFromFees;
    mapping(address => bool) public isExcludedFromLimits;
    mapping(address => bool) public AMMs;
    mapping(address => uint256) public lastTrade;
    mapping(address => bool) public isExcludedFromTradingRestriction;

    uint256 public tradeCooldownTime;

    error InvalidAmountToRecover(uint256 amount, uint256 maxAmount);
    error InvalidToken(address tokenAddress);
    error CannotDepositNativeCoins(address account);
    error InvalidSwapThresholdRatio(uint16 swapThresholdRatio);
    error CannotExceedMaxTotalFee(uint16 buyFee, uint16 sellFee, uint16 transferFee);
    error InvalidAMM(address AMM);
    error InvalidTradeCooldownTime(uint256 tradeCooldownTime);
    error AddressInCooldown(address account);
    error TradingAlreadyEnabled();
    error TradingNotEnabled();

    event SwapThresholdUpdated(uint16 swapThresholdRatio);
    event LiquidityFeesUpdated(uint16 buyFee, uint16 sellFee, uint16 transferFee);
    event LiquidityAdded(uint amountToken, uint amountCoin, uint liquidity);
    event ForceLiquidityAdded(uint256 leftoverTokens, uint256 unaddedTokens);
    event RewardsFeesUpdated(uint16 buyFee, uint16 sellFee, uint16 transferFee);
    event RewardsSent(uint256 amount);
    event ExcludeFromFees(address indexed account, bool isExcluded);
    event RouterV2Updated(address indexed routerV2);
    event AMMUpdated(address indexed AMM, bool isAMM);
    event ExcludeFromLimits(address indexed account, bool isExcluded);
    event TradeCooldownTimeUpdated(uint256 tradeCooldownTime);
    event TradingEnabled();
    event ExcludeFromTradingRestriction(address indexed account, bool isExcluded);

    constructor()
        ERC20(unicode"Sovran Wealth Fund", unicode"SWF")
        Ownable(msg.sender)
        Mintable(150000000000)
        ERC20Permit(unicode"Sovran Wealth Fund")
    {
        assembly { if iszero(extcodesize(caller())) { revert(0, 0) } }
        address supplyRecipient = 0xCe36333A88c2EA01f28f63131fA7dfa80AD021F6;
        
        updateSwapThreshold(50);

        liquidityFeesSetup(200, 200, 0);

        _deployDividendTracker(7200, 55000 * (10 ** decimals()) / 10, 5600);

        gasForProcessingSetup(300000);
        rewardsFeesSetup(200, 200, 0);
        _excludeFromDividends(supplyRecipient, true);
        _excludeFromDividends(address(this), true);
        _excludeFromDividends(address(dividendTracker), true);

        excludeFromFees(supplyRecipient, true);
        excludeFromFees(address(this), true); 

        _excludeFromLimits(supplyRecipient, true);
        _excludeFromLimits(address(this), true);
        _excludeFromLimits(address(0), true); 

        updateTradeCooldownTime(180);

        excludeFromTradingRestriction(supplyRecipient, true);
        excludeFromTradingRestriction(address(this), true);

        _mint(supplyRecipient, 100000000000 * (10 ** decimals()) / 10);
        _transferOwnership(0xCe36333A88c2EA01f28f63131fA7dfa80AD021F6);
    }
    
    /*
        This token is not upgradeable. Function afterConstructor finishes post-deployment setup.
    */
    function afterConstructor(address _router) initializer external {
        _updateRouterV2(_router);
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function recoverToken(uint256 amount) external onlyOwner {
        uint256 maxRecoverable = balanceOf(address(this)) - getAllPending();
        if (amount > maxRecoverable) revert InvalidAmountToRecover(amount, maxRecoverable);

        _update(address(this), msg.sender, amount);
    }

    function recoverForeignERC20(address tokenAddress, uint256 amount) external onlyOwner {
        if (tokenAddress == address(this)) revert InvalidToken(tokenAddress);

        IERC20(tokenAddress).safeTransfer(msg.sender, amount);
    }

    function updateSwapThreshold(uint16 _swapThresholdRatio) public onlyOwner {
        if (_swapThresholdRatio == 0 || _swapThresholdRatio > 500) revert InvalidSwapThresholdRatio(_swapThresholdRatio);

        swapThresholdRatio = _swapThresholdRatio;
        
        emit SwapThresholdUpdated(_swapThresholdRatio);
    }

    function getSwapThresholdAmount() public view returns (uint256) {
        return balanceOf(pairV2) * swapThresholdRatio / 10000;
    }

    function getAllPending() public view returns (uint256) {
        return _liquidityPending + _rewardsPending;
    }
    
    function _swapTokensForCoin(uint256 tokenAmount) private {
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = routerV2.WETH();

        _approve(address(this), address(routerV2), tokenAmount);

        routerV2.swapExactTokensForETHSupportingFeeOnTransferTokens(tokenAmount, 0, path, address(this), block.timestamp);
    }

    function _swapAndLiquify(uint256 tokenAmount) private returns (uint256 leftover) {
        uint256 halfAmount = tokenAmount / 2;
        uint256 otherHalf = tokenAmount - halfAmount;

        _swapTokensForCoin(halfAmount);

        uint256 coinBalance = address(this).balance;

        if (coinBalance > 0) {
            (uint amountToken, uint amountCoin, uint liquidity) = _addLiquidity(otherHalf, coinBalance);

            emit LiquidityAdded(amountToken, amountCoin, liquidity);

            return otherHalf - amountToken;
        } else {
            return otherHalf;
        }
    }

    function _addLiquidity(uint256 tokenAmount, uint256 coinAmount) private returns (uint, uint, uint) {
        _approve(address(this), address(routerV2), tokenAmount);

        return routerV2.addLiquidityETH{value: coinAmount}(address(this), tokenAmount, 0, 0, address(0xdead), block.timestamp);
    }

    function addLiquidityFromLeftoverTokens() external {
        uint256 leftoverTokens = balanceOf(address(this)) - getAllPending();

        uint256 unaddedTokens = _swapAndLiquify(leftoverTokens);

        emit ForceLiquidityAdded(leftoverTokens, unaddedTokens);
    }

    function liquidityFeesSetup(uint16 _buyFee, uint16 _sellFee, uint16 _transferFee) public onlyOwner {
        totalFees[0] = totalFees[0] - liquidityFees[0] + _buyFee;
        totalFees[1] = totalFees[1] - liquidityFees[1] + _sellFee;
        totalFees[2] = totalFees[2] - liquidityFees[2] + _transferFee;
        if (totalFees[0] > 2500 || totalFees[1] > 2500 || totalFees[2] > 2500) revert CannotExceedMaxTotalFee(totalFees[0], totalFees[1], totalFees[2]);

        liquidityFees = [_buyFee, _sellFee, _transferFee];

        emit LiquidityFeesUpdated(_buyFee, _sellFee, _transferFee);
    }
    
    function _sendDividends(uint256 tokenAmount) private {
        _swapTokensForCoin(tokenAmount);

        uint256 dividends = address(this).balance;
        
        if (dividends > 0) {
            (bool success,) = payable(address(dividendTracker)).call{value: dividends}("");
            if (success) emit RewardsSent(dividends);
        }
    }

    function excludeFromDividends(address account, bool isExcluded) external onlyOwner {
        _excludeFromDividends(account, isExcluded);
    }

    function _excludeFromDividends(address account, bool isExcluded) internal override {
        dividendTracker.excludeFromDividends(account, balanceOf(account), isExcluded);
    }

    function rewardsFeesSetup(uint16 _buyFee, uint16 _sellFee, uint16 _transferFee) public onlyOwner {
        totalFees[0] = totalFees[0] - rewardsFees[0] + _buyFee;
        totalFees[1] = totalFees[1] - rewardsFees[1] + _sellFee;
        totalFees[2] = totalFees[2] - rewardsFees[2] + _transferFee;
        if (totalFees[0] > 2500 || totalFees[1] > 2500 || totalFees[2] > 2500) revert CannotExceedMaxTotalFee(totalFees[0], totalFees[1], totalFees[2]);

        rewardsFees = [_buyFee, _sellFee, _transferFee];

        emit RewardsFeesUpdated(_buyFee, _sellFee, _transferFee);
    }

    function excludeFromFees(address account, bool isExcluded) public onlyOwner {
        isExcludedFromFees[account] = isExcluded;
        
        emit ExcludeFromFees(account, isExcluded);
    }

    function _updateRouterV2(address router) private {
        routerV2 = IUniswapV2Router02(router);
        pairV2 = IUniswapV2Factory(routerV2.factory()).createPair(address(this), routerV2.WETH());
        
        _setAMM(router, true);
        _setAMM(pairV2, true);

        emit RouterV2Updated(router);
    }

    function setAMM(address AMM, bool isAMM) external onlyOwner {
        if (AMM == pairV2 || AMM == address(routerV2)) revert InvalidAMM(AMM);

        _setAMM(AMM, isAMM);
    }

    function _setAMM(address AMM, bool isAMM) private {
        AMMs[AMM] = isAMM;

        if (isAMM) { 
            _excludeFromDividends(AMM, true);
            _excludeFromLimits(AMM, true);
        }

        emit AMMUpdated(AMM, isAMM);
    }

    function excludeFromLimits(address account, bool isExcluded) external onlyOwner {
        _excludeFromLimits(account, isExcluded);
    }

    function _excludeFromLimits(address account, bool isExcluded) internal {
        isExcludedFromLimits[account] = isExcluded;
        emit ExcludeFromLimits(account, isExcluded);
    }

    function updateTradeCooldownTime(uint256 _tradeCooldownTime) public onlyOwner {
        if (_tradeCooldownTime > 12 hours) revert InvalidTradeCooldownTime(_tradeCooldownTime);
            
        tradeCooldownTime = _tradeCooldownTime;
        
        emit TradeCooldownTimeUpdated(_tradeCooldownTime);
    }

    function enableTrading() external onlyOwner {
        if (tradingEnabled) revert TradingAlreadyEnabled();

        tradingEnabled = true;
        
        emit TradingEnabled();
    }

    function excludeFromTradingRestriction(address account, bool isExcluded) public onlyOwner {
        isExcludedFromTradingRestriction[account] = isExcluded;
        
        emit ExcludeFromTradingRestriction(account, isExcluded);
    }

    function _update(address from, address to, uint256 amount)
        internal
        override
    {
        _beforeTokenUpdate(from, to, amount);
        
        if (from != address(0) && to != address(0)) {
            if (!_swapping && amount > 0 && !isExcludedFromFees[from] && !isExcludedFromFees[to]) {
                uint256 fees = 0;
                uint8 txType = 3;
                
                if (AMMs[from] && !AMMs[to]) {
                    if (totalFees[0] > 0) txType = 0;
                }
                else if (AMMs[to] && !AMMs[from]) {
                    if (totalFees[1] > 0) txType = 1;
                }
                else if (!AMMs[from] && !AMMs[to]) {
                    if (totalFees[2] > 0) txType = 2;
                }
                
                if (txType < 3) {
                    fees = amount * totalFees[txType] / 10000;
                    amount -= fees;
                    
                    _liquidityPending += fees * liquidityFees[txType] / totalFees[txType];
                    _rewardsPending += fees * rewardsFees[txType] / totalFees[txType];
                }

                if (fees > 0) {
                    super._update(from, address(this), fees);
                }
            }
            
            bool canSwap = getAllPending() >= getSwapThresholdAmount() && balanceOf(pairV2) > 0;
            
            if (!_swapping && from != pairV2 && from != address(routerV2) && canSwap) {
                _swapping = true;
                
                if (_liquidityPending > 0) {
                    _swapAndLiquify(_liquidityPending);
                    _liquidityPending = 0;
                }

                if (_rewardsPending > 0 && getNumberOfDividendTokenHolders() > 0) {
                    _sendDividends(_rewardsPending);
                    _rewardsPending = 0;
                }

                _swapping = false;
            }
        }

        super._update(from, to, amount);
        
        _afterTokenUpdate(from, to, amount);
        
        if (from != address(0)) dividendTracker.setBalance(from, balanceOf(from));
        if (to != address(0)) dividendTracker.setBalance(to, balanceOf(to));
        
        if (!_swapping) try dividendTracker.process(gasForProcessing) {} catch {}
    }

    function _beforeTokenUpdate(address from, address to, uint256 amount)
        internal
        view
        whenNotPaused
    {
        if(!isExcludedFromLimits[from] && lastTrade[from] + tradeCooldownTime > block.timestamp) revert AddressInCooldown(from);
        if(!isExcludedFromLimits[to] && lastTrade[to] + tradeCooldownTime > block.timestamp) revert AddressInCooldown(to);

        // Disallow DEX trading before owner enables it
        if (!tradingEnabled) {
            if ((AMMs[from] && !AMMs[to] && !isExcludedFromTradingRestriction[to]) || (AMMs[to] && !AMMs[from] && !isExcludedFromTradingRestriction[from])) {
                revert TradingNotEnabled();
            }
        }
    }

    function _afterTokenUpdate(address from, address to, uint256 amount)
        internal
    {
        if (from == address(0)) {
            // Minting
        }

        if (AMMs[from] && !isExcludedFromLimits[to]) lastTrade[to] = block.timestamp;
        else if (AMMs[to] && !isExcludedFromLimits[from]) lastTrade[from] = block.timestamp;
    }
}