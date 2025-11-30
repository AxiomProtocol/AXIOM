require('dotenv').config();
const { ethers } = require('ethers');

const provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contractAddress = process.env.CONTRACT_ADDRESS;
const abi = require('../abi/verifiedSWF.json'); // Make sure ABI is saved in this path

const contract = new ethers.Contract(contractAddress, abi, wallet);

module.exports = { provider, wallet, contract };
