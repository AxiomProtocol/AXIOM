// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface ILandOptionRegistry {
    function purchaseShares(uint256 optionId, uint256 shareAmount) external;
    function getOption(uint256 optionId) external view returns (
        uint256, string memory, string memory, uint256, uint256, uint256, uint256,
        uint256, uint256, address, address, uint8, uint256, uint256, uint256, uint256, bool, string memory
    );
}

contract RegCFCrowdfunding is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    uint256 public constant MAX_ANNUAL_RAISE = 5_000_000 * 10**18;
    uint256 public constant INCOME_THRESHOLD_LOW = 124_000 * 10**18;
    uint256 public constant MAX_INVEST_LOW_INCOME = 2_500 * 10**18;
    uint256 public constant MAX_INVEST_PERCENTAGE = 10;

    enum CampaignStatus { Draft, Live, Funded, Closed, Cancelled }

    struct Campaign {
        uint256 campaignId;
        uint256 landOptionId;
        string title;
        string description;
        uint256 targetAmount;
        uint256 minInvestment;
        uint256 maxInvestment;
        uint256 raisedAmount;
        uint256 investorCount;
        uint256 startDate;
        uint256 endDate;
        CampaignStatus status;
        address issuer;
        string offeringDocumentCID;
        bool requiresAccreditation;
    }

    struct Investor {
        uint256 totalInvested;
        uint256 annualNetWorth;
        uint256 annualIncome;
        bool kycComplete;
        bool accredited;
        uint256 lastInvestmentYear;
        uint256 yearlyInvestmentTotal;
    }

    struct Investment {
        uint256 amount;
        uint256 timestamp;
        bool refunded;
    }

    IERC20 public paymentToken;
    ILandOptionRegistry public landOptionRegistry;
    address public escrowWallet;
    address public complianceOracle;

    uint256 public nextCampaignId = 1;
    uint256 public totalPlatformRaised;

    mapping(uint256 => Campaign) public campaigns;
    mapping(address => Investor) public investors;
    mapping(uint256 => mapping(address => Investment)) public investments;
    mapping(uint256 => address[]) public campaignInvestors;

    event CampaignCreated(uint256 indexed campaignId, uint256 indexed landOptionId, string title, uint256 targetAmount);
    event CampaignStatusChanged(uint256 indexed campaignId, CampaignStatus oldStatus, CampaignStatus newStatus);
    event InvestmentMade(uint256 indexed campaignId, address indexed investor, uint256 amount);
    event InvestmentRefunded(uint256 indexed campaignId, address indexed investor, uint256 amount);
    event InvestorVerified(address indexed investor, bool kycComplete, bool accredited);
    event FundsReleased(uint256 indexed campaignId, address indexed recipient, uint256 amount);

    constructor(
        address _paymentToken,
        address _landOptionRegistry,
        address _escrowWallet
    ) {
        require(_paymentToken != address(0), "Invalid payment token");
        require(_escrowWallet != address(0), "Invalid escrow wallet");
        
        paymentToken = IERC20(_paymentToken);
        landOptionRegistry = ILandOptionRegistry(_landOptionRegistry);
        escrowWallet = _escrowWallet;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(COMPLIANCE_ROLE, msg.sender);
    }

    function createCampaign(
        uint256 landOptionId,
        string calldata title,
        string calldata description,
        uint256 targetAmount,
        uint256 minInvestment,
        uint256 maxInvestment,
        uint256 durationDays,
        string calldata offeringDocumentCID,
        bool requiresAccreditation
    ) external onlyRole(ADMIN_ROLE) returns (uint256) {
        require(targetAmount > 0 && targetAmount <= MAX_ANNUAL_RAISE, "Invalid target amount");
        require(durationDays >= 21 && durationDays <= 365, "Duration must be 21-365 days");
        require(minInvestment > 0, "Min investment must be > 0");
        require(maxInvestment >= minInvestment, "Max must be >= min");

        uint256 campaignId = nextCampaignId++;
        
        campaigns[campaignId] = Campaign({
            campaignId: campaignId,
            landOptionId: landOptionId,
            title: title,
            description: description,
            targetAmount: targetAmount,
            minInvestment: minInvestment,
            maxInvestment: maxInvestment,
            raisedAmount: 0,
            investorCount: 0,
            startDate: 0,
            endDate: 0,
            status: CampaignStatus.Draft,
            issuer: msg.sender,
            offeringDocumentCID: offeringDocumentCID,
            requiresAccreditation: requiresAccreditation
        });

        emit CampaignCreated(campaignId, landOptionId, title, targetAmount);
        return campaignId;
    }

    function launchCampaign(uint256 campaignId, uint256 durationDays) external onlyRole(ADMIN_ROLE) {
        Campaign storage campaign = campaigns[campaignId];
        require(campaign.status == CampaignStatus.Draft, "Campaign not in draft");
        require(durationDays >= 21 && durationDays <= 365, "Invalid duration");

        campaign.startDate = block.timestamp;
        campaign.endDate = block.timestamp + (durationDays * 1 days);
        campaign.status = CampaignStatus.Live;

        emit CampaignStatusChanged(campaignId, CampaignStatus.Draft, CampaignStatus.Live);
    }

    function invest(uint256 campaignId, uint256 amount) external nonReentrant whenNotPaused {
        Campaign storage campaign = campaigns[campaignId];
        require(campaign.status == CampaignStatus.Live, "Campaign not live");
        require(block.timestamp >= campaign.startDate, "Campaign not started");
        require(block.timestamp <= campaign.endDate, "Campaign ended");
        require(amount >= campaign.minInvestment, "Below minimum investment");

        Investor storage investor = investors[msg.sender];
        require(investor.kycComplete, "KYC required");

        if (campaign.requiresAccreditation) {
            require(investor.accredited, "Accreditation required");
        }

        uint256 currentYear = block.timestamp / 365 days;
        if (investor.lastInvestmentYear != currentYear) {
            investor.yearlyInvestmentTotal = 0;
            investor.lastInvestmentYear = currentYear;
        }

        uint256 maxAllowed = calculateMaxInvestment(investor);
        uint256 existingInvestment = investments[campaignId][msg.sender].amount;
        uint256 totalAfterInvestment = existingInvestment + amount;

        require(totalAfterInvestment <= campaign.maxInvestment, "Exceeds campaign max");
        require(investor.yearlyInvestmentTotal + amount <= maxAllowed, "Exceeds annual limit");
        require(campaign.raisedAmount + amount <= campaign.targetAmount, "Exceeds target");

        require(
            paymentToken.transferFrom(msg.sender, escrowWallet, amount),
            "Transfer failed"
        );

        if (existingInvestment == 0) {
            campaignInvestors[campaignId].push(msg.sender);
            campaign.investorCount++;
        }

        investments[campaignId][msg.sender].amount += amount;
        investments[campaignId][msg.sender].timestamp = block.timestamp;
        campaign.raisedAmount += amount;
        investor.totalInvested += amount;
        investor.yearlyInvestmentTotal += amount;
        totalPlatformRaised += amount;

        emit InvestmentMade(campaignId, msg.sender, amount);

        if (campaign.raisedAmount >= campaign.targetAmount) {
            campaign.status = CampaignStatus.Funded;
            emit CampaignStatusChanged(campaignId, CampaignStatus.Live, CampaignStatus.Funded);
        }
    }

    function calculateMaxInvestment(Investor storage investor) internal view returns (uint256) {
        if (investor.accredited) {
            return type(uint256).max;
        }

        uint256 greaterOf = investor.annualIncome > investor.annualNetWorth 
            ? investor.annualIncome 
            : investor.annualNetWorth;

        if (greaterOf < INCOME_THRESHOLD_LOW) {
            return MAX_INVEST_LOW_INCOME;
        }

        return (greaterOf * MAX_INVEST_PERCENTAGE) / 100;
    }

    function requestRefund(uint256 campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        require(
            campaign.status == CampaignStatus.Cancelled || 
            (campaign.status == CampaignStatus.Live && block.timestamp > campaign.endDate && campaign.raisedAmount < campaign.targetAmount),
            "Refund not available"
        );

        Investment storage investment = investments[campaignId][msg.sender];
        require(investment.amount > 0, "No investment");
        require(!investment.refunded, "Already refunded");

        uint256 refundAmount = investment.amount;
        investment.refunded = true;

        require(
            paymentToken.transferFrom(escrowWallet, msg.sender, refundAmount),
            "Refund transfer failed"
        );

        emit InvestmentRefunded(campaignId, msg.sender, refundAmount);
    }

    function verifyInvestor(
        address investorAddress,
        bool kycComplete,
        bool accredited,
        uint256 annualIncome,
        uint256 annualNetWorth
    ) external onlyRole(COMPLIANCE_ROLE) {
        Investor storage investor = investors[investorAddress];
        investor.kycComplete = kycComplete;
        investor.accredited = accredited;
        investor.annualIncome = annualIncome;
        investor.annualNetWorth = annualNetWorth;

        emit InvestorVerified(investorAddress, kycComplete, accredited);
    }

    function releaseFunds(uint256 campaignId) external onlyRole(ADMIN_ROLE) nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        require(campaign.status == CampaignStatus.Funded, "Campaign not funded");

        uint256 fundsToRelease = campaign.raisedAmount;
        campaign.status = CampaignStatus.Closed;

        emit FundsReleased(campaignId, campaign.issuer, fundsToRelease);
        emit CampaignStatusChanged(campaignId, CampaignStatus.Funded, CampaignStatus.Closed);
    }

    function cancelCampaign(uint256 campaignId) external onlyRole(ADMIN_ROLE) {
        Campaign storage campaign = campaigns[campaignId];
        require(campaign.status == CampaignStatus.Draft || campaign.status == CampaignStatus.Live, "Cannot cancel");

        CampaignStatus oldStatus = campaign.status;
        campaign.status = CampaignStatus.Cancelled;

        emit CampaignStatusChanged(campaignId, oldStatus, CampaignStatus.Cancelled);
    }

    function getCampaign(uint256 campaignId) external view returns (Campaign memory) {
        return campaigns[campaignId];
    }

    function getInvestor(address investorAddress) external view returns (Investor memory) {
        return investors[investorAddress];
    }

    function getInvestment(uint256 campaignId, address investorAddress) external view returns (Investment memory) {
        return investments[campaignId][investorAddress];
    }

    function getCampaignInvestors(uint256 campaignId) external view returns (address[] memory) {
        return campaignInvestors[campaignId];
    }

    function setEscrowWallet(address newEscrow) external onlyRole(ADMIN_ROLE) {
        require(newEscrow != address(0), "Invalid escrow");
        escrowWallet = newEscrow;
    }

    function setLandOptionRegistry(address newRegistry) external onlyRole(ADMIN_ROLE) {
        landOptionRegistry = ILandOptionRegistry(newRegistry);
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}
