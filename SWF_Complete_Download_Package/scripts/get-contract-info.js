const { ethers } = require('ethers');
require('dotenv').config();

// Contract address
const CONTRACT_ADDRESS = '0xa0b0AaCbf4E7261691689e5F240C278fB295edF7';

// Basic ERC20 ABI (supports name, symbol, decimals, totalSupply)
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address, uint256) returns (bool)",
  "function allowance(address, address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
  "function transferFrom(address, address, uint256) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

async function getContractInfo() {
  try {
    // Get RPC URL from environment variable or use a public one
    const rpcUrl = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
    console.log(`Connecting to Polygon network at: ${rpcUrl}`);
    
    // Create provider
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    
    // Check connection
    console.log('Checking network connection...');
    const network = await provider.getNetwork();
    console.log(`Connected to: ${network.name} (Chain ID: ${network.chainId})`);
    
    // Get contract code 
    console.log(`\nChecking if contract exists at ${CONTRACT_ADDRESS}...`);
    const code = await provider.getCode(CONTRACT_ADDRESS);
    
    if (code === '0x') {
      console.error('❌ No contract deployed at this address!');
      return { success: false, error: 'No contract at address' };
    }
    
    console.log(`✅ Contract exists at ${CONTRACT_ADDRESS} (code length: ${code.length} chars)`);
    
    // Create contract instance
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ERC20_ABI, provider);
    
    // Get basic token info
    console.log('\nRetrieving token information...');
    
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      contract.name().catch(() => 'Unknown'),
      contract.symbol().catch(() => 'Unknown'),
      contract.decimals().catch(() => 18),
      contract.totalSupply().catch(() => ethers.BigNumber.from(0))
    ]);
    
    const formattedSupply = ethers.utils.formatUnits(totalSupply, decimals);
    
    // Display token info
    console.log('\n=== TOKEN INFORMATION ===');
    console.log(`Name:             ${name}`);
    console.log(`Symbol:           ${symbol}`);
    console.log(`Decimals:         ${decimals}`);
    console.log(`Total Supply:     ${formattedSupply} ${symbol}`);
    console.log(`Contract Address: ${CONTRACT_ADDRESS}`);
    console.log(`Network:          Polygon ${network.name}`);
    
    // Get owner balance (assuming deployer still holds tokens)
    try {
      // This is the presumed owner address (contract deployer)
      const ownerAddress = '0x4B5922ABf25858d012d12bb1184e5d3d0B6D6BE4';
      const ownerBalance = await contract.balanceOf(ownerAddress);
      const formattedBalance = ethers.utils.formatUnits(ownerBalance, decimals);
      const percentHolding = (Number(formattedBalance) / Number(formattedSupply) * 100).toFixed(2);
      
      console.log(`\nDeployer Address: ${ownerAddress}`);
      console.log(`Deployer Balance: ${formattedBalance} ${symbol} (${percentHolding}% of supply)`);
    } catch (error) {
      console.log('Could not retrieve presumed owner balance');
    }
    
    return { 
      success: true, 
      info: { name, symbol, decimals, totalSupply: formattedSupply }
    };
  } catch (error) {
    console.error(`❌ Error retrieving contract information: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Run the main function
getContractInfo()
  .then(result => {
    console.log('\n' + (result.success ? '✅ Contract info retrieved successfully' : '❌ Failed to get contract info'));
    process.exit(0);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });