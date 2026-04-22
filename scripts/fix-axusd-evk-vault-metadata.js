/**
 * Fix the AXUSD EVK vault "Unknown" metadata in the Euler V2 UI.
 *
 * Idempotent post-deployment fix:
 *   1. If hookConfig.hookedOps != 0  → setHookConfig(0x0, 0)
 *   2. Pre-flight static-call:
 *        - try perspectiveVerify on EulerUngovernedNzxPerspective (governor preserved)
 *        - if it succeeds → use Nzx path, skip renounce
 *        - else → renounce governor (irreversible) + verify on EulerUngoverned0x
 *   3. Re-run a brief on-chain check and print verdict.
 *
 * Pulls perspective addresses live from euler-xyz/euler-interfaces.
 *
 * Run:
 *   DEPLOYER_PRIVATE_KEY=... node scripts/fix-axusd-evk-vault-metadata.js
 *   FORCE_RENOUNCE=1 node ... # skip Nzx pre-flight, go straight to renounce + 0x
 *   DRY_RUN=1 node ...        # static-calls only, send no transactions
 */

const { ethers } = require('ethers');
const https = require('https');

const VAULT = (process.env.VAULT || '0xacdA87801f6409bB5157BA78aF1BD9631d6609B2').trim();
const RPC = process.env.ALCHEMY_API_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : (process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc');

const REF = process.env.EULER_INTERFACES_REF || 'master';
const PERIPHERY_URL = `https://raw.githubusercontent.com/euler-xyz/euler-interfaces/${REF}/addresses/42161/PeripheryAddresses.json`;

const VAULT_ABI = [
  'function governorAdmin() view returns (address)',
  'function hookConfig() view returns (address hookTarget, uint32 hookedOps)',
  'function setHookConfig(address newHookTarget, uint32 newHookedOps) external',
  'function setGovernorAdmin(address newGovernorAdmin) external',
  'function maxDeposit(address) view returns (uint256)',
];

const PERSPECTIVE_ABI = [
  'function perspectiveVerify(address vault, bool failEarly) external',
  'function isVerified(address) view returns (bool)',
  'function name() view returns (string)',
];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'axiom-fix/1.0' } }, (res) => {
      if ([301, 302].includes(res.statusCode)) return resolve(fetchJson(res.headers.location));
      if (res.statusCode !== 200) return reject(new Error(`${url} → ${res.statusCode}`));
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

let _nonce = null;
function useNonce() { return _nonce++; }

async function main() {
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error('DEPLOYER_PRIVATE_KEY env var required');
  const dryRun = !!process.env.DRY_RUN;

  const provider = new ethers.JsonRpcProvider(RPC);
  const deployer = new ethers.Wallet(pk, provider);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' Fix AXUSD EVK vault metadata (Euler V2 perspective verification)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' Vault:    ', VAULT);
  console.log(' Signer:   ', deployer.address);
  console.log(' Dry-run:  ', dryRun);
  console.log(' Mode:     ', process.env.FORCE_RENOUNCE ? 'FORCE renounce + 0x' : 'auto (try Nzx first)');

  _nonce = await provider.getTransactionCount(deployer.address, 'pending');
  console.log(' Nonce:    ', _nonce);

  const periphery = await fetchJson(PERIPHERY_URL);
  const persp = periphery.perspectives || periphery;
  const PERSP_0X  = persp.eulerUngoverned0xPerspective;
  const PERSP_NZX = persp.eulerUngovernedNzxPerspective;
  if (!PERSP_0X || !PERSP_NZX) throw new Error('Could not resolve perspective addresses');

  console.log('\n Perspectives:');
  console.log('   Ungoverned 0x:  ', PERSP_0X);
  console.log('   Ungoverned Nzx: ', PERSP_NZX);

  const vault = new ethers.Contract(VAULT, VAULT_ABI, deployer);
  const persp0x  = new ethers.Contract(PERSP_0X,  PERSPECTIVE_ABI, deployer);
  const perspNzx = new ethers.Contract(PERSP_NZX, PERSPECTIVE_ABI, deployer);

  // ─── 1. Hook check ────────────────────────────────────────────────────────
  console.log('\n[1] Hook check');
  const hc = await vault.hookConfig();
  const hookedOps = Number(hc[1] ?? hc.hookedOps ?? 0);
  if (hookedOps !== 0) {
    console.log(`    hookedOps=${hookedOps} — clearing to 0`);
    if (!dryRun) {
      const tx = await vault.setHookConfig(ethers.ZeroAddress, 0, { nonce: useNonce(), gasLimit: 200_000 });
      console.log('    setHookConfig tx:', tx.hash);
      await tx.wait(1);
    }
  } else {
    console.log('    hookedOps=0 already ✓ (skip)');
  }

  // ─── 2. Pre-flight perspective static calls ───────────────────────────────
  console.log('\n[2] Perspective pre-flight');
  const alreadyVerified0x  = await persp0x.isVerified(VAULT).catch(() => false);
  const alreadyVerifiedNzx = await perspNzx.isVerified(VAULT).catch(() => false);
  console.log('    isVerified(0x):  ', alreadyVerified0x);
  console.log('    isVerified(Nzx): ', alreadyVerifiedNzx);

  if (alreadyVerified0x || alreadyVerifiedNzx) {
    console.log('    Vault already verified — nothing to do.');
    return;
  }

  let chosenPath = null; // '0x' | 'nzx'

  if (!process.env.FORCE_RENOUNCE) {
    console.log('    Trying EulerUngovernedNzxPerspective with current governance (preserves governor)...');
    try {
      await perspNzx.perspectiveVerify.staticCall(VAULT, true);
      chosenPath = 'nzx';
      console.log('    Nzx static-call OK — using Nzx path (no renounce required) ✓');
    } catch (e) {
      console.log('    Nzx rejects:', (e.shortMessage || e.reason || e.message || '').slice(0, 200));
    }
  }

  let govSlot = null;
  if (!chosenPath) {
    console.log('    Falling back to EulerUngoverned0xPerspective (requires renounce).');
    console.log('    Pre-flight: simulating perspectiveVerify with governorAdmin overridden to 0x0...');
    // Find governorAdmin storage slot (scan first 30 slots)
    const padDeployer = ethers.zeroPadValue(deployer.address, 32).toLowerCase();
    for (let i = 0; i < 30; i++) {
      const slot = '0x' + i.toString(16).padStart(64, '0');
      const v = await provider.getStorage(VAULT, slot);
      if (v.toLowerCase() === padDeployer) { govSlot = slot; break; }
    }
    if (!govSlot) {
      throw new Error('Could not locate governorAdmin storage slot — refusing to renounce blindly.');
    }
    const iface = new ethers.Interface(['function perspectiveVerify(address,bool)']);
    const data = iface.encodeFunctionData('perspectiveVerify', [VAULT, true]);
    try {
      await provider.send('eth_call', [
        { to: PERSP_0X, data, from: '0x0000000000000000000000000000000000000001' },
        'latest',
        { [VAULT]: { stateDiff: { [govSlot]: '0x' + '0'.repeat(64) } } },
      ]);
      console.log('    Simulation passed — safe to renounce + verify on 0x ✓');
      chosenPath = '0x';
    } catch (e) {
      const errData = e?.data || e?.info?.error?.data || e?.error?.data;
      let codes = null;
      if (typeof errData === 'string' && errData.length >= 138) {
        codes = BigInt('0x' + errData.slice(-64));
      }
      console.error('\n    ✗ Pre-flight FAILED. Simulated perspectiveVerify(0x) after renounce still reverts.');
      if (codes !== null) console.error('      Error codes (PerspectiveError): ' + codes.toString() + ' (binary 0b' + codes.toString(2) + ')');
      console.error('      → Refusing to renounce governance.  Renouncing would NOT make the vault');
      console.error('        recognizable AND would brick all future configuration changes.');
      console.error('      → See documents/euler-axusd-vault-unknown-fix.md — this vault requires');
      console.error('        REDEPLOYMENT via scripts/deploy-axusd-evk-vault-canonical.js.');
      process.exit(2);
    }
  }

  // ─── 3. Apply chosen path ─────────────────────────────────────────────────
  console.log(`\n[3] Apply path: ${chosenPath.toUpperCase()}`);

  if (chosenPath === '0x') {
    const gov = await vault.governorAdmin();
    if (gov.toLowerCase() === ethers.ZeroAddress) {
      console.log('    governor already 0x0 ✓ (skip renounce)');
    } else {
      if (gov.toLowerCase() !== deployer.address.toLowerCase()) {
        throw new Error(`Signer ${deployer.address} is not governor (${gov}) — cannot renounce`);
      }
      // ── Hardened renounce gate ────────────────────────────────────────────
      // We REQUIRE positive proof that perspectiveVerify will succeed AFTER
      // renounce before broadcasting the irreversible setGovernorAdmin(0x0).
      // The pre-flight above used a storage-slot heuristic to set governor=0
      // for the simulation. As an additional defense, we sanity-check the
      // located slot by reading governorAdmin via a state-overridden eth_call
      // to confirm the slot maps to the public getter.
      const sanityIface = new ethers.Interface(['function governorAdmin() view returns (address)']);
      const sanityData = sanityIface.encodeFunctionData('governorAdmin');
      const sanityRes = await provider.send('eth_call', [
        { to: VAULT, data: sanityData },
        'latest',
        { [VAULT]: { stateDiff: { [govSlot]: '0x' + '0'.repeat(64) } } },
      ]).catch(() => null);
      const sanityAddr = sanityRes ? '0x' + sanityRes.slice(-40) : null;
      if (!sanityAddr || sanityAddr.toLowerCase() !== ethers.ZeroAddress) {
        throw new Error(`Storage slot heuristic failed sanity check: overriding slot ${govSlot} did not zero governorAdmin() getter (got ${sanityAddr}). Refusing irreversible renounce.`);
      }
      console.log(`    Storage-slot ${govSlot} confirmed via getter readback ✓`);
      console.log('    Renouncing governor (IRREVERSIBLE) → setGovernorAdmin(0x0)');
      if (!dryRun) {
        const tx = await vault.setGovernorAdmin(ethers.ZeroAddress, { nonce: useNonce(), gasLimit: 200_000 });
        console.log('    setGovernorAdmin tx:', tx.hash);
        await tx.wait(1);
      }
    }

    // Post-renounce on-chain confirmation: real static-call (no overrides)
    // BEFORE we broadcast perspectiveVerify and burn gas. If this fails, the
    // renounce already happened (or was skipped because governor was already
    // 0x0); either way we can't "un-fail" but we surface the exact reason.
    if (!dryRun) {
      try {
        await persp0x.perspectiveVerify.staticCall(VAULT, true);
      } catch (e) {
        throw new Error('perspectiveVerify(0x) static-call FAILED after renounce: ' + (e.shortMessage || e.reason || e.message));
      }
    }
    console.log('    Calling perspectiveVerify on EulerUngoverned0xPerspective');
    if (!dryRun) {
      const tx = await persp0x.perspectiveVerify(VAULT, true, { nonce: useNonce(), gasLimit: 1_500_000 });
      console.log('    perspectiveVerify tx:', tx.hash);
      await tx.wait(1);
    }
  } else {
    console.log('    Calling perspectiveVerify on EulerUngovernedNzxPerspective');
    if (!dryRun) {
      const tx = await perspNzx.perspectiveVerify(VAULT, true, { nonce: useNonce(), gasLimit: 1_500_000 });
      console.log('    perspectiveVerify tx:', tx.hash);
      await tx.wait(1);
    }
  }

  // ─── 4. Final readback ────────────────────────────────────────────────────
  console.log('\n[4] Final readback');
  const [gov2, hc2, ver0x2, verNzx2, max2] = await Promise.all([
    vault.governorAdmin(),
    vault.hookConfig(),
    persp0x.isVerified(VAULT).catch(() => false),
    perspNzx.isVerified(VAULT).catch(() => false),
    vault.maxDeposit(ethers.ZeroAddress).catch(() => 0n),
  ]);
  console.log('    governorAdmin:        ', gov2);
  console.log('    hookConfig:            target=', hc2[0], 'hookedOps=', String(hc2[1]));
  console.log('    Verified by 0x:       ', ver0x2);
  console.log('    Verified by Nzx:      ', verNzx2);
  console.log('    maxDeposit(0x0):      ', max2.toString());

  console.log('\n═══════════════════════════════════════════════════════════════');
  if (ver0x2 || verNzx2) {
    console.log(' RESULT: Vault metadata fixed ✓ (Euler V2 UI will recognize the vault)');
  } else if (dryRun) {
    console.log(' DRY RUN complete — no transactions sent.');
  } else {
    console.log(' RESULT: Verification still failed ✗ — review logs above.');
    process.exit(1);
  }
  console.log('═══════════════════════════════════════════════════════════════');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
