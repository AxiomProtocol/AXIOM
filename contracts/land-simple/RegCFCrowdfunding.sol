// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

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
        uint256 targetAmount;
        uint256 minInvestment;
        uint256 maxInvestment;
        uint256 raisedAmount;
        uint256 investorCount;
        uint256 startDate;
        uint256 endDate;
        CampaignStatus status;
        address issuer;
    }

    struct Investor {
        uint256 totalInvested;
        uint256 annualIncome;
        bool kycComplete;
        bool accredited;
    }

    struct Investment {
        uint256 amount;
        uint256 timestamp;
        bool refunded;
    }

    IERC20 public paymentToken;
    ILandOptionRegistry public landOptionRegistry;
    address public escrowWallet;

    uint256 public nextCampaignId = 1;
    uint256 public totalPlatformRaised;

    mapping(uint256 => Campaign) public campaigns;
    mapping(address => Investor) public investors;
    mapping(uint256 => mapping(address => Investment)) public investments;
    mapping(uint256 => address[]) public campaignInvestors;

    event CampaignCreated(uint256 indexed campaignId, uint256 indexed landOptionId, string title, uint256 targetAmount);
    event CampaignStatusChanged(uint256 indexed campaignId, CampaignStatus newStatus);
    event InvestmentMade(uint256 indexed campaignId, address indexed investor, uint256 amount);
    event InvestmentRefunded(uint256 indexed campaignId, address indexed investor, uint256 amount);
    event InvestorVerified(address indexed investor, bool kycComplete, bool accredited);

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
        uint256 targetAmount,
        uint256 minInvestment,
        uint256 maxInvestment,
        uint256 durationDays
    ) external onlyRole(ADMIN_ROLE) returns (uint256) {
        require(targetAmount > 0 && targetAmount <= MAX_ANNUAL_RAISE, "Invalid target amount");
        require(durationDays >= 21 && durationDays <= 365, "Duration must be 21-365 days");
        require(minInvestment > 0, "Min investment must be > 0");
        require(maxInvestment >= minInvestment, "Max must be >= min");

        uint256 campaignId = nextCampaignId++;
        
        Campaign storage campaign = campaigns[campaignId];
        campaign.campaignId = campaignId;
        campaign.landOptionId = landOptionId;
        campaign.title = title;
        campaign.targetAmount = targetAmount;
        campaign.minInvestment = minInvestment;
        campaign.maxInvestment = maxInvestment;
        campaign.status = CampaignStatus.Draft;
        campaign.issuer = msg.sender;

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

        emit CampaignStatusChanged(campaignId, CampaignStatus.Live);
    }

    function invest(uint256 campaignId, uint256 amount) external nonReentrant whenNotPaused {
        Campaign storage campaign = campaigns[campaignId];
        require(campaign.status == CampaignStatus.Live, "Campaign not live");
        require(block.timestamp >= campaign.startDate && block.timestamp <= campaign.endDate, "Outside investment window");
        require(amount >= campaign.minInvestment, "Below minimum investment");
        require(amount <= campaign.maxInvestment, "Above maximum investment");

        Investor storage investor = investors[msg.sender];
        require(investor.kycComplete, "KYC required");

        Investment storage investment = investments[campaignId][msg.sender];
        require(investment.amount + amount <= campaign.maxInvestment, "Would exceed max investment");

        require(paymentToken.transferFrom(msg.sender, escrowWallet, amount), "Transfer failed");

        if (investment.amount == 0) {
            campaignInvestors[campaignId].push(msg.sender);
            campaign.investorCount++;
        }

        investment.amount += amount;
        investment.timestamp = block.timestamp;
        campaign.raisedAmount += amount;
        investor.totalInvested += amount;
        totalPlatformRaised += amount;

        emit InvestmentMade(campaignId, msg.sender, amount);

        if (campaign.raisedAmount >= campaign.targetAmount) {
            campaign.status = CampaignStatus.Funded;
            emit CampaignStatusChanged(campaignId, CampaignStatus.Funded);
        }
    }

    function verifyInvestor(address user, uint256 annualIncome, bool kycComplete, bool accredited) external onlyRole(COMPLIANCE_ROLE) {
        investors[user] = Investor({
            totalInvested: investors[user].totalInvested,
            annualIncome: annualIncome,
            kycComplete: kycComplete,
            accredited: accredited
        });

        emit InvestorVerified(user, kycComplete, accredited);
    }

    function getCampaign(uint256 campaignId) external view returns (Campaign memory) {
        return campaigns[campaignId];
    }

    function getInvestor(address user) external view returns (Investor memory) {
        return investors[user];
    }

    function getInvestment(uint256 campaignId, address user) external view returns (Investment memory) {
        return investments[campaignId][user];
    }

    function getCampaignInvestors(uint256 campaignId) external view returns (address[] memory) {
        return campaignInvestors[campaignId];
    }

    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }
}
