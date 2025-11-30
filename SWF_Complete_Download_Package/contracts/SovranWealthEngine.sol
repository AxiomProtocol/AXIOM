// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@thirdweb-dev/contracts/base/ERC20Base.sol";
import "@thirdweb-dev/contracts/extension/PermissionsEnumerable.sol";
import "@thirdweb-dev/contracts/eip/interface/IERC20.sol";

/// @title Sovran Wealth Fund Token
contract SovranWealthFund is ERC20Base, PermissionsEnumerable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(address mainDistributor, address treasury) 
        ERC20Base(mainDistributor, "Sovran Wealth Fund", "SWF") 
    {
        _setupRole(DEFAULT_ADMIN_ROLE, mainDistributor);
        _setupRole(MINTER_ROLE, mainDistributor);
        _setupRole(MINTER_ROLE, treasury);

        // Assign roles to additional wallets (Uniswap, OTC, LP, etc.)
        address[14] memory minters = [
            0x7456BB1ab2FBb40B67807563595Cb6c9698d9aA1,
            0x7e9A4698788d582F3b99364071F5398416932010, // Fixed checksum
            0x50f7022033Ce4b1c025D7bFE56d0C27020Ae2Fe3,
            0xEB02B2bc1CEB07f0B9bB78a8467cEb090A4643Fc,
            0x3Ccc9DEB6121ab5733a9f5715dc92F4A40ED872a,
            0x750A4dBC335d9DE258d9D8297C002c4E002fde34,
            0x613AFbE121004958Ce6000cb2b14d1C8B0CBbB90, // Fixed checksum
            0x2A5269E92C48829fdF21D8892c23E894B11D15e3,
            0xE6A77F0b7Fe41FE01661B8bD82AAdF95dBAa5E79,
            0xCEDdB7dF2f6F1e1cAC7AC767337a38Ab1D85e1ed,
            0x62C62B5bc31CA7F04910d6Be28d74e07d82b4a50, // Fixed checksum
            0x5013Ae54fBaEC83106afA6cD26C06Ba64D2f718d,
            0x62850718f02f8f5874c0ADf156876eF01Ae8Be8C,
            0x8aF139af51FC53DD7575E331fBb039cF029e2Df0  // Fixed checksum
        ];

        for (uint i = 0; i < minters.length; i++) {
            _setupRole(MINTER_ROLE, minters[i]);
        }
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}

/// @title Solo Method Engine
/// @notice Manages 16-role staking logic with dynamic APR
contract SoloMethodEngine {
    IERC20 public swf;
    address public admin;

    enum WalletRole { BUYER, HOLDER, STAKER, LIQUIDITY, TRACKER }

    struct WalletInfo {
        WalletRole role;
        uint256 balance;
    }

    // Wallet structure
    mapping(address => WalletInfo[16]) public userWallets;
    mapping(address => uint256) public stakedAmount;
    mapping(address => uint256) public lastRewardTime;
    mapping(address => uint256) public rewardDebt;
    
    // Dynamic APR settings
    uint256 public aprBasisPoints = 2500; // 25% APR (in basis points)
    uint256 public constant BPS_DIVISOR = 10000;
    uint256 public constant SECONDS_IN_YEAR = 31536000;
    uint256 public constant MIN_STAKE_AMOUNT = 50 * 1e18; // 50 SWF minimum
    
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event Minted(address indexed user, uint256 reward);
    event APRUpdated(uint256 oldAPR, uint256 newAPR);

    constructor(address _swfTokenAddress) {
        swf = IERC20(_swfTokenAddress);
        admin = msg.sender;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call");
        _;
    }

    /// @notice Set a new APR value (in basis points)
    /// @param _newAprBps The new APR in basis points (100 = 1%)
    function setAPR(uint256 _newAprBps) external onlyAdmin {
        require(_newAprBps <= 5000, "APR too high (max 50%)");
        uint256 oldApr = aprBasisPoints;
        aprBasisPoints = _newAprBps;
        emit APRUpdated(oldApr, _newAprBps);
    }

    /// @notice Stake tokens and distribute them across 16 wallets
    function deposit(uint256 amount) external {
        require(amount >= MIN_STAKE_AMOUNT, "Minimum 50 SWF required");
        require(swf.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        // Update rewards before changing stake
        _updateRewards(msg.sender);

        // Distribute the amount across 16 wallets evenly
        for (uint8 i = 0; i < 16; i++) {
            userWallets[msg.sender][i] = WalletInfo(WalletRole(i % 5), amount / 16);
        }

        stakedAmount[msg.sender] += amount;
        lastRewardTime[msg.sender] = block.timestamp;
        emit Deposited(msg.sender, amount);
    }
    
    /// @notice Withdraw staked tokens
    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(stakedAmount[msg.sender] >= amount, "Insufficient staked balance");
        
        // Update rewards before changing stake
        _updateRewards(msg.sender);
        
        // Update staked amount
        stakedAmount[msg.sender] -= amount;
        
        // Reset wallet distribution
        if (stakedAmount[msg.sender] > 0) {
            // Recalculate wallets with new amount
            uint256 amountPerWallet = stakedAmount[msg.sender] / 16;
            for (uint8 i = 0; i < 16; i++) {
                userWallets[msg.sender][i].balance = amountPerWallet;
            }
        } else {
            // Clear all wallets if fully withdrawn
            for (uint8 i = 0; i < 16; i++) {
                userWallets[msg.sender][i].balance = 0;
            }
        }
        
        // Transfer SWF tokens back to user
        require(swf.transfer(msg.sender, amount), "Transfer failed");
        emit Withdrawn(msg.sender, amount);
    }
    
    /// @notice Update user's reward debt for precise tracking
    function _updateRewards(address user) internal {
        uint256 pending = calculateRewards(user);
        rewardDebt[user] = pending;
        lastRewardTime[user] = block.timestamp;
    }
    
    /// @notice Calculate earned rewards with continuous compounding
    function calculateRewards(address user) public view returns (uint256) {
        if (stakedAmount[user] == 0 || lastRewardTime[user] == 0) {
            return rewardDebt[user];
        }
        
        uint256 timeElapsed = block.timestamp - lastRewardTime[user];
        
        // Calculate reward: staked * APR * (timeElapsed / SECONDS_IN_YEAR)
        uint256 reward = (stakedAmount[user] * aprBasisPoints * timeElapsed) / 
                        BPS_DIVISOR / SECONDS_IN_YEAR;
        
        return reward + rewardDebt[user];
    }
    
    /// @notice Claim accumulated rewards
    function claimRewards() public {
        _updateRewards(msg.sender);
        uint256 reward = rewardDebt[msg.sender];
        
        if (reward > 0) {
            rewardDebt[msg.sender] = 0;
            
            // Transfer rewards to user (requires contract to have minter role)
            SovranWealthFund swfToken = SovranWealthFund(address(swf));
            swfToken.mint(msg.sender, reward);
            emit Minted(msg.sender, reward);
        }
    }

    /// @notice Get the distribution of tokens across 16 wallets
    function getWalletBreakdown(address user) external view returns (WalletInfo[16] memory) {
        return userWallets[user];
    }

    /// @notice Get total staked amount for a user
    function getTotalStaked(address user) external view returns (uint256) {
        return stakedAmount[user];
    }
    
    /// @notice Get pending rewards for a user
    function getPendingRewards(address user) external view returns (uint256) {
        return calculateRewards(user);
    }
    
    /// @notice Get current APR in percentage (25% = 2500 basis points)
    function getCurrentAPR() external view returns (uint256) {
        return aprBasisPoints;
    }
}