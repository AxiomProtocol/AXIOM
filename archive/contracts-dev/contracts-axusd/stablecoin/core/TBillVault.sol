// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IAxiomStable.sol";
import "../interfaces/ITBillVault.sol";

interface ITBillToken {
    function decimals() external view returns (uint8);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IYieldSource {
    function claimYield(address token) external returns (uint256);
    function pendingYield(address token) external view returns (uint256);
}

interface IGeniusComplianceTBill {
    function isYieldBlocked() external view returns (bool);
}

contract TBillVault is AccessControl, ReentrancyGuard, Pausable, ITBillVault {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant YIELD_MANAGER_ROLE = keccak256("YIELD_MANAGER_ROLE");

    IAxiomStable public immutable axusd;
    
    mapping(address => TBillAsset) public tbillAssets;
    address[] public supportedTokens;
    
    mapping(address => uint8) public tokenDecimals;
    mapping(address => uint256) public lastYieldTimestamp;
    mapping(address => uint256) public accumulatedYield;

    address public feeBurner;
    address public insuranceFund;
    uint256 public feeBurnerShare;
    uint256 public insuranceShare;

    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant PRECISION = 1e18;

    uint256 public totalMintedAgainstTBills;
    uint256 public maxMintRatio;

    IYieldSource public yieldSource;
    
    IGeniusComplianceTBill public geniusCompliance;
    bool public geniusComplianceEnabled;
    
    bool public maturityEnforcementEnabled;
    uint256 public maxMaturityDays;
    uint256 public constant GENIUS_ACT_MAX_MATURITY = 93 days;
    
    bool public holderYieldDistributionBlocked;

    event MaxMintRatioUpdated(uint256 newRatio);
    event FeeBurnerUpdated(address indexed newFeeBurner);
    event InsuranceFundUpdated(address indexed newFund);
    event SharesUpdated(uint256 feeBurnerShare, uint256 insuranceShare);
    event YieldSourceUpdated(address indexed newSource);
    event GeniusComplianceUpdated(address indexed compliance, bool enabled);

    constructor(
        address _axusd,
        address _feeBurner,
        address _insuranceFund,
        uint256 _maxMintRatio
    ) {
        require(_axusd != address(0), "TBillVault: zero axusd");
        require(_maxMintRatio >= 5000 && _maxMintRatio <= 10000, "TBillVault: invalid ratio");

        axusd = IAxiomStable(_axusd);
        feeBurner = _feeBurner;
        insuranceFund = _insuranceFund;
        maxMintRatio = _maxMintRatio;

        feeBurnerShare = 5000;
        insuranceShare = 2500;
        
        maturityEnforcementEnabled = true;
        maxMaturityDays = GENIUS_ACT_MAX_MATURITY;
        holderYieldDistributionBlocked = true;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(GUARDIAN_ROLE, msg.sender);
        _grantRole(YIELD_MANAGER_ROLE, msg.sender);
    }

    function setMaturityEnforcement(bool _enabled, uint256 _maxDays) external onlyRole(ADMIN_ROLE) {
        maturityEnforcementEnabled = _enabled;
        maxMaturityDays = _maxDays > 0 ? _maxDays : GENIUS_ACT_MAX_MATURITY;
        emit MaturityEnforcementUpdated(_enabled, maxMaturityDays);
    }

    function addTBillAsset(
        address token,
        string calldata name,
        uint256 expectedYieldRate,
        uint256 maturityDate
    ) external onlyRole(ADMIN_ROLE) {
        require(token != address(0), "TBillVault: zero token");
        require(tbillAssets[token].token == address(0), "TBillVault: already added");
        
        if (maturityEnforcementEnabled) {
            require(maturityDate > block.timestamp, "TBillVault: maturity must be in future");
            require(maturityDate <= block.timestamp + maxMaturityDays, "TBillVault: maturity exceeds GENIUS Act limit");
        }

        uint8 decimals = ITBillToken(token).decimals();
        tokenDecimals[token] = decimals;

        tbillAssets[token] = TBillAsset({
            token: token,
            name: name,
            balance: 0,
            yieldRate: expectedYieldRate,
            maturityDate: maturityDate,
            enabled: true
        });

        supportedTokens.push(token);
        lastYieldTimestamp[token] = block.timestamp;

        emit TBillAssetAdded(token, name, maturityDate);
    }

    function removeTBillAsset(address token) external onlyRole(ADMIN_ROLE) {
        require(tbillAssets[token].token != address(0), "TBillVault: not added");
        require(tbillAssets[token].balance == 0, "TBillVault: has balance");

        tbillAssets[token].enabled = false;
        emit TBillAssetRemoved(token);
    }

    function depositTBill(address token, uint256 amount) external override nonReentrant whenNotPaused onlyRole(ADMIN_ROLE) {
        require(amount > 0, "TBillVault: zero amount");
        TBillAsset storage asset = tbillAssets[token];
        require(asset.token != address(0), "TBillVault: unsupported token");
        require(asset.enabled, "TBillVault: token disabled");
        
        if (maturityEnforcementEnabled && asset.maturityDate > 0) {
            require(asset.maturityDate > block.timestamp, "TBillVault: asset has matured");
        }

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        asset.balance += amount;

        uint256 axusdValue = _toAxusdDecimals(token, amount);
        uint256 maxMintable = (axusdValue * maxMintRatio) / BASIS_POINTS;

        if (maxMintable > 0) {
            totalMintedAgainstTBills += maxMintable;
            axusd.mint(address(this), maxMintable);
        }

        emit TBillDeposited(token, amount, maxMintable);
    }

    function withdrawTBill(address token, uint256 amount) external override nonReentrant onlyRole(ADMIN_ROLE) {
        require(amount > 0, "TBillVault: zero amount");
        TBillAsset storage asset = tbillAssets[token];
        require(asset.token != address(0), "TBillVault: unsupported token");
        require(asset.balance >= amount, "TBillVault: insufficient balance");

        uint256 axusdValue = _toAxusdDecimals(token, amount);
        uint256 axusdToburn = (axusdValue * maxMintRatio) / BASIS_POINTS;

        if (axusdToburn > 0 && totalMintedAgainstTBills >= axusdToburn) {
            totalMintedAgainstTBills -= axusdToburn;
            axusd.burn(address(this), axusdToburn);
        }

        asset.balance -= amount;
        IERC20(token).safeTransfer(msg.sender, amount);

        emit TBillWithdrawn(token, amount);
    }

    function harvestYield(address token) external override nonReentrant onlyRole(YIELD_MANAGER_ROLE) returns (uint256) {
        TBillAsset storage asset = tbillAssets[token];
        require(asset.token != address(0), "TBillVault: unsupported token");

        uint256 yieldAmount = 0;

        if (address(yieldSource) != address(0)) {
            yieldAmount = yieldSource.claimYield(token);
        } else {
            uint256 timeElapsed = block.timestamp - lastYieldTimestamp[token];
            yieldAmount = (asset.balance * asset.yieldRate * timeElapsed) / (BASIS_POINTS * 365 days);
        }

        if (yieldAmount > 0) {
            accumulatedYield[token] += yieldAmount;
            lastYieldTimestamp[token] = block.timestamp;
            emit YieldHarvested(token, yieldAmount);
        }

        return yieldAmount;
    }

    function harvestAllYields() external override nonReentrant onlyRole(YIELD_MANAGER_ROLE) returns (uint256) {
        uint256 totalYield = 0;

        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            if (tbillAssets[token].enabled && tbillAssets[token].balance > 0) {
                uint256 yieldAmount = 0;

                if (address(yieldSource) != address(0)) {
                    yieldAmount = yieldSource.claimYield(token);
                } else {
                    uint256 timeElapsed = block.timestamp - lastYieldTimestamp[token];
                    yieldAmount = (tbillAssets[token].balance * tbillAssets[token].yieldRate * timeElapsed) / (BASIS_POINTS * 365 days);
                }

                if (yieldAmount > 0) {
                    accumulatedYield[token] += yieldAmount;
                    lastYieldTimestamp[token] = block.timestamp;
                    totalYield += _toAxusdDecimals(token, yieldAmount);
                    emit YieldHarvested(token, yieldAmount);
                }
            }
        }

        return totalYield;
    }

    function setGeniusCompliance(address _compliance, bool _enabled) external onlyRole(ADMIN_ROLE) {
        geniusCompliance = IGeniusComplianceTBill(_compliance);
        geniusComplianceEnabled = _enabled;
        emit GeniusComplianceUpdated(_compliance, _enabled);
    }

    function distributeYield() external nonReentrant onlyRole(YIELD_MANAGER_ROLE) {
        require(!holderYieldDistributionBlocked, "TBillVault: yield to holders blocked by GENIUS Act");
        
        if (geniusComplianceEnabled && address(geniusCompliance) != address(0)) {
            require(!geniusCompliance.isYieldBlocked(), "TBillVault: yield distribution blocked by GENIUS Act");
        }
        
        uint256 totalYieldValue = 0;

        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            if (accumulatedYield[token] > 0) {
                totalYieldValue += _toAxusdDecimals(token, accumulatedYield[token]);
                accumulatedYield[token] = 0;
            }
        }

        require(totalYieldValue > 0, "TBillVault: no yield to distribute");

        uint256 toFeeBurner = (totalYieldValue * feeBurnerShare) / BASIS_POINTS;
        uint256 toInsurance = (totalYieldValue * insuranceShare) / BASIS_POINTS;
        uint256 toReserves = totalYieldValue - toFeeBurner - toInsurance;

        if (toFeeBurner > 0 && feeBurner != address(0)) {
            axusd.mint(feeBurner, toFeeBurner);
        }

        if (toInsurance > 0 && insuranceFund != address(0)) {
            axusd.mint(insuranceFund, toInsurance);
        }

        if (toReserves > 0) {
            totalMintedAgainstTBills += toReserves;
        }

        emit YieldDistributed(totalYieldValue, toFeeBurner, toInsurance);
    }

    function _toAxusdDecimals(address token, uint256 amount) internal view returns (uint256) {
        uint8 decimals = tokenDecimals[token];
        if (decimals < 18) {
            return amount * (10 ** (18 - decimals));
        } else if (decimals > 18) {
            return amount / (10 ** (decimals - 18));
        }
        return amount;
    }

    function getTotalValue() external view override returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            if (tbillAssets[token].balance > 0) {
                total += _toAxusdDecimals(token, tbillAssets[token].balance);
            }
        }
        return total;
    }

    function getAssetValue(address token) external view override returns (uint256) {
        return _toAxusdDecimals(token, tbillAssets[token].balance);
    }

    function getSupportedAssets() external view override returns (address[] memory) {
        return supportedTokens;
    }

    function getPendingYield(address token) external view returns (uint256) {
        if (address(yieldSource) != address(0)) {
            return yieldSource.pendingYield(token);
        }
        TBillAsset memory asset = tbillAssets[token];
        uint256 timeElapsed = block.timestamp - lastYieldTimestamp[token];
        return (asset.balance * asset.yieldRate * timeElapsed) / (BASIS_POINTS * 365 days);
    }

    function setMaxMintRatio(uint256 _ratio) external onlyRole(ADMIN_ROLE) {
        require(_ratio >= 5000 && _ratio <= 10000, "TBillVault: invalid ratio");
        maxMintRatio = _ratio;
        emit MaxMintRatioUpdated(_ratio);
    }

    function setFeeBurner(address _feeBurner) external onlyRole(ADMIN_ROLE) {
        feeBurner = _feeBurner;
        emit FeeBurnerUpdated(_feeBurner);
    }

    function setInsuranceFund(address _fund) external onlyRole(ADMIN_ROLE) {
        insuranceFund = _fund;
        emit InsuranceFundUpdated(_fund);
    }

    function setShares(uint256 _feeBurnerShare, uint256 _insuranceShare) external onlyRole(ADMIN_ROLE) {
        require(_feeBurnerShare + _insuranceShare <= BASIS_POINTS, "TBillVault: shares exceed 100%");
        feeBurnerShare = _feeBurnerShare;
        insuranceShare = _insuranceShare;
        emit SharesUpdated(_feeBurnerShare, _insuranceShare);
    }

    function setYieldSource(address _source) external onlyRole(ADMIN_ROLE) {
        yieldSource = IYieldSource(_source);
        emit YieldSourceUpdated(_source);
    }

    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}
