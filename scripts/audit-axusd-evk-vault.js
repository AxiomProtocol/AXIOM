/**
 * Read-only on-chain audit of the AXUSD EVK vault on Arbitrum One.
 *
 * Reports:
 *   - Factory recognition (isProxy + implementation match)
 *   - Asset / Oracle / UnitOfAccount (immutable trailing data)
 *   - Governor admin (with euler-interfaces label resolution)
 *   - Creator / FeeReceiver / IRM / Caps (decoded) / LTV list / ConfigFlags
 *   - hookConfig + maxDeposit (deposit-block detection)
 *   - Verification status against canonical perspectives:
 *       governedPerspective, escrowedCollateralPerspective,
 *       eulerUngoverned0xPerspective, eulerUngovernedNzxPerspective
 *
 * Pulls perspective + label addresses LIVE from euler-xyz/euler-interfaces.
 * Pure read-only — no transactions sent.
 *
 * Run:
 *   node scripts/audit-axusd-evk-vault.js
 *   VAULT=0x... node scripts/audit-axusd-evk-vault.js
 */

const { ethers } = require('ethers');
const https = require('https');

const VAULT = (process.env.VAULT || '0xacdA87801f6409bB5157BA78aF1BD9631d6609B2').trim();
const EVK_FACTORY = '0x78Df1CF5bf06a7f27f2ACc580B934238C1b80D50';

const RPC = process.env.ALCHEMY_API_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : (process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc');

// Pinned commit so audit is reproducible. Override with EULER_INTERFACES_REF=<sha|branch>.
const REF = process.env.EULER_INTERFACES_REF || 'master';
const PERIPHERY_URL = `https://raw.githubusercontent.com/euler-xyz/euler-interfaces/${REF}/addresses/42161/PeripheryAddresses.json`;
const LABELS_URL    = `https://raw.githubusercontent.com/euler-xyz/euler-interfaces/${REF}/addresses/42161/labels.json`;

const FACTORY_ABI = [
  'function isProxy(address) view returns (bool)',
  'function implementation() view returns (address)',
  'function getProxyConfig(address) view returns (tuple(bool upgradeable, address implementation, bytes trailingData))',
];

const VAULT_ABI = [
  'function asset() view returns (address)',
  'function oracle() view returns (address)',
  'function unitOfAccount() view returns (address)',
  'function governorAdmin() view returns (address)',
  'function creator() view returns (address)',
  'function feeReceiver() view returns (address)',
  'function interestRateModel() view returns (address)',
  'function caps() view returns (uint16 supplyCap, uint16 borrowCap)',
  'function hookConfig() view returns (address hookTarget, uint32 hookedOps)',
  'function configFlags() view returns (uint32)',
  'function LTVList() view returns (address[])',
  'function LTVBorrow(address collateral) view returns (uint16)',
  'function LTVLiquidation(address collateral) view returns (uint16)',
  'function maxDeposit(address) view returns (uint256)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
];

const PERSPECTIVE_ABI = [
  'function isVerified(address) view returns (bool)',
  'function name() view returns (string)',
  'function verifiedArray() view returns (address[])',
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

// EVK AmountCap uint16 → decimal amount (1e18 token units → human).
// decoded = (mantissa * 10^exponent) / 1e9
function decodeCap(uint16Cap, decimals) {
  if (uint16Cap === 0 || uint16Cap === 0n) return { raw: 0n, human: '0 (disabled = no cap)' };
  const v = BigInt(uint16Cap);
  const mantissa = v >> 6n;
  const exponent = v & 0x3fn;
  const raw = (mantissa * (10n ** exponent)) / 1_000_000_000n;
  const human = ethers.formatUnits(raw, decimals);
  return { raw, human };
}

function pad(label, w = 26) {
  return (label + ' '.repeat(w)).slice(0, w);
}

function fmtAddr(a, labels) {
  if (!a) return 'null';
  const lc = a.toLowerCase();
  if (lc === ethers.ZeroAddress) return `${a}  (ZERO)`;
  const label = labels && (labels[a] || labels[lc] || labels[ethers.getAddress(a)]);
  return label ? `${a}  (${typeof label === 'string' ? label : label.name || JSON.stringify(label)})` : a;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' AXUSD EVK Vault Audit — Arbitrum One');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' Vault:           ', VAULT);
  console.log(' Factory:         ', EVK_FACTORY);
  console.log(' RPC:             ', RPC.replace(/\/v2\/.*/, '/v2/<key>'));
  console.log(' Perspectives ref:', REF);
  console.log('───────────────────────────────────────────────────────────────');

  const provider = new ethers.JsonRpcProvider(RPC);

  // Periphery + labels (live from GitHub)
  let periphery = {}, labels = {};
  try { periphery = await fetchJson(PERIPHERY_URL); }
  catch (e) { console.warn(' [warn] failed to fetch PeripheryAddresses:', e.message); }
  try { labels = await fetchJson(LABELS_URL); }
  catch (e) { console.warn(' [warn] failed to fetch labels.json:', e.message); }

  const persp = periphery.perspectives || periphery;
  const PERSP = {
    governedPerspective:             persp.governedPerspective,
    escrowedCollateralPerspective:   persp.escrowedCollateralPerspective,
    eulerUngoverned0xPerspective:    persp.eulerUngoverned0xPerspective,
    eulerUngovernedNzxPerspective:   persp.eulerUngovernedNzxPerspective,
  };
  console.log('\n[Perspectives discovered]');
  for (const [k, v] of Object.entries(PERSP)) console.log(' ', pad(k, 34), v || '(missing)');

  // Vault + factory readbacks
  const factory = new ethers.Contract(EVK_FACTORY, FACTORY_ABI, provider);
  const vault   = new ethers.Contract(VAULT,       VAULT_ABI,   provider);

  const [
    code, isProxy, factoryDefaultImpl, proxyCfg,
  ] = await Promise.all([
    provider.getCode(VAULT),
    factory.isProxy(VAULT).catch(() => false),
    factory.implementation().catch(() => ethers.ZeroAddress),
    factory.getProxyConfig(VAULT).catch(() => null),
  ]);

  console.log('\n[Factory recognition]');
  console.log(' ', pad('hasCode'),               code && code !== '0x' ? 'yes' : 'no');
  console.log(' ', pad('factory.isProxy'),        isProxy);
  console.log(' ', pad('factory.implementation'), factoryDefaultImpl);
  let isUpgradeable = null;
  if (proxyCfg) {
    isUpgradeable = proxyCfg.upgradeable ?? proxyCfg[0];
    const proxyImpl = (proxyCfg.implementation || proxyCfg[1]).toLowerCase();
    const trailing  = proxyCfg.trailingData || proxyCfg[2];
    const facImpl   = factoryDefaultImpl.toLowerCase();
    console.log(' ', pad('proxy.upgradeable'),     isUpgradeable);
    console.log(' ', pad('proxy.implementation'),  proxyImpl);
    console.log(' ', pad('impl matches factory?'), proxyImpl === facImpl ? 'YES ✓' : `NO ✗ (redeploy may be required)`);
    console.log(' ', pad('trailingData length'),   (trailing.length - 2) / 2, 'bytes');
  }

  const [
    name, symbol, decimals, asset, oracle, uoa, governor,
    creator, feeReceiver, irm, caps, hookCfg, configFlags, ltvList, maxDep0,
  ] = await Promise.all([
    vault.name().catch(() => '?'),
    vault.symbol().catch(() => '?'),
    vault.decimals().catch(() => 18),
    vault.asset().catch(() => ethers.ZeroAddress),
    vault.oracle().catch(() => ethers.ZeroAddress),
    vault.unitOfAccount().catch(() => ethers.ZeroAddress),
    vault.governorAdmin().catch(() => ethers.ZeroAddress),
    vault.creator().catch(() => ethers.ZeroAddress),
    vault.feeReceiver().catch(() => ethers.ZeroAddress),
    vault.interestRateModel().catch(() => ethers.ZeroAddress),
    vault.caps().catch(() => [0, 0]),
    vault.hookConfig().catch(() => [ethers.ZeroAddress, 0]),
    vault.configFlags().catch(() => 0),
    vault.LTVList().catch(() => []),
    vault.maxDeposit(ethers.ZeroAddress).catch(() => 0n),
  ]);

  const dec = Number(decimals);
  const supplyCap = Number(caps[0] || caps.supplyCap || 0);
  const borrowCap = Number(caps[1] || caps.borrowCap || 0);
  const supDec = decodeCap(supplyCap, dec);
  const borDec = decodeCap(borrowCap, dec);
  const hookTarget = hookCfg[0] || hookCfg.hookTarget;
  const hookedOps  = Number(hookCfg[1] || hookCfg.hookedOps || 0);

  console.log('\n[Vault identity]');
  console.log(' ', pad('name'),     name);
  console.log(' ', pad('symbol'),   symbol);
  console.log(' ', pad('decimals'), dec);

  console.log('\n[Immutable params (trailingData)]');
  console.log(' ', pad('asset'),         fmtAddr(asset, labels));
  console.log(' ', pad('oracle'),        fmtAddr(oracle, labels));
  console.log(' ', pad('unitOfAccount'), fmtAddr(uoa, labels));

  console.log('\n[Governance]');
  console.log(' ', pad('governorAdmin'), fmtAddr(governor, labels));
  console.log(' ', pad('creator'),       fmtAddr(creator, labels));
  console.log(' ', pad('feeReceiver'),   fmtAddr(feeReceiver, labels));

  console.log('\n[Risk params]');
  console.log(' ', pad('interestRateModel'), fmtAddr(irm, labels));
  console.log(' ', pad('configFlags'),       '0x' + Number(configFlags).toString(16));
  console.log(' ', pad('caps.supply (uint16)'), supplyCap, '→', supDec.human, symbol);
  console.log(' ', pad('caps.borrow (uint16)'), borrowCap, '→', borDec.human, symbol);

  console.log('\n[LTV list]');
  if (ltvList.length === 0) {
    console.log('  (empty — no collaterals registered)');
  } else {
    for (const c of ltvList) {
      const [bLtv, lLtv, ercSym] = await Promise.all([
        vault.LTVBorrow(c).catch(() => 0),
        vault.LTVLiquidation(c).catch(() => 0),
        new ethers.Contract(c, ERC20_META_ABI, provider).symbol().catch(() => '?'),
      ]);
      console.log(`   ${c} (${ercSym})  borrow=${(Number(bLtv)/100).toFixed(2)}%  liq=${(Number(lLtv)/100).toFixed(2)}%`);
    }
  }

  console.log('\n[Hook config]');
  console.log(' ', pad('hookTarget'), hookTarget);
  console.log(' ', pad('hookedOps'),  hookedOps, hookedOps === 0 ? '(none)' : '(some ops gated)');
  console.log(' ', pad('maxDeposit(0x0)'), maxDep0.toString(),
    maxDep0 === 0n ? '⚠ deposits BLOCKED' : '✓ deposits open');

  // Perspective verification + dry-call to surface failing checks
  console.log('\n[Perspective verification]');
  const perspResults = {};
  const perspErrors = {};
  const PERSP_DRY_ABI = [
    ...PERSPECTIVE_ABI,
    'error PerspectiveError(address perspective, address vault, uint256 codes)',
  ];
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
      // Use raw eth_call (failEarly=true) so we always get PerspectiveError data.
      // Accumulating errors with failEarly=false reverts with no data on Arbitrum.
      const iface = new ethers.Interface(['function perspectiveVerify(address,bool)']);
      const data = iface.encodeFunctionData('perspectiveVerify', [VAULT, true]);
      try {
        const res = await provider.call({ to: addr, data });
        why = ' (no errors — submit tx to register)';
      } catch (e) {
        const errData = e?.data || e?.info?.error?.data || e?.error?.data;
        if (typeof errData === 'string' && errData.length >= 138) {
          const codes = BigInt('0x' + errData.slice(-64));
          perspErrors[key] = codes;
          why = '  failing checks: ' + decodeErrCodes(codes);
        } else {
          why = '  (revert with no data: ' + (e.shortMessage || e.message || '').slice(0, 80) + ')';
        }
      }
    }
    console.log(' ', pad(key, 34), verified ? 'VERIFIED ✓' : 'not verified', pname ? `[${pname}]` : '');
    if (why) console.log('     ', why);
  }

  const anyVerified = Object.values(perspResults).some((v) => v === true);
  const govLc = (governor || '').toLowerCase();
  const govLabel = labels[governor] || labels[govLc] || labels[ethers.getAddress(governor)];
  const govIsZero = govLc === ethers.ZeroAddress;
  const govIsLabeled = !!govLabel;

  // Verdict
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(' VERDICT');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' Vault type recognized:        ', anyVerified ? 'YES ✓' : 'NO ✗ (UI shows "Unknown")');
  console.log(' Risk manager recognized:      ', govIsZero ? 'NONE (renounced — UI shows "None")'
    : govIsLabeled ? `LABELED (${typeof govLabel === 'string' ? govLabel : govLabel.name || 'labeled'})`
    : 'NO ✗ (UI shows "Unknown" — EOA / unlabeled multisig)');
  console.log(' Hooks blocking deposits:      ', maxDep0 === 0n && (hookedOps !== 0 || hookTarget === ethers.ZeroAddress && hookedOps !== 0) ? 'YES ✗' : 'NO ✓');

  // Determine if any blocker requires REDEPLOY (immutable params at proxy creation)
  const hasUpgradabilityFailure = Object.values(perspErrors).some((c) => (c & 4n) !== 0n);
  const hasOracleAdapterFailure = Object.values(perspErrors).some((c) => (c & 512n) !== 0n);
  const hasIrmFailure           = Object.values(perspErrors).some((c) => (c & 32768n) !== 0n);
  const hasUoaFailure           = Object.values(perspErrors).some((c) => (c & 1024n) !== 0n);
  const hasLtvRecognitionFailure = Object.values(perspErrors).some((c) => (c & 1073741824n) !== 0n);
  const redeployRequired = hasUpgradabilityFailure || isUpgradeable === false;

  console.log('\n Remediation path:');
  if (anyVerified) {
    console.log('   None — vault already verified by at least one perspective.');
  } else if (redeployRequired) {
    console.log('   ⚠  REDEPLOY REQUIRED — the deployed proxy is non-upgradeable, but the canonical');
    console.log('       Ungoverned/Governed perspectives REQUIRE upgradeable=true.  upgradeable is');
    console.log('       baked into the proxy at createProxy time and cannot be changed.');
    console.log('   Other failures detected (also blockers, fixed by canonical redeploy):');
    if (hasOracleAdapterFailure)  console.log('     • Oracle adapter is not in the official adapterRegistry / EulerRouter');
    if (hasIrmFailure)            console.log('     • IRM is not deployed via EulerKinkIRMFactory and not in irmRegistry');
    if (hasUoaFailure)            console.log('     • unitOfAccount is not in the perspective\'s recognized list');
    if (hasLtvRecognitionFailure) console.log('     • USDC collateral is not a vault recognized by any collateral perspective');
    console.log('');
    console.log('   Use scripts/deploy-axusd-evk-vault-canonical.js to deploy a perspective-compatible');
    console.log('   replacement vault.  DO NOT renounce governance on the existing vault — it would');
    console.log('   brick configuration without producing a recognized type.');
  } else {
    if (hookedOps !== 0) console.log('   1. Call setHookConfig(0x0, 0)  → unblock deposits');
    if (!govIsZero && !govIsLabeled) {
      console.log('   2. Decide governor target:');
      console.log('       (a) renounce → setGovernorAdmin(0x0) [for EulerUngoverned0xPerspective]');
      console.log('       (b) transfer to labeled multisig [keeps "Risk manager" name]');
    }
    console.log('   3. Call perspectiveVerify(vault, true) on EulerUngoverned0xPerspective');
    console.log('       — fall back to EulerUngovernedNzxPerspective if 0x rejects.');
  }
  console.log('═══════════════════════════════════════════════════════════════');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
