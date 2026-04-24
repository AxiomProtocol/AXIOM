/**
 * AXIOMOracleAdapter — Deployment Script
 * Run: npx hardhat run scripts/deploy-axusd-oracle.js --network arbitrumOne
 *
 * After deployment:
 *   1. Update src/config/activeContracts.generated.ts → set AXUSD_ORACLE_ADAPTER to deployed address
 *   2. Call eulerVault.setOracle(deployedAddress) with governor wallet
 *   3. Register adapter in Euler Oracle Adapter Registry (optional, for EVK compatibility)
 *   4. Update scripts/verify-active-contracts.js to include oracle checks
 */

const { ethers } = require('hardhat');

const GOVERNOR   = '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96'; // Axiom Multisig / Deployer
const PRIMARY_AXUSD = '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C'; // ERC-3643 Unified AXUSD
const EULER_AXUSD   = '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c'; // Legacy AXUSD (Euler vault binding)
const PRIMARY_PSM   = '0x5db58d9c21369d1532a48Bdd658E4Fe415404922'; // GENIUS PSM
const EULER_PSM     = '0x4584888cB411E9cc88e3800BAB73A430D90d3793'; // Original PSM

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);
  console.log('Network:', (await ethers.provider.getNetwork()).name);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Balance:', ethers.formatEther(balance), 'ETH');

  console.log('\n=== Deploying AXIOMOracleAdapter ===');
  const OracleFactory = await ethers.getContractFactory('AXIOMOracleAdapter');
  const oracle = await OracleFactory.deploy(
    GOVERNOR,
    PRIMARY_AXUSD,
    EULER_AXUSD,
    PRIMARY_PSM,
    EULER_PSM,
  );

  await oracle.waitForDeployment();
  const deployedAddr = await oracle.getAddress();
  console.log('AXIOMOracleAdapter deployed to:', deployedAddr);

  // Smoke test
  console.log('\n=== Smoke Tests ===');
  try {
    const [priceWad, src] = await oracle.axusdUsdPrice();
    console.log('axusdUsdPrice:', ethers.formatEther(priceWad), 'USD | source:', src);
  } catch (e) {
    console.warn('axusdUsdPrice call failed:', e.message);
  }

  try {
    // 1 USDC (6 dec) → AXUSD (18 dec): should be ~1e12
    const quote = await oracle.getQuote(1_000_000n, '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', PRIMARY_AXUSD);
    console.log('getQuote(1 USDC → AXUSD):', ethers.formatEther(quote), 'AXUSD');
  } catch (e) {
    console.warn('getQuote USDC→AXUSD failed:', e.message);
  }

  console.log('\n=== Next Steps ===');
  console.log('1. Update src/config/activeContracts.generated.ts:');
  console.log(`   AXUSD_ORACLE_ADAPTER = '${deployedAddr}'`);
  console.log('2. Verify on Blockscout:');
  console.log(`   npx hardhat verify --network arbitrumOne ${deployedAddr} ${GOVERNOR} ${PRIMARY_AXUSD} ${EULER_AXUSD} ${PRIMARY_PSM} ${EULER_PSM}`);
  console.log('3. If Euler Vault oracle not yet set, call:');
  console.log(`   eulerVault.setOracle('${deployedAddr}')  // with governor wallet`);
  console.log('4. Register in Euler OracleAdapterRegistry (optional):');
  console.log(`   adapterRegistry.addOracle('${deployedAddr}')  // from Euler protocol docs`);

  return deployedAddr;
}

main()
  .then(addr => {
    console.log('\nDeployment complete:', addr);
    process.exit(0);
  })
  .catch(err => {
    console.error('Deployment failed:', err);
    process.exit(1);
  });
