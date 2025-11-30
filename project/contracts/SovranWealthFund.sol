// SPDX-License-Identifier: No License
pragma solidity 0.8.25;

/**
 * @title Sovran Wealth Fund (SWF)
 * @dev ERC20 token with advanced financial management
 * @custom:security Verified on Polygonscan
 * @custom:address 0xa0b0AaCbf4E7261691689e5F240C278fB295edF7
 */
contract SovranWealthFund {
    // Token Properties
    string private _name = "Sovran Wealth Fund";
    string private _symbol = "SWF";
    uint8 private constant _decimals = 18;
    uint256 private _totalSupply = 1000000000 * 10**_decimals; // 1 billion tokens

    // Fee configuration
    uint256 public baseFee = 50; // 0.5%
    uint256 public burnFee = 25; // 0.25%
    uint256 public liquidityFee = 25; // 0.25%
    uint256 public holdFee = 25; // 0.25%
    uint256 public marketingFee = 25; // 0.25%
    uint256 public totalFee = 150; // 1.5%
    uint256 private constant FEE_DENOMINATOR = 10000;

    // Wallet addresses
    address public marketingWallet;
    address public liquidityWallet;
    address public holdingWallet;
    address public burnWallet = 0x000000000000000000000000000000000000dEaD;
    address public owner;

    // AMM pair address
    address public pair;

    // SOLO Plan Wallet Management
    struct WalletInfo {
        string name;
        address walletAddress;
        uint256 allocation; // allocation in basis points (1/100 of a percent, 10000 = 100%)
    }
    
    WalletInfo[] public soloWallets;

    // Security Features
    mapping(address => bool) public isExcludedFromFees;
    bool public tradingEnabled = false;
    
    // Balances and allowances
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    
    // Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event FeesUpdated(uint256 baseFee, uint256 burnFee, uint256 liquidityFee, uint256 holdFee, uint256 marketingFee);
    event TradingEnabled(bool enabled);
    event WalletUpdated(string walletType, address oldWallet, address newWallet);
    event TokensBurned(uint256 amount);
    event DividendsDistributed(uint256 amount);

    // Constructor
    constructor() {
        owner = msg.sender;
        marketingWallet = msg.sender;
        liquidityWallet = msg.sender;
        holdingWallet = msg.sender;
        
        // Initial allocation to deployer
        _balances[msg.sender] = _totalSupply;
        
        // Set up SOLO Plan wallets with placeholder addresses (will be set by owner)
        setupSoloWallets();
        
        // Exclude contract & deployer from fees
        isExcludedFromFees[address(this)] = true;
        isExcludedFromFees[msg.sender] = true;
        isExcludedFromFees[burnWallet] = true;
        
        emit Transfer(address(0), msg.sender, _totalSupply);
    }

    // SOLO Plan wallet setup
    function setupSoloWallets() private {
        soloWallets.push(WalletInfo("Development Fund", address(0), 1500)); // 15%
        soloWallets.push(WalletInfo("Marketing Fund", address(0), 1000)); // 10%
        soloWallets.push(WalletInfo("Ecosystem Growth", address(0), 1000)); // 10%
        soloWallets.push(WalletInfo("Team Allocation", address(0), 1000)); // 10%
        soloWallets.push(WalletInfo("Advisor Pool", address(0), 500)); // 5%
        soloWallets.push(WalletInfo("Community Rewards", address(0), 1000)); // 10%
        soloWallets.push(WalletInfo("Partner Integrations", address(0), 500)); // 5%
        soloWallets.push(WalletInfo("Reserve Fund", address(0), 1000)); // 10%
        soloWallets.push(WalletInfo("Liquidity Provision", address(0), 1500)); // 15%
        soloWallets.push(WalletInfo("Public Sale", address(0), 1000)); // 10%
        soloWallets.push(WalletInfo("Private Sale", address(0), 500)); // 5%
        soloWallets.push(WalletInfo("Staking Rewards", address(0), 500)); // 5%
    }
    
    // ERC20 Standard Functions
    function name() public view returns (string memory) {
        return _name;
    }
    
    function symbol() public view returns (string memory) {
        return _symbol;
    }
    
    function decimals() public pure returns (uint8) {
        return _decimals;
    }
    
    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }
    
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }
    
    function transfer(address recipient, uint256 amount) public returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }
    
    function allowance(address owner, address spender) public view returns (uint256) {
        return _allowances[owner][spender];
    }
    
    function approve(address spender, uint256 amount) public returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address sender, address recipient, uint256 amount) public returns (bool) {
        _transfer(sender, recipient, amount);
        
        uint256 currentAllowance = _allowances[sender][msg.sender];
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        unchecked {
            _approve(sender, msg.sender, currentAllowance - amount);
        }
        
        return true;
    }
    
    function _approve(address owner, address spender, uint256 amount) private {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");
        
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
    
    function _transfer(address sender, address recipient, uint256 amount) private {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");
        require(amount > 0, "Transfer amount must be greater than zero");
        
        if (!tradingEnabled) {
            require(isExcludedFromFees[sender] || isExcludedFromFees[recipient], "Trading not yet enabled");
        }
        
        // Calculate fees if neither address is excluded
        if (!isExcludedFromFees[sender] && !isExcludedFromFees[recipient]) {
            uint256 fees = (amount * totalFee) / FEE_DENOMINATOR;
            
            if (fees > 0) {
                // Distribute fees according to configuration
                uint256 burnAmount = (fees * burnFee) / totalFee;
                uint256 liquidityAmount = (fees * liquidityFee) / totalFee;
                uint256 holdAmount = (fees * holdFee) / totalFee;
                uint256 marketingAmount = (fees * marketingFee) / totalFee;
                
                // Transfer fees to respective wallets
                _balances[burnWallet] += burnAmount;
                emit Transfer(sender, burnWallet, burnAmount);
                
                _balances[liquidityWallet] += liquidityAmount;
                emit Transfer(sender, liquidityWallet, liquidityAmount);
                
                _balances[holdingWallet] += holdAmount;
                emit Transfer(sender, holdingWallet, holdAmount);
                
                _balances[marketingWallet] += marketingAmount;
                emit Transfer(sender, marketingWallet, marketingAmount);
                
                // Update amount after fees
                amount -= fees;
            }
        }
        
        // Transfer remaining tokens
        _balances[sender] -= amount;
        _balances[recipient] += amount;
        
        emit Transfer(sender, recipient, amount);
    }
    
    // Owner functions
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    function setFees(uint256 _baseFee, uint256 _burnFee, uint256 _liquidityFee, uint256 _holdFee, uint256 _marketingFee) external onlyOwner {
        require(_baseFee + _burnFee + _liquidityFee + _holdFee + _marketingFee <= 1000, "Total fee cannot exceed 10%");
        
        baseFee = _baseFee;
        burnFee = _burnFee;
        liquidityFee = _liquidityFee;
        holdFee = _holdFee;
        marketingFee = _marketingFee;
        totalFee = _baseFee + _burnFee + _liquidityFee + _holdFee + _marketingFee;
        
        emit FeesUpdated(baseFee, burnFee, liquidityFee, holdFee, marketingFee);
    }
    
    function setExcludedFromFees(address account, bool excluded) external onlyOwner {
        isExcludedFromFees[account] = excluded;
    }
    
    function setMarketingWallet(address _marketingWallet) external onlyOwner {
        require(_marketingWallet != address(0), "Cannot use zero address");
        address oldWallet = marketingWallet;
        marketingWallet = _marketingWallet;
        emit WalletUpdated("Marketing", oldWallet, _marketingWallet);
    }
    
    function setLiquidityWallet(address _liquidityWallet) external onlyOwner {
        require(_liquidityWallet != address(0), "Cannot use zero address");
        address oldWallet = liquidityWallet;
        liquidityWallet = _liquidityWallet;
        emit WalletUpdated("Liquidity", oldWallet, _liquidityWallet);
    }
    
    function setHoldingWallet(address _holdingWallet) external onlyOwner {
        require(_holdingWallet != address(0), "Cannot use zero address");
        address oldWallet = holdingWallet;
        holdingWallet = _holdingWallet;
        emit WalletUpdated("Holding", oldWallet, _holdingWallet);
    }
    
    function setPairAddress(address _pair) external onlyOwner {
        require(_pair != address(0), "Cannot use zero address");
        pair = _pair;
    }
    
    function enableTrading() external onlyOwner {
        tradingEnabled = true;
        emit TradingEnabled(true);
    }
    
    function updateSoloWallet(uint256 index, address walletAddress) external onlyOwner {
        require(index < soloWallets.length, "Invalid wallet index");
        require(walletAddress != address(0), "Cannot use zero address");
        
        soloWallets[index].walletAddress = walletAddress;
    }
    
    function getSoloWalletCount() external view returns (uint256) {
        return soloWallets.length;
    }
    
    function getSoloWalletInfo(uint256 index) external view returns (string memory name, address walletAddress, uint256 allocation) {
        require(index < soloWallets.length, "Invalid wallet index");
        WalletInfo memory wallet = soloWallets[index];
        return (wallet.name, wallet.walletAddress, wallet.allocation);
    }
    
    function burn(uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        require(_balances[msg.sender] >= amount, "Insufficient balance");
        
        _balances[msg.sender] -= amount;
        _totalSupply -= amount;
        
        emit TokensBurned(amount);
        emit Transfer(msg.sender, address(0), amount);
    }
    
    function distributeTokens() external onlyOwner {
        uint256 balance = _balances[msg.sender];
        require(balance > 0, "No tokens to distribute");
        
        for (uint256 i = 0; i < soloWallets.length; i++) {
            if (soloWallets[i].walletAddress != address(0)) {
                uint256 amount = (_totalSupply * soloWallets[i].allocation) / 10000;
                
                if (amount > 0 && amount <= balance) {
                    _balances[msg.sender] -= amount;
                    _balances[soloWallets[i].walletAddress] += amount;
                    
                    emit Transfer(msg.sender, soloWallets[i].walletAddress, amount);
                }
            }
        }
    }
}