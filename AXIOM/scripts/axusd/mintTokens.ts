import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
dotenv.config();

const GENIUS_AXUSD = '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C';

const AXUSD_ABI = [
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function MINTER_ROLE() view returns (bytes32)',
  'function mint(address to, uint256 amount) external',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)'
];

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('Usage: npx ts-node scripts/axusd/mintTokens.ts <amount> [recipient]');
    console.log('Example: npx ts-node scripts/axusd/mintTokens.ts 10000');
    console.log('Example: npx ts-node scripts/axusd/mintTokens.ts 10000 0x1234...');
    process.exit(1);
  }

  const amount = args[0];
  const privateKey = process.env.DEPLOYER_PK;
  if (!privateKey) {
    console.error('ERROR: DEPLOYER_PK not found in environment');
    process.exit(1);
  }

  const rpcUrl = process.env.ALCHEMY_API_KEY 
    ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    : 'https://arb1.arbitrum.io/rpc';

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const recipient = args[1] || wallet.address;
  
  console.log('=== Mint AXUSD Tokens ===\n');
  console.log('Contract:', GENIUS_AXUSD);
  console.log('Minter:', wallet.address);
  console.log('Recipient:', recipient);
  console.log('Amount:', amount, 'AXUSD');

  const contract = new ethers.Contract(GENIUS_AXUSD, AXUSD_ABI, wallet);

  const MINTER_ROLE = await contract.MINTER_ROLE();
  const hasMinterRole = await contract.hasRole(MINTER_ROLE, wallet.address);
  
  if (!hasMinterRole) {
    console.error('\n✗ ERROR: Your wallet does not have MINTER_ROLE.');
    console.error('Run this first: npx ts-node scripts/axusd/grantMinterRole.ts');
    process.exit(1);
  }

  const supplyBefore = await contract.totalSupply();
  console.log('\nCurrent supply:', ethers.formatUnits(supplyBefore, 18), 'AXUSD');

  const mintAmount = ethers.parseUnits(amount, 18);
  console.log('\nMinting', amount, 'AXUSD...');
  
  const tx = await contract.mint(recipient, mintAmount);
  console.log('Transaction sent:', tx.hash);
  
  const receipt = await tx.wait();
  console.log('Transaction confirmed in block:', receipt.blockNumber);

  const supplyAfter = await contract.totalSupply();
  const balanceAfter = await contract.balanceOf(recipient);
  
  console.log('\n✓ SUCCESS!');
  console.log('New total supply:', ethers.formatUnits(supplyAfter, 18), 'AXUSD');
  console.log('Recipient balance:', ethers.formatUnits(balanceAfter, 18), 'AXUSD');
}

main().catch(console.error);
