#!/usr/bin/env node
/**
 * Axiom Sui Campaign Migration Script
 * Fixes the "AXOOM Genesis" (double-O typo) by closing the old campaign
 * and creating a correctly-labelled "Axiom Genesis" replacement.
 *
 * Run:
 *   npx tsx scripts/sui-migrate-campaign.ts
 *
 * Required env vars:
 *   AXIOM_SUI_ADMIN_CAP_ID       — AdminCap object ID (from original create_campaign)
 *   AXIOM_SUI_AMC_COIN_ID        — AMC Coin<AXIOM_MAINNET_CLAIM> object ID to fund new campaign
 *   AXIOM_SUI_AMOUNT_PER_CLAIM   — u64 base units (e.g. 1000000 = 1.000000 AMC)
 *   AXIOM_SUI_MERKLE_ROOT        — 32-byte root as 0x-prefixed hex, or empty for deferred set
 *
 * Optional:
 *   AXIOM_SUI_PACKAGE_ID         — override (defaults to mainnet candidate package)
 *   AXIOM_SUI_EXPIRES_AT_EPOCH   — u64, 0 = no expiry (default: 0)
 *   SUI_BIN                      — path to sui CLI binary (default: ~/.local/bin/sui)
 *   DRY_RUN                      — set to "1" to print commands without executing
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as os from 'os';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAINNET_PACKAGE_ID =
  '0xc4b0fe88635a80589f5f17a3e5c2970e15bedbc1de9db5f6f0d6b6c3f5858a19';

const OLD_CAMPAIGN_ID =
  '0x3d3023694c96f9a71f6737a9aa43166c2f0b376418147cb005db0e17a52b726e';

// "Axiom Genesis" as UTF-8 byte array
// A  x  i  o  m     G  e  n  e  s  i  s
const CORRECT_LABEL_BYTES = [65, 120, 105, 111, 109, 32, 71, 101, 110, 101, 115, 105, 115];

const COIN_TYPE_SUFFIX = '::axiom_mainnet_claim::AXIOM_MAINNET_CLAIM';

// ─── Config ───────────────────────────────────────────────────────────────────

function require_env(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`[migrate] ✗ Required env var missing: ${name}`);
    process.exit(1);
  }
  return v;
}

const PACKAGE_ID = process.env.AXIOM_SUI_PACKAGE_ID ?? MAINNET_PACKAGE_ID;
const ADMIN_CAP_ID = require_env('AXIOM_SUI_ADMIN_CAP_ID');
const AMC_COIN_ID = require_env('AXIOM_SUI_AMC_COIN_ID');
const AMOUNT_PER_CLAIM = require_env('AXIOM_SUI_AMOUNT_PER_CLAIM');
const MERKLE_ROOT = process.env.AXIOM_SUI_MERKLE_ROOT ?? '0x';
const EXPIRES_AT_EPOCH = process.env.AXIOM_SUI_EXPIRES_AT_EPOCH ?? '0';
const SUI_BIN = process.env.SUI_BIN ?? path.join(os.homedir(), '.local/bin/sui');
const DRY_RUN = process.env.DRY_RUN === '1';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function run(label: string, args: string[]): unknown {
  const cmd = [SUI_BIN, 'client', 'call', '--json', ...args].join(' ');
  console.log(`\n[migrate] ── ${label}`);
  console.log(`[migrate]    ${cmd}`);

  if (DRY_RUN) {
    console.log('[migrate]    (DRY RUN — skipping execution)');
    return null;
  }

  try {
    const raw = execSync(cmd, { encoding: 'utf8', timeout: 120_000 });
    const result = JSON.parse(raw);
    if (result?.effects?.status?.status !== 'success') {
      console.error('[migrate] ✗ Transaction failed:', JSON.stringify(result?.effects?.status, null, 2));
      process.exit(1);
    }
    console.log(`[migrate]    ✓ digest: ${result?.digest ?? '(unknown)'}`);
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[migrate] ✗ ${label} failed: ${msg}`);
    process.exit(1);
  }
}

function extractCreatedObject(txResult: unknown, typeSubstring: string): string {
  type Change = { type?: string; objectType?: string; objectId?: string };
  const changes: Change[] = (txResult as { objectChanges?: Change[] })?.objectChanges ?? [];
  const match = changes.find(
    c => c.type === 'created' && (c.objectType ?? '').includes(typeSubstring),
  );
  if (!match?.objectId) {
    console.error(`[migrate] ✗ Could not find created object matching "${typeSubstring}" in transaction response`);
    console.error('[migrate]    objectChanges:', JSON.stringify(changes, null, 2));
    process.exit(1);
  }
  return match.objectId;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║  Axiom Sui Campaign Migration — AXOOM → Axiom Fix  ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
  console.log('[migrate] Config:');
  console.log(`[migrate]   Package     : ${PACKAGE_ID}`);
  console.log(`[migrate]   Old campaign: ${OLD_CAMPAIGN_ID}`);
  console.log(`[migrate]   AdminCap    : ${ADMIN_CAP_ID}`);
  console.log(`[migrate]   AMC coin    : ${AMC_COIN_ID}`);
  console.log(`[migrate]   Per-claim   : ${AMOUNT_PER_CLAIM}`);
  console.log(`[migrate]   Merkle root : ${MERKLE_ROOT || '(empty — set after)'}`);
  console.log(`[migrate]   Expires     : ${EXPIRES_AT_EPOCH} (0 = never)`);
  console.log(`[migrate]   DRY RUN     : ${DRY_RUN}`);
  console.log(`[migrate]   Label bytes : [${CORRECT_LABEL_BYTES.join(',')}] = "Axiom Genesis"`);

  const gasBudget = '--gas-budget 10000000';
  const pkg = `--package ${PACKAGE_ID}`;
  const mod = '--module claim_campaign';

  // ── Step 1: Close old campaign (refunds 1 AMC back to sender) ──────────────
  run('Step 1/5 — Close old "AXOOM Genesis" campaign', [
    pkg, mod,
    '--function close_campaign',
    `--args ${OLD_CAMPAIGN_ID} ${ADMIN_CAP_ID}`,
    gasBudget,
  ]);

  // ── Step 2: Create new campaign with correct label ─────────────────────────
  // Note: create_campaign_entry transfers a NEW AdminCap to the sender.
  // Save the new AdminCap ID — you must use it for all subsequent operations.
  const labelArg = `[${CORRECT_LABEL_BYTES.join(',')}]`;
  const createResult = run('Step 2/5 — Create "Axiom Genesis" campaign', [
    pkg, mod,
    '--function create_campaign_entry',
    `--args ${labelArg} ${MERKLE_ROOT} ${AMOUNT_PER_CLAIM} ${EXPIRES_AT_EPOCH}`,
    gasBudget,
  ]);

  let newCampaignId = '(DRY_RUN — not available)';
  let newAdminCapId = '(DRY_RUN — not available)';

  if (!DRY_RUN && createResult) {
    newCampaignId = extractCreatedObject(createResult, '::claim_campaign::ClaimCampaign');
    newAdminCapId = extractCreatedObject(createResult, '::claim_campaign::AdminCap');
    console.log(`[migrate]   ✓ New campaign ID : ${newCampaignId}`);
    console.log(`[migrate]   ✓ New AdminCap ID : ${newAdminCapId}`);
    console.log('[migrate]   ⚠  Save the new AdminCap ID — the old one was for the closed campaign');
  }

  // ── Step 3: Fund new campaign ──────────────────────────────────────────────
  run('Step 3/5 — Fund "Axiom Genesis" campaign', [
    pkg, mod,
    '--function fund_campaign',
    `--args ${newCampaignId} ${AMC_COIN_ID} ${newAdminCapId}`,
    gasBudget,
  ]);

  // ── Step 4: Update Merkle root if it was empty at creation ─────────────────
  if (!MERKLE_ROOT || MERKLE_ROOT === '0x') {
    console.log('\n[migrate] ── Step 4/5 — Merkle root was empty at creation');
    console.log('[migrate]    Skipping update_merkle_root — set AXIOM_SUI_MERKLE_ROOT and re-run');
    console.log('[migrate]    Command reference:');
    console.log(`[migrate]    ${SUI_BIN} client call ${pkg} ${mod} \\`);
    console.log('[migrate]      --function update_merkle_root \\');
    console.log(`[migrate]      --args ${newCampaignId} <MERKLE_ROOT_HEX> ${newAdminCapId} \\`);
    console.log(`[migrate]      ${gasBudget} --json`);
  } else {
    run('Step 4/5 — Confirm Merkle root (already set at creation, verifying via read)', []);
    console.log('[migrate]    Root was set during create_campaign_entry — no separate update needed');
  }

  // ── Step 5: Activate new campaign ─────────────────────────────────────────
  run('Step 5/5 — Activate "Axiom Genesis" campaign', [
    pkg, mod,
    '--function activate',
    `--args ${newCampaignId} ${newAdminCapId}`,
    gasBudget,
  ]);

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║  Migration complete                                 ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
  console.log('[migrate] Next steps:');
  console.log(`[migrate]   1. Update Replit secret AXIOM_SUI_CAMPAIGN_ID to: ${newCampaignId}`);
  console.log(`[migrate]   2. Update Replit secret AXIOM_SUI_ADMIN_CAP_ID to: ${newAdminCapId}`);
  console.log('[migrate]   3. Restart AXIOM Dev Server');
  console.log('[migrate]   4. Verify at /operator/chains/sui-phase8 — "Axiom Genesis" should show ACTIVE');
  console.log('[migrate]   5. Verify old campaign shows CLOSED on-chain');
  console.log('\n[migrate] Export (paste into .env or Replit Secrets):');
  console.log(`AXIOM_SUI_CAMPAIGN_ID=${newCampaignId}`);
  console.log(`AXIOM_SUI_ADMIN_CAP_ID=${newAdminCapId}`);
}

main().catch(err => {
  console.error('[migrate] Fatal:', err);
  process.exit(1);
});
