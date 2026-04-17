/**
 * Read-only on-chain audit of the AXUSD Euler Earn vault on Arbitrum One.
 *
 * Sibling of scripts/audit-axusd-evk-vault.js but adapted for the Euler Earn
 * (yield-aggregator / MetaMorpho-style) vault interface, which has:
 *   - a different factory (EulerEarnFactory) and proxy model,
 *   - owner/curator/guardian/allocator instead of governorAdmin,
 *   - submit-/acceptCap timelock-gated supply caps for each strategy,
 *   - its own perspectives:
 *        eulerEarnFactoryPerspective  → verifies "Euler Earn" vault TYPE,
 *        eulerEarnGovernedPerspective → additionally requires recognized
 *                                       curator + recognized strategies.
 *
 * Reports:
 *   - Factory recognition (factory.isValidDeployment when exposed; the
 *     authoritative signal is the Earn factory perspective itself)
 *   - Asset / EVC / Permit2 (immutables)
 *   - Owner / Curator / Guardian / FeeRecipient / Fee / Timelock
 *   - Supply queue + withdraw queue + per-strategy cap + pendingCap
 *   - maxDeposit(0x0) (deposit-cap visibility — Euler Earn has no hook
 *     system, so no hookConfig is reported)
 *   - Perspective verification with best-effort PerspectiveError code
 *     decoding (the bit table is shared with the EVK perspectives; bits
 *     specific to the Earn perspectives may surface as raw=<n>)
 *
 * Pulls perspective + label addresses LIVE from euler-xyz/euler-interfaces.
 * Pure read-only — no transactions sent.
 *
 * Run:
 *   node scripts/audit-axusd-euler-earn-vault.js
 *   VAULT=0x... node scripts/audit-axusd-euler-earn-vault.js
 */

const { ethers } = require('ethers');
const https = require('https');

const VAULT = (process.env.VAULT || '0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B').trim();
const EARN_FACTORY = '0xB9B5d62B9fE9E1B505466e75817aB178A1D2ec9d';

const RPC = process.env.ALCHEMY_API_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : (process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc');

const REF = process.env.EULER_INTERFACES_REF || 'master';
const PERIPHERY_URL = `https://raw.githubusercontent.com/euler-xyz/euler-interfaces/${REF}/addresses/42161/PeripheryAddresses.json`;
const MULTISIG_URL  = `https://raw.githubusercontent.com/euler-xyz/euler-interfaces/${REF}/addresses/42161/MultisigAddresses.json`;
const GOVERNOR_URL  = `https://raw.githubusercontent.com/euler-xyz/euler-interfaces/${REF}/addresses/42161/GovernorAddresses.json`;

// Both factories try a few known shapes — the public Earn factory exposes
// a couple of different list functions across versions.
const FACTORY_ABI = [
  'function isValidDeployment(address) view returns (bool)',
  'function getEulerEarnVaultsListLength() view returns (uint256)',
  'function getVaultListLength() view returns (uint256)',
];

const EARN_VAULT_ABI = [
  'function asset() view returns (address)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function owner() view returns (address)',
  'function curator() view returns (address)',
  'function guardian() view returns (address)',
  'function feeRecipient() view returns (address)',
  'function fee() view returns (uint96)',
  'function timelock() view returns (uint256)',
  'function totalAssets() view returns (uint256)',
  'function maxDeposit(address) view returns (uint256)',
  'function supplyQueueLength() view returns (uint256)',
  'function supplyQueue(uint256) view returns (address)',
  'function withdrawQueueLength() view returns (uint256)',
  'function withdrawQueue(uint256) view returns (address)',
  'function isAllocator(address) view returns (bool)',
  'function EVC() view returns (address)',
  'function permit2Address() view returns (address)',
  'function config(address) view returns (uint112 cap, uint136 currentCap, bool enabled, uint64 removableAt)',
  'function pendingCap(address) view returns (uint136 value, uint64 validAt)',
];

const PERSPECTIVE_ABI = [
  'function isVerified(address) view returns (bool)',
  'function name() view returns (string)',
];

const ERC20_META_ABI = [
  'function symbol() view returns (string)',
  'function name() view returns (string)',
];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'axiom-audit/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return resolve(fetchJson(res.headers.location));
      }
      if (res.statusCode !== 200) return reject(new Error(`${url} → ${res.statusCode}`));
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function pad(label, w = 28) {
  return (label + ' '.repeat(w)).slice(0, w);
}

function buildLabelMap(multisigs, governors) {
  // Both files map "name" → "address".  Invert to address-keyed lookup.
  const map = {};
  for (const obj of [multisigs, governors]) {
    if (!obj) continue;
    for (const [name, addr] of Object.entries(obj)) {
      if (!addr || addr === ethers.ZeroAddress) continue;
      try { map[ethers.getAddress(addr)] = name; } catch {}
    }
  }
  return map;
}

function fmtAddr(a, labels) {
  if (!a) return 'null';
  let lc;
  try { lc = ethers.getAddress(a); } catch { return a; }
  if (lc.toLowerCase() === ethers.ZeroAddress) return `${a}  (ZERO)`;
  const label = labels && labels[lc];
  return label ? `${a}  (${label})` : a;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' AXUSD Euler Earn Vault Audit — Arbitrum One');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' Vault:           ', VAULT);
  console.log(' Factory:         ', EARN_FACTORY);
  console.log(' RPC:             ', RPC.replace(/\/v2\/.*/, '/v2/<key>'));
  console.log(' Perspectives ref:', REF);
  console.log('───────────────────────────────────────────────────────────────');

  const provider = new ethers.JsonRpcProvider(RPC);

  let periphery = {}, multisigs = {}, governors = {};
  try { periphery = await fetchJson(PERIPHERY_URL); }
  catch (e) { console.warn(' [warn] failed to fetch PeripheryAddresses:', e.message); }
  try { multisigs = await fetchJson(MULTISIG_URL); } catch {}
  try { governors = await fetchJson(GOVERNOR_URL); } catch {}
  const labels = buildLabelMap(multisigs, governors);

  const persp = periphery.perspectives || periphery;
  const PERSP = {
    eulerEarnFactoryPerspective:  persp.eulerEarnFactoryPerspective,
    eulerEarnGovernedPerspective: persp.eulerEarnGovernedPerspective,
  };
  console.log('\n[Perspectives discovered]');
  for (const [k, v] of Object.entries(PERSP)) console.log(' ', pad(k, 34), v || '(missing)');

  const factory = new ethers.Contract(EARN_FACTORY, FACTORY_ABI, provider);
  const vault   = new ethers.Contract(VAULT,        EARN_VAULT_ABI, provider);

  const code = await provider.getCode(VAULT);
  console.log('\n[Factory recognition]');
  console.log(' ', pad('hasCode'), code && code !== '0x' ? `yes (${(code.length - 2) / 2} bytes)` : 'no');

  // factory.isValidDeployment may not exist on all versions; try and fall back.
  let validDeployment = null;
  try { validDeployment = await factory.isValidDeployment(VAULT); }
  catch { validDeployment = null; }
  console.log(' ', pad('factory.isValidDeployment'),
    validDeployment === null ? '(not exposed on this factory — perspective is canonical signal)' : validDeployment);

  const [
    name, symbol, decimals, asset, owner, curator, guardian, feeRecip, fee,
    timelock, totalAssets, maxDep0, sqLen, wqLen, evc, permit2,
  ] = await Promise.all([
    vault.name().catch(() => '?'),
    vault.symbol().catch(() => '?'),
    vault.decimals().catch(() => 18),
    vault.asset().catch(() => ethers.ZeroAddress),
    vault.owner().catch(() => ethers.ZeroAddress),
    vault.curator().catch(() => ethers.ZeroAddress),
    vault.guardian().catch(() => ethers.ZeroAddress),
    vault.feeRecipient().catch(() => ethers.ZeroAddress),
    vault.fee().catch(() => 0n),
    vault.timelock().catch(() => 0n),
    vault.totalAssets().catch(() => 0n),
    vault.maxDeposit(ethers.ZeroAddress).catch(() => 0n),
    vault.supplyQueueLength().catch(() => 0n),
    vault.withdrawQueueLength().catch(() => 0n),
    vault.EVC().catch(() => ethers.ZeroAddress),
    vault.permit2Address().catch(() => ethers.ZeroAddress),
  ]);

  const dec = Number(decimals);

  console.log('\n[Vault identity]');
  console.log(' ', pad('name'),     name);
  console.log(' ', pad('symbol'),   symbol);
  console.log(' ', pad('decimals'), dec);

  console.log('\n[Immutable params]');
  console.log(' ', pad('asset'),         fmtAddr(asset, labels));
  console.log(' ', pad('EVC'),           fmtAddr(evc,   labels));
  console.log(' ', pad('permit2Address'), fmtAddr(permit2, labels));

  console.log('\n[Governance roles]');
  console.log(' ', pad('owner'),         fmtAddr(owner,    labels));
  console.log(' ', pad('curator'),       fmtAddr(curator,  labels));
  console.log(' ', pad('guardian'),      fmtAddr(guardian, labels));
  console.log(' ', pad('feeRecipient'),  fmtAddr(feeRecip, labels));

  console.log('\n[Fee / timelock]');
  // Fee is WAD (1e18). 0.1e18 = 10%.
  const feeBig = BigInt(fee);
  const feePct = (Number(feeBig) / 1e18) * 100;
  console.log(' ', pad('fee (WAD)'),       feeBig.toString(), `→ ${feePct.toFixed(4)}%`);
  console.log(' ', pad('timelock (sec)'),  timelock.toString(),
    timelock === 0n ? '(instant cap acceptance)' : `(${(Number(timelock)/3600).toFixed(2)}h)`);
  console.log(' ', pad('totalAssets'),     ethers.formatUnits(totalAssets, dec), symbol);
  console.log(' ', pad('maxDeposit(0x0)'), maxDep0.toString(),
    maxDep0 === 0n ? '⚠ deposits BLOCKED' : '✓ deposits open');

  // Supply queue — strategies and their per-strategy caps
  console.log('\n[Supply queue (allocation order)]');
  if (sqLen === 0n) {
    console.log('  (empty — no strategies registered; all deposits idle)');
  } else {
    for (let i = 0n; i < sqLen; i++) {
      const strat = await vault.supplyQueue(i);
      const [cfg, pending, ercSym] = await Promise.all([
        vault.config(strat).catch(() => null),
        vault.pendingCap(strat).catch(() => null),
        new ethers.Contract(strat, ERC20_META_ABI, provider).symbol().catch(() => '?'),
      ]);
      const capRaw     = cfg ? BigInt(cfg[0]) : 0n;
      const currentCap = cfg ? BigInt(cfg[1]) : 0n;
      const enabled    = cfg ? cfg[2]         : false;
      const removeAt   = cfg ? Number(cfg[3]) : 0;
      const pendVal    = pending ? BigInt(pending[0]) : 0n;
      const pendValid  = pending ? Number(pending[1])   : 0;
      console.log(`   [${i}] ${strat} (${ercSym})`);
      console.log(`        enabled:    ${enabled}`);
      console.log(`        cap:        ${ethers.formatUnits(capRaw, dec)} (current ${ethers.formatUnits(currentCap, dec)})`);
      if (pendVal !== 0n) {
        const now = Math.floor(Date.now() / 1000);
        console.log(`        pendingCap: ${ethers.formatUnits(pendVal, dec)} (validAt ${pendValid}, ${pendValid <= now ? 'ready' : `${pendValid - now}s remaining`})`);
      }
      if (removeAt !== 0) console.log(`        removableAt: ${removeAt}`);
    }
  }

  console.log('\n[Withdraw queue (withdraw order)]');
  if (wqLen === 0n) {
    console.log('  (empty)');
  } else {
    for (let i = 0n; i < wqLen; i++) {
      console.log('   [' + i + ']', await vault.withdrawQueue(i));
    }
  }

  // Perspective verification
  console.log('\n[Perspective verification]');
  const perspResults = {};
  const perspErrors  = {};
  const PERSP_DRY_ABI = [
    ...PERSPECTIVE_ABI,
    'error PerspectiveError(address perspective, address vault, uint256 codes)',
  ];
  // Same EVK error code table for the bits the Euler Earn perspectives reuse.
  const ERR_NAMES = {
    1: 'FACTORY', 2: 'IMPLEMENTATION', 4: 'UPGRADABILITY', 8: 'SINGLETON', 16: 'NESTING',
    32: 'ORACLE_INVALID_ROUTER', 64: 'ORACLE_GOVERNED_ROUTER', 128: 'ORACLE_INVALID_FALLBACK',
    256: 'ORACLE_INVALID_ROUTER_CONFIG', 512: 'ORACLE_INVALID_ADAPTER', 1024: 'UNIT_OF_ACCOUNT',
    2048: 'CREATOR', 4096: 'GOVERNOR', 8192: 'FEE_RECEIVER', 16384: 'INTEREST_FEE',
    32768: 'INTEREST_RATE_MODEL', 65536: 'SUPPLY_CAP', 131072: 'BORROW_CAP', 262144: 'HOOK_TARGET',
    524288: 'HOOKED_OPS', 1048576: 'CONFIG_FLAGS', 2097152: 'NAME', 4194304: 'SYMBOL',
    8388608: 'LIQUIDATION_DISCOUNT', 16777216: 'LIQUIDATION_COOL_OFF_TIME',
    33554432: 'LTV_COLLATERAL_CONFIG_LENGTH', 67108864: 'LTV_COLLATERAL_CONFIG_SEPARATION',
    134217728: 'LTV_COLLATERAL_CONFIG_BORROW', 268435456: 'LTV_COLLATERAL_CONFIG_LIQUIDATION',
    536870912: 'LTV_COLLATERAL_RAMPING', 1073741824: 'LTV_COLLATERAL_RECOGNITION',
  };
  function decodeErrCodes(codes) {
    const flags = [];
    for (const [bit, n] of Object.entries(ERR_NAMES)) if (codes & BigInt(bit)) flags.push(`${n}(${bit})`);
    return flags.length ? flags.join(', ') : `raw=${codes}`;
  }
  for (const [key, addr] of Object.entries(PERSP)) {
    if (!addr) { console.log(' ', pad(key, 34), '(no address)'); perspResults[key] = null; continue; }
    const p = new ethers.Contract(addr, PERSP_DRY_ABI, provider);
    let pname = '', verified = false;
    try { pname = await p.name(); } catch {}
    try { verified = await p.isVerified(VAULT); } catch {}
    perspResults[key] = verified;
    let why = '';
    if (!verified) {
      const iface = new ethers.Interface(['function perspectiveVerify(address,bool)']);
      const data  = iface.encodeFunctionData('perspectiveVerify', [VAULT, true]);
      try {
        await provider.call({ to: addr, data });
        why = ' (no errors — submit tx to register)';
      } catch (e) {
        const errData = e?.data || e?.info?.error?.data || e?.error?.data;
        if (typeof errData === 'string' && errData.length >= 138) {
          const codes = BigInt('0x' + errData.slice(-64));
          perspErrors[key] = codes;
          why = '  failing checks: ' + decodeErrCodes(codes);
        } else {
          why = '  (revert with no PerspectiveError data — likely a custom error in this perspective; consult source)';
        }
      }
    }
    console.log(' ', pad(key, 34), verified ? 'VERIFIED ✓' : 'not verified', pname ? `[${pname}]` : '');
    if (why) console.log('     ', why);
  }

  // Verdict
  const factoryRecognized = perspResults.eulerEarnFactoryPerspective === true;
  const governedRecognized = perspResults.eulerEarnGovernedPerspective === true;
  const ownerLc   = (owner   || '').toLowerCase();
  const curatorLc = (curator || '').toLowerCase();
  const ownerIsZero   = ownerLc   === ethers.ZeroAddress;
  const curatorIsZero = curatorLc === ethers.ZeroAddress;
  const ownerLabeled   = !!labels[ethers.getAddress(owner)];
  const curatorLabeled = curator !== ethers.ZeroAddress && !!labels[ethers.getAddress(curator)];

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(' VERDICT');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' Vault type recognized:  ',
    factoryRecognized ? 'YES ✓ (Euler Earn — factory perspective verified)'
                      : governedRecognized ? 'YES ✓ (Governed perspective verified)'
                      : 'NO ✗ (UI shows "Unknown")');
  console.log(' Curator label:          ',
    curatorIsZero  ? 'NONE (curator=0x0 — UI typically shows "None" or owner)'
    : curatorLabeled ? 'LABELED ✓'
    : 'UNLABELED ✗ (UI shows raw address — submit PR to euler-interfaces to add label)');
  console.log(' Owner label:            ',
    ownerIsZero ? 'RENOUNCED'
    : ownerLabeled ? 'LABELED ✓'
    : 'UNLABELED ✗ (deployer EOA — UI shows raw address)');
  console.log(' Deposits open:          ', maxDep0 === 0n ? 'NO ✗' : 'YES ✓');
  console.log(' Strategies registered:  ', sqLen.toString(), sqLen === 0n ? '(no allocation possible)' : '');

  console.log('\n Remediation path:');
  if (factoryRecognized && governedRecognized) {
    console.log('   None — vault verified by both Euler Earn perspectives.');
  } else if (factoryRecognized) {
    console.log('   Vault TYPE is recognized (factory perspective).  The "Unknown" issue from');
    console.log('   the EVK sibling vault DOES NOT apply here — no redeploy needed.');
    console.log('');
    console.log('   To additionally pass eulerEarnGovernedPerspective (gives a stricter "Governed');
    console.log('   Earn" label), all configured strategies must themselves be perspective-verified');
    console.log('   EVK vaults.  The current strategy is the legacy eAXUSD-6 vault, which is NOT');
    console.log('   perspective-verified (see documents/euler-axusd-vault-unknown-fix.md).  The');
    console.log('   Governed perspective will start passing automatically once:');
    console.log('     (a) the canonical eAXUSD vault is deployed (Task #90),');
    console.log('     (b) it is registered in EulerUngoverned0x/Nzx perspective,');
    console.log('     (c) the legacy strategy is removed from this Earn vault and the canonical');
    console.log('         vault is added via submitCap + acceptCap + setSupplyQueue.');
    console.log('');
    if (!ownerLabeled || (!curatorIsZero && !curatorLabeled)) {
      console.log('   Optional labelling (cosmetic — does not affect perspective verification):');
      console.log('     • Transfer ownership to a labeled Safe multisig (or submit PR to');
      console.log('       euler-xyz/euler-interfaces adding the deployer/Safe to MultisigAddresses.json).');
      console.log('     • Set curator to a labeled risk address (or leave 0x0 for "None").');
    }
  } else {
    // Should not happen on the canonical Earn factory, but cover the case.
    console.log('   ⚠  Vault not recognized by Euler Earn factory perspective.  Check that the');
    console.log('       factory address matches the periphery PeripheryAddresses.json entry and');
    console.log('       that the vault was actually deployed via the official EulerEarnFactory.');
    console.log('       If the factory itself has been rotated, redeploy via the new factory is');
    console.log('       required — Earn vault upgradability and factory binding are immutable.');
  }
  console.log('═══════════════════════════════════════════════════════════════');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
