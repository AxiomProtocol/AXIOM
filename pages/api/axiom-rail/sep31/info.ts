/**
 * GET /api/axiom-rail/sep31/info
 *
 * SEP-31 direct payment server info.
 * Describes Axiom Rail's supported assets and required fields for
 * direct cross-border USDC payments settled via Increase ACH/Wire.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAxiomRailSep31Info } from '../../../../lib/multichain/stellar/axiom-rail/AxiomRailService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Cache-Control', 'public, max-age=60');
  res.setHeader('Access-Control-Allow-Origin', '*');

  return res.status(200).json(getAxiomRailSep31Info());
}
