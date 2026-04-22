/**
 * Generate signer-rotation calldata for an existing Safe (e.g. the AXIOM
 * Risk Council Safe) without changing the Safe's address.
 *
 * The Safe's address is a CREATE2 derivation of (initial signers, initial
 * threshold, saltNonce).  Once deployed, owner/threshold changes happen
 * **inside** the proxy via `OwnerManager` calls — those mutations do NOT
 * change the Safe address.  Re-deploying with a new (signers, threshold,
 * saltNonce) tuple would produce a *different* Safe and silently break
 * the label registered in `euler-xyz/euler-interfaces`.
 *
 * This script signs nothing and sends nothing.  It prints raw calldata
 * and writes a Safe Transaction Builder batch JSON the existing signers
 * can import to rotate the owner set in-place.
 *
 * Supported actions (pick one via ACTION=...):
 *   add      — addOwnerWithThreshold(newOwner, threshold)
 *   remove   — removeOwner(prevOwner, owner, threshold)
 *   swap     — swapOwner(prevOwner, oldOwner, newOwner)         (replace a key)
 *   threshold— changeThreshold(threshold)
 *
 * Configure with env vars:
 *   SAFE=0x...                  required; the existing Safe to rotate
 *   ACTION=add|remove|swap|threshold   required
 *   NEW_OWNER=0x...             for ACTION=add or ACTION=swap
 *   OLD_OWNER=0x...             for ACTION=remove or ACTION=swap
 *   THRESHOLD=2                 for ACTION=add|remove|threshold
 *   PREV_OWNER=0x...            optional; only needed for ACTION=remove or
 *                               ACTION=swap when the live RPC lookup of the
 *                               owner linked-list is unavailable.  The script
 *                               otherwise computes prevOwner automatically.
 *   OUT=path/to/file.json       optional; default
 *                               documents/euler-interfaces-pr/safe-rotate-<action>.batch.json
 *
 * Run examples:
 *   SAFE=0x... ACTION=add      NEW_OWNER=0x... THRESHOLD=2 \
 *     node scripts/rotate-axusd-risk-council-safe-signers.js
 *   SAFE=0x... ACTION=swap     OLD_OWNER=0x... NEW_OWNER=0x... \
 *     node scripts/rotate-axusd-risk-council-safe-signers.js
 *   SAFE=0x... ACTION=remove   OLD_OWNER=0x... THRESHOLD=2 \
 *     node scripts/rotate-axusd-risk-council-safe-signers.js
 *   SAFE=0x... ACTION=threshold THRESHOLD=3 \
 *     node scripts/rotate-axusd-risk-council-safe-signers.js
 */

const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

// Sentinel used by Safe's OwnerManager linked list of owners.
const SENTINEL_OWNERS = '0x0000000000000000000000000000000000000001';

const OWNER_MANAGER_ABI = [
  'function getOwners() view returns (address[])',
  'function getThreshold() view returns (uint256)',
  'function isOwner(address owner) view returns (bool)',
  'function addOwnerWithThreshold(address owner, uint256 _threshold)',
  'function removeOwner(address prevOwner, address owner, uint256 _threshold)',
  'function swapOwner(address prevOwner, address oldOwner, address newOwner)',
  'function changeThreshold(uint256 _threshold)',
];
const iface = new ethers.Interface(OWNER_MANAGER_ABI);

const RPC = process.env.ALCHEMY_API_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : (process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc');

function fatal(msg) {
  console.error('[fatal] ' + msg);
  process.exit(1);
}

if (!process.env.SAFE) fatal('SAFE=0x... is required (the existing Safe to rotate).');
const SAFE = ethers.getAddress(process.env.SAFE.trim());

const ACTION = (process.env.ACTION || '').toLowerCase();
if (!['add', 'remove', 'swap', 'threshold'].includes(ACTION)) {
  fatal('ACTION must be one of: add | remove | swap | threshold');
}

const NEW_OWNER = process.env.NEW_OWNER ? ethers.getAddress(process.env.NEW_OWNER.trim()) : null;
const OLD_OWNER = process.env.OLD_OWNER ? ethers.getAddress(process.env.OLD_OWNER.trim()) : null;
const THRESHOLD = process.env.THRESHOLD ? BigInt(process.env.THRESHOLD) : null;

if (ACTION === 'add'       && (!NEW_OWNER || THRESHOLD === null)) fatal('ACTION=add needs NEW_OWNER + THRESHOLD');
if (ACTION === 'remove'    && (!OLD_OWNER || THRESHOLD === null)) fatal('ACTION=remove needs OLD_OWNER + THRESHOLD');
if (ACTION === 'swap'      && (!OLD_OWNER || !NEW_OWNER))         fatal('ACTION=swap needs OLD_OWNER + NEW_OWNER');
if (ACTION === 'threshold' && THRESHOLD === null)                  fatal('ACTION=threshold needs THRESHOLD');

/**
 * Safe stores owners as a singly-linked list keyed by SENTINEL → owner_n
 * → owner_(n-1) → ... → owner_1 → SENTINEL.  removeOwner / swapOwner
 * need the owner that points to the target — i.e. the entry immediately
 * before it in `getOwners()`, with SENTINEL preceding the first entry.
 */
function findPrevOwner(owners, target) {
  const t = target.toLowerCase();
  for (let i = 0; i < owners.length; i++) {
    if (owners[i].toLowerCase() === t) {
      return i === 0 ? SENTINEL_OWNERS : ethers.getAddress(owners[i - 1]);
    }
  }
  return null;
}

(async () => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' AXIOM Risk Council Safe — signer rotation calldata');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' Safe:    ', SAFE);
  console.log(' Action:  ', ACTION);
  if (NEW_OWNER) console.log(' New owner:', NEW_OWNER);
  if (OLD_OWNER) console.log(' Old owner:', OLD_OWNER);
  if (THRESHOLD !== null) console.log(' Threshold:', THRESHOLD.toString());

  let liveOwners = null, liveThreshold = null;
  try {
    const provider = new ethers.JsonRpcProvider(RPC);
    const safe = new ethers.Contract(SAFE, OWNER_MANAGER_ABI, provider);
    [liveOwners, liveThreshold] = await Promise.all([
      safe.getOwners(),
      safe.getThreshold(),
    ]);
    console.log(' Current owners:   ', liveOwners.join(', '));
    console.log(' Current threshold:', liveThreshold.toString());
  } catch (e) {
    console.log(' [warn] RPC unreachable, skipping live state check:', e.message);
    console.log('        For ACTION=remove or ACTION=swap you must pass PREV_OWNER manually,');
    console.log('        or set ARBITRUM_RPC_URL / ALCHEMY_API_KEY and re-run.');
  }

  // Sanity-check the requested rotation against live state when available.
  if (liveOwners) {
    const ownersLower = liveOwners.map((a) => a.toLowerCase());
    if (ACTION === 'add' && ownersLower.includes(NEW_OWNER.toLowerCase())) {
      fatal(`NEW_OWNER ${NEW_OWNER} is already a signer of this Safe.`);
    }
    if ((ACTION === 'remove' || ACTION === 'swap') && !ownersLower.includes(OLD_OWNER.toLowerCase())) {
      fatal(`OLD_OWNER ${OLD_OWNER} is not currently a signer of this Safe.`);
    }
    if (ACTION === 'swap' && ownersLower.includes(NEW_OWNER.toLowerCase())) {
      fatal(`NEW_OWNER ${NEW_OWNER} is already a signer (swap would leave a duplicate).`);
    }
    if (THRESHOLD !== null) {
      let projected = liveOwners.length;
      if (ACTION === 'add')    projected += 1;
      if (ACTION === 'remove') projected -= 1;
      if (THRESHOLD < 1n || THRESHOLD > BigInt(projected)) {
        fatal(`THRESHOLD ${THRESHOLD} must be between 1 and the post-rotation owner count (${projected}).`);
      }
    }
  }

  let data, summary;
  if (ACTION === 'add') {
    data = iface.encodeFunctionData('addOwnerWithThreshold', [NEW_OWNER, THRESHOLD]);
    summary = `addOwnerWithThreshold(${NEW_OWNER}, ${THRESHOLD})`;
  } else if (ACTION === 'threshold') {
    data = iface.encodeFunctionData('changeThreshold', [THRESHOLD]);
    summary = `changeThreshold(${THRESHOLD})`;
  } else {
    // remove / swap need prevOwner from the linked list.
    let prev = process.env.PREV_OWNER
      ? ethers.getAddress(process.env.PREV_OWNER.trim())
      : (liveOwners ? findPrevOwner(liveOwners, OLD_OWNER) : null);
    if (!prev) fatal('Could not determine PREV_OWNER. Pass PREV_OWNER=0x... or enable RPC access.');
    console.log(' prevOwner (linked-list pointer):', prev);

    if (ACTION === 'remove') {
      data = iface.encodeFunctionData('removeOwner', [prev, OLD_OWNER, THRESHOLD]);
      summary = `removeOwner(${prev}, ${OLD_OWNER}, ${THRESHOLD})`;
    } else {
      data = iface.encodeFunctionData('swapOwner', [prev, OLD_OWNER, NEW_OWNER]);
      summary = `swapOwner(${prev}, ${OLD_OWNER}, ${NEW_OWNER})`;
    }
  }

  console.log('───────────────────────────────────────────────────────────────');
  console.log('\n[Tx — sent by the Safe itself, i.e. ≥ threshold sigs from current owners]');
  console.log('  to:   ', SAFE);
  console.log('  value: 0');
  console.log('  data: ', data);
  console.log('  meaning:', summary);
  console.log('\n  IMPORTANT: this tx targets the Safe address itself.  Do NOT redeploy a');
  console.log('  fresh Safe with new (signers, threshold, saltNonce) — that would produce a');
  console.log('  DIFFERENT CREATE2 address and orphan the "axiomRiskCouncil" label registered');
  console.log('  in euler-xyz/euler-interfaces.');

  const batch = {
    version: '1.0',
    chainId: '42161',
    createdAt: Date.now(),
    meta: {
      name: `AXIOM Risk Council — rotate signers (${ACTION})`,
      description:
        `In-place owner-set rotation on the existing Safe ${SAFE}. ` +
        `Action: ${summary}. ` +
        'Executed inside the existing Safe proxy so its CREATE2 address — and the ' +
        'axiomRiskCouncil label registered in euler-xyz/euler-interfaces — are preserved.',
    },
    transactions: [
      {
        to: SAFE,
        value: '0',
        data,
        contractMethod: null,
        contractInputsValues: null,
      },
    ],
  };

  const defaultOut = path.resolve(
    __dirname, '..', 'documents', 'euler-interfaces-pr',
    `safe-rotate-${ACTION}.batch.json`,
  );
  const outFile = process.env.OUT
    ? path.resolve(process.cwd(), process.env.OUT)
    : defaultOut;
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(batch, null, 2) + '\n');
  console.log('\n[Safe batch] wrote', path.relative(process.cwd(), outFile));
  console.log('  Import this in app.safe.global → Apps → Transaction Builder → "Load batch",');
  console.log('  then collect the existing signers\' approvals and execute.');
  console.log('═══════════════════════════════════════════════════════════════');
})().catch((e) => { console.error(e); process.exit(1); });
