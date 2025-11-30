import { ethers } from 'ethers';

const RPC_URL = 'https://arb1.arbitrum.io/rpc';
const UTILITY_HUB = '0xac55BE7E1A6613c5DA66f7AC9520FfD24eF3212d';
const IOT_ORACLE = '0xe38B3443E17A07953d10F7841D5568a27A73ec1a';

async function main() {
  console.log('\n🔧 Granting METER_ORACLE_ROLE on Utility Hub\n');
  console.log('═══════════════════════════════════════════════════\n');

  const deployerPrivateKey = process.env.DEPLOYER_PK;
  if (!deployerPrivateKey) {
    throw new Error('❌ DEPLOYER_PK not set in environment. Please set it first.');
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const deployer = new ethers.Wallet(deployerPrivateKey, provider);
  
  console.log(`✅ Deployer loaded: ${deployer.address}\n`);

  const abi = [
    'function METER_ORACLE_ROLE() view returns (bytes32)',
    'function grantRole(bytes32 role, address account)',
    'function hasRole(bytes32 role, address account) view returns (bool)'
  ];

  const utilityHub = new ethers.Contract(UTILITY_HUB, abi, deployer);

  const METER_ORACLE_ROLE = await utilityHub.METER_ORACLE_ROLE();
  console.log(`METER_ORACLE_ROLE: ${METER_ORACLE_ROLE}\n`);

  // Check if already granted
  const alreadyGranted = await utilityHub.hasRole(METER_ORACLE_ROLE, IOT_ORACLE);
  
  if (alreadyGranted) {
    console.log('✅ Role already granted! Nothing to do.\n');
    return;
  }

  console.log(`🔐 Granting METER_ORACLE_ROLE to IoT Oracle (${IOT_ORACLE})...\n`);

  const tx = await utilityHub.grantRole(METER_ORACLE_ROLE, IOT_ORACLE);
  console.log(`📝 Transaction sent: ${tx.hash}`);
  console.log(`🔗 View on Blockscout: https://arbitrum.blockscout.com/tx/${tx.hash}\n`);

  console.log('⏳ Waiting for confirmation...');
  const receipt = await tx.wait();

  if (receipt.status === 1) {
    console.log('✅ SUCCESS! Role granted.\n');
    
    // Verify
    const verified = await utilityHub.hasRole(METER_ORACLE_ROLE, IOT_ORACLE);
    console.log(`🔍 Verification: ${verified ? '✅ CONFIRMED' : '❌ FAILED'}\n`);
  } else {
    console.log('❌ FAILED! Transaction reverted.\n');
  }

  console.log('═══════════════════════════════════════════════════\n');
  console.log('✅ COMPLETE! Re-run verification to confirm 12/12.\n');
}

main().catch((error) => {
  console.error('\n❌ Fatal Error:', error.message);
  process.exit(1);
});
