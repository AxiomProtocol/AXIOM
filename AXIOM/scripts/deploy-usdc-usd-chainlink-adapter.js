/**
 * deploy-usdc-usd-chainlink-adapter.js
 *
 * Deploys `ChainlinkUSDCOracleAdapter` to Arbitrum One. This is the USDC/USD
 * counterpart to `AXUSDPegOracleAdapter`; the canonical AXUSD eVault's
 * `EulerRouter` needs both adapters to perspective-verify.
 *
 * Why this script (and not just reusing an existing Chainlink wrapper):
 *   - The Euler `oracleAdapterRegistry` on Arbitrum One
 *     (`0x3942A72f87Db5Ad9C22d8826FDe15E23b81b1cBf`) was empty as of
 *     2026-04-17 (no `Added(...)` events). There is no pre-existing
 *     registry-accepted USDC/USD adapter on Arbitrum to reuse — one must
 *     be deployed and submitted via the same submission pattern as the
 *     AXUSD adapter.
 *
 * Run:
 *   DEPLOYER_PRIVATE_KEY=... npx hardhat run scripts/deploy-usdc-usd-chainlink-adapter.js --network arbitrum
 *
 * After deploy:
 *   1. Record the address printed at the end.
 *   2. Run `DEPLOYED=<addr> node scripts/verify-usdc-usd-chainlink-adapter.js`
 *      to confirm ERC-7726 conformance + bidirectional pricing on-chain.
 *   3. Update `documents/euler-usdc-adapter-submission-package/03-registry-pr-payload.md`
 *      with the deployed address.
 *   4. Open the PR against `euler-xyz/euler-interfaces` per
 *      `documents/euler-usdc-adapter-submission-package/README.md`.
 */

const hardhatEthers = require('hardhat').ethers;
const { ethers } = require('ethers');

const USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const USD  = '0x0000000000000000000000000000000000000348';

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

  const Factory = await hardhatEthers.getContractFactory('ChainlinkUSDCOracleAdapter');
  const bytecode = Factory.bytecode; // no constructor args

  const nonce = await provider.getTransactionCount(deployer.address, 'pending');
  console.log('Nonce:   ', nonce);

  console.log('\nDeploying ChainlinkUSDCOracleAdapter (no constructor args)...');
  const tx = await deployer.sendTransaction({
    data: bytecode,
    nonce,
    gasLimit: 700_000,
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
    'function FEED() view returns (address)',
    'function MAX_STALENESS() view returns (uint256)',
  ];
  const a = new ethers.Contract(adapter, abi, provider);

  const probe1 = await a.getQuote(ethers.parseUnits('1', 6), USDC, USD);
  const probe2 = await a.getQuote(ethers.parseUnits('1', 8), USD,  USDC);
  const nm     = await a.name();
  const ty     = await a.adapterType();
  const feed   = await a.FEED();
  const stale  = await a.MAX_STALENESS();

  console.log('\nConformance probe:');
  console.log('  name():                         ', nm);
  console.log('  adapterType():                  ', ty);
  console.log('  FEED():                         ', feed);
  console.log('  MAX_STALENESS():                ', stale.toString(), 'seconds');
  console.log('  getQuote(1 USDC -> USD)  =      ', probe1.toString(), '(expected ~1e8 = ~$1.00 @ 8-dec)');
  console.log('  getQuote(1 USD  -> USDC) =      ', probe2.toString(), '(expected ~1e6 = ~1 USDC @ 6-dec)');

  // Sanity bands: feed should be within ±2% of $1.00 for USDC.
  if (probe1 < 98_000_000n || probe1 > 102_000_000n)
    throw new Error(`FAIL: USDC->USD probe out of band (got ${probe1}, expected ~1e8 ±2%).`);
  if (probe2 < 980_000n || probe2 > 1_020_000n)
    throw new Error(`FAIL: USD->USDC probe out of band (got ${probe2}, expected ~1e6 ±2%).`);

  console.log('\n========================================');
  console.log('NEXT STEPS');
  console.log('========================================');
  console.log('1. Verify on Arbiscan:');
  console.log(`   npx hardhat verify --network arbitrum ${adapter}`);
  console.log('');
  console.log('2. Run full conformance script:');
  console.log(`   DEPLOYED=${adapter} node scripts/verify-usdc-usd-chainlink-adapter.js`);
  console.log('');
  console.log('3. Update PR payload:');
  console.log('   documents/euler-usdc-adapter-submission-package/03-registry-pr-payload.md');
  console.log(`   adapter address: ${adapter}`);
  console.log('');
  console.log('4. Open PR against euler-xyz/euler-interfaces (see README).');
  console.log('');
  console.log('5. Once Euler governance has added BOTH adapters to oracleAdapterRegistry,');
  console.log('   re-run scripts/deploy-axusd-evk-vault-canonical.js with:');
  console.log(`     AXUSD_USD_ADAPTER=<axusd-peg-adapter>`);
  console.log(`     USDC_USD_ADAPTER=${adapter}`);
  console.log('   (without SKIP_PERSPECTIVE_VERIFY / SKIP_RENOUNCE) to finish wiring the vault.');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
