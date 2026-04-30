/**
 * POST /api/operator/record-key-attestation
 *
 * Operator-authenticated endpoint that writes a durable key_rotation
 * attestation to launch_attestations. Authentication is the same
 * ADMIN_SOLVENCY_KEY used by the operator console cookie — no secret
 * needs to be re-entered. The server reads ADMIN_SOLVENCY_KEY from
 * process.env and records sha256(key) as a tamper-evident fingerprint,
 * proving the current key value was observed at attestation time.
 *
 * Auth: x-admin-key header OR cap_operator_key cookie (both must
 * equal ADMIN_SOLVENCY_KEY via constant-time compare).
 *
 * Body: { ackedBy: string, notes?: string }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'node:crypto';
import { db } from '../../../server/db';
import { launchAttestations } from '../../../shared/launchAttestationsSchema';
import {
  isValidOperatorKey,
  readOperatorCookie,
  OPERATOR_HEADER_KEY,
} from '../../../lib/capinfra/operatorAuth';

const TARGET_REF = 'ADMIN_SOLVENCY_KEY';

function getCallerKey(req: NextApiRequest): string | null {
  const header = req.headers[OPERATOR_HEADER_KEY];
  if (typeof header === 'string' && header) return header;
  return readOperatorCookie(req);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const callerKey = getCallerKey(req);
  if (!isValidOperatorKey(callerKey)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const adminKey = process.env.ADMIN_SOLVENCY_KEY;
  if (!adminKey) {
    return res.status(503).json({ error: 'ADMIN_SOLVENCY_KEY not configured on this server' });
  }

  const { ackedBy, notes } = req.body ?? {};
  if (!ackedBy || typeof ackedBy !== 'string' || !ackedBy.trim()) {
    return res.status(400).json({ error: 'ackedBy is required' });
  }

  const fingerprint = crypto.createHash('sha256').update(adminKey).digest('hex');

  try {
    const inserted = await db
      .insert(launchAttestations)
      .values({
        kind: 'key_rotation',
        ref: TARGET_REF,
        ackedBy: ackedBy.trim(),
        hash: fingerprint,
        notes: typeof notes === 'string' && notes.trim() ? notes.trim() : 'ADMIN_SOLVENCY_KEY rotation acknowledged — custody attested.',
        metadata: {
          source: 'operator-console',
          attestedAt: new Date().toISOString(),
        },
      })
      .returning();

    return res.status(200).json({
      success: true,
      attestation: inserted[0],
      fingerprint,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Failed to record attestation', detail: msg });
  }
}
