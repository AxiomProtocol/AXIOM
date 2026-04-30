import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../../../server/db';
import { launchAttestations } from '../../../shared/launchAttestationsSchema';
import { desc } from 'drizzle-orm';

const ADMIN_KEY = process.env.ADMIN_SOLVENCY_KEY;

const RUNBOOKS = [
  'docs/operator/scheduler-runbook.md',
  'docs/solvency/ame-operations-runbook.md',
] as const;

function sha256OfFile(relPath: string): string | null {
  try {
    const abs = path.join(process.cwd(), relPath);
    const buf = fs.readFileSync(abs);
    return crypto.createHash('sha256').update(buf).digest('hex');
  } catch {
    return null;
  }
}

function checkAdmin(req: NextApiRequest, res: NextApiResponse): boolean {
  if (!ADMIN_KEY) {
    res.status(503).json({ error: 'ADMIN_SOLVENCY_KEY not configured' });
    return false;
  }
  if (req.headers['x-admin-key'] !== ADMIN_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkAdmin(req, res)) return;

  if (req.method === 'GET') {
    try {
      const rows = await db
        .select()
        .from(launchAttestations)
        .orderBy(desc(launchAttestations.ackedAt))
        .limit(200);

      // Build current runbook hash map so the caller can detect drift.
      const runbookHashes: Record<string, string | null> = {};
      for (const rb of RUNBOOKS) runbookHashes[rb] = sha256OfFile(rb);

      // For each runbook, compute ack status against the current file hash.
      const runbookAcks = RUNBOOKS.map((rb) => {
        const currentHash = runbookHashes[rb];
        const latestAck = rows.find((r) => r.kind === 'runbook_ack' && r.ref === rb);
        return {
          runbook: rb,
          currentHash,
          ack: latestAck
            ? {
                ackedBy: latestAck.ackedBy,
                ackedAt: latestAck.ackedAt,
                ackedHash: latestAck.hash,
                hashMatchesCurrent: latestAck.hash === currentHash,
              }
            : null,
        };
      });

      const keyRotations = rows
        .filter((r) => r.kind === 'key_rotation')
        .map((r) => ({
          ref: r.ref,
          ackedBy: r.ackedBy,
          ackedAt: r.ackedAt,
          hash: r.hash,
          notes: r.notes,
          metadata: r.metadata,
        }));

      return res.status(200).json({
        success: true,
        attestations: rows,
        runbookAcks,
        keyRotations,
        runbookHashes,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: 'Failed to load attestations', detail: msg });
    }
  }

  if (req.method === 'POST') {
    try {
      const { kind, ref, ackedBy, notes, metadata } = req.body ?? {};
      if (!kind || !ref || !ackedBy) {
        return res.status(400).json({ error: 'kind, ref, and ackedBy are required' });
      }
      if (!['runbook_ack', 'key_rotation'].includes(kind)) {
        return res.status(400).json({ error: `Unsupported kind: ${kind}` });
      }

      let hash: string | null = null;
      if (kind === 'runbook_ack') {
        if (!RUNBOOKS.includes(ref)) {
          return res
            .status(400)
            .json({ error: `Unknown runbook: ${ref}`, knownRunbooks: RUNBOOKS });
        }
        hash = sha256OfFile(ref);
        if (!hash) {
          return res.status(500).json({ error: `Runbook file unreadable: ${ref}` });
        }
      } else if (kind === 'key_rotation') {
        // Caller may supply a precomputed key fingerprint hash via body.hash
        hash = typeof req.body?.hash === 'string' ? req.body.hash : null;
      }

      const inserted = await db
        .insert(launchAttestations)
        .values({
          kind,
          ref,
          ackedBy,
          hash,
          notes: typeof notes === 'string' ? notes : null,
          metadata: metadata ?? null,
        })
        .returning();

      return res.status(200).json({ success: true, attestation: inserted[0] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: 'Failed to record attestation', detail: msg });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
