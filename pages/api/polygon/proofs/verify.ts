/**
 * POST /api/polygon/proofs/verify
 *
 * Off-chain Merkle proof verification for Polygon campaign claims.
 * Validates a serialized proof against the campaign root before
 * submitting to the smart contract.
 *
 * Body: SerializedProof { root, leaf, proof, chainId, campaignId }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyPolygonProof } from '../../../../lib/polygon/proofs/verifyProof';
import type { SerializedProof, ProofVerificationResult } from '../../../../lib/polygon/proofs/verifyProof';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProofVerificationResult | { error: string }>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const body = req.body as Partial<SerializedProof>;

  if (!body.root || !body.leaf || !body.proof || !body.chainId || !body.campaignId) {
    return res.status(400).json({ error: 'Missing required fields: root, leaf, proof, chainId, campaignId.' });
  }

  try {
    const result = verifyPolygonProof(body as SerializedProof);
    const status = result.valid ? 200 : 422;
    return res.status(status).json(result);
  } catch (err) {
    console.error('[polygon/proofs/verify] Error:', err);
    return res.status(500).json({ error: 'Proof verification failed unexpectedly.' });
  }
}
