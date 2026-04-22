/**
 * deploy-axusd-oracle-v2.js
 *
 * Deploys a new AXIOMOracleAdapter with the correct ERC-3643 AXUSD address as primaryAxusd.
 * The previous oracle (0x66461fF463BF19f511488F8BF6E99EACD0D7461D) used the legacy AXUSD.
 *
 * Run:
 *   npx hardhat run scripts/deploy-axusd-oracle-v2.js --network arbitrum
 */

const hardhatEthers = require('hardhat').ethers;
const { ethers }    = require('ethers');

const ERC3643_AXUSD = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7'; // New ERC-3643 AXUSD
const LEGACY_AXUSD  = '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C'; // Old AXUSD (keep for compat)
const PRIMARY_PSM   = '0x0000000000000000000000000000000000000000'; // No PSM yet for ERC-3643
const EULER_PSM     = '0x4584888cB411E9cc88e3800BAB73A430D90d3793'; // Legacy Euler PSM

async function main() {
  const rpcUrl = process.env.ALCHEMY_API_KEY
    ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    : 'https://arb1.arbitrum.io/rpc';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error('DEPLOYER_PRIVATE_KEY env var not set');
  const deployer = new ethers.Wallet(pk, provider);

  console.log('Deployer:', deployer.address);
  const balance = await provider.getBalance(deployer.address);
  console.log('Balance:', ethers.formatEther(balance), 'ETH');

  const nonce = await provider.getTransactionCount(deployer.address, 'pending');
  console.log('Nonce:', nonce);

  // Get AXIOMOracleAdapter bytecode via Hardhat
  const Factory = await hardhatEthers.getContractFactory('AXIOMOracleAdapter');
  const initData = Factory.interface.encodeDeploy([
    deployer.address,  // governor
    ERC3643_AXUSD,     // primaryAxusd — ERC-3643 (used by the EVK vault)
    LEGACY_AXUSD,      // eulerAxusd — legacy (backward compat)
    PRIMARY_PSM,       // primaryPsm — zero addr; totalSupply=0 → returns (1,1) fallback
    EULER_PSM,         // eulerPsm
  ]);
  const bytecode = Factory.bytecode + initData.slice(2);

  console.log('\nDeploying AXIOMOracleAdapter v2...');
  console.log('  primaryAxusd:', ERC3643_AXUSD);
  console.log('  eulerAxusd:  ', LEGACY_AXUSD);

  const deployTx = await deployer.sendTransaction({
    data: bytecode,
    nonce,
    gasLimit: 1_200_000,
  });
  const receipt = await deployTx.wait(1);
  const newOracle = receipt.contractAddress;

  console.log('\nOracle v2 deployed at:', newOracle);
  console.log('Tx hash:', deployTx.hash);

  // Verify getQuote works
  const oracleAbi = [
    'function getQuote(uint256 inAmount, address base, address quote) view returns (uint256)',
    'function primaryAxusd() view returns (address)',
  ];
  const oracle = new ethers.Contract(newOracle, oracleAbi, provider);
  const USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
  const q = await oracle.getQuote(ethers.parseUnits('1', 18), ERC3643_AXUSD, USDC).catch(e => 'ERR: ' + e.message.slice(0, 100));
  console.log('\nVerification getQuote(1 ERC3643-AXUSD → USDC):', typeof q === 'bigint' ? ethers.formatUnits(q, 6) + ' USDC' : q);

  console.log('\n========================================');
  console.log('NEXT: Update deploy-axusd-evk-vault.js:');
  console.log('  ORACLE_ADAPTER = "' + newOracle + '"');
  console.log('  Also update activeContracts.generated.ts + shared/contracts.ts');
  console.log('========================================');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
