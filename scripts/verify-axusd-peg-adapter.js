/**
 * verify-axusd-peg-adapter.js
 *
 * Read-only conformance test for an AXUSDPegOracleAdapter deployment. Produces
 * a green/red checklist that mirrors the questions a reviewer from Euler Labs
 * will ask before accepting the adapter into the registry.
 *
 * Usage:
 *   DEPLOYED=0x... node scripts/verify-axusd-peg-adapter.js
 *
 * Exits with code 0 if every check passes, 1 if any check fails.
 *
 * No private key required. No transactions sent. Safe to run from any host.
 */

const { ethers } = require('ethers');

const ADAPTER = process.env.DEPLOYED;
if (!ADAPTER) {
  console.error('Set DEPLOYED=<adapter address>');
  process.exit(1);
}

const AXUSD = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
const USD   = '0x0000000000000000000000000000000000000348';
const USDC  = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const WETH  = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';

const ABI = [
  'function getQuote(uint256 inAmount, address base, address quote) view returns (uint256)',
  'function getQuotes(uint256 inAmount, address base, address quote) view returns (uint256, uint256)',
  'function name() view returns (string)',
  'function adapterType() view returns (string)',
  'function AXUSD() view returns (address)',
  'function USD() view returns (address)',
  'function RATE_WAD() view returns (uint256)',
];

const checks = [];
function record(label, ok, detail = '') {
  checks.push({ label, ok, detail });
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`  [${mark}] ${label}${detail ? ' — ' + detail : ''}`);
}

async function main() {
  const rpcUrl = process.env.ALCHEMY_API_KEY
    ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    : 'https://arb1.arbitrum.io/rpc';
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  console.log(`AXUSDPegOracleAdapter conformance — ${ADAPTER}`);
  console.log('Network: Arbitrum One (42161)');
  console.log('');

  const code = await provider.getCode(ADAPTER);
  record('Contract has bytecode at address', code && code !== '0x', `${(code.length - 2) / 2} bytes`);
  if (!code || code === '0x') return finish();

  const a = new ethers.Contract(ADAPTER, ABI, provider);

  // ── Identity ────────────────────────────────────────────────────────────
  console.log('\n[1/4] Identity & metadata');
  try {
    const nm = await a.name();
    record('name() == "AXUSDPegOracleAdapter"', nm === 'AXUSDPegOracleAdapter', `got "${nm}"`);
  } catch (e) { record('name() callable', false, e.shortMessage || e.message); }
  try {
    const ty = await a.adapterType();
    record('adapterType() == "FixedRate"', ty === 'FixedRate', `got "${ty}"`);
  } catch (e) { record('adapterType() callable', false, e.shortMessage || e.message); }
  try {
    const ax = await a.AXUSD();
    record('AXUSD() == ERC-3643 AXUSD', ax.toLowerCase() === AXUSD.toLowerCase(), ax);
  } catch (e) { record('AXUSD() callable', false, e.shortMessage || e.message); }
  try {
    const usd = await a.USD();
    record('USD() == ISO 4217 pseudo (0x...0348)', usd.toLowerCase() === USD.toLowerCase(), usd);
  } catch (e) { record('USD() callable', false, e.shortMessage || e.message); }

  // ── Bidirectional pricing ───────────────────────────────────────────────
  console.log('\n[2/4] ERC-7726 bidirectional pricing');
  try {
    const out = await a.getQuote(ethers.parseUnits('1', 18), AXUSD, USD);
    record('getQuote(1e18 AXUSD, AXUSD, USD) == 1e8',
      out === 100_000_000n, `got ${out.toString()}`);
  } catch (e) { record('AXUSD->USD callable', false, e.shortMessage || e.message); }
  try {
    const out = await a.getQuote(ethers.parseUnits('1', 8), USD, AXUSD);
    record('getQuote(1e8 USD, USD, AXUSD) == 1e18',
      out === 1_000_000_000_000_000_000n, `got ${out.toString()}`);
  } catch (e) { record('USD->AXUSD callable', false, e.shortMessage || e.message); }
  try {
    const out = await a.getQuote(0n, AXUSD, USD);
    record('getQuote(0, ...) returns 0', out === 0n, `got ${out.toString()}`);
  } catch (e) { record('getQuote(0,...) callable', false, e.shortMessage || e.message); }

  // Round-trip should be lossless within 1e10 truncation envelope
  try {
    const a2u = await a.getQuote(ethers.parseUnits('1234.56789', 18), AXUSD, USD);
    const u2a = await a.getQuote(a2u, USD, AXUSD);
    const expected = ethers.parseUnits('1234.56789', 18);
    const lossless = u2a === expected;
    record('Round-trip 1234.56789 AXUSD lossless', lossless, `roundtrip=${u2a.toString()} expected=${expected.toString()}`);
  } catch (e) { record('Round-trip callable', false, e.shortMessage || e.message); }

  // ── Unsupported pair handling ───────────────────────────────────────────
  console.log('\n[3/4] Unsupported-pair handling (must revert, not return 0)');
  for (const [b, q, label] of [
    [AXUSD, USDC, 'AXUSD/USDC'],
    [USDC,  AXUSD, 'USDC/AXUSD'],
    [AXUSD, WETH, 'AXUSD/WETH'],
    [USD,   USDC, 'USD/USDC'],
  ]) {
    try {
      await a.getQuote(ethers.parseUnits('1', 18), b, q);
      record(`Reverts on ${label}`, false, 'returned a value (must revert)');
    } catch (e) {
      const msg = e.shortMessage || e.message || '';
      record(`Reverts on ${label}`, true, msg.split('\n')[0].slice(0, 80));
    }
  }

  // ── Immutability surface (must NOT have any setter) ─────────────────────
  console.log('\n[4/4] Immutability surface');
  for (const sig of [
    'function setGovernor(address)',
    'function setOracle(address)',
    'function setRate(uint256)',
    'function setMaxStaleness(uint256)',
    'function transferOwnership(address)',
  ]) {
    const probeAbi = [sig];
    const probeContract = new ethers.Contract(ADAPTER, probeAbi, provider);
    const m = sig.match(/function (\w+)/)[1];
    let calldata;
    try {
      calldata = probeContract.interface.encodeFunctionData(m, [
        m.endsWith('Ownership') || m.startsWith('setGovernor') || m.startsWith('setOracle')
          ? '0x0000000000000000000000000000000000000000'
          : 0,
      ]);
    } catch { continue; }
    const result = await provider.call({ to: ADAPTER, data: calldata }).catch(() => '__revert__');
    // For an immutable adapter, the function selector should not exist → revert with 0x.
    const hasSetter = result !== '__revert__' && result !== '0x';
    record(`No ${m}() — immutable surface`, !hasSetter, hasSetter ? 'setter present!' : 'absent');
  }

  finish();
}

function finish() {
  const passed = checks.filter(c => c.ok).length;
  const total  = checks.length;
  console.log('');
  console.log('========================================');
  console.log(`RESULT: ${passed}/${total} checks passed`);
  console.log('========================================');
  if (passed !== total) {
    const fails = checks.filter(c => !c.ok).map(c => '  - ' + c.label).join('\n');
    console.log('Failing checks:\n' + fails);
    process.exit(1);
  }
  console.log('Adapter conforms to ERC-7726 + Euler oracleAdapterRegistry');
  console.log('preconditions. Submission package may now be filed against');
  console.log('euler-xyz/euler-interfaces. See documents/euler-adapter-submission-package/');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
