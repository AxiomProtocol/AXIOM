import type { NextApiRequest, NextApiResponse } from 'next';
import { ensureNFTTables, getNFTToken } from '../../../lib/nft/db';
import { computeSeed, computeTraits, generateAnimationHTML } from '../../../lib/nft/traitEngine';

const DEFAULT_DEPLOY_BLOCK = 300000000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const { tokenId, contract } = req.query;
  const tokenIdNum = parseInt(typeof tokenId === 'string' ? tokenId : '1', 10);
  const contractAddress = typeof contract === 'string' ? contract : process.env.NFT_CONTRACT_FOUNDER ?? '';

  await ensureNFTTables();

  let seed: string;
  try {
    const tokenRow = await getNFTToken(tokenIdNum, contractAddress);
    seed = tokenRow?.trait_seed ?? computeSeed(tokenIdNum, contractAddress, DEFAULT_DEPLOY_BLOCK);
  } catch {
    seed = computeSeed(tokenIdNum, contractAddress, DEFAULT_DEPLOY_BLOCK);
  }

  try {
    const traits = computeTraits(seed);
    const html = generateAnimationHTML(tokenIdNum, traits);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=86400');
    // X-Frame-Options intentionally omitted — OpenSea and other marketplaces
    // embed animation_url via iframe from a cross-origin domain. SAMEORIGIN
    // would block that rendering entirely.
    return res.status(200).send(html);
  } catch (err) {
    console.error('[api/nft/animation]', err);
    return res.status(500).end();
  }
}
