import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import { replayDecision } from '../../../../server/services/mirdtExecution/replay';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { decisionId } = req.body;
  if (!decisionId || typeof decisionId !== 'string') {
    return res.status(400).json({ error: 'decisionId required' });
  }

  try {
    const result = await pool.query(
      `SELECT decision_trace, decision_checksum FROM mirdt_execution_decisions WHERE id = $1`,
      [decisionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Decision not found' });
    }

    const { decision_trace, decision_checksum } = result.rows[0];
    const trace = typeof decision_trace === 'string' ? JSON.parse(decision_trace) : decision_trace;

    const replayResult = replayDecision(trace, decision_checksum);

    return res.status(200).json(replayResult);
  } catch (err: any) {
    console.error('[execution/replay] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
