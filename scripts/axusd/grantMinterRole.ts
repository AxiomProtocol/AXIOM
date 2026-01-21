import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
dotenv.config();

const GENIUS_AXUSD = '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C';
const DEPLOYER = '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96';

const AXUSD_ABI = [
  'function grantRole(bytes32 role, address account) external',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function MINTER_ROLE() view returns (bytes32)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
  'function mint(address to, uint256 amount) external'
];

async function main() {
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
  
  console.log('=== Grant MINTER_ROLE to Deployer ===\n');
  console.log('Contract:', GENIUS_AXUSD);
  console.log('Wallet:', wallet.address);
  console.log('Target:', DEPLOYER);

  const contract = new ethers.Contract(GENIUS_AXUSD, AXUSD_ABI, wallet);

  const MINTER_ROLE = await contract.MINTER_ROLE();
  console.log('\nMINTER_ROLE:', MINTER_ROLE);

  const alreadyHasRole = await contract.hasRole(MINTER_ROLE, DEPLOYER);
  if (alreadyHasRole) {
    console.log('\n✓ Deployer already has MINTER_ROLE!');
    return;
  }

  const hasAdminRole = await contract.hasRole(await contract.DEFAULT_ADMIN_ROLE(), wallet.address);
  if (!hasAdminRole) {
    console.error('\n✗ ERROR: Your wallet does not have ADMIN_ROLE. Cannot grant MINTER_ROLE.');
    process.exit(1);
  }

  console.log('\nGranting MINTER_ROLE...');
  const tx = await contract.grantRole(MINTER_ROLE, DEPLOYER);
  console.log('Transaction sent:', tx.hash);
  
  const receipt = await tx.wait();
  console.log('Transaction confirmed in block:', receipt.blockNumber);

  const nowHasRole = await contract.hasRole(MINTER_ROLE, DEPLOYER);
  if (nowHasRole) {
    console.log('\n✓ SUCCESS! Deployer now has MINTER_ROLE');
    console.log('\nYou can now mint AXUSD tokens using:');
    console.log('  npx ts-node scripts/axusd/mintTokens.ts <amount>');
  } else {
    console.log('\n✗ Role grant may have failed. Please check transaction.');
  }
}

main().catch(console.error);
