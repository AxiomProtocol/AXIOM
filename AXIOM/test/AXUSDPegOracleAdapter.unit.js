// Standalone check — loads compiled AXUSDPegOracleAdapter artifact, deploys it
// to an in-process Hardhat EVM, exercises every branch of getQuote/getQuotes,
// and asserts the expected outputs.
const hre = require('hardhat');
const { ethers } = hre;

const AXUSD = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
const USD   = '0x0000000000000000000000000000000000000348';
const USDC  = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

function eq(a,b,label){ if(a!==b){ console.error('FAIL',label,'got',a,'want',b); process.exitCode=1;} else console.log('PASS',label); }

(async () => {
  const F = await ethers.getContractFactory('AXUSDPegOracleAdapter');
  const a = await F.deploy();
  await a.waitForDeployment();
  console.log('Deployed in-process at', await a.getAddress());

  eq(await a.name(),       'AXUSDPegOracleAdapter', 'name');
  eq(await a.adapterType(), 'FixedRate',            'adapterType');
  eq((await a.AXUSD()).toLowerCase(), AXUSD.toLowerCase(), 'AXUSD constant');
  eq((await a.USD()).toLowerCase(),   USD.toLowerCase(),   'USD constant');
  eq(Number(await a.AXUSD_DECIMALS()), 18, 'AXUSD_DECIMALS');
  eq(Number(await a.USD_DECIMALS()),    8, 'USD_DECIMALS');

  // Zero-amount semantics
  eq(await a.getQuote(0n, AXUSD, USD), 0n, 'getQuote(0, AXUSD, USD) == 0');
  eq(await a.getQuote(0n, USD, AXUSD), 0n, 'getQuote(0, USD, AXUSD) == 0');

  // Bidirectional peg
  eq(await a.getQuote(ethers.parseUnits('1', 18), AXUSD, USD), 100_000_000n, '1 AXUSD -> 1.00 USD (1e8)');
  eq(await a.getQuote(ethers.parseUnits('1', 8),  USD, AXUSD), 1_000_000_000_000_000_000n, '1 USD -> 1 AXUSD (1e18)');

  // Round-trip lossless (above 1e10 floor)
  const X = ethers.parseUnits('1234.56789', 18); // 18-dec
  const a2u = await a.getQuote(X, AXUSD, USD);
  const u2a = await a.getQuote(a2u, USD, AXUSD);
  eq(u2a, X, 'Round-trip 1234.56789 AXUSD lossless');

  // Sub-floor truncation behaves predictably
  eq(await a.getQuote(1n, AXUSD, USD), 0n, '1 wei AXUSD truncates to 0 USD wei (below 1e10 floor)');

  // Unsupported pairs revert
  for (const [b,q,label] of [[AXUSD,USDC,'AXUSD/USDC'],[USDC,AXUSD,'USDC/AXUSD'],[AXUSD,AXUSD,'AXUSD/AXUSD'],[USD,USD,'USD/USD'],[USDC,USD,'USDC/USD']]) {
    let reverted = false;
    try { await a.getQuote(ethers.parseUnits('1', 18), b, q); } catch { reverted = true; }
    eq(reverted, true, `Reverts on ${label}`);
  }

  // getQuotes returns equal bid/ask
  const [bid, ask] = await a.getQuotes(ethers.parseUnits('1', 18), AXUSD, USD);
  eq(bid, 100_000_000n, 'getQuotes bid');
  eq(ask, 100_000_000n, 'getQuotes ask');

  // No callable setters present
  const noFns = ['setGovernor', 'setOracle', 'setRate', 'setMaxStaleness', 'transferOwnership'];
  for (const fn of noFns) {
    eq(typeof a[fn], 'undefined', `No ${fn}() in interface`);
  }
})().catch(e => { console.error('THROW:', e); process.exit(1); });
