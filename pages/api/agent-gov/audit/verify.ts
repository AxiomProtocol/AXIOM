import type { NextApiRequest, NextApiResponse } from 'next';
import { isAgentGovAuthorized } from '../../../../lib/agent-gov/auth';
import { verifyAuditChain } from '../../../../lib/agent-gov/audit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAgentGovAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

  const result = await verifyAuditChain();

  return res.json({ verification: result });
}
