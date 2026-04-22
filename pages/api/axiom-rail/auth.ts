/**
 * Axiom Rail — SEP-10 Web Authentication
 *
 * GET  /api/axiom-rail/auth?account=<G...>   — returns challenge XDR
 * POST /api/axiom-rail/auth                  — verifies signed XDR, returns JWT
 *
 * Implements https://stellar.org/protocol/sep-10
 *
 * Security:
 *  - Open CORS (required: any Stellar wallet from any origin must authenticate).
 *  - Rate limited on POST (challenge verify): 20 per IP per minute.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  buildSep10Challenge,
  verifySep10Challenge,
  signRailJwt,
} from '../../../lib/multichain/stellar/axiom-rail/AxiomRailService';
import { setOpenCors, handlePreflight } from '../../../lib/multichain/stellar/axiom-rail/corsUtils';
import { checkRateLimit } from '../../../lib/multichain/stellar/axiom-rail/rateLimiter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setOpenCors(res);
  res.setHeader('Cache-Control', 'no-store');
  if (handlePreflight(req, res)) return;

  // ── GET: issue challenge ──────────────────────────────────────────────────────
  if (req.method === 'GET') {
    if (!checkRateLimit(req, res, 'sep10/auth-get', { max: 30, windowMs: 60_000 })) return;

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
    if (!checkRateLimit(req, res, 'sep10/auth-post', { max: 20, windowMs: 60_000 })) return;

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
