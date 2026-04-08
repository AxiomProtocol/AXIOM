/**
 * GET /api/axiom-rail/sep24/info
 *
 * SEP-24 anchor info — lists supported assets, fees, and limits.
 * Public endpoint per SEP-24 spec.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAxiomRailSep24Info } from '../../../../lib/multichain/stellar/axiom-rail/AxiomRailService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Cache-Control', 'public, max-age=60');
  res.setHeader('Access-Control-Allow-Origin', '*');

  return res.status(200).json(getAxiomRailSep24Info());
}
