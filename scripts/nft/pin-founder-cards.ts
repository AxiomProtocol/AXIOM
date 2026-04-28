/**
 * One-off: pin the ten named Axiom Founder Collection card images to IPFS via
 * Pinata, then UPDATE nft_tokens.image_cid for tokenIds 1-10 on the founder
 * contract so the on-chain metadata route serves the named card art.
 *
 * Old CIDs (the original procedural AI art) remain pinned on Pinata, so
 * rollback is a single SQL UPDATE per row using the values written to
 * scripts/nft/founder-cards-pin-result.json.
 *
 * Run:
 *   npx tsx scripts/nft/pin-founder-cards.ts
 *
 * Required env: PINATA_JWT, DATABASE_URL, NFT_CONTRACT_FOUNDER (optional —
 * defaults to the deployed address baked in below).
 */

import * as fs from 'fs';
import * as path from 'path';
import { pool } from '../../lib/db';

const PINATA_PIN_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

const FOUNDER_CONTRACT =
  process.env.NFT_CONTRACT_FOUNDER ?? '0x4A651D30097E2b7326A83CbB32c02913dB8b3572';

const CARDS: Array<{ tokenId: number; file: string; mime: string; label: string }> = [
  { tokenId: 1,  file: 'founder-1.png',  mime: 'image/png',  label: 'The Architect'  },
  { tokenId: 2,  file: 'founder-2.png',  mime: 'image/png',  label: 'The Sovereign'  },
  { tokenId: 3,  file: 'founder-3.png',  mime: 'image/png',  label: 'The Vault'      },
  { tokenId: 4,  file: 'founder-4.png',  mime: 'image/png',  label: 'The Guardian'   },
  { tokenId: 5,  file: 'founder-5.png',  mime: 'image/png',  label: 'The Sentinel'   },
  { tokenId: 6,  file: 'founder-6.png',  mime: 'image/png',  label: 'The Builder'    },
  { tokenId: 7,  file: 'founder-7.jpg',  mime: 'image/jpeg', label: 'The Oracle'     },
  { tokenId: 8,  file: 'founder-8.jpg',  mime: 'image/jpeg', label: 'The Railmaster' },
  { tokenId: 9,  file: 'founder-9.jpg',  mime: 'image/jpeg', label: 'The Founder'    },
  { tokenId: 10, file: 'founder-10.jpg', mime: 'image/jpeg', label: 'The Apex'       },
];

async function pinToPinata(buf: Buffer, filename: string, mime: string): Promise<string> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error('PINATA_JWT is not set');

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(buf)], { type: mime }), filename);
  form.append('pinataMetadata', JSON.stringify({ name: `axiom-founder-${filename}` }));
  form.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

  const res = await fetch(PINATA_PIN_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Pinata upload failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { IpfsHash?: string };
  if (!data.IpfsHash) throw new Error('Pinata response missing IpfsHash');
  return data.IpfsHash;
}

async function main() {
  const baseDir = path.join(process.cwd(), 'public', 'nft-preview');

  console.log(`\n=== Axiom Founder Collection: pin 10 cards + remap DB ===`);
  console.log(`Contract: ${FOUNDER_CONTRACT}\n`);

  const results: Array<{
    tokenId: number;
    label: string;
    file: string;
    bytes: number;
    oldCid: string | null;
    newCid: string;
  }> = [];

  for (const card of CARDS) {
    const filePath = path.join(baseDir, card.file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Image file missing: ${filePath}`);
    }
    const buf = fs.readFileSync(filePath);

    const oldRes = await pool.query(
      'SELECT image_cid FROM nft_tokens WHERE token_id = $1 AND LOWER(contract_address) = LOWER($2)',
      [card.tokenId, FOUNDER_CONTRACT],
    );
    const oldCid: string | null = oldRes.rows[0]?.image_cid ?? null;

    process.stdout.write(
      `  [#${String(card.tokenId).padStart(3, '0')}] ${card.label.padEnd(15)} ${card.file.padEnd(18)} ${(buf.length / 1024).toFixed(0).padStart(5)} KB  ... `,
    );
    const newCid = await pinToPinata(buf, card.file, card.mime);
    console.log(newCid);

    await pool.query(
      'UPDATE nft_tokens SET image_cid = $1, updated_at = NOW() WHERE token_id = $2 AND LOWER(contract_address) = LOWER($3)',
      [newCid, card.tokenId, FOUNDER_CONTRACT],
    );

    results.push({
      tokenId: card.tokenId,
      label: card.label,
      file: card.file,
      bytes: buf.length,
      oldCid,
      newCid,
    });
  }

  console.log('\n=== Done. Rollback record (old CIDs preserved): ===');
  for (const r of results) {
    console.log(`  #${String(r.tokenId).padStart(3, '0')}  ${r.label.padEnd(15)}  old=${r.oldCid ?? '(none)'}  new=${r.newCid}`);
  }

  const outPath = path.join(process.cwd(), 'scripts/nft/founder-cards-pin-result.json');
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        pinnedAt: new Date().toISOString(),
        contractAddress: FOUNDER_CONTRACT,
        results,
      },
      null,
      2,
    ),
  );
  console.log(`\nWrote: ${outPath}`);

  await pool.end();
}

main().catch((err) => {
  console.error('\nFAILED:', err);
  process.exit(1);
});
