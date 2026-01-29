const { ethers } = require('ethers');
require('dotenv').config();

const CAMELOT_ROUTER = '0xc873fEcbd354f5A56E00E710B90EF4201db2448d';
const WETH = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
const USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

const ROUTER_ABI = [
  'function swapExactETHForTokensSupportingFeeOnTransferTokens(uint256 amountOutMin, address[] calldata path, address to, address referrer, uint256 deadline) external payable',
  'function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

async function main() {
  const ethAmount = process.argv[2] || '0.01';
  
  console.log('='.repeat(60));
  console.log('ETH -> USDC Swap via Camelot');
  console.log('='.repeat(60));
  
  if (!process.env.DEPLOYER_PRIVATE_KEY) {
    console.log('\nERROR: DEPLOYER_PRIVATE_KEY not set in environment');
    console.log('Please set it in Replit Secrets or .env file');
    process.exit(1);
  }
  
  const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc');
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  
  console.log('\nWallet:', wallet.address);
  
  const ethBalance = await provider.getBalance(wallet.address);
  console.log('ETH Balance:', ethers.formatEther(ethBalance), 'ETH');
  
  const usdc = new ethers.Contract(USDC, ERC20_ABI, provider);
  const usdcBalance = await usdc.balanceOf(wallet.address);
  console.log('USDC Balance:', ethers.formatUnits(usdcBalance, 6), 'USDC');
  
  const amountIn = ethers.parseEther(ethAmount);
  
  if (ethBalance < amountIn + ethers.parseEther('0.001')) {
    console.log('\nERROR: Insufficient ETH balance (need extra for gas)');
    process.exit(1);
  }
  
  const router = new ethers.Contract(CAMELOT_ROUTER, ROUTER_ABI, provider);
  
  console.log('\n--- Quote ---');
  console.log('Input:', ethAmount, 'ETH');
  
  try {
    const amounts = await router.getAmountsOut(amountIn, [WETH, USDC]);
    const expectedOut = amounts[1];
    console.log('Expected Output:', ethers.formatUnits(expectedOut, 6), 'USDC');
    
    const minOut = expectedOut * 95n / 100n;
    console.log('Min Output (5% slippage):', ethers.formatUnits(minOut, 6), 'USDC');
    
    console.log('\n--- Executing Swap ---');
    
    const deadline = Math.floor(Date.now() / 1000) + 600;
    
    const tx = await router.connect(wallet).swapExactETHForTokensSupportingFeeOnTransferTokens(
      minOut,
      [WETH, USDC],
      wallet.address,
      ethers.ZeroAddress,
      deadline,
      { value: amountIn }
    );
    
    console.log('TX Hash:', tx.hash);
    console.log('Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log('Confirmed in block:', receipt.blockNumber);
    console.log('Gas used:', receipt.gasUsed.toString());
    
    const newUsdcBalance = await usdc.balanceOf(wallet.address);
    console.log('\n--- Result ---');
    console.log('New USDC Balance:', ethers.formatUnits(newUsdcBalance, 6), 'USDC');
    console.log('USDC Received:', ethers.formatUnits(newUsdcBalance - usdcBalance, 6), 'USDC');
    
  } catch (error) {
    console.log('Error:', error.message);
    if (error.data) {
      console.log('Error data:', error.data);
    }
  }
}

main().catch(console.error);
