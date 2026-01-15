// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract LandOptionRegistry is ERC1155, AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant STEWARD_ROLE = keccak256("STEWARD_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    enum OptionStatus { Draft, Active, OptionFeePaid, ExerciseReady, Exercised, Expired, Cancelled }

    struct LandOptionCore {
        uint256 optionId;
        uint256 acreage;
        uint256 purchasePrice;
        uint256 optionFee;
        uint256 optionPeriodDays;
        uint256 createdAt;
        uint256 expiresAt;
        OptionStatus status;
    }

    struct LandOptionMeta {
        string parcelId;
        string location;
        string ipfsMetadata;
        address landowner;
        address steward;
        uint256 totalShares;
        uint256 sharesSold;
        uint256 minInvestment;
        uint256 maxInvestment;
        bool regCFCompliant;
    }

    struct ShareHolder {
        uint256 shares;
        uint256 investedAmount;
        bool kycVerified;
        uint256 purchaseDate;
    }

    IERC20 public paymentToken;
    address public treasury;
    address public revenueRouter;

    uint256 public nextOptionId = 1;
    uint256 public constant MAX_REG_CF_RAISE = 5_000_000 * 10**18;
    uint256 public platformFeeBps = 250;

    mapping(uint256 => LandOptionCore) public optionsCore;
    mapping(uint256 => LandOptionMeta) public optionsMeta;
    mapping(uint256 => mapping(address => ShareHolder)) public shareholders;
    mapping(uint256 => address[]) public optionInvestors;
    mapping(address => bool) public kycVerified;

    struct CreateOptionParams {
        string parcelId;
        string location;
        uint256 acreage;
        uint256 purchasePrice;
        uint256 optionFee;
        uint256 optionPeriodDays;
        address landowner;
        uint256 totalShares;
        uint256 minInvestment;
        uint256 maxInvestment;
        bool regCFCompliant;
        string ipfsMetadata;
    }

    event LandOptionCreated(uint256 indexed optionId, address indexed landowner, uint256 purchasePrice);
    event OptionActivated(uint256 indexed optionId, uint256 expiresAt);
    event SharesPurchased(uint256 indexed optionId, address indexed investor, uint256 shares, uint256 amount);
    event OptionFeePaid(uint256 indexed optionId, address indexed payer, uint256 amount);
    event OptionExercised(uint256 indexed optionId, uint256 totalRaised);

    constructor(
        address _paymentToken,
        address _treasury,
        address _revenueRouter
    ) ERC1155("https://axiom.city/api/land-options/{id}.json") {
        require(_paymentToken != address(0), "Invalid payment token");
        require(_treasury != address(0), "Invalid treasury");
        
        paymentToken = IERC20(_paymentToken);
        treasury = _treasury;
        revenueRouter = _revenueRouter;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(COMPLIANCE_ROLE, msg.sender);
    }

    function createLandOption(CreateOptionParams calldata p) external onlyRole(STEWARD_ROLE) whenNotPaused returns (uint256) {
        require(p.landowner != address(0), "Invalid landowner");
        require(p.purchasePrice > 0, "Invalid purchase price");
        require(p.totalShares > 0, "Invalid total shares");
        require(p.optionPeriodDays >= 30 && p.optionPeriodDays <= 730, "Option period must be 30-730 days");
        
        if (p.regCFCompliant) {
            require(p.purchasePrice <= MAX_REG_CF_RAISE, "Exceeds Reg CF $5M limit");
        }

        uint256 optionId = nextOptionId++;
        
        LandOptionCore storage core = optionsCore[optionId];
        core.optionId = optionId;
        core.acreage = p.acreage;
        core.purchasePrice = p.purchasePrice;
        core.optionFee = p.optionFee;
        core.optionPeriodDays = p.optionPeriodDays;
        core.createdAt = block.timestamp;
        core.status = OptionStatus.Draft;

        LandOptionMeta storage meta = optionsMeta[optionId];
        meta.parcelId = p.parcelId;
        meta.location = p.location;
        meta.ipfsMetadata = p.ipfsMetadata;
        meta.landowner = p.landowner;
        meta.steward = msg.sender;
        meta.totalShares = p.totalShares;
        meta.minInvestment = p.minInvestment;
        meta.maxInvestment = p.maxInvestment;
        meta.regCFCompliant = p.regCFCompliant;

        emit LandOptionCreated(optionId, p.landowner, p.purchasePrice);
        return optionId;
    }

    function activateOption(uint256 optionId) external onlyRole(ADMIN_ROLE) {
        LandOptionCore storage core = optionsCore[optionId];
        require(core.status == OptionStatus.Draft, "Option not in draft");
        
        core.expiresAt = block.timestamp + (core.optionPeriodDays * 1 days);
        core.status = OptionStatus.Active;
        
        emit OptionActivated(optionId, core.expiresAt);
    }

    function purchaseShares(uint256 optionId, uint256 shareAmount) external nonReentrant whenNotPaused {
        LandOptionCore storage core = optionsCore[optionId];
        LandOptionMeta storage meta = optionsMeta[optionId];
        
        require(core.status == OptionStatus.Active, "Option not active");
        require(block.timestamp < core.expiresAt, "Option expired");
        require(shareAmount > 0, "Invalid share amount");
        require(meta.sharesSold + shareAmount <= meta.totalShares, "Exceeds available shares");

        uint256 pricePerShare = core.purchasePrice / meta.totalShares;
        uint256 investmentAmount = pricePerShare * shareAmount;

        require(investmentAmount >= meta.minInvestment, "Below minimum investment");
        
        ShareHolder storage holder = shareholders[optionId][msg.sender];
        uint256 totalInvestment = holder.investedAmount + investmentAmount;
        require(totalInvestment <= meta.maxInvestment, "Exceeds maximum investment");

        if (meta.regCFCompliant) {
            require(kycVerified[msg.sender], "KYC required for Reg CF");
        }

        require(paymentToken.transferFrom(msg.sender, address(this), investmentAmount), "Payment transfer failed");

        if (holder.shares == 0) {
            optionInvestors[optionId].push(msg.sender);
            holder.kycVerified = kycVerified[msg.sender];
            holder.purchaseDate = block.timestamp;
        }

        holder.shares += shareAmount;
        holder.investedAmount += investmentAmount;
        meta.sharesSold += shareAmount;

        _mint(msg.sender, optionId, shareAmount, "");

        emit SharesPurchased(optionId, msg.sender, shareAmount, investmentAmount);
    }

    function payOptionFee(uint256 optionId) external nonReentrant {
        LandOptionCore storage core = optionsCore[optionId];
        LandOptionMeta storage meta = optionsMeta[optionId];
        
        require(core.status == OptionStatus.Active, "Option not active");
        require(block.timestamp < core.expiresAt, "Option expired");

        uint256 platformFee = (core.optionFee * platformFeeBps) / 10000;
        uint256 landownerPayment = core.optionFee - platformFee;

        require(paymentToken.transferFrom(msg.sender, meta.landowner, landownerPayment), "Landowner payment failed");
        require(paymentToken.transferFrom(msg.sender, treasury, platformFee), "Platform fee payment failed");

        core.status = OptionStatus.OptionFeePaid;
        emit OptionFeePaid(optionId, msg.sender, core.optionFee);
    }

    function setKYCStatus(address user, bool verified) external onlyRole(COMPLIANCE_ROLE) {
        kycVerified[user] = verified;
    }

    function getOptionCore(uint256 optionId) external view returns (LandOptionCore memory) {
        return optionsCore[optionId];
    }

    function getOptionMeta(uint256 optionId) external view returns (LandOptionMeta memory) {
        return optionsMeta[optionId];
    }

    function getShareHolder(uint256 optionId, address investor) external view returns (ShareHolder memory) {
        return shareholders[optionId][investor];
    }

    function getInvestorCount(uint256 optionId) external view returns (uint256) {
        return optionInvestors[optionId].length;
    }

    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
