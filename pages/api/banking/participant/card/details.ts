import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../../server/db';
import { increaseParticipants } from '../../../../../shared/increaseParticipantSchema';
import { IncreaseService, IncreaseDisabledError } from '../../../../../lib/services/IncreaseService';
import { getSiweWallet } from '../../../../../lib/server/banking/siweHelper';
import { eq } from 'drizzle-orm';

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(wallet: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(wallet);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(wallet, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { walletAddress } = req.query;
  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ error: 'walletAddress query param required' });
  }
  const wallet = walletAddress.toLowerCase();

  const siweWallet = await getSiweWallet(req);
  if (!siweWallet) return res.status(401).json({ error: 'Wallet sign-in required' });
  if (siweWallet !== '__dev__' && siweWallet.toLowerCase() !== wallet) {
    return res.status(403).json({ error: 'You may only access your own card details' });
  }

  if (!checkRateLimit(wallet)) {
    return res.status(429).json({ error: 'Rate limit exceeded — card details may be requested at most 3 times per hour' });
  }

  const rows = await db
    .select()
    .from(increaseParticipants)
    .where(eq(increaseParticipants.walletAddress, wallet))
    .limit(1);

  if (rows.length === 0) return res.status(404).json({ error: 'Participant not found' });
  const participant = rows[0];

  if (!participant.cardId) {
    return res.status(400).json({ error: 'No card issued for this account' });
  }

  try {
    const details = await IncreaseService.getCardDetails(participant.cardId);
    return res.status(200).json({
      pan: details.primary_account_number,
      cvv: details.verification_code,
      expirationMonth: details.expiration_month,
      expirationYear: details.expiration_year,
    });
  } catch (err) {
    if (err instanceof IncreaseDisabledError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Failed to retrieve card details', detail: msg });
  }
}
