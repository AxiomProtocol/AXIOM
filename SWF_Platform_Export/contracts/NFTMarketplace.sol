// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MetalOfTheGods NFT Marketplace
 * @dev Secure marketplace with escrow, auctions, and royalty distribution
 * @author SWF Development Team
 */
contract NFTMarketplace is 
    Initializable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    struct Listing {
        uint256 tokenId;
        address seller;
        uint256 price;
        bool active;
        uint256 createdAt;
        uint256 expiresAt;
        address paymentToken; // address(0) for BNB, otherwise ERC20
    }

    struct Auction {
        uint256 tokenId;
        address seller;
        uint256 startingPrice;
        uint256 currentBid;
        address currentBidder;
        uint256 startTime;
        uint256 endTime;
        bool active;
        bool isReserveAuction;
        uint256 reservePrice;
        address paymentToken;
    }

    struct Offer {
        uint256 tokenId;
        address buyer;
        uint256 price;
        uint256 expiresAt;
        bool active;
        address paymentToken;
    }

    // Contract state
    IERC721Upgradeable public nftContract;
    IERC20 public swfToken;
    
    uint256 public marketplaceFee; // Basis points (e.g., 250 = 2.5%)
    uint256 public royaltyFee; // Basis points for original creators
    address public feeRecipient;
    address public royaltyRecipient;
    
    uint256 private _listingIdCounter;
    uint256 private _auctionIdCounter;
    uint256 private _offerIdCounter;

    mapping(uint256 => Listing) public listings; // listingId => Listing
    mapping(uint256 => Auction) public auctions; // auctionId => Auction
    mapping(uint256 => Offer) public offers; // offerId => Offer
    mapping(uint256 => uint256[]) public tokenOffers; // tokenId => offerIds
    mapping(address => uint256) public pendingReturns; // For failed auction bids

    // Events
    event ListingCreated(uint256 indexed listingId, uint256 indexed tokenId, address indexed seller, uint256 price);
    event ListingCanceled(uint256 indexed listingId, uint256 indexed tokenId);
    event ItemSold(uint256 indexed listingId, uint256 indexed tokenId, address indexed buyer, uint256 price);
    
    event AuctionCreated(uint256 indexed auctionId, uint256 indexed tokenId, address indexed seller, uint256 startingPrice, uint256 endTime);
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 amount);
    event AuctionCanceled(uint256 indexed auctionId, uint256 indexed tokenId);
    
    event OfferMade(uint256 indexed offerId, uint256 indexed tokenId, address indexed buyer, uint256 price);
    event OfferAccepted(uint256 indexed offerId, uint256 indexed tokenId, address indexed seller);
    event OfferCanceled(uint256 indexed offerId, uint256 indexed tokenId);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _nftContract,
        address _swfToken,
        address _feeRecipient,
        address _royaltyRecipient,
        uint256 _marketplaceFee,
        uint256 _royaltyFee
    ) initializer public {
        __ReentrancyGuard_init();
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        require(_nftContract != address(0), "Invalid NFT contract");
        require(_swfToken != address(0), "Invalid SWF token");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        require(_marketplaceFee <= 1000, "Fee too high"); // Max 10%
        require(_royaltyFee <= 1000, "Royalty too high"); // Max 10%

        nftContract = IERC721Upgradeable(_nftContract);
        swfToken = IERC20(_swfToken);
        feeRecipient = _feeRecipient;
        royaltyRecipient = _royaltyRecipient;
        marketplaceFee = _marketplaceFee;
        royaltyFee = _royaltyFee;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    // Fixed price listings
    function createListing(
        uint256 tokenId,
        uint256 price,
        uint256 duration,
        address paymentToken
    ) external whenNotPaused nonReentrant {
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not token owner");
        require(nftContract.getApproved(tokenId) == address(this) || 
                nftContract.isApprovedForAll(msg.sender, address(this)), "Not approved");
        require(price > 0, "Price must be greater than 0");
        require(duration > 0 && duration <= 365 days, "Invalid duration");

        uint256 listingId = _listingIdCounter++;
        uint256 expiresAt = block.timestamp + duration;

        listings[listingId] = Listing({
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            active: true,
            createdAt: block.timestamp,
            expiresAt: expiresAt,
            paymentToken: paymentToken
        });

        emit ListingCreated(listingId, tokenId, msg.sender, price);
    }

    function buyItem(uint256 listingId) external payable whenNotPaused nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(block.timestamp <= listing.expiresAt, "Listing expired");
        require(msg.sender != listing.seller, "Cannot buy own item");

        uint256 totalPrice = listing.price;
        listing.active = false;

        // Handle payment
        if (listing.paymentToken == address(0)) {
            require(msg.value >= totalPrice, "Insufficient payment");
            _distributeFunds(listing.seller, totalPrice, msg.value);
        } else {
            IERC20 paymentToken = IERC20(listing.paymentToken);
            require(paymentToken.transferFrom(msg.sender, address(this), totalPrice), "Payment failed");
            _distributeFundsERC20(listing.seller, totalPrice, paymentToken);
        }

        // Transfer NFT
        nftContract.safeTransferFrom(listing.seller, msg.sender, listing.tokenId);

        emit ItemSold(listingId, listing.tokenId, msg.sender, totalPrice);
    }

    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender || hasRole(ADMIN_ROLE, msg.sender), "Not authorized");
        require(listing.active, "Listing not active");

        listing.active = false;
        emit ListingCanceled(listingId, listing.tokenId);
    }

    // Auction functionality
    function createAuction(
        uint256 tokenId,
        uint256 startingPrice,
        uint256 duration,
        bool isReserveAuction,
        uint256 reservePrice,
        address paymentToken
    ) external whenNotPaused nonReentrant {
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not token owner");
        require(nftContract.getApproved(tokenId) == address(this) || 
                nftContract.isApprovedForAll(msg.sender, address(this)), "Not approved");
        require(startingPrice > 0, "Starting price must be greater than 0");
        require(duration >= 1 hours && duration <= 30 days, "Invalid duration");
        
        if (isReserveAuction) {
            require(reservePrice >= startingPrice, "Reserve below starting price");
        }

        uint256 auctionId = _auctionIdCounter++;
        uint256 endTime = block.timestamp + duration;

        auctions[auctionId] = Auction({
            tokenId: tokenId,
            seller: msg.sender,
            startingPrice: startingPrice,
            currentBid: 0,
            currentBidder: address(0),
            startTime: block.timestamp,
            endTime: endTime,
            active: true,
            isReserveAuction: isReserveAuction,
            reservePrice: reservePrice,
            paymentToken: paymentToken
        });

        emit AuctionCreated(auctionId, tokenId, msg.sender, startingPrice, endTime);
    }

    function placeBid(uint256 auctionId) external payable whenNotPaused nonReentrant {
        Auction storage auction = auctions[auctionId];
        require(auction.active, "Auction not active");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(msg.sender != auction.seller, "Cannot bid on own auction");

        uint256 bidAmount;
        if (auction.paymentToken == address(0)) {
            bidAmount = msg.value;
        } else {
            revert("ERC20 bidding not implemented in this version");
        }

        require(bidAmount >= auction.startingPrice, "Bid below starting price");
        require(bidAmount > auction.currentBid, "Bid too low");

        // Refund previous bidder
        if (auction.currentBidder != address(0)) {
            pendingReturns[auction.currentBidder] += auction.currentBid;
        }

        auction.currentBid = bidAmount;
        auction.currentBidder = msg.sender;

        // Extend auction if bid placed in last 15 minutes
        if (auction.endTime - block.timestamp < 15 minutes) {
            auction.endTime = block.timestamp + 15 minutes;
        }

        emit BidPlaced(auctionId, msg.sender, bidAmount);
    }

    function endAuction(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        require(auction.active, "Auction not active");
        require(block.timestamp >= auction.endTime, "Auction still active");

        auction.active = false;

        if (auction.currentBidder == address(0) || 
            (auction.isReserveAuction && auction.currentBid < auction.reservePrice)) {
            // No bids or reserve not met
            if (auction.currentBidder != address(0)) {
                pendingReturns[auction.currentBidder] += auction.currentBid;
            }
            emit AuctionCanceled(auctionId, auction.tokenId);
        } else {
            // Successful auction
            _distributeFunds(auction.seller, auction.currentBid, auction.currentBid);
            nftContract.safeTransferFrom(auction.seller, auction.currentBidder, auction.tokenId);
            emit AuctionEnded(auctionId, auction.currentBidder, auction.currentBid);
        }
    }

    function withdraw() external nonReentrant {
        uint256 amount = pendingReturns[msg.sender];
        require(amount > 0, "No funds to withdraw");

        pendingReturns[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal failed");
    }

    // Offer functionality
    function makeOffer(
        uint256 tokenId,
        uint256 price,
        uint256 duration,
        address paymentToken
    ) external whenNotPaused nonReentrant {
        require(nftContract.ownerOf(tokenId) != msg.sender, "Cannot offer on own token");
        require(price > 0, "Price must be greater than 0");
        require(duration > 0 && duration <= 30 days, "Invalid duration");

        if (paymentToken != address(0)) {
            IERC20 token = IERC20(paymentToken);
            require(token.transferFrom(msg.sender, address(this), price), "Payment transfer failed");
        }

        uint256 offerId = _offerIdCounter++;
        uint256 expiresAt = block.timestamp + duration;

        offers[offerId] = Offer({
            tokenId: tokenId,
            buyer: msg.sender,
            price: price,
            expiresAt: expiresAt,
            active: true,
            paymentToken: paymentToken
        });

        tokenOffers[tokenId].push(offerId);

        emit OfferMade(offerId, tokenId, msg.sender, price);
    }

    function acceptOffer(uint256 offerId) external whenNotPaused nonReentrant {
        Offer storage offer = offers[offerId];
        require(offer.active, "Offer not active");
        require(block.timestamp <= offer.expiresAt, "Offer expired");
        require(nftContract.ownerOf(offer.tokenId) == msg.sender, "Not token owner");
        require(nftContract.getApproved(offer.tokenId) == address(this) || 
                nftContract.isApprovedForAll(msg.sender, address(this)), "Not approved");

        offer.active = false;

        // Handle payment
        if (offer.paymentToken == address(0)) {
            _distributeFunds(msg.sender, offer.price, offer.price);
        } else {
            IERC20 paymentToken = IERC20(offer.paymentToken);
            _distributeFundsERC20(msg.sender, offer.price, paymentToken);
        }

        // Transfer NFT
        nftContract.safeTransferFrom(msg.sender, offer.buyer, offer.tokenId);

        emit OfferAccepted(offerId, offer.tokenId, msg.sender);
    }

    function cancelOffer(uint256 offerId) external {
        Offer storage offer = offers[offerId];
        require(offer.buyer == msg.sender || hasRole(ADMIN_ROLE, msg.sender), "Not authorized");
        require(offer.active, "Offer not active");

        offer.active = false;

        // Refund if ERC20 payment was escrowed
        if (offer.paymentToken != address(0)) {
            IERC20 paymentToken = IERC20(offer.paymentToken);
            require(paymentToken.transfer(offer.buyer, offer.price), "Refund failed");
        }

        emit OfferCanceled(offerId, offer.tokenId);
    }

    // Internal functions
    function _distributeFunds(address seller, uint256 totalAmount, uint256 receivedAmount) internal {
        uint256 marketplaceFeeAmount = (totalAmount * marketplaceFee) / 10000;
        uint256 royaltyAmount = (totalAmount * royaltyFee) / 10000;
        uint256 sellerAmount = totalAmount - marketplaceFeeAmount - royaltyAmount;

        // Transfer fees
        if (marketplaceFeeAmount > 0) {
            (bool success1, ) = payable(feeRecipient).call{value: marketplaceFeeAmount}("");
            require(success1, "Fee transfer failed");
        }

        if (royaltyAmount > 0) {
            (bool success2, ) = payable(royaltyRecipient).call{value: royaltyAmount}("");
            require(success2, "Royalty transfer failed");
        }

        // Transfer to seller
        (bool success3, ) = payable(seller).call{value: sellerAmount}("");
        require(success3, "Seller payment failed");

        // Refund excess
        if (receivedAmount > totalAmount) {
            (bool success4, ) = payable(msg.sender).call{value: receivedAmount - totalAmount}("");
            require(success4, "Refund failed");
        }
    }

    function _distributeFundsERC20(address seller, uint256 totalAmount, IERC20 token) internal {
        uint256 marketplaceFeeAmount = (totalAmount * marketplaceFee) / 10000;
        uint256 royaltyAmount = (totalAmount * royaltyFee) / 10000;
        uint256 sellerAmount = totalAmount - marketplaceFeeAmount - royaltyAmount;

        if (marketplaceFeeAmount > 0) {
            require(token.transfer(feeRecipient, marketplaceFeeAmount), "Fee transfer failed");
        }

        if (royaltyAmount > 0) {
            require(token.transfer(royaltyRecipient, royaltyAmount), "Royalty transfer failed");
        }

        require(token.transfer(seller, sellerAmount), "Seller payment failed");
    }

    // View functions
    function getActiveListing(uint256 tokenId) external view returns (uint256, Listing memory) {
        for (uint256 i = 0; i < _listingIdCounter; i++) {
            if (listings[i].tokenId == tokenId && listings[i].active && 
                block.timestamp <= listings[i].expiresAt) {
                return (i, listings[i]);
            }
        }
        revert("No active listing");
    }

    function getActiveAuction(uint256 tokenId) external view returns (uint256, Auction memory) {
        for (uint256 i = 0; i < _auctionIdCounter; i++) {
            if (auctions[i].tokenId == tokenId && auctions[i].active) {
                return (i, auctions[i]);
            }
        }
        revert("No active auction");
    }

    function getTokenOffers(uint256 tokenId) external view returns (uint256[] memory) {
        return tokenOffers[tokenId];
    }

    // Administrative functions
    function updateFees(uint256 _marketplaceFee, uint256 _royaltyFee) external onlyRole(ADMIN_ROLE) {
        require(_marketplaceFee <= 1000, "Marketplace fee too high");
        require(_royaltyFee <= 1000, "Royalty fee too high");
        marketplaceFee = _marketplaceFee;
        royaltyFee = _royaltyFee;
    }

    function updateRecipients(address _feeRecipient, address _royaltyRecipient) external onlyRole(ADMIN_ROLE) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        require(_royaltyRecipient != address(0), "Invalid royalty recipient");
        feeRecipient = _feeRecipient;
        royaltyRecipient = _royaltyRecipient;
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal onlyRole(UPGRADER_ROLE) override {}

    // Emergency functions
    function emergencyWithdraw(address token, uint256 amount) external onlyRole(ADMIN_ROLE) {
        if (token == address(0)) {
            (bool success, ) = payable(msg.sender).call{value: amount}("");
            require(success, "Withdrawal failed");
        } else {
            IERC20(token).transfer(msg.sender, amount);
        }
    }
}