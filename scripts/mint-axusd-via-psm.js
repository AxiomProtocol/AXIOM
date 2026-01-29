const { ethers } = require('ethers');
require('dotenv').config();

const PSM = '0x4584888cB411E9cc88e3800BAB73A430D90d3793';
const USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const AXUSD = '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c';

const PSM_ABI = [
  'function swapCollateralForAXUSD(uint256 collateralAmount) external returns (uint256)',
  'function getSwapQuote(uint256 amountIn, bool axusdToCollateral) view returns (uint256 amountOut, uint256 fee)',
  'function mintFee() view returns (uint256)',
  'function debtCeiling() view returns (uint256)',
  'function paused() view returns (bool)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

async function main() {
  const usdcAmount = process.argv[2] || 'max';
  
  console.log('='.repeat(60));
  console.log('USDC -> AXUSD Mint via PSM');
  console.log('='.repeat(60));
  
  if (!process.env.DEPLOYER_PRIVATE_KEY) {
    console.log('\nERROR: DEPLOYER_PRIVATE_KEY not set');
    process.exit(1);
  }
  
  const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc');
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  
  console.log('\nWallet:', wallet.address);
  
  const usdc = new ethers.Contract(USDC, ERC20_ABI, wallet);
  const axusd = new ethers.Contract(AXUSD, ERC20_ABI, provider);
  const psm = new ethers.Contract(PSM, PSM_ABI, wallet);
  
  const usdcBalance = await usdc.balanceOf(wallet.address);
  const axusdBalance = await axusd.balanceOf(wallet.address);
  
  console.log('USDC Balance:', ethers.formatUnits(usdcBalance, 6), 'USDC');
  console.log('AXUSD Balance:', ethers.formatUnits(axusdBalance, 18), 'AXUSD');
  
  const paused = await psm.paused();
  if (paused) {
    console.log('\nERROR: PSM is paused');
    process.exit(1);
  }
  
  const mintFee = await psm.mintFee();
  console.log('\nPSM Mint Fee:', Number(mintFee) / 100, '%');
  
  let amountToMint;
  if (usdcAmount === 'max') {
    amountToMint = usdcBalance;
  } else {
    amountToMint = ethers.parseUnits(usdcAmount, 6);
  }
  
  if (amountToMint === 0n || usdcBalance < amountToMint) {
    console.log('\nERROR: Insufficient USDC balance');
    process.exit(1);
  }
  
  console.log('\n--- Quote ---');
  console.log('Input:', ethers.formatUnits(amountToMint, 6), 'USDC');
  
  const quote = await psm.getSwapQuote(amountToMint, false);
  console.log('Expected AXUSD:', ethers.formatUnits(quote.amountOut, 18));
  console.log('Fee:', ethers.formatUnits(quote.fee, 18), 'AXUSD');
  
  const currentAllowance = await usdc.allowance(wallet.address, PSM);
  if (currentAllowance < amountToMint) {
    console.log('\n--- Approving USDC ---');
    const approveTx = await usdc.approve(PSM, amountToMint);
    console.log('Approve TX:', approveTx.hash);
    await approveTx.wait();
    console.log('Approved!');
  }
  
  console.log('\n--- Minting AXUSD ---');
  const mintTx = await psm.swapCollateralForAXUSD(amountToMint);
  console.log('TX Hash:', mintTx.hash);
  console.log('Waiting for confirmation...');
  
  const receipt = await mintTx.wait();
  console.log('Confirmed in block:', receipt.blockNumber);
  console.log('Gas used:', receipt.gasUsed.toString());
  
  const newAxusdBalance = await axusd.balanceOf(wallet.address);
  console.log('\n--- Result ---');
  console.log('New AXUSD Balance:', ethers.formatUnits(newAxusdBalance, 18), 'AXUSD');
  console.log('AXUSD Minted:', ethers.formatUnits(newAxusdBalance - axusdBalance, 18), 'AXUSD');
}

main().catch(console.error);
