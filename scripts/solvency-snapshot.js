#!/usr/bin/env node
const { ethers } = require('ethers');
const crypto = require('crypto');

const TARGET_URL = process.argv[2] || 'http://localhost:5000';
const ADMIN_KEY = process.env.ADMIN_SOLVENCY_KEY;

if (!ADMIN_KEY) {
  console.error('ADMIN_SOLVENCY_KEY environment variable is required');
  process.exit(1);
}

const DEPLOYER = '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96';
const TREASURY_HUB = '0x3fD63728288546AC41dAe3bf25ca383061c3A929';
const GNOSIS_SAFE = '0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d';
const BACKSTOP_USDC = '0x54438249457694eB5431811f3f19444Af0a01B29';
const BACKSTOP_ETH = '0xF2540BD6fa365Bf8F1b9dd4efa7534Ff6522393f';
const TBILL_VAULT = '0x091c146EC7c348552319E8D17cF7D0C9A4b3BCd4';
const PSM = '0x5db58d9c21369d1532a48Bdd658E4Fe415404922';
const FEE_BURNER = '0xF5d59581Eb0fd024aC1b2B67f1B290832eb8Cb94';
const SUSU_INSURANCE = '0x7B69ce0d83f45C2dBa3e5B73076beA8b1Be1271F';
const AXUSD_TOKEN = '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C';
const AXM_TOKEN = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D';
const USDC_TOKEN = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)'
];

async function queryOnChain() {
  const rpcUrl = process.env.ALCHEMY_API_KEY
    ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    : 'https://arb1.arbitrum.io/rpc';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const axusd = new ethers.Contract(AXUSD_TOKEN, ERC20_ABI, provider);
  const axm = new ethers.Contract(AXM_TOKEN, ERC20_ABI, provider);
  const usdc = new ethers.Contract(USDC_TOKEN, ERC20_ABI, provider);

  console.log('Querying on-chain balances...');

  const ethPriceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
  const ethPriceData = await ethPriceRes.json();
  const ethPrice = ethPriceData.ethereum.usd;
  console.log(`ETH price: $${ethPrice}`);

  const [
    deployerEth, treasuryEth, safeEth, backstopEthBal,
    deployerAxm, axmSupply,
    backstopUsdc, psmUsdc, treasuryUsdc, deployerUsdc, safeUsdc,
    feeBurnerUsdc, susuInsUsdc, tbillUsdc,
    axusdSupply
  ] = await Promise.all([
    provider.getBalance(DEPLOYER),
    provider.getBalance(TREASURY_HUB),
    provider.getBalance(GNOSIS_SAFE),
    provider.getBalance(BACKSTOP_ETH),
    axm.balanceOf(DEPLOYER),
    axm.totalSupply(),
    usdc.balanceOf(BACKSTOP_USDC),
    usdc.balanceOf(PSM),
    usdc.balanceOf(TREASURY_HUB),
    usdc.balanceOf(DEPLOYER),
    usdc.balanceOf(GNOSIS_SAFE),
    usdc.balanceOf(FEE_BURNER),
    usdc.balanceOf(SUSU_INSURANCE),
    usdc.balanceOf(TBILL_VAULT),
    axusd.totalSupply()
  ]);

  const fmt = (v, d) => Number(ethers.formatUnits(v, d));

  const totalEthHeld = fmt(deployerEth + treasuryEth + safeEth + backstopEthBal, 18);
  const totalEthUsd = totalEthHeld * ethPrice;
  const totalUsdc = fmt(backstopUsdc + psmUsdc + treasuryUsdc + deployerUsdc + safeUsdc + feeBurnerUsdc + susuInsUsdc + tbillUsdc, 6);
  const axusdOutstanding = fmt(axusdSupply, 18);
  const reserveUsdc = fmt(backstopUsdc + psmUsdc + susuInsUsdc + tbillUsdc, 6);
  const reserveEthUsd = fmt(backstopEthBal, 18) * ethPrice;
  const reserveTotal = reserveUsdc + reserveEthUsd;
  const treasuryTotal = totalEthUsd + totalUsdc;
  const lossBuffer = fmt(feeBurnerUsdc, 6);

  const compositionRaw = [
    { label: 'ETH (Deployer)', valueUsd: Math.round(fmt(deployerEth, 18) * ethPrice * 100) / 100 },
    { label: 'ETH (Treasury Hub)', valueUsd: Math.round(fmt(treasuryEth, 18) * ethPrice * 100) / 100 },
    { label: 'ETH (Gnosis Safe)', valueUsd: Math.round(fmt(safeEth, 18) * ethPrice * 100) / 100 },
    { label: 'USDC (PSM)', valueUsd: Math.round(fmt(psmUsdc, 6) * 100) / 100 },
    { label: 'USDC (Deployer)', valueUsd: Math.round(fmt(deployerUsdc, 6) * 100) / 100 },
    { label: 'USDC (Treasury Hub)', valueUsd: Math.round(fmt(treasuryUsdc, 6) * 100) / 100 },
    { label: 'USDC (Gnosis Safe)', valueUsd: Math.round(fmt(safeUsdc, 6) * 100) / 100 },
    { label: 'USDC (Backstop)', valueUsd: Math.round(fmt(backstopUsdc, 6) * 100) / 100 },
    { label: 'USDC (T-Bill Vault)', valueUsd: Math.round(fmt(tbillUsdc, 6) * 100) / 100 },
    { label: 'USDC (Fee Burner)', valueUsd: Math.round(fmt(feeBurnerUsdc, 6) * 100) / 100 },
    { label: 'USDC (Susu Insurance)', valueUsd: Math.round(fmt(susuInsUsdc, 6) * 100) / 100 },
    { label: 'ETH (Backstop)', valueUsd: Math.round(fmt(backstopEthBal, 18) * ethPrice * 100) / 100 },
  ].filter(c => c.valueUsd > 0);

  const compTotal = compositionRaw.reduce((s, c) => s + c.valueUsd, 0);
  const composition = compositionRaw.map(c => ({
    ...c,
    pct: compTotal > 0 ? Math.round((c.valueUsd / compTotal) * 10000) / 100 : 0
  }));

  return {
    treasuryTotalUsd: Math.round(treasuryTotal * 100) / 100,
    treasuryLiquidUsd: Math.round(treasuryTotal * 100) / 100,
    reservesTotalUsd: Math.round(reserveTotal * 100) / 100,
    liabilitiesTotalUsd: Math.round(axusdOutstanding * 100) / 100,
    lossBufferUsd: Math.round(lossBuffer * 100) / 100,
    policyMode: 'BOOTSTRAP',
    composition,
    sources: [
      { label: 'Arbitrum One RPC', detail: 'Live on-chain balance queries via Alchemy' },
      { label: 'CoinGecko', detail: `ETH/USD spot price: $${ethPrice}` },
      { label: 'Contract Registry', detail: 'shared/contracts.ts — deployer, treasury, backstop, PSM addresses' }
    ],
    notes: {
      axmHeldByDeployer: fmt(deployerAxm, 18),
      axmTotalSupply: fmt(axmSupply, 18),
      axusdTotalSupply: axusdOutstanding,
      ethPriceUsd: ethPrice,
      stage: 'Pre-revenue bootstrap. Capital has not yet been routed into treasury and reserve infrastructure. AXM governance instrument holdings are not counted as liquid capital.'
    }
  };
}

async function postSnapshot(payloadJson) {
  const url = `${TARGET_URL}/api/solvency/ingest-snapshot`;
  console.log(`\nPosting snapshot to ${url}...`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': ADMIN_KEY
    },
    body: JSON.stringify({
      payloadJson,
      notes: `On-chain snapshot captured ${new Date().toISOString()}`,
      asOfUtc: new Date().toISOString()
    })
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('Ingest failed:', data);
    process.exit(1);
  }
  return data;
}

async function main() {
  console.log('=== Axiom Solvency Snapshot Tool ===\n');
  const snapshot = await queryOnChain();

  console.log('\nSnapshot summary:');
  console.log(`  Treasury total:  $${snapshot.treasuryTotalUsd}`);
  console.log(`  Reserves:        $${snapshot.reservesTotalUsd}`);
  console.log(`  Liabilities:     $${snapshot.liabilitiesTotalUsd} (AXUSD outstanding)`);
  console.log(`  Loss buffer:     $${snapshot.lossBufferUsd}`);
  console.log(`  Policy mode:     ${snapshot.policyMode}`);
  console.log(`  Composition:     ${snapshot.composition.length} non-zero items`);
  console.log(`  AXM held:        ${snapshot.notes.axmHeldByDeployer.toLocaleString()} AXM`);

  const result = await postSnapshot(snapshot);
  console.log('\nIngested successfully:');
  console.log(`  Snapshot ID: ${result.snapshotId}`);
  console.log(`  Checksum:    ${result.checksum}`);
  console.log(`  Created:     ${result.createdAt}`);
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
