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

    enum OptionStatus { 
        Draft,
        Active,
        OptionFeePaid,
        ExerciseReady,
        Exercised,
        Expired,
        Cancelled 
    }

    struct LandOption {
        uint256 optionId;
        string parcelId;
        string location;
        uint256 acreage;
        uint256 purchasePrice;
        uint256 optionFee;
        uint256 optionPeriodDays;
        uint256 createdAt;
        uint256 expiresAt;
        address landowner;
        address steward;
        OptionStatus status;
        uint256 totalShares;
        uint256 sharesSold;
        uint256 minInvestment;
        uint256 maxInvestment;
        bool regCFCompliant;
        string ipfsMetadata;
    }

    struct ShareHolder {
        uint256 shares;
        uint256 investedAmount;
        bool kycVerified;
        bool accredited;
        uint256 purchaseDate;
    }

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

    IERC20 public paymentToken;
    address public treasury;
    address public revenueRouter;

    uint256 public nextOptionId = 1;
    uint256 public constant MAX_REG_CF_RAISE = 5_000_000 * 10**18;
    uint256 public constant MAX_NON_ACCREDITED_INVESTMENT = 124_000 * 10**18;
    uint256 public platformFeeBps = 250;

    mapping(uint256 => LandOption) public options;
    mapping(uint256 => mapping(address => ShareHolder)) public shareholders;
    mapping(uint256 => address[]) public optionInvestors;
    mapping(address => bool) public kycVerified;
    mapping(address => bool) public accreditedInvestors;
    mapping(address => uint256) public totalInvestedByAddress;

    event LandOptionCreated(uint256 indexed optionId, string parcelId, address indexed landowner, uint256 purchasePrice);
    event OptionActivated(uint256 indexed optionId, uint256 expiresAt);
    event SharesPurchased(uint256 indexed optionId, address indexed investor, uint256 shares, uint256 amount);
    event OptionFeePaid(uint256 indexed optionId, address indexed payer, uint256 amount);
    event OptionExercised(uint256 indexed optionId, uint256 totalRaised);
    event OptionExpired(uint256 indexed optionId);
    event OptionCancelled(uint256 indexed optionId, string reason);
    event RefundIssued(uint256 indexed optionId, address indexed investor, uint256 amount);
    event KYCStatusUpdated(address indexed user, bool verified);
    event AccreditationUpdated(address indexed user, bool accredited);

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

    function createLandOption(
        CreateOptionParams calldata params
    ) external onlyRole(STEWARD_ROLE) whenNotPaused returns (uint256) {
        require(params.landowner != address(0), "Invalid landowner");
        require(params.purchasePrice > 0, "Invalid purchase price");
        require(params.totalShares > 0, "Invalid total shares");
        require(params.optionPeriodDays >= 30 && params.optionPeriodDays <= 730, "Option period must be 30-730 days");
        
        if (params.regCFCompliant) {
            require(params.purchasePrice <= MAX_REG_CF_RAISE, "Exceeds Reg CF $5M limit");
        }

        uint256 optionId = nextOptionId++;
        LandOption storage opt = options[optionId];
        
        opt.optionId = optionId;
        opt.parcelId = params.parcelId;
        opt.location = params.location;
        opt.acreage = params.acreage;
        opt.purchasePrice = params.purchasePrice;
        opt.optionFee = params.optionFee;
        opt.optionPeriodDays = params.optionPeriodDays;
        opt.createdAt = block.timestamp;
        opt.expiresAt = 0;
        opt.landowner = params.landowner;
        opt.steward = msg.sender;
        opt.status = OptionStatus.Draft;
        opt.totalShares = params.totalShares;
        opt.sharesSold = 0;
        opt.minInvestment = params.minInvestment;
        opt.maxInvestment = params.maxInvestment;
        opt.regCFCompliant = params.regCFCompliant;
        opt.ipfsMetadata = params.ipfsMetadata;

        emit LandOptionCreated(optionId, params.parcelId, params.landowner, params.purchasePrice);
        return optionId;
    }

    function activateOption(uint256 optionId) external onlyRole(ADMIN_ROLE) {
        LandOption storage option = options[optionId];
        require(option.status == OptionStatus.Draft, "Option not in draft");
        
        option.status = OptionStatus.Active;
        option.expiresAt = block.timestamp + (option.optionPeriodDays * 1 days);
        
        emit OptionActivated(optionId, option.expiresAt);
    }

    function purchaseShares(
        uint256 optionId,
        uint256 shareAmount
    ) external nonReentrant whenNotPaused {
        LandOption storage option = options[optionId];
        require(option.status == OptionStatus.Active || option.status == OptionStatus.OptionFeePaid, "Option not active");
        require(block.timestamp < option.expiresAt, "Option expired");
        require(shareAmount > 0, "Invalid share amount");
        require(option.sharesSold + shareAmount <= option.totalShares, "Exceeds available shares");

        uint256 pricePerShare = option.purchasePrice / option.totalShares;
        uint256 investmentAmount = pricePerShare * shareAmount;

        require(investmentAmount >= option.minInvestment, "Below minimum investment");
        
        ShareHolder storage holder = shareholders[optionId][msg.sender];
        uint256 totalInvestment = holder.investedAmount + investmentAmount;
        require(totalInvestment <= option.maxInvestment, "Exceeds maximum investment");

        if (option.regCFCompliant) {
            require(kycVerified[msg.sender], "KYC required for Reg CF");
            if (!accreditedInvestors[msg.sender]) {
                require(
                    totalInvestedByAddress[msg.sender] + investmentAmount <= MAX_NON_ACCREDITED_INVESTMENT,
                    "Non-accredited investor limit exceeded"
                );
            }
        }

        require(
            paymentToken.transferFrom(msg.sender, address(this), investmentAmount),
            "Payment transfer failed"
        );

        if (holder.shares == 0) {
            optionInvestors[optionId].push(msg.sender);
            holder.kycVerified = kycVerified[msg.sender];
            holder.accredited = accreditedInvestors[msg.sender];
            holder.purchaseDate = block.timestamp;
        }

        holder.shares += shareAmount;
        holder.investedAmount += investmentAmount;
        option.sharesSold += shareAmount;
        totalInvestedByAddress[msg.sender] += investmentAmount;

        _mint(msg.sender, optionId, shareAmount, "");

        emit SharesPurchased(optionId, msg.sender, shareAmount, investmentAmount);
    }

    function payOptionFee(uint256 optionId) external nonReentrant {
        LandOption storage option = options[optionId];
        require(option.status == OptionStatus.Active, "Option not active");
        require(block.timestamp < option.expiresAt, "Option expired");

        uint256 platformFee = (option.optionFee * platformFeeBps) / 10000;
        uint256 landownerPayment = option.optionFee - platformFee;

        require(
            paymentToken.transferFrom(msg.sender, option.landowner, landownerPayment),
            "Landowner payment failed"
        );
        require(
            paymentToken.transferFrom(msg.sender, treasury, platformFee),
            "Platform fee payment failed"
        );

        option.status = OptionStatus.OptionFeePaid;
        emit OptionFeePaid(optionId, msg.sender, option.optionFee);
    }

    function exerciseOption(uint256 optionId) external onlyRole(ADMIN_ROLE) nonReentrant {
        LandOption storage option = options[optionId];
        require(
            option.status == OptionStatus.OptionFeePaid || option.status == OptionStatus.ExerciseReady,
            "Option not ready for exercise"
        );
        require(option.sharesSold == option.totalShares, "Not fully funded");

        uint256 totalRaised = option.purchasePrice;
        uint256 platformFee = (totalRaised * platformFeeBps) / 10000;
        uint256 landownerPayment = totalRaised - platformFee;

        require(
            paymentToken.transfer(option.landowner, landownerPayment),
            "Landowner payment failed"
        );
        
        if (revenueRouter != address(0)) {
            require(
                paymentToken.transfer(revenueRouter, platformFee),
                "Revenue router payment failed"
            );
        } else {
            require(
                paymentToken.transfer(treasury, platformFee),
                "Treasury payment failed"
            );
        }

        option.status = OptionStatus.Exercised;
        emit OptionExercised(optionId, totalRaised);
    }

    function expireOption(uint256 optionId) external {
        LandOption storage option = options[optionId];
        require(option.status == OptionStatus.Active || option.status == OptionStatus.OptionFeePaid, "Cannot expire");
        require(block.timestamp >= option.expiresAt, "Option not yet expired");

        option.status = OptionStatus.Expired;
        emit OptionExpired(optionId);
    }

    function claimRefund(uint256 optionId) external nonReentrant {
        LandOption storage option = options[optionId];
        require(
            option.status == OptionStatus.Expired || option.status == OptionStatus.Cancelled,
            "Refunds not available"
        );

        ShareHolder storage holder = shareholders[optionId][msg.sender];
        require(holder.investedAmount > 0, "No investment to refund");

        uint256 refundAmount = holder.investedAmount;
        holder.investedAmount = 0;
        
        uint256 sharesToBurn = holder.shares;
        holder.shares = 0;

        _burn(msg.sender, optionId, sharesToBurn);

        require(
            paymentToken.transfer(msg.sender, refundAmount),
            "Refund transfer failed"
        );

        emit RefundIssued(optionId, msg.sender, refundAmount);
    }

    function setKYCStatus(address user, bool verified) external onlyRole(COMPLIANCE_ROLE) {
        kycVerified[user] = verified;
        emit KYCStatusUpdated(user, verified);
    }

    function setAccreditedStatus(address user, bool accredited) external onlyRole(COMPLIANCE_ROLE) {
        accreditedInvestors[user] = accredited;
        emit AccreditationUpdated(user, accredited);
    }

    function batchSetKYC(address[] calldata users, bool[] calldata statuses) external onlyRole(COMPLIANCE_ROLE) {
        require(users.length == statuses.length, "Length mismatch");
        for (uint256 i = 0; i < users.length; i++) {
            kycVerified[users[i]] = statuses[i];
            emit KYCStatusUpdated(users[i], statuses[i]);
        }
    }

    function cancelOption(uint256 optionId, string calldata reason) external onlyRole(ADMIN_ROLE) {
        LandOption storage option = options[optionId];
        require(option.status != OptionStatus.Exercised, "Cannot cancel exercised option");
        
        option.status = OptionStatus.Cancelled;
        emit OptionCancelled(optionId, reason);
    }

    function setMarkExerciseReady(uint256 optionId) external onlyRole(STEWARD_ROLE) {
        LandOption storage option = options[optionId];
        require(option.status == OptionStatus.OptionFeePaid, "Option fee not paid");
        require(option.sharesSold == option.totalShares, "Not fully funded");
        
        option.status = OptionStatus.ExerciseReady;
    }

    function getOptionBasic(uint256 optionId) external view returns (
        uint256 _optionId,
        string memory parcelId,
        string memory location,
        uint256 acreage,
        uint256 purchasePrice,
        uint256 optionFee,
        uint256 optionPeriodDays,
        OptionStatus status
    ) {
        LandOption storage opt = options[optionId];
        return (
            opt.optionId,
            opt.parcelId,
            opt.location,
            opt.acreage,
            opt.purchasePrice,
            opt.optionFee,
            opt.optionPeriodDays,
            opt.status
        );
    }

    function getOptionTiming(uint256 optionId) external view returns (
        uint256 createdAt,
        uint256 expiresAt,
        address landowner,
        address steward
    ) {
        LandOption storage opt = options[optionId];
        return (opt.createdAt, opt.expiresAt, opt.landowner, opt.steward);
    }

    function getOptionShares(uint256 optionId) external view returns (
        uint256 totalShares,
        uint256 sharesSold,
        uint256 minInvestment,
        uint256 maxInvestment
    ) {
        LandOption storage opt = options[optionId];
        return (opt.totalShares, opt.sharesSold, opt.minInvestment, opt.maxInvestment);
    }

    function getOptionCompliance(uint256 optionId) external view returns (
        bool regCFCompliant,
        string memory ipfsMetadata
    ) {
        LandOption storage opt = options[optionId];
        return (opt.regCFCompliant, opt.ipfsMetadata);
    }

    function getShareHolder(uint256 optionId, address investor) external view returns (ShareHolder memory) {
        return shareholders[optionId][investor];
    }

    function getInvestorCount(uint256 optionId) external view returns (uint256) {
        return optionInvestors[optionId].length;
    }

    function getInvestors(uint256 optionId) external view returns (address[] memory) {
        return optionInvestors[optionId];
    }

    function getRaisedAmount(uint256 optionId) external view returns (uint256) {
        LandOption storage option = options[optionId];
        uint256 pricePerShare = option.purchasePrice / option.totalShares;
        return option.sharesSold * pricePerShare;
    }

    function setPlatformFee(uint256 newFeeBps) external onlyRole(ADMIN_ROLE) {
        require(newFeeBps <= 1000, "Fee too high");
        platformFeeBps = newFeeBps;
    }

    function setTreasury(address newTreasury) external onlyRole(ADMIN_ROLE) {
        require(newTreasury != address(0), "Invalid treasury");
        treasury = newTreasury;
    }

    function setRevenueRouter(address newRouter) external onlyRole(ADMIN_ROLE) {
        revenueRouter = newRouter;
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
