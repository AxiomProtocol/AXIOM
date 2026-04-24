/**
 * verify-usdc-usd-chainlink-adapter.js
 *
 * Read-only conformance test for a `ChainlinkUSDCOracleAdapter` deployment.
 * Mirrors `verify-axusd-peg-adapter.js` so the same checklist format is
 * attached to the Euler registry PR for both adapters.
 *
 * Usage:
 *   DEPLOYED=0x... node scripts/verify-usdc-usd-chainlink-adapter.js
 *
 * Exits with code 0 if every check passes, 1 if any check fails.
 *
 * No private key required. No transactions sent.
 */

const { ethers } = require('ethers');

const ADAPTER = process.env.DEPLOYED;
if (!ADAPTER) {
  console.error('Set DEPLOYED=<adapter address>');
  process.exit(1);
}

const USDC  = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const USD   = '0x0000000000000000000000000000000000000348';
const AXUSD = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
const WETH  = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
const FEED  = '0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3';

const ABI = [
  'function getQuote(uint256 inAmount, address base, address quote) view returns (uint256)',
  'function getQuotes(uint256 inAmount, address base, address quote) view returns (uint256, uint256)',
  'function name() view returns (string)',
  'function adapterType() view returns (string)',
  'function USDC() view returns (address)',
  'function USD() view returns (address)',
  'function FEED() view returns (address)',
  'function MAX_STALENESS() view returns (uint256)',
];

const FEED_ABI = [
  'function decimals() view returns (uint8)',
  'function description() view returns (string)',
  'function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)',
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

  console.log(`ChainlinkUSDCOracleAdapter conformance — ${ADAPTER}`);
  console.log('Network: Arbitrum One (42161)');
  console.log('');

  const code = await provider.getCode(ADAPTER);
  record('Contract has bytecode at address', code && code !== '0x', `${(code.length - 2) / 2} bytes`);
  if (!code || code === '0x') return finish();

  const a    = new ethers.Contract(ADAPTER, ABI, provider);
  const feed = new ethers.Contract(FEED,    FEED_ABI, provider);

  // ── Identity ────────────────────────────────────────────────────────────
  console.log('\n[1/5] Identity & metadata');
  try {
    const nm = await a.name();
    record('name() == "ChainlinkUSDCOracleAdapter"', nm === 'ChainlinkUSDCOracleAdapter', `got "${nm}"`);
  } catch (e) { record('name() callable', false, e.shortMessage || e.message); }
  try {
    const ty = await a.adapterType();
    record('adapterType() == "Chainlink"', ty === 'Chainlink', `got "${ty}"`);
  } catch (e) { record('adapterType() callable', false, e.shortMessage || e.message); }
  try {
    const u = await a.USDC();
    record('USDC() == native USDC on Arbitrum', u.toLowerCase() === USDC.toLowerCase(), u);
  } catch (e) { record('USDC() callable', false, e.shortMessage || e.message); }
  try {
    const usd = await a.USD();
    record('USD() == ISO 4217 pseudo (0x...0348)', usd.toLowerCase() === USD.toLowerCase(), usd);
  } catch (e) { record('USD() callable', false, e.shortMessage || e.message); }
  try {
    const f = await a.FEED();
    record('FEED() points at canonical Chainlink USDC/USD aggregator', f.toLowerCase() === FEED.toLowerCase(), f);
  } catch (e) { record('FEED() callable', false, e.shortMessage || e.message); }
  try {
    const s = await a.MAX_STALENESS();
    record('MAX_STALENESS() == 86400 (24h heartbeat)', s === 86400n, s.toString());
  } catch (e) { record('MAX_STALENESS() callable', false, e.shortMessage || e.message); }

  // ── Underlying feed sanity ──────────────────────────────────────────────
  console.log('\n[2/5] Underlying Chainlink feed sanity');
  try {
    const desc = await feed.description();
    record('Feed description == "USDC / USD"', desc === 'USDC / USD', `got "${desc}"`);
  } catch (e) { record('Feed description() callable', false, e.shortMessage || e.message); }
  try {
    const fd = await feed.decimals();
    record('Feed decimals == 8', fd === 8n, fd.toString());
  } catch (e) { record('Feed decimals() callable', false, e.shortMessage || e.message); }
  try {
    const r = await feed.latestRoundData();
    const updatedAt = Number(r[3]);
    const ageSec = Math.floor(Date.now() / 1000) - updatedAt;
    record('Feed answer > 0', r[1] > 0n, r[1].toString());
    record('Feed updated within last 24h', ageSec <= 86400, `age=${ageSec}s`);
  } catch (e) { record('Feed latestRoundData() callable', false, e.shortMessage || e.message); }

  // ── Bidirectional pricing ───────────────────────────────────────────────
  console.log('\n[3/5] ERC-7726 bidirectional pricing');
  let usdcToUsd = null;
  try {
    const out = await a.getQuote(ethers.parseUnits('1', 6), USDC, USD);
    usdcToUsd = out;
    // ±2% band around $1.00
    const ok = out >= 98_000_000n && out <= 102_000_000n;
    record('getQuote(1e6 USDC, USDC, USD) ≈ 1e8 (±2%)', ok, `got ${out.toString()}`);
  } catch (e) { record('USDC->USD callable', false, e.shortMessage || e.message); }
  let usdToUsdc = null;
  try {
    const out = await a.getQuote(ethers.parseUnits('1', 8), USD, USDC);
    usdToUsdc = out;
    const ok = out >= 980_000n && out <= 1_020_000n;
    record('getQuote(1e8 USD, USD, USDC) ≈ 1e6 (±2%)', ok, `got ${out.toString()}`);
  } catch (e) { record('USD->USDC callable', false, e.shortMessage || e.message); }
  try {
    const out = await a.getQuote(0n, USDC, USD);
    record('getQuote(0, ...) returns 0', out === 0n, `got ${out.toString()}`);
  } catch (e) { record('getQuote(0,...) callable', false, e.shortMessage || e.message); }

  // Round-trip should be lossy by at most 1 quantum at this scale.
  if (usdcToUsd && usdToUsdc !== null) {
    try {
      const start = ethers.parseUnits('1000', 6); // 1000 USDC
      const mid   = await a.getQuote(start, USDC, USD);
      const end   = await a.getQuote(mid,   USD,  USDC);
      const diff  = start > end ? start - end : end - start;
      const okRt  = diff <= 2n; // 2 USDC wei tolerance
      record('Round-trip 1000 USDC within 2 wei', okRt, `start=${start} end=${end} diff=${diff}`);
    } catch (e) { record('Round-trip callable', false, e.shortMessage || e.message); }
  }

  // ── Unsupported pair handling ───────────────────────────────────────────
  console.log('\n[4/5] Unsupported-pair handling (must revert, not return 0)');
  for (const [b, q, label] of [
    [USDC,  AXUSD, 'USDC/AXUSD'],
    [AXUSD, USDC,  'AXUSD/USDC'],
    [USDC,  WETH,  'USDC/WETH'],
    [USD,   AXUSD, 'USD/AXUSD'],
  ]) {
    try {
      await a.getQuote(ethers.parseUnits('1', 6), b, q);
      record(`Reverts on ${label}`, false, 'returned a value (must revert)');
    } catch (e) {
      const msg = e.shortMessage || e.message || '';
      record(`Reverts on ${label}`, true, msg.split('\n')[0].slice(0, 80));
    }
  }

  // ── Immutability surface (must NOT have any setter) ─────────────────────
  console.log('\n[5/5] Immutability surface (bytecode selector scan)');
  const runtime = code.toLowerCase();
  const forbidden = [
    'setGovernor(address)',
    'setOracle(address)',
    'setFeed(address)',
    'setRate(uint256)',
    'setMaxStaleness(uint256)',
    'setPsmFallback(bool)',
    'setPsmAddresses(address,address)',
    'transferOwnership(address)',
    'renounceOwnership()',
    'upgradeTo(address)',
    'upgradeToAndCall(address,bytes)',
  ];
  for (const sig of forbidden) {
    const selector = ethers.id(sig).slice(2, 10).toLowerCase();
    const found = runtime.includes(selector);
    record(`No ${sig} selector in runtime bytecode`, !found,
      found ? `selector 0x${selector} present` : `selector 0x${selector} absent`);
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
  console.log('euler-xyz/euler-interfaces. See documents/euler-usdc-adapter-submission-package/');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
