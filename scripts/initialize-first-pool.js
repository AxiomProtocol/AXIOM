const ethers = require('ethers');
const fs = require('fs');

const DEX_ADDRESS = '0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D';
const AXM_ADDRESS = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D';
const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const WETH_ADDRESS = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';

const DEX_ABI = JSON.parse(fs.readFileSync('./client/src/contracts/abis/AxiomExchangeHub.json', 'utf8'));

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

async function initializePool() {
  console.log('\n🚀 Initializing First Liquidity Pool on Axiom DEX...\n');

  const privateKey = process.env.DEPLOYER_PK;
  if (!privateKey) {
    throw new Error('DEPLOYER_PK environment variable not set');
  }

  // Ethers v6 syntax
  const rpcUrl = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log('📍 Network: Arbitrum One');
  console.log('💼 Wallet Address:', wallet.address);
  
  const balance = await provider.getBalance(wallet.address);
  console.log('💰 ETH Balance:', ethers.formatEther(balance), 'ETH');

  if (balance < ethers.parseEther('0.001')) {
    console.log('\n⚠️  WARNING: Low ETH balance. You need ETH for gas fees on Arbitrum One.');
    console.log('Please add some ETH to your wallet:', wallet.address);
    return;
  }

  console.log('\n📊 Pool Configuration:');
  console.log('Token A: AXM', AXM_ADDRESS);
  console.log('Token B: USDC', USDC_ADDRESS);

  const axmContract = new ethers.Contract(AXM_ADDRESS, ERC20_ABI, wallet);
  const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet);
  const dexContract = new ethers.Contract(DEX_ADDRESS, DEX_ABI, wallet);

  console.log('\n🔍 Checking token balances...');
  const axmBalance = await axmContract.balanceOf(wallet.address);
  const usdcBalance = await usdcContract.balanceOf(wallet.address);
  const axmDecimals = await axmContract.decimals();
  const usdcDecimals = await usdcContract.decimals();

  console.log('AXM Balance:', ethers.formatUnits(axmBalance, axmDecimals), 'AXM');
  console.log('USDC Balance:', ethers.formatUnits(usdcBalance, usdcDecimals), 'USDC');

  // Smaller amounts for initial testing
  const axmAmount = ethers.parseUnits('100', axmDecimals);
  const usdcAmount = ethers.parseUnits('10', usdcDecimals);

  if (axmBalance < axmAmount) {
    console.log('\n❌ Insufficient AXM balance. Need at least 100 AXM');
    console.log('Current balance:', ethers.formatUnits(axmBalance, axmDecimals), 'AXM');
    console.log('\n💡 You need to acquire AXM tokens first.');
    console.log('Deployer wallet:', wallet.address);
    return;
  }

  if (usdcBalance < usdcAmount) {
    console.log('\n❌ Insufficient USDC balance. Need at least 10 USDC');
    console.log('Current balance:', ethers.formatUnits(usdcBalance, usdcDecimals), 'USDC');
    console.log('\n💡 You need to acquire USDC tokens first on Arbitrum One.');
    console.log('Deployer wallet:', wallet.address);
    return;
  }

  console.log('\n🔍 Checking if pool already exists...');
  try {
    const [poolId, exists] = await dexContract.getPoolByTokens(AXM_ADDRESS, USDC_ADDRESS);
    if (exists) {
      console.log('\n✅ Pool already exists! Pool ID:', poolId.toString());
      console.log('You can add more liquidity to this existing pool.');
      
      const pool = await dexContract.getPool(poolId);
      console.log('\n📊 Pool Statistics:');
      console.log('Reserve AXM:', ethers.formatUnits(pool.reserveA, 18));
      console.log('Reserve USDC:', ethers.formatUnits(pool.reserveB, 6));
      console.log('Total Volume:', ethers.formatUnits(pool.totalVolume, 18));
      console.log('Total Fees:', ethers.formatUnits(pool.totalFees, 18));
      return;
    }
  } catch (error) {
    console.log('No existing pool found. Creating new pool...');
  }

  console.log('\n💧 Initializing pool with:');
  console.log('- 100 AXM');
  console.log('- 10 USDC');
  console.log('Initial Price: 1 AXM = 0.10 USDC');

  console.log('\n📝 Step 1: Approving AXM...');
  const axmAllowance = await axmContract.allowance(wallet.address, DEX_ADDRESS);
  if (axmAllowance < axmAmount) {
    const approveTx = await axmContract.approve(DEX_ADDRESS, ethers.MaxUint256);
    console.log('Transaction hash:', approveTx.hash);
    console.log('Waiting for confirmation...');
    await approveTx.wait();
    console.log('✅ AXM approved');
  } else {
    console.log('✅ AXM already approved');
  }

  console.log('\n📝 Step 2: Approving USDC...');
  const usdcAllowance = await usdcContract.allowance(wallet.address, DEX_ADDRESS);
  if (usdcAllowance < usdcAmount) {
    const approveTx = await usdcContract.approve(DEX_ADDRESS, ethers.MaxUint256);
    console.log('Transaction hash:', approveTx.hash);
    console.log('Waiting for confirmation...');
    await approveTx.wait();
    console.log('✅ USDC approved');
  } else {
    console.log('✅ USDC already approved');
  }

  console.log('\n🏊 Step 3: Creating liquidity pool...');
  console.log('This will create the first AXM/USDC pool on Axiom DEX!');
  
  const gasEstimate = await dexContract.createPool.estimateGas(
    AXM_ADDRESS,
    USDC_ADDRESS,
    axmAmount,
    usdcAmount
  );
  console.log('Estimated gas:', gasEstimate.toString());

  const createTx = await dexContract.createPool(
    AXM_ADDRESS,
    USDC_ADDRESS,
    axmAmount,
    usdcAmount,
    { gasLimit: gasEstimate * 120n / 100n }
  );

  console.log('\n📤 Transaction sent:', createTx.hash);
  console.log('⏳ Waiting for confirmation on Arbitrum One...');
  
  const receipt = await createTx.wait();
  console.log('✅ Transaction confirmed in block:', receipt.blockNumber);

  console.log('\n🎉 SUCCESS! First liquidity pool initialized!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Pool Details:');
  console.log('   Pair: AXM/USDC');
  console.log('   Initial AXM: 100');
  console.log('   Initial USDC: 10');
  console.log('   Starting Price: 1 AXM = $0.10');
  console.log('   DEX Contract:', DEX_ADDRESS);
  console.log('   Transaction:', createTx.hash);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const nextPoolId = await dexContract.nextPoolId();
  const poolId = nextPoolId - 1n;
  console.log('\n🆔 Pool ID:', poolId.toString());

  const pool = await dexContract.getPool(poolId);
  console.log('\n📈 Pool Statistics:');
  console.log('   Reserve AXM:', ethers.formatUnits(pool.reserveA, 18));
  console.log('   Reserve USDC:', ethers.formatUnits(pool.reserveB, 6));
  console.log('   LP Tokens:', ethers.formatUnits(pool.totalLiquidity, 18));
  console.log('   Active:', pool.isActive);

  console.log('\n🌐 View on Blockscout:');
  console.log(`   https://arbitrum.blockscout.com/tx/${createTx.hash}`);

  console.log('\n✨ Trading is now enabled on Axiom DEX!');
  console.log('   Users can now swap AXM <-> USDC');
  console.log('   Liquidity providers can earn 0.3% fees');
}

initializePool()
  .then(() => {
    console.log('\n✅ Pool initialization complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    if (error.data) {
      console.error('Error data:', error.data);
    }
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  });
