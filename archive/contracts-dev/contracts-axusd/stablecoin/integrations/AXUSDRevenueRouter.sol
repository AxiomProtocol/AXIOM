// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ISEEDYieldDistributor {
    function depositRevenue(uint256 amount, string calldata source) external;
}

contract AXUSDRevenueRouter is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant REVENUE_SOURCE_ROLE = keccak256("REVENUE_SOURCE_ROLE");

    IERC20 public axusd;
    address public seedYieldDistributor;
    address public treasuryVault;
    address public backstopVault;

    uint256 public constant BPS_DENOMINATOR = 10000;

    uint16 public seedShareBps = 5000;
    uint16 public treasuryShareBps = 3000;
    uint16 public backstopShareBps = 2000;

    uint256 public totalRevenueRouted;
    uint256 public totalToSEED;
    uint256 public totalToTreasury;
    uint256 public totalToBackstop;

    struct RevenueRecord {
        uint256 recordId;
        address source;
        uint256 amount;
        uint256 toSEED;
        uint256 toTreasury;
        uint256 toBackstop;
        string sourceType;
        uint256 timestamp;
    }

    uint256 public totalRecords;
    mapping(uint256 => RevenueRecord) public records;
    mapping(address => uint256) public sourceRevenue;

    event RevenueRouted(
        uint256 indexed recordId,
        address indexed source,
        uint256 amount,
        uint256 toSEED,
        uint256 toTreasury,
        uint256 toBackstop
    );
    event SharesUpdated(uint16 seedShare, uint16 treasuryShare, uint16 backstopShare);
    event DistributorUpdated(address indexed newDistributor);

    constructor(
        address _axusd,
        address _seedYieldDistributor,
        address _treasuryVault,
        address _backstopVault
    ) {
        require(_axusd != address(0), "Invalid AXUSD");
        require(_seedYieldDistributor != address(0), "Invalid SEED distributor");
        require(_treasuryVault != address(0), "Invalid treasury");
        require(_backstopVault != address(0), "Invalid backstop");

        axusd = IERC20(_axusd);
        seedYieldDistributor = _seedYieldDistributor;
        treasuryVault = _treasuryVault;
        backstopVault = _backstopVault;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function routeRevenue(uint256 amount, string calldata sourceType) external onlyRole(REVENUE_SOURCE_ROLE) nonReentrant whenNotPaused {
        require(amount > 0, "Zero amount");

        axusd.safeTransferFrom(msg.sender, address(this), amount);

        uint256 toSEED = (amount * seedShareBps) / BPS_DENOMINATOR;
        uint256 toTreasury = (amount * treasuryShareBps) / BPS_DENOMINATOR;
        uint256 toBackstop = amount - toSEED - toTreasury;

        if (toSEED > 0) {
            axusd.approve(seedYieldDistributor, toSEED);
            ISEEDYieldDistributor(seedYieldDistributor).depositRevenue(toSEED, sourceType);
            totalToSEED += toSEED;
        }

        if (toTreasury > 0) {
            axusd.safeTransfer(treasuryVault, toTreasury);
            totalToTreasury += toTreasury;
        }

        if (toBackstop > 0) {
            axusd.safeTransfer(backstopVault, toBackstop);
            totalToBackstop += toBackstop;
        }

        totalRecords++;
        records[totalRecords] = RevenueRecord({
            recordId: totalRecords,
            source: msg.sender,
            amount: amount,
            toSEED: toSEED,
            toTreasury: toTreasury,
            toBackstop: toBackstop,
            sourceType: sourceType,
            timestamp: block.timestamp
        });

        sourceRevenue[msg.sender] += amount;
        totalRevenueRouted += amount;

        emit RevenueRouted(totalRecords, msg.sender, amount, toSEED, toTreasury, toBackstop);
    }

    function routePSMFees(uint256 amount) external onlyRole(REVENUE_SOURCE_ROLE) nonReentrant whenNotPaused {
        require(amount > 0, "Zero amount");
        axusd.safeTransferFrom(msg.sender, address(this), amount);

        uint256 toSEED = (amount * 8000) / BPS_DENOMINATOR;
        uint256 toBackstop = amount - toSEED;

        if (toSEED > 0) {
            axusd.approve(seedYieldDistributor, toSEED);
            ISEEDYieldDistributor(seedYieldDistributor).depositRevenue(toSEED, "PSM_FEES");
            totalToSEED += toSEED;
        }

        if (toBackstop > 0) {
            axusd.safeTransfer(backstopVault, toBackstop);
            totalToBackstop += toBackstop;
        }

        totalRevenueRouted += amount;
    }

    function routeKeyGrowRevenue(uint256 amount) external onlyRole(REVENUE_SOURCE_ROLE) nonReentrant whenNotPaused {
        require(amount > 0, "Zero amount");
        axusd.safeTransferFrom(msg.sender, address(this), amount);

        uint256 toSEED = (amount * 6000) / BPS_DENOMINATOR;
        uint256 toTreasury = (amount * 3000) / BPS_DENOMINATOR;
        uint256 toBackstop = amount - toSEED - toTreasury;

        if (toSEED > 0) {
            axusd.approve(seedYieldDistributor, toSEED);
            ISEEDYieldDistributor(seedYieldDistributor).depositRevenue(toSEED, "KEYGROW_REVENUE");
            totalToSEED += toSEED;
        }

        if (toTreasury > 0) {
            axusd.safeTransfer(treasuryVault, toTreasury);
            totalToTreasury += toTreasury;
        }

        if (toBackstop > 0) {
            axusd.safeTransfer(backstopVault, toBackstop);
            totalToBackstop += toBackstop;
        }

        totalRevenueRouted += amount;
    }

    function setShares(uint16 _seedShare, uint16 _treasuryShare, uint16 _backstopShare) external onlyRole(ADMIN_ROLE) {
        require(_seedShare + _treasuryShare + _backstopShare == BPS_DENOMINATOR, "Shares must equal 100%");
        seedShareBps = _seedShare;
        treasuryShareBps = _treasuryShare;
        backstopShareBps = _backstopShare;
        emit SharesUpdated(_seedShare, _treasuryShare, _backstopShare);
    }

    function setSEEDDistributor(address newDistributor) external onlyRole(ADMIN_ROLE) {
        require(newDistributor != address(0), "Invalid distributor");
        seedYieldDistributor = newDistributor;
        emit DistributorUpdated(newDistributor);
    }

    function getRevenueStats() external view returns (
        uint256 totalRouted,
        uint256 seedTotal,
        uint256 treasuryTotal,
        uint256 backstopTotal
    ) {
        return (totalRevenueRouted, totalToSEED, totalToTreasury, totalToBackstop);
    }

    function getRecord(uint256 recordId) external view returns (
        address source,
        uint256 amount,
        uint256 toSEED,
        uint256 toTreasury,
        uint256 toBackstop,
        string memory sourceType,
        uint256 timestamp
    ) {
        RevenueRecord storage record = records[recordId];
        return (
            record.source,
            record.amount,
            record.toSEED,
            record.toTreasury,
            record.toBackstop,
            record.sourceType,
            record.timestamp
        );
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function emergencyWithdraw(uint256 amount) external onlyRole(ADMIN_ROLE) {
        axusd.safeTransfer(treasuryVault, amount);
    }
}
