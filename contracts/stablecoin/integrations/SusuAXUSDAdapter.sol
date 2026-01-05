// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IPSM {
    function swapUSDCToAXUSD(uint256 usdcAmount) external returns (uint256);
    function swapAXUSDToUSDC(uint256 axusdAmount) external returns (uint256);
    function getQuoteUSDCToAXUSD(uint256 usdcAmount) external view returns (uint256);
}

interface ISusuPersonalVault {
    function createCircle(
        address token,
        uint256 targetMembers,
        uint256 contributionPerCycle,
        uint256 cycleDuration
    ) external returns (uint256);
}

contract SusuAXUSDAdapter is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    IERC20 public axusd;
    IERC20 public usdc;
    IPSM public psm;
    address public susuVault;
    address public treasuryVault;

    uint256 public constant BPS_DENOMINATOR = 10000;
    uint16 public protocolFeeBps = 50;

    uint256 public totalCirclesCreated;
    uint256 public totalAXUSDDeposited;
    uint256 public totalUSDCConverted;

    struct AXUSDCircle {
        uint256 circleId;
        uint256 susuCircleId;
        address organizer;
        uint256 targetMembers;
        uint256 contributionPerCycle;
        uint256 cycleDuration;
        uint256 totalDeposited;
        bool active;
        uint256 createdAt;
    }

    mapping(uint256 => AXUSDCircle) public circles;
    mapping(uint256 => mapping(address => uint256)) public memberDeposits;
    mapping(uint256 => address[]) public circleMembers;
    mapping(address => uint256) public userTotalDeposits;

    event CircleCreated(
        uint256 indexed circleId,
        address indexed organizer,
        uint256 targetMembers,
        uint256 contributionPerCycle
    );
    event DepositedAXUSD(uint256 indexed circleId, address indexed member, uint256 amount);
    event DepositedUSDC(uint256 indexed circleId, address indexed member, uint256 usdcAmount, uint256 axusdReceived);
    event PayoutProcessed(uint256 indexed circleId, address indexed recipient, uint256 amount);
    event CircleCompleted(uint256 indexed circleId);

    constructor(
        address _axusd,
        address _usdc,
        address _psm,
        address _susuVault,
        address _treasuryVault
    ) {
        require(_axusd != address(0), "Invalid AXUSD");
        require(_usdc != address(0), "Invalid USDC");
        require(_psm != address(0), "Invalid PSM");
        require(_susuVault != address(0), "Invalid SUSU vault");
        require(_treasuryVault != address(0), "Invalid treasury");

        axusd = IERC20(_axusd);
        usdc = IERC20(_usdc);
        psm = IPSM(_psm);
        susuVault = _susuVault;
        treasuryVault = _treasuryVault;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function createAXUSDCircle(
        uint256 targetMembers,
        uint256 contributionPerCycle,
        uint256 cycleDuration
    ) external whenNotPaused returns (uint256) {
        require(targetMembers >= 2 && targetMembers <= 20, "Invalid member count");
        require(contributionPerCycle >= 10 * 10**18, "Min contribution 10 AXUSD");
        require(cycleDuration >= 1 days && cycleDuration <= 90 days, "Invalid cycle duration");

        totalCirclesCreated++;
        uint256 circleId = totalCirclesCreated;

        circles[circleId] = AXUSDCircle({
            circleId: circleId,
            susuCircleId: 0,
            organizer: msg.sender,
            targetMembers: targetMembers,
            contributionPerCycle: contributionPerCycle,
            cycleDuration: cycleDuration,
            totalDeposited: 0,
            active: true,
            createdAt: block.timestamp
        });

        circleMembers[circleId].push(msg.sender);

        emit CircleCreated(circleId, msg.sender, targetMembers, contributionPerCycle);
        return circleId;
    }

    function depositAXUSD(uint256 circleId, uint256 amount) external nonReentrant whenNotPaused {
        AXUSDCircle storage circle = circles[circleId];
        require(circle.active, "Circle not active");
        require(amount >= circle.contributionPerCycle, "Below minimum");

        axusd.safeTransferFrom(msg.sender, address(this), amount);

        if (memberDeposits[circleId][msg.sender] == 0) {
            circleMembers[circleId].push(msg.sender);
        }

        memberDeposits[circleId][msg.sender] += amount;
        circle.totalDeposited += amount;
        userTotalDeposits[msg.sender] += amount;
        totalAXUSDDeposited += amount;

        emit DepositedAXUSD(circleId, msg.sender, amount);
    }

    function depositUSDC(uint256 circleId, uint256 usdcAmount) external nonReentrant whenNotPaused {
        AXUSDCircle storage circle = circles[circleId];
        require(circle.active, "Circle not active");

        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
        usdc.approve(address(psm), usdcAmount);

        uint256 axusdReceived = psm.swapUSDCToAXUSD(usdcAmount);
        require(axusdReceived >= circle.contributionPerCycle, "Converted amount below minimum");

        if (memberDeposits[circleId][msg.sender] == 0) {
            circleMembers[circleId].push(msg.sender);
        }

        memberDeposits[circleId][msg.sender] += axusdReceived;
        circle.totalDeposited += axusdReceived;
        userTotalDeposits[msg.sender] += axusdReceived;
        totalAXUSDDeposited += axusdReceived;
        totalUSDCConverted += usdcAmount;

        emit DepositedUSDC(circleId, msg.sender, usdcAmount, axusdReceived);
    }

    function getQuoteUSDCToAXUSD(uint256 usdcAmount) external view returns (uint256) {
        return psm.getQuoteUSDCToAXUSD(usdcAmount);
    }

    function processPayout(uint256 circleId, address recipient) external onlyRole(OPERATOR_ROLE) nonReentrant {
        AXUSDCircle storage circle = circles[circleId];
        require(circle.active, "Circle not active");
        require(memberDeposits[circleId][recipient] > 0, "Not a member");

        uint256 payoutAmount = circle.contributionPerCycle * circle.targetMembers;
        uint256 fee = (payoutAmount * protocolFeeBps) / BPS_DENOMINATOR;
        uint256 netPayout = payoutAmount - fee;

        require(axusd.balanceOf(address(this)) >= payoutAmount, "Insufficient balance");

        if (fee > 0) {
            axusd.safeTransfer(treasuryVault, fee);
        }
        axusd.safeTransfer(recipient, netPayout);

        emit PayoutProcessed(circleId, recipient, netPayout);
    }

    function completeCircle(uint256 circleId) external onlyRole(OPERATOR_ROLE) {
        AXUSDCircle storage circle = circles[circleId];
        require(circle.active, "Already inactive");
        circle.active = false;
        emit CircleCompleted(circleId);
    }

    function getCircleInfo(uint256 circleId) external view returns (
        address organizer,
        uint256 targetMembers,
        uint256 contributionPerCycle,
        uint256 totalDeposited,
        uint256 memberCount,
        bool active
    ) {
        AXUSDCircle storage circle = circles[circleId];
        return (
            circle.organizer,
            circle.targetMembers,
            circle.contributionPerCycle,
            circle.totalDeposited,
            circleMembers[circleId].length,
            circle.active
        );
    }

    function getMemberDeposit(uint256 circleId, address member) external view returns (uint256) {
        return memberDeposits[circleId][member];
    }

    function setProtocolFee(uint16 newFeeBps) external onlyRole(ADMIN_ROLE) {
        require(newFeeBps <= 500, "Fee too high");
        protocolFeeBps = newFeeBps;
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function emergencyWithdraw(address token, uint256 amount) external onlyRole(ADMIN_ROLE) {
        IERC20(token).safeTransfer(treasuryVault, amount);
    }
}
