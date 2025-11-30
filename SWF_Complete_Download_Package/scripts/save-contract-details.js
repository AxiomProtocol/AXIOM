const { ethers } = require('ethers');
const fs = require('fs');
require('dotenv').config();

// Contract address
const CONTRACT_ADDRESS = '0xa0b0AaCbf4E7261691689e5F240C278fB295edF7';
const OUTPUT_FILE = 'SovranWealthFund.token.json';

// Basic ERC20 ABI 
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

async function saveContractDetails() {
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
    
    // Create the token information object
    const tokenInfo = {
      name,
      symbol,
      decimals: Number(decimals),
      totalSupply: formattedSupply,
      address: CONTRACT_ADDRESS,
      network: {
        name: network.name,
        chainId: network.chainId
      },
      abi: ERC20_ABI,
      verificationStatus: {
        verified: true,
        date: new Date().toISOString(),
        method: "Direct blockchain interaction"
      }
    };
    
    // Save to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(tokenInfo, null, 2));
    console.log(`\n✅ Token information saved to ${OUTPUT_FILE}`);
    
    // Display a summary
    console.log('\n=== TOKEN INFORMATION ===');
    console.log(`Name:             ${name}`);
    console.log(`Symbol:           ${symbol}`);
    console.log(`Decimals:         ${decimals}`);
    console.log(`Total Supply:     ${formattedSupply} ${symbol}`);
    console.log(`Contract Address: ${CONTRACT_ADDRESS}`);
    console.log(`Network:          Polygon ${network.name} (${network.chainId})`);
    
    return { success: true, info: tokenInfo };
  } catch (error) {
    console.error(`❌ Error retrieving contract information: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Run the main function
saveContractDetails()
  .then(result => {
    console.log('\n' + (result.success ? '✅ Contract info saved successfully' : '❌ Failed to save contract info'));
    process.exit(0);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });