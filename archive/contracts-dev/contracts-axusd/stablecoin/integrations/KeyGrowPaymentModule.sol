// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IPSM {
    function swapUSDCToAXUSD(uint256 usdcAmount) external returns (uint256);
}

contract KeyGrowPaymentModule is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PROPERTY_MANAGER_ROLE = keccak256("PROPERTY_MANAGER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    IERC20 public axusd;
    IERC20 public usdc;
    IPSM public psm;
    address public treasuryVault;

    uint256 public constant BPS_DENOMINATOR = 10000;
    uint16 public protocolFeeBps = 100;

    uint256 public totalProperties;
    uint256 public totalRentCollected;
    uint256 public totalEscrowDeposited;

    enum PropertyStatus { Available, Occupied, Completed, Cancelled }
    enum PaymentType { Rent, Escrow, DownPayment, BuyDown }

    struct Property {
        uint256 propertyId;
        address propertyManager;
        address tenant;
        uint256 monthlyRent;
        uint256 purchasePrice;
        uint256 escrowBalance;
        uint256 buyDownCredits;
        uint256 rentPaidCount;
        uint256 leaseStartTime;
        uint256 leaseDuration;
        PropertyStatus status;
        string propertyAddress;
    }

    struct PaymentRecord {
        uint256 propertyId;
        address payer;
        uint256 amount;
        PaymentType paymentType;
        uint256 timestamp;
    }

    mapping(uint256 => Property) public properties;
    mapping(uint256 => PaymentRecord[]) public propertyPayments;
    mapping(address => uint256[]) public tenantProperties;
    mapping(address => uint256) public tenantTotalPaid;

    event PropertyRegistered(uint256 indexed propertyId, address indexed manager, uint256 monthlyRent, uint256 purchasePrice);
    event TenantAssigned(uint256 indexed propertyId, address indexed tenant, uint256 leaseStart);
    event RentPaid(uint256 indexed propertyId, address indexed tenant, uint256 amount, uint256 buyDownCredit);
    event EscrowDeposited(uint256 indexed propertyId, address indexed tenant, uint256 amount);
    event DownPaymentMade(uint256 indexed propertyId, address indexed tenant, uint256 amount);
    event PropertyPurchased(uint256 indexed propertyId, address indexed buyer, uint256 totalPaid);
    event EscrowReleased(uint256 indexed propertyId, address indexed recipient, uint256 amount);

    constructor(
        address _axusd,
        address _usdc,
        address _psm,
        address _treasuryVault
    ) {
        require(_axusd != address(0), "Invalid AXUSD");
        require(_usdc != address(0), "Invalid USDC");
        require(_psm != address(0), "Invalid PSM");
        require(_treasuryVault != address(0), "Invalid treasury");

        axusd = IERC20(_axusd);
        usdc = IERC20(_usdc);
        psm = IPSM(_psm);
        treasuryVault = _treasuryVault;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function registerProperty(
        uint256 monthlyRent,
        uint256 purchasePrice,
        uint256 leaseDuration,
        string calldata propertyAddress
    ) external onlyRole(PROPERTY_MANAGER_ROLE) returns (uint256) {
        require(monthlyRent >= 100 * 10**18, "Min rent 100 AXUSD");
        require(purchasePrice >= monthlyRent * 12, "Price must exceed annual rent");
        require(leaseDuration >= 12, "Min 12 month lease");

        totalProperties++;
        uint256 propertyId = totalProperties;

        properties[propertyId] = Property({
            propertyId: propertyId,
            propertyManager: msg.sender,
            tenant: address(0),
            monthlyRent: monthlyRent,
            purchasePrice: purchasePrice,
            escrowBalance: 0,
            buyDownCredits: 0,
            rentPaidCount: 0,
            leaseStartTime: 0,
            leaseDuration: leaseDuration,
            status: PropertyStatus.Available,
            propertyAddress: propertyAddress
        });

        emit PropertyRegistered(propertyId, msg.sender, monthlyRent, purchasePrice);
        return propertyId;
    }

    function assignTenant(uint256 propertyId, address tenant) external onlyRole(PROPERTY_MANAGER_ROLE) {
        Property storage prop = properties[propertyId];
        require(prop.propertyId > 0, "Property not found");
        require(prop.status == PropertyStatus.Available, "Not available");
        require(tenant != address(0), "Invalid tenant");

        prop.tenant = tenant;
        prop.leaseStartTime = block.timestamp;
        prop.status = PropertyStatus.Occupied;
        tenantProperties[tenant].push(propertyId);

        emit TenantAssigned(propertyId, tenant, block.timestamp);
    }

    function payRent(uint256 propertyId) external nonReentrant whenNotPaused {
        Property storage prop = properties[propertyId];
        require(prop.tenant == msg.sender, "Not tenant");
        require(prop.status == PropertyStatus.Occupied, "Not occupied");

        uint256 rentAmount = prop.monthlyRent;
        axusd.safeTransferFrom(msg.sender, address(this), rentAmount);

        uint256 fee = (rentAmount * protocolFeeBps) / BPS_DENOMINATOR;
        uint256 buyDownCredit = (rentAmount * 1000) / BPS_DENOMINATOR;
        uint256 managerPayment = rentAmount - fee - buyDownCredit;

        axusd.safeTransfer(treasuryVault, fee);
        axusd.safeTransfer(prop.propertyManager, managerPayment);

        prop.buyDownCredits += buyDownCredit;
        prop.rentPaidCount++;
        totalRentCollected += rentAmount;
        tenantTotalPaid[msg.sender] += rentAmount;

        propertyPayments[propertyId].push(PaymentRecord({
            propertyId: propertyId,
            payer: msg.sender,
            amount: rentAmount,
            paymentType: PaymentType.Rent,
            timestamp: block.timestamp
        }));

        emit RentPaid(propertyId, msg.sender, rentAmount, buyDownCredit);
    }

    function depositEscrow(uint256 propertyId, uint256 amount) external nonReentrant whenNotPaused {
        Property storage prop = properties[propertyId];
        require(prop.tenant == msg.sender, "Not tenant");
        require(prop.status == PropertyStatus.Occupied, "Not occupied");
        require(amount >= 100 * 10**18, "Min deposit 100 AXUSD");

        axusd.safeTransferFrom(msg.sender, address(this), amount);

        prop.escrowBalance += amount;
        totalEscrowDeposited += amount;
        tenantTotalPaid[msg.sender] += amount;

        propertyPayments[propertyId].push(PaymentRecord({
            propertyId: propertyId,
            payer: msg.sender,
            amount: amount,
            paymentType: PaymentType.Escrow,
            timestamp: block.timestamp
        }));

        emit EscrowDeposited(propertyId, msg.sender, amount);
    }

    function makeDownPayment(uint256 propertyId, uint256 amount) external nonReentrant whenNotPaused {
        Property storage prop = properties[propertyId];
        require(prop.tenant == msg.sender, "Not tenant");
        require(prop.status == PropertyStatus.Occupied, "Not occupied");

        axusd.safeTransferFrom(msg.sender, address(this), amount);

        prop.escrowBalance += amount;
        tenantTotalPaid[msg.sender] += amount;

        propertyPayments[propertyId].push(PaymentRecord({
            propertyId: propertyId,
            payer: msg.sender,
            amount: amount,
            paymentType: PaymentType.DownPayment,
            timestamp: block.timestamp
        }));

        emit DownPaymentMade(propertyId, msg.sender, amount);
    }

    function completePurchase(uint256 propertyId) external onlyRole(PROPERTY_MANAGER_ROLE) nonReentrant {
        Property storage prop = properties[propertyId];
        require(prop.status == PropertyStatus.Occupied, "Not occupied");

        uint256 totalEquity = prop.escrowBalance + prop.buyDownCredits;
        require(totalEquity >= prop.purchasePrice, "Insufficient equity");

        axusd.safeTransfer(prop.propertyManager, prop.escrowBalance);

        prop.status = PropertyStatus.Completed;
        prop.escrowBalance = 0;

        emit PropertyPurchased(propertyId, prop.tenant, totalEquity);
    }

    function releaseEscrow(uint256 propertyId, address recipient, uint256 amount) external onlyRole(PROPERTY_MANAGER_ROLE) nonReentrant {
        Property storage prop = properties[propertyId];
        require(prop.escrowBalance >= amount, "Insufficient escrow");

        prop.escrowBalance -= amount;
        axusd.safeTransfer(recipient, amount);

        emit EscrowReleased(propertyId, recipient, amount);
    }

    function getPropertyInfo(uint256 propertyId) external view returns (
        address propertyManager,
        address tenant,
        uint256 monthlyRent,
        uint256 purchasePrice,
        uint256 escrowBalance,
        uint256 buyDownCredits,
        uint256 rentPaidCount,
        PropertyStatus status
    ) {
        Property storage prop = properties[propertyId];
        return (
            prop.propertyManager,
            prop.tenant,
            prop.monthlyRent,
            prop.purchasePrice,
            prop.escrowBalance,
            prop.buyDownCredits,
            prop.rentPaidCount,
            prop.status
        );
    }

    function getTenantEquity(uint256 propertyId) external view returns (uint256 escrow, uint256 buyDown, uint256 total) {
        Property storage prop = properties[propertyId];
        return (prop.escrowBalance, prop.buyDownCredits, prop.escrowBalance + prop.buyDownCredits);
    }

    function getPaymentHistory(uint256 propertyId) external view returns (PaymentRecord[] memory) {
        return propertyPayments[propertyId];
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
}
