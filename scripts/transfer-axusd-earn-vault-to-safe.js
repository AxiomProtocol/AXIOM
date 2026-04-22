/**
 * Generate the on-chain ownership/curator handover plan for the Axiom
 * Earn AXUSD vault, moving control from the deployer EOA to the AXIOM
 * Risk Council Safe.
 *
 * This script signs nothing.  It prints:
 *   - Raw calldata for `transferOwnership(safe)` against the Earn vault
 *     (to be sent by the current `owner`, the deployer EOA).
 *   - Raw calldata for `setCurator(safe)` (also from `owner`, optional —
 *     surfaces a "Risk Manager" label in the Euler V2 UI).
 *   - A Safe Transaction Builder JSON the new Safe can import to call
 *     `acceptOwnership()` once the EOA's transferOwnership has landed.
 *     (Euler Earn vaults are Ownable2Step — handover is a two-tx flow.)
 *
 * Configure with env vars:
 *   VAULT=0x...    (default: 0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B)
 *   SAFE=0x...     (required; the predicted Safe from
 *                   scripts/deploy-axusd-risk-council-safe.js)
 *   SET_CURATOR=1  (default: 1; set to 0 to skip the curator handover)
 *
 * Run:
 *   SAFE=0x... node scripts/transfer-axusd-earn-vault-to-safe.js
 */

const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const VAULT = ethers.getAddress(
  (process.env.VAULT || '0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B').trim()
);
const DEPLOYER_EOA = ethers.getAddress('0x8d7892CF226B43d48B6e3ce988A1274e6D114C96');
const SET_CURATOR  = (process.env.SET_CURATOR ?? '1') !== '0';

if (!process.env.SAFE) {
  console.error('[fatal] SAFE=0x... is required.  Run scripts/deploy-axusd-risk-council-safe.js first');
  console.error('        to predict the Safe address, deploy it, then re-run with SAFE=<predicted>.');
  process.exit(1);
}
const SAFE = ethers.getAddress(process.env.SAFE.trim());

const VAULT_ABI = [
  'function owner() view returns (address)',
  'function curator() view returns (address)',
  'function transferOwnership(address newOwner)',
  'function acceptOwnership()',
  'function setCurator(address newCurator)',
];
const iface = new ethers.Interface(VAULT_ABI);

const RPC = process.env.ALCHEMY_API_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : (process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc');

(async () => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' AXUSD Earn vault → AXIOM Risk Council Safe handover plan');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' Vault:  ', VAULT);
  console.log(' Safe:   ', SAFE);
  console.log(' Set curator too?', SET_CURATOR ? 'YES' : 'no');

  // Sanity-check current state if RPC is reachable.
  try {
    const provider = new ethers.JsonRpcProvider(RPC);
    const v = new ethers.Contract(VAULT, VAULT_ABI, provider);
    const [curOwner, curCurator] = await Promise.all([
      v.owner().catch(() => null),
      v.curator().catch(() => null),
    ]);
    console.log(' Current owner:  ', curOwner);
    console.log(' Current curator:', curCurator);
    if (curOwner && curOwner.toLowerCase() !== DEPLOYER_EOA.toLowerCase()) {
      console.log(' [note] current owner is not the deployer EOA — adjust the sender accordingly.');
    }
    if (curOwner && curOwner.toLowerCase() === SAFE.toLowerCase()) {
      console.log(' [done] vault is already owned by the Safe — nothing to transfer.');
    }
  } catch (e) {
    console.log(' [warn] RPC unreachable, skipping live state check:', e.message);
  }

  console.log('───────────────────────────────────────────────────────────────');

  const transferData = iface.encodeFunctionData('transferOwnership', [SAFE]);
  const acceptData   = iface.encodeFunctionData('acceptOwnership',   []);
  const curatorData  = iface.encodeFunctionData('setCurator',        [SAFE]);

  console.log('\n[STEP 1 — sent by current owner EOA]');
  console.log('  to:   ', VAULT);
  console.log('  value: 0');
  console.log('  data: ', transferData);
  console.log('  meaning: transferOwnership(safe) — Ownable2Step puts Safe into "pending" slot.');

  console.log('\n[STEP 2 — sent by the new Safe via Safe Tx Builder]');
  console.log('  to:   ', VAULT);
  console.log('  value: 0');
  console.log('  data: ', acceptData);
  console.log('  meaning: acceptOwnership() — finalizes handover to the Safe.');

  if (SET_CURATOR) {
    console.log('\n[STEP 3 — sent by the new Safe (after STEP 2 lands)]');
    console.log('  to:   ', VAULT);
    console.log('  value: 0');
    console.log('  data: ', curatorData);
    console.log('  meaning: setCurator(safe) — surfaces "Risk Manager" label in Euler UI.');
  }

  // Safe Tx Builder batch JSON for STEPS 2 (+3): import this from the Safe UI.
  const txs = [
    {
      to: VAULT,
      value: '0',
      data: acceptData,
      contractMethod: null,
      contractInputsValues: null,
    },
  ];
  if (SET_CURATOR) {
    txs.push({
      to: VAULT,
      value: '0',
      data: curatorData,
      contractMethod: null,
      contractInputsValues: null,
    });
  }
  const batch = {
    version: '1.0',
    chainId: '42161',
    createdAt: Date.now(),
    meta: {
      name: 'AXIOM Risk Council — accept Earn AXUSD vault ownership',
      description:
        'Accept ownership of the Axiom Earn AXUSD vault (Ownable2Step) and ' +
        (SET_CURATOR ? 'set curator to the same Safe.' : 'leave curator unchanged.'),
    },
    transactions: txs,
  };

  const outDir  = path.resolve(__dirname, '..', 'documents', 'euler-interfaces-pr');
  const outFile = path.join(outDir, 'safe-accept-ownership.batch.json');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(batch, null, 2) + '\n');
  console.log('\n[Safe batch] wrote', path.relative(process.cwd(), outFile));
  console.log('  Import this in app.safe.global → Apps → Transaction Builder → "Load batch".');
  console.log('═══════════════════════════════════════════════════════════════');
})().catch((e) => { console.error(e); process.exit(1); });
