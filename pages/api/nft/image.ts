import type { NextApiRequest, NextApiResponse } from 'next';
import { ensureNFTTables, getNFTToken } from '../../../lib/nft/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { tokenId, contractAddress } = req.query;
  if (!tokenId || !contractAddress || typeof tokenId !== 'string' || typeof contractAddress !== 'string') {
    return res.status(400).json({ error: 'Missing tokenId or contractAddress' });
  }

  try {
    await ensureNFTTables();
    const row = await getNFTToken(parseInt(tokenId), contractAddress);

    if (!row?.image_data) {
      return res.status(404).json({ error: 'No generated image for this token yet' });
    }

    const dataUrl: string = row.image_data;
    const [header, base64] = dataUrl.split(',');
    const mimeType = header.match(/data:([^;]+)/)?.[1] ?? 'image/png';
    const buf = Buffer.from(base64, 'base64');

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.status(200).send(buf);
  } catch (err) {
    console.error('[api/nft/image]', err);
    return res.status(500).json({ error: 'Image retrieval failed' });
  }
}
