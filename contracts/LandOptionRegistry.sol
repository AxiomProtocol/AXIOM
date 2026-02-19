// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract LandOptionRegistry is ERC1155, ERC1155Supply, AccessControl, Pausable, ReentrancyGuard {
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
        // Note: revenueRouter can be address(0) initially and set later
        
        paymentToken = IERC20(_paymentToken);
        treasury = _treasury;
        revenueRouter = _revenueRouter;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(COMPLIANCE_ROLE, msg.sender);
    }

    function createLandOption(
        string calldata parcelId,
        string calldata location,
        uint256 acreage,
        uint256 purchasePrice,
        uint256 optionFee,
        uint256 optionPeriodDays,
        address landowner,
        uint256 totalShares,
        uint256 minInvestment,
        uint256 maxInvestment,
        bool regCFCompliant,
        string calldata ipfsMetadata
    ) external onlyRole(STEWARD_ROLE) whenNotPaused returns (uint256) {
        require(landowner != address(0), "Invalid landowner");
        require(purchasePrice > 0, "Invalid purchase price");
        require(totalShares > 0, "Invalid total shares");
        require(optionPeriodDays >= 30 && optionPeriodDays <= 730, "Option period must be 30-730 days");
        
        if (regCFCompliant) {
            require(purchasePrice <= MAX_REG_CF_RAISE, "Exceeds Reg CF $5M limit");
        }

        uint256 optionId = nextOptionId++;
        
        LandOption storage newOption = options[optionId];
        newOption.optionId = optionId;
        newOption.parcelId = parcelId;
        newOption.location = location;
        newOption.acreage = acreage;
        newOption.purchasePrice = purchasePrice;
        newOption.optionFee = optionFee;
        newOption.optionPeriodDays = optionPeriodDays;
        newOption.createdAt = block.timestamp;
        newOption.expiresAt = 0;
        newOption.landowner = landowner;
        newOption.steward = msg.sender;
        newOption.status = OptionStatus.Draft;
        newOption.totalShares = totalShares;
        newOption.sharesSold = 0;
        newOption.minInvestment = minInvestment;
        newOption.maxInvestment = maxInvestment;
        newOption.regCFCompliant = regCFCompliant;
        newOption.ipfsMetadata = ipfsMetadata;

        emit LandOptionCreated(optionId, parcelId, landowner, purchasePrice);
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
        require(option.totalShares > 0, "Invalid total shares");
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
        require(option.optionFee > 0, "No option fee required");
        require(option.landowner != address(0), "Invalid landowner");

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
        require(option.landowner != address(0), "Invalid landowner");
        require(option.purchasePrice > 0, "Invalid purchase price");

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
        require(holder.shares > 0, "No shares to burn");

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

    function getOption(uint256 optionId) external view returns (LandOption memory) {
        return options[optionId];
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
        if (option.totalShares == 0) return 0;
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

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal virtual override(ERC1155, ERC1155Supply) {
        super._update(from, to, ids, values);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
