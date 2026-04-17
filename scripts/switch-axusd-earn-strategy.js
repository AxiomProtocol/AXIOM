/**
 * Switch the Axiom Earn AXUSD aggregator's strategy from the legacy
 * eAXUSD-6 EVK vault (broken oracle, perspective-Unknown) to the new
 * canonical AXUSD EVK vault produced by `deploy-axusd-evk-vault-canonical.js`.
 *
 * Aggregator (Euler Earn vault):
 *   0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B   (Axiom Earn AXUSD)
 *
 * Legacy strategy to evict:
 *   0xacdA87801f6409bB5157BA78aF1BD9631d6609B2   (eAXUSD-6, broken oracle)
 *
 * New canonical strategy must be supplied via env:
 *   CANONICAL_EVK_VAULT=0x...
 * If unset, the script reads it from the canonical EVK deploy state file
 * (default .local/canonical-deploy-state.json -> state.vault).
 *
 * Steps (all idempotent, safe to re-run):
 *   [1] Sanity: confirm the canonical vault is deployed, asset == AXUSD,
 *       and at least the EulerUngoverned0x perspective verifies it (the
 *       only way the Earn governed perspective can ever pass — see
 *       documents/euler-axusd-earn-vault-audit.md §4a).
 *   [2] submitCap(canonical, CAP) on the Earn vault, then acceptCap once
 *       the timelock window opens.
 *   [3] setSupplyQueue([canonical]) — drop the legacy strategy from the
 *       supply queue so new deposits never touch it again.
 *   [4] Evict the legacy strategy from the withdraw queue:
 *         (a) submitCap(legacy, 0)  + acceptCap   -> sets cap to 0
 *         (b) submitMarketRemoval(legacy)         -> starts removal timer
 *         (c) wait removableAt
 *         (d) updateWithdrawQueue([new index list w/o legacy])
 *       Skipped automatically if legacy.config.currentCap > 0 (i.e. the
 *       Earn vault still has assets parked there) — in that case the
 *       script prints the migration tx the operator must run first
 *       (allocator.reallocate or a manual rebalance) and exits non-zero.
 *   [5] Re-run scripts/audit-axusd-euler-earn-vault.js and assert that
 *       BOTH eulerEarnFactoryPerspective AND eulerEarnGovernedPerspective
 *       report VERIFIED.  Exits non-zero otherwise.
 *
 * Required env:
 *   DEPLOYER_PRIVATE_KEY   — owner of the Earn vault (the deployer EOA)
 *   CANONICAL_EVK_VAULT    — new canonical EVK vault address (or via state file)
 *
 * Optional env:
 *   ALCHEMY_API_KEY        — preferred Arbitrum RPC
 *   ARBITRUM_RPC_URL       — fallback RPC
 *   STATE_FILE             — canonical EVK deploy state file
 *                            (default .local/canonical-deploy-state.json)
 *   STRATEGY_CAP           — cap submitted for the new vault (default 1,000,000 AXUSD)
 *   DRY_RUN=1              — preflight only, no transactions sent
 *   SKIP_LEGACY_REMOVAL=1  — only swap supply queue; leave legacy in
 *                            withdraw queue (use if assets are still parked
 *                            in legacy and migration hasn't happened yet)
 *   SKIP_AUDIT=1           — skip the post-step audit subprocess
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// ── Static addresses (Arbitrum One) ─────────────────────────────────────────
const EARN_VAULT     = '0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B';
const LEGACY_EVK     = '0xacdA87801f6409bB5157BA78aF1BD9631d6609B2';
const AXUSD_ERC3643  = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';

const RPC = process.env.ALCHEMY_API_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : (process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc');

const REF = process.env.EULER_INTERFACES_REF || 'master';
const PERIPHERY_URL = `https://raw.githubusercontent.com/euler-xyz/euler-interfaces/${REF}/addresses/42161/PeripheryAddresses.json`;

const STATE_FILE = process.env.STATE_FILE
  || path.join(__dirname, '..', '.local', 'canonical-deploy-state.json');

const DRY_RUN              = process.env.DRY_RUN === '1';
const SKIP_LEGACY_REMOVAL  = process.env.SKIP_LEGACY_REMOVAL === '1';
const SKIP_AUDIT           = process.env.SKIP_AUDIT === '1';
const STRATEGY_CAP         = ethers.parseUnits(process.env.STRATEGY_CAP || '1000000', 18);

// ── ABIs ────────────────────────────────────────────────────────────────────
const EARN_VAULT_ABI = [
  'function asset() view returns (address)',
  'function owner() view returns (address)',
  'function curator() view returns (address)',
  'function timelock() view returns (uint256)',
  'function config(address) view returns (uint112 cap, uint136 currentCap, bool enabled, uint64 removableAt)',
  'function pendingCap(address) view returns (uint136 value, uint64 validAt)',
  'function supplyQueueLength() view returns (uint256)',
  'function supplyQueue(uint256) view returns (address)',
  'function withdrawQueueLength() view returns (uint256)',
  'function withdrawQueue(uint256) view returns (address)',
  'function submitCap(address id, uint256 newSupplyCap) external',
  'function acceptCap(address id) external',
  'function revokePendingCap(address id) external',
  'function submitMarketRemoval(address id) external',
  'function setSupplyQueue(address[] newSupplyQueue) external',
  'function updateWithdrawQueue(uint256[] indexes) external',
];

const EVK_VAULT_ABI = [
  'function asset() view returns (address)',
  'function oracle() view returns (address)',
  'function unitOfAccount() view returns (address)',
];

const PERSP_ABI = [
  'function isVerified(address) view returns (bool)',
  'function name() view returns (string)',
];

// ── Helpers ─────────────────────────────────────────────────────────────────
const https = require('https');
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'axiom-switch-strategy/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) return resolve(fetchJson(res.headers.location));
      if (res.statusCode !== 200) return reject(new Error(`${url} -> ${res.statusCode}`));
      let buf = ''; res.on('data', c => buf += c);
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

function loadCanonicalFromState() {
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    return s.vault || null;
  } catch { return null; }
}

async function waitTimelock(validAt, label) {
  const now = Math.floor(Date.now() / 1000);
  const waitSec = Number(validAt) - now;
  if (waitSec <= 0) return;
  console.log(`    [${label}] waiting ${waitSec}s for timelock (validAt=${validAt})...`);
  await new Promise(r => setTimeout(r, (waitSec + 2) * 1000));
}

async function sendOrDry(label, fn) {
  if (DRY_RUN) { console.log(`    [DRY_RUN] would ${label}`); return null; }
  const tx = await fn();
  console.log(`    ${label} -> ${tx.hash}`);
  await tx.wait(1);
  return tx;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' Switch Axiom Earn AXUSD strategy -> canonical EVK vault');
  console.log('═══════════════════════════════════════════════════════════════');

  const canonical = (process.env.CANONICAL_EVK_VAULT || loadCanonicalFromState() || '').trim();
  if (!canonical || !ethers.isAddress(canonical)) {
    throw new Error(
      'CANONICAL_EVK_VAULT not set and could not be loaded from STATE_FILE.\n' +
      'Run scripts/deploy-axusd-evk-vault-canonical.js first, or pass\n' +
      'CANONICAL_EVK_VAULT=0x... in the environment.'
    );
  }
  if (canonical.toLowerCase() === LEGACY_EVK.toLowerCase()) {
    throw new Error('CANONICAL_EVK_VAULT == legacy eAXUSD-6. Refusing to no-op.');
  }

  const provider = new ethers.JsonRpcProvider(RPC);
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk && !DRY_RUN) throw new Error('DEPLOYER_PRIVATE_KEY required (or set DRY_RUN=1).');
  const signer = pk ? new ethers.Wallet(pk, provider) : null;

  console.log(' Earn vault:        ', EARN_VAULT);
  console.log(' Legacy strategy:   ', LEGACY_EVK);
  console.log(' Canonical strategy:', canonical);
  console.log(' Cap to submit:     ', ethers.formatUnits(STRATEGY_CAP, 18), 'AXUSD');
  console.log(' RPC:               ', RPC.replace(/\/v2\/.*/, '/v2/<key>'));
  console.log(' Mode:              ', DRY_RUN ? 'DRY_RUN' : 'BROADCAST');
  console.log('───────────────────────────────────────────────────────────────');

  const earnRO = new ethers.Contract(EARN_VAULT, EARN_VAULT_ABI, provider);
  const earn   = signer ? new ethers.Contract(EARN_VAULT, EARN_VAULT_ABI, signer) : earnRO;
  const newRO  = new ethers.Contract(canonical,  EVK_VAULT_ABI,   provider);

  // ── [1] Sanity ────────────────────────────────────────────────────────────
  console.log('\n[1] Sanity checks');

  const code = await provider.getCode(canonical);
  if (!code || code === '0x') throw new Error(`Canonical vault has no code at ${canonical}`);

  const [newAsset, earnAsset, owner, timelock] = await Promise.all([
    newRO.asset(),
    earnRO.asset(),
    earnRO.owner(),
    earnRO.timelock(),
  ]);
  if (newAsset.toLowerCase() !== AXUSD_ERC3643.toLowerCase()) {
    throw new Error(`Canonical vault asset is ${newAsset}, expected AXUSD ${AXUSD_ERC3643}`);
  }
  if (earnAsset.toLowerCase() !== AXUSD_ERC3643.toLowerCase()) {
    throw new Error(`Earn vault asset is ${earnAsset}, expected AXUSD`);
  }
  console.log('  asset(canonical)  =', newAsset, '(AXUSD ✓)');
  console.log('  asset(earn)       =', earnAsset, '(AXUSD ✓)');
  console.log('  earn.owner        =', owner);
  console.log('  earn.timelock     =', timelock.toString(), 'sec');
  if (signer && owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`Signer ${signer.address} is not the Earn vault owner ${owner}`);
  }

  // Perspective sanity on the canonical vault — bail if not yet verified.
  let periphery = {};
  try { periphery = await fetchJson(PERIPHERY_URL); }
  catch (e) { console.warn('  [warn] failed to fetch PeripheryAddresses:', e.message); }
  const persp = periphery.perspectives || periphery;
  const ung0 = persp.eulerUngoverned0xPerspective;
  const ungN = persp.eulerUngovernedNzxPerspective;

  let canonicalVerified = false;
  for (const [k, addr] of [['ungoverned0x', ung0], ['ungovernedNzx', ungN]]) {
    if (!addr) continue;
    const p = new ethers.Contract(addr, PERSP_ABI, provider);
    const ok = await p.isVerified(canonical).catch(() => false);
    console.log(`  perspective.${k}.isVerified(canonical) =`, ok);
    if (ok) canonicalVerified = true;
  }
  if (!canonicalVerified) {
    throw new Error(
      'Canonical EVK vault is NOT yet perspective-verified by any Ungoverned\n' +
      'perspective. Repointing the Earn vault now would leave\n' +
      'eulerEarnGovernedPerspective failing — defeating the purpose of this\n' +
      'task. Finish documents/euler-axusd-vault-unknown-fix.md §4 (deploy\n' +
      'canonical vault, register adapters, perspectiveVerify) first.'
    );
  }

  // ── [2] submitCap + acceptCap on canonical ───────────────────────────────
  console.log('\n[2] Register canonical strategy (submitCap + acceptCap)');
  {
    const [cfg, pending] = await Promise.all([
      earnRO.config(canonical),
      earnRO.pendingCap(canonical),
    ]);
    const enabled = cfg[2];
    const cap     = BigInt(cfg[0]);
    const pVal    = BigInt(pending[0]);
    const pValid  = Number(pending[1]);

    if (enabled && cap >= STRATEGY_CAP) {
      console.log('    already enabled with cap >= target, skipping');
    } else {
      if (pVal === 0n) {
        await sendOrDry(`submitCap(${canonical}, ${STRATEGY_CAP})`,
          () => earn.submitCap(canonical, STRATEGY_CAP));
        if (!DRY_RUN) {
          const np = await earnRO.pendingCap(canonical);
          await waitTimelock(np[1], 'canonical cap');
        }
      } else {
        console.log('    pendingCap already exists:', pVal.toString());
        if (!DRY_RUN) await waitTimelock(pValid, 'canonical cap (existing pending)');
      }
      await sendOrDry(`acceptCap(${canonical})`, () => earn.acceptCap(canonical));
    }
  }

  // ── [3] setSupplyQueue([canonical]) ──────────────────────────────────────
  console.log('\n[3] Repoint supply queue -> [canonical]');
  {
    const len = Number(await earnRO.supplyQueueLength());
    const cur = [];
    for (let i = 0; i < len; i++) cur.push((await earnRO.supplyQueue(i)).toLowerCase());
    const targetLc = canonical.toLowerCase();
    const isCorrect = cur.length === 1 && cur[0] === targetLc;
    console.log('    current supply queue:', cur);
    if (isCorrect) {
      console.log('    already canonical-only, skipping');
    } else {
      await sendOrDry('setSupplyQueue([canonical])',
        () => earn.setSupplyQueue([canonical]));
    }
  }

  // ── [4] Evict legacy from withdraw queue ─────────────────────────────────
  console.log('\n[4] Evict legacy strategy from withdraw queue');
  if (SKIP_LEGACY_REMOVAL) {
    console.log('    SKIP_LEGACY_REMOVAL=1 -> leaving legacy in withdraw queue');
  } else {
    const legacyCfg = await earnRO.config(LEGACY_EVK);
    const legacyEnabled  = legacyCfg[2];
    const legacyCurCap   = BigInt(legacyCfg[1]);
    const legacyRemoveAt = Number(legacyCfg[3]);

    if (!legacyEnabled) {
      console.log('    legacy not enabled in config -> nothing to remove');
    } else if (legacyCurCap > 0n) {
      console.log('    ✗ legacy.config.currentCap =', legacyCurCap.toString(),
        '(assets still parked in legacy)');
      console.log('    Migrate the AXUSD balance out of legacy first');
      console.log('    (allocator.reallocate or a manual rebalance), then re-run');
      console.log('    this script.  Re-run with SKIP_LEGACY_REMOVAL=1 to skip.');
      process.exit(2);
    } else {
      // (a) cap -> 0 (idempotent)
      const legacyCap = BigInt(legacyCfg[0]);
      if (legacyCap !== 0n) {
        const lp = await earnRO.pendingCap(LEGACY_EVK);
        if (BigInt(lp[0]) === 0n && lp[1] === 0n) {
          await sendOrDry(`submitCap(${LEGACY_EVK}, 0)`,
            () => earn.submitCap(LEGACY_EVK, 0));
          if (!DRY_RUN) {
            const np = await earnRO.pendingCap(LEGACY_EVK);
            await waitTimelock(np[1], 'legacy cap=0');
          }
        }
        await sendOrDry(`acceptCap(${LEGACY_EVK})`, () => earn.acceptCap(LEGACY_EVK));
      }

      // (b) submitMarketRemoval (idempotent if removableAt already set)
      if (legacyRemoveAt === 0) {
        await sendOrDry(`submitMarketRemoval(${LEGACY_EVK})`,
          () => earn.submitMarketRemoval(LEGACY_EVK));
      }
      if (!DRY_RUN) {
        const after = await earnRO.config(LEGACY_EVK);
        await waitTimelock(after[3], 'legacy removal');
      }

      // (d) updateWithdrawQueue with legacy index dropped
      const wlen = Number(await earnRO.withdrawQueueLength());
      const indexes = [];
      let foundLegacy = false;
      for (let i = 0; i < wlen; i++) {
        const a = (await earnRO.withdrawQueue(i)).toLowerCase();
        if (a === LEGACY_EVK.toLowerCase()) { foundLegacy = true; continue; }
        indexes.push(i);
      }
      if (!foundLegacy) {
        console.log('    legacy not in withdraw queue, skipping updateWithdrawQueue');
      } else {
        await sendOrDry(`updateWithdrawQueue([${indexes.join(',')}])`,
          () => earn.updateWithdrawQueue(indexes));
      }
    }
  }

  // ── [5] Re-run audit and assert both perspectives verified ───────────────
  if (SKIP_AUDIT || DRY_RUN) {
    console.log('\n[5] Audit skipped (', SKIP_AUDIT ? 'SKIP_AUDIT=1' : 'DRY_RUN', ')');
  } else {
    console.log('\n[5] Re-running audit-axusd-euler-earn-vault.js...');
    const auditScript = path.join(__dirname, 'audit-axusd-euler-earn-vault.js');
    const r = spawnSync(process.execPath, [auditScript], {
      env: process.env, encoding: 'utf8',
    });
    process.stdout.write(r.stdout || '');
    if (r.stderr) process.stderr.write(r.stderr);
    if (r.status !== 0) throw new Error(`Audit exited ${r.status}`);
    const factoryVerified  = /eulerEarnFactoryPerspective\s+VERIFIED/.test(r.stdout);
    const governedVerified = /eulerEarnGovernedPerspective\s+VERIFIED/.test(r.stdout);
    console.log('\n   factoryPerspective verified:  ', factoryVerified);
    console.log('   governedPerspective verified: ', governedVerified);
    if (!(factoryVerified && governedVerified)) {
      throw new Error(
        'Post-switch audit did not confirm BOTH perspectives VERIFIED.\n' +
        'Inspect the audit output above and the canonical EVK vault state.'
      );
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(' DONE  — supply queue: [canonical], legacy evicted');
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(e => { console.error('\n✗', e.message || e); process.exit(1); });
