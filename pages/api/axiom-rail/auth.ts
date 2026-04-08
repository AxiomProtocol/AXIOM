/**
 * Axiom Rail — SEP-10 Web Authentication
 *
 * GET  /api/axiom-rail/auth?account=<G...>   — returns challenge XDR
 * POST /api/axiom-rail/auth                  — verifies signed XDR, returns JWT
 *
 * Implements https://stellar.org/protocol/sep-10
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  buildSep10Challenge,
  verifySep10Challenge,
  signRailJwt,
} from '../../../lib/multichain/stellar/axiom-rail/AxiomRailService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET: issue challenge ──────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const account = req.query.account as string;
    if (!account || !account.startsWith('G')) {
      return res.status(400).json({ error: 'account query param must be a valid Stellar public key' });
    }

    try {
      const transaction = await buildSep10Challenge(account);
      return res.status(200).json({
        transaction,
        network_passphrase: 'Public Global Stellar Network ; September 2015',
      });
    } catch (err) {
      console.error('[AxiomRail SEP-10] Challenge build error:', err);
      return res.status(500).json({ error: 'Failed to build challenge' });
    }
  }

  // ── POST: verify signed challenge → return JWT ────────────────────────────────
  if (req.method === 'POST') {
    const { transaction } = req.body as { transaction?: string };
    if (!transaction) {
      return res.status(400).json({ error: 'transaction field required in request body' });
    }

    const result = await verifySep10Challenge(transaction);
    if (!result.valid) {
      return res.status(400).json({ error: result.error ?? 'Challenge verification failed' });
    }

    const token = signRailJwt(result.account);
    return res.status(200).json({ token });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
