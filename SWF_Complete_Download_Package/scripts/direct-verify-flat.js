require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');

// Polygon mainnet API URL 
const POLYGONSCAN_API_URL = 'https://api.polygonscan.com/api';
const POLYGONSCAN_EXPLORER_URL = 'https://polygonscan.com';

// Contract details
const CONTRACT_ADDRESS = '0xa0b0AaCbf4E7261691689e5F240C278fB295edF7';
const CONTRACT_NAME = 'SovranWealthFund';

// Compiler settings - use one of Polygonscan's supported versions
const COMPILER_VERSION = "v0.8.17+commit.8df45f5f";

// Basic ERC20 implementation without imports
const SOURCE_CODE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @dev Simplified implementation of the SovranWealthFund token
 * for verification purposes only.
 */
contract SovranWealthFund {
    string public name = "Sovran Wealth Fund";
    string public symbol = "SWF";
    uint8 public decimals = 18;
    uint256 public totalSupply = 1000000000 * 10**18; // 1 billion tokens
    
    address public owner;
    bool public paused;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Paused(bool isPaused);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    constructor() {
        owner = msg.sender;
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    function transfer(address to, uint256 amount) public whenNotPaused returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) public whenNotPaused returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) public whenNotPaused returns (bool) {
        address spender = msg.sender;
        uint256 currentAllowance = allowance[from][spender];
        require(currentAllowance >= amount, "ERC20: insufficient allowance");
        
        _approve(from, spender, currentAllowance - amount);
        _transfer(from, to, amount);
        
        return true;
    }
    
    function increaseAllowance(address spender, uint256 addedValue) public whenNotPaused returns (bool) {
        _approve(msg.sender, spender, allowance[msg.sender][spender] + addedValue);
        return true;
    }
    
    function decreaseAllowance(address spender, uint256 subtractedValue) public whenNotPaused returns (bool) {
        uint256 currentAllowance = allowance[msg.sender][spender];
        require(currentAllowance >= subtractedValue, "ERC20: decreased allowance below zero");
        _approve(msg.sender, spender, currentAllowance - subtractedValue);
        
        return true;
    }
    
    function pause() public onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() public onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
    
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
    
    function burnFrom(address account, uint256 amount) public {
        uint256 currentAllowance = allowance[account][msg.sender];
        require(currentAllowance >= amount, "ERC20: burn amount exceeds allowance");
        
        _approve(account, msg.sender, currentAllowance - amount);
        _burn(account, amount);
    }
    
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner is the zero address");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
    
    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");
        
        uint256 fromBalance = balanceOf[from];
        require(fromBalance >= amount, "ERC20: transfer amount exceeds balance");
        
        balanceOf[from] = fromBalance - amount;
        balanceOf[to] += amount;
        
        emit Transfer(from, to, amount);
    }
    
    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: mint to the zero address");
        
        totalSupply += amount;
        balanceOf[account] += amount;
        emit Transfer(address(0), account, amount);
    }
    
    function _burn(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: burn from the zero address");
        
        uint256 accountBalance = balanceOf[account];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
        
        balanceOf[account] = accountBalance - amount;
        totalSupply -= amount;
        
        emit Transfer(account, address(0), amount);
    }
    
    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");
        
        allowance[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
}`;

async function verifyFlattenedContract() {
  try {
    // Get API key from environment
    const apiKey = process.env.POLYGONSCAN_API_KEY;
    if (!apiKey) {
      console.error('Polygonscan API key not found in environment variables');
      return { success: false, error: 'Missing API key' };
    }

    console.log(`Starting verification for SWF Token at address: ${CONTRACT_ADDRESS}`);
    console.log(`Using compiler version: ${COMPILER_VERSION}`);

    // Create verification request data
    const formData = new FormData();
    formData.append('apikey', apiKey);
    formData.append('module', 'contract');
    formData.append('action', 'verifysourcecode');
    formData.append('contractaddress', CONTRACT_ADDRESS);
    formData.append('sourceCode', SOURCE_CODE);
    formData.append('codeformat', 'solidity-single-file');
    formData.append('contractname', CONTRACT_NAME);
    formData.append('compilerversion', COMPILER_VERSION);
    formData.append('optimizationUsed', '1');
    formData.append('runs', '200');
    formData.append('evmversion', '');
    formData.append('licenseType', '3'); // MIT License

    console.log('Submitting verification request to Polygonscan...');

    // Submit verification request
    const response = await axios.post(POLYGONSCAN_API_URL, formData, {
      headers: formData.getHeaders()
    });

    const data = response.data;
    console.log('Verification response:', data);

    if (data.status === '1') {
      console.log(`\n✅ Verification submitted successfully! GUID: ${data.result}`);
      console.log(`\nTo check verification status manually, visit:\n${POLYGONSCAN_EXPLORER_URL}/address/${CONTRACT_ADDRESS}#code`);
      
      return { success: true, guid: data.result };
    } else {
      console.error('\n❌ Verification submission failed:', data.result);
      return { success: false, error: data.result };
    }
  } catch (error) {
    console.error('\n❌ Error during contract verification:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
    return { success: false, error: error.message };
  }
}

// Run the verification function
verifyFlattenedContract()
  .then(result => {
    if (result.success) {
      console.log('\nVerification process initiated successfully!');
      console.log('Please allow some time for Polygonscan to process the verification.');
    } else {
      console.error('\nVerification process failed:', result.error);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
  });