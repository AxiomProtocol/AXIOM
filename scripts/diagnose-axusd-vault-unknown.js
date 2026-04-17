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
 *   [2] For an EVK vault, derives the asset and configured collateral, then
 *       calls the vault's own EulerRouter via `resolveOracle(0, base, UoA)`
 *       for both legs (asset->UoA and collateral->UoA). This proves what
 *       the router actually resolves — independent of which adapter
 *       addresses we *think* should be wired up.
 *   [3] Reads oracleAdapterRegistry on-chain for both AXUSD/USD and USDC/USD
 *       adapters and reports isValid + addedAt.
 *   [4] For an EVK vault, runs the full Ungoverned-0x precondition set
 *       (governorAdmin == 0, hookTarget == 0, hookedOps == 0, EVK impl
 *       matches canonical, UoA recognized).
 *   [5] For an Earn vault, checks `eulerEarnFactoryPerspective.isVerified`
 *       and probes whether `owner` and `curator` are Gnosis Safes (so the
 *       UI can label them as such).
 *   [6] Reads both EVK perspectives (Ungoverned 0x and Nzx) and the Earn
 *       perspective and reports isVerified for the vault.
 *   [7] Prints a normalized terminal status:
 *         OK_VERIFIED                — vault is verified; ask UI to refresh
 *         BLOCKED_ON_EULER_GOVERNANCE — at least one adapter not in registry
 *         BLOCKED_ON_AXIOM           — adapters fine but vault config is wrong
 *         CODE_FAULT                 — the diagnostic itself could not run
 *
 * Usage:
 *   node scripts/diagnose-axusd-vault-unknown.js
 *
 * Optional env:
 *   VAULT=0x...               Override target vault. Default resolves in
 *                             this order: explicit env -> canonical EVK
 *                             from src/config/activeContracts.generated.ts
 *                             (EVK_OPEN_MARKET_VAULT_ADDRESS) ->
 *                             .local/canonical-deploy-state.json.vault ->
 *                             EULER_EARN_VAULT_ADDRESS.
 *   ALCHEMY_API_KEY=...       Use Alchemy RPC (recommended).
 *   ARBITRUM_RPC_URL=...      Fallback RPC.
 *   EULER_INTERFACES_REF=...  Branch/tag of euler-xyz/euler-interfaces
 *                             (default: master).
 *   JSON=1                    Emit machine-readable JSON to stdout instead
 *                             of the human report.
 *   NO_COLOR=1                Disable ANSI colour codes in human output.
 *
 * Exit codes:
 *   0  vault is verified by at least one perspective
 *   1  vault is NOT verified (report explains who is blocking)
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
  'function LTVList() view returns (address[])',
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
const ROUTER_ABI = [
  'function resolveOracle(uint256 inAmount, address base, address quote) view returns (uint256, address, address, address)',
  'function getConfiguredOracle(address base, address quote) view returns (address)',
  'function governor() view returns (address)',
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
const SAFE_ABI = [
  'function getThreshold() view returns (uint256)',
  'function getOwners() view returns (address[])',
  'function VERSION() view returns (string)',
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

function readActiveContractsAddr(constName) {
  try {
    const p = path.join(__dirname, '..', 'src', 'config', 'activeContracts.generated.ts');
    const src = fs.readFileSync(p, 'utf8');
    const re = new RegExp(`${constName}\\s*=\\s*['"]([0-9a-fA-FxX]+)['"]`);
    const m = src.match(re);
    if (m && ethers.isAddress(m[1])) return ethers.getAddress(m[1]);
  } catch { /* no-op */ }
  return null;
}

function defaultVault() {
  // 1. Canonical EVK if it has been generated/recorded.
  const fromActive = readActiveContractsAddr('EVK_OPEN_MARKET_VAULT_ADDRESS');
  if (fromActive) return fromActive;
  // 2. State file written by deploy-axusd-evk-vault-canonical.js.
  try {
    const p = path.join(__dirname, '..', '.local', 'canonical-deploy-state.json');
    const s = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (s && s.vault && ethers.isAddress(s.vault)) return ethers.getAddress(s.vault);
  } catch { /* no-op */ }
  // 3. Live Earn wrapper as last resort.
  const fromEarn = readActiveContractsAddr('EULER_EARN_VAULT_ADDRESS');
  return fromEarn || '0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B';
}

async function safe(fn, fallback) {
  try { return await fn(); } catch { return fallback; }
}

// PASS/FAIL recorder with optional ANSI colour
const useColour = !process.env.NO_COLOR && !process.env.JSON && process.stdout.isTTY;
const C = {
  pass: useColour ? '\x1b[32m' : '',
  fail: useColour ? '\x1b[31m' : '',
  warn: useColour ? '\x1b[33m' : '',
  bold: useColour ? '\x1b[1m'  : '',
  reset:useColour ? '\x1b[0m'  : '',
};
function tag(ok) { return ok ? `${C.pass}PASS${C.reset}` : `${C.fail}FAIL${C.reset}`; }
function line(label, ok, detail = '') {
  const flag = ok === null ? `${C.warn}SKIP${C.reset}` : tag(ok);
  console.log(`    [${flag}] ${label}${detail ? ' — ' + detail : ''}`);
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
    console.log(`${C.bold}===============================================================`);
    console.log(' Axiom diagnostic: AXUSD vault Unknown-labels root cause');
    console.log(`===============================================================${C.reset}`);
    console.log(' Network         :  Arbitrum One (42161)');
    console.log(' RPC             : ', rpc.replace(/\/v2\/[^/]+/, '/v2/***'));
    console.log(' Vault           : ', VAULT);
    console.log(' Registry        : ', ADDR.registry);
    console.log(' Registry owner  : ', ADDR.registryOwner, '(Euler governance multisig)');
  }

  let periphery;
  try { periphery = await fetchJson(PERIPHERY_URL); }
  catch (e) {
    console.error('FATAL: could not fetch euler-interfaces periphery:', e.message);
    process.exit(2);
  }
  const PERSP_0X     = periphery.eulerUngoverned0xPerspective;
  const PERSP_NZX    = periphery.eulerUngovernedNzxPerspective;
  const PERSP_EARN   = periphery.eulerEarnFactoryPerspective;
  if (!PERSP_0X || !PERSP_NZX || !PERSP_EARN) {
    console.error('FATAL: periphery missing perspective addresses');
    process.exit(2);
  }

  const code = await provider.getCode(VAULT);
  if (!code || code === '0x') {
    console.error(`FATAL: no contract bytecode at ${VAULT}`);
    process.exit(2);
  }

  // ── Step 1: vault flavour detection ─────────────────────────────────────
  if (!asJson) console.log(`\n${C.bold}[1] Vault flavour detection${C.reset}`);
  const evkFactory = new ethers.Contract(ADDR.evkFactory, FACTORY_ABI, provider);
  const isEvk = await safe(() => evkFactory.isProxy(VAULT), false);

  let isEarn = false;
  if (!isEvk) {
    const probe = new ethers.Contract(VAULT, EARN_ABI, provider);
    const a = await safe(() => probe.asset(),   null);
    const c = await safe(() => probe.curator(), null);
    if (a && c) isEarn = true;
  }
  const flavour = isEvk ? 'EVK eVault' : (isEarn ? 'Euler Earn (ERC4626 wrapper)' : 'Unknown');
  if (!asJson) {
    line(`Recognized as ${flavour}`, isEvk || isEarn,
      isEvk || isEarn ? '' : 'neither EVK factory nor ERC4626/curator surface matched');
  }

  // ── Vault metadata ──────────────────────────────────────────────────────
  let vaultMeta = { flavour, asset: null, oracle: null, unitOfAccount: null,
                    governorAdmin: null, name: null, symbol: null, totalAssets: null,
                    curator: null, owner: null, evkImplOk: null, hookTarget: null,
                    hookedOps: null, ltvList: [] };
  if (isEvk) {
    const v = new ethers.Contract(VAULT, EVK_ABI, provider);
    vaultMeta.asset         = await safe(() => v.asset(),         null);
    vaultMeta.oracle        = await safe(() => v.oracle(),        null);
    vaultMeta.unitOfAccount = await safe(() => v.unitOfAccount(), null);
    vaultMeta.governorAdmin = await safe(() => v.governorAdmin(), null);
    const hc = await safe(() => v.hookConfig(), null);
    if (hc) { vaultMeta.hookTarget = hc[0]; vaultMeta.hookedOps = Number(hc[1]); }
    const cfg = await safe(() => evkFactory.getProxyConfig(VAULT), null);
    if (cfg) vaultMeta.evkImplOk = cfg.implementation.toLowerCase() === ADDR.evkImpl.toLowerCase();
    vaultMeta.ltvList = await safe(() => v.LTVList(), []);
  } else if (isEarn) {
    const v = new ethers.Contract(VAULT, EARN_ABI, provider);
    vaultMeta.asset       = await safe(() => v.asset(),       null);
    vaultMeta.name        = await safe(() => v.name(),        null);
    vaultMeta.symbol      = await safe(() => v.symbol(),      null);
    vaultMeta.totalAssets = (await safe(() => v.totalAssets(), 0n)).toString();
    vaultMeta.curator     = await safe(() => v.curator(),     null);
    vaultMeta.owner       = await safe(() => v.owner(),       null);
  }

  // ── Step 2: EVK router resolveOracle probes (the real source of truth) ─
  let routerProbes = null;
  if (isEvk && vaultMeta.oracle && vaultMeta.unitOfAccount && vaultMeta.asset) {
    if (!asJson) console.log(`\n${C.bold}[2] EulerRouter resolveOracle (vault-derived, not assumed)${C.reset}`);
    const router = new ethers.Contract(vaultMeta.oracle, ROUTER_ABI, provider);
    routerProbes = { asset: null, collaterals: [] };

    const probeOne = async (base, label) => {
      const cfg = await safe(() => router.getConfiguredOracle(base, vaultMeta.unitOfAccount), null);
      const res = await safe(() => router.resolveOracle(0n, base, vaultMeta.unitOfAccount), null);
      const adapter = res ? res[3] : null;
      const ok = !!adapter && adapter !== ethers.ZeroAddress;
      if (!asJson) {
        line(`router.resolveOracle(${label} -> UoA) returns an adapter`, ok,
          ok ? `adapter=${adapter} configured=${cfg}` : `configured=${cfg || 'none'}`);
      }
      return { label, base, configured: cfg, resolved: adapter, ok };
    };

    routerProbes.asset = await probeOne(vaultMeta.asset, 'asset (AXUSD)');
    for (const col of vaultMeta.ltvList) {
      const lab = col.toLowerCase() === ADDR.usdc.toLowerCase() ? 'collateral (USDC)' : `collateral ${col}`;
      routerProbes.collaterals.push(await probeOne(col, lab));
    }
    if (vaultMeta.ltvList.length === 0 && !asJson) {
      line('Vault has no configured collateral (LTVList empty)', false,
        'Ungoverned-0x perspective requires at least one priced collateral');
    }
  } else if (!asJson) {
    console.log(`\n${C.bold}[2] EulerRouter resolveOracle${C.reset}`);
    line('EulerRouter probes', null, 'skipped — only meaningful for EVK eVaults');
  }

  // ── Step 3: registry status for the two known submission adapters ──────
  if (!asJson) console.log(`\n${C.bold}[3] Oracle-adapter registry status (the two submission packages)${C.reset}`);
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
  if (!asJson) {
    line(`AXUSD/USD adapter registered ${ADDR.axusdAdapter}`, axusdReg.isValid, `addedAt=${axusdReg.addedAt} revokedAt=${axusdReg.revokedAt}`);
    line(`USDC/USD  adapter registered ${ADDR.usdcAdapter}`, usdcReg.isValid,  `addedAt=${usdcReg.addedAt} revokedAt=${usdcReg.revokedAt}`);
  }

  // Functional adapter probes (do they actually price?)
  const axusdA = new ethers.Contract(ADDR.axusdAdapter, ADAPTER_ABI, provider);
  const usdcA  = new ethers.Contract(ADDR.usdcAdapter,  ADAPTER_ABI, provider);
  const axusdQuote = await safe(() => axusdA.getQuote(ethers.parseUnits('1', 18), ADDR.axusd, ADDR.usdPseudo), null);
  const usdcQuote  = await safe(() => usdcA.getQuote(ethers.parseUnits('1', 6),  ADDR.usdc,  ADDR.usdPseudo), null);
  if (!asJson) {
    line('AXUSD/USD adapter prices 1 AXUSD ≈ $1.00', axusdQuote !== null && axusdQuote >= 99_000_000n && axusdQuote <= 101_000_000n,
      axusdQuote === null ? 'revert' : `got ${axusdQuote.toString()}`);
    line('USDC/USD  adapter prices 1 USDC ≈ $1.00', usdcQuote  !== null && usdcQuote  >= 99_000_000n && usdcQuote  <= 101_000_000n,
      usdcQuote === null ? 'revert' : `got ${usdcQuote.toString()}`);
  }

  // ── Step 4: EVK Ungoverned-0x preconditions ─────────────────────────────
  let preconds = null;
  if (isEvk) {
    if (!asJson) console.log(`\n${C.bold}[4] Ungoverned-0x preconditions (EVK)${C.reset}`);
    const persp0xView = new ethers.Contract(PERSP_0X, PERSP_ABI, provider);
    const uoaOk = vaultMeta.unitOfAccount
      ? await safe(() => persp0xView.isRecognizedUnitOfAccount(vaultMeta.unitOfAccount), false)
      : false;
    preconds = {
      assetIsAxusd:    vaultMeta.asset && vaultMeta.asset.toLowerCase() === ADDR.axusd.toLowerCase(),
      uoaIsUsdPseudo:  vaultMeta.unitOfAccount && vaultMeta.unitOfAccount.toLowerCase() === ADDR.usdPseudo.toLowerCase(),
      uoaRecognized:   uoaOk,
      governorRenounced: vaultMeta.governorAdmin && vaultMeta.governorAdmin.toLowerCase() === ethers.ZeroAddress,
      hookTargetZero:  vaultMeta.hookTarget && vaultMeta.hookTarget.toLowerCase() === ethers.ZeroAddress,
      hookedOpsZero:   vaultMeta.hookedOps === 0,
      evkImplCanonical: vaultMeta.evkImplOk === true,
      hasCollateral:   (vaultMeta.ltvList || []).length > 0,
    };
    if (!asJson) {
      line('asset == AXUSD',                       preconds.assetIsAxusd,    vaultMeta.asset);
      line('unitOfAccount == USD pseudo (0x...0348)', preconds.uoaIsUsdPseudo, vaultMeta.unitOfAccount);
      line('UoA recognized by Ungoverned 0x',      preconds.uoaRecognized);
      line('governorAdmin == 0x0 (renounced)',     preconds.governorRenounced, vaultMeta.governorAdmin);
      line('hookConfig.hookTarget == 0x0',         preconds.hookTargetZero,    vaultMeta.hookTarget);
      line('hookConfig.hookedOps == 0',            preconds.hookedOpsZero,     String(vaultMeta.hookedOps));
      line('Implementation == canonical EVK_IMPL', preconds.evkImplCanonical);
      line('At least one collateral configured',    preconds.hasCollateral,    `${(vaultMeta.ltvList || []).length} configured`);
    }
  }

  // ── Step 5: Earn-side checks (factory perspective + Safe label probe) ──
  let earnChecks = null;
  if (isEarn) {
    if (!asJson) console.log(`\n${C.bold}[5] Earn-side checks${C.reset}`);
    const perspEarn = new ethers.Contract(PERSP_EARN, PERSP_ABI, provider);
    const earnVerified = await safe(() => perspEarn.isVerified(VAULT), false);
    earnChecks = { earnFactoryVerified: earnVerified, owner: { addr: vaultMeta.owner, isSafe: false, threshold: null, owners: 0 },
                   curator: { addr: vaultMeta.curator, isSafe: false, threshold: null, owners: 0 } };
    async function safeProbe(addr) {
      if (!addr || addr === ethers.ZeroAddress) return { isSafe: false, threshold: null, owners: 0 };
      const c = new ethers.Contract(addr, SAFE_ABI, provider);
      const t = await safe(() => c.getThreshold(), null);
      const o = await safe(() => c.getOwners(), null);
      return { isSafe: !!(t && o && o.length), threshold: t ? Number(t) : null, owners: o ? o.length : 0 };
    }
    const ownerSafe   = await safeProbe(vaultMeta.owner);
    const curatorSafe = await safeProbe(vaultMeta.curator);
    earnChecks.owner   = { addr: vaultMeta.owner,   ...ownerSafe };
    earnChecks.curator = { addr: vaultMeta.curator, ...curatorSafe };
    if (!asJson) {
      line(`eulerEarnFactoryPerspective.isVerified(vault) == true`, earnVerified);
      line(`owner is a Gnosis Safe (UI label-friendly)`,   ownerSafe.isSafe,
        vaultMeta.owner ? `${vaultMeta.owner} threshold=${ownerSafe.threshold} owners=${ownerSafe.owners}` : 'no owner');
      line(`curator is a Gnosis Safe (UI label-friendly)`, curatorSafe.isSafe,
        vaultMeta.curator && vaultMeta.curator !== ethers.ZeroAddress
          ? `${vaultMeta.curator} threshold=${curatorSafe.threshold} owners=${curatorSafe.owners}`
          : 'curator unset (zero address)');
    }
  }

  // ── Step 6: perspectives (final isVerified rollup) ─────────────────────
  if (!asJson) console.log(`\n${C.bold}[6] Perspective verification (final)${C.reset}`);
  const persp0x   = new ethers.Contract(PERSP_0X,   PERSP_ABI, provider);
  const perspNzx  = new ethers.Contract(PERSP_NZX,  PERSP_ABI, provider);
  const perspEarn = new ethers.Contract(PERSP_EARN, PERSP_ABI, provider);
  const ver0x   = await safe(() => persp0x.isVerified(VAULT),   false);
  const verNzx  = await safe(() => perspNzx.isVerified(VAULT),  false);
  const verEarn = await safe(() => perspEarn.isVerified(VAULT), false);
  const verified = ver0x || verNzx || verEarn;
  if (!asJson) {
    line(`Ungoverned 0x  ${PERSP_0X}`,  ver0x);
    line(`Ungoverned Nzx ${PERSP_NZX}`, verNzx);
    line(`Earn Factory   ${PERSP_EARN}`, verEarn);
  }

  // ── Step 7: terminal status + blockers ─────────────────────────────────
  const blockers = [];
  if (!axusdReg.isValid) blockers.push('AXUSD/USD adapter not in oracleAdapterRegistry (Euler governance must call add())');
  if (!usdcReg.isValid)  blockers.push('USDC/USD adapter not in oracleAdapterRegistry (Euler governance must call add())');
  if (flavour === 'Euler Earn (ERC4626 wrapper)' && !verEarn) {
    blockers.push('Earn wrapper not verified by eulerEarnFactoryPerspective — usually because the underlying EVK strategy vault is not yet Ungoverned-0x verified');
  }
  if (flavour === 'Unknown') blockers.push('Vault is not produced by any known Euler factory and has no Earn surface — perspectives will reject');
  if (isEvk && preconds) {
    if (!preconds.uoaIsUsdPseudo)    blockers.push(`UoA must be USD pseudo (${ADDR.usdPseudo}) — vault has ${vaultMeta.unitOfAccount}`);
    if (!preconds.uoaRecognized)     blockers.push('Vault UoA is not recognized by Ungoverned 0x perspective');
    if (!preconds.governorRenounced) blockers.push('governorAdmin is not 0x0 — Ungoverned 0x requires renounced governance');
    if (!preconds.hookTargetZero)    blockers.push('hookConfig.hookTarget is not 0x0 — Ungoverned 0x rejects hooks');
    if (!preconds.hookedOpsZero)     blockers.push('hookConfig.hookedOps is not 0 — Ungoverned 0x rejects hooks');
    if (!preconds.evkImplCanonical)  blockers.push('Vault implementation does not match canonical EVK_IMPL');
    if (!preconds.hasCollateral)     blockers.push('Vault has no configured collateral');
    if (routerProbes && (!routerProbes.asset.ok || routerProbes.collaterals.some(c => !c.ok))) {
      blockers.push('Vault EulerRouter does not resolve an oracle for the asset and/or collateral leg');
    }
  }

  // Normalized terminal status string
  let status;
  if (verified) {
    status = 'OK_VERIFIED';
  } else if (!axusdReg.isValid || !usdcReg.isValid) {
    status = 'BLOCKED_ON_EULER_GOVERNANCE';
  } else if (blockers.length > 0) {
    status = 'BLOCKED_ON_AXIOM';
  } else {
    status = 'CODE_FAULT';
  }

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
      router: routerProbes,
      preconditions: preconds,
      earn: earnChecks,
      perspective: { isVerified0x: ver0x, isVerifiedNzx: verNzx, isVerifiedEarn: verEarn,
                     address0x: PERSP_0X, addressNzx: PERSP_NZX, addressEarn: PERSP_EARN },
      verified,
      status,
      blockers,
      registerCalldata: REGISTER_CALLDATA,
    }, null, 2) + '\n');
    process.exit(verified ? 0 : 1);
  }

  // ── Human verdict ──────────────────────────────────────────────────────
  console.log(`\n${C.bold}[7] Verdict${C.reset}`);
  console.log(`    Status: ${status === 'OK_VERIFIED' ? C.pass : C.fail}${status}${C.reset}`);
  if (verified) {
    console.log('    Vault IS perspective-verified. The Euler V2 UI should show a recognized');
    console.log('    vault type and risk-manager label. If labels still read "Unknown" in the');
    console.log('    UI, hard-refresh and check that the UI is not pinned to a stale snapshot.');
    console.log('    If still wrong after 24h, see the escalation block in');
    console.log('    documents/euler-axusd-ui-verification-checklist.md.');
    process.exit(0);
  }
  console.log('    Blocking conditions:');
  for (const b of blockers) console.log('      - ' + b);

  console.log(`\n    ${C.bold}Concrete next actions${C.reset}`);
  if (status === 'BLOCKED_ON_EULER_GOVERNANCE') {
    console.log('      a) Euler governance (multisig owner of oracleAdapterRegistry) must');
    console.log(`         execute the following call(s) on ${ADDR.registry}:`);
    if (!axusdReg.isValid) {
      console.log('\n         AXUSD/USD adapter:');
      console.log('           to:    ' + ADDR.registry);
      console.log('           value: 0');
      console.log('           data:  ' + REGISTER_CALLDATA.axusd);
    }
    if (!usdcReg.isValid) {
      console.log('\n         USDC/USD  adapter:');
      console.log('           to:    ' + ADDR.registry);
      console.log('           value: 0');
      console.log('           data:  ' + REGISTER_CALLDATA.usdc);
    }
    console.log('\n         Submission packages with full proposal text and audit checklist:');
    console.log('           documents/euler-adapter-submission-package/');
    console.log('           documents/euler-usdc-adapter-submission-package/');
  }
  if (flavour !== 'EVK eVault') {
    console.log('\n      b) Once both adapters are registered, deploy the canonical EVK vault —');
    console.log('         the current target is not an EVK vault and cannot be perspective-verified');
    console.log('         on its own:');
    console.log('           SKIP_RENOUNCE=1 SKIP_PERSPECTIVE_VERIFY=1 \\');
    console.log('             AXUSD_USD_ADAPTER=' + ADDR.axusdAdapter + ' \\');
    console.log('             USDC_USD_ADAPTER='  + ADDR.usdcAdapter  + ' \\');
    console.log('             node scripts/deploy-axusd-evk-vault-canonical.js');
    console.log('         (drop SKIP_* once both registry rows are PASS above)');
  } else if (status === 'BLOCKED_ON_AXIOM') {
    console.log('\n      b) Vault config is the blocker, not Euler. Inspect the FAIL rows under');
    console.log('         [4] Preconditions and [2] EulerRouter and remediate, then re-run.');
    console.log('         If hooks or governance need clearing on a recoverable vault:');
    console.log('           node scripts/fix-axusd-evk-vault-metadata.js');
  }
  console.log('\n    UI verification: documents/euler-axusd-ui-verification-checklist.md');
  console.log('    Re-run this diagnostic after each step to confirm progress.');
  process.exit(1);
}

main().catch(e => { console.error('FATAL:', e); process.exit(2); });
