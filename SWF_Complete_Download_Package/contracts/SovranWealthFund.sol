// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./interfaces/IAggregatorV3Interface.sol";
import "./interfaces/IPegManagement.sol";

/**
 * @title SovranWealthFund
 * @dev Implementation of the Sovran Wealth Fund token with multi-asset pegging
 * and advanced DeFi capabilities.
 * 
 * This token is designed with:
 * - Role-based access control
 * - Multi-asset pegging (11 currencies including BTC, XRP)
 * - Dynamic APR system
 * - Module integration support
 * - Staking capabilities
 * - Pausable functions for emergency use
 * - Burnable token supply
 * 
 * The token is compatible with the Polygon network and designed
 * for easy verification on Polygonscan.
 */
contract SovranWealthFund is ERC20Burnable, AccessControl, Pausable, IPegManagement {
    // In Solidity 0.8+, overflow checking is built into the language so SafeMath is not needed
    
    // Roles
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant PEG_MANAGER_ROLE = keccak256("PEG_MANAGER_ROLE");
    bytes32 public constant RESERVE_MANAGER_ROLE = keccak256("RESERVE_MANAGER_ROLE");
    bytes32 public constant TRANSFER_ROLE = keccak256("TRANSFER_ROLE");
    
    // Staking-related constants
    uint256 public constant MINIMUM_STAKE_AMOUNT = 50 * 10**18; // 50 SWF minimum
    uint256 public constant SECONDS_IN_YEAR = 31536000; // 365 days
    uint256 public constant BPS_DIVISOR = 10000; // Basis points divisor (100%)
    
    // Default APR: 25% (2500 basis points)
    uint256 public aprBasisPoints = 2500;
    uint256 public minAprBasisPoints = 1; // 0.01% minimum
    uint256 public maxAprBasisPoints = 5000; // 50% maximum
    
    // Asset pegging structure
    struct PeggedAsset {
        string symbol;
        address oracle;
        uint256 weight;        // Weight in the basket (basis points)
        uint256 reserveRatio;  // Required reserve backing (basis points)
        bool active;
        uint256 lastUpdated;
    }
    
    // Reserve tracking
    struct AssetReserve {
        address tokenAddress;  // The reserve token address (0x0 for native assets)
        uint256 balance;       // Current reserve balance
        uint256 targetBalance; // Target reserve balance
    }
    
    // Staking structure - for 16-wallet system
    struct StakingInfo {
        uint256 totalStaked;       // Total amount staked
        uint256 lastUpdateTime;    // Last time staking was updated
        uint256 rewardDebt;        // Reward accounting variable
        address[] virtualWallets;  // Array of virtual wallet addresses
        mapping(address => uint256) walletBalances; // Balance for each virtual wallet
        mapping(address => uint8) walletRoles;      // Role for each virtual wallet
    }
    
    // Roles for virtual wallets (used in staking)
    uint8 public constant ROLE_BUYER = 1;
    uint8 public constant ROLE_HOLDER = 2;
    uint8 public constant ROLE_STAKER = 3;
    uint8 public constant ROLE_LIQUIDITY = 4;
    uint8 public constant ROLE_TRACKER = 5;
    
    // Mapping of asset symbol to pegged asset data
    mapping(string => PeggedAsset) public peggedAssets;
    // Mapping of asset symbol to reserve data
    mapping(string => AssetReserve) public assetReserves;
    // Array of all pegged asset symbols for enumeration
    string[] public assetSymbols;
    
    // Special focus on BTC and XRP reserves
    AssetReserve public btcReserve;
    AssetReserve public xrpReserve;
    
    // Staking system mappings
    mapping(address => StakingInfo) private stakingInfo;
    
    // Events
    event PeggedAssetAdded(string symbol, address oracle, uint256 weight);
    event PeggedAssetUpdated(string symbol, address oracle, uint256 weight);
    event ReserveUpdated(string symbol, uint256 newBalance, uint256 targetBalance);
    event PegAdjusted(string symbol, uint256 oldPrice, uint256 newPrice);
    event APRUpdated(uint256 oldAprBps, uint256 newAprBps);
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    
    /**
     * @dev Constructor initializes the token with name, symbol, and assigns roles
     */
    constructor() ERC20("Sovran Wealth Fund", "SWF") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(PEG_MANAGER_ROLE, msg.sender);
        _grantRole(RESERVE_MANAGER_ROLE, msg.sender);
        _grantRole(TRANSFER_ROLE, msg.sender);
        
        // Initial supply minting (1 billion tokens)
        _mint(msg.sender, 1000000000 * 10**18);
    }
    
    /**
     * @dev Adds a new asset to the pegged basket
     * @param symbol The asset symbol (e.g., "BTC", "XRP")
     * @param oracle Address of the price oracle for this asset
     * @param weight Weight of this asset in the basket (basis points)
     * @param reserveRatio Required reserve ratio (basis points)
     * @param tokenAddress Address of the reserve token
     */
    function addPeggedAsset(
        string memory symbol,
        address oracle,
        uint256 weight,
        uint256 reserveRatio,
        address tokenAddress
    ) external onlyRole(PEG_MANAGER_ROLE) {
        require(peggedAssets[symbol].oracle == address(0), "Asset already exists");
        require(oracle != address(0), "Invalid oracle address");
        require(weight > 0 && weight <= 10000, "Weight must be between 1 and 10000 basis points");
        
        peggedAssets[symbol] = PeggedAsset({
            symbol: symbol,
            oracle: oracle,
            weight: weight,
            reserveRatio: reserveRatio,
            active: true,
            lastUpdated: block.timestamp
        });
        
        assetReserves[symbol] = AssetReserve({
            tokenAddress: tokenAddress,
            balance: 0,
            targetBalance: 0
        });
        
        assetSymbols.push(symbol);
        
        // Special handling for BTC and XRP
        if (keccak256(abi.encodePacked(symbol)) == keccak256(abi.encodePacked("BTC"))) {
            btcReserve = assetReserves[symbol];
        } else if (keccak256(abi.encodePacked(symbol)) == keccak256(abi.encodePacked("XRP"))) {
            xrpReserve = assetReserves[symbol];
        }
        
        emit PeggedAssetAdded(symbol, oracle, weight);
    }
    
    /**
     * @dev Updates the reserve balance for a pegged asset
     * @param symbol The asset symbol
     * @param newBalance The new reserve balance
     */
    function updateReserveBalance(string memory symbol, uint256 newBalance) 
        external 
        override
        onlyRole(RESERVE_MANAGER_ROLE) 
    {
        require(peggedAssets[symbol].active, "Asset not active");
        
        assetReserves[symbol].balance = newBalance;
        
        // Update BTC or XRP specific reserves if needed
        if (keccak256(abi.encodePacked(symbol)) == keccak256(abi.encodePacked("BTC"))) {
            btcReserve.balance = newBalance;
        } else if (keccak256(abi.encodePacked(symbol)) == keccak256(abi.encodePacked("XRP"))) {
            xrpReserve.balance = newBalance;
        }
        
        emit ReserveUpdated(symbol, newBalance, assetReserves[symbol].targetBalance);
    }
    
    /**
     * @dev Returns the current price feed for an asset
     * @param symbol The asset symbol
     * @return price The current price in USD (18 decimals)
     */
    function getAssetPrice(string memory symbol) 
        public 
        view 
        override
        returns (uint256 price) 
    {
        PeggedAsset memory asset = peggedAssets[symbol];
        require(asset.active, "Asset not active");
        
        IAggregatorV3Interface oracle = IAggregatorV3Interface(asset.oracle);
        (, int256 answer, , uint256 updatedAt, ) = oracle.latestRoundData();
        
        require(answer > 0, "Invalid oracle price");
        require(block.timestamp - updatedAt < 1 days, "Oracle data too old");
        
        // Convert oracle decimals to 18 decimals
        uint8 oracleDecimals = oracle.decimals();
        if (oracleDecimals < 18) {
            price = uint256(answer) * 10**(18 - oracleDecimals);
        } else if (oracleDecimals > 18) {
            price = uint256(answer) / 10**(oracleDecimals - 18);
        } else {
            price = uint256(answer);
        }
        
        return price;
    }
    
    /**
     * @dev Calculates the basket value based on pegged assets
     * @return basketValue The current value of the entire basket
     */
    function getBasketValue() public view override returns (uint256 basketValue) {
        basketValue = 0;
        
        for (uint i = 0; i < assetSymbols.length; i++) {
            string memory symbol = assetSymbols[i];
            PeggedAsset memory asset = peggedAssets[symbol];
            
            if (asset.active) {
                uint256 assetPrice = getAssetPrice(symbol);
                uint256 assetValue = assetPrice * asset.weight / 10000;
                basketValue = basketValue + assetValue;
            }
        }
        
        return basketValue;
    }
    
    /**
     * @dev Returns information about a specific asset's peg and reserve
     * @param symbol The asset symbol
     * @return weight Weight in the basket
     * @return price Current price
     * @return reserveBalance Current reserve balance
     * @return reserveRatio Required reserve ratio
     */
    function getAssetInfo(string memory symbol) 
        external 
        view 
        override
        returns (
            uint256 weight,
            uint256 price,
            uint256 reserveBalance,
            uint256 reserveRatio
        ) 
    {
        PeggedAsset memory asset = peggedAssets[symbol];
        require(asset.active, "Asset not active");
        
        return (
            asset.weight,
            getAssetPrice(symbol),
            assetReserves[symbol].balance,
            asset.reserveRatio
        );
    }
    
    /**
     * @dev Sets a new APR for staking rewards
     * @param newAprBps New APR in basis points (e.g., 2500 for 25%)
     */
    function setAPR(uint256 newAprBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newAprBps >= minAprBasisPoints, "APR below minimum");
        require(newAprBps <= maxAprBasisPoints, "APR above maximum");
        
        uint256 oldAprBps = aprBasisPoints;
        aprBasisPoints = newAprBps;
        
        emit APRUpdated(oldAprBps, newAprBps);
    }
    
    /**
     * @dev Returns the current APR for staking
     * @return Current APR in basis points
     */
    function getCurrentAPR() external view returns (uint256) {
        return aprBasisPoints;
    }
    
    /**
     * @dev Initializes the 16-wallet structure for a user
     * @param user Address of the user
     */
    function _initializeVirtualWallets(address user) internal {
        StakingInfo storage info = stakingInfo[user];
        
        // Only initialize if not already initialized
        if (info.virtualWallets.length == 0) {
            // Create 16 virtual wallets
            for (uint8 i = 0; i < 16; i++) {
                // Generate a "virtual" wallet address based on user address and index
                address virtualWallet = address(uint160(uint256(keccak256(abi.encodePacked(user, i)))));
                info.virtualWallets.push(virtualWallet);
                
                // Assign roles in a distributed pattern
                uint8 roleIndex = i % 5;
                uint8 role;
                
                if (roleIndex == 0) role = ROLE_BUYER;
                else if (roleIndex == 1) role = ROLE_HOLDER;
                else if (roleIndex == 2) role = ROLE_STAKER;
                else if (roleIndex == 3) role = ROLE_LIQUIDITY;
                else role = ROLE_TRACKER;
                
                info.walletRoles[virtualWallet] = role;
            }
        }
    }
    
    /**
     * @dev Stake SWF tokens to earn rewards
     * @param amount Amount to stake
     */
    function stake(uint256 amount) external whenNotPaused {
        require(amount >= MINIMUM_STAKE_AMOUNT, "Below minimum stake amount");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        StakingInfo storage info = stakingInfo[msg.sender];
        
        // Initialize virtual wallets if needed
        _initializeVirtualWallets(msg.sender);
        
        // Claim any pending rewards first
        if (info.totalStaked > 0) {
            _claimRewards(msg.sender);
        }
        
        // Transfer tokens from user to contract
        _transfer(msg.sender, address(this), amount);
        
        // Update staking info
        info.totalStaked = info.totalStaked + amount;
        info.lastUpdateTime = block.timestamp;
        
        // Distribute staked amount across virtual wallets
        uint256 amountPerWallet = amount / info.virtualWallets.length;
        for (uint i = 0; i < info.virtualWallets.length; i++) {
            address virtualWallet = info.virtualWallets[i];
            info.walletBalances[virtualWallet] = info.walletBalances[virtualWallet] + amountPerWallet;
        }
        
        emit Staked(msg.sender, amount);
    }
    
    /**
     * @dev Withdraw staked tokens
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) external {
        StakingInfo storage info = stakingInfo[msg.sender];
        require(info.totalStaked >= amount, "Insufficient staked balance");
        
        // Claim rewards first
        _claimRewards(msg.sender);
        
        // Calculate amount per wallet
        uint256 amountPerWallet = amount / info.virtualWallets.length;
        
        // Reduce balances in each virtual wallet
        for (uint i = 0; i < info.virtualWallets.length; i++) {
            address virtualWallet = info.virtualWallets[i];
            info.walletBalances[virtualWallet] = info.walletBalances[virtualWallet] - amountPerWallet;
        }
        
        // Update staking info
        info.totalStaked = info.totalStaked - amount;
        info.lastUpdateTime = block.timestamp;
        
        // Transfer tokens back to user
        _transfer(address(this), msg.sender, amount);
        
        emit Withdrawn(msg.sender, amount);
    }
    
    /**
     * @dev Get pending staking rewards for a user
     * @param user Address of the user
     * @return Pending rewards amount
     */
    function getPendingRewards(address user) public view returns (uint256) {
        StakingInfo storage info = stakingInfo[user];
        
        if (info.totalStaked == 0) {
            return 0;
        }
        
        uint256 timeElapsed = block.timestamp - info.lastUpdateTime;
        
        // Calculate rewards: (staked * APR * timeElapsed) / BPS_DIVISOR / SECONDS_IN_YEAR
        uint256 pendingRewards = info.totalStaked
            * aprBasisPoints
            * timeElapsed
            / BPS_DIVISOR
            / SECONDS_IN_YEAR;
            
        return pendingRewards;
    }
    
    /**
     * @dev Internal function to claim staking rewards
     * @param user Address of the user
     * @return Amount of rewards claimed
     */
    function _claimRewards(address user) internal returns (uint256) {
        uint256 pendingRewards = getPendingRewards(user);
        
        if (pendingRewards > 0) {
            StakingInfo storage info = stakingInfo[user];
            info.lastUpdateTime = block.timestamp;
            
            // Mint rewards
            _mint(user, pendingRewards);
            
            emit RewardsClaimed(user, pendingRewards);
        }
        
        return pendingRewards;
    }
    
    /**
     * @dev Claim staking rewards
     */
    function claimRewards() external {
        uint256 claimed = _claimRewards(msg.sender);
        require(claimed > 0, "No rewards to claim");
    }
    
    /**
     * @dev Get total staked amount for a user
     * @param user Address of the user
     * @return Total staked amount
     */
    function getTotalStaked(address user) external view returns (uint256) {
        return stakingInfo[user].totalStaked;
    }
    
    /**
     * @dev Get wallet breakdown for a user's virtual wallets
     * @param user Address of the user
     * @return wallets Array of virtual wallet addresses
     * @return balances Array of balances for each wallet
     * @return roles Array of roles for each wallet
     */
    function getWalletBreakdown(address user) 
        external 
        view 
        returns (
            address[] memory wallets,
            uint256[] memory balances,
            uint8[] memory roles
        ) 
    {
        StakingInfo storage info = stakingInfo[user];
        uint256 walletCount = info.virtualWallets.length;
        
        if (walletCount == 0) {
            // Return empty arrays if user has no virtual wallets
            wallets = new address[](0);
            balances = new uint256[](0);
            roles = new uint8[](0);
        } else {
            wallets = new address[](walletCount);
            balances = new uint256[](walletCount);
            roles = new uint8[](walletCount);
            
            for (uint i = 0; i < walletCount; i++) {
                address virtualWallet = info.virtualWallets[i];
                wallets[i] = virtualWallet;
                balances[i] = info.walletBalances[virtualWallet];
                roles[i] = info.walletRoles[virtualWallet];
            }
        }
        
        return (wallets, balances, roles);
    }
    
    /**
     * @dev Pauses token transfers
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpauses token transfers
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Mints new tokens
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
    
    /**
     * @dev Override of _beforeTokenTransfer with pause functionality
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual whenNotPaused {
        // No super call needed as ERC20Burnable doesn't override _beforeTokenTransfer
    }
    
    /**
     * @dev Override of supportsInterface to support multiple interfaces
     */
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(AccessControl) 
        returns (bool) 
    {
        return
            interfaceId == type(IPegManagement).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}