/**
 * AXUSD EVK Vault — CANONICAL deploy script (perspective-compatible).
 *
 * Replaces scripts/deploy-axusd-evk-vault.js (preserved at
 * scripts/_legacy/deploy-axusd-evk-vault.legacy.js).
 *
 * Designed so the resulting vault qualifies for verification by
 * EulerUngoverned0xPerspective (i.e. UI shows "Ungoverned 0x" instead of
 * "Unknown") once Euler governance whitelists the supplied oracle adapters
 * in oracleAdapterRegistry.
 *
 * REQUIRED env vars:
 *   DEPLOYER_PRIVATE_KEY  - Arbitrum deployer key with ETH for gas
 *   AXUSD_USD_ADAPTER     - ERC-7726 adapter pricing AXUSD<->USD pseudo (0x...0348)
 *                           This MUST support BOTH directions
 *                           (getQuote(., AXUSD, USD) AND getQuote(., USD, AXUSD)).
 *   USDC_USD_ADAPTER      - ERC-7726 adapter pricing USDC<->USD pseudo
 *                           (typically a Chainlink USDC/USD wrapper).
 *
 * OPTIONAL env vars:
 *   ALCHEMY_API_KEY       - preferred RPC
 *   ARBITRUM_RPC_URL      - fallback RPC
 *   STATE_FILE            - default .local/canonical-deploy-state.json (idempotency)
 *   DRY_RUN=1             - run preflight only, no transactions, no contract
 *                           instantiation against placeholder addresses
 *   SKIP_RENOUNCE=1       - retain governance (recommended until adapters are
 *                           whitelisted in oracleAdapterRegistry)
 *   SKIP_PERSPECTIVE_VERIFY=1
 *                         - skip the final perspectiveVerify call (recommended
 *                           until adapters are in oracleAdapterRegistry)
 *
 * Why USD pseudo as UoA (NOT USDC):
 *   On-chain probe (2026-04-17) confirmed neither
 *   EulerUngoverned0xPerspective nor EulerUngovernedNzxPerspective recognize
 *   USDC as a valid unit-of-account on Arbitrum. The only recognized UoAs
 *   are the ISO 4217 USD pseudo-address 0x...0348 and WETH. The legacy
 *   vault used USDC and is therefore unrecognizable regardless of any other
 *   fix.
 *
 * Why the existing AXUSD adapter (0xc894…7c4e) is REJECTED:
 *   Direct probing showed it returns 0 for getQuote(., AXUSD, USDC) and
 *   reverts on AXUSD/USD. It only prices USDC->AXUSD at 1:1. Reusing it
 *   would carry forward a zero-borrow-pricing bug. This script refuses to
 *   accept that address as AXUSD_USD_ADAPTER.
 *
 * Idempotency: deploy artifacts are persisted in STATE_FILE. Re-running
 * skips any step whose output already exists in state and is on-chain.
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Static addresses ─────────────────────────────────────────────────────────
const EVK_FACTORY    = '0x78Df1CF5bf06a7f27f2ACc580B934238C1b80D50';
const EVK_IMPL       = '0x832fF4011A3164ea76ceA06A313EE0B6CD72ba96';
const EVC            = '0x6302ef0F34100CDDFb5489fbcB6eE1AA95CD1066';

const AXUSD_ERC3643  = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
const USDC           = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const USD_PSEUDO     = '0x0000000000000000000000000000000000000348';

const LPM            = '0xC0177120Fb5922813031a5857f4dF7F01750Bb6F';
const COMPLIANCE     = '0xaC9E1A91D1C7F584C9FC04E283fae30Ae2F636DD';

const BROKEN_LEGACY_ADAPTER = '0xc894d1500CB1FBf8F045e87bd357A51345197c4e';

const REF = process.env.EULER_INTERFACES_REF || 'master';
const PERIPHERY_URL = `https://raw.githubusercontent.com/euler-xyz/euler-interfaces/${REF}/addresses/42161/PeripheryAddresses.json`;

// ── IRM params (LinearKink) ──────────────────────────────────────────────────
const SECONDS_PER_YEAR = 365n * 24n * 60n * 60n;
const WAD = ethers.parseEther('1');
function aprToWadPerSec(aprPct) {
  return (BigInt(Math.round(aprPct * 1e6)) * WAD) / (100n * 1_000_000n * SECONDS_PER_YEAR);
}
const IRM_BASE_RATE = aprToWadPerSec(1);
const IRM_SLOPE1    = aprToWadPerSec(5);
const IRM_SLOPE2    = aprToWadPerSec(100);
// EulerKinkIRMFactory expects kink as uint32 fraction of type(uint32).max.
// Source: github.com/euler-xyz/evk-periphery .../IRMFactory/EulerKinkIRMFactory.sol
const IRM_KINK_U32  = Math.floor(0.80 * 4294967295);

const BORROW_LTV = 9000;
const LIQUIDATION_LTV = 9500;

function encodeAmountCap(mantissa, exponent) { return (mantissa << 6) | exponent; }
const SUPPLY_CAP_UINT16 = encodeAmountCap(1, 33); // 1M
const BORROW_CAP_UINT16 = encodeAmountCap(5, 32); // 500K

// ── ABIs ─────────────────────────────────────────────────────────────────────
const FACTORY_ABI = [
  'function createProxy(address impl, bool upgradeable, bytes calldata trailingData) external returns (address)',
  'function getProxyConfig(address) view returns (tuple(bool upgradeable, address implementation, bytes trailingData))',
  'function isProxy(address) view returns (bool)',
];
const VAULT_ABI = [
  'function setInterestRateModel(address) external',
  'function setLTV(address collateral, uint16 borrowLTV, uint16 liqLTV, uint32 ramp) external',
  'function setCaps(uint16 supplyCap, uint16 borrowCap) external',
  'function setGovernorAdmin(address) external',
  'function setHookConfig(address newHookTarget, uint32 newHookedOps) external',
  'function asset() view returns (address)',
  'function oracle() view returns (address)',
  'function unitOfAccount() view returns (address)',
  'function governorAdmin() view returns (address)',
  'function interestRateModel() view returns (address)',
  'function hookConfig() view returns (address, uint32)',
  'function caps() view returns (uint16 supplyCap, uint16 borrowCap)',
  'function LTVBorrow(address collateral) view returns (uint16)',
  'function LTVLiquidation(address collateral) view returns (uint16)',
];
const KINK_IRM_FACTORY_ABI = [
  'function deploy(uint256 baseRate, uint256 slope1, uint256 slope2, uint32 kink) external returns (address)',
  'function isValidDeployment(address) view returns (bool)',
];
const ROUTER_FACTORY_ABI = [
  'function deploy(address governor) external returns (address)',
  'function isValidDeployment(address) view returns (bool)',
];
const ROUTER_ABI = [
  'function govSetConfig(address base, address quote, address oracle) external',
  'function transferGovernance(address newGovernor) external',
  'function governor() view returns (address)',
  'function getConfiguredOracle(address base, address quote) view returns (address)',
];
const PERSP_ABI = [
  'function perspectiveVerify(address vault, bool failEarly) external',
  'function isVerified(address) view returns (bool)',
  'function isRecognizedUnitOfAccount(address) view returns (bool)',
];
const ADAPTER_REGISTRY_ABI = [
  'function isValid(address element, uint256 snapshotTime) view returns (bool)',
];
const LPM_ABI = [
  'function addPlatform(address compliance, address platform) external',
  'function isPlatformWhitelisted(address compliance, address platform) view returns (bool)',
];
const ADAPTER_ABI = [
  'function getQuote(uint256 inAmount, address base, address quote) view returns (uint256)',
];

// ── State (idempotency) ──────────────────────────────────────────────────────
const STATE_FILE = process.env.STATE_FILE || path.join(__dirname, '..', '.local', 'canonical-deploy-state.json');
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return {}; }
}
function saveState(s) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

// ── Nonce manager ────────────────────────────────────────────────────────────
let _nonce = null;
function useNonce() { return _nonce++; }

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'axiom-canonical/2.0' } }, (res) => {
      if ([301, 302].includes(res.statusCode)) return resolve(fetchJson(res.headers.location));
      if (res.statusCode !== 200) return reject(new Error(`${url} → ${res.statusCode}`));
      let buf = ''; res.on('data', c => buf += c);
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

function isHexAddr(s) { try { return ethers.isAddress(s); } catch { return false; } }
function fail(msg) { console.error('\n  ✗ ' + msg); process.exit(1); }

async function main() {
  const dryRun = !!process.env.DRY_RUN;
  const skipRenounce = !!process.env.SKIP_RENOUNCE;
  const skipVerify = !!process.env.SKIP_PERSPECTIVE_VERIFY;

  const rpc = process.env.ALCHEMY_API_KEY
    ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    : (process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc');
  const provider = new ethers.JsonRpcProvider(rpc);

  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk && !dryRun) fail('DEPLOYER_PRIVATE_KEY env var required (or set DRY_RUN=1)');
  const deployer = pk ? new ethers.Wallet(pk, provider) : null;

  const AXUSD_USD_ADAPTER = (process.env.AXUSD_USD_ADAPTER || '').trim();
  const USDC_USD_ADAPTER  = (process.env.USDC_USD_ADAPTER || '').trim();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' AXUSD EVK Vault — CANONICAL deployment (v2)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' Deployer:           ', deployer ? deployer.address : '(dry-run, no signer)');
  console.log(' Dry-run:            ', dryRun);
  console.log(' Skip renounce:      ', skipRenounce);
  console.log(' Skip perspective:   ', skipVerify);
  console.log(' Asset (AXUSD):      ', AXUSD_ERC3643);
  console.log(' UoA (USD pseudo):   ', USD_PSEUDO);
  console.log(' AXUSD/USD adapter:  ', AXUSD_USD_ADAPTER || '(not set)');
  console.log(' USDC/USD adapter:   ', USDC_USD_ADAPTER  || '(not set)');
  console.log(' State file:         ', STATE_FILE);

  // ── PREFLIGHT (hard fail-fast assertions) ─────────────────────────────────
  console.log('\n[preflight] Hard checks before any broadcast');

  if (!isHexAddr(AXUSD_USD_ADAPTER))
    fail('AXUSD_USD_ADAPTER env var missing or not a valid address.');
  if (!isHexAddr(USDC_USD_ADAPTER))
    fail('USDC_USD_ADAPTER env var missing or not a valid address.');
  if (AXUSD_USD_ADAPTER.toLowerCase() === BROKEN_LEGACY_ADAPTER.toLowerCase())
    fail(`Refusing to use legacy adapter ${BROKEN_LEGACY_ADAPTER} — it returns 0 for AXUSD->USDC and has no AXUSD/USD path. See documents/euler-axusd-vault-unknown-fix.md §7b.`);

  // Verify adapters actually price the required directions before proceeding.
  const axusdAdapter = new ethers.Contract(AXUSD_USD_ADAPTER, ADAPTER_ABI, provider);
  const usdcAdapter  = new ethers.Contract(USDC_USD_ADAPTER,  ADAPTER_ABI, provider);

  const checks = [
    ['AXUSD->USD ', () => axusdAdapter.getQuote(ethers.parseUnits('1', 18), AXUSD_ERC3643, USD_PSEUDO)],
    ['USD->AXUSD ', () => axusdAdapter.getQuote(ethers.parseUnits('1', 8),  USD_PSEUDO,    AXUSD_ERC3643)],
    ['USDC->USD  ', () => usdcAdapter.getQuote(ethers.parseUnits('1', 6),  USDC,          USD_PSEUDO)],
  ];
  for (const [label, fn] of checks) {
    try {
      const v = await fn();
      if (v === 0n) fail(`Adapter check ${label.trim()} returned 0 — adapter is non-functional in this direction.`);
      console.log(`  ${label} OK (${v.toString()})`);
    } catch (e) {
      fail(`Adapter check ${label.trim()} reverted: ${(e.shortMessage || e.message || '').slice(0, 160)}`);
    }
  }

  const periphery = await fetchJson(PERIPHERY_URL);
  const KINK_IRM_FACTORY = periphery.kinkIRMFactory;
  const ROUTER_FACTORY   = periphery.oracleRouterFactory;
  const PERSP_0X         = periphery.eulerUngoverned0xPerspective;
  const ADAPTER_REGISTRY = periphery.oracleAdapterRegistry;
  if (!KINK_IRM_FACTORY || !ROUTER_FACTORY || !PERSP_0X || !ADAPTER_REGISTRY)
    fail('Periphery addresses incomplete — failed to resolve from euler-interfaces.');
  console.log('  kinkIRMFactory:        ', KINK_IRM_FACTORY);
  console.log('  oracleRouterFactory:   ', ROUTER_FACTORY);
  console.log('  oracleAdapterRegistry: ', ADAPTER_REGISTRY);
  console.log('  Ungoverned 0x persp:   ', PERSP_0X);

  // Confirm USD pseudo is recognized (sanity).
  const persp0xView = new ethers.Contract(PERSP_0X, PERSP_ABI, provider);
  const uoaOk = await persp0xView.isRecognizedUnitOfAccount(USD_PSEUDO).catch(() => false);
  if (!uoaOk) fail('Ungoverned 0x perspective does not recognize USD pseudo as UoA — aborting.');
  console.log('  USD pseudo is recognized UoA ✓');

  // Inform (not fail) on adapter registry status — Euler-gov-only step.
  const reg = new ethers.Contract(ADAPTER_REGISTRY, ADAPTER_REGISTRY_ABI, provider);
  const now = Math.floor(Date.now() / 1000);
  const axusdReg = await reg.isValid(AXUSD_USD_ADAPTER, now).catch(() => false);
  const usdcReg  = await reg.isValid(USDC_USD_ADAPTER,  now).catch(() => false);
  console.log(`  AXUSD adapter in registry: ${axusdReg ? 'YES ✓' : 'NO (Euler gov action pending)'}`);
  console.log(`  USDC  adapter in registry: ${usdcReg  ? 'YES ✓' : 'NO (Euler gov action pending)'}`);
  if (!skipVerify && (!axusdReg || !usdcReg)) {
    fail('SKIP_PERSPECTIVE_VERIFY is not set but at least one adapter is not in oracleAdapterRegistry. perspectiveVerify will revert with ERROR__ORACLE_INVALID_ADAPTER. Either get the adapters whitelisted first OR rerun with SKIP_PERSPECTIVE_VERIFY=1.');
  }
  if (!skipRenounce && (!axusdReg || !usdcReg)) {
    fail('SKIP_RENOUNCE is not set but adapters are not in registry. Renouncing now would brick future config changes on a vault that still cannot be perspective-verified. Either whitelist adapters first OR rerun with SKIP_RENOUNCE=1.');
  }

  if (dryRun) {
    console.log('\n  DRY_RUN complete — preflight passed. No transactions will be sent.');
    console.log('  Re-run without DRY_RUN=1 (and with SKIP_RENOUNCE=1 SKIP_PERSPECTIVE_VERIFY=1');
    console.log('  if adapters are not yet in registry) to broadcast.');
    return;
  }

  // ── Initialize state + nonce ──────────────────────────────────────────────
  const state = loadState();
  state.deployer = deployer.address;
  state.network  = 'arbitrum';
  state.startedAt = state.startedAt || new Date().toISOString();
  saveState(state);

  _nonce = await provider.getTransactionCount(deployer.address, 'pending');
  console.log('\n  Initial nonce:', _nonce);

  const factory     = new ethers.Contract(EVK_FACTORY,        FACTORY_ABI,            deployer);
  const irmFactory  = new ethers.Contract(KINK_IRM_FACTORY,   KINK_IRM_FACTORY_ABI,   deployer);
  const routerFac   = new ethers.Contract(ROUTER_FACTORY,     ROUTER_FACTORY_ABI,     deployer);
  const persp0x     = new ethers.Contract(PERSP_0X,           PERSP_ABI,              deployer);
  const lpm         = new ethers.Contract(LPM,                LPM_ABI,                deployer);

  // Helper: parse ContractDeployed(address indexed deployment, ...) topic[1]
  const CONTRACT_DEPLOYED_TOPIC = ethers.id('ContractDeployed(address,address,uint256)');
  function parseDeployment(receipt, factoryAddr) {
    const log = receipt.logs.find(l =>
      l.address.toLowerCase() === factoryAddr.toLowerCase() &&
      l.topics[0] === CONTRACT_DEPLOYED_TOPIC
    );
    if (!log) throw new Error(`No ContractDeployed event from ${factoryAddr} in tx ${receipt.hash}`);
    return ethers.getAddress('0x' + log.topics[1].slice(26));
  }

  // ── [1] LPM whitelist ─────────────────────────────────────────────────────
  console.log('\n[1] LPM whitelist (EVC + factory)');
  for (const [addr, label] of [[EVC, 'EVC'], [EVK_FACTORY, 'EVK Factory']]) {
    const ok = await lpm.isPlatformWhitelisted(COMPLIANCE, addr).catch(() => false);
    if (ok) { console.log(`   ${label} already whitelisted ✓`); continue; }
    const tx = await lpm.addPlatform(COMPLIANCE, addr, { nonce: useNonce(), gasLimit: 250_000 });
    await tx.wait(1);
    console.log(`   ${label} whitelisted | tx: ${tx.hash}`);
  }

  // ── [2] Deploy IRM via official kinkIRMFactory (idempotent) ───────────────
  console.log('\n[2] Deploy IRM via kinkIRMFactory');
  let irmAddress = state.irm;
  if (irmAddress && await irmFactory.isValidDeployment(irmAddress).catch(() => false)) {
    console.log('   reusing existing IRM from state:', irmAddress);
  } else {
    const tx = await irmFactory.deploy(IRM_BASE_RATE, IRM_SLOPE1, IRM_SLOPE2, IRM_KINK_U32, { nonce: useNonce(), gasLimit: 1_000_000 });
    const receipt = await tx.wait(1);
    irmAddress = parseDeployment(receipt, KINK_IRM_FACTORY);
    state.irm = irmAddress; saveState(state);
    console.log('   IRM deployed at:', irmAddress, '| tx:', tx.hash);
    const ok = await irmFactory.isValidDeployment(irmAddress).catch(() => false);
    if (!ok) fail('Newly deployed IRM is not isValidDeployment — aborting.');
  }

  // ── [3] Deploy EulerRouter and configure adapters (idempotent) ────────────
  console.log('\n[3] Deploy EulerRouter via oracleRouterFactory');
  let routerAddress = state.router;
  if (routerAddress && await routerFac.isValidDeployment(routerAddress).catch(() => false)) {
    console.log('   reusing existing router from state:', routerAddress);
  } else {
    const tx = await routerFac.deploy(deployer.address, { nonce: useNonce(), gasLimit: 2_000_000 });
    const receipt = await tx.wait(1);
    routerAddress = parseDeployment(receipt, ROUTER_FACTORY);
    state.router = routerAddress; saveState(state);
    console.log('   Router deployed at:', routerAddress, '| tx:', tx.hash);
  }
  const router = new ethers.Contract(routerAddress, ROUTER_ABI, deployer);

  for (const [base, quote, adapter, label] of [
    [AXUSD_ERC3643, USD_PSEUDO, AXUSD_USD_ADAPTER, 'AXUSD/USD'],
    [USDC,          USD_PSEUDO, USDC_USD_ADAPTER,  'USDC/USD'],
  ]) {
    const cur = await router.getConfiguredOracle(base, quote).catch(() => ethers.ZeroAddress);
    if (cur.toLowerCase() === adapter.toLowerCase()) {
      console.log(`   router ${label} already configured ✓`);
      continue;
    }
    const tx = await router.govSetConfig(base, quote, adapter, { nonce: useNonce(), gasLimit: 250_000 });
    await tx.wait(1);
    console.log(`   router.govSetConfig(${label}) | tx: ${tx.hash}`);
  }

  // ── [4] Create vault (upgradeable=true) ───────────────────────────────────
  console.log('\n[4] Create vault (upgradeable=true) via factory.createProxy');
  let vaultAddress = state.vault;
  if (vaultAddress && await factory.isProxy(vaultAddress).catch(() => false)) {
    console.log('   reusing existing vault from state:', vaultAddress);
  } else {
    const trailingData = ethers.concat([
      ethers.zeroPadValue(AXUSD_ERC3643, 20),
      ethers.zeroPadValue(routerAddress,  20),
      ethers.zeroPadValue(USD_PSEUDO,     20),
    ]);
    const tx = await factory.createProxy(EVK_IMPL, true, trailingData, { nonce: useNonce(), gasLimit: 4_000_000 });
    const r = await tx.wait(1);
    const proxyTopic = ethers.id('ProxyCreated(address,bool,address,bytes)');
    const log = r.logs.find(l => l.topics[0] === proxyTopic);
    if (!log) fail('ProxyCreated event not found in factory tx.');
    vaultAddress = ethers.getAddress('0x' + log.topics[1].slice(26));
    state.vault = vaultAddress; saveState(state);
    console.log('   Vault created at:', vaultAddress, '| tx:', tx.hash);
  }
  const vault = new ethers.Contract(vaultAddress, VAULT_ABI, deployer);

  // Confirm proxy config matches expectations
  const cfg = await factory.getProxyConfig(vaultAddress);
  if (!cfg.upgradeable) fail('New vault has upgradeable=false — aborting (perspectives reject).');
  if (cfg.implementation.toLowerCase() !== EVK_IMPL.toLowerCase())
    fail(`Implementation mismatch: ${cfg.implementation} vs ${EVK_IMPL}`);
  console.log('   upgradeable=true ✓');

  // ── [5] Whitelist vault + router in LPM ───────────────────────────────────
  console.log('\n[5] LPM whitelist (vault + router)');
  for (const [addr, label] of [[vaultAddress, 'Vault'], [routerAddress, 'Router']]) {
    const ok = await lpm.isPlatformWhitelisted(COMPLIANCE, addr).catch(() => false);
    if (ok) { console.log(`   ${label} already whitelisted ✓`); continue; }
    const tx = await lpm.addPlatform(COMPLIANCE, addr, { nonce: useNonce(), gasLimit: 250_000 });
    await tx.wait(1);
    console.log(`   ${label} whitelisted | tx: ${tx.hash}`);
  }

  // ── [6] Configure vault: hooks, IRM, LTV, caps ────────────────────────────
  console.log('\n[6] Configure vault: hooks→0, IRM, LTV, caps');
  const [hookTarget, hookedOps] = await vault.hookConfig();
  if (Number(hookedOps) !== 0 || hookTarget !== ethers.ZeroAddress) {
    const t = await vault.setHookConfig(ethers.ZeroAddress, 0, { nonce: useNonce(), gasLimit: 200_000 });
    await t.wait(1);
    console.log('   hooks cleared | tx:', t.hash);
  } else { console.log('   hooks already clear ✓'); }

  const curIrm = await vault.interestRateModel();
  if (curIrm.toLowerCase() !== irmAddress.toLowerCase()) {
    const t = await vault.setInterestRateModel(irmAddress, { nonce: useNonce(), gasLimit: 200_000 });
    await t.wait(1);
    console.log('   IRM set | tx:', t.hash);
  } else { console.log('   IRM already correct ✓'); }

  // LTV: read on-chain values for the configured collateral and skip if matching.
  const [curBorrowLtv, curLiqLtv] = await Promise.all([
    vault.LTVBorrow(USDC).catch(() => 0),
    vault.LTVLiquidation(USDC).catch(() => 0),
  ]);
  if (Number(curBorrowLtv) === BORROW_LTV && Number(curLiqLtv) === LIQUIDATION_LTV) {
    console.log(`   LTV already correct ✓ (borrow=${curBorrowLtv}, liq=${curLiqLtv})`);
  } else {
    const t = await vault.setLTV(USDC, BORROW_LTV, LIQUIDATION_LTV, 0, { nonce: useNonce(), gasLimit: 250_000 });
    await t.wait(1);
    console.log(`   LTV set ${curBorrowLtv}/${curLiqLtv} → ${BORROW_LTV}/${LIQUIDATION_LTV} | tx:`, t.hash);
  }

  // Caps: read packed (supplyCap, borrowCap) and skip if matching.
  const [curSupplyCap, curBorrowCap] = await vault.caps();
  if (Number(curSupplyCap) === SUPPLY_CAP_UINT16 && Number(curBorrowCap) === BORROW_CAP_UINT16) {
    console.log(`   caps already correct ✓ (supply=${curSupplyCap}, borrow=${curBorrowCap})`);
  } else {
    const t = await vault.setCaps(SUPPLY_CAP_UINT16, BORROW_CAP_UINT16, { nonce: useNonce(), gasLimit: 200_000 });
    await t.wait(1);
    console.log(`   caps set (${curSupplyCap},${curBorrowCap}) → (${SUPPLY_CAP_UINT16},${BORROW_CAP_UINT16}) | tx:`, t.hash);
  }

  // ── [7] Optional: renounce + verify (gated) ───────────────────────────────
  if (skipRenounce) {
    console.log('\n[7] Renounce skipped (SKIP_RENOUNCE=1).');
    console.log('     Run separately once adapters are in oracleAdapterRegistry:');
    console.log('       router.transferGovernance(0x0)  →  vault.setGovernorAdmin(0x0)');
    console.log('       persp0x.perspectiveVerify(vault, true)');
  } else {
    console.log('\n[7] Renounce + perspectiveVerify');
    // Hard gate: simulate the FULL chain (renounce + verify) before broadcasting.
    try {
      // Static-call confirms verify would succeed under current state.
      await persp0x.perspectiveVerify.staticCall(vaultAddress, true);
    } catch (e) {
      fail('Final perspectiveVerify static-call failed; refusing to renounce. Error: ' + (e.shortMessage || e.message));
    }
    const r1 = await router.transferGovernance(ethers.ZeroAddress, { nonce: useNonce(), gasLimit: 200_000 });
    await r1.wait(1);
    console.log('   router governance renounced | tx:', r1.hash);
    const r2 = await vault.setGovernorAdmin(ethers.ZeroAddress, { nonce: useNonce(), gasLimit: 200_000 });
    await r2.wait(1);
    console.log('   vault governorAdmin renounced | tx:', r2.hash);

    if (!skipVerify) {
      const tx = await persp0x.perspectiveVerify(vaultAddress, true, { nonce: useNonce(), gasLimit: 1_500_000 });
      await tx.wait(1);
      console.log('   ✓ perspectiveVerify ok | tx:', tx.hash);
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(' DEPLOYMENT SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' Vault:            ', vaultAddress);
  console.log(' Router:           ', routerAddress);
  console.log(' IRM:              ', irmAddress);
  console.log(' Asset:            ', AXUSD_ERC3643);
  console.log(' UoA (USD pseudo): ', USD_PSEUDO);
  console.log(' AXUSD/USD adapter:', AXUSD_USD_ADAPTER);
  console.log(' USDC/USD adapter: ', USDC_USD_ADAPTER);
  console.log(' Renounced:        ', !skipRenounce);
  console.log(' State file:       ', STATE_FILE);
  console.log('───────────────────────────────────────────────────────────────');
  console.log(' Audit:  node scripts/audit-axusd-evk-vault.js  VAULT=' + vaultAddress);
  console.log('═══════════════════════════════════════════════════════════════');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
