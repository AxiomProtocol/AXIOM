import type { NextApiRequest, NextApiResponse } from 'next';
import { getSIWESession } from '../../../lib/middleware/siweAuth';
import { unitSandbox } from '../../../lib/unit/sandbox';
import { isUnitConfigured } from '../../../lib/unit/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getSIWESession(req);
  if (!session) {
    return res.status(401).json({ error: 'Wallet authentication required.' });
  }

  if (!isUnitConfigured()) {
    return res.status(503).json({ error: 'Unit credentials not configured.' });
  }

  const { action, accountId, applicationId, amount } = req.body ?? {};

  try {
    if (action === 'incoming_ach') {
      if (!accountId) return res.status(400).json({ error: 'accountId required.' });
      await unitSandbox.simulateIncomingAch({
        accountId: String(accountId),
        amountCents: amount ? Number(amount) : 10000,
        description: 'Sandbox ACH credit',
      });
      return res.status(200).json({ success: true, action: 'incoming_ach' });
    }

    if (action === 'approve_application') {
      if (!applicationId) return res.status(400).json({ error: 'applicationId required.' });
      await unitSandbox.approveApplication(String(applicationId));
      return res.status(200).json({ success: true, action: 'approve_application' });
    }

    return res.status(400).json({ error: 'Unknown action. Use: incoming_ach, approve_application.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
