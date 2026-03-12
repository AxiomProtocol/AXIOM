import type { NextApiRequest, NextApiResponse } from 'next';
import { getSIWESession } from '../../../../../lib/middleware/siweAuth';
import { unitCardService } from '../../../../../lib/services/UnitCardService';
import { rateLimitStrict } from '../../../../../lib/rateLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!rateLimitStrict(req, res)) return;

  const session = await getSIWESession(req);
  if (!session) {
    return res.status(401).json({ error: 'Wallet authentication required.', code: 'SIWE_AUTH_REQUIRED' });
  }

  const { cardId } = req.query as { cardId: string };
  const { action } = req.body ?? {};

  if (action !== 'freeze' && action !== 'unfreeze') {
    return res.status(400).json({ error: 'Action must be "freeze" or "unfreeze".' });
  }

  const cards = await unitCardService.getCardsForWallet(session.address);
  const card = cards.find((c) => c.id === cardId || c.unitCardId === cardId);
  if (!card) {
    return res.status(404).json({ error: 'Card not found.' });
  }

  const result =
    action === 'freeze'
      ? await unitCardService.freezeCard(card.unitCardId)
      : await unitCardService.unfreezeCard(card.unitCardId);

  if (!result.success) return res.status(400).json({ error: result.error });
  return res.status(200).json({ success: true, status: action === 'freeze' ? 'Frozen' : 'Active' });
}
