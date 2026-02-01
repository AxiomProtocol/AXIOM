import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import { runAssistant, AssistantMode } from '../../../../lib/workbook/ai-assistant';
import { getUserFromSiweSession } from '../../../../lib/workbook/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = await getUserFromSiweSession(req);
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { caseId, mode, message, history } = req.body;

  if (!caseId || !mode || !message) {
    return res.status(400).json({ error: 'Case ID, mode, and message are required' });
  }

  const validModes: AssistantMode[] = ['getting_started', 'resource_finder', 'research_planner', 'evidence_clerk', 'dossier_drafter'];
  if (!validModes.includes(mode)) {
    return res.status(400).json({ error: 'Invalid assistant mode' });
  }

  const caseResult = await pool.query(
    `SELECT * FROM workbook_cases WHERE id = $1 AND user_id = $2 LIMIT 1`,
    [caseId, userId]
  );

  const caseData = caseResult.rows[0];
  if (!caseData) {
    return res.status(404).json({ error: 'Case not found' });
  }

  if (!caseData.ethical_use_accepted_at) {
    return res.status(403).json({ 
      error: 'Ethical use agreement required', 
      requiresEthicalUseAcceptance: true 
    });
  }

  try {
    const result = await runAssistant({
      caseId,
      userId,
      mode,
      message,
      history,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        refusalReason: result.refusalReason,
      });
    }

    return res.status(200).json({
      success: true,
      response: result.response,
      hypothesisMode: result.hypothesisMode,
    });
  } catch (error) {
    console.error('AI assistant error:', error);
    return res.status(500).json({ error: 'AI assistant failed' });
  }
}
