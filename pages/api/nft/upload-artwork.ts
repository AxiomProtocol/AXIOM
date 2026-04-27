/**
 * POST /api/nft/upload-artwork
 *
 * Accepts a multipart image upload for a specific NFT token,
 * pins it to IPFS via Pinata, updates the DB, and writes the
 * cached preview PNG to public/nft-preview/.
 *
 * Body (multipart/form-data):
 *   file        — image file (PNG, JPG, WebP, etc.)
 *   tokenId     — numeric token ID
 *   contractKey — "founder" | "participation" | "land"
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { Fields, Files } from 'formidable';
type FormidableFile = formidable.File;
import * as fs from 'fs';
import * as path from 'path';
import { pool } from '../../../lib/db';

export const config = { api: { bodyParser: false } };

const CONTRACT_ADDRESSES: Record<string, string> = {
  founder:       process.env.NFT_CONTRACT_FOUNDER ?? '',
  participation: process.env.NFT_CONTRACT_PARTICIPATION ?? '',
  land:          process.env.NFT_CONTRACT_LAND ?? '',
};

const CONTRACT_TYPES: Record<string, string> = {
  founder:       'ERC721',
  participation: 'ERC1155',
  land:          'ERC1155',
};

const PINATA_PIN_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

async function pinToPinata(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error('PINATA_JWT is not configured');

  const form = new FormData();
  const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
  form.append('file', blob, filename);
  form.append('pinataMetadata', JSON.stringify({ name: filename }));
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

  const data = (await res.json()) as { IpfsHash: string };
  if (!data.IpfsHash) throw new Error('Pinata response missing IpfsHash');
  return data.IpfsHash;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse multipart form
  const form = formidable({ maxFileSize: 20 * 1024 * 1024 /* 20 MB */ });
  let fields: Fields;
  let files: Files;
  try {
    [fields, files] = await new Promise<[Fields, Files]>((resolve, reject) => {
      form.parse(req, (err, f, fi) => (err ? reject(err) : resolve([f, fi])));
    });
  } catch (err: unknown) {
    return res.status(400).json({ error: `Form parse error: ${err instanceof Error ? err.message : err}` });
  }

  const tokenId     = parseInt(String(Array.isArray(fields.tokenId)     ? fields.tokenId[0]     : fields.tokenId),     10);
  const contractKey = String(Array.isArray(fields.contractKey) ? fields.contractKey[0] : fields.contractKey).toLowerCase();

  if (isNaN(tokenId) || tokenId < 1) {
    return res.status(400).json({ error: 'Invalid tokenId' });
  }
  if (!CONTRACT_ADDRESSES[contractKey]) {
    return res.status(400).json({ error: `Unknown contractKey: ${contractKey}` });
  }

  const fileField = files.file;
  const file: FormidableFile | undefined = Array.isArray(fileField) ? fileField[0] : fileField;
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const mimeType   = file.mimetype ?? 'image/png';
  const ext        = file.originalFilename?.split('.').pop() ?? 'png';
  const filename   = `axiom-nft-${contractKey}-${tokenId}.${ext}`;
  const fileBuffer = fs.readFileSync(file.filepath);

  try {
    // 1. Pin to IPFS
    const cid = await pinToPinata(fileBuffer, filename, mimeType);

    // 2. Write cached preview PNG (always as .png filename even if source is jpg)
    const previewDir  = path.join(process.cwd(), 'public', 'nft-preview');
    if (!fs.existsSync(previewDir)) fs.mkdirSync(previewDir, { recursive: true });
    fs.writeFileSync(path.join(previewDir, `${contractKey}-${tokenId}.png`), fileBuffer);

    // 3. Upsert into DB
    const contractAddress = CONTRACT_ADDRESSES[contractKey];
    const contractType    = CONTRACT_TYPES[contractKey];
    const dataUrl         = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

    await pool.query(`
      INSERT INTO nft_tokens
        (token_id, contract_address, contract_type, image_cid, image_data, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (token_id, contract_address)
      DO UPDATE SET
        image_cid  = EXCLUDED.image_cid,
        image_data = EXCLUDED.image_data,
        updated_at = NOW()
    `, [tokenId, contractAddress, contractType, cid, dataUrl]);

    return res.status(200).json({ success: true, cid, tokenId, contractKey });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[upload-artwork]', msg);
    return res.status(500).json({ error: msg });
  }
}
