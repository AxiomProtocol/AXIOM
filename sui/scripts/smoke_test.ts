// =============================================================================
// Axiom Protocol — Sui Testnet Smoke Test
// Package: axiom_claim_prototype (Sprint 2 — merkle root variant)
//
// Exercises the full Sprint 2 campaign lifecycle end-to-end on Sui Testnet:
//   TX1  create_campaign_entry   → AdminCap + ClaimCampaign (merkle root set)
//   TX2  mint + fund + activate  (single PTB)
//   TX3  claim with merkle proof → Claimed event + ATC coin in wallet
//
// Merkle tree construction (TypeScript side):
//   For a single-address tree (just the deployer):
//     leaf = keccak256(BCS(deployer_address) || BCS(amount_per_claim))
//     root = leaf      (single-leaf: root equals the leaf)
//     proof = []       (empty proof)
//
//   This matches the Move implementation in merkle::compute_leaf and
//   merkle::verify_proof exactly.
//
// Reads SUI_DEPLOYER_KEY from environment.
// Reads deployment_result.json for packageId + treasuryCapId.
//
// Run:
//   npm run sui:smoke
// =============================================================================

import { Ed25519Keypair }       from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey }  from '@mysten/sui/cryptography';
import { SuiJsonRpcClient,
         getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { Transaction }           from '@mysten/sui/transactions';
import { keccak_256 }            from '@noble/hashes/sha3';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname }      from 'path';
import { fileURLToPath }         from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// =============================================================================
// Config
// =============================================================================

const NETWORK      = 'testnet' as const;
const RESULT_FILE  = resolve(__dirname, '../packages/axiom_claim_prototype/deployment_result.json');
const SMOKE_FILE   = resolve(__dirname, '../packages/axiom_claim_prototype/smoke_result.json');
const GAS_BUDGET   = 100_000_000n;   // 0.1 SUI per tx
const MINT_AMOUNT  = 10_000_000n;    // 10 ATC (6 decimals) — funds the pool
const CLAIM_AMOUNT = 1_000_000n;     // 1 ATC per claim
const POLL_DELAY   = 2_000;          // ms between polls
const NO_EXPIRY    = 0n;             // 0 = never expires

// =============================================================================
// Load deployment result
// =============================================================================

interface DeploymentResult {
  network: string;
  packageId: string;
  treasuryCapId?: string;  // optional — resolved from wallet if absent
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

const { packageId } = deploy;
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
// Merkle helpers
// =============================================================================

/**
 * Compute the merkle leaf for (address, amount) matching the Move implementation:
 *   leaf = keccak256(BCS(address) || BCS(u64_amount))
 *
 * BCS(address) = 32 raw bytes of the Sui address (hex → bytes, zero-padded)
 * BCS(u64)     =  8 bytes little-endian
 *
 * Must exactly match merkle::compute_leaf in merkle.move.
 * No BCS library dependency — manual encoding to avoid API version skew.
 */
function computeLeaf(addr: string, amount: bigint): Uint8Array {
  // Parse Sui address: strip 0x, zero-pad to 64 hex chars (32 bytes)
  const hex     = (addr.startsWith('0x') ? addr.slice(2) : addr).padStart(64, '0');
  const addrBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    addrBytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  // Encode u64 as 8 bytes little-endian
  const amountBytes = new Uint8Array(8);
  let val = amount;
  for (let i = 0; i < 8; i++) {
    amountBytes[i] = Number(val & 0xffn);
    val >>= 8n;
  }

  // Concatenate and hash
  const preimage = new Uint8Array(40);
  preimage.set(addrBytes, 0);
  preimage.set(amountBytes, 32);
  return keccak_256(preimage);
}

/**
 * BCS-serialize vector<vector<u8>> for use as a PTB pure argument.
 *
 * BCS encoding:
 *   - Outer vector length: ULEB128
 *   - Each inner vector: ULEB128 length + bytes
 *
 * An empty proof [] = 0x00 (ULEB128(0)).
 */
function serializeProof(proof: Uint8Array[]): Uint8Array {
  if (proof.length === 0) return new Uint8Array([0x00]);

  // Encode non-empty proof manually
  const parts: Uint8Array[] = [];
  parts.push(encodeUleb128(proof.length));
  for (const elem of proof) {
    parts.push(encodeUleb128(elem.length));
    parts.push(elem);
  }
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out   = new Uint8Array(total);
  let   off   = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

function encodeUleb128(n: number): Uint8Array {
  const buf: number[] = [];
  do {
    let byte = n & 0x7f;
    n >>= 7;
    if (n !== 0) byte |= 0x80;
    buf.push(byte);
  } while (n !== 0);
  return new Uint8Array(buf);
}

/**
 * BCS-encode vector<u8>: ULEB128(length) || bytes
 * Used for label_bytes and merkle_root arguments (both typed vector<u8> in Move).
 */
function encodeVectorU8(data: Uint8Array): Uint8Array {
  const lenBytes = encodeUleb128(data.length);
  const out      = new Uint8Array(lenBytes.length + data.length);
  out.set(lenBytes, 0);
  out.set(data, lenBytes.length);
  return out;
}

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
  // mutated object versions are queryable. Prevents stale-version errors on
  // the next transaction that references the same objects.
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
      owner:   signer,
      filter:  { StructType: objectType },
      options: { showType: true },
    });
    const found = resp.data[0]?.data?.objectId;
    if (found) return found;
    await new Promise(r => setTimeout(r, POLL_DELAY));
  }
  console.error(`\nERROR: Timed out waiting for ${objectType} to appear in wallet.\n`);
  process.exit(1);
}

/** Find a created object of the given type from tx objectChanges. */
function extractCreatedId(result: any, typeFragment: string): string | null {
  const changes: any[] = result.objectChanges ?? [];
  const found = changes.find(
    (c: any) =>
      c.type === 'created' &&
      typeof c.objectType === 'string' &&
      c.objectType.includes(typeFragment)
  );
  return found?.objectId ?? null;
}

// =============================================================================
// Main smoke test
// =============================================================================

async function smoke() {
  console.log('\n=== Axiom Protocol — Sui Testnet Smoke Test (Sprint 2) ===');
  console.log('Network:        ', NETWORK);
  console.log('Signer:         ', signer);
  console.log('Package ID:     ', packageId);
  console.log('Coin type:      ', COIN_TYPE);
  console.log('');

  // ---------------------------------------------------------------------------
  // Resolve TreasuryCap
  //
  // Prefer deployment_result.json (Sprint 1 scripts wrote it there).
  // If absent (Sprint 2 deploy script omits it), query the wallet directly —
  // the TreasuryCap<AXIOM_TEST_CLAIM> is transferred to the deployer by the
  // package `init` function at publish time.
  // ---------------------------------------------------------------------------

  let treasuryCapId = deploy.treasuryCapId ?? '';
  if (!treasuryCapId) {
    console.log('TreasuryCap not in deployment file — querying wallet...');
    const treasuryCapType = `0x2::coin::TreasuryCap<${COIN_TYPE}>`;
    treasuryCapId = await waitForOwnedObject(treasuryCapType, 15_000);
    console.log('TreasuryCap found: ', treasuryCapId);
  } else {
    console.log('TreasuryCap:     ', treasuryCapId);
  }
  console.log('');

  // ---------------------------------------------------------------------------
  // Build merkle tree (single-leaf: just the deployer)
  // ---------------------------------------------------------------------------

  const leaf       = computeLeaf(signer, CLAIM_AMOUNT);
  const merkleRoot = leaf;                   // single-leaf tree: root == leaf
  const proof: Uint8Array[] = [];            // empty proof for single-leaf

  console.log('Merkle:');
  console.log('  leaf (hex):  ', Buffer.from(leaf).toString('hex'));
  console.log('  root (hex):  ', Buffer.from(merkleRoot).toString('hex'));
  console.log('  proof:        [] (single-leaf tree)');
  console.log('');

  // ---------------------------------------------------------------------------
  // Balance check
  // ---------------------------------------------------------------------------

  const balResp = await client.getBalance({ owner: signer, coinType: '0x2::sui::SUI' });
  const balMist  = BigInt(balResp.totalBalance);
  console.log(`SUI balance:     ${balMist} MIST (${Number(balMist) / 1e9} SUI testnet)`);
  if (balMist < GAS_BUDGET * 4n) {
    console.error('\nERROR: Insufficient SUI for gas. Fund at https://faucet.testnet.sui.io/\n');
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // TX1 — create_campaign_entry
  //
  // Creates a new ClaimCampaign (shared) with the computed merkle root and
  // transfers AdminCap to the deployer.
  //
  // Signature:
  //   create_campaign_entry(
  //     label_bytes:      vector<u8>,   — raw UTF-8 bytes for human label
  //     merkle_root:      vector<u8>,   — keccak256 root of eligibility tree
  //     amount_per_claim: u64,
  //     expires_at_epoch: u64,          — 0 = no expiration
  //     ctx: &mut TxContext,
  //   )
  // ---------------------------------------------------------------------------

  console.log('\n--- TX1: Create Campaign ---');
  const labelBytes = new TextEncoder().encode('axiom-sprint2-smoke');

  const tx1 = new Transaction();
  tx1.moveCall({
    target:    `${packageId}::claim_campaign::create_campaign_entry`,
    arguments: [
      tx1.pure(encodeVectorU8(labelBytes)),
      tx1.pure(encodeVectorU8(merkleRoot)),
      tx1.pure.u64(CLAIM_AMOUNT),
      tx1.pure.u64(NO_EXPIRY),
    ],
  });
  const r1 = await submitTx(tx1, 'create_campaign_entry');

  const campaignId = extractCreatedId(r1, 'claim_campaign::ClaimCampaign');
  if (!campaignId) {
    console.error('ERROR: ClaimCampaign object not found in TX1 objectChanges.');
    console.error('Changes:', JSON.stringify(r1.objectChanges, null, 2));
    process.exit(1);
  }
  console.log('  ClaimCampaign: ', campaignId);

  const adminCapType = `${packageId}::claim_campaign::AdminCap`;
  console.log('  Polling for AdminCap in wallet...');
  const adminCapId = await waitForOwnedObject(adminCapType);
  console.log('  AdminCap:      ', adminCapId);

  // ---------------------------------------------------------------------------
  // TX2 — mint + fund + activate (single PTB)
  //
  // Mints MINT_AMOUNT ATC from TreasuryCap, deposits into campaign pool,
  // activates the campaign. No allowlist step in Sprint 2 (merkle handles
  // eligibility at claim time).
  // ---------------------------------------------------------------------------

  console.log('\n--- TX2: Mint + Fund + Activate ---');
  const tx2 = new Transaction();

  // Mint MINT_AMOUNT (10 ATC) from TreasuryCap
  const [minted] = tx2.moveCall({
    target:        '0x2::coin::mint',
    typeArguments: [COIN_TYPE],
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

  // Activate campaign (opens for claims)
  tx2.moveCall({
    target:    `${packageId}::claim_campaign::activate`,
    arguments: [
      tx2.object(campaignId),
      tx2.object(adminCapId),
    ],
  });

  const r2 = await submitTx(tx2, 'mint+fund+activate');
  const fundEvent = (r2.events ?? []).find(
    (e: any) => typeof e.type === 'string' && e.type.includes('CampaignFunded')
  );
  if (fundEvent) {
    const d = fundEvent.parsedJson as any;
    console.log(`  CampaignFunded: added=${d?.added_amount}, pool=${d?.pool_total}`);
  }

  // ---------------------------------------------------------------------------
  // TX3 — claim with merkle proof
  //
  // Deployer submits an empty proof (valid for single-leaf tree where root==leaf).
  // The contract verifies: compute_leaf(sender, amount_per_claim) == root.
  //
  // Signature:
  //   claim(campaign: &mut ClaimCampaign, proof: vector<vector<u8>>, ctx)
  // ---------------------------------------------------------------------------

  console.log('\n--- TX3: Claim (merkle proof) ---');
  const tx3 = new Transaction();
  tx3.moveCall({
    target:    `${packageId}::claim_campaign::claim`,
    arguments: [
      tx3.object(campaignId),
      tx3.pure(serializeProof(proof)), // [] — empty proof for single-leaf tree
    ],
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
    sprint:         'Sprint 2 — merkle root variant',
    network:        NETWORK,
    deployer:       signer,
    packageId,
    campaignId,
    adminCapId,
    merkleRoot:     Buffer.from(merkleRoot).toString('hex'),
    proofLength:    proof.length,
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
  console.log('  SMOKE TEST RESULT: PASS  (Sprint 2)');
  console.log('========================================');
  console.log('TX1 (create):   ', r1.digest);
  console.log('TX2 (fund):     ', r2.digest);
  console.log('TX3 (claim):    ', r3.digest);
  console.log('Claim explorer: ', smokeResult.explorerClaim);
  console.log('');
  console.log('Result saved to:', SMOKE_FILE);
  console.log('');
  console.log('Sprint 2 smoke test complete. G08 Sprint 2 clause satisfiable.');
  console.log('');
}

smoke().catch(err => {
  console.error('\nSmoke test error:', err?.message ?? String(err));
  if (err?.stack) console.error(err.stack);
  process.exit(1);
});
