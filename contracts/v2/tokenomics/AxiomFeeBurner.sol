// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title AxiomFeeBurner
 * @notice Fee collection and AXM buyback/burn mechanism
 * @dev AIP-001 Implementation: 0.5% fee switch on National Bank products
 * 
 * Features:
 * - Collects 0.5% fee from banking products (loans, transfers, etc.)
 * - Automated buyback of AXM from DEX
 * - Burns purchased AXM to dead address
 * - Real yield mechanics for veAXM holders
 * - Transparent fee accounting
 * 
 * Fee Flow:
 * 1. Products send fees to this contract
 * 2. Fees accumulate until threshold met
 * 3. Buyback executes via DEX integration
 * 4. Purchased AXM burned to 0xdead
 */
contract AxiomFeeBurner is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant FEE_COLLECTOR_ROLE = keccak256("FEE_COLLECTOR_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    uint256 public constant FEE_RATE_BPS = 50;
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant MIN_BUYBACK_THRESHOLD = 1000 * 10**18;
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    IERC20 public axmToken;
    IERC20 public stableToken;
    address public dexHub;
    address public veAXMContract;
    address public treasuryVault;

    uint256 public totalFeesCollected;
    uint256 public totalAxmBurned;
    uint256 public totalBuybacks;
    uint256 public pendingFees;

    uint256 public veAXMShareBps = 5000;
    uint256 public buybackThreshold;

    struct BuybackRecord {
        uint256 buybackId;
        uint256 feesUsed;
        uint256 axmPurchased;
        uint256 axmBurned;
        uint256 axmToVeHolders;
        uint256 timestamp;
        uint256 pricePerAxm;
    }

    struct FeeRecord {
        uint256 recordId;
        address source;
        uint256 amount;
        string productType;
        uint256 timestamp;
    }

    mapping(uint256 => BuybackRecord) public buybackHistory;
    mapping(uint256 => FeeRecord) public feeRecords;
    uint256 public totalFeeRecords;

    event FeeCollected(address indexed source, uint256 amount, string productType);
    event BuybackExecuted(uint256 indexed buybackId, uint256 feesUsed, uint256 axmPurchased);
    event AxmBurned(uint256 amount, uint256 totalBurned);
    event VeAXMRewardsDistributed(uint256 amount);
    event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event VeShareUpdated(uint256 oldShare, uint256 newShare);

    constructor(
        address _axmToken,
        address _stableToken,
        address _dexHub,
        address _treasuryVault
    ) {
        require(_axmToken != address(0), "Invalid AXM token");
        require(_stableToken != address(0), "Invalid stable token");
        require(_treasuryVault != address(0), "Invalid treasury");
        
        axmToken = IERC20(_axmToken);
        stableToken = IERC20(_stableToken);
        dexHub = _dexHub;
        treasuryVault = _treasuryVault;
        buybackThreshold = MIN_BUYBACK_THRESHOLD;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(EXECUTOR_ROLE, msg.sender);
    }

    function collectFee(uint256 txAmount, string calldata productType) external onlyRole(FEE_COLLECTOR_ROLE) nonReentrant whenNotPaused returns (uint256) {
        uint256 feeAmount = (txAmount * FEE_RATE_BPS) / BPS_DENOMINATOR;
        require(feeAmount > 0, "Fee too small");
        
        stableToken.safeTransferFrom(msg.sender, address(this), feeAmount);
        
        totalFeeRecords++;
        feeRecords[totalFeeRecords] = FeeRecord({
            recordId: totalFeeRecords,
            source: msg.sender,
            amount: feeAmount,
            productType: productType,
            timestamp: block.timestamp
        });
        
        totalFeesCollected += feeAmount;
        pendingFees += feeAmount;
        
        emit FeeCollected(msg.sender, feeAmount, productType);
        
        return feeAmount;
    }

    function collectDirectFee(uint256 amount, string calldata productType) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be positive");
        
        stableToken.safeTransferFrom(msg.sender, address(this), amount);
        
        totalFeeRecords++;
        feeRecords[totalFeeRecords] = FeeRecord({
            recordId: totalFeeRecords,
            source: msg.sender,
            amount: amount,
            productType: productType,
            timestamp: block.timestamp
        });
        
        totalFeesCollected += amount;
        pendingFees += amount;
        
        emit FeeCollected(msg.sender, amount, productType);
    }

    function executeBuybackAndBurn(uint256 minAxmOut) external onlyRole(EXECUTOR_ROLE) nonReentrant whenNotPaused {
        require(pendingFees >= buybackThreshold, "Below threshold");
        require(dexHub != address(0), "DEX not configured");
        
        uint256 feesToUse = pendingFees;
        pendingFees = 0;
        
        stableToken.approve(dexHub, feesToUse);
        
        uint256 axmBalanceBefore = axmToken.balanceOf(address(this));
        
        (bool success, ) = dexHub.call(
            abi.encodeWithSignature(
                "swapExactTokensForTokens(address,address,uint256,uint256)",
                address(stableToken),
                address(axmToken),
                feesToUse,
                minAxmOut
            )
        );
        require(success, "Buyback failed");
        
        uint256 axmPurchased = axmToken.balanceOf(address(this)) - axmBalanceBefore;
        require(axmPurchased >= minAxmOut, "Slippage too high");
        
        uint256 toVeHolders = (axmPurchased * veAXMShareBps) / BPS_DENOMINATOR;
        uint256 toBurn = axmPurchased - toVeHolders;
        
        if (toBurn > 0) {
            axmToken.safeTransfer(BURN_ADDRESS, toBurn);
            totalAxmBurned += toBurn;
            emit AxmBurned(toBurn, totalAxmBurned);
        }
        
        if (toVeHolders > 0 && veAXMContract != address(0)) {
            axmToken.approve(veAXMContract, toVeHolders);
            (bool veSuccess, ) = veAXMContract.call(
                abi.encodeWithSignature("addRewards(uint256)", toVeHolders)
            );
            if (veSuccess) {
                emit VeAXMRewardsDistributed(toVeHolders);
            } else {
                axmToken.safeTransfer(treasuryVault, toVeHolders);
            }
        }
        
        totalBuybacks++;
        uint256 pricePerAxm = axmPurchased > 0 ? (feesToUse * 10**18) / axmPurchased : 0;
        
        buybackHistory[totalBuybacks] = BuybackRecord({
            buybackId: totalBuybacks,
            feesUsed: feesToUse,
            axmPurchased: axmPurchased,
            axmBurned: toBurn,
            axmToVeHolders: toVeHolders,
            timestamp: block.timestamp,
            pricePerAxm: pricePerAxm
        });
        
        emit BuybackExecuted(totalBuybacks, feesToUse, axmPurchased);
    }

    function manualBurn(uint256 amount) external onlyRole(ADMIN_ROLE) nonReentrant {
        require(amount > 0, "Amount must be positive");
        
        axmToken.safeTransferFrom(msg.sender, BURN_ADDRESS, amount);
        totalAxmBurned += amount;
        
        emit AxmBurned(amount, totalAxmBurned);
    }

    function getPendingFees() external view returns (uint256) {
        return pendingFees;
    }

    function getStats() external view returns (
        uint256 _totalCollected,
        uint256 _totalBurned,
        uint256 _totalBuybacks,
        uint256 _pending
    ) {
        return (totalFeesCollected, totalAxmBurned, totalBuybacks, pendingFees);
    }

    function getBuybackRecord(uint256 id) external view returns (BuybackRecord memory) {
        return buybackHistory[id];
    }

    function canExecuteBuyback() external view returns (bool) {
        return pendingFees >= buybackThreshold;
    }

    function setVeAXMContract(address _veAXM) external onlyRole(ADMIN_ROLE) {
        veAXMContract = _veAXM;
    }

    function setDexHub(address _dexHub) external onlyRole(ADMIN_ROLE) {
        require(_dexHub != address(0), "Invalid DEX");
        dexHub = _dexHub;
    }

    function setBuybackThreshold(uint256 newThreshold) external onlyRole(ADMIN_ROLE) {
        require(newThreshold >= MIN_BUYBACK_THRESHOLD, "Below minimum");
        uint256 oldThreshold = buybackThreshold;
        buybackThreshold = newThreshold;
        emit ThresholdUpdated(oldThreshold, newThreshold);
    }

    function setVeAXMShare(uint256 newShareBps) external onlyRole(ADMIN_ROLE) {
        require(newShareBps <= BPS_DENOMINATOR, "Invalid share");
        uint256 oldShare = veAXMShareBps;
        veAXMShareBps = newShareBps;
        emit VeShareUpdated(oldShare, newShareBps);
    }

    function grantFeeCollectorRole(address product) external onlyRole(ADMIN_ROLE) {
        _grantRole(FEE_COLLECTOR_ROLE, product);
    }

    function rescueTokens(address token, uint256 amount) external onlyRole(ADMIN_ROLE) {
        require(token != address(stableToken) || amount <= stableToken.balanceOf(address(this)) - pendingFees, "Cannot rescue pending fees");
        IERC20(token).safeTransfer(treasuryVault, amount);
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}
