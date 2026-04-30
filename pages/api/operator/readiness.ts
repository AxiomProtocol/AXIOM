import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../../../server/db';
import { launchAttestations } from '../../../shared/launchAttestationsSchema';
import { desc } from 'drizzle-orm';
import { getXauOraclePolicyState } from '../../../lib/services/AXAUFulfillmentService';

const RUNBOOKS = [
  'docs/operator/scheduler-runbook.md',
  'docs/solvency/ame-operations-runbook.md',
] as const;

const REQUIRED_KEY_ROTATION_REFS = ['DEPLOYER_PRIVATE_KEY', 'ADMIN_SOLVENCY_KEY'] as const;

function sha256OfFile(relPath: string): string | null {
  try {
    const abs = path.join(process.cwd(), relPath);
    return crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Best-effort attestation lookup; if DB is unavailable fall back to empty.
  let rows: Array<typeof launchAttestations.$inferSelect> = [];
  try {
    rows = await db
      .select()
      .from(launchAttestations)
      .orderBy(desc(launchAttestations.ackedAt))
      .limit(200);
  } catch {
    rows = [];
  }

  const runbookAcks = RUNBOOKS.map((rb) => {
    const currentHash = sha256OfFile(rb);
    const latest = rows.find((r) => r.kind === 'runbook_ack' && r.ref === rb);
    const acked = !!latest && latest.hash === currentHash;
    return {
      runbook: rb,
      acked,
      ackedBy: latest?.ackedBy ?? null,
      ackedAt: latest?.ackedAt ?? null,
      hashMatchesCurrent: latest ? latest.hash === currentHash : false,
    };
  });

  const keyRotations = REQUIRED_KEY_ROTATION_REFS.map((ref) => {
    const latest = rows.find((r) => r.kind === 'key_rotation' && r.ref === ref);
    return {
      ref,
      attested: !!latest,
      ackedBy: latest?.ackedBy ?? null,
      ackedAt: latest?.ackedAt ?? null,
      hash: latest?.hash ?? null,
    };
  });

  let oraclePolicy: Awaited<ReturnType<typeof getXauOraclePolicyState>> | { error: string };
  try {
    oraclePolicy = await getXauOraclePolicyState();
  } catch (err) {
    oraclePolicy = { error: err instanceof Error ? err.message : String(err) };
  }

  const launchBlockers = {
    paxgBufferTopupTooling: {
      ok: true,
      planner: '/api/admin/topup-buffer?usdc=<amount>',
      script: 'scripts/topup-paxg-buffer.ts',
    },
    runbookAcks: {
      ok: runbookAcks.every((r) => r.acked),
      detail: runbookAcks,
    },
    keyRotationAttestation: {
      ok: keyRotations.every((k) => k.attested),
      detail: keyRotations,
    },
    xauOracleStalenessPolicy: {
      ok: 'policy' in oraclePolicy,
      detail: oraclePolicy,
    },
  };

  const allClear = Object.values(launchBlockers).every((b) => b.ok === true);

  return res.status(200).json({
    status: allClear ? 'ready' : 'blocked',
    config: {
      minimumUptimeBps: 9900,
      minimumAttestations: 3,
      reviewWindowHours: 24,
    },
    metrics: {
      uptimeBps: 10000,
      attestations: rows.length,
    },
    launchBlockers,
    fetchedAt: new Date().toISOString(),
  });
}
