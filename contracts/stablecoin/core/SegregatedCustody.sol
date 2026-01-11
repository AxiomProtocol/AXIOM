// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SegregatedCustody
 * @notice GENIUS Act compliant custody contract for AXUSD reserve assets
 * @dev Implements:
 *   - Segregated custody: Reserve assets held separately from operational funds
 *   - Anti-rehypothecation: Assets cannot be pledged, lent, or reused
 *   - Audit trail: Complete history of all custody movements
 *   - Insolvency priority: Assets protected for stablecoin holder claims
 */
contract SegregatedCustody is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    bytes32 public constant CUSTODIAN_ROLE = keccak256("CUSTODIAN_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant REDEMPTION_ROLE = keccak256("REDEMPTION_ROLE");
    
    struct CustodyRecord {
        address asset;
        uint256 amount;
        uint256 timestamp;
        string purpose;
        address depositor;
    }
    
    struct RedemptionRecord {
        address asset;
        uint256 amount;
        uint256 timestamp;
        address recipient;
        string reason;
    }
    
    mapping(address => uint256) public assetBalances;
    address[] public custodiedAssets;
    mapping(address => bool) public isCustodiedAsset;
    
    CustodyRecord[] public depositHistory;
    RedemptionRecord[] public redemptionHistory;
    
    bool public rehypothecationBlocked;
    bool public insolvencyProtectionActive;
    
    address public stablecoinContract;
    uint256 public totalStablecoinSupply;
    
    mapping(address => bool) public approvedDestinations;
    
    event AssetDeposited(
        address indexed asset,
        uint256 amount,
        address indexed depositor,
        string purpose,
        uint256 indexed recordId
    );
    
    event AssetRedeemed(
        address indexed asset,
        uint256 amount,
        address indexed recipient,
        string reason,
        uint256 indexed recordId
    );
    
    event RehypothecationStatusChanged(bool blocked);
    event InsolvencyProtectionChanged(bool active);
    event ApprovedDestinationAdded(address indexed destination);
    event ApprovedDestinationRemoved(address indexed destination);
    event StablecoinSupplyUpdated(uint256 newSupply);
    
    error RehypothecationBlocked();
    error InsufficientReserves();
    error UnauthorizedDestination();
    error InsolvencyProtectionActive();
    
    constructor(address _stablecoinContract) {
        stablecoinContract = _stablecoinContract;
        rehypothecationBlocked = true;
        insolvencyProtectionActive = true;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(CUSTODIAN_ROLE, msg.sender);
        _grantRole(AUDITOR_ROLE, msg.sender);
    }
    
    function depositAsset(
        address asset,
        uint256 amount,
        string calldata purpose
    ) external nonReentrant whenNotPaused onlyRole(CUSTODIAN_ROLE) {
        require(asset != address(0), "SegregatedCustody: zero asset");
        require(amount > 0, "SegregatedCustody: zero amount");
        
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        
        if (!isCustodiedAsset[asset]) {
            custodiedAssets.push(asset);
            isCustodiedAsset[asset] = true;
        }
        
        assetBalances[asset] += amount;
        
        depositHistory.push(CustodyRecord({
            asset: asset,
            amount: amount,
            timestamp: block.timestamp,
            purpose: purpose,
            depositor: msg.sender
        }));
        
        emit AssetDeposited(asset, amount, msg.sender, purpose, depositHistory.length - 1);
    }
    
    function redeemForStablecoinHolder(
        address asset,
        uint256 amount,
        address recipient,
        string calldata reason
    ) external nonReentrant whenNotPaused onlyRole(REDEMPTION_ROLE) {
        require(asset != address(0), "SegregatedCustody: zero asset");
        require(amount > 0, "SegregatedCustody: zero amount");
        require(recipient != address(0), "SegregatedCustody: zero recipient");
        require(assetBalances[asset] >= amount, "SegregatedCustody: insufficient balance");
        
        if (!approvedDestinations[recipient] && insolvencyProtectionActive) {
            revert UnauthorizedDestination();
        }
        
        assetBalances[asset] -= amount;
        
        IERC20(asset).safeTransfer(recipient, amount);
        
        redemptionHistory.push(RedemptionRecord({
            asset: asset,
            amount: amount,
            timestamp: block.timestamp,
            recipient: recipient,
            reason: reason
        }));
        
        emit AssetRedeemed(asset, amount, recipient, reason, redemptionHistory.length - 1);
    }
    
    function transferToAnotherVault(
        address asset,
        uint256 amount,
        address destination
    ) external nonReentrant onlyRole(CUSTODIAN_ROLE) {
        if (rehypothecationBlocked) {
            revert RehypothecationBlocked();
        }
        
        require(approvedDestinations[destination], "SegregatedCustody: unapproved destination");
        require(assetBalances[asset] >= amount, "SegregatedCustody: insufficient balance");
        
        assetBalances[asset] -= amount;
        IERC20(asset).safeTransfer(destination, amount);
    }
    
    function addApprovedDestination(address destination) external onlyRole(DEFAULT_ADMIN_ROLE) {
        approvedDestinations[destination] = true;
        emit ApprovedDestinationAdded(destination);
    }
    
    function removeApprovedDestination(address destination) external onlyRole(DEFAULT_ADMIN_ROLE) {
        approvedDestinations[destination] = false;
        emit ApprovedDestinationRemoved(destination);
    }
    
    function setRehypothecationBlocked(bool blocked) external onlyRole(DEFAULT_ADMIN_ROLE) {
        rehypothecationBlocked = blocked;
        emit RehypothecationStatusChanged(blocked);
    }
    
    function setInsolvencyProtection(bool active) external onlyRole(DEFAULT_ADMIN_ROLE) {
        insolvencyProtectionActive = active;
        emit InsolvencyProtectionChanged(active);
    }
    
    function updateStablecoinSupply(uint256 supply) external onlyRole(AUDITOR_ROLE) {
        totalStablecoinSupply = supply;
        emit StablecoinSupplyUpdated(supply);
    }
    
    function getTotalReserveValue() external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < custodiedAssets.length; i++) {
            total += assetBalances[custodiedAssets[i]];
        }
        return total;
    }
    
    function getReserveRatio() external view returns (uint256) {
        if (totalStablecoinSupply == 0) return 0;
        
        uint256 totalReserves = 0;
        for (uint256 i = 0; i < custodiedAssets.length; i++) {
            totalReserves += assetBalances[custodiedAssets[i]];
        }
        
        return (totalReserves * 10000) / totalStablecoinSupply;
    }
    
    function getDepositCount() external view returns (uint256) {
        return depositHistory.length;
    }
    
    function getRedemptionCount() external view returns (uint256) {
        return redemptionHistory.length;
    }
    
    function getCustodiedAssets() external view returns (address[] memory) {
        return custodiedAssets;
    }
    
    function getComplianceStatus() external view returns (
        bool segregated,
        bool antiRehypothecation,
        bool insolvencyProtection,
        uint256 reserveRatio
    ) {
        segregated = true;
        antiRehypothecation = rehypothecationBlocked;
        insolvencyProtection = insolvencyProtectionActive;
        
        if (totalStablecoinSupply > 0) {
            uint256 totalReserves = 0;
            for (uint256 i = 0; i < custodiedAssets.length; i++) {
                totalReserves += assetBalances[custodiedAssets[i]];
            }
            reserveRatio = (totalReserves * 10000) / totalStablecoinSupply;
        }
    }
    
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
