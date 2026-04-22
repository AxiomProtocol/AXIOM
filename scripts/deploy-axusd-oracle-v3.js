/**
 * deploy-axusd-oracle-v3.js
 *
 * Deploys the corrected AXIOMOracleAdapter (contracts/oracle/AXIOMOracleAdapter.sol).
 *
 * After deployment, update the following constants to the new address:
 *   - AXUSD_ORACLE_ADAPTER in src/config/oracleConfig.ts
 *   - ERC7726_ORACLE_ADAPTER_ADDRESS in src/config/activeContracts.generated.ts
 *   - AXUSD_ERC7726_ORACLE_ADAPTER in shared/contracts.ts
 *
 * Run:
 *   ALCHEMY_API_KEY=... DEPLOYER_PRIVATE_KEY=... \
 *     npx hardhat run scripts/deploy-axusd-oracle-v3.js --network arbitrum
 */

const hardhatEthers = require('hardhat').ethers;
const { ethers }    = require('ethers');

const ERC3643_AXUSD = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7'; // primaryAxusd
const LEGACY_AXUSD  = '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C'; // eulerAxusd
const PRIMARY_PSM   = '0x0000000000000000000000000000000000000000'; // none yet for ERC-3643
const EULER_PSM     = '0x4584888cB411E9cc88e3800BAB73A430D90d3793'; // legacy Euler PSM
const USDC          = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

const LEGACY_BROKEN_ORACLE = '0xc894d1500CB1FBf8F045e87bd357A51345197c4e';

async function main() {
  const rpcUrl = process.env.ALCHEMY_API_KEY
    ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    : 'https://arb1.arbitrum.io/rpc';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error('DEPLOYER_PRIVATE_KEY env var not set');
  const deployer = new ethers.Wallet(pk, provider);

  console.log('Corrected AXUSD oracle deployment');
  console.log('Deployer:', deployer.address);
  console.log('Legacy broken oracle (will be superseded):', LEGACY_BROKEN_ORACLE);

  const balance = await provider.getBalance(deployer.address);
  console.log('Balance:', ethers.formatEther(balance), 'ETH');

  const Factory = await hardhatEthers.getContractFactory('AXIOMOracleAdapter');
  const initData = Factory.interface.encodeDeploy([
    deployer.address, // governor
    ERC3643_AXUSD,    // primaryAxusd
    LEGACY_AXUSD,     // eulerAxusd
    PRIMARY_PSM,      // primaryPsm  (zero — corrected branch returns neutral 1:1)
    EULER_PSM,        // eulerPsm
  ]);
  const bytecode = Factory.bytecode + initData.slice(2);

  const nonce = await provider.getTransactionCount(deployer.address, 'pending');
  console.log('\nDeploying corrected AXIOMOracleAdapter...');

  const deployTx = await deployer.sendTransaction({
    data: bytecode,
    nonce,
    gasLimit: 1_500_000,
  });
  const receipt = await deployTx.wait(1);
  const newOracle = receipt.contractAddress;

  console.log('\nCorrected oracle deployed at:', newOracle);
  console.log('Tx hash:', deployTx.hash);

  // Smoke-test the previously-broken AXUSD→USDC direction
  const oracleAbi = [
    'function getQuote(uint256 inAmount, address base, address quote) view returns (uint256)',
  ];
  const oracle = new ethers.Contract(newOracle, oracleAbi, provider);

  const oneAxusd = ethers.parseUnits('1', 18);
  const axusdToUsdc = await oracle.getQuote(oneAxusd, ERC3643_AXUSD, USDC)
    .catch(e => 'ERR: ' + e.message.slice(0, 100));
  const usdcToAxusd = await oracle.getQuote(ethers.parseUnits('1', 6), USDC, ERC3643_AXUSD)
    .catch(e => 'ERR: ' + e.message.slice(0, 100));

  console.log('\n=== Smoke test (legacy bug fix verification) ===');
  console.log('  getQuote(1 AXUSD → USDC):', typeof axusdToUsdc === 'bigint'
    ? ethers.formatUnits(axusdToUsdc, 6) + ' USDC' + (axusdToUsdc > 0n ? '  ✓ NON-ZERO' : '  ✗ STILL BROKEN')
    : axusdToUsdc);
  console.log('  getQuote(1 USDC → AXUSD):', typeof usdcToAxusd === 'bigint'
    ? ethers.formatUnits(usdcToAxusd, 18) + ' AXUSD'
    : usdcToAxusd);

  console.log('\n========================================');
  console.log('NEXT STEPS:');
  console.log('  1. Verify on Arbiscan/Blockscout (constructor args above).');
  console.log('  2. Update src/config/oracleConfig.ts → AXUSD_ORACLE_ADAPTER = "' + newOracle + '"');
  console.log('  3. Update src/config/activeContracts.generated.ts → ERC7726_ORACLE_ADAPTER_ADDRESS');
  console.log('  4. Update shared/contracts.ts → AXUSD_ERC7726_ORACLE_ADAPTER');
  console.log('  (Off-chain valuation already reads from AXUSDPegOracleAdapter — no helper change needed.)');
  console.log('========================================');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
