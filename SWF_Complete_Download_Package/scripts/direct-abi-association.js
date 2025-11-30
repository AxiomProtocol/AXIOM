/**
 * Direct ABI Association Script
 * 
 * This script directly associates an ABI with a contract address on Polygonscan
 * without attempting full source code verification.
 */
require('dotenv').config();
const axios = require('axios');

// Configuration
const CONTRACT_ADDRESS = "0xa0b0AaCbf4E7261691689e5F240C278fB295edF7";

// Get Polygonscan API key
if (!process.env.POLYGONSCAN_API_KEY) {
  console.error("ERROR: POLYGONSCAN_API_KEY not found in .env file");
  console.log("Please add your Polygonscan API key to the .env file:");
  console.log("POLYGONSCAN_API_KEY=your_api_key_here");
  process.exit(1);
}

const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY;
const POLYGONSCAN_API_URL = "https://api.polygonscan.com/api";

// The ABI for the SovranWealthFund token - matching the contract functionality exactly
const ABI = [
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [{ "name": "", "type": "string" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "name": "", "type": "string" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{ "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "name": "recipient", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "name": "", "type": "bool" }],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      { "name": "owner", "type": "address" },
      { "name": "spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "name": "", "type": "uint256" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "name": "sender", "type": "address" },
      { "name": "recipient", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "transferFrom",
    "outputs": [{ "name": "", "type": "bool" }],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "name": "account", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "mint",
    "outputs": [{ "name": "", "type": "bool" }],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [{ "name": "amount", "type": "uint256" }],
    "name": "burn",
    "outputs": [{ "name": "", "type": "bool" }],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "addedValue", "type": "uint256" }
    ],
    "name": "increaseAllowance",
    "outputs": [{ "name": "", "type": "bool" }],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "subtractedValue", "type": "uint256" }
    ],
    "name": "decreaseAllowance",
    "outputs": [{ "name": "", "type": "bool" }],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "from", "type": "address" },
      { "indexed": true, "name": "to", "type": "address" },
      { "indexed": false, "name": "value", "type": "uint256" }
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "owner", "type": "address" },
      { "indexed": true, "name": "spender", "type": "address" },
      { "indexed": false, "name": "value", "type": "uint256" }
    ],
    "name": "Approval",
    "type": "event"
  }
];

async function main() {
  console.log(`Attempting direct ABI association for contract ${CONTRACT_ADDRESS}...`);
  
  try {
    // First check if contract already has an ABI
    const checkParams = new URLSearchParams();
    checkParams.append('apikey', POLYGONSCAN_API_KEY);
    checkParams.append('module', 'contract');
    checkParams.append('action', 'getsourcecode');
    checkParams.append('address', CONTRACT_ADDRESS);
    
    const checkResponse = await axios.get(`${POLYGONSCAN_API_URL}?${checkParams}`);
    
    if (checkResponse.data.status === '1' && 
        checkResponse.data.result[0].ABI !== "Contract source code not verified") {
      console.log("✅ Contract already has an ABI on Polygonscan!");
      console.log(`Contract Name: ${checkResponse.data.result[0].ContractName}`);
      console.log(`You can view it at: https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
      return;
    }
    
    console.log("Contract does not have an ABI yet. Attempting direct ABI association...");
    
    // Submit ABI directly
    const abiParams = new URLSearchParams();
    abiParams.append('apikey', POLYGONSCAN_API_KEY);
    abiParams.append('module', 'contract');
    abiParams.append('action', 'verifysourcecode');
    abiParams.append('address', CONTRACT_ADDRESS);
    abiParams.append('abi', JSON.stringify(ABI));
    
    const abiResponse = await axios.post(POLYGONSCAN_API_URL, abiParams);
    
    console.log('API Response:', abiResponse.data);
    
    if (abiResponse.data.status === '1') {
      console.log('✅ Success! ABI associated with the contract successfully');
      console.log(`View on Polygonscan: https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
      return;
    } else {
      console.log('❌ Failed to associate ABI via API');
      console.log('API response:', abiResponse.data);
      
      // If there's an issue with the API, provide manual instructions
      console.log('\nPlease follow these manual steps:');
      console.log('1. Go to https://polygonscan.com/address/' + CONTRACT_ADDRESS + '#code');
      console.log('2. Click "Verify and Publish"');
      console.log('3. Select "Solidity (Bytecode Source)" as the verification method');
      console.log('4. Fill in the contract details:');
      console.log('   - Contract Name: SovranWealthFund');
      console.log('   - Compiler Version: v0.8.20+commit.a1b79de6');
      console.log('   - Optimization: Yes with 200 runs');
      console.log('   - License Type: UNLICENSED (1)');
      console.log('5. In the ABI section, paste the ABI from MANUAL_BYTECODE_VERIFICATION_GUIDE.md');
      console.log('6. Submit the form');
    }
  } catch (error) {
    console.error('Error during ABI association:', error.message);
    
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    
    console.log('\nPlease use the manual bytecode verification method as described in MANUAL_BYTECODE_VERIFICATION_GUIDE.md');
  }
}

main().catch(console.error);