/**
 * diagnose-axusd-vault-unknown.js
 *
 * One-shot, read-only diagnostic for the "AXUSD vault shows Unknown labels in
 * the Euler V2 UI" issue. Combines, in a single script, the checks previously
 * spread across:
 *
 *   - scripts/audit-axusd-evk-vault.js         (EVK eVault audit)
 *   - scripts/audit-axusd-euler-earn-vault.js  (Euler Earn wrapper audit)
 *   - scripts/verify-axusd-peg-adapter.js      (AXUSD/USD adapter conformance)
 *   - scripts/verify-usdc-usd-chainlink-adapter.js  (USDC/USD adapter conformance)
 *
 * What it does (no transactions, no private key required):
 *
 *   [1] Auto-detects vault flavour:
 *         - EVK eVault   → has governorAdmin / hookConfig / oracle / unitOfAccount
 *         - Euler Earn   → ERC4626 wrapper, no EVK fields, lives in EulerEarnFactory
 *         - Unknown      → not produced by either Euler factory
 *   [2] Reads oracleAdapterRegistry on-chain for both AXUSD/USD and USDC/USD
 *       adapters and reports isValid + addedAt timestamps.
 *   [3] Reads both perspectives (Ungoverned 0x and Nzx) and reports
 *       isVerified for the vault.
 *   [4] Prints a single "verdict" with the next concrete action.
 *
 * Usage:
 *   node scripts/diagnose-axusd-vault-unknown.js
 *
 * Optional env:
 *   VAULT=0x...               Override target vault (defaults: canonical
 *                             from .local/canonical-deploy-state.json if
 *                             present, else the live Earn wrapper).
 *   ALCHEMY_API_KEY=...       Use Alchemy RPC (recommended).
 *   ARBITRUM_RPC_URL=...      Fallback RPC.
 *   EULER_INTERFACES_REF=...  Branch/tag of euler-xyz/euler-interfaces
 *                             (default: master).
 *   JSON=1                    Emit machine-readable JSON to stdout instead
 *                             of the human report.
 *
 * Exit codes:
 *   0  vault is verified by at least one perspective
 *   1  vault is NOT verified — report explains why
 *   2  unrecoverable error (RPC, missing periphery, etc.)
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Static addresses (Arbitrum One) ──────────────────────────────────────────
const ADDR = {
  axusd:           '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7',
  usdc:            '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  usdPseudo:       '0x0000000000000000000000000000000000000348',
  evkFactory:      '0x78Df1CF5bf06a7f27f2ACc580B934238C1b80D50',
  evkImpl:         '0x832fF4011A3164ea76ceA06A313EE0B6CD72ba96',
  legacyEvkVault:  '0xacdA87801f6409bB5157BA78aF1BD9631d6609B2',
  earnVault:       '0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B',
  axusdAdapter:    '0x1862D3c85382c4f4b81a9a9e0d31b289963D70d6',
  usdcAdapter:     '0x49EBE245b8fAC6f9cF70c2Ca415e0749fB602E61',
  registry:        '0x3942A72f87Db5Ad9C22d8826FDe15E23b81b1cBf',
  registryOwner:   '0xb3dCA151d92c6e40450e67098444DcF60d99Bc3d',
};

const REF = process.env.EULER_INTERFACES_REF || 'master';
const PERIPHERY_URL = `https://raw.githubusercontent.com/euler-xyz/euler-interfaces/${REF}/addresses/42161/PeripheryAddresses.json`;

// Pre-computed governance calldata blobs (selector 0xa693686f =
// keccak256("add(address,address,address)")[:4]). Mirrors
// documents/euler-adapter-submission-package/03-registry-pr-payload.md and
// documents/euler-usdc-adapter-submission-package/03-registry-pr-payload.md.
const REGISTER_CALLDATA = {
  axusd: '0xa693686f0000000000000000000000001862d3c85382c4f4b81a9a9e0d31b289963d70d6000000000000000000000000d6110f59a978ada6ef5c0e9d6baa04455d46ade70000000000000000000000000000000000000000000000000000000000000348',
  usdc:  '0xa693686f00000000000000000000000049ebe245b8fac6f9cf70c2ca415e0749fb602e61000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e58310000000000000000000000000000000000000000000000000000000000000348',
};

// ── ABIs ─────────────────────────────────────────────────────────────────────
const EVK_ABI = [
  'function asset() view returns (address)',
  'function oracle() view returns (address)',
  'function unitOfAccount() view returns (address)',
  'function governorAdmin() view returns (address)',
  'function hookConfig() view returns (address, uint32)',
];
const EARN_ABI = [
  'function asset() view returns (address)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalAssets() view returns (uint256)',
  'function curator() view returns (address)',
  'function owner() view returns (address)',
];
const FACTORY_ABI = [
  'function isProxy(address) view returns (bool)',
  'function getProxyConfig(address) view returns (tuple(bool upgradeable, address implementation, bytes trailingData))',
];
const PERSP_ABI = [
  'function isVerified(address) view returns (bool)',
  'function name() view returns (string)',
  'function isRecognizedUnitOfAccount(address) view returns (bool)',
];
const REGISTRY_ABI = [
  'function isValid(address element, uint256 snapshotTime) view returns (bool)',
  'function entries(address) view returns (uint128 addedAt, uint128 revokedAt)',
];
const ADAPTER_ABI = [
  'function name() view returns (string)',
  'function adapterType() view returns (string)',
  'function getQuote(uint256 inAmount, address base, address quote) view returns (uint256)',
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'axiom-diagnose/1.0' } }, (res) => {
      if ([301, 302].includes(res.statusCode)) return resolve(fetchJson(res.headers.location));
      if (res.statusCode !== 200) return reject(new Error(`${url} -> ${res.statusCode}`));
      let buf = ''; res.on('data', c => buf += c);
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

function defaultVault() {
  try {
    const p = path.join(__dirname, '..', '.local', 'canonical-deploy-state.json');
    const s = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (s && s.vault && ethers.isAddress(s.vault)) return s.vault;
  } catch { /* no-op */ }
  return ADDR.earnVault;
}

async function safe(fn, fallback) {
  try { return await fn(); } catch { return fallback; }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const VAULT = (process.env.VAULT || defaultVault()).trim();
  const asJson = !!process.env.JSON;

  const rpc = process.env.ALCHEMY_API_KEY
    ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    : (process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc');
  const provider = new ethers.JsonRpcProvider(rpc);

  if (!asJson) {
    console.log('===============================================================');
    console.log(' Axiom diagnostic: AXUSD vault Unknown-labels root cause');
    console.log('===============================================================');
    console.log(' Network         :  Arbitrum One (42161)');
    console.log(' RPC             : ', rpc.replace(/\/v2\/[^/]+/, '/v2/***'));
    console.log(' Vault           : ', VAULT);
    console.log(' Registry        : ', ADDR.registry);
    console.log(' Registry owner  : ', ADDR.registryOwner, '(Euler governance multisig)');
  }

  // Load periphery
  let periphery;
  try { periphery = await fetchJson(PERIPHERY_URL); }
  catch (e) {
    console.error('FATAL: could not fetch euler-interfaces periphery:', e.message);
    process.exit(2);
  }
  const PERSP_0X  = periphery.eulerUngoverned0xPerspective;
  const PERSP_NZX = periphery.eulerUngovernedNzxPerspective;
  const EARN_FACTORY = periphery.eulerEarnFactory || periphery.eulerEarnFactoryV1 || null;
  if (!PERSP_0X || !PERSP_NZX) {
    console.error('FATAL: periphery missing perspective addresses');
    process.exit(2);
  }

  // ── Step 1: vault flavour detection ─────────────────────────────────────
  const code = await provider.getCode(VAULT);
  if (!code || code === '0x') {
    console.error(`FATAL: no contract bytecode at ${VAULT}`);
    process.exit(2);
  }

  const evkFactory = new ethers.Contract(ADDR.evkFactory, FACTORY_ABI, provider);
  const isEvk = await safe(() => evkFactory.isProxy(VAULT), false);

  let isEarn = false;
  if (!isEvk && EARN_FACTORY) {
    const earnFac = new ethers.Contract(EARN_FACTORY, FACTORY_ABI, provider);
    isEarn = await safe(() => earnFac.isProxy(VAULT), false);
  }
  // Fallback: detect Earn by ERC4626 surface (asset() + curator()) when the
  // periphery JSON does not expose a usable Earn factory key (the field name
  // has churned across euler-interfaces revisions).
  if (!isEvk && !isEarn) {
    const probe = new ethers.Contract(VAULT, EARN_ABI, provider);
    const probedAsset   = await safe(() => probe.asset(),   null);
    const probedCurator = await safe(() => probe.curator(), null);
    if (probedAsset && probedCurator) isEarn = true;
  }

  const flavour = isEvk ? 'EVK eVault' : (isEarn ? 'Euler Earn (ERC4626 wrapper)' : 'Unknown');

  // Vault metadata (best-effort, depending on flavour)
  let vaultMeta = { flavour, asset: null, oracle: null, unitOfAccount: null,
                    governorAdmin: null, name: null, symbol: null, totalAssets: null,
                    curator: null, owner: null, evkImplOk: null };

  if (isEvk) {
    const v = new ethers.Contract(VAULT, EVK_ABI, provider);
    vaultMeta.asset         = await safe(() => v.asset(),         null);
    vaultMeta.oracle        = await safe(() => v.oracle(),        null);
    vaultMeta.unitOfAccount = await safe(() => v.unitOfAccount(), null);
    vaultMeta.governorAdmin = await safe(() => v.governorAdmin(), null);
    const cfg = await safe(() => evkFactory.getProxyConfig(VAULT), null);
    if (cfg) vaultMeta.evkImplOk = cfg.implementation.toLowerCase() === ADDR.evkImpl.toLowerCase();
  } else if (isEarn) {
    const v = new ethers.Contract(VAULT, EARN_ABI, provider);
    vaultMeta.asset       = await safe(() => v.asset(),       null);
    vaultMeta.name        = await safe(() => v.name(),        null);
    vaultMeta.symbol      = await safe(() => v.symbol(),      null);
    vaultMeta.totalAssets = (await safe(() => v.totalAssets(), 0n)).toString();
    vaultMeta.curator     = await safe(() => v.curator(),     null);
    vaultMeta.owner       = await safe(() => v.owner(),       null);
  }

  // ── Step 2: registry status for both adapters ─────────────────────────
  const reg = new ethers.Contract(ADDR.registry, REGISTRY_ABI, provider);
  const now = Math.floor(Date.now() / 1000);
  async function regStatus(addr) {
    const isValid = await safe(() => reg.isValid(addr, now), false);
    const entry   = await safe(() => reg.entries(addr), null);
    return {
      address: addr,
      isValid,
      addedAt:   entry ? Number(entry.addedAt   ?? entry[0]) : 0,
      revokedAt: entry ? Number(entry.revokedAt ?? entry[1]) : 0,
    };
  }
  const axusdReg = await regStatus(ADDR.axusdAdapter);
  const usdcReg  = await regStatus(ADDR.usdcAdapter);

  // Adapter functional probe (unrelated to registry — proves they price)
  const axusdA = new ethers.Contract(ADDR.axusdAdapter, ADAPTER_ABI, provider);
  const usdcA  = new ethers.Contract(ADDR.usdcAdapter,  ADAPTER_ABI, provider);
  const axusdQuote = (await safe(
    () => axusdA.getQuote(ethers.parseUnits('1', 18), ADDR.axusd, ADDR.usdPseudo),
    null)) ;
  const usdcQuote = (await safe(
    () => usdcA.getQuote(ethers.parseUnits('1', 6), ADDR.usdc, ADDR.usdPseudo),
    null));

  // ── Step 3: perspective verification status ────────────────────────────
  const persp0x  = new ethers.Contract(PERSP_0X,  PERSP_ABI, provider);
  const perspNzx = new ethers.Contract(PERSP_NZX, PERSP_ABI, provider);
  const ver0x    = await safe(() => persp0x.isVerified(VAULT),  false);
  const verNzx   = await safe(() => perspNzx.isVerified(VAULT), false);
  const uoaOk    = isEvk && vaultMeta.unitOfAccount
    ? await safe(() => persp0x.isRecognizedUnitOfAccount(vaultMeta.unitOfAccount), false)
    : null;

  const verified = ver0x || verNzx;

  // ── Step 4: verdict ────────────────────────────────────────────────────
  const blockers = [];
  if (!axusdReg.isValid) blockers.push('AXUSD/USD adapter not in oracleAdapterRegistry');
  if (!usdcReg.isValid)  blockers.push('USDC/USD adapter not in oracleAdapterRegistry');
  if (flavour === 'Euler Earn (ERC4626 wrapper)')
    blockers.push('Vault is an Euler Earn wrapper, not an EVK eVault — perspectives only verify EVK vaults; Earn wrappers cannot pass perspectiveVerify regardless of adapters');
  if (flavour === 'Unknown')
    blockers.push('Vault is not produced by any known Euler factory — perspectives will reject');
  if (isEvk && uoaOk === false)
    blockers.push(`Vault unitOfAccount (${vaultMeta.unitOfAccount}) is not a recognized UoA — must be USD pseudo (${ADDR.usdPseudo}) or WETH`);
  if (isEvk && vaultMeta.evkImplOk === false)
    blockers.push('Vault implementation does not match canonical EVK_IMPL — perspectives reject');

  // ── JSON output (machine-readable) ─────────────────────────────────────
  if (asJson) {
    process.stdout.write(JSON.stringify({
      vault: VAULT,
      flavour,
      meta: vaultMeta,
      registry: { axusd: axusdReg, usdc: usdcReg, owner: ADDR.registryOwner, address: ADDR.registry },
      adapterProbe: {
        axusdToUsd: axusdQuote === null ? 'revert' : axusdQuote.toString(),
        usdcToUsd:  usdcQuote  === null ? 'revert' : usdcQuote.toString(),
      },
      perspective: { isVerified0x: ver0x, isVerifiedNzx: verNzx, recognizedUoA: uoaOk,
                     address0x: PERSP_0X, addressNzx: PERSP_NZX },
      verified,
      blockers,
      registerCalldata: REGISTER_CALLDATA,
    }, null, 2) + '\n');
    process.exit(verified ? 0 : 1);
  }

  // ── Human report ───────────────────────────────────────────────────────
  console.log('');
  console.log('[1] Vault flavour');
  console.log('    flavour          :', flavour, isEvk || isEarn ? '' : '(neither EVK nor Earn factory recognizes this address)');
  if (isEvk) {
    console.log('    asset            :', vaultMeta.asset, vaultMeta.asset && vaultMeta.asset.toLowerCase() === ADDR.axusd.toLowerCase() ? '(AXUSD ✓)' : '(NOT AXUSD)');
    console.log('    oracle (router)  :', vaultMeta.oracle);
    console.log('    unitOfAccount    :', vaultMeta.unitOfAccount, uoaOk === true ? '(recognized ✓)' : uoaOk === false ? '(NOT recognized ✗)' : '');
    console.log('    governorAdmin    :', vaultMeta.governorAdmin);
    console.log('    EVK impl matches :', vaultMeta.evkImplOk);
  } else if (isEarn) {
    console.log('    asset            :', vaultMeta.asset);
    console.log('    name / symbol    :', vaultMeta.name, '/', vaultMeta.symbol);
    console.log('    totalAssets      :', vaultMeta.totalAssets);
    console.log('    curator / owner  :', vaultMeta.curator, '/', vaultMeta.owner);
    console.log('    NOTE: Earn wrappers expose ERC4626 only — they do NOT have governorAdmin,');
    console.log('          oracle, unitOfAccount, or hookConfig, and are NOT verified by any');
    console.log('          EVK perspective. The Euler V2 UI shows Risk Manager = curator and');
    console.log('          Vault Type = "Euler Earn" only when the Earn wrapper is itself');
    console.log('          enrolled in the Earn perspective and its underlying strategy vaults');
    console.log('          are perspective-verified EVK vaults. Until the underlying eVault is');
    console.log('          verified (which requires the two registry registrations below), the');
    console.log('          Earn wrapper will display Unknown labels too.');
  }

  console.log('');
  console.log('[2] Oracle-adapter registry status');
  for (const [label, r] of [['AXUSD/USD', axusdReg], ['USDC/USD ', usdcReg]]) {
    const flag = r.isValid ? 'REGISTERED ✓' : 'NOT REGISTERED ✗';
    console.log(`    ${label}  ${r.address}  ${flag}`);
    console.log(`              addedAt=${r.addedAt}  revokedAt=${r.revokedAt}`);
  }
  console.log('    AXUSD->USD probe :', axusdQuote === null ? 'revert' : axusdQuote.toString(), '(expected 100000000)');
  console.log('    USDC ->USD probe :', usdcQuote  === null ? 'revert' : usdcQuote.toString(),  '(expected ~100000000)');

  console.log('');
  console.log('[3] Perspective verification');
  console.log('    Ungoverned 0x   :', PERSP_0X, ver0x ? 'isVerified=true ✓' : 'isVerified=false');
  console.log('    Ungoverned Nzx  :', PERSP_NZX, verNzx ? 'isVerified=true ✓' : 'isVerified=false');

  console.log('');
  console.log('[4] Verdict');
  if (verified) {
    console.log('    Vault IS perspective-verified. The Euler V2 UI should show a recognized');
    console.log('    vault type and risk-manager label. If labels still read "Unknown" in the');
    console.log('    UI, hard-refresh and check that the UI is not pinned to a stale snapshot.');
    process.exit(0);
  }
  console.log('    Vault is NOT perspective-verified. Blocking conditions:');
  for (const b of blockers) console.log('      - ' + b);
  console.log('');
  console.log('    Concrete next actions');
  if (!axusdReg.isValid || !usdcReg.isValid) {
    console.log('      a) Euler governance (multisig owner of oracleAdapterRegistry) must');
    console.log(`         execute the following call(s) on ${ADDR.registry}:`);
    if (!axusdReg.isValid) {
      console.log('');
      console.log('         AXUSD/USD adapter:');
      console.log('           to:    ' + ADDR.registry);
      console.log('           value: 0');
      console.log('           data:  ' + REGISTER_CALLDATA.axusd);
    }
    if (!usdcReg.isValid) {
      console.log('');
      console.log('         USDC/USD  adapter:');
      console.log('           to:    ' + ADDR.registry);
      console.log('           value: 0');
      console.log('           data:  ' + REGISTER_CALLDATA.usdc);
    }
    console.log('');
    console.log('         Submission packages with the full proposal text and audit checklist:');
    console.log('           documents/euler-adapter-submission-package/');
    console.log('           documents/euler-usdc-adapter-submission-package/');
  }
  if (flavour !== 'EVK eVault') {
    console.log('');
    console.log('      b) Once the two adapters are registered, deploy the canonical EVK');
    console.log('         vault — the current target is not an EVK vault and cannot be');
    console.log('         perspective-verified on its own:');
    console.log('           SKIP_RENOUNCE=1 SKIP_PERSPECTIVE_VERIFY=1 \\');
    console.log('             AXUSD_USD_ADAPTER=' + ADDR.axusdAdapter + ' \\');
    console.log('             USDC_USD_ADAPTER='  + ADDR.usdcAdapter  + ' \\');
    console.log('             node scripts/deploy-axusd-evk-vault-canonical.js');
    console.log('         (drop SKIP_* once both registry rows above are REGISTERED ✓)');
  } else if (isEvk && !verified) {
    console.log('');
    console.log('      b) After both adapters are REGISTERED, run:');
    console.log('           node scripts/fix-axusd-evk-vault-metadata.js');
    console.log('         which will idempotently call perspectiveVerify on this vault.');
  }
  console.log('');
  console.log('    Re-run this diagnostic after each step to confirm progress.');
  process.exit(1);
}

main().catch(e => { console.error('FATAL:', e); process.exit(2); });
