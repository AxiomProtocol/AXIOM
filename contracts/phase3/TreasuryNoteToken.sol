// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TreasuryNoteToken is ERC1155, ERC1155Supply, AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant KYC_VERIFIER_ROLE = keccak256("KYC_VERIFIER_ROLE");

    IERC20 public immutable axusd;
    address public treasury;

    struct NoteSeries {
        string name;
        string seriesCode;
        uint256 maturityMonths;
        uint256 couponRateBps;      // annual coupon in basis points (600 = 6%)
        uint256 minInvestment;
        uint256 maxInvestment;
        uint256 totalIssued;
        uint256 maxIssuance;
        uint256 launchTime;
        bool active;
    }

    struct NoteHolding {
        uint256 seriesId;
        uint256 principal;
        uint256 purchaseTime;
        uint256 maturityTime;
        uint256 lastCouponClaim;
        uint256 couponsClaimed;
    }

    mapping(uint256 => NoteSeries) public noteSeries;
    uint256[] public seriesIds;
    mapping(address => bool) public kycApproved;
    mapping(address => bool) public accreditedInvestor;
    mapping(address => NoteHolding[]) public holdings;

    uint256 public seriesCounter;
    uint256 public totalOutstanding;
    uint256 public totalInvested;
    uint256 public totalCouponsPaid;
    uint256 public constant BPS = 10000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    event SeriesCreated(uint256 indexed seriesId, string name, string seriesCode, uint256 maturityMonths, uint256 couponRateBps);
    event NotesPurchased(address indexed investor, uint256 indexed seriesId, uint256 amount, uint256 holdingIndex);
    event CouponClaimed(address indexed investor, uint256 holdingIndex, uint256 amount);
    event NotesRedeemed(address indexed investor, uint256 holdingIndex, uint256 principal);
    event KYCUpdated(address indexed investor, bool approved);
    event AccreditedStatusUpdated(address indexed investor, bool accredited);

    constructor(address _axusd, address _treasury, string memory uri) ERC1155(uri) {
        require(_axusd != address(0), "Invalid AXUSD address");
        require(_treasury != address(0), "Invalid treasury address");

        axusd = IERC20(_axusd);
        treasury = _treasury;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
        _grantRole(KYC_VERIFIER_ROLE, msg.sender);
    }

    modifier onlyKYCApproved() {
        require(kycApproved[msg.sender], "KYC not approved");
        _;
    }

    modifier onlyAccredited() {
        require(accreditedInvestor[msg.sender], "Not accredited investor");
        _;
    }

    function createSeries(
        string calldata name,
        string calldata seriesCode,
        uint256 maturityMonths,
        uint256 couponRateBps,
        uint256 minInvestment,
        uint256 maxInvestment,
        uint256 maxIssuance
    ) external onlyRole(ISSUER_ROLE) returns (uint256 seriesId) {
        require(maturityMonths >= 3 && maturityMonths <= 60, "Invalid maturity");
        require(couponRateBps > 0 && couponRateBps <= 2000, "Invalid coupon rate");
        require(minInvestment > 0, "Invalid min investment");
        require(maxInvestment >= minInvestment, "Invalid max investment");

        seriesId = ++seriesCounter;
        noteSeries[seriesId] = NoteSeries({
            name: name,
            seriesCode: seriesCode,
            maturityMonths: maturityMonths,
            couponRateBps: couponRateBps,
            minInvestment: minInvestment,
            maxInvestment: maxInvestment,
            totalIssued: 0,
            maxIssuance: maxIssuance,
            launchTime: block.timestamp,
            active: true
        });

        seriesIds.push(seriesId);
        emit SeriesCreated(seriesId, name, seriesCode, maturityMonths, couponRateBps);
    }

    function purchaseNotes(uint256 seriesId, uint256 amount)
        external
        nonReentrant
        whenNotPaused
        onlyKYCApproved
        onlyAccredited
        returns (uint256 holdingIndex)
    {
        NoteSeries storage series = noteSeries[seriesId];
        require(series.active, "Series not active");
        require(amount >= series.minInvestment, "Below minimum investment");
        require(amount <= series.maxInvestment, "Above maximum investment");
        require(series.totalIssued + amount <= series.maxIssuance, "Exceeds max issuance");

        axusd.safeTransferFrom(msg.sender, treasury, amount);

        holdings[msg.sender].push(NoteHolding({
            seriesId: seriesId,
            principal: amount,
            purchaseTime: block.timestamp,
            maturityTime: block.timestamp + (series.maturityMonths * 30 days),
            lastCouponClaim: block.timestamp,
            couponsClaimed: 0
        }));

        holdingIndex = holdings[msg.sender].length - 1;
        series.totalIssued += amount;
        totalOutstanding += amount;
        totalInvested += amount;

        _mint(msg.sender, seriesId, amount, "");

        emit NotesPurchased(msg.sender, seriesId, amount, holdingIndex);
    }

    function claimCoupon(uint256 holdingIndex)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 couponAmount)
    {
        require(holdingIndex < holdings[msg.sender].length, "Invalid holding");
        NoteHolding storage holding = holdings[msg.sender][holdingIndex];
        require(holding.principal > 0, "No active holding");

        NoteSeries storage series = noteSeries[holding.seriesId];

        uint256 timeElapsed = block.timestamp - holding.lastCouponClaim;
        require(timeElapsed >= 30 days, "Coupon not yet due");

        uint256 periodsElapsed = timeElapsed / 30 days;
        uint256 monthlyRate = series.couponRateBps * 30 days / SECONDS_PER_YEAR;
        couponAmount = (holding.principal * monthlyRate * periodsElapsed) / BPS;

        require(axusd.balanceOf(address(this)) >= couponAmount, "Insufficient funds for coupon");

        holding.lastCouponClaim = block.timestamp;
        holding.couponsClaimed += couponAmount;
        totalCouponsPaid += couponAmount;

        axusd.safeTransfer(msg.sender, couponAmount);

        emit CouponClaimed(msg.sender, holdingIndex, couponAmount);
    }

    function redeemAtMaturity(uint256 holdingIndex)
        external
        nonReentrant
        whenNotPaused
    {
        require(holdingIndex < holdings[msg.sender].length, "Invalid holding");
        NoteHolding storage holding = holdings[msg.sender][holdingIndex];
        require(holding.principal > 0, "No active holding");
        require(block.timestamp >= holding.maturityTime, "Not yet mature");

        uint256 principal = holding.principal;
        uint256 seriesId = holding.seriesId;

        NoteSeries storage series = noteSeries[seriesId];
        uint256 timeSinceLastClaim = block.timestamp - holding.lastCouponClaim;
        uint256 finalCoupon = 0;

        if (timeSinceLastClaim > 0) {
            uint256 monthlyRate = series.couponRateBps * 30 days / SECONDS_PER_YEAR;
            uint256 periodsElapsed = timeSinceLastClaim / 30 days;
            if (periodsElapsed > 0) {
                finalCoupon = (principal * monthlyRate * periodsElapsed) / BPS;
            }
        }

        uint256 totalPayout = principal + finalCoupon;
        require(axusd.balanceOf(address(this)) >= totalPayout, "Insufficient funds");

        _burn(msg.sender, seriesId, principal);

        holding.principal = 0;
        series.totalIssued -= principal;
        totalOutstanding -= principal;
        totalCouponsPaid += finalCoupon;

        axusd.safeTransfer(msg.sender, totalPayout);

        emit NotesRedeemed(msg.sender, holdingIndex, principal);
    }

    function setKYCApproved(address investor, bool approved) external onlyRole(KYC_VERIFIER_ROLE) {
        kycApproved[investor] = approved;
        emit KYCUpdated(investor, approved);
    }

    function setAccreditedInvestor(address investor, bool accredited) external onlyRole(KYC_VERIFIER_ROLE) {
        accreditedInvestor[investor] = accredited;
        emit AccreditedStatusUpdated(investor, accredited);
    }

    function batchSetKYC(address[] calldata investors, bool approved) external onlyRole(KYC_VERIFIER_ROLE) {
        for (uint256 i = 0; i < investors.length; i++) {
            kycApproved[investors[i]] = approved;
            emit KYCUpdated(investors[i], approved);
        }
    }

    function batchSetAccredited(address[] calldata investors, bool accredited) external onlyRole(KYC_VERIFIER_ROLE) {
        for (uint256 i = 0; i < investors.length; i++) {
            accreditedInvestor[investors[i]] = accredited;
            emit AccreditedStatusUpdated(investors[i], accredited);
        }
    }

    function getHolding(address investor, uint256 holdingIndex)
        external
        view
        returns (
            uint256 seriesId,
            uint256 principal,
            uint256 purchaseTime,
            uint256 maturityTime,
            uint256 pendingCoupon
        )
    {
        require(holdingIndex < holdings[investor].length, "Invalid holding");
        NoteHolding storage holding = holdings[investor][holdingIndex];
        NoteSeries storage series = noteSeries[holding.seriesId];

        uint256 timeElapsed = block.timestamp - holding.lastCouponClaim;
        uint256 periodsElapsed = timeElapsed / 30 days;
        uint256 monthlyRate = series.couponRateBps * 30 days / SECONDS_PER_YEAR;
        uint256 pending = (holding.principal * monthlyRate * periodsElapsed) / BPS;

        return (
            holding.seriesId,
            holding.principal,
            holding.purchaseTime,
            holding.maturityTime,
            pending
        );
    }

    function getHoldingCount(address investor) external view returns (uint256) {
        return holdings[investor].length;
    }

    function getSeriesCount() external view returns (uint256) {
        return seriesIds.length;
    }

    function getSeries(uint256 seriesId)
        external
        view
        returns (
            string memory name,
            string memory seriesCode,
            uint256 maturityMonths,
            uint256 couponRateBps,
            uint256 totalIssued,
            uint256 maxIssuance,
            bool active
        )
    {
        NoteSeries storage series = noteSeries[seriesId];
        return (
            series.name,
            series.seriesCode,
            series.maturityMonths,
            series.couponRateBps,
            series.totalIssued,
            series.maxIssuance,
            series.active
        );
    }

    function getStats()
        external
        view
        returns (
            uint256 _totalOutstanding,
            uint256 _totalInvested,
            uint256 _totalCouponsPaid,
            uint256 _seriesCount
        )
    {
        return (totalOutstanding, totalInvested, totalCouponsPaid, seriesIds.length);
    }

    function depositCouponFunds(uint256 amount) external onlyRole(ADMIN_ROLE) {
        axusd.safeTransferFrom(msg.sender, address(this), amount);
    }

    function setSeriesActive(uint256 seriesId, bool active) external onlyRole(ADMIN_ROLE) {
        noteSeries[seriesId].active = active;
    }

    function setTreasury(address newTreasury) external onlyRole(ADMIN_ROLE) {
        require(newTreasury != address(0), "Invalid treasury");
        treasury = newTreasury;
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override(ERC1155, ERC1155Supply)
    {
        super._update(from, to, ids, values);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
