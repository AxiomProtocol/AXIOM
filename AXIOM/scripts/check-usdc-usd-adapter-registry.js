/**
 * check-usdc-usd-adapter-registry.js
 *
 * Read-only check that scans Euler's `oracleAdapterRegistry` on Arbitrum One
 * for any pre-existing USDC/USD adapter. Run this BEFORE deploying
 * `ChainlinkUSDCOracleAdapter` — if a registry-accepted USDC/USD adapter
 * already exists, we should reuse it instead of submitting a new one.
 *
 * Run:
 *   node scripts/check-usdc-usd-adapter-registry.js
 *
 * Pulls the registry address LIVE from euler-xyz/euler-interfaces, then
 * enumerates `Added(address indexed element, address indexed base,
 * address indexed quote, uint256 addedAt)` events and reports any whose
 * (base, quote) involves USDC.
 *
 * Reports for each match:
 *   - element address
 *   - base / quote
 *   - block + timestamp
 *   - whether `isValid(element, now)` currently returns true
 */

const { ethers } = require('ethers');
const https = require('https');

const REF = process.env.EULER_INTERFACES_REF || 'master';
const PERIPHERY_URL = `https://raw.githubusercontent.com/euler-xyz/euler-interfaces/${REF}/addresses/42161/PeripheryAddresses.json`;

const USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const USD  = '0x0000000000000000000000000000000000000348';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'axiom-registry-check/1.0' } }, (res) => {
      if ([301, 302].includes(res.statusCode)) return resolve(fetchJson(res.headers.location));
      if (res.statusCode !== 200) return reject(new Error(`${url} → ${res.statusCode}`));
      let buf = ''; res.on('data', c => buf += c);
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

async function main() {
  const rpc = process.env.ALCHEMY_API_KEY
    ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    : (process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc');
  const provider = new ethers.JsonRpcProvider(rpc);

  const periphery = await fetchJson(PERIPHERY_URL);
  const REGISTRY  = periphery.oracleAdapterRegistry;
  if (!REGISTRY) {
    console.error('Could not resolve oracleAdapterRegistry from euler-interfaces.');
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' Euler oracleAdapterRegistry — USDC/USD scan (Arbitrum One)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' Registry:   ', REGISTRY);
  console.log(' RPC:        ', rpc.replace(/\/v2\/.*/, '/v2/<key>'));
  console.log(' USDC:       ', USDC);
  console.log(' USD pseudo: ', USD);

  const ADDED_TOPIC = ethers.id('Added(address,address,address,uint256)');
  const usdcTopic = '0x' + USDC.slice(2).toLowerCase().padStart(64, '0');
  const usdTopic  = '0x' + USD .slice(2).toLowerCase().padStart(64, '0');

  // Pull once with USDC as base, then with USDC as quote, then with USD as either side.
  const queries = [
    { label: 'USDC as base',  topics: [ADDED_TOPIC, null, usdcTopic, null] },
    { label: 'USDC as quote', topics: [ADDED_TOPIC, null, null,      usdcTopic] },
    { label: 'USD  as base',  topics: [ADDED_TOPIC, null, usdTopic,  null] },
    { label: 'USD  as quote', topics: [ADDED_TOPIC, null, null,      usdTopic] },
  ];

  const block = await provider.getBlockNumber();
  const seen = new Map();
  let queryFailures = 0;
  // Fall back to chunked queries if full-history is rejected.
  async function getLogsResilient(topics) {
    try {
      return await provider.getLogs({ address: REGISTRY, topics, fromBlock: 0, toBlock: block });
    } catch (_) {
      const chunk = 1_500_000;
      const out = [];
      for (let from = 0; from <= block; from += chunk) {
        const to = Math.min(from + chunk - 1, block);
        try {
          const logs = await provider.getLogs({ address: REGISTRY, topics, fromBlock: from, toBlock: to });
          out.push(...logs);
        } catch (e) {
          throw new Error(`chunk ${from}-${to}: ${e.shortMessage || e.message}`);
        }
      }
      return out;
    }
  }
  for (const q of queries) {
    let logs = [];
    try {
      logs = await getLogsResilient(q.topics);
    } catch (e) {
      console.error(' [warn]', q.label, 'getLogs failed:', e.shortMessage || e.message);
      queryFailures++;
      continue;
    }
    for (const l of logs) {
      const element = ethers.getAddress('0x' + l.topics[1].slice(26));
      const base    = ethers.getAddress('0x' + l.topics[2].slice(26));
      const quote   = ethers.getAddress('0x' + l.topics[3].slice(26));
      const key = `${element}|${base}|${quote}`;
      if (!seen.has(key)) {
        seen.set(key, { element, base, quote, blockNumber: l.blockNumber, txHash: l.transactionHash });
      }
    }
  }

  console.log(`\nTotal USDC- or USD-side Added events: ${seen.size}`);
  if (queryFailures === queries.length) {
    console.log('\n  ✗ INCONCLUSIVE — every getLogs query failed.');
    console.log('    The default public RPC may not allow full-history log queries.');
    console.log('    Re-run with ALCHEMY_API_KEY=<key> set so the script can use a');
    console.log('    full-history archive node before treating this result as authoritative.');
    process.exit(2);
  }
  if (seen.size === 0) {
    console.log('\nNo USDC/USD adapter is registered in the Euler oracleAdapterRegistry');
    console.log('on Arbitrum One.');
    console.log('\nAction: deploy ChainlinkUSDCOracleAdapter and submit it via');
    console.log('  documents/euler-usdc-adapter-submission-package/');
    return;
  }

  // For each candidate, check current isValid status.
  const REGISTRY_ABI = ['function isValid(address element, uint256 snapshotTime) view returns (bool)'];
  const reg = new ethers.Contract(REGISTRY, REGISTRY_ABI, provider);
  const now = Math.floor(Date.now() / 1000);

  console.log('\nCandidates:');
  let anyValidUsdcUsd = false;
  for (const e of seen.values()) {
    const isUsdcUsd = (e.base.toLowerCase() === USDC.toLowerCase() && e.quote.toLowerCase() === USD.toLowerCase());
    const isUsdUsdc = (e.base.toLowerCase() === USD .toLowerCase() && e.quote.toLowerCase() === USDC.toLowerCase());
    let valid = false;
    try { valid = await reg.isValid(e.element, now); } catch {}
    if ((isUsdcUsd || isUsdUsdc) && valid) anyValidUsdcUsd = true;
    console.log(`  - element: ${e.element}`);
    console.log(`    base:    ${e.base}`);
    console.log(`    quote:   ${e.quote}`);
    console.log(`    block:   ${e.blockNumber}  tx: ${e.txHash}`);
    console.log(`    isValid: ${valid ? 'YES ✓' : 'NO ✗ (revoked or pending)'}`);
    console.log(`    pair:    ${isUsdcUsd ? 'USDC/USD' : isUsdUsdc ? 'USD/USDC' : 'other'}`);
  }

  console.log('\nVerdict:');
  if (anyValidUsdcUsd) {
    console.log('  ✓ Reuse one of the listed valid USDC/USD adapters above.');
    console.log('    Pass it as USDC_USD_ADAPTER to scripts/deploy-axusd-evk-vault-canonical.js.');
  } else {
    console.log('  ✗ No currently-valid USDC/USD adapter found.');
    console.log('    Action: deploy ChainlinkUSDCOracleAdapter and submit it via');
    console.log('    documents/euler-usdc-adapter-submission-package/');
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
