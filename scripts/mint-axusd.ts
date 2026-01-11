import { ethers } from 'ethers';

const ARBITRUM_RPC = process.env.ALCHEMY_API_KEY 
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const PSM_ADDRESS = '0xf09130E1a81d5C58178C2eC355D9b66774F72289';
const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const AXUSD_ADDRESS = '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const PSM_ABI = [
  'function deposit(uint256 usdcAmount) external',
  'function mintFee() view returns (uint256)'
];

async function main() {
  const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PK!, provider);
  
  console.log('Wallet:', wallet.address);
  
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet);
  const axusd = new ethers.Contract(AXUSD_ADDRESS, ERC20_ABI, provider);
  const psm = new ethers.Contract(PSM_ADDRESS, PSM_ABI, wallet);
  
  const usdcBalance = await usdc.balanceOf(wallet.address);
  const axusdBalance = await axusd.balanceOf(wallet.address);
  const mintFee = await psm.mintFee();
  
  console.log('USDC Balance:', ethers.formatUnits(usdcBalance, 6));
  console.log('AXUSD Balance:', ethers.formatEther(axusdBalance));
  console.log('PSM Mint Fee:', mintFee.toString(), 'bps');
  
  const mintAmount = ethers.parseUnits('100', 6);
  
  if (usdcBalance < mintAmount) {
    console.log('Insufficient USDC balance. Need 100 USDC to mint.');
    console.log('Available:', ethers.formatUnits(usdcBalance, 6), 'USDC');
    return;
  }
  
  const allowance = await usdc.allowance(wallet.address, PSM_ADDRESS);
  if (allowance < mintAmount) {
    console.log('Approving USDC spend...');
    const approveTx = await usdc.approve(PSM_ADDRESS, ethers.MaxUint256);
    await approveTx.wait();
    console.log('Approved!');
  }
  
  console.log('Minting 100 AXUSD via PSM...');
  const tx = await psm.deposit(mintAmount);
  console.log('TX Hash:', tx.hash);
  await tx.wait();
  
  const newAxusdBalance = await axusd.balanceOf(wallet.address);
  console.log('New AXUSD Balance:', ethers.formatEther(newAxusdBalance));
  console.log('Minted successfully!');
}

main().catch(console.error);
