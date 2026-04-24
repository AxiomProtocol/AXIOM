/**
 * GET /api/axiom-rail/sep38/info
 *
 * SEP-38 anchor quote server info.
 * Lists all assets Axiom Rail can exchange and their supported delivery methods.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAxiomRailSep38Assets } from '../../../../lib/multichain/stellar/axiom-rail/AxiomRailService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Cache-Control', 'public, max-age=60');
  res.setHeader('Access-Control-Allow-Origin', '*');

  return res.status(200).json({ assets: getAxiomRailSep38Assets() });
}
