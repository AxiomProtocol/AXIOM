// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title Enhanced NFT Marketplace for MetalOfTheGods
 * @dev Advanced marketplace with batch auctions, dynamic fees, and collection-wide features
 */
contract EnhancedNFTMarketplace is ReentrancyGuard, Pausable, AccessControl {
    using Counters for Counters.Counter;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MODERATOR_ROLE = keccak256("MODERATOR_ROLE");

    Counters.Counter private _listingIds;
    Counters.Counter private _auctionIds;

    struct Listing {
        uint256 listingId;
        address nftContract;
        uint256 tokenId;
        address seller;
        uint256 price;
        bool active;
        uint256 timestamp;
    }

    struct Auction {
        uint256 auctionId;
        address nftContract;
        uint256 tokenId;
        address seller;
        uint256 startingBid;
        uint256 currentBid;
        address highestBidder;
        uint256 endTime;
        bool active;
        bool isCollection;
        uint256[] tokenIds; // For collection auctions
    }

    struct BatchListing {
        uint256[] tokenIds;
        uint256[] prices;
        address seller;
        bool active;
    }

    // Mappings
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Auction) public auctions;
    mapping(address => mapping(uint256 => uint256)) public tokenToListing;
    mapping(address => uint256[]) public userListings;
    mapping(address => uint256[]) public userAuctions;
    mapping(uint256 => mapping(address => uint256)) public auctionBids;

    // Fee structure
    uint256 public marketplaceFee = 250; // 2.5%
    uint256 public constant MAX_FEE = 1000; // 10% max
    address public feeRecipient;

    // Trading incentives
    mapping(address => uint256) public tradingVolume;
    mapping(address => uint256) public tradingRewards;
    uint256 public volumeRewardRate = 10; // 0.1% of volume as rewards

    // Events
    event ItemListed(uint256 indexed listingId, address indexed nftContract, uint256 indexed tokenId, address seller, uint256 price);
    event ItemSold(uint256 indexed listingId, address indexed buyer, uint256 price);
    event AuctionCreated(uint256 indexed auctionId, address indexed nftContract, uint256 indexed tokenId, address seller, uint256 startingBid, uint256 endTime);
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 finalBid);
    event BatchListed(address indexed seller, uint256[] tokenIds, uint256[] prices);
    event TradingRewardPaid(address indexed trader, uint256 amount);

    constructor(address _feeRecipient) {
        feeRecipient = _feeRecipient;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev List a single NFT for sale
     */
    function listItem(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external nonReentrant whenNotPaused {
        require(price > 0, "Price must be greater than zero");
        require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "Not token owner");
        require(IERC721(nftContract).isApprovedForAll(msg.sender, address(this)), "Contract not approved");

        _listingIds.increment();
        uint256 listingId = _listingIds.current();

        listings[listingId] = Listing({
            listingId: listingId,
            nftContract: nftContract,
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            active: true,
            timestamp: block.timestamp
        });

        tokenToListing[nftContract][tokenId] = listingId;
        userListings[msg.sender].push(listingId);

        emit ItemListed(listingId, nftContract, tokenId, msg.sender, price);
    }

    /**
     * @dev Batch list multiple NFTs
     */
    function batchListItems(
        address nftContract,
        uint256[] calldata tokenIds,
        uint256[] calldata prices
    ) external nonReentrant whenNotPaused {
        require(tokenIds.length == prices.length, "Arrays length mismatch");
        require(tokenIds.length <= 50, "Too many items");

        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(IERC721(nftContract).ownerOf(tokenIds[i]) == msg.sender, "Not owner of all tokens");
            require(prices[i] > 0, "Invalid price");
        }

        require(IERC721(nftContract).isApprovedForAll(msg.sender, address(this)), "Contract not approved");

        for (uint256 i = 0; i < tokenIds.length; i++) {
            _listingIds.increment();
            uint256 listingId = _listingIds.current();

            listings[listingId] = Listing({
                listingId: listingId,
                nftContract: nftContract,
                tokenId: tokenIds[i],
                seller: msg.sender,
                price: prices[i],
                active: true,
                timestamp: block.timestamp
            });

            tokenToListing[nftContract][tokenIds[i]] = listingId;
            userListings[msg.sender].push(listingId);

            emit ItemListed(listingId, nftContract, tokenIds[i], msg.sender, prices[i]);
        }

        emit BatchListed(msg.sender, tokenIds, prices);
    }

    /**
     * @dev Buy an NFT
     */
    function buyItem(uint256 listingId) external payable nonReentrant whenNotPaused {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(msg.value >= listing.price, "Insufficient payment");

        listing.active = false;

        // Calculate fees
        uint256 fee = (listing.price * marketplaceFee) / 10000;
        uint256 sellerAmount = listing.price - fee;

        // Transfer NFT
        IERC721(listing.nftContract).safeTransferFrom(
            listing.seller,
            msg.sender,
            listing.tokenId
        );

        // Transfer payments
        payable(listing.seller).transfer(sellerAmount);
        payable(feeRecipient).transfer(fee);

        // Handle excess payment
        if (msg.value > listing.price) {
            payable(msg.sender).transfer(msg.value - listing.price);
        }

        // Update trading volume and rewards
        tradingVolume[msg.sender] += listing.price;
        uint256 reward = (listing.price * volumeRewardRate) / 10000;
        tradingRewards[msg.sender] += reward;

        emit ItemSold(listingId, msg.sender, listing.price);
        emit TradingRewardPaid(msg.sender, reward);
    }

    /**
     * @dev Create an auction
     */
    function createAuction(
        address nftContract,
        uint256 tokenId,
        uint256 startingBid,
        uint256 duration
    ) external nonReentrant whenNotPaused {
        require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "Not token owner");
        require(IERC721(nftContract).isApprovedForAll(msg.sender, address(this)), "Contract not approved");
        require(startingBid > 0, "Invalid starting bid");
        require(duration >= 3600 && duration <= 7 days, "Invalid duration");

        _auctionIds.increment();
        uint256 auctionId = _auctionIds.current();

        auctions[auctionId] = Auction({
            auctionId: auctionId,
            nftContract: nftContract,
            tokenId: tokenId,
            seller: msg.sender,
            startingBid: startingBid,
            currentBid: 0,
            highestBidder: address(0),
            endTime: block.timestamp + duration,
            active: true,
            isCollection: false,
            tokenIds: new uint256[](0)
        });

        userAuctions[msg.sender].push(auctionId);

        emit AuctionCreated(auctionId, nftContract, tokenId, msg.sender, startingBid, block.timestamp + duration);
    }

    /**
     * @dev Create collection-wide auction
     */
    function createCollectionAuction(
        address nftContract,
        uint256[] calldata tokenIds,
        uint256 startingBid,
        uint256 duration
    ) external nonReentrant whenNotPaused {
        require(tokenIds.length > 1 && tokenIds.length <= 20, "Invalid collection size");
        require(startingBid > 0, "Invalid starting bid");
        require(duration >= 3600 && duration <= 7 days, "Invalid duration");

        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(IERC721(nftContract).ownerOf(tokenIds[i]) == msg.sender, "Not owner of all tokens");
        }
        require(IERC721(nftContract).isApprovedForAll(msg.sender, address(this)), "Contract not approved");

        _auctionIds.increment();
        uint256 auctionId = _auctionIds.current();

        auctions[auctionId] = Auction({
            auctionId: auctionId,
            nftContract: nftContract,
            tokenId: 0, // Not used for collection auctions
            seller: msg.sender,
            startingBid: startingBid,
            currentBid: 0,
            highestBidder: address(0),
            endTime: block.timestamp + duration,
            active: true,
            isCollection: true,
            tokenIds: tokenIds
        });

        userAuctions[msg.sender].push(auctionId);

        emit AuctionCreated(auctionId, nftContract, 0, msg.sender, startingBid, block.timestamp + duration);
    }

    /**
     * @dev Place bid on auction
     */
    function placeBid(uint256 auctionId) external payable nonReentrant whenNotPaused {
        Auction storage auction = auctions[auctionId];
        require(auction.active, "Auction not active");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(msg.sender != auction.seller, "Seller cannot bid");

        uint256 minBid = auction.currentBid == 0 ? auction.startingBid : auction.currentBid + (auction.currentBid * 5) / 100; // 5% increment
        require(msg.value >= minBid, "Bid too low");

        // Refund previous bidder
        if (auction.highestBidder != address(0)) {
            payable(auction.highestBidder).transfer(auction.currentBid);
        }

        auction.currentBid = msg.value;
        auction.highestBidder = msg.sender;
        auctionBids[auctionId][msg.sender] = msg.value;

        // Extend auction if bid placed in last 10 minutes
        if (auction.endTime - block.timestamp < 600) {
            auction.endTime += 600;
        }

        emit BidPlaced(auctionId, msg.sender, msg.value);
    }

    /**
     * @dev End auction and transfer NFT
     */
    function endAuction(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        require(auction.active, "Auction not active");
        require(block.timestamp >= auction.endTime, "Auction still ongoing");

        auction.active = false;

        if (auction.highestBidder != address(0)) {
            // Calculate fees
            uint256 fee = (auction.currentBid * marketplaceFee) / 10000;
            uint256 sellerAmount = auction.currentBid - fee;

            // Transfer NFT(s)
            if (auction.isCollection) {
                for (uint256 i = 0; i < auction.tokenIds.length; i++) {
                    IERC721(auction.nftContract).safeTransferFrom(
                        auction.seller,
                        auction.highestBidder,
                        auction.tokenIds[i]
                    );
                }
            } else {
                IERC721(auction.nftContract).safeTransferFrom(
                    auction.seller,
                    auction.highestBidder,
                    auction.tokenId
                );
            }

            // Transfer payments
            payable(auction.seller).transfer(sellerAmount);
            payable(feeRecipient).transfer(fee);

            // Update trading volume and rewards
            tradingVolume[auction.highestBidder] += auction.currentBid;
            uint256 reward = (auction.currentBid * volumeRewardRate) / 10000;
            tradingRewards[auction.highestBidder] += reward;

            emit TradingRewardPaid(auction.highestBidder, reward);
        }

        emit AuctionEnded(auctionId, auction.highestBidder, auction.currentBid);
    }

    /**
     * @dev Cancel listing (only seller)
     */
    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "Not seller");
        require(listing.active, "Listing not active");

        listing.active = false;
    }

    /**
     * @dev Update marketplace fee (admin only)
     */
    function updateMarketplaceFee(uint256 newFee) external onlyRole(ADMIN_ROLE) {
        require(newFee <= MAX_FEE, "Fee too high");
        marketplaceFee = newFee;
    }

    /**
     * @dev Update volume reward rate (admin only)
     */
    function updateVolumeRewardRate(uint256 newRate) external onlyRole(ADMIN_ROLE) {
        require(newRate <= 100, "Rate too high"); // Max 1%
        volumeRewardRate = newRate;
    }

    /**
     * @dev Claim trading rewards
     */
    function claimTradingRewards() external nonReentrant {
        uint256 rewards = tradingRewards[msg.sender];
        require(rewards > 0, "No rewards to claim");

        tradingRewards[msg.sender] = 0;
        payable(msg.sender).transfer(rewards);

        emit TradingRewardPaid(msg.sender, rewards);
    }

    /**
     * @dev Get active listings count
     */
    function getActiveListingsCount() external view returns (uint256) {
        return _listingIds.current();
    }

    /**
     * @dev Get active auctions count
     */
    function getActiveAuctionsCount() external view returns (uint256) {
        return _auctionIds.current();
    }

    /**
     * @dev Get user's total trading volume
     */
    function getUserTradingStats(address user) external view returns (uint256 volume, uint256 rewards) {
        return (tradingVolume[user], tradingRewards[user]);
    }

    /**
     * @dev Emergency functions
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Withdraw accumulated fees (admin only)
     */
    function withdrawFees() external onlyRole(ADMIN_ROLE) {
        uint256 balance = address(this).balance;
        payable(feeRecipient).transfer(balance);
    }

    receive() external payable {}
}