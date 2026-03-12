import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import { bitgoWebhooks } from '../../../shared/bitgoSchema';
import { bridgeService } from '../../../lib/services/BridgeService';

export const config = { api: { bodyParser: true } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const event = req.body as {
    type?: string;
    walletId?: string;
    transfer?: { id?: string; state?: string; txid?: string };
    hash?: string;
  };

  const eventType = event?.type ?? 'unknown';
  const walletId = event?.walletId ?? null;

  try {
    await db.insert(bitgoWebhooks).values({
      bitgoWalletId: walletId ?? undefined,
      eventType,
      payload: event as Record<string, unknown>,
      processedAt: new Date(),
    }).onConflictDoNothing();
  } catch {
  }

  if (eventType === 'transfer' && event?.transfer?.state === 'confirmed') {
    console.log('[BitGo webhook] Transfer confirmed:', event.transfer.id);
  }

  return res.status(200).json({ received: true });
}
