require('dotenv').config();
const { ethers } = require('ethers');

// Connect to Ethereum Network (Mainnet via RPC URL)
console.log(`Connecting to Ethereum using RPC URL: ${process.env.RPC_URL ? 'URL configured' : 'URL not found'}`);
// Using v5 ethers.js syntax
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);

// Connect to SWF Token Contract
const tokenAbi = [
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function name() view returns (string)",
  "function symbol() view returns (string)"
];

const swfTokenAddress = process.env.TOKEN_ADDRESS;
console.log(`Initializing SWF token contract at address: ${swfTokenAddress}`);
const swfToken = new ethers.Contract(swfTokenAddress, tokenAbi, provider);

module.exports = {
  provider,
  swfToken,
  ethers
};