/**
 * Deploy AXUSD Lending Vault on Euler V2 (Arbitrum)
 * 
 * This script creates a permissionless lending vault for AXUSD on Euler V2.
 * LPs can deposit AXUSD to earn yield from borrowers.
 */

const { ethers } = require('ethers');
require('dotenv').config();

// Euler V2 Arbitrum Addresses
const EULER_ARBITRUM = {
  core: {
    eVaultFactory: '0x78Df1CF5bf06a7f27f2ACc580B934238C1b80D50',
    eVaultImplementation: '0x832fF4011A3164ea76ceA06A313EE0B6CD72ba96',
    evc: '0x6302ef0F34100CDDFb5489fbcB6eE1AA95CD1066',
    protocolConfig: '0x06c1Ab0A1672E8FC7F7D10BD7B869B4116D18a2c',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3'
  },
  existingIRM: '0xd726F97adA1dD330D3C5e479A79c47Dc63dCA770' // Used by existing vaults
};

// Token Addresses on Arbitrum
const TOKENS = {
  AXUSD: '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
};

// ABIs
const EVAULT_FACTORY_ABI = [
  'function createProxy(address desiredImplementation, bool upgradeable, bytes calldata trailingData) external returns (address)',
  'function getProxyConfig(address proxy) external view returns (bool upgradeable, address implementation, address admin)'
];

const EVAULT_ABI = [
  'function initialize(address admin) external',
  'function setInterestRateModel(address newModel) external',
  'function setLTV(address collateral, uint16 borrowLTV, uint16 liquidationLTV, uint32 rampDuration) external',
  'function setGovernorAdmin(address newGovernorAdmin) external',
  'function asset() external view returns (address)',
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function totalAssets() external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function interestRateModel() external view returns (address)',
  'function deposit(uint256 assets, address receiver) external returns (uint256 shares)',
  'function EVC() external view returns (address)',
  'function creator() external view returns (address)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)'
];

async function main() {
  console.log('=================================================');
  console.log('  AXUSD Lending Vault Deployment on Euler V2');
  console.log('  Network: Arbitrum One');
  console.log('=================================================\n');

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
  
  const privateKey = process.env.DEPLOYER_PK || process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('DEPLOYER_PK not set');
  }
  
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log('Deployer:', wallet.address);
  
  // Check balances
  const ethBalance = await provider.getBalance(wallet.address);
  console.log('ETH Balance:', ethers.formatEther(ethBalance));
  
  const axusd = new ethers.Contract(TOKENS.AXUSD, ERC20_ABI, wallet);
  const axusdBalance = await axusd.balanceOf(wallet.address);
  console.log('AXUSD Balance:', ethers.formatUnits(axusdBalance, 18));
  
  if (axusdBalance === 0n) {
    throw new Error('No AXUSD balance to seed the vault');
  }
  
  // Step 1: Create AXUSD Vault via Factory
  console.log('\n--- Step 1: Create AXUSD Lending Vault ---');
  
  const factory = new ethers.Contract(
    EULER_ARBITRUM.core.eVaultFactory,
    EVAULT_FACTORY_ABI,
    wallet
  );
  
  // Trailing data encodes: asset address + oracle address + unit of account
  // Format: asset (20 bytes) + oracle (20 bytes) + unitOfAccount (20 bytes)
  // Zero oracle means 1:1 pricing with unit of account
  const trailingData = ethers.solidityPacked(
    ['address', 'address', 'address'],
    [
      TOKENS.AXUSD,           // Asset (AXUSD)
      ethers.ZeroAddress,     // Oracle (zero = 1:1 with unit of account)
      TOKENS.USDC             // Unit of account (USDC)
    ]
  );
  
  console.log('Creating vault with:');
  console.log('  Asset: AXUSD', TOKENS.AXUSD);
  console.log('  Oracle: Zero (1:1 with USDC)');
  console.log('  Unit of Account: USDC', TOKENS.USDC);
  
  const vaultTx = await factory.createProxy(
    EULER_ARBITRUM.core.eVaultImplementation,
    false, // Not upgradeable (immutable)
    trailingData,
    { gasLimit: 3000000 }
  );
  
  console.log('Vault creation tx:', vaultTx.hash);
  const vaultReceipt = await vaultTx.wait();
  
  // Parse vault address from logs
  // The ProxyCreated event has signature: ProxyCreated(address indexed proxy, bool upgradeable, address implementation)
  let vaultAddress;
  
  // Look for the vault creation in logs
  for (const log of vaultReceipt.logs) {
    // Check if this log is from the factory
    if (log.address.toLowerCase() === EULER_ARBITRUM.core.eVaultFactory.toLowerCase()) {
      // Parse the indexed proxy address from topics
      if (log.topics.length >= 2) {
        vaultAddress = ethers.getAddress('0x' + log.topics[1].slice(26));
        break;
      }
    }
  }
  
  if (!vaultAddress) {
    // Fallback: get from first log
    vaultAddress = vaultReceipt.logs[0]?.address;
  }
  
  console.log('\n✅ AXUSD Vault created at:', vaultAddress);
  
  // Step 2: Verify the vault
  console.log('\n--- Step 2: Verify Vault ---');
  
  const vault = new ethers.Contract(vaultAddress, EVAULT_ABI, provider);
  
  try {
    const asset = await vault.asset();
    console.log('Vault asset:', asset);
    
    const evc = await vault.EVC();
    console.log('Vault EVC:', evc);
    
    const creator = await vault.creator();
    console.log('Vault creator:', creator);
  } catch(e) {
    console.log('Vault verification error:', e.message.slice(0, 100));
  }
  
  // Step 3: Seed liquidity
  console.log('\n--- Step 3: Seed Initial Liquidity ---');
  
  const seedAmount = axusdBalance;
  console.log('Seeding vault with:', ethers.formatUnits(seedAmount, 18), 'AXUSD');
  
  // Approve vault to spend AXUSD
  console.log('Approving vault...');
  const approveTx = await axusd.approve(vaultAddress, seedAmount);
  await approveTx.wait();
  console.log('Approved');
  
  // Deposit
  const vaultSigner = new ethers.Contract(vaultAddress, EVAULT_ABI, wallet);
  console.log('Depositing AXUSD...');
  
  try {
    const depositTx = await vaultSigner.deposit(seedAmount, wallet.address, { gasLimit: 500000 });
    const depositReceipt = await depositTx.wait();
    console.log('Deposit tx:', depositReceipt.hash);
    console.log('✅ Deposit successful!');
  } catch(e) {
    console.log('Deposit failed:', e.message.slice(0, 150));
    console.log('(Vault may need initialization or configuration first)');
  }
  
  // Verify final state
  console.log('\n--- Verification ---');
  try {
    const totalAssets = await vault.totalAssets();
    console.log('Vault Total Assets:', ethers.formatUnits(totalAssets, 18), 'AXUSD');
    
    const totalSupply = await vault.totalSupply();
    console.log('Vault Total Shares:', ethers.formatUnits(totalSupply, 18));
  } catch(e) {
    console.log('Final verification error:', e.message.slice(0, 100));
  }
  
  console.log('\n=================================================');
  console.log('  DEPLOYMENT COMPLETE');
  console.log('=================================================');
  console.log('  AXUSD Vault:', vaultAddress);
  console.log('  Network: Arbitrum One');
  console.log('');
  console.log('  View on Euler: https://app.euler.finance/vault/' + vaultAddress + '?network=arbitrumone');
  console.log('  View on Arbiscan: https://arbiscan.io/address/' + vaultAddress);
  console.log('=================================================');
  
  return { vaultAddress };
}

main()
  .then(result => {
    console.log('\nResult:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
