// =============================================================================
// Axiom Protocol — Sui Testnet Smoke Test
// Package: axiom_claim_prototype (Sprint 1)
//
// Exercises the full campaign lifecycle end-to-end on Sui Testnet:
//   TX1  create_campaign_entry   → AdminCap + ClaimCampaign objects
//   TX2  mint + fund + allowlist + activate  (single PTB)
//   TX3  claim                   → Claimed event + ATC coin in wallet
//
// Reads SUI_DEPLOYER_KEY from environment.
// Reads deployment_result.json for packageId + treasuryCapId.
//
// Run:
//   npm run sui:smoke
// =============================================================================

import { Ed25519Keypair }        from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey }   from '@mysten/sui/cryptography';
import { SuiJsonRpcClient,
         getJsonRpcFullnodeUrl }  from '@mysten/sui/jsonRpc';
import { Transaction }            from '@mysten/sui/transactions';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname }       from 'path';
import { fileURLToPath }          from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// =============================================================================
// Config
// =============================================================================

const NETWORK      = 'testnet' as const;
const RESULT_FILE  = resolve(__dirname, '../packages/axiom_claim_prototype/deployment_result.json');
const SMOKE_FILE   = resolve(__dirname, '../packages/axiom_claim_prototype/smoke_result.json');
const GAS_BUDGET   = 100_000_000n;   // 0.1 SUI per tx — sufficient for entry calls
const MINT_AMOUNT  = 10_000_000n;    // 10 ATC (6 decimals) — funds the pool
const CLAIM_AMOUNT = 1_000_000n;     // 1 ATC per claim
const POLL_DELAY   = 2_000;          // ms between object-existence polls

// =============================================================================
// Load deployment result
// =============================================================================

interface DeploymentResult {
  network: string;
  packageId: string;
  treasuryCapId: string;
  digest: string;
}

let deploy: DeploymentResult;
try {
  deploy = JSON.parse(readFileSync(RESULT_FILE, 'utf8'));
} catch {
  console.error('\nERROR: deployment_result.json not found.');
  console.error('Run `npm run sui:deploy` first.\n');
  process.exit(1);
}

const { packageId, treasuryCapId } = deploy;
const COIN_TYPE = `${packageId}::axiom_test_claim::AXIOM_TEST_CLAIM`;

// =============================================================================
// Load keypair
// =============================================================================

const rawKey = process.env.SUI_DEPLOYER_KEY;
if (!rawKey) {
  console.error('\nERROR: SUI_DEPLOYER_KEY is not set in environment.\n');
  process.exit(1);
}

let keypair: Ed25519Keypair;
try {
  const { secretKey } = decodeSuiPrivateKey(rawKey);
  keypair = Ed25519Keypair.fromSecretKey(secretKey);
} catch (e: any) {
  console.error('\nERROR: Failed to decode SUI_DEPLOYER_KEY:', e.message, '\n');
  process.exit(1);
}

const signer = keypair.getPublicKey().toSuiAddress();

// =============================================================================
// Client
// =============================================================================

const client = new SuiJsonRpcClient({
  url:     getJsonRpcFullnodeUrl(NETWORK),
  network: NETWORK,
});

// =============================================================================
// Helpers
// =============================================================================

/** Submit a signed transaction, wait for full node indexing, then return. */
async function submitTx(tx: Transaction, label: string) {
  tx.setGasBudget(GAS_BUDGET);
  console.log(`  Submitting ${label}...`);

  const submitted = await client.signAndExecuteTransaction({
    signer:      keypair,
    transaction: tx,
    options: {
      showEffects:       true,
      showObjectChanges: true,
      showEvents:        true,
    },
  });

  // waitForTransaction polls until the full node has indexed the tx and all
  // mutated object versions are queryable. This prevents stale-version errors
  // on the next transaction that references the same objects (e.g. gas coin,
  // shared campaign object, TreasuryCap).
  const result = await client.waitForTransaction({
    digest:       submitted.digest,
    timeout:      60_000,
    pollInterval: 1_000,
    options: {
      showEffects:       true,
      showObjectChanges: true,
      showEvents:        true,
    },
  });

  const status = result.effects?.status?.status ?? 'unknown';
  if (status !== 'success') {
    console.error(`  ERROR: ${label} failed. Status: ${status}`);
    if (result.effects?.status?.error) {
      console.error('  Move abort:', result.effects.status.error);
    }
    process.exit(1);
  }
  console.log(`  ${label} OK — digest: ${result.digest}`);
  return result;
}

/** Wait until an owned object of the given type appears in the deployer wallet. */
async function waitForOwnedObject(objectType: string, timeoutMs = 30_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const resp = await client.getOwnedObjects({
      owner: signer,
      filter: { StructType: objectType },
      options: { showType: true },
    });
    const found = resp.data[0]?.data?.objectId;
    if (found) return found;
    await new Promise(r => setTimeout(r, POLL_DELAY));
  }
  console.error(`\nERROR: Timed out waiting for ${objectType} to appear in wallet.\n`);
  process.exit(1);
}

/** Find a shared ClaimCampaign object from tx objectChanges. */
function extractCreatedId(result: any, typeFragment: string): string | null {
  const changes: any[] = result.objectChanges ?? [];
  const found = changes.find(
    (c: any) => c.type === 'created' &&
    typeof c.objectType === 'string' &&
    c.objectType.includes(typeFragment)
  );
  return found?.objectId ?? null;
}

// =============================================================================
// Main smoke test
// =============================================================================

async function smoke() {
  console.log('\n=== Axiom Protocol — Sui Testnet Smoke Test ===');
  console.log('Network:        ', NETWORK);
  console.log('Signer:         ', signer);
  console.log('Package ID:     ', packageId);
  console.log('TreasuryCap:    ', treasuryCapId);
  console.log('Coin type:      ', COIN_TYPE);
  console.log('');

  // ---------------------------------------------------------------------------
  // Balance check
  // ---------------------------------------------------------------------------

  const balResp = await client.getBalance({ owner: signer, coinType: '0x2::sui::SUI' });
  const balMist = BigInt(balResp.totalBalance);
  console.log(`SUI balance:     ${balMist} MIST (${Number(balMist) / 1e9} SUI testnet)`);
  if (balMist < GAS_BUDGET * 4n) {
    console.error('\nERROR: Insufficient SUI for gas. Fund at https://faucet.testnet.sui.io/\n');
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // TX1 — create_campaign_entry
  //
  // Creates a new ClaimCampaign (shared) and transfers AdminCap to deployer.
  // amount_per_claim = CLAIM_AMOUNT (1 ATC in base units)
  // ---------------------------------------------------------------------------

  console.log('\n--- TX1: Create Campaign ---');
  const tx1 = new Transaction();
  tx1.moveCall({
    target:    `${packageId}::claim_campaign::create_campaign_entry`,
    arguments: [ tx1.pure.u64(CLAIM_AMOUNT) ],
  });
  const r1 = await submitTx(tx1, 'create_campaign_entry');

  // Extract ClaimCampaign shared object ID from objectChanges
  const campaignId = extractCreatedId(r1, 'claim_campaign::ClaimCampaign');
  if (!campaignId) {
    console.error('ERROR: ClaimCampaign object not found in TX1 objectChanges.');
    console.error('Changes:', JSON.stringify(r1.objectChanges, null, 2));
    process.exit(1);
  }
  console.log('  ClaimCampaign: ', campaignId);

  // AdminCap is transferred to deployer — poll until it appears in wallet
  const adminCapType = `${packageId}::claim_campaign::AdminCap`;
  console.log('  Polling for AdminCap in wallet...');
  const adminCapId = await waitForOwnedObject(adminCapType);
  console.log('  AdminCap:      ', adminCapId);

  // ---------------------------------------------------------------------------
  // TX2 — mint + fund + add_to_allowlist + activate (single PTB)
  //
  // Mints MINT_AMOUNT ATC from TreasuryCap, deposits into campaign pool,
  // adds deployer to allowlist, activates campaign.
  // ---------------------------------------------------------------------------

  console.log('\n--- TX2: Mint + Fund + Allowlist + Activate ---');
  const tx2 = new Transaction();

  // Mint MINT_AMOUNT (10 ATC) from TreasuryCap
  const [minted] = tx2.moveCall({
    target:         '0x2::coin::mint',
    typeArguments:  [ COIN_TYPE ],
    arguments: [
      tx2.object(treasuryCapId),
      tx2.pure.u64(MINT_AMOUNT),
    ],
  });

  // Fund campaign with minted coins
  tx2.moveCall({
    target:    `${packageId}::claim_campaign::fund_campaign`,
    arguments: [
      tx2.object(campaignId),
      minted,
      tx2.object(adminCapId),
    ],
  });

  // Add deployer address to allowlist
  tx2.moveCall({
    target:    `${packageId}::claim_campaign::add_to_allowlist`,
    arguments: [
      tx2.object(campaignId),
      tx2.pure.address(signer),
      tx2.object(adminCapId),
    ],
  });

  // Activate campaign (opens for claims)
  tx2.moveCall({
    target:    `${packageId}::claim_campaign::activate`,
    arguments: [
      tx2.object(campaignId),
      tx2.object(adminCapId),
    ],
  });

  const r2 = await submitTx(tx2, 'mint+fund+allowlist+activate');
  const fundEvent = (r2.events ?? []).find(
    (e: any) => typeof e.type === 'string' && e.type.includes('CampaignFunded')
  );
  if (fundEvent) {
    const d = fundEvent.parsedJson as any;
    console.log(`  CampaignFunded: added=${d?.added_amount}, pool=${d?.pool_total}`);
  }

  // ---------------------------------------------------------------------------
  // TX3 — claim
  //
  // Deployer address claims its 1 ATC allocation.
  // Expects a Claimed event and a new ATC Coin object in the wallet.
  // ---------------------------------------------------------------------------

  console.log('\n--- TX3: Claim ---');
  const tx3 = new Transaction();
  tx3.moveCall({
    target:    `${packageId}::claim_campaign::claim`,
    arguments: [ tx3.object(campaignId) ],
  });
  const r3 = await submitTx(tx3, 'claim');

  const claimEvent = (r3.events ?? []).find(
    (e: any) => typeof e.type === 'string' && e.type.includes('::Claimed')
  );
  if (!claimEvent) {
    console.error('\nERROR: Claimed event not found in TX3 events.');
    console.error('Events:', JSON.stringify(r3.events, null, 2));
    process.exit(1);
  }

  const claimed = claimEvent.parsedJson as any;
  console.log(`  Claimed event:`);
  console.log(`    claimer:  ${claimed?.claimer}`);
  console.log(`    amount:   ${claimed?.amount} base units (${Number(claimed?.amount) / 1e6} ATC)`);
  console.log(`    campaign: ${claimed?.campaign_id}`);

  // Verify ATC coin now in wallet
  const atcBalance = await client.getBalance({ owner: signer, coinType: COIN_TYPE });
  console.log(`\n  ATC wallet balance after claim: ${atcBalance.totalBalance} base units (${Number(atcBalance.totalBalance) / 1e6} ATC)`);

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  const smokeResult = {
    network:        NETWORK,
    deployer:       signer,
    packageId,
    campaignId,
    adminCapId,
    tx1Digest:      r1.digest,
    tx2Digest:      r2.digest,
    tx3Digest:      r3.digest,
    claimedAmount:  claimed?.amount,
    atcBalance:     atcBalance.totalBalance,
    explorerClaim:  `https://testnet.suiscan.xyz/tx/${r3.digest}`,
    timestamp:      new Date().toISOString(),
    status:         'PASS',
  };

  writeFileSync(SMOKE_FILE, JSON.stringify(smokeResult, null, 2));

  console.log('\n========================================');
  console.log('  SMOKE TEST RESULT: PASS');
  console.log('========================================');
  console.log('TX1 (create):   ', r1.digest);
  console.log('TX2 (fund):     ', r2.digest);
  console.log('TX3 (claim):    ', r3.digest);
  console.log('Claim explorer: ', smokeResult.explorerClaim);
  console.log('');
  console.log('Result saved to:', SMOKE_FILE);
  console.log('');
  console.log('G08 gate is now satisfiable — record TX3 digest in gate tracker.');
  console.log('');
}

smoke().catch(err => {
  console.error('\nSmoke test error:', err?.message ?? String(err));
  if (err?.stack) console.error(err.stack);
  process.exit(1);
});
