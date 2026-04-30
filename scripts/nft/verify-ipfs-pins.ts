/**
 * Verify that all expected NFT tokens have IPFS CIDs pinned in the database.
 * Usage:  npx ts-node scripts/nft/verify-ipfs-pins.ts
 *
 * Exits 0 if all tokens have a valid CID, 1 otherwise.
 */

import { Pool } from 'pg';

// Contract addresses: prefer env vars so the script stays correct after redeployment.
// Fallback to the known mainnet addresses used at time of initial IPFS pinning.
const FOUNDER_CONTRACT = (
  process.env.NFT_CONTRACT_FOUNDER ?? '0x4A651D30097E2b7326A83CbB32c02913dB8b3572'
).toLowerCase();
const PARTICIPATION_CONTRACT = (
  process.env.NFT_CONTRACT_PARTICIPATION ?? '0x67f8c7da647AbD50AFb1E2137553Be8c174342Ce'
).toLowerCase();

const EXPECTED: Array<{ contract: string; label: string; tokenIds: number[] }> = [
  {
    label: 'Axiom Founder Badge',
    contract: FOUNDER_CONTRACT,
    tokenIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  },
  {
    label: 'Axiom Participation',
    contract: PARTICIPATION_CONTRACT,
    tokenIds: [1, 2, 3, 4, 5, 6],
  },
];

const IPFS_GATEWAY = 'https://nftstorage.link/ipfs';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(' NFT IPFS Pin Verification');
  console.log('═══════════════════════════════════════════════════════\n');

  let totalExpected = 0;
  let totalPinned = 0;
  const missing: string[] = [];

  for (const collection of EXPECTED) {
    console.log(`Collection: ${collection.label}`);
    console.log(`Contract  : ${collection.contract}`);

    const { rows } = await pool.query<{ token_id: number; image_cid: string | null }>(
      `SELECT token_id, image_cid
         FROM nft_tokens
        WHERE LOWER(contract_address) = $1
          AND token_id = ANY($2)
        ORDER BY token_id`,
      [collection.contract, collection.tokenIds]
    );

    const rowMap = new Map(rows.map((r) => [r.token_id, r.image_cid]));

    for (const id of collection.tokenIds) {
      totalExpected++;
      const cid = rowMap.get(id);
      const isValid = !!cid && !cid.startsWith('sha256:');
      if (isValid) {
        totalPinned++;
        console.log(`  ✓ Token #${id}  ${IPFS_GATEWAY}/${cid}`);
      } else {
        missing.push(`${collection.label} #${id}`);
        console.log(`  ✗ Token #${id}  MISSING or invalid CID (got: ${cid ?? 'null'})`);
      }
    }
    console.log();
  }

  console.log('───────────────────────────────────────────────────────');
  console.log(` Total expected : ${totalExpected}`);
  console.log(` Pinned to IPFS : ${totalPinned}/${totalExpected}`);
  if (missing.length > 0) {
    console.log(` Missing        : ${missing.join(', ')}`);
  }
  console.log('───────────────────────────────────────────────────────\n');

  await pool.end();
  process.exit(missing.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
