// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Define interface for compatibility
interface ILiquidityVault {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function balanceOf(address user) external view returns (uint256);
}

interface IGovernanceDividendPool {
    function stake(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function claim() external;
}

interface ISWFVaultAdapter {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function forwardToVault(uint256 amount) external;
}

/* ============================
   Module 1: LiquidityVault.sol
   ============================ */
contract LiquidityVault is Ownable {
    IERC20 public lpToken;
    mapping(address => uint256) public staked;
    uint256 public totalStaked;

    constructor(address _lpToken) Ownable(msg.sender) {
        lpToken = IERC20(_lpToken);
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "Zero amount");
        lpToken.transferFrom(msg.sender, address(this), amount);
        staked[msg.sender] += amount;
        totalStaked += amount;
    }

    function withdraw(uint256 amount) external {
        require(staked[msg.sender] >= amount, "Insufficient");
        staked[msg.sender] -= amount;
        totalStaked -= amount;
        lpToken.transfer(msg.sender, amount);
    }

    function balanceOf(address user) public view returns (uint256) {
        return staked[user];
    }
}

/* ============================================
   Module 2: GovernanceDividendPool.sol
   ============================================ */
contract GovernanceDividendPool is Ownable {
    IERC20 public swfToken;
    mapping(address => uint256) public stakes;
    uint256 public totalStaked;
    mapping(address => uint256) public lastClaim;
    uint256 public rewardRate;

    constructor(address _swfToken, uint256 _rate) Ownable(msg.sender) {
        swfToken = IERC20(_swfToken);
        rewardRate = _rate;
    }

    function stake(uint256 amount) external {
        require(amount > 0, "Zero amount");
        swfToken.transferFrom(msg.sender, address(this), amount);
        stakes[msg.sender] += amount;
        totalStaked += amount;
        lastClaim[msg.sender] = block.timestamp;
    }

    function withdraw(uint256 amount) external {
        require(stakes[msg.sender] >= amount, "Insufficient stake");
        claim();
        stakes[msg.sender] -= amount;
        totalStaked -= amount;
        swfToken.transfer(msg.sender, amount);
    }

    function claim() public {
        uint256 time = block.timestamp - lastClaim[msg.sender];
        uint256 reward = (stakes[msg.sender] * rewardRate * time) / 30 days / 1e18;
        lastClaim[msg.sender] = block.timestamp;
        payable(msg.sender).transfer(reward);
    }

    receive() external payable {}
}

/* =======================================
   Module 3: SWFVaultAdapter.sol
   ======================================= */
contract SWFVaultAdapter is Ownable {
    IERC20 public swf;
    address public vault;

    mapping(address => uint256) public deposits;
    uint256 public totalDeposits;

    constructor(address _swf, address _vault) Ownable(msg.sender) {
        swf = IERC20(_swf);
        vault = _vault;
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "Zero deposit");
        swf.transferFrom(msg.sender, address(this), amount);
        deposits[msg.sender] += amount;
        totalDeposits += amount;
    }

    function withdraw(uint256 amount) external {
        require(deposits[msg.sender] >= amount, "Insufficient");
        deposits[msg.sender] -= amount;
        totalDeposits -= amount;
        swf.transfer(msg.sender, amount);
    }

    function forwardToVault(uint256 amount) external onlyOwner {
        swf.transfer(vault, amount);
    }
}