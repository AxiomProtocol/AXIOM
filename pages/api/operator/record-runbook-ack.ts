/**
 * POST /api/operator/record-runbook-ack
 *
 * Operator-cookie-protected endpoint that records a runbook
 * acknowledgment. Reads the runbook file, computes its current
 * sha256 hash, and writes a runbook_ack row to launch_attestations.
 *
 * Body: { runbook: string, ackedBy: string, notes?: string }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../../../server/db';
import { launchAttestations } from '../../../shared/launchAttestationsSchema';
import {
  isValidOperatorKey,
  readOperatorCookie,
  OPERATOR_HEADER_KEY,
} from '../../../lib/capinfra/operatorAuth';

const ALLOWED_RUNBOOKS = [
  'docs/operator/scheduler-runbook.md',
  'docs/solvency/ame-operations-runbook.md',
] as const;

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

  const { runbook, ackedBy, notes } = req.body ?? {};

  if (!runbook || typeof runbook !== 'string') {
    return res.status(400).json({ error: 'runbook path is required' });
  }
  if (!ALLOWED_RUNBOOKS.includes(runbook as typeof ALLOWED_RUNBOOKS[number])) {
    return res.status(400).json({ error: `Unknown runbook: ${runbook}`, allowed: ALLOWED_RUNBOOKS });
  }
  if (!ackedBy || typeof ackedBy !== 'string' || !ackedBy.trim()) {
    return res.status(400).json({ error: 'ackedBy is required' });
  }

  let hash: string;
  try {
    const abs = path.join(process.cwd(), runbook);
    hash = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
  } catch {
    return res.status(500).json({ error: `Runbook file unreadable: ${runbook}` });
  }

  try {
    const inserted = await db
      .insert(launchAttestations)
      .values({
        kind: 'runbook_ack',
        ref: runbook,
        ackedBy: ackedBy.trim(),
        hash,
        notes: typeof notes === 'string' && notes.trim()
          ? notes.trim()
          : `Runbook reviewed and acknowledged — ${runbook}`,
        metadata: {
          source: 'operator-console',
          attestedAt: new Date().toISOString(),
        },
      })
      .returning();

    return res.status(200).json({ success: true, attestation: inserted[0], hash });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Failed to record runbook ack', detail: msg });
  }
}
