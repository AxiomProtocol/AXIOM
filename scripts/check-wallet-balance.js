const ethers = require('ethers');

const WALLET_TO_CHECK = '0x8d7892cf226b43d48b6e3ce988a1274e6d114c96';

const TOKEN_ADDRESSES = {
  AXM: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
};

const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

async function checkWallet() {
  console.log('\n🔍 Checking Wallet Balances on Arbitrum One...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📍 Wallet Address:', WALLET_TO_CHECK);
  console.log('🌐 Network: Arbitrum One (Chain ID: 42161)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const rpcUrl = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  try {
    // Check ETH balance
    console.log('💰 Native ETH Balance:');
    const ethBalance = await provider.getBalance(WALLET_TO_CHECK);
    const ethFormatted = ethers.formatEther(ethBalance);
    console.log(`   ${ethFormatted} ETH`);
    
    if (parseFloat(ethFormatted) >= 0.01) {
      console.log('   ✅ Sufficient for pool initialization (need 0.01 ETH)');
    } else if (parseFloat(ethFormatted) > 0) {
      console.log('   ⚠️  Low balance - recommend at least 0.01 ETH for gas');
    } else {
      console.log('   ❌ No ETH - cannot pay for transactions');
    }

    console.log('\n📊 Token Balances:\n');

    // Check each token
    for (const [symbol, address] of Object.entries(TOKEN_ADDRESSES)) {
      try {
        const tokenContract = new ethers.Contract(address, ERC20_ABI, provider);
        const balance = await tokenContract.balanceOf(WALLET_TO_CHECK);
        const decimals = await tokenContract.decimals();
        const name = await tokenContract.name();
        
        const formatted = ethers.formatUnits(balance, decimals);
        const balanceNum = parseFloat(formatted);

        console.log(`   ${symbol} (${name}):`);
        console.log(`   Balance: ${balanceNum.toLocaleString(undefined, { maximumFractionDigits: 6 })}`);
        console.log(`   Contract: ${address}`);

        // Check if sufficient for pool initialization
        if (symbol === 'AXM' && balanceNum >= 100) {
          console.log('   ✅ Sufficient for pool (need 100 AXM)');
        } else if (symbol === 'AXM' && balanceNum > 0) {
          console.log(`   ⚠️  Only ${balanceNum.toFixed(2)} AXM (need 100 for pool)`);
        } else if (symbol === 'AXM') {
          console.log('   ❌ No AXM tokens');
        }

        if (symbol === 'USDC' && balanceNum >= 10) {
          console.log('   ✅ Sufficient for pool (need 10 USDC)');
        } else if (symbol === 'USDC' && balanceNum > 0) {
          console.log(`   ⚠️  Only ${balanceNum.toFixed(2)} USDC (need 10 for pool)`);
        } else if (symbol === 'USDC') {
          console.log('   ❌ No USDC tokens');
        }

        console.log('');
      } catch (error) {
        console.log(`   ❌ Error checking ${symbol}: ${error.message}\n`);
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 Pool Initialization Requirements:\n');
    console.log('   Minimum needed on Arbitrum One:');
    console.log('   • 0.01 ETH (for gas fees)');
    console.log('   • 100 AXM tokens');
    console.log('   • 10 USDC tokens');
    console.log('\n   This creates an AXM/USDC pool with 1 AXM = $0.10 starting price');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check if wallet can initialize pool
    const canInitialize = parseFloat(ethFormatted) >= 0.01;
    
    if (canInitialize) {
      console.log('✅ Wallet has sufficient ETH for gas fees!');
      console.log('\n💡 Next: Check if you have 100 AXM and 10 USDC to initialize the pool.');
    } else {
      console.log('⚠️  Wallet needs more ETH to initialize pool.');
      console.log(`   Current: ${ethFormatted} ETH`);
      console.log('   Required: 0.01 ETH minimum');
    }

  } catch (error) {
    console.error('\n❌ Error checking wallet:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

checkWallet()
  .then(() => {
    console.log('\n✅ Balance check complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
