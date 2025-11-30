/**
 * SWF Price Calculator
 * 
 * This module calculates the current price of SWF tokens from PancakeSwap pool data.
 */

const { ethers } = require('ethers');

// Contract ABIs
const PANCAKESWAP_FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)'
];

const PANCAKESWAP_PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32)',
  'function token0() view returns (address)',
  'function token1() view returns (address)'
];

// Constants
const SWF_TOKEN_DECIMALS = 18; // Updated for BEP20 standard
const BNB_DECIMALS = 18;
const PANCAKESWAP_V2_FACTORY_ADDRESS = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73';
const WBNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'; // WBNB on BSC Mainnet
// Read SWF contract address from environment
const SWF_CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x7e243288B287BEe84A7D40E8520444f47af88335';
const BNB_USD_API = 'https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd';

/**
 * Get PancakeSwap pair address for SWF/BNB
 * @param {ethers.providers.Provider} provider - An ethers provider instance
 * @returns {Promise<string>} - Pair address or null if no pair exists
 */
async function getPairAddress(provider) {
  try {
    const factoryContract = new ethers.Contract(
      PANCAKESWAP_V2_FACTORY_ADDRESS,
      PANCAKESWAP_FACTORY_ABI,
      provider
    );
    
    const pairAddress = await factoryContract.getPair(SWF_CONTRACT_ADDRESS, WBNB_ADDRESS);
    
    // Check if pair exists
    if (pairAddress === '0x0000000000000000000000000000000000000000') {
      console.log('No SWF/BNB liquidity pool exists yet');
      return null;
    }
    
    return pairAddress;
  } catch (error) {
    console.error('Error getting pair address:', error);
    return null;
  }
}

/**
 * Fetch the current SWF price in USD using PancakeSwap pool data
 * @param {ethers.providers.Provider} provider - An ethers provider instance
 * @returns {Promise<{price: number, bnbPrice: number, swfInPool: number, bnbInPool: number}>}
 */
async function fetchSWFPrice(provider) {
  try {
    // Ensure we have a provider
    if (!provider) {
      throw new Error('Provider is required');
    }
    
    // First try to get the pair address
    const pairAddress = await getPairAddress(provider);
    
    // If no pair exists, return zeros
    if (!pairAddress) {
      console.log('No liquidity pool exists yet, returning zero values');
      return {
        price: 0,
        swfPriceInBnb: 0,
        bnbPrice: 0,
        swfInPool: 0,
        bnbInPool: 0,
        poolExists: false
      };
    }
    
    // Connect to the PancakeSwap pair contract
    const pairContract = new ethers.Contract(pairAddress, PANCAKESWAP_PAIR_ABI, provider);
    
    // Fetch current BNB price in USD
    let bnbUsd = 0;
    try {
      const bnbPriceRes = await fetch(BNB_USD_API);
      const bnbPriceJson = await bnbPriceRes.json();
      bnbUsd = bnbPriceJson.binancecoin.usd;
    } catch (error) {
      console.warn('Could not fetch BNB price, using fallback price of $300');
      bnbUsd = 300; // Fallback price if API fails
    }
    
    // Get reserves and token addresses
    const [reserve0, reserve1] = await pairContract.getReserves();
    const token0 = await pairContract.token0();
    const token1 = await pairContract.token1();
    
    // Determine which token is SWF and which is BNB
    const isToken0SWF = token0.toLowerCase() === SWF_CONTRACT_ADDRESS.toLowerCase();
    
    const swfReserve = isToken0SWF ? reserve0 : reserve1;
    const bnbReserve = isToken0SWF ? reserve1 : reserve0;
    
    // Format values
    const swfInPool = parseFloat(ethers.utils.formatUnits(swfReserve, SWF_TOKEN_DECIMALS));
    const bnbInPool = parseFloat(ethers.utils.formatUnits(bnbReserve, BNB_DECIMALS));
    
    // Calculate SWF price in BNB and USD
    const swfPriceInBnb = bnbInPool / swfInPool;
    const swfPriceUsd = swfPriceInBnb * bnbUsd;
    
    return {
      price: swfPriceUsd,
      swfPriceInBnb: swfPriceInBnb,
      bnbPrice: bnbUsd,
      swfInPool: swfInPool,
      bnbInPool: bnbInPool,
      poolExists: true,
      pairAddress: pairAddress
    };
  } catch (err) {
    console.error('Error fetching SWF price:', err);
    return {
      price: 0,
      swfPriceInBnb: 0,
      bnbPrice: 0,
      swfInPool: 0,
      bnbInPool: 0,
      poolExists: false,
      error: err.message
    };
  }
}

// Export the function
module.exports = { fetchSWFPrice };