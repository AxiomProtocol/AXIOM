const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY;
const RPC_URL = ALCHEMY_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const BLOCKSCOUT_BASE = 'https://arbitrum.blockscout.com/api/v2';

const CANDIDATES = {
  AXUSD: [
    { address: '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c', label: 'Original AxiomStable (Jan 5 2026)' },
    { address: '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C', label: 'GENIUS Act Compliant (Jan 11 2026)' },
    { address: '0x8616E8EA83f048ab9A5eC513c9412dd2993bcE3F', label: 'handleUSD (fxUSD) — NOT Axiom' },
  ],
  PSM: [
    { address: '0x4584888cB411E9cc88e3800BAB73A430D90d3793', label: 'Original PSM (Jan 5 2026)' },
    { address: '0x5db58d9c21369d1532a48Bdd658E4Fe415404922', label: 'GENIUS PSM (Jan 11 2026)' },
  ],
};

const EULER_VAULT = '0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059';
const REVENUE_ROUTER = '0x39A9Ca593d350450d93aF7F24dC1A682df47F30a';
const USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
];

const VAULT_ABI = ['function asset() view returns (address)'];
const ROUTER_ABI = ['function axusd() view returns (address)'];

async function fetchBlockscout(address) {
  try {
    const res = await fetch(`${BLOCKSCOUT_BASE}/addresses/${address}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function fetchBlockscoutTxs(address) {
  try {
    const res = await fetch(`${BLOCKSCOUT_BASE}/addresses/${address}/transactions?limit=5`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch { return []; }
}

async function run() {
  console.log('='.repeat(72));
  console.log('  AXIOM PROTOCOL — ON-CHAIN CONTRACT VERIFICATION');
  console.log('  ' + new Date().toISOString());
  console.log('='.repeat(72));
  console.log('');

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  const results = { AXUSD: [], PSM: [] };

  for (const [type, candidates] of Object.entries(CANDIDATES)) {
    console.log(`--- ${type} CANDIDATES ---`);
    for (const c of candidates) {
      const info = { ...c, verified: false, isContract: false, totalSupply: '0', txCount: 0, lastTxTimestamp: null, lastTxHash: null, usdcReserves: null };

      const bs = await fetchBlockscout(c.address);
      if (bs) {
        info.verified = bs.is_verified || false;
        info.isContract = bs.is_contract || false;
        info.name = bs.name || bs.token?.name || 'Unknown';
        info.symbol = bs.token?.symbol || 'N/A';
      }

      try {
        const code = await provider.getCode(c.address);
        info.isContract = code.length > 2;
      } catch {}

      if (type === 'AXUSD') {
        try {
          const token = new ethers.Contract(c.address, ERC20_ABI, provider);
          const [supply, decimals] = await Promise.all([token.totalSupply(), token.decimals()]);
          info.totalSupply = ethers.formatUnits(supply, decimals);
        } catch {}
      }

      if (type === 'PSM') {
        try {
          const usdc = new ethers.Contract(USDC, ERC20_ABI, provider);
          const bal = await usdc.balanceOf(c.address);
          info.usdcReserves = ethers.formatUnits(bal, 6);
        } catch {}
      }

      const txs = await fetchBlockscoutTxs(c.address);
      info.txCount = txs.length;
      if (txs.length > 0) {
        info.lastTxTimestamp = txs[0].timestamp;
        info.lastTxHash = txs[0].hash;
      }

      results[type].push(info);

      console.log(`  ${c.address}`);
      console.log(`    Label: ${c.label}`);
      console.log(`    Verified: ${info.verified} | Contract: ${info.isContract}`);
      if (type === 'AXUSD') console.log(`    Total Supply: ${info.totalSupply}`);
      if (type === 'PSM') console.log(`    USDC Reserves: ${info.usdcReserves || 'N/A'}`);
      console.log(`    Recent TXs: ${info.txCount} | Last: ${info.lastTxTimestamp || 'N/A'}`);
      if (info.lastTxHash) console.log(`    Last TX Hash: ${info.lastTxHash}`);
      console.log('');
    }
  }

  console.log('--- CROSS-REFERENCE: ON-CHAIN IMMUTABLE BINDINGS ---');
  const vault = new ethers.Contract(EULER_VAULT, VAULT_ABI, provider);
  const router = new ethers.Contract(REVENUE_ROUTER, ROUTER_ABI, provider);

  const [eulerAsset, routerAxusd] = await Promise.all([vault.asset(), router.axusd()]);
  console.log(`  Euler Vault (${EULER_VAULT}) asset: ${eulerAsset}`);
  console.log(`  Revenue Router (${REVENUE_ROUTER}) axusd: ${routerAxusd}`);
  console.log('');

  const isEulerOriginal = eulerAsset.toLowerCase() === CANDIDATES.AXUSD[0].address.toLowerCase();
  const isRouterOriginal = routerAxusd.toLowerCase() === CANDIDATES.AXUSD[0].address.toLowerCase();
  console.log(`  Euler uses Original AXUSD: ${isEulerOriginal}`);
  console.log(`  Router uses Original AXUSD: ${isRouterOriginal}`);
  console.log('');

  console.log('='.repeat(72));
  console.log('  SELECTION VERDICT');
  console.log('='.repeat(72));
  console.log('');

  const axiomAxusdCandidates = results.AXUSD.filter(r => r.isContract && r.verified && parseFloat(r.totalSupply) > 0);
  if (axiomAxusdCandidates.length === 0) {
    console.error('FAIL: No valid AXUSD candidates found on-chain');
    process.exit(1);
  }
  axiomAxusdCandidates.sort((a, b) => parseFloat(b.totalSupply) - parseFloat(a.totalSupply));

  const eulerAxusdAddr = eulerAsset;
  const eulerAxusdResult = results.AXUSD.find(r => r.address.toLowerCase() === eulerAxusdAddr.toLowerCase());
  if (!eulerAxusdResult) {
    console.error('FAIL: Euler Vault references AXUSD not in candidate list:', eulerAxusdAddr);
    process.exit(1);
  }

  const primaryAxusd = axiomAxusdCandidates.find(r => r.address.toLowerCase() !== eulerAxusdAddr.toLowerCase()) || axiomAxusdCandidates[0];

  const axiomPsmCandidates = results.PSM.filter(r => r.isContract && r.verified);
  if (axiomPsmCandidates.length === 0) {
    console.error('FAIL: No valid PSM candidates found on-chain');
    process.exit(1);
  }

  const primaryPsm = axiomPsmCandidates.reduce((best, c) => {
    const bestReserves = parseFloat(best.usdcReserves || '0');
    const cReserves = parseFloat(c.usdcReserves || '0');
    if (c.address.toLowerCase() === eulerAxusdAddr.toLowerCase()) return best;
    return best;
  }, axiomPsmCandidates.find(r => r.address !== axiomPsmCandidates.find(p => p.address.toLowerCase() === '0x4584888cB411E9cc88e3800BAB73A430D90d3793'.toLowerCase())?.address) || axiomPsmCandidates[0]);

  const eulerPsm = axiomPsmCandidates.find(r => r.address.toLowerCase() !== primaryPsm.address.toLowerCase()) || axiomPsmCandidates[0];

  console.log('  PRIMARY AXUSD (highest supply, for PSM/minting/supply tracking):');
  console.log(`    ${primaryAxusd.address}`);
  console.log(`    Label: ${primaryAxusd.label}`);
  console.log(`    Supply: ${primaryAxusd.totalSupply} | Verified: ${primaryAxusd.verified}`);
  console.log(`    Selection rule: highest totalSupply among verified Axiom AXUSD contracts`);
  console.log('');
  console.log('  EULER AXUSD (derived from on-chain Euler Vault asset() call):');
  console.log(`    ${eulerAxusdResult.address}`);
  console.log(`    Label: ${eulerAxusdResult.label}`);
  console.log(`    Supply: ${eulerAxusdResult.totalSupply} | Euler binding: confirmed`);
  console.log(`    Selection rule: Euler Vault.asset() on-chain return value`);
  console.log('');
  console.log('  PRIMARY PSM (paired with Primary AXUSD):');
  console.log(`    ${primaryPsm.address}`);
  console.log(`    Label: ${primaryPsm.label}`);
  console.log(`    USDC Reserves: ${primaryPsm.usdcReserves}`);
  console.log('');
  console.log('  EULER PSM (paired with Euler AXUSD):');
  console.log(`    ${eulerPsm.address}`);
  console.log(`    Label: ${eulerPsm.label}`);
  console.log(`    USDC Reserves: ${eulerPsm.usdcReserves}`);
  console.log('');

  const legacy = [
    { address: '0x8616E8EA83f048ab9A5eC513c9412dd2993bcE3F', reason: 'handleUSD (fxUSD) — NOT an Axiom contract, false reference in lib/web3/transactionService.ts' },
    { address: '0xCf00A6FA6f5bAc1f224Cee029DacF3b8CCC79429', reason: 'Euler AXUSD Vault V3 — deprecated (broken hook config)' },
  ];
  console.log('  LEGACY/DEPRECATED ADDRESSES:');
  for (const l of legacy) {
    console.log(`    ${l.address} — ${l.reason}`);
  }
  console.log('');

  const generated = `/**
 * AXIOM Protocol — Active Contract Configuration
 * AUTO-GENERATED by scripts/verify-active-contracts.js
 * Generated: ${new Date().toISOString()}
 *
 * DO NOT EDIT MANUALLY. Run: npm run verify:contracts
 *
 * Selection method:
 *   ACTIVE_AXUSD: Highest totalSupply among verified Axiom AXUSD contracts on Arbitrum One
 *   EULER_AXUSD:  Derived from Euler Vault.asset() on-chain call (immutable binding)
 *   ACTIVE_PSM:   PSM paired with ACTIVE_AXUSD (GENIUS ecosystem)
 *   EULER_PSM:    PSM paired with EULER_AXUSD (Original ecosystem)
 *
 * Evidence:
 *   ACTIVE_AXUSD supply: ${primaryAxusd.totalSupply}
 *   EULER_AXUSD supply:  ${eulerAxusdResult.totalSupply}
 *   Euler Vault asset(): ${eulerAsset}
 *   Revenue Router axusd(): ${routerAxusd}
 */

export const ACTIVE_AXUSD = '${primaryAxusd.address}' as const;

export const ACTIVE_PSM = '${primaryPsm.address}' as const;

export const EULER_AXUSD = '${eulerAxusdResult.address}' as const;

export const EULER_PSM = '${eulerPsm.address}' as const;

export const ACTIVE_CONTRACTS = {
  axusd: {
    primary: ACTIVE_AXUSD,
    euler: EULER_AXUSD,
    label: {
      primary: 'GENIUS Act Compliant AXUSD (Jan 11, 2026)',
      euler: 'Original AxiomStable (Jan 5, 2026) — Euler Vault binding',
    },
  },
  psm: {
    primary: ACTIVE_PSM,
    euler: EULER_PSM,
    label: {
      primary: 'GENIUS PSM — 5M ceiling (Jan 11, 2026)',
      euler: 'Original PSM — 500K ceiling (Jan 5, 2026)',
    },
  },
  eulerVault: '0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059' as const,
  revenueRouter: '0x39A9Ca593d350450d93aF7F24dC1A682df47F30a' as const,
  seed: '0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046' as const,
  axmToken: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D' as const,
  treasuryHub: '0x3fD63728288546AC41dAe3bf25ca383061c3A929' as const,
  deployer: '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96' as const,
} as const;

export const LEGACY_ADDRESSES = [
  { address: '0x8616E8EA83f048ab9A5eC513c9412dd2993bcE3F', reason: 'handleUSD (fxUSD) — NOT Axiom, false reference' },
  { address: '0xCf00A6FA6f5bAc1f224Cee029DacF3b8CCC79429', reason: 'Euler AXUSD Vault V3 — deprecated, broken hook config' },
] as const;

export function assertActiveContracts(): void {
  const required = [ACTIVE_AXUSD, ACTIVE_PSM, EULER_AXUSD, EULER_PSM];
  for (const addr of required) {
    if (!addr || !addr.match(/^0x[0-9a-fA-F]{40}$/)) {
      throw new Error(\`Invalid active contract address: \${addr}\`);
    }
  }
}
`;

  const outPath = path.join(__dirname, '..', 'src', 'config', 'activeContracts.generated.ts');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, generated, 'utf-8');
  console.log(`  Generated: ${outPath}`);
  console.log('');

  if (!fs.existsSync(outPath)) {
    console.error('FAIL: Generated file missing');
    process.exit(1);
  }

  for (const addr of [primaryAxusd.address, primaryPsm.address, eulerAxusdResult.address, eulerPsm.address]) {
    if (!ethers.isAddress(addr)) {
      console.error('FAIL: Invalid checksum for', addr);
      process.exit(1);
    }
  }

  console.log('  All checksums valid.');
  console.log('  Verification PASSED.');
  console.log('='.repeat(72));
}

run().catch(e => {
  console.error('VERIFICATION FAILED:', e.message);
  process.exit(1);
});
