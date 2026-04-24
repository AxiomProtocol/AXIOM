/**
 * deploy-axusd-peg-adapter.js
 *
 * Deploys `AXUSDPegOracleAdapter` to Arbitrum One. This is the adapter that
 * we will submit to Euler's `oracleAdapterRegistry`.
 *
 * Why this script (and not just reusing the existing AXIOMOracleAdapter at
 * 0xc894d1500CB1FBf8F045e87bd357A51345197c4e):
 *   - The existing adapter is a multi-pair router with mutable governance and
 *     a one-directional AXUSD/USDC quote (returns 0 for AXUSD->USDC). Euler's
 *     adapter registry accepts immutable, single-pair, bidirectional adapters.
 *     See `documents/euler-adapter-submission-package/05-why-not-existing-adapter.md`.
 *
 * Run:
 *   DEPLOYER_PRIVATE_KEY=... npx hardhat run scripts/deploy-axusd-peg-adapter.js --network arbitrum
 *
 * After deploy:
 *   1. Record the address printed at the end.
 *   2. Run `DEPLOYED=<addr> node scripts/verify-axusd-peg-adapter.js` to confirm
 *      ERC-7726 conformance + bidirectional pricing on-chain.
 *   3. Update `documents/euler-adapter-submission-package/03-registry-pr-payload.md`
 *      with the deployed address.
 *   4. Open the PR against `euler-xyz/euler-interfaces` per
 *      `documents/euler-adapter-submission-package/README.md`.
 */

const hardhatEthers = require('hardhat').ethers;
const { ethers } = require('ethers');

const AXUSD = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
const USD   = '0x0000000000000000000000000000000000000348';

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
  console.log('Balance: ', ethers.formatEther(balance), 'ETH');

  const Factory = await hardhatEthers.getContractFactory('AXUSDPegOracleAdapter');
  const bytecode = Factory.bytecode; // no constructor args

  const nonce = await provider.getTransactionCount(deployer.address, 'pending');
  console.log('Nonce:   ', nonce);

  console.log('\nDeploying AXUSDPegOracleAdapter (no constructor args)...');
  const tx = await deployer.sendTransaction({
    data: bytecode,
    nonce,
    gasLimit: 500_000,
  });
  const receipt = await tx.wait(1);
  const adapter = receipt.contractAddress;
  console.log('Deployed at:', adapter);
  console.log('Tx hash:    ', tx.hash);
  console.log('Block:      ', receipt.blockNumber);
  console.log('Gas used:   ', receipt.gasUsed.toString());

  // ── Inline conformance probe (read-only) ────────────────────────────────
  const abi = [
    'function getQuote(uint256 inAmount, address base, address quote) view returns (uint256)',
    'function name() view returns (string)',
    'function adapterType() view returns (string)',
  ];
  const a = new ethers.Contract(adapter, abi, provider);

  const probe1 = await a.getQuote(ethers.parseUnits('1', 18), AXUSD, USD);
  const probe2 = await a.getQuote(ethers.parseUnits('1', 8),  USD,   AXUSD);
  const nm     = await a.name();
  const ty     = await a.adapterType();

  console.log('\nConformance probe:');
  console.log('  name():                         ', nm);
  console.log('  adapterType():                  ', ty);
  console.log('  getQuote(1 AXUSD -> USD)  =     ', probe1.toString(), '(expected 100000000 = 1.00 USD @ 8-dec)');
  console.log('  getQuote(1 USD   -> AXUSD)=     ', probe2.toString(), '(expected 1000000000000000000 = 1 AXUSD @ 18-dec)');

  if (probe1 !== 100_000_000n)         throw new Error('FAIL: AXUSD->USD probe wrong');
  if (probe2 !== 1_000_000_000_000_000_000n) throw new Error('FAIL: USD->AXUSD probe wrong');

  console.log('\n========================================');
  console.log('NEXT STEPS');
  console.log('========================================');
  console.log('1. Verify on Arbiscan:');
  console.log(`   npx hardhat verify --network arbitrum ${adapter}`);
  console.log('');
  console.log('2. Run full conformance script:');
  console.log(`   DEPLOYED=${adapter} node scripts/verify-axusd-peg-adapter.js`);
  console.log('');
  console.log('3. Update PR payload:');
  console.log('   documents/euler-adapter-submission-package/03-registry-pr-payload.md');
  console.log(`   adapter address: ${adapter}`);
  console.log('');
  console.log('4. Open PR against euler-xyz/euler-interfaces (see README).');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
