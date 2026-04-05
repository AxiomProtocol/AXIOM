import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@auth0/nextjs-auth0';

const ALLOWED_ACTIONS = new Set(['createUser', 'createWallet', 'getWallet']);

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getSession(req, res);
  if (!session?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userId: string = session.user.sub ?? session.user.email ?? 'unknown';

  if (!checkRateLimit(userId)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Try again in a minute.' });
  }

  const { action, walletId, blockchains } = req.body ?? {};

  if (!action || !ALLOWED_ACTIONS.has(action)) {
    return res.status(400).json({ error: 'Invalid or missing action' });
  }

  if (!process.env.CIRCLE_APP_ID) {
    return res.status(503).json({ error: 'Circle wallet service not configured' });
  }

  try {
    const { createCircleUser, createCircleWallet, getCircleWallet } = await import('../../../lib/circle/walletClient');

    switch (action as string) {
      case 'createUser': {
        const user = await createCircleUser(userId);
        return res.status(200).json({ success: true, data: { id: user.id, status: user.status } });
      }
      case 'createWallet': {
        const wallet = await createCircleWallet(userId, blockchains ?? ['ARB']);
        return res.status(200).json({
          success: true,
          data: {
            id: wallet.id,
            address: wallet.address,
            blockchain: wallet.blockchain,
            accountType: wallet.accountType,
            state: wallet.state,
          },
        });
      }
      case 'getWallet': {
        if (!walletId || typeof walletId !== 'string') {
          return res.status(400).json({ error: 'walletId required for getWallet' });
        }
        const wallet = await getCircleWallet(walletId);
        return res.status(200).json({
          success: true,
          data: {
            id: wallet.id,
            address: wallet.address,
            blockchain: wallet.blockchain,
            state: wallet.state,
          },
        });
      }
      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (err: any) {
    console.error('[api/circle/wallets] error:', err.message);
    return res.status(500).json({ error: 'Wallet operation failed' });
  }
}
